import { createContext, ReactNode, useContext, useState } from "react";
import { 
  useQuery, 
  useMutation,
  UseMutationResult
} from "@tanstack/react-query";
import { apiRequest, getQueryFn, queryClient } from "./queryClient";
import { useToast } from "@/hooks/use-toast";
import { Route, Redirect, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { User } from "@shared/schema";

// Types
type Role = "admin" | "regional" | "store" | "staff";

interface UserWithRole extends User {
  role: Role;
}

type AuthContextType = {
  user: UserWithRole | null;
  isLoading: boolean;
  login: UseMutationResult<UserWithRole, Error, LoginCredentials>;
  register: UseMutationResult<UserWithRole, Error, RegisterCredentials>;
  logout: UseMutationResult<void, Error, void>;
};

type LoginCredentials = {
  username: string;
  password: string;
};

type RegisterCredentials = LoginCredentials & {
  name: string;
  role: Role;
  storeId?: number;
};

// Context
const AuthContext = createContext<AuthContextType | null>(null);

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { 
    data: user, 
    isLoading,
  } = useQuery<UserWithRole | null>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const login = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (userData: UserWithRole) => {
      queryClient.setQueryData(["/api/user"], userData);
      setLocation("/");
      toast({
        title: "Login successful",
        description: `Welcome back, ${userData.name}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const register = useMutation({
    mutationFn: async (credentials: RegisterCredentials) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (userData: UserWithRole) => {
      queryClient.setQueryData(["/api/user"], userData);
      setLocation("/");
      toast({
        title: "Registration successful",
        description: `Welcome, ${userData.name}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const logout = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      setLocation("/auth");
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Protected Route Component
interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType;
  roles?: Role[];
}

export function ProtectedRoute({ path, component: Component, roles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-chai-gold" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <Route path={path}>
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">You don't have permission to access this page.</p>
          <button
            onClick={() => setLocation("/")}
            className="px-4 py-2 bg-chai-gold text-white rounded-md hover:bg-yellow-600 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
