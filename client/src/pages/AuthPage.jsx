import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";

import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormControl, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/UseAuth"; // Assuming this is the correct path to your useAuth hook

const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});


export default function AuthPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("login");

  // Get user state and loading status from useAuth
  // Assuming isLoading here means the initial session check and profile fetch in useAuth are complete
  const { user, isLoading, profile: authProfileFromHook } = useAuth(); // Get profile from useAuth as well

  const signupForm = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onLoginSubmit = async (values) => {
    loginMutation.mutate(values);
  };

  const onSignupSubmit = (values) => {
    signupMutation.mutate(values);
  };

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw new Error(error.message);
      return data; // Contains user and session
    },
    onSuccess: async (data) => {
      // After successful login, the onAuthStateChange in useAuth will trigger,
      // which will then fetch the profile and update isLoading.
      // The useEffect (that depends on useAuth's user, isLoading, and authProfileFromHook)
      // will then handle the redirect.
      console.log("AuthPage: Login successful for user:", data.user?.id, ". Waiting for useAuth to update and redirect.");
      toast({ title: "Login successful!" });
      // No direct navigation here. Let the useEffect that listens to useAuth's state handle it.
      // This ensures that useAuth has had a chance to update its global state (user, profile, isLoading)
      // before any navigation occurs.
    },
    onError: (error) => {
      console.error('Login error:', error.message);
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials or network issue.",
        variant: "destructive",
      });
    },
  });

  const signupMutation = useMutation({
    mutationFn: async ({ name, email, password }) => {
      // This calls the Supabase Auth API directly
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }, // Pass name here so trigger can pick it up from raw_user_meta_data
        },
      });
      if (error) throw new Error(error.message);
      return { user: data.user, email }; // manually return email for fallback
    },
    onSuccess: async ({ user, email }) => {
      // Profile creation is now handled by the database trigger.
      // The 'name' from signupForm.getValues().name is passed in signUp options.data
      // and will be picked up by the trigger from NEW.raw_user_meta_data->>'name'.
      // The trigger will also assign the default permission (e.g., 'staff').
      console.log("AuthPage: Signup successful for user:", user?.id);
      toast({ title: "Signup successful", description: "User created. Please check your email to confirm." });
      setActiveTab("login"); // Automatically switch to login tab after successful signup
    },
    onError: (error) => {
      console.error('Signup error:', error.message);
      // This toast will display the error message from Supabase, including the 429 error
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    },
  });

  // --- useEffect to handle auth redirects (invite, magiclink, etc.) ---
  useEffect(() => {
    const processAuthRedirect = async () => {
      const hash = window.location.hash;
      // Check if the hash contains auth tokens
      if (!hash.includes("access_token") || !hash.includes("refresh_token")) {
        return; // Not an auth redirect with tokens in hash
      }

      const params = new URLSearchParams(hash.substring(1)); // Remove '#' and parse
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const type = params.get("type"); // e.g., 'invite', 'magiclink', 'recovery'

      // Clear the hash from the URL immediately to prevent re-processing and clean up the URL
      // Use replaceState to avoid adding a new entry to the history
      window.history.replaceState(null, "", window.location.pathname + window.location.search);

      if (accessToken && refreshToken) {
        console.log(`AuthPage: Processing auth redirect of type: ${type}`);
        toast({ title: "Processing login...", description: "Please wait." });

        // Set the session using the tokens from the hash
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error("AuthPage: Error setting session from redirect:", sessionError.message);
          toast({ title: "Authentication failed", description: sessionError.message, variant: "destructive" });
          return;
        }

        const authUser = sessionData?.user;

        if (authUser) {
          console.log(`✅ AuthPage: Session set from redirect for user: ${authUser.id}`);

          // After setting the session, the onAuthStateChange listener in useAuth will fire.
          // useAuth will update its state (user, profile, isLoading).
          // The useEffect below (that depends on useAuth's state) will then handle the navigation.
          // This ensures the redirect happens *after* useAuth has processed the new session.

          if (type === "invite") {
             console.log("AuthPage: Handling invite flow redirect.");
             toast({ title: "Welcome!", description: "Your account is set up. Redirecting..." });
             // No direct navigate here; let the useEffect based on useAuth handle it.
          } else {
             // For other types like magiclink or recovery, setting the session is usually sufficient.
             console.log(`AuthPage: Auth type ${type} processed. Awaiting useAuth state change for navigation.`);
             // No direct navigate here; let the useEffect based on useAuth handle it.
          }
        } else {
           // Should not happen if setSession was successful, but good to handle
           console.error("AuthPage: Could not retrieve user session after setSession from redirect.");
           toast({ title: "Authentication issue", description: "Could not retrieve user session after redirect.", variant: "destructive" });
        }
      } else {
        console.log("AuthPage: No auth tokens found in hash.");
      }
    };

    // Only process redirect hash if we are currently on the /auth page
    // and there is a hash present.
    if (window.location.pathname === "/auth" && window.location.hash) {
       processAuthRedirect(); // Call the async function immediately
    }


  }, [navigate, toast]); // Dependencies: navigate and toast hooks


  // --- useEffect to handle navigation after auth state changes ---
  // This useEffect listens to the user and isLoading state from useAuth
  useEffect(() => {
    // isLoading from useAuth now indicates that both session AND initial profile are loaded (or attempted)
    // We only want to redirect if useAuth is *not* loading AND a user exists AND we are currently on the /auth page.
    if (!isLoading && user && window.location.pathname === "/auth") {
      console.log("AuthPage: useAuth finished loading, user exists, currently on /auth. Checking profile for redirect.");
      // Use authProfileFromHook which should be populated by useAuth
      if (authProfileFromHook) {
        if (authProfileFromHook.permissions === "maintenance") {
          console.log("AuthPage: Redirecting maintenance user to /maintenance based on useAuth profile.");
          navigate("/maintenance");
        } else {
          console.log("AuthPage: Redirecting user to /dashboard based on useAuth profile.");
          navigate("/dashboard");
        }
      } else {
        // This case means useAuth finished, user exists, but profile fetch failed within useAuth
        console.error("AuthPage: Profile not available from useAuth hook after loading. Defaulting to /dashboard.");
        toast({
          title: "Profile Error",
          description: "Could not load user profile. Please try again.",
          variant: "destructive",
        });
        navigate("/dashboard"); // Fallback redirect
      }
    } else if (!isLoading && !user && window.location.pathname !== "/auth") {
       // Optional: If useAuth finishes loading, no user is found, and we are NOT on the auth page,
       // you might want to redirect to the auth page. This is often handled by a ProtectedRoute
       // component wrapping your application routes, but this is a fallback.
       console.log("AuthPage: useAuth finished loading, no user, not on /auth. Consider redirecting to /auth.");
       // navigate("/auth"); // Uncomment if you want AuthPage to enforce redirect to itself
    }
  }, [user, isLoading, authProfileFromHook, navigate, toast]); // Dependencies: user, isLoading, authProfileFromHook from useAuth

  // --- Render Logic ---

  // If useAuth is loading the initial state, show a loading indicator
  if (isLoading) {
     console.log("AuthPage: Rendering initial loading state...");
     return (
       <div className="min-h-screen flex items-center justify-center bg-white">
         <Loader2 className="h-8 w-8 animate-spin text-chai-gold" />
         <p className="ml-2 text-gray-700">Loading session...</p>
       </div>
     );
  }

  // If useAuth is NOT loading and a user exists, this component should ideally
  // not be rendered because the useEffect above should have redirected.
  // However, if somehow we reach here, we can render nothing or a message,
  // relying on the useEffect to eventually navigate.
  if (!isLoading && user) {
     console.log("AuthPage: useAuth finished loading, user exists. Should have redirected.");
     return null; // Or a simple message like "Redirecting..."
  }


  // If useAuth is NOT loading and no user exists, render the login/signup form
  console.log("AuthPage: Rendering login/signup form.");
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      {/* Left Side - Auth Form */}
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Chaiiwala Dashboard</CardTitle>
          <CardDescription className="text-center">Login to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>

            </TabsList>

            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your email" {...field} autoComplete="email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter your password" {...field} autoComplete="current-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full bg-chai-gold hover:bg-yellow-700"
                    disabled={loginMutation.isPending} // Button disabled while login is pending
                  >
                    {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="signup">
              <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
                  <FormField
                    control={signupForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signupForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="Email address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signupForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Create a password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full bg-chai-gold hover:bg-yellow-700"
                    disabled={signupMutation.isPending} // Button disabled while signup is pending
                  >
                    {signupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign Up
                  </Button>
                </form>
              </Form>
            </TabsContent>

          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
