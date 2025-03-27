import { Route, Switch } from "wouter";
import AuthPage from "@/pages/auth-page";
import DashboardBasic from "@/pages/dashboard-basic";
import InventoryView from "@/pages/inventory-view";
import NotFound from "@/pages/not-found";

function App() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/inventory" component={InventoryView} />
      <Route path="/" component={DashboardBasic} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;
