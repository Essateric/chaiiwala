import { useQuery, useMutation } from "@tanstack/react-query";
import { Inventory, InsertInventory, Store } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Extended inventory type with store breakdown for combined view
export type InventoryWithBreakdown = Inventory & {
  storeBreakdown?: { storeId: number; name: string; quantity: string }[];
};

export function useInventory(storeId?: number) {
  // Fetch stores data
  const {
    data: stores = []
  } = useQuery<Store[]>({
    queryKey: ['/api/stores']
  });

  const {
    data: inventory,
    isLoading,
    error
  } = useQuery<InventoryWithBreakdown[]>({
    queryKey: ['/api/inventory', storeId],
    queryFn: async () => {
      // Fetch real inventory data from API
      const response = await fetch('/api/inventory');
      if (!response.ok) {
        throw new Error('Failed to fetch inventory data');
      }
      const data: Inventory[] = await response.json();
      
      if (storeId) {
        return data.filter(item => item.storeId === storeId) as InventoryWithBreakdown[];
      } else {
        // For "All Stores" view, combine items by SKU and add store breakdown
        const skuGroups: { [key: string]: Inventory[] } = {};
        
        // Group inventory items by SKU
        data.forEach(item => {
          if (!skuGroups[item.sku]) {
            skuGroups[item.sku] = [];
          }
          skuGroups[item.sku].push(item);
        });
        
        // Create combined inventory items with store breakdown
        const combinedInventory: InventoryWithBreakdown[] = Object.values(skuGroups).map(group => {
          // Use the first item as the base
          const baseItem = { ...group[0] };
          
          // Create store breakdown info
          const storeBreakdown = group.map(item => {
            // Find the store by ID in the stores array
            const store = stores.find(s => s.id === item.storeId);
            return {
              storeId: item.storeId,
              // Use store name if found, otherwise use a generic name
              name: store ? store.name : `Store ${item.storeId}`,
              quantity: item.quantity
            };
          });
          
          // Add combined suffix if multiple stores have this item
          if (group.length > 1) {
            // Just use the base item's quantity for now, ideally we would sum these up
            // but since quantities have units (e.g., "45 boxes"), simple summing is not possible
          }
          
          return {
            ...baseItem,
            storeBreakdown
          };
        });
        
        return combinedInventory;
      }
    }
  });

  // Get low stock items
  const {
    data: lowStockItems,
    isLoading: isLoadingLowStock
  } = useQuery<Inventory[]>({
    queryKey: ['/api/inventory/low-stock', storeId],
    queryFn: async () => {
      // Get all inventory and filter for low/out of stock items
      const response = await fetch('/api/inventory');
      if (!response.ok) {
        throw new Error('Failed to fetch inventory data');
      }
      const data: Inventory[] = await response.json();
      
      // Filter for low stock and out of stock items
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