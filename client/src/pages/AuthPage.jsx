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
import { useAuth } from "@/hooks/UseAuth";

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
  const { user, isLoading } = useAuth();

  const signupForm = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const signupMutation = useMutation({
    mutationFn: async ({ name, email, password }) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }, // Pass name here so trigger can pick it up
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
      toast({ title: "Signup successful", description: "User created. Please check your email to confirm." });
      setActiveTab("login");
    },
    onError: (error) => {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    },
  });


  const onSignupSubmit = (values) => {
    signupMutation.mutate(values);
  };

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
        console.log(`Processing auth redirect of type: ${type}`);
        toast({ title: "Processing login...", description: "Please wait." });

        // Set the session using the tokens from the hash
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          toast({ title: "Authentication failed", description: sessionError.message, variant: "destructive" });
          return;
        }

        const authUser = sessionData?.user;

        if (authUser) {
          console.log(`✅ Session set for user: ${authUser.id}`);

          if (type === "invite") {
            console.log("Handling invite flow...");
            // The database trigger 'handle_new_user_profile' should have already created
            // the profile for this invited user using the app_metadata (role, store_ids)
            // sent with the invitation.
            // We just need to ensure the session is set and then navigate.
            toast({ title: "Welcome!", description: "Your account is set up. Redirecting..." });
            // The redirect logic in the second useEffect or loginMutation.onSuccess
            // will handle navigation to the correct dashboard based on the profile
            // that the trigger created.
            navigate("/dashboard"); // Redirect after successful invite processing
          } else {
             // For other types like magiclink or recovery, setting the session is usually sufficient.
             // The useAuth hook or the redirect logic below will handle navigation based on the new session state.
             console.log(`Auth type ${type} processed. Awaiting state change for navigation.`);
             // Optionally, you could add a small delay or check auth state explicitly here
             // before navigating, but the useAuth hook should eventually trigger the redirect.
             // For now, let's assume the main redirect logic will catch this.
             // If not, a navigate("/dashboard") or similar might be needed here too.
          }
        } else {
           // Should not happen if setSession was successful, but good to handle
           toast({ title: "Authentication issue", description: "Could not retrieve user session after redirect.", variant: "destructive" });
        }
      } else {
        console.log("No auth tokens found in hash.");
      }
    };

    processAuthRedirect(); // Call the async function immediately

  }, [navigate, toast]); // Dependencies: navigate and toast hooks


  // Redirect user to dashboard if already logged in (handled by useAuth)
  // This useEffect listens to the user state from useAuth
  useEffect(() => {
    // isLoading check prevents premature redirect while auth state is being fetched
    if (!isLoading && user) {
      console.log("User is logged in, redirecting to dashboard...");
      // The useAuth hook might already handle this internally,
      // but this provides an explicit fallback/confirmation.
      // You might want more specific redirects here based on user roles if needed,
      // but the loginMutation onSuccess already handles maintenance redirect.
      // Let's rely on the loginMutation onSuccess or the useAuth hook's internal logic
      // for primary redirection after successful login/session set.
      // This hook is more for initial load if already logged in.
      // If the user is already logged in and lands on /auth, redirect them.
      // Ensure this doesn't interfere with the hash processing above.
      // A simple check like this is usually sufficient:
      if (window.location.pathname === "/auth") {
         // Check if the user has a specific role for maintenance page
        const checkAndRedirect = async () => {
           const { data: profile, error } = await supabase
             .from("profiles")
             .select("permissions")
             .eq("auth_id", user.id)
             .single();

           if (error) {
             console.error("Error fetching profile for redirect:", error.message);
             navigate("/dashboard"); // Default redirect on error
             return;
           }

           if (profile?.permissions === "maintenance") {
             console.log("Redirecting logged-in maintenance user to /maintenance");
             navigate("/maintenance");
           } else {
             console.log("Redirecting logged-in user to /dashboard");
             navigate("/dashboard");
           }
        };
        checkAndRedirect();
      }
    }
  }, [user, isLoading, navigate]); // Dependencies: user, isLoading from useAuth, navigate


  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: async ({ user }) => {
      // Fetch user profile from the `profiles` table to check permissions
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("permissions")
        .eq("auth_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching profile after login:", error.message);
        // Decide on fallback behavior - maybe just go to dashboard or show error
        toast({ title: "Login successful, but profile fetch failed.", description: error.message, variant: "destructive" });
        return navigate("/dashboard"); // fallback
      }

      if (profile?.permissions === "maintenance") {
        console.log("Redirecting maintenance user to /maintenance");
        navigate("/maintenance");
      } else {
        console.log("Redirecting user to /dashboard");
        navigate("/dashboard");
      }
    },

    onError: (error) => {
      console.error('Login error:', error.message);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  const onLoginSubmit = (values) => {
    loginMutation.mutate(values);
  };

  // If loading auth state, show a loading indicator or null
  if (isLoading) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-white">
         <Loader2 className="h-8 w-8 animate-spin text-chai-gold" />
       </div>
     );
  }

  // If user is already logged in and not on /auth (handled by the second useEffect),
  // this component shouldn't be rendered. But as a fallback, if somehow
  // a logged-in user lands here and the useEffect hasn't redirected yet,
  // you might render nothing or a loading state.
  // Given the useEffect logic, this part is less critical, but good to be aware.
  // We'll proceed to render the form, relying on useEffects for redirects.


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
                    disabled={loginMutation.isPending}
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
                    disabled={signupMutation.isPending}
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
