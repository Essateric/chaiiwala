import { Loader2 } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/UseAuth";

// ❌ No need to import { Children } from "react"

export function ProtectedRoute({ children, roles }) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  console.log("user data:", user);
  console.log("isLoading:", isLoading);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-chai-gold" />
      </div>
    );
  }

  if (!user) {
    console.log("user not found");
    return <Navigate to="/auth" />; // Redirect to login if the user is not authenticated
  }

  if (!isLoading && user?.permissions === "maintenance") {
    return <Navigate to="/maintenance" replace />;
  }

  if (roles && !roles.includes(user.permissions)) {
    console.log("access denied");
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

  // ✅ Correct: render the children
  return children;
}

export default ProtectedRoute;
