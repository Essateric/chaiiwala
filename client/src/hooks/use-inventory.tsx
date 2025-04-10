import { useQuery, useMutation } from "@tanstack/react-query";
import { Inventory, InsertInventory, Store } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Extended inventory type with store breakdown for combined view
export type InventoryWithBreakdown = Inventory & {
  storeBreakdown?: { storeId: number; name: string; quantity: string }[];
};

export function useInventory(storeId?: number) {
  // Fetch inventory for the store
  // Fetch stores data
  const {
    data: stores = []
  } = useQuery<Store[]>({
    queryKey: ['/api/stores'],
    queryFn: async () => {
      // Simulated stores data with proper typing
      return [
        { id: 1, name: 'Cheetham Hill', address: '74 Bury Old Rd, Manchester M8 5BW', area: 1, manager: 'MGR_CH' },
        { id: 2, name: 'Oxford Road', address: '149 Oxford Rd, Manchester M1 7EE', area: 1, manager: 'MGR_OX' },
        { id: 3, name: 'Old Trafford', address: 'Ayres Rd, Old Trafford, Stretford, 89 M16 7GS', area: 1, manager: 'MGR_OT' },
        { id: 4, name: 'Trafford Centre', address: 'Kiosk K14, The Trafford Centre, Trafford Blvd, Trafford', area: 2, manager: 'MGR_TC' },
        { id: 5, name: 'Stockport', address: '884-886 Stockport Rd, Levenshulme, Manchester', area: 1, manager: 'MGR_SR' },
        { id: 6, name: 'Rochdale', address: '35 Milkstone Rd, Rochdale OL11 1EB', area: 2, manager: 'MGR_RD' },
        { id: 7, name: 'Oldham', address: '66 George St, Oldham OL1 1LS', area: 2, manager: 'MGR_OL' },
      ];
    }
  });

  const {
    data: inventory,
    isLoading,
    error
  } = useQuery<InventoryWithBreakdown[]>({
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
            const store = stores.find(s => s.id === item.storeId);
            return {
              storeId: item.storeId,
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