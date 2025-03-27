import { useQuery, useMutation } from "@tanstack/react-query";
import { Inventory, InsertInventory } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useInventory(storeId?: number) {
  // Fetch inventory for the store
  const {
    data: inventory,
    isLoading,
    error
  } = useQuery<Inventory[]>({
    queryKey: ['/api/inventory', storeId],
    queryFn: async () => {
      const endpoint = storeId 
        ? `/api/inventory?storeId=${storeId}` 
        : '/api/inventory';
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch inventory');
      }
      return response.json();
    },
    enabled: !!storeId
  });

  // Get low stock items
  const {
    data: lowStockItems,
    isLoading: isLoadingLowStock
  } = useQuery<Inventory[]>({
    queryKey: ['/api/inventory/low-stock', storeId],
    queryFn: async () => {
      const endpoint = storeId 
        ? `/api/inventory/low-stock?storeId=${storeId}` 
        : '/api/inventory/low-stock';
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch low stock items');
      }
      return response.json();
    },
    enabled: !!storeId
  });

  // Create a new inventory item
  const createItemMutation = useMutation({
    mutationFn: async (item: InsertInventory) => {
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
    mutationFn: async ({ id, data }: { id: number, data: Partial<Inventory> }) => {
      const res = await apiRequest("PATCH", `/api/inventory/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory', storeId] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/low-stock', storeId] });
    }
  });
  
  const createItem = (item: InsertInventory) => createItemMutation.mutateAsync(item);
  const updateItem = (id: number, data: Partial<Inventory>) => updateItemMutation.mutateAsync({ id, data });

  return {
    inventory: inventory || [],
    lowStockItems: lowStockItems || [],
    isLoading,
    isLoadingLowStock,
    error,
    createItem,
    updateItem,
    isCreating: createItemMutation.isPending,
    isUpdating: updateItemMutation.isPending
  };
}