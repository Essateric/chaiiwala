import { Route, Switch } from "wouter";
import AuthPage from "@/pages/auth-page";
import DashboardBasic from "@/pages/dashboard-basic";
import InventoryView from "@/pages/inventory-view";
import NotFound from "@/pages/not-found";
import { ProtectedRoute } from "./lib/protected-route";

function App() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute 
        path="/inventory" 
        component={InventoryView} 
        roles={["admin", "regional"]} 
      />
      <ProtectedRoute path="/" component={DashboardBasic} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;
