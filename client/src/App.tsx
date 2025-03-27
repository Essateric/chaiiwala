import { Route, Switch } from "wouter";
import { ProtectedRoute } from "./lib/auth";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import InventoryPage from "@/pages/inventory-page";
import SchedulePage from "@/pages/schedule-page";
import TasksPage from "@/pages/tasks-page";
import ChecklistsPage from "@/pages/checklists-page";
import AnnouncementsPage from "@/pages/announcements-page";
import StoresPage from "@/pages/stores-page";
import UserManagementPage from "@/pages/user-management-page";
import SettingsPage from "@/pages/settings-page";
import NotFound from "@/pages/not-found";

function App() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/inventory" component={InventoryPage} />
      <ProtectedRoute path="/schedule" component={SchedulePage} />
      <ProtectedRoute path="/tasks" component={TasksPage} />
      <ProtectedRoute path="/checklists" component={ChecklistsPage} />
      <ProtectedRoute path="/announcements" component={AnnouncementsPage} />
      <ProtectedRoute path="/stores" component={StoresPage} roles={["admin", "regional"]} />
      <ProtectedRoute path="/users" component={UserManagementPage} roles={["admin"]} />
      <ProtectedRoute path="/settings" component={SettingsPage} roles={["admin", "regional", "store"]} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;
