import { useState } from 'react';
import { Package, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { useStockData, StockItemWithLevel } from '@/hooks/use-stock-data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from '@/components/ui/skeleton';
import { X } from 'lucide-react';
import { Link } from 'wouter';

// Store interface for typing
interface StoreData {
  id: number;
  name: string;
  address: string;
  area?: number;
  manager?: string;
}

export function StockLevelPanel() {
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>(undefined);
  const [selectedStoreName, setSelectedStoreName] = useState<string>("All Stores");
  
  // Fetch real store data from database
  const { data: stores = [], isLoading: isLoadingStores } = useQuery<StoreData[]>({
    queryKey: ['/api/stores'],
  });
  
  // Use our new stock data hook
  const { 
    stockItems, 
    summary, 
    lowStockItems,
    outOfStockItems,
    isLoading: isLoadingStock,
    getStockStatus
  } = useStockData(selectedStoreId);
  
  const handleStoreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const storeId = value === "all" ? undefined : Number(value);
    setSelectedStoreId(storeId);
    
    // Update the selected store name
    if (storeId) {
      const store = stores.find((s: StoreData) => s.id === storeId);
      setSelectedStoreName(store?.name || "Unknown Store");
    } else {
      setSelectedStoreName("All Stores");
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-base font-medium text-gray-900">Stock Overview</h3>
        <div className="flex-shrink-0 bg-purple-100 rounded-md p-2">
          <Package className="h-5 w-5 text-purple-600" />
        </div>
      </div>
      <div className="p-5 pt-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            {isLoadingStock ? (
              <Skeleton className="h-6 w-40" />
            ) : (
              <div>
                <span className="text-sm font-semibold text-gray-900">
                  {summary.total} items in {selectedStoreName}
                </span>
                <div className="text-xs text-gray-500 mt-1">
                  {summary.lowStock > 0 || summary.outOfStock > 0 ? (
                    <span className="text-yellow-600">
                      {summary.outOfStock > 0 ? `${summary.outOfStock} out of stock` : ''}
                      {summary.outOfStock > 0 && summary.lowStock > 0 ? ', ' : ''}
                      {summary.lowStock > 0 ? `${summary.lowStock} low stock items` : ''}
                    </span>
                  ) : (
                    <span className="text-green-600">All stock levels good</span>
                  )}
                </div>
              </div>
            )}
          </div>
          <select 
            className="border rounded-md py-1 px-2 text-xs bg-white"
            value={selectedStoreId?.toString() || "all"}
            onChange={handleStoreChange}
            disabled={isLoadingStores}
          >
            <option value="all">All Stores</option>
            {stores.map((store: StoreData) => (
              <option key={store.id} value={store.id.toString()}>
                {store.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="mt-3 space-y-3">
          {isLoadingStock ? (
            <>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </>
          ) : (
            <>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600">In Stock</span>
                <span className="font-medium text-green-600">{summary.inStock}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600">Low Stock</span>
                <span className="font-medium text-yellow-600">{summary.lowStock}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600">Out of Stock</span>
                <span className="font-medium text-red-600">{summary.outOfStock}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600">Recently Updated</span>
                <span className="font-medium text-blue-600">{summary.recentlyUpdated}</span>
              </div>
            </>
          )}
        </div>
        
        <div className="mt-4 text-right">
          <Button
            variant="link"
            size="sm"
            className="text-chai-gold hover:text-amber-600"
            onClick={() => setIsStockDialogOpen(true)}
          >
            View Full Inventory
          </Button>
        </div>
      </div>
      
      {/* Stock Dialog */}
      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader className="flex justify-between items-center">
            <DialogTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2 text-chai-gold" />
              Stock Inventory - {selectedStoreName}
            </DialogTitle>
            <button 
              onClick={() => setIsStockDialogOpen(false)}
              className="rounded-full p-1 hover:bg-gray-100"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </DialogHeader>
          
          <ScrollArea className="h-[400px] pr-4">
            {isLoadingStock ? (
              <div className="space-y-2">
                {[1,2,3,4].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : outOfStockItems.length > 0 || lowStockItems.length > 0 ? (
              <div className="space-y-4">
                {outOfStockItems.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center">
                      <AlertTriangle className="h-4 w-4 text-red-500 mr-1" />
                      Out of Stock Items
                    </h4>
                    <div className="space-y-2">
                      {outOfStockItems.map((item) => (
                        <StockItemCard key={`out-${item.id}`} item={item} />
                      ))}
                    </div>
                  </div>
                )}
                
                {lowStockItems.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center mt-4">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mr-1" />
                      Low Stock Items
                    </h4>
                    <div className="space-y-2">
                      {lowStockItems.map((item) => (
                        <StockItemCard key={`low-${item.id}`} item={item} />
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-4 flex justify-between border-t pt-4">
                  <span className="text-sm text-gray-600">
                    Showing {outOfStockItems.length + lowStockItems.length} of {stockItems.length} items
                  </span>
                  <Link href={selectedStoreId ? `/store-stock-update?storeId=${selectedStoreId}` : "/stock-levels"}>
                    <Button size="sm" className="bg-chai-gold hover:bg-amber-600">
                      Update Stock Levels
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-3">
                  <Package className="h-6 w-6 text-green-600" />
                </div>
                <h4 className="text-lg font-medium text-gray-900">All Stock Levels Good</h4>
                <p className="text-sm text-gray-500 mt-1">
                  All items are well-stocked at this location.
                </p>
                <div className="mt-4">
                  <Link href={selectedStoreId ? `/store-stock-update?storeId=${selectedStoreId}` : "/stock-levels"}>
                    <Button size="sm" className="bg-chai-gold hover:bg-amber-600">
                      View All Stock Items
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StockItemCard({ item }: { item: StockItemWithLevel }) {
  const status = item.quantity === 0 
    ? { label: 'Out of Stock', class: 'bg-red-100 text-red-800 border-red-200' }
    : item.quantity <= item.lowStockThreshold 
      ? { label: 'Low Stock', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
      : { label: 'In Stock', class: 'bg-green-100 text-green-800 border-green-200' };

  return (
    <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
      <div className="flex justify-between">
        <div>
          <h4 className="text-sm font-medium">{item.name}</h4>
          <div className="text-xs text-gray-500 mt-1 flex space-x-3">
            <span>Code: {item.itemCode}</span>
            {item.lastUpdated && (
              <span>Updated: {format(new Date(item.lastUpdated), 'dd/MM/yyyy')}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end">
          <Badge variant="outline" className={`stock-status-badge ${status.class}`}>
            {status.label}
          </Badge>
          <span className="text-sm font-medium mt-1">
            {item.quantity} {item.quantity === 1 ? 'unit' : 'units'}
          </span>
        </div>
      </div>
    </div>
  );
}