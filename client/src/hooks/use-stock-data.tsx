import { useQuery } from "@tanstack/react-query";
import { StockConfig, StoreStockLevel } from "@shared/schema";

export interface StockItemWithLevel extends StockConfig {
  quantity: number;
  lastUpdated: string | null;
  isEdited?: boolean;
}

export interface StockSummary {
  total: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  recentlyUpdated: number; // Updated in the last 24 hours
}

export function useStockData(storeId?: number) {
  // Fetch all stock configuration items
  const { 
    data: stockConfig = [], 
    isLoading: isLoadingStockConfig 
  } = useQuery<StockConfig[]>({
    queryKey: ['/api/stock-config'],
  });

  // Fetch stock levels for specific store if storeId is provided
  const { 
    data: storeStockLevels = [], 
    isLoading: isLoadingStockLevels 
  } = useQuery<StoreStockLevel[]>({
    queryKey: storeId ? [`/api/stock-levels/${storeId}`] : ['/api/stock-levels'],
    enabled: !!stockConfig.length,
  });

  // Combine stock config with levels for display
  const combinedStockData: StockItemWithLevel[] = stockConfig.map(item => {
    let stockLevel;
    
    if (storeId) {
      // If a store is selected, find the specific level for this store
      stockLevel = storeStockLevels.find(level => level.stockItemId === item.id && level.storeId === storeId);
    } else {
      // For "All Stores" view, we'll aggregate or sample a store's data
      stockLevel = storeStockLevels.find(level => level.stockItemId === item.id);
    }

    return {
      ...item,
      quantity: stockLevel?.quantity || 0,
      lastUpdated: stockLevel?.lastUpdated || null,
    };
  });

  // Calculate summary statistics
  const summary: StockSummary = combinedStockData.reduce((acc, item) => {
    acc.total++;
    
    if (item.quantity === 0) {
      acc.outOfStock++;
    } else if (item.quantity <= item.lowStockThreshold) {
      acc.lowStock++;
    } else {
      acc.inStock++;
    }
    
    // Check if item was updated in the last 24 hours
    if (item.lastUpdated) {
      const lastUpdated = new Date(item.lastUpdated);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastUpdated >= yesterday) {
        acc.recentlyUpdated++;
      }
    }
    
    return acc;
  }, {
    total: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
    recentlyUpdated: 0
  });

  // Helper to get stock status for display
  const getStockStatus = (item: StockItemWithLevel) => {
    if (item.quantity === 0) {
      return { 
        label: 'Out of Stock', 
        class: 'bg-red-100 text-red-800 border-red-200'
      };
    } else if (item.quantity <= item.lowStockThreshold) {
      return { 
        label: 'Low Stock', 
        class: 'bg-yellow-100 text-yellow-800 border-yellow-200'
      };
    } else {
      return { 
        label: 'In Stock', 
        class: 'bg-green-100 text-green-800 border-green-200'
      };
    }
  };

  // Filter items by category
  const getItemsByCategory = (category: string) => {
    return combinedStockData.filter(item => item.category === category);
  };

  // Get unique categories
  const categories = Array.from(new Set(stockConfig.map(item => item.category)));

  // Get low stock items for the selected store
  const lowStockItems = combinedStockData.filter(
    item => item.quantity <= item.lowStockThreshold
  );

  // Get out of stock items for the selected store
  const outOfStockItems = combinedStockData.filter(item => item.quantity === 0);

  return {
    stockItems: combinedStockData,
    summary,
    lowStockItems,
    outOfStockItems,
    categories,
    getItemsByCategory,
    getStockStatus,
    isLoading: isLoadingStockConfig || isLoadingStockLevels
  };
}