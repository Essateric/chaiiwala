import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useInventory(storeId) {
  // Fetch stores data
  const { data: stores = [] } = useQuery({
    queryKey: ['/api/stores'],
    queryFn: async () => {
      const response = await fetch('/api/stores');
      if (!response.ok) {
        throw new Error('Failed to fetch stores');
      }
      return response.json();
    }
  });

  // Fetch inventory data
  const { data: inventory, isLoading, error } = useQuery({
    queryKey: ['/api/inventory', storeId],
    queryFn: async () => {
      const response = await fetch('/api/inventory');
      if (!response.ok) {
        throw new Error('Failed to fetch inventory data');
      }
      const data = await response.json();

      if (storeId) {
        return data.filter(item => item.storeId === storeId);
      } else {
        // Combine inventory for "All Stores" view
        const skuGroups = {};

        data.forEach(item => {
          if (!skuGroups[item.sku]) {
            skuGroups[item.sku] = [];
          }
          skuGroups[item.sku].push(item);
        });

        const combinedInventory = Object.values(skuGroups).map(group => {
          const baseItem = { ...group[0] };
          const storeBreakdown = group.map(item => {
            const store = stores.find(s => s.id === item.storeId);
            return {
              storeId: item.storeId,
              name: store ? store.name : `Unknown Location (ID: ${item.storeId})`,
              quantity: item.quantity,
            };
          });

          return {
            ...baseItem,
            storeBreakdown,
          };
        });

        return combinedInventory;
      }
    }
  });

  // Fetch low stock items
  const { data: lowStockItems, isLoading: isLoadingLowStock } = useQuery({
    queryKey: ['/api/inventory/low-stock', storeId],
    queryFn: async () => {
      const response = await fetch('/api/inventory');
      if (!response.ok) {
        throw new Error('Failed to fetch inventory data');
      }
      const data = await response.json();

      const lowStockData = data.filter(
        item => item.status === 'low_stock' || item.status === 'out_of_stock'
      );

      return storeId
        ? lowStockData.filter(item => item.storeId === storeId)
        : lowStockData;
    }
  });

  // Create a new inventory item
  const createItemMutation = useMutation({
    mutationFn: async (item) => {
      const res = await apiRequest("POST", "/api/inventory", item);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory', storeId] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/low-stock', storeId] });
    }
  });

  // Update an existing inventory item
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await apiRequest("PATCH", `/api/inventory/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory', storeId] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/low-stock', storeId] });
    }
  });

  const createItem = (item) => createItemMutation.mutateAsync(item);
  const updateItem = (id, data) => updateItemMutation.mutateAsync({ id, data });

  return {
    inventory: inventory || [],
    lowStockItems: lowStockItems || [],
    isLoading,
    isLoadingLowStock,
    error,
    createItem,
    updateItem,
    isCreating: createItemMutation.isPending,
    isUpdating: updateItemMutation.isPending,
  };
}
