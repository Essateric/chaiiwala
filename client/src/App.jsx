import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import AnnouncementsPage from "./pages/AnnouncementsPage.jsx";
import MaintenancePage from "./pages/MaintenancePage.jsx";
import StockManagementPage from "./pages/StockManagement.jsx";
import StockOrdersPage from "./pages/StockOrdersPage.jsx";
import DeepCleaningPage from "./pages/DeepCleaningPage.jsx";
import SettingsPage from "./pages/Settings.jsx";
import ImportJobLogsPage from "./pages/ImportJobLogs.jsx";
import NotFound from "./pages/NotFound.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { useAuth, AuthProvider } from "./hooks/UseAuth.jsx"; // <<-- make sure AuthProvider is exported!
import UserManagementPage from "./pages/UserManagementPage.jsx";
import EventOrdersPage from "./components/eventOrders/EventOrdersPage.jsx";
import DailyChecklist from "./pages/DailyChecklist.jsx";
import SupportPage from "./pages/SupportPage.jsx";
import  NotificationListener  from "./components/Support/NotificationListener.jsx";
import { Toaster } from 'sonner';
import CustomerFeedbackPage from "./pages/CustomerFeedbackPage.jsx";


// List of allowed roles for certain pages
const EVENT_ORDERS_ALLOWED_ROLES = ["admin", "regional", "area", "store"];
const ANNOUNCEMENTS_ALLOWED_ROLES = ["admin", "area", "regional", "store"];
const USER_MANAGEMENT_ROLES = ["admin", "regional"];
const SETTINGS_ALLOWED_ROLES = ["admin", "regional"];
const STOCK_MANAGEMENT_ALLOWED_ROLES = ["admin", "regional", "area", "store"];
const DAILY_CHECKLIST_ALLOWED_ROLES = ["area", "store"];


function AppRoutes() {
  const { user } = useAuth();
  

  return (
    <Router>
          <Toaster position="top-right" richColors />
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
        <Route path="/customerfeedback" element={<CustomerFeedbackPage />} />


        {/* Developer import logs page (NO sidebar) */}
        <Route path="/dev/import-joblogs" element={<ImportJobLogsPage />} />

          <Route
    path="/daily-checklist"
    element={
      <ProtectedRoute roles={DAILY_CHECKLIST_ALLOWED_ROLES}>
        <DailyChecklist />
      </ProtectedRoute>
    }
  />
       <Route
          path="/support"
          element={
            <ProtectedRoute>
              <SupportPage />
            </ProtectedRoute>
          }
        />

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
      <NotificationListener />
      <AppRoutes />
    </AuthProvider>
  );
}
