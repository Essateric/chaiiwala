import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, Link } from "wouter";
import { useAuth, type RegisterData } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// Login form schema
const loginFormSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function AuthPage() {
  const [location, navigate] = useLocation();
  const { user, loginMutation, registerMutation, registerSchema, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("login");
  
  // Get redirect path from URL if present
  const searchParams = new URLSearchParams(location.split("?")[1] || "");
  const redirectTo = searchParams.get("redirect") || "/";
  
  // Redirect if already logged in
  useEffect(() => {
    if (user && !isLoading) {
      navigate(redirectTo);
    }
  }, [user, isLoading, navigate, redirectTo]);
  
  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });
  
  // Register form
  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      email: "",
      role: "store_manager",
    },
  });
  
  function onLoginSubmit(data: LoginFormValues) {
    loginMutation.mutate(data);
  }
  
  function onRegisterSubmit(data: RegisterData) {
    registerMutation.mutate(data);
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#1c1f2a]">
        <Loader2 className="h-8 w-8 animate-spin text-[#d4af37]" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#1c1f2a]">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Tabs 
          defaultValue="login" 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full max-w-md"
        >
          <TabsList className="grid w-full grid-cols-2 bg-[#262a38]">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>
          
          {/* Login Tab */}
          <TabsContent value="login">
            <Card className="bg-[#262a38] border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-200">Login</CardTitle>
                <CardDescription className="text-gray-400">
                  Enter your credentials to access your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-200">Username</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your username" 
                              {...field} 
                              className="bg-[#2d3142] border-gray-700 text-gray-200"
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
                          <FormLabel className="text-gray-200">Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Enter your password" 
                              {...field} 
                              className="bg-[#2d3142] border-gray-700 text-gray-200"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full bg-[#d4af37] hover:bg-[#c4a535] text-black"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Login
                    </Button>
                  </form>
                </Form>
              </CardContent>
              <CardFooter className="flex justify-center">
                <Button 
                  variant="link" 
                  onClick={() => setActiveTab("register")}
                  className="text-[#d4af37]"
                >
                  Don't have an account? Register
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* Register Tab */}
          <TabsContent value="register">
            <Card className="bg-[#262a38] border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-200">Register</CardTitle>
                <CardDescription className="text-gray-400">
                  Create a new account to manage Chaiiwala stores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-200">Username</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Create a username" 
                              {...field} 
                              className="bg-[#2d3142] border-gray-700 text-gray-200"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-200">Full Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your full name" 
                              {...field} 
                              className="bg-[#2d3142] border-gray-700 text-gray-200"
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
                          <FormLabel className="text-gray-200">Email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email"
                              placeholder="Enter your email" 
                              {...field} 
                              className="bg-[#2d3142] border-gray-700 text-gray-200"
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
                          <FormLabel className="text-gray-200">Role</FormLabel>
                          <FormControl>
                            <select 
                              {...field} 
                              className="flex h-10 w-full rounded-md border border-gray-700 bg-[#2d3142] px-3 py-2 text-sm text-gray-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="store_manager">Store Manager</option>
                              <option value="regional_manager">Regional Manager</option>
                              <option value="admin">Admin</option>
                            </select>
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
                          <FormLabel className="text-gray-200">Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Create a password" 
                              {...field} 
                              className="bg-[#2d3142] border-gray-700 text-gray-200"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-200">Confirm Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Confirm your password" 
                              {...field} 
                              className="bg-[#2d3142] border-gray-700 text-gray-200"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full bg-[#d4af37] hover:bg-[#c4a535] text-black"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Register
                    </Button>
                  </form>
                </Form>
              </CardContent>
              <CardFooter className="flex justify-center">
                <Button 
                  variant="link" 
                  onClick={() => setActiveTab("login")}
                  className="text-[#d4af37]"
                >
                  Already have an account? Login
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Right side - Hero/Branding */}
      <div className="flex-1 bg-[#2d3142] p-8 flex flex-col justify-center items-center text-center hidden md:flex">
        <div className="max-w-md">
          <h1 className="text-4xl font-bold text-[#d4af37] mb-4">Chaiiwala Management Dashboard</h1>
          <p className="text-gray-300 mb-6">
            A comprehensive solution for managing your Chaiiwala stores. Track inventory, 
            schedule staff, manage maintenance, and monitor performance all in one place.
          </p>
          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="bg-[#262a38] p-4 rounded-lg">
              <h3 className="text-[#d4af37] font-medium mb-2">Inventory Management</h3>
              <p className="text-gray-400 text-sm">Track stock levels and get alerts when items are running low.</p>
            </div>
            <div className="bg-[#262a38] p-4 rounded-lg">
              <h3 className="text-[#d4af37] font-medium mb-2">Staff Scheduling</h3>
              <p className="text-gray-400 text-sm">Create and manage staff schedules with ease.</p>
            </div>
            <div className="bg-[#262a38] p-4 rounded-lg">
              <h3 className="text-[#d4af37] font-medium mb-2">Maintenance Tracking</h3>
              <p className="text-gray-400 text-sm">Log and track maintenance issues across all stores.</p>
            </div>
            <div className="bg-[#262a38] p-4 rounded-lg">
              <h3 className="text-[#d4af37] font-medium mb-2">Performance Analytics</h3>
              <p className="text-gray-400 text-sm">Monitor KPIs and get insights into store performance.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
