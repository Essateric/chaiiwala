import { useState, useEffect } from "react";  // Add useEffect import
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
import { useAuth } from "@/hooks/UseAuth";  // Import useAuth hook

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
        data: { name },
      },
    });
    if (error) throw new Error(error.message);
    return { user: data.user, email }; // manually return email for fallback
  },
  onSuccess: async ({ user, email }) => {
    const name = signupForm.getValues().name;

    await supabase.from("profiles").insert({
      email,
      name,
      auth_id: user?.id || null, // insert null if not available
      permissions: "store",
      store_id: 1,
    });

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


  // Redirect user to dashboard if already logged in
  useEffect(() => {
    if (!isLoading && user) {
      const permissions = user?.permissions;
      if (permissions === "maintenance") {
        console.log("Redirecting maintenance user to /maintenance");
        navigate("/maintenance");
      } else {
        console.log("Redirecting to /dashboard");
        navigate("/dashboard");
      }
    }
  }, [user, isLoading, navigate]);

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
      // Fetch user profile from the `profiles` table
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("permissions")
        .eq("auth_id", user.id)
        .single();
    
      if (error) {
        console.error("Error fetching profile:", error.message);
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
