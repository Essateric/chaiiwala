import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

// Interface for sales metrics
interface SalesMetrics {
  totalSales: number;
  previousPeriodSales: number;
  percentChange: number;
  dailySales: {
    date: string;
    amount: number;
  }[];
}

// Interface for inventory metrics
interface InventoryMetrics {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  topSellingItems: {
    name: string;
    quantity: number;
  }[];
}

// Interface for store performance metrics
interface StorePerformance {
  storeId: number;
  storeName: string;
  sales: number;
  percentOfTarget: number;
  customerCount: number;
}

export function useMetrics(storeId?: number, startDate?: Date, endDate?: Date) {
  const { user } = useAuth();
  const currentStoreId = storeId || user?.storeId;
  
  // Sales metrics
  const salesMetricsQuery = useQuery<SalesMetrics>({
    queryKey: ['/api/metrics/sales', currentStoreId, startDate, endDate],
    queryFn: async () => {
      let endpoint = `/api/metrics/sales?storeId=${currentStoreId}`;
      
      if (startDate) {
        endpoint += `&startDate=${startDate.toISOString()}`;
      }
      
      if (endDate) {
        endpoint += `&endDate=${endDate.toISOString()}`;
      }
      
      // For demo purposes, return mock data
      return {
        totalSales: 24680,
        previousPeriodSales: 22540,
        percentChange: 9.5,
        dailySales: [
          { date: '2023-10-01', amount: 3200 },
          { date: '2023-10-02', amount: 3400 },
          { date: '2023-10-03', amount: 3100 },
          { date: '2023-10-04', amount: 3700 },
          { date: '2023-10-05', amount: 3900 },
          { date: '2023-10-06', amount: 4200 },
          { date: '2023-10-07', amount: 3180 }
        ]
      };
    },
    enabled: !!currentStoreId
  });

  // Inventory metrics
  const inventoryMetricsQuery = useQuery<InventoryMetrics>({
    queryKey: ['/api/metrics/inventory', currentStoreId],
    queryFn: async () => {
      const endpoint = `/api/metrics/inventory?storeId=${currentStoreId}`;
      
      // For demo purposes, return mock data
      return {
        totalItems: 48,
        lowStockItems: 5,
        outOfStockItems: 2,
        topSellingItems: [
          { name: 'Chai Latte', quantity: 147 },
          { name: 'Karak Chai', quantity: 135 },
          { name: 'Masala Chai', quantity: 112 },
          { name: 'Samosas', quantity: 98 },
          { name: 'Paratha Rolls', quantity: 76 }
        ]
      };
    },
    enabled: !!currentStoreId
  });

  // Store performance (for regional managers)
  const storePerformanceQuery = useQuery<StorePerformance[]>({
    queryKey: ['/api/metrics/store-performance', user?.regionId],
    queryFn: async () => {
      const endpoint = `/api/metrics/store-performance?regionId=${user?.regionId}`;
      
      // For demo purposes, return mock data
      return [
        { storeId: 1, storeName: 'Leicester', sales: 24680, percentOfTarget: 112, customerCount: 980 },
        { storeId: 2, storeName: 'Birmingham', sales: 20240, percentOfTarget: 97, customerCount: 840 },
        { storeId: 3, storeName: 'London - Piccadilly', sales: 31240, percentOfTarget: 105, customerCount: 1240 },
        { storeId: 4, storeName: 'Manchester', sales: 19750, percentOfTarget: 90, customerCount: 760 }
      ];
    },
    enabled: !!user?.regionId
  });

  return {
    salesMetrics: salesMetricsQuery.data,
    inventoryMetrics: inventoryMetricsQuery.data,
    storePerformance: storePerformanceQuery.data,
    isLoadingSales: salesMetricsQuery.isLoading,
    isLoadingInventory: inventoryMetricsQuery.isLoading,
    isLoadingPerformance: storePerformanceQuery.isLoading,
    salesError: salesMetricsQuery.error,
    inventoryError: inventoryMetricsQuery.error,
    performanceError: storePerformanceQuery.error
  };
}