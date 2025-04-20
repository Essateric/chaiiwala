import { Route, Switch } from "wouter";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import AuthPageNew from "@/pages/auth-page-new";
import DashboardBasic from "@/pages/dashboard-basic";
import StoreManagerDashboard from "@/pages/store-manager-dashboard";
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
import { Loader2 } from "lucide-react";

// IDs of the 7 specific store locations that get the special dashboard
const SPECIAL_DASHBOARD_STORE_IDS = [1, 2, 3, 4, 5, 6, 7];

function App() {
  const { user, isLoading } = useAuth();
  const [isRouteLoading, setIsRouteLoading] = useState(true);
  
  useEffect(() => {
    if (!isLoading) {
      setIsRouteLoading(false);
    }
    
    // If user has maintenance role, redirect them to maintenance page
    if (user && user.role === 'maintenance' && window.location.pathname === '/') {
      window.location.href = '/maintenance';
    }
  }, [isLoading, user]);

  // Show loading screen while routes are being determined
  if (isRouteLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  const shouldUseSpecialDashboard = 
    user && 
    user.role === 'store' && 
    user.storeId && 
    SPECIAL_DASHBOARD_STORE_IDS.includes(user.storeId);

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

      <Route path="/maintenance">
        <MaintenancePage />
      </Route>

      <ProtectedRoute path="/event-orders" feature="event_orders">
        <EventOrdersPage />
      </ProtectedRoute>

      <ProtectedRoute path="/stock-orders" feature="stock_orders">
        <StockOrdersPage />
      </ProtectedRoute>

      <ProtectedRoute path="/stock-levels" feature="stock_management">
        <StockLevelsPage />
      </ProtectedRoute>

      <ProtectedRoute path="/store-stock-update" feature="inventory">
        <StoreStockUpdatePage />
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

      {/* Dashboard routes - conditionally render based on user role and store ID */}
      <ProtectedRoute path="/dashboard" feature="dashboard">
        {user?.role === 'maintenance' ? <MaintenancePage /> : 
         shouldUseSpecialDashboard ? <StoreManagerDashboard /> : <DashboardBasic />}
      </ProtectedRoute>

      <ProtectedRoute path="/" feature="dashboard">
        {user?.role === 'maintenance' ? <MaintenancePage /> : 
         shouldUseSpecialDashboard ? <StoreManagerDashboard /> : <DashboardBasic />}
      </ProtectedRoute>

      {/* 404 route */}
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;
