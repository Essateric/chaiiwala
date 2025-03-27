import { Loader2 } from "lucide-react";
import { Route, Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";

type Role = "admin" | "regional" | "store" | "staff";

// This is the component that will be rendered when a protected route matches
function AuthRouteRenderer({
  component: Component,
  roles
}: {
  component: React.ComponentType;
  roles?: Role[];
}) {
  
  const { user, isLoading } = useAuth();
  
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
          onClick={() => window.location.href = "/"}
          className="px-4 py-2 bg-chai-gold text-white rounded-md hover:bg-yellow-600 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }
  
  return <Component />;
}

// The actual ProtectedRoute component returns a Route with our AuthRouteRenderer
export function ProtectedRoute({
  path,
  component,
  roles,
}: {
  path: string;
  component: React.ComponentType;
  roles?: Role[];
}) {
  return (
    <Route path={path}>
      {() => <AuthRouteRenderer component={component} roles={roles} />}
    </Route>
  );
}
