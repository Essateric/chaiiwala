import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Check if we're in Netlify environment
const isNetlify = window.location.hostname.includes('netlify.app');

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      try {
        console.log("Sending credentials:", { username: credentials.username, passwordLength: credentials.password?.length || 0 });
        
        // Use regular fetch for more control over the response
        const url = isNetlify ? "/.netlify/functions/api/login" : "/api/login";
        console.log(`Login URL: ${url}`);
        
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
          credentials: "include"
        });
        
        console.log(`Login response status: ${res.status}`);
        
        if (!res.ok) {
          let errorMessage = "Login failed";
          try {
            const errorData = await res.json();
            errorMessage = errorData.message || "Invalid username or password";
          } catch (e) {
            // If we can't parse JSON, use the status text
            errorMessage = res.statusText || `Error ${res.status}`;
          }
          throw new Error(errorMessage);
        }
        
        return await res.json();
      } catch (err) {
        console.error("Login mutation error:", err);
        throw err;
      }
    },
    onSuccess: (user: SelectUser) => {
      console.log("Login successful:", user);
      queryClient.setQueryData(["/api/user"], user);
    },
    onError: (error: Error) => {
      console.error("Login error details:", error);
      toast({
        title: "Login failed",
        description: error.message || "Invalid username or password",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      try {
        console.log("Sending registration:", { username: credentials.username, passwordLength: credentials.password?.length || 0 });
        
        // Use regular fetch for more control over the response
        const url = isNetlify ? "/.netlify/functions/api/register" : "/api/register";
        console.log(`Register URL: ${url}`);
        
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
          credentials: "include"
        });
        
        console.log(`Register response status: ${res.status}`);
        
        if (!res.ok) {
          let errorMessage = "Registration failed";
          try {
            const errorData = await res.json();
            errorMessage = errorData.message || "Registration failed";
          } catch (e) {
            // If we can't parse JSON, use the status text
            errorMessage = res.statusText || `Error ${res.status}`;
          }
          throw new Error(errorMessage);
        }
        
        return await res.json();
      } catch (err) {
        console.error("Registration error:", err);
        throw err;
      }
    },
    onSuccess: (user: SelectUser) => {
      console.log("Registration successful:", user);
      queryClient.setQueryData(["/api/user"], user);
    },
    onError: (error: Error) => {
      console.error("Registration error details:", error);
      toast({
        title: "Registration failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      // Clear the user data from cache
      queryClient.setQueryData(["/api/user"], null);
      
      // Show success toast
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account",
      });
      
      // Force redirect to login page
      window.location.href = "/auth";
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
