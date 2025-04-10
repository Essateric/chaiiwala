import { ReactNode } from "react";
import { Redirect, Route } from "wouter";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface ProtectedRouteProps {
  path: string;
  feature: string;
  children: ReactNode;
}

export function ProtectedRoute({ path, feature, children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  // If auth is still loading, show loading spinner
  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      </Route>
    );
  }

  // If not authenticated, redirect to login
  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Map feature access to roles
  const featureAccess: Record<string, string[]> = {
    'dashboard': ['admin', 'regional', 'store', 'staff'],
    'inventory': ['admin', 'regional', 'store', 'staff'],
    'stock_management': ['admin', 'regional'],
    'tasks': ['admin', 'regional', 'store', 'staff'],
    'staff_schedule': ['admin', 'regional', 'store', 'staff'],
    'announcements': ['admin', 'regional', 'store'],
    'user_management': ['admin'],
    'settings': ['admin', 'regional', 'store'],
    'maintenance': ['admin', 'regional', 'store'],
    'deep_cleaning': ['admin', 'regional', 'store'],
    'event_orders': ['admin', 'regional', 'store'],
    'stock_orders': ['admin', 'regional'],
  };

  // Check for special case of stock orders
  if (feature === 'stock_orders' && user.role === 'store') {
    const allowedStoreIds = [1, 2, 3, 4, 5, 6, 7]; // IDs of the allowed store locations
    const hasAccess = user.storeId ? allowedStoreIds.includes(user.storeId) : false;
    
    if (!hasAccess) {
      return (
        <Route path={path}>
          <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <h1 className="text-2xl font-bold text-red-500 mb-2">Access Denied</h1>
            <p className="text-gray-600 text-center mb-4">
              You don't have permission to access this feature.
            </p>
            <a 
              href="/"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = "/";
              }}
              className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700"
            >
              Return to Dashboard
            </a>
          </div>
        </Route>
      );
    }
  } 
  // For all other features, check role-based access
  else {
    const allowedRoles = featureAccess[feature] || [];
    if (!allowedRoles.includes(user.role)) {
      return (
        <Route path={path}>
          <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <h1 className="text-2xl font-bold text-red-500 mb-2">Access Denied</h1>
            <p className="text-gray-600 text-center mb-4">
              You don't have permission to access this feature.
            </p>
            <a 
              href="/"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = "/";
              }}
              className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700"
            >
              Return to Dashboard
            </a>
          </div>
        </Route>
      );
    }
  }

  // If authenticated and has permission, render the children
  return <Route path={path}>{children}</Route>;
}