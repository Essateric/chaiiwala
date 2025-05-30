import { useState } from "react";
import { useInventory } from "@/hooks/use-inventory";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent
} from "@/components/ui/card";
import { Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function StockWidget({ stores }) {
  const [selectedStoreId, setSelectedStoreId] = useState(undefined);
  const { inventory, isLoading } = useInventory(selectedStoreId);

  const inventoryByStore = {};

  const safeInventory = inventory || [];
  if (safeInventory.length > 0) {
    safeInventory.forEach((item) => {
      const store = stores.find((s) => s.id === item.storeId);
      const storeName = store ? store.name : `Unknown Location (ID: ${item.storeId})`;
      
      if (!inventoryByStore[storeName]) {
        inventoryByStore[storeName] = [];
      }
      inventoryByStore[storeName].push(item);
    });
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'in_stock':
        return 'bg-green-100 text-green-800';
      case 'low_stock':
        return 'bg-yellow-100 text-yellow-800';
      case 'out_of_stock':
        return 'bg-red-100 text-red-800';
      case 'on_order':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStoreChange = (e) => {
    const value = e.target.value;
    setSelectedStoreId(value === "all" ? undefined : Number(value));
  };

  return (
    <Card id="full-stock-widget" className="shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium flex items-center">
            <Package className="h-5 w-5 mr-2 text-chai-gold" />
            Stock Overview
          </CardTitle>
          <select 
            id="stock-store-dropdown"
            className="border rounded-md p-2 text-sm w-40 bg-white"
            value={selectedStoreId?.toString() || "all"}
            onChange={handleStoreChange}
          >
            <option value="all">All Stores</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id.toString()}>
                {store.name}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : safeInventory.length > 0 ? (
          <div className="h-[300px] pr-4 overflow-y-auto">
            <div className="space-y-4">
              {selectedStoreId ? (
                <div className="space-y-2">
                  {safeInventory.map((item) => (
                    <div key={item.id} className="flex justify-between p-2 rounded-md bg-gray-50">
                      <div>
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-gray-500">SKU: {item.sku}</div>
                        {item.storeBreakdown && item.storeBreakdown.length > 1 && (
                          <div className="text-xs text-chai-gold mt-1">
                            Multiple Locations: {item.storeBreakdown.map((s) => s.name).join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-sm">{item.quantity}</div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                Object.entries(inventoryByStore).map(([storeName, items]) => (
                  <div key={storeName} className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700 bg-gray-100 p-2 rounded">{storeName}</h4>
                    {items.map((item) => (
                      <div key={item.id} className="flex justify-between p-2 rounded-md bg-gray-50 ml-2">
                        <div>
                          <div className="font-medium text-sm">{item.name}</div>
                          <div className="text-xs text-gray-500">SKU: {item.sku}</div>
                          {item.storeBreakdown && item.storeBreakdown.length > 1 && (
                            <div className="text-xs text-chai-gold mt-1">
                              Multiple Locations: {item.storeBreakdown.map((s) => s.name).join(', ')}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-sm">{item.quantity}</div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                            {item.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">No stock data available</div>
        )}
      </CardContent>
    </Card>
  );
}
