import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter 
} from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { InsertUser, User as SelectUser } from "@shared/schema";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  role: z.enum(["admin", "regional", "store", "staff"]).default("staff"),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;
type LoginData = Pick<InsertUser, "username" | "password">;

export default function AuthPage() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("login");
  const { toast } = useToast();
  
  // Get current user
  const { data: user, isLoading: isUserLoading } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      try {
        // Standard API request using our apiRequest helper
        const res = await apiRequest("POST", "/api/login", credentials);
        return await res.json();
      } catch (error) {
        // If we're failing with a 404 on Netlify, this could be the path rewriting issue
        const isNetlify = window.location.hostname.includes('netlify.app');
        if (isNetlify && 
            error instanceof Error && 
            error.message.includes('404')) {
          
          console.log('Auth error on Netlify, attempting with direct function path...');
          
          // Try with direct function path as fallback for Netlify
          // This is a special case just for the login endpoint
          const directRes = await fetch('/.netlify/functions/api/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
            credentials: 'include'
          });
          
          if (!directRes.ok) {
            const errorText = await directRes.text();
            console.error('Netlify direct path login error:', errorText);
            throw new Error(`${directRes.status}: ${errorText || directRes.statusText}`);
          }
          
          return await directRes.json();
        }
        
        // Re-throw the original error if it's not the Netlify 404 case
        throw error;
      }
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.name}!`,
      });
      navigate("/");
    },
    onError: (error: Error) => {
      console.error('Login error:', error);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registration successful",
        description: `Welcome, ${user.name}!`,
      });
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: ""
    }
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      email: "",
      role: "staff"
    }
  });

  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Side - Auth Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 bg-white">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Chaiiwala Dashboard
            </CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              {/* Login Form */}
              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your username" 
                              {...field} 
                              autoComplete="username"
                            />
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
                            <Input 
                              type="password" 
                              placeholder="Enter your password" 
                              {...field} 
                              autoComplete="current-password"
                            />
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

              {/* Register Form */}
              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your full name" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Choose a username" 
                              {...field} 
                              autoComplete="username"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Create a password" 
                              {...field} 
                              autoComplete="new-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your first name" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your last name" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your email address" 
                              type="email"
                              {...field} 
                              autoComplete="email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <FormControl>
                            <select
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              {...field}
                            >
                              <option value="admin">Administrator</option>
                              <option value="regional">Regional Manager</option>
                              <option value="store">Store Manager</option>
                              <option value="staff">Staff</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full bg-chai-gold hover:bg-yellow-700"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Register
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
          
          {/* Debug Section for Netlify */}
          {window.location.hostname.includes('netlify.app') && (
            <CardFooter className="flex flex-col items-start border-t pt-4 mt-4">
              <div className="flex items-center space-x-2 text-amber-600 mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Netlify Deployment Debug</span>
              </div>
              <div className="text-xs text-gray-500 space-y-1 w-full">
                <p>Hostname: {window.location.hostname}</p>
                <p>Path: {window.location.pathname}</p>
                <p>API URLs will be rewritten to use Netlify functions</p>
                <div className="mt-2 flex flex-col gap-1">
                  <a 
                    href="/.netlify/functions/api/auth-test" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Test Authentication Status
                  </a>
                  <button
                    onClick={() => {
                      // Direct login attempt using fetch
                      fetch('/.netlify/functions/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: 'usman', password: 'password123' }),
                        credentials: 'include'
                      })
                      .then(res => {
                        if (!res.ok) return res.text().then(text => { throw new Error(text) });
                        return res.json();
                      })
                      .then(data => {
                        console.log('Direct login success:', data);
                        toast({
                          title: "Direct login successful",
                          description: "Login successful using direct Netlify function path",
                        });
                        window.location.href = '/';
                      })
                      .catch(err => {
                        console.error('Direct login failed:', err);
                        toast({
                          title: "Direct login failed",
                          description: err.toString(),
                          variant: "destructive",
                        });
                      });
                    }}
                    className="text-blue-600 hover:underline text-left"
                  >
                    Try Direct Login (usman/password123)
                  </button>
                </div>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>

      {/* Right Side - Hero Banner */}
      <div className="w-full md:w-1/2 bg-chai-black p-8 flex items-center justify-center">
        <div className="max-w-md text-white">
          <div className="flex items-center mb-8">
            <div className="h-12 w-12 bg-chai-gold rounded-full flex items-center justify-center mr-4">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <h1 className="font-montserrat font-bold text-3xl text-chai-gold">Chaiiwala</h1>
          </div>
          <h2 className="text-2xl font-playfair font-bold mb-4">Management Dashboard</h2>
          <p className="mb-6 text-gray-300">
            Welcome to the Chaiiwala Management Dashboard. This platform helps you manage inventory, 
            staff scheduling, store performance, and much more across all your locations.
          </p>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="bg-chai-gold rounded-full p-1 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Inventory Management</h3>
                <p className="text-sm text-gray-400">Track stock levels and manage orders across all locations</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-chai-gold rounded-full p-1 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Staff Scheduling</h3>
                <p className="text-sm text-gray-400">Create and manage staff schedules with ease</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-chai-gold rounded-full p-1 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Task Management</h3>
                <p className="text-sm text-gray-400">Assign and track tasks for your team members</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
