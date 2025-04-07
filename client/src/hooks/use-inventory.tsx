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
      // Simulated inventory data with proper typing
      const data: Inventory[] = [
        { id: 1, name: 'Chai Masala', sku: 'CM001', category: 'Spices', storeId: 1, quantity: '45 boxes', status: 'in_stock', lastUpdated: new Date() },
        { id: 2, name: 'Tea bags (Assam)', sku: 'TB002', category: 'Tea', storeId: 1, quantity: '12 boxes', status: 'low_stock', lastUpdated: new Date() },
        { id: 3, name: 'Cardamom', sku: 'CD003', category: 'Spices', storeId: 1, quantity: '30 bags', status: 'in_stock', lastUpdated: new Date() },
        { id: 4, name: 'Ginger powder', sku: 'GP004', category: 'Spices', storeId: 2, quantity: '0 bags', status: 'out_of_stock', lastUpdated: new Date() },
        { id: 5, name: 'Milk powder', sku: 'MP005', category: 'Dairy', storeId: 2, quantity: '15 bags', status: 'in_stock', lastUpdated: new Date() },
        { id: 6, name: 'Sugar', sku: 'SG006', category: 'Sweeteners', storeId: 3, quantity: '50 kg', status: 'in_stock', lastUpdated: new Date() },
        { id: 7, name: 'Paper cups', sku: 'PC007', category: 'Packaging', storeId: 3, quantity: '10 packs', status: 'low_stock', lastUpdated: new Date() },
        { id: 8, name: 'Samosa pastry', sku: 'SP008', category: 'Food', storeId: 4, quantity: '8 packs', status: 'low_stock', lastUpdated: new Date() },
        { id: 9, name: 'Paper bags', sku: 'PB009', category: 'Packaging', storeId: 5, quantity: '100 pcs', status: 'in_stock', lastUpdated: new Date() },
        { id: 10, name: 'Paneer', sku: 'PN010', category: 'Dairy', storeId: 6, quantity: '5 kg', status: 'on_order', lastUpdated: new Date() },
      ];
      
      return data.filter(item => !storeId || item.storeId === storeId);
    }
  });

  // Get low stock items
  const {
    data: lowStockItems,
    isLoading: isLoadingLowStock
  } = useQuery<Inventory[]>({
    queryKey: ['/api/inventory/low-stock', storeId],
    queryFn: async () => {
      // Return items filtered by low stock status
      const data: Inventory[] = [
        { id: 2, name: 'Tea bags (Assam)', sku: 'TB002', category: 'Tea', storeId: 1, quantity: '12 boxes', status: 'low_stock', lastUpdated: new Date() },
        { id: 7, name: 'Paper cups', sku: 'PC007', category: 'Packaging', storeId: 3, quantity: '10 packs', status: 'low_stock', lastUpdated: new Date() },
        { id: 8, name: 'Samosa pastry', sku: 'SP008', category: 'Food', storeId: 4, quantity: '8 packs', status: 'low_stock', lastUpdated: new Date() },
        { id: 4, name: 'Ginger powder', sku: 'GP004', category: 'Spices', storeId: 2, quantity: '0 bags', status: 'out_of_stock', lastUpdated: new Date() },
      ];
      
      return data.filter(item => !storeId || item.storeId === storeId);
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