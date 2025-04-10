import { useAuth } from "./use-auth";

// Permission utility hook for role-based access control
export function usePermissions() {
  const { user } = useAuth();

  // Function to check if user has a specific permission
  const hasPermission = (permissionName: string): boolean => {
    if (!user) return false;
    
    // Admin role has all permissions
    if (user.role === 'admin') return true;
    
    // Check permissions array if it exists
    if (user.permissions && Array.isArray(user.permissions)) {
      return user.permissions.includes(permissionName);
    }
    
    return false;
  };

  // Function to check if user has a specific role or higher
  const hasRole = (requiredRole: 'admin' | 'regional' | 'store' | 'staff'): boolean => {
    if (!user) return false;
    
    const roleHierarchy = {
      'admin': 4,
      'regional': 3,
      'store': 2,
      'staff': 1
    };
    
    const userRoleLevel = roleHierarchy[user.role] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;
    
    return userRoleLevel >= requiredRoleLevel;
  };

  // Function to check if user belongs to a specific store
  const isAssignedToStore = (storeId: number): boolean => {
    if (!user) return false;
    
    // Admin and regional managers can access all stores
    if (user.role === 'admin' || user.role === 'regional') return true;
    
    // Store managers and staff can only access their assigned store
    return user.storeId === storeId;
  };

  // Function to check access to specific features based on role and permissions
  const canAccess = (feature: string): boolean => {
    if (!user) return false;
    
    // Map feature names to role requirements
    const featureAccess: Record<string, string[]> = {
      'dashboard': ['admin', 'regional', 'store', 'staff'],
      'inventory': ['admin', 'regional', 'store', 'staff'],
      'stock_management': ['admin', 'regional'],
      'tasks': ['admin', 'regional', 'store', 'staff'],
      'staff_schedule': ['admin', 'regional', 'store', 'staff'],
      'announcements': ['admin', 'regional', 'store'],
      'user_management': ['admin'],
      'settings': ['admin', 'regional', 'store'],
      'maintenance': ['admin', 'regional', 'store'],
      'deep_cleaning': ['admin', 'regional', 'store'],
      'event_orders': ['admin', 'regional', 'store'],
      'stock_orders': ['admin', 'regional'],
    };

    // Special handling for stock orders
    if (feature === 'stock_orders' && user.role === 'store') {
      const allowedStoreIds = [1, 2, 3, 4, 5, 6, 7]; // IDs of the allowed store locations 
      return user.storeId ? allowedStoreIds.includes(user.storeId) : false;
    }
    
    // Check if user's role is in the allowed roles for this feature
    const allowedRoles = featureAccess[feature] || [];
    return allowedRoles.includes(user.role);
  };

  return {
    hasPermission,
    hasRole,
    isAssignedToStore,
    canAccess,
    isAuthenticated: !!user,
    userRole: user?.role || null
  };
}