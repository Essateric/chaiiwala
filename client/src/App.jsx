import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "@/pages/AuthPage";
import DashboardPage from "@/pages/DashboardPage";
import AnnouncementsPage from "@/pages/AnnouncementsPage";
import MaintenancePage from "@/pages/MaintenancePage";
import StockManagementPage from "@/pages/StockManagement";
import StockOrdersPage from "@/pages/StockOrdersPage";
import DeepCleaningPage from "@/pages/DeepCleaningPage";
import SettingsPage from "@/pages/Settings";
import ImportJobLogsPage from "@/pages/ImportJobLogs";
import NotFound from "@/pages/NotFound";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth, AuthProvider } from "@/hooks/UseAuth"; // <<-- make sure AuthProvider is exported!
import UserManagementPage from "./pages/UserManagementPage";
import EventOrdersPage from "./components/eventOrders/EventOrdersPage";

// List of allowed roles for certain pages
const EVENT_ORDERS_ALLOWED_ROLES = ["admin", "regional", "area", "store"];
const ANNOUNCEMENTS_ALLOWED_ROLES = ["admin", "area", "regional", "store"];
const USER_MANAGEMENT_ROLES = ["admin", "regional"];
const SETTINGS_ALLOWED_ROLES = ["admin", "regional"];
const STOCK_MANAGEMENT_ALLOWED_ROLES = ["admin", "regional", "area", "store"];

function AppRoutes() {
  const { user } = useAuth();
  

  return (
    <Router>
      <Routes>
        {/* Login page (NO sidebar) */}
        <Route path="/auth" element={<AuthPage />} />

        {/* Dashboard and main protected routes (each manages its own sidebar/layout if needed) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/maintenance"
          element={
            <ProtectedRoute>
              <MaintenancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/announcements"
          element={
            <ProtectedRoute roles={ANNOUNCEMENTS_ALLOWED_ROLES}>
              <AnnouncementsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock-management"
          element={
            <ProtectedRoute roles={STOCK_MANAGEMENT_ALLOWED_ROLES}>
              <StockManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock-orders"
          element={
            <ProtectedRoute feature="stock_orders">
              <StockOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/deep-cleaning"
          element={
            <ProtectedRoute feature="deep_cleaning">
              <DeepCleaningPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user-management"
          element={
            <ProtectedRoute roles={USER_MANAGEMENT_ROLES}>
              <UserManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/event-orders"
          element={
            <ProtectedRoute roles={EVENT_ORDERS_ALLOWED_ROLES}>
              <EventOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute roles={SETTINGS_ALLOWED_ROLES}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Developer import logs page (NO sidebar) */}
        <Route path="/dev/import-joblogs" element={<ImportJobLogsPage />} />

        {/* NotFound page for non-matching nested routes */}
        <Route path="/not-found" element={<NotFound />} />

        {/* Fallback: redirect to dashboard if logged in, else auth */}
        <Route
          path="*"
          element={
            user ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth" replace />
          }
        />
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
