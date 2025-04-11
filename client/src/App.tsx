import { Route, Switch } from "wouter";
import AuthPageNew from "@/pages/auth-page-new";
import DashboardBasic from "@/pages/dashboard-basic";
import StockManagementView from "@/pages/stock-management";
import DeepCleaningPage from "@/pages/deep-cleaning-page";
import MaintenancePage from "@/pages/maintenance-page";
import EventOrdersPage from "@/pages/event-orders-page";
import StockOrdersPage from "@/pages/stock-orders-page";
import StockLevelsPage from "@/pages/stock-levels-page";
import StoreStockUpdatePage from "@/pages/store-stock-update";
import StoresPage from "@/pages/stores-page";
import SchedulePage from "@/pages/schedule-page";
import AnnouncementsPage from "@/pages/announcements-page";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";
import { ProtectedRoute } from "@/components/protected-route";

function App() {
  return (
    <Switch>
      {/* Public route - no protection needed */}
      <Route path="/auth">
        <AuthPageNew />
      </Route>

      {/* Protected routes - each with feature-specific permission checks */}
      <ProtectedRoute path="/stock-management" feature="stock_management">
        <StockManagementView />
      </ProtectedRoute>

      <ProtectedRoute path="/deep-cleaning" feature="deep_cleaning">
        <DeepCleaningPage />
      </ProtectedRoute>

      <ProtectedRoute path="/maintenance" feature="maintenance">
        <MaintenancePage />
      </ProtectedRoute>

      <ProtectedRoute path="/event-orders" feature="event_orders">
        <EventOrdersPage />
      </ProtectedRoute>

      <ProtectedRoute path="/stock-orders" feature="stock_orders">
        <StockOrdersPage />
      </ProtectedRoute>

      <ProtectedRoute path="/stock-levels" feature="stock_management">
        <StockLevelsPage />
      </ProtectedRoute>

      <ProtectedRoute path="/stores" feature="inventory">
        <StoresPage />
      </ProtectedRoute>

      <ProtectedRoute path="/schedule" feature="staff_schedule">
        <SchedulePage />
      </ProtectedRoute>

      <ProtectedRoute path="/announcements" feature="announcements">
        <AnnouncementsPage />
      </ProtectedRoute>

      <ProtectedRoute path="/settings" feature="settings">
        <SettingsPage />
      </ProtectedRoute>

      <ProtectedRoute path="/dashboard" feature="dashboard">
        <DashboardBasic />
      </ProtectedRoute>

      <ProtectedRoute path="/" feature="dashboard">
        <DashboardBasic />
      </ProtectedRoute>

      {/* 404 route */}
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;
