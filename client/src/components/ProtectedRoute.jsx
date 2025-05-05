import { Loader2 } from "lucide-react";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/UseAuth";

export function ProtectedRoute({ children, roles }) {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Wait for auth and profile to fully load
  if (isLoading) {
    return (
      
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-chai-gold" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/auth" />;
  }

  // Still wait for profile to load
  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-chai-gold" />
      </div>
    );
  }

  // Redirect maintenance-only users away from non-maintenance pages
  if (profile.permissions === "maintenance" && location.pathname !== "/maintenance") {
    return <Navigate to="/maintenance" replace />;
  }

  // If roles are passed, restrict access
  if (roles && !roles.includes(profile.permissions)) {
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

  return children;
}

export default ProtectedRoute;
