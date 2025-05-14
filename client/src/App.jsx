import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "@/pages/AuthPage";
import DashboardPage from "@/pages/DashboardPage";
import MaintenancePage from "@/pages/MaintenancePage";
import StockManagementPage from "@/pages/StockManagement";
import ImportJobLogsPage from "@/pages/ImportJobLogs";
import NotFound from "@/pages/NotFound";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/UseAuth";
import UserManagementPage from "./pages/UserManagementPage";


function App() {
  const { user, isLoading } = useAuth();
  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute feature="dashboard">
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/maintenance"
          element={
            <ProtectedRoute feature="maintenance">
              <MaintenancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock-management"
          element={
            <ProtectedRoute feature="stock_management">
              <StockManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user-management"
          element={
            <ProtectedRoute feature="user_management">
              <UserManagementPage />
            </ProtectedRoute>
          }
        />
        <Route path="/dev/import-joblogs" element={<ImportJobLogsPage />} />
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

export default App;
