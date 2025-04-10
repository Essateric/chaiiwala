import { Route, Switch } from "wouter";
import AuthPageNew from "@/pages/auth-page-new";
import DashboardBasic from "@/pages/dashboard-basic";
import StockManagementView from "@/pages/stock-management";
import DeepCleaningPage from "@/pages/deep-cleaning-page";
import MaintenancePage from "@/pages/maintenance-page";
import EventOrdersPage from "@/pages/event-orders-page";
import StockOrdersPage from "@/pages/stock-orders-page";
import StoresPage from "@/pages/stores-page";
import SchedulePage from "@/pages/schedule-page";
import AnnouncementsPage from "@/pages/announcements-page";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";
import { Redirect } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { User as SelectUser } from "@shared/schema";

type Role = "admin" | "regional" | "store" | "staff";

function ProtectedComponent({ 
  children, 
  roles 
}: { 
  children: React.ReactNode;
  roles?: Role[];
}) {
  // Direct query instead of using useAuth hook
  const { 
    data: user, 
    isLoading,
    isError,
    error 
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-chai-gold" />
      </div>
    );
  }
  
  // Handle query errors
  if (isError && error) {
    console.error("Auth query error:", error);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
        <p className="text-gray-600 mb-6">There was a problem checking your authentication. Please try logging in again.</p>
        <a
          href="/auth"
          className="px-4 py-2 bg-chai-gold text-white rounded-md hover:bg-yellow-600 transition-colors"
        >
          Login
        </a>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!user) {
    console.log("User not authenticated, redirecting to /auth");
    return <Redirect to="/auth" />;
  }
  
  console.log("User authenticated:", user.username, "with role", user.role);
  
  // Check role-based access
  if (roles && !roles.includes(user.role as Role)) {
    console.log("Access denied: User has role", user.role, "but needs one of", roles);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-gray-600 mb-6">You don't have permission to access this page.</p>
        <a
          href="/"
          className="px-4 py-2 bg-chai-gold text-white rounded-md hover:bg-yellow-600 transition-colors"
        >
          Back to Dashboard
        </a>
      </div>
    );
  }
  
  // All checks passed - render the component
  return <>{children}</>;
}

function App() {
  return (
    <Switch>
      <Route path="/auth">
        <AuthPageNew />
      </Route>
      <Route path="/stock-management">
        <ProtectedComponent roles={["admin", "regional"]}>
          <StockManagementView />
        </ProtectedComponent>
      </Route>
      <Route path="/deep-cleaning">
        <ProtectedComponent roles={["admin", "regional", "store"]}>
          <DeepCleaningPage />
        </ProtectedComponent>
      </Route>
      <Route path="/maintenance">
        <ProtectedComponent roles={["admin", "regional", "store"]}>
          <MaintenancePage />
        </ProtectedComponent>
      </Route>
      <Route path="/event-orders">
        <ProtectedComponent roles={["admin", "regional", "store"]}>
          <EventOrdersPage />
        </ProtectedComponent>
      </Route>
      <Route path="/stock-orders">
        <ProtectedComponent roles={["admin", "regional", "store"]}>
          <StockOrdersPage />
        </ProtectedComponent>
      </Route>
      <Route path="/stores">
        <ProtectedComponent roles={["admin", "regional"]}>
          <StoresPage />
        </ProtectedComponent>
      </Route>
      <Route path="/schedule">
        <ProtectedComponent roles={["admin", "regional", "store", "staff"]}>
          <SchedulePage />
        </ProtectedComponent>
      </Route>
      <Route path="/announcements">
        <ProtectedComponent roles={["admin", "regional", "store"]}>
          <AnnouncementsPage />
        </ProtectedComponent>
      </Route>
      <Route path="/dashboard">
        <ProtectedComponent>
          <DashboardBasic />
        </ProtectedComponent>
      </Route>
      <Route path="/">
        <ProtectedComponent>
          <DashboardBasic />
        </ProtectedComponent>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;
