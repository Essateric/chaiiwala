import { Route, Switch } from "wouter";
import AuthPage from "@/pages/auth-page";
import DashboardBasic from "@/pages/dashboard-basic";
import InventoryView from "@/pages/inventory-view";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";

type Role = "admin" | "regional" | "store" | "staff";

function ProtectedComponent({ 
  children, 
  roles 
}: { 
  children: React.ReactNode;
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
        <a
          href="/"
          className="px-4 py-2 bg-chai-gold text-white rounded-md hover:bg-yellow-600 transition-colors"
        >
          Back to Dashboard
        </a>
      </div>
    );
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/inventory">
        <ProtectedComponent roles={["admin", "regional"]}>
          <InventoryView />
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
