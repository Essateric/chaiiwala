import { useAuth } from "./UseAuth";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export function usePermissions() {
  const { user } = useAuth();

  const { 
    data: permissionsData,
    isLoading,
    error
  } = useQuery({
    queryKey: ["/api/user/permissions"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const hasPermission = (permissionName) => {
    if (!user) return false;

    if (user.role === 'admin') return true;

    if (permissionsData?.permissions) {
      return permissionsData.permissions.some(p => p.name === permissionName);
    }

    if (user.permissions && Array.isArray(user.permissions)) {
      return user.permissions.includes(permissionName);
    }

    return false;
  };

  const hasRole = (requiredRole) => {
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

  const isAssignedToStore = (storeId) => {
    if (!user) return false;

    if (user.role === 'admin' || user.role === 'regional') return true;

    return user.storeId === storeId;
  };

  const canAccess = (feature) => {
    if (!user) return false;

    const featureAccess = {
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

    if (feature === 'stock_orders' && user.role === 'store') {
      const allowedStoreIds = [1, 2, 3, 4, 5, 6, 7];
      return user.storeId ? allowedStoreIds.includes(user.storeId) : false;
    }

    if (permissionsData?.permissions) {
      const matchingPermission = permissionsData.permissions.find(p =>
        p.name === feature || p.name === `${feature}_access` || p.name === `all_access`
      );
      if (matchingPermission) return true;
    }

    const allowedRoles = featureAccess[feature] || [];
    return allowedRoles.includes(user.role);
  };

  const hasStoreAccess = (storeId) => {
    return isAssignedToStore(storeId);
  };

  const canEditStockLevels = () => {
    if (!user) return false;

    if (user.role === 'admin' || user.role === 'regional') return true;

    if (user.role === 'store' && user.storeId) return true;

    return false;
  };

  return {
    hasPermission,
    hasRole,
    isAssignedToStore,
    canAccess,
    hasStoreAccess,
    canEditStockLevels,
    isAuthenticated: !!user,
    userRole: user?.role || null,
    isLoading,
    error,
    permissions: permissionsData?.permissions || []
  };
}
