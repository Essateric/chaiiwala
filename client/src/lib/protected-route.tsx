import { Loader2 } from "lucide-react";
import { Route, Redirect, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

type Role = "admin" | "regional" | "store" | "staff";

type ProtectedRouteProps = {
  path: string;
  component: React.ComponentType;
  roles?: Role[];
};

// The actual route component
export function ProtectedRoute({ path, component: Component, roles }: ProtectedRouteProps) {
  return (
    <Route path={path}>
      {() => {
        // This function creates a new React element each time it's called
        // which ensures the hooks are called in the same order each render
        const { user, isLoading } = useAuth();
        const [, navigate] = useLocation();
        
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-chai-gold" />
            </div>
          );
        }
        
        if (!user) {
          return <Redirect to="/auth" />;
        }
        
        if (roles && !roles.includes(user.role as Role)) {
          return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
              <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
              <p className="text-gray-600 mb-6">You don't have permission to access this page.</p>
              <button
                onClick={() => navigate("/")}
                className="px-4 py-2 bg-chai-gold text-white rounded-md hover:bg-yellow-600 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          );
        }
        
        return <Component />;
      }}
    </Route>
  );
}
