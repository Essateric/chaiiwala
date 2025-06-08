import { createContext, useContext, useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient.js";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "./use-toast.jsx";
import { useSupabaseClient, useSessionContext } from "@supabase/auth-helpers-react";

import { Input } from "../components/ui/input.jsx";
import { Button } from "../components/ui/button.jsx";
import { Label } from "../components/ui/label.jsx";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card.jsx";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../components/ui/form.jsx";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom"; // Assuming react-router-dom for navigation

export const AuthContext = createContext(null); // Keep AuthContext export

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isInviteFlowContext, setIsInviteFlowContext] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false); // Separate loading for profile
  // const [error, setError] = useState(null); // sessionErrorHook will provide session errors

  const { toast } = useToast();
  const supabaseClient = useSupabaseClient(); // Get Supabase client from auth-helpers
  const { session, isLoading: isLoadingSessionHook, error: sessionErrorHook } = useSessionContext();

  // Combined loading state: true if session is loading OR profile is loading
  const isLoading = isLoadingSessionHook || isProfileLoading;

  useEffect(() => {
    // Check for invite flow from URL hash when the component mounts.
    // This effect runs once on mount.
    const currentHash = typeof globalThis !== 'undefined' ? globalThis.location.hash : '';
    console.log("AuthProvider (Mount Effect): Checking for invite. Hash:", currentHash);

    if (currentHash.includes('type=invite')) {
      const urlParams = new URLSearchParams(globalThis.location.hash.substring(1));
      if (urlParams.get('type') === 'invite') {
        console.log("AuthProvider (Mount Effect): Invite token detected. Setting isInviteFlowContext to true.");
        setIsInviteFlowContext(true);
        // Let Supabase auth-helpers (via useSessionContext) handle hash consumption and cleaning.
      } else {
        console.log("AuthProvider (Mount Effect): 'type=invite' in hash, but 'type' param is not 'invite'.");
      }
    }
  }, []); // Empty dependency array: runs only once on mount.

useEffect(() => {
  // If the session is still loading, clear data and wait
  if (isLoadingSessionHook) {
    console.log("AuthProvider: Session is loading...");
    setUser(null);
    setProfile(null);
    setAccessToken(null);
    return;
  }

  // If there's an error loading the session
  if (sessionErrorHook) {
    console.error("AuthProvider: Session error:", sessionErrorHook.message);
    setUser(null);
    setProfile(null);
    setAccessToken(null);
    return;
  }

  const currentUser = session?.user ?? null;
  const currentToken = session?.access_token ?? null;

  // Only update user/token if changed
  setUser((prev) => (prev?.id !== currentUser?.id ? currentUser : prev));
  setAccessToken((prev) => (prev !== currentToken ? currentToken : prev));

  // If there is a valid user and profile hasn't been fetched or mismatched
  if (currentUser && profile?.auth_id !== currentUser.id) {
    console.log("AuthProvider: Fetching profile for user:", currentUser.id);
    setIsProfileLoading(true);

    supabaseClient
      .from("profiles")
      .select("*")
      .eq("auth_id", currentUser.id)
      .single()
      .then(({ data: profileData, error: profileError }) => {
        if (profileError) {
          console.error("AuthProvider: Profile fetch error:", profileError.message);
          setProfile(null);
        } else {
          setProfile(profileData);
          console.log("AuthProvider: Profile fetched:", profileData);
        }
        setIsProfileLoading(false);
      });
  }

  // If no user, reset profile state safely
  if (!currentUser && profile !== null) {
    setProfile(null);
  }
}, [session, isLoadingSessionHook, sessionErrorHook, supabaseClient]);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabaseClient.auth.signOut(); // Use the renamed supabaseClient
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.clear();
      setUser(null);
      setProfile(null);
      setIsInviteFlowContext(false); // Reset invite flow on logout
      // session from useSessionContext will become null automatically
      setAccessToken(null);
      toast({ title: "Signed out successfully", variant: "success" });
    },
    onError: (error) => {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

useEffect(() => {
  if (session === null) {
    console.log("⏳ Waiting for session...");
  } else if (!session) {
    console.log("❌ No session found (user not logged in)");
  } else {
    console.log("✅ Session loaded:", session);
  }
}, [session]);

  // The AuthProvider itself doesn't render the UI forms (Login/Signup/Set Password).
  // It just provides the auth state via context.
  // The component that uses useAuth (like your AuthPage component) will render the UI.


  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        error: sessionErrorHook, // Expose session error
        accessToken,
        logoutMutation,
        isInviteFlowContext, // Provide this to consumers
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// This is likely the component that renders your /auth route UI
// Assuming this component is defined and exported from this file
// If your AuthPage component is in a different file, this logic needs to go there.
export default function AuthPage() { // Assuming AuthPage is the default export
  const { user, isLoading, profile, _accessToken, isInviteFlowContext } = useAuth(); // Get isInviteFlowContext
  const supabaseClient = useSupabaseClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("login");
  const [isInviteFlow, setIsInviteFlow] = useState(false); // State to track invite flow

  // Form for standard login
  const loginForm = useForm({
    resolver: zodResolver(z.object({ email: z.string().email(), password: z.string().min(6) })),
    defaultValues: { email: "", password: "" },
  });

  // Form for standard signup
  const signupForm = useForm({
    resolver: zodResolver(z.object({ email: z.string().email(), password: z.string().min(6), name: z.string().min(1) })),
    defaultValues: { email: "", password: "", name: "" },
  });

  // Form for setting password during invite flow
  const setPasswordForm = useForm({
    resolver: zodResolver(z.object({ password: z.string().min(6, "Password must be at least 6 characters") })),
    defaultValues: { password: "" },
  });

  // Mutations for auth actions
  const signInMutation = useMutation({
    mutationFn: async ({ email, password }) => {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Signed in successfully" });
      // Redirection is handled by the useEffect below based on user/profile state
    },
    onError: (error) => {
      toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
    },
  });

  const signUpMutation = useMutation({
    mutationFn: async ({ email, password, name }) => {
      // Supabase Auth signup
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { name: name }, // Store name in user_metadata during signup
        },
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Sign up successful", description: "Please check your email to confirm your account." });
      // User needs to confirm email, no immediate redirect to dashboard
    },
    onError: (error) => {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
    },
  });

  const setPasswordMutation = useMutation({
    mutationFn: async ({ password }) => {
      // User's session is already established by the invite token in the URL
      const { data, error } = await supabaseClient.auth.updateUser({ password });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Password Set!", description: "Your account is now fully active. Please log in." });
      setIsInviteFlow(false); // Reset invite flow state
      setActiveTab("login"); // Switch to login tab
      // Optionally, you could attempt to log them in directly or redirect to login
      // navigate("/login"); // Or let them log in from the current page
    },
    onError: (error) => {
      console.error('Set password error:', error.message);
      toast({
        title: "Password Set Failed",
        description: error.message || "Could not set your password. The link may be invalid or expired.",
        variant: "destructive",
      });
    },
  });

  // --- useEffect to handle auth redirects (invite, magiclink, etc.) ---
  // This useEffect listens to URL hash changes which Supabase uses for redirects
  // This is now simplified as AuthProvider handles the initial hash detection for invite.
  // This useEffect in AuthPage now primarily reacts to isInviteFlowContext.
  useEffect(() => {
    if (isInviteFlowContext) {
      // Even if context says it's an invite flow, check if a user session was actually established.
      // The user object comes from the AuthProvider's session processing.
      if (user && user.email) { // Check for user and email as invite implies a user object should exist
        console.log("AuthPage: Invite flow context is TRUE and USER session exists. Setting UI for password set for:", user.email);
        toast({ title: "Welcome!", description: "Please set your password to activate your account." });
        setIsInviteFlow(true); 
        setActiveTab("signup");
      } else if (!isLoading) { // Only show error if not loading and user is not available
        console.warn("AuthPage: Invite flow context is TRUE, but NO USER session established (or user has no email). Link might be invalid/expired.");
        toast({ title: "Invite Link Issue", description: "This invite link may be invalid or expired. Please try logging in or contact support.", variant: "destructive", duration: 7000 });
        setIsInviteFlow(false); // Treat as not an invite flow for UI purposes
        if (activeTab === "signup") setActiveTab("login");
      }
    } else {
      // If isInviteFlowContext from provider is false
      if (isInviteFlow) { // only reset local UI state if it was previously true
        console.log("AuthPage: Invite flow context from AuthProvider is now false. Resetting local UI.");
        setIsInviteFlow(false);
        if (activeTab === "signup") setActiveTab("login");
      }
    }
  }, [isInviteFlowContext, user, isLoading, toast, activeTab, isInviteFlow]); // Added user and isLoading

  // --- useEffect to handle navigation after auth state changes ---
  useEffect(() => {
    // isLoading from useAuth indicates that both session AND initial profile are loaded (or attempted)
    // We only want to redirect if useAuth is *not* loading AND a user exists AND we are currently on the /auth page.
    // We also don't redirect if we are in the invite flow, as the user needs to set their password first.
    if (!isLoading && user && globalThis.location.pathname === "/auth" && !isInviteFlow) {
      console.log("AuthPage: useAuth finished loading, user exists, currently on /auth. Checking profile for redirect.");
      // Use profile from useAuth hook
      if (profile) {
        console.log(`AuthPage: User profile found with permissions: ${profile.permissions}. Redirecting...`);
        // Redirect based on permissions
        if (profile.permissions === "admin") {
          navigate("/admin/dashboard");
        } else if (profile.permissions === "regional") {
          navigate("/regional/dashboard");
        } else if (profile.permissions === "area") {
          navigate("/area/dashboard");
        } else if (profile.permissions === "store") {
          navigate("/store/dashboard");
        } else if (profile.permissions === "staff") {
          navigate("/staff/dashboard");
        } else {
          // Default redirect for other roles or if permissions are missing
          navigate("/dashboard"); // Or a generic landing page
        }
      } else {
        // User is logged in but no profile found (shouldn't happen with trigger, but fallback)
        console.warn("AuthPage: User logged in but no profile found. Redirecting to default dashboard.");
        navigate("/dashboard");
      }
    } else if (!isLoading && !user && globalThis.location.pathname !== "/auth") {
       // If useAuth is NOT loading and no user exists, and we are NOT on the /auth page,
       // consider redirecting to /auth.
       console.log("AuthPage: useAuth finished loading, no user, not on /auth. Redirecting to /auth.");
       navigate("/auth");
    } else if (isLoading) {
        console.log("AuthPage: useAuth is still loading...");
    } else if (isInviteFlow) {
        console.log("AuthPage: In invite flow, waiting for password set.");
    }
  }, [user, isLoading, profile, navigate, isInviteFlow]); // Dependencies: user, isLoading, profile from useAuth, navigate, isInviteFlow

  // --- Render Logic ---

  // Show loading state while useAuth is checking session and fetching profile
  // This prevents rendering the auth forms before we know the user's state.
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-chai-gold" />
        <p className="ml-2">Loading authentication state...</p>
      </div>
    );
  }

  // If useAuth is NOT loading and a user exists, this component should ideally
  // not be rendered because the useEffect above should have redirected.
  // UNLESS we are in the invite flow to set a password.
  if (!isLoading && user && !isInviteFlow) {
     console.log("AuthPage: useAuth finished loading, user exists. Should have redirected.");
     return null; // Or a simple message like "Redirecting..."
  }

  // Render the main Auth UI (Login/Signup tabs)
  // The content of the "signup" tab will adapt if isInviteFlow is true.
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            {activeTab === "login" ? "Login" : "Sign Up"}
          </CardTitle>
          {/* Adjust description if it's an invite flow within the signup tab */}
          <CardDescription className="text-center">
            {isInviteFlow && activeTab === "signup"
              ? "Welcome! Please set your password to activate your account."
              : (activeTab === "login"
                  ? "Enter your credentials to access your account."
                  : "Create your account to get started."
                )
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(signInMutation.mutate)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="m@example.com" {...field} />
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
                          <Input type="password" placeholder="********" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full bg-chai-gold hover:bg-yellow-700" disabled={signInMutation.isPending}>
                    {signInMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Login
                  </Button>
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="signup">
              {isInviteFlow ? (
                // Invite Flow: Show Set Password form
                <Form {...setPasswordForm}>
                  <form onSubmit={setPasswordForm.handleSubmit(setPasswordMutation.mutate)} className="space-y-4">
                    {user?.email && (
                      <div className="space-y-1">
                        <Label>Email</Label>
                        <Input type="email" value={user.email} disabled className="bg-gray-100" />
                      </div>
                    )}
                     {user?.user_metadata?.name && (
                      <div className="space-y-1">
                        <Label>Name</Label>
                        <Input type="text" value={user.user_metadata.name} disabled className="bg-gray-100" />
                      </div>
                    )}
                    <FormField
                      control={setPasswordForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter your new password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full bg-chai-gold hover:bg-yellow-700" disabled={setPasswordMutation.isPending}>
                      {setPasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Set Password
                    </Button>
                  </form>
                </Form>
              ) : (
                // Regular Sign Up Flow
                <Form {...signupForm}>
                  <form onSubmit={signupForm.handleSubmit(signUpMutation.mutate)} className="space-y-4">
                    <FormField
                      control={signupForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input type="text" placeholder="John Doe" {...field} />
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
                            <Input type="email" placeholder="m@example.com" {...field} />
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
                            <Input type="password" placeholder="********" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full bg-chai-gold hover:bg-yellow-700" disabled={signUpMutation.isPending}>
                      {signUpMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign Up
                    </Button>
                  </form>
                </Form>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Export the useAuth hook for other components to consume the context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}