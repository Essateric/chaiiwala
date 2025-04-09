import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from "@/lib/queryClient";
import { User as SelectUser } from "@shared/schema";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { StockWidget } from "@/components/dashboard/stock-widget";
import { useInventory, InventoryWithBreakdown } from "@/hooks/use-inventory";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Store, 
  Users, 
  AlertTriangle,
  Sparkles,
  Package,
  X
} from 'lucide-react';

// Store data from the user's input
const chaiiwalaStores = [
  { id: 1, name: 'Cheetham Hill', address: '74 Bury Old Rd, Manchester M8 5BW', area: 1, manager: 'MGR_CH' },
  { id: 2, name: 'Oxford Road', address: '149 Oxford Rd, Manchester M1 7EE', area: 1, manager: 'MGR_OX' },
  { id: 3, name: 'Old Trafford', address: 'Ayres Rd, Old Trafford, Stretford, 89 M16 7GS', area: 1, manager: 'MGR_OT' },
  { id: 4, name: 'Trafford Centre', address: 'Kiosk K14, The Trafford Centre, Trafford Blvd, Trafford', area: 2, manager: 'MGR_TC' },
  { id: 5, name: 'Stockport', address: '884-886 Stockport Rd, Levenshulme, Manchester', area: 1, manager: 'MGR_SR' },
  { id: 6, name: 'Rochdale', address: '35 Milkstone Rd, Rochdale OL11 1EB', area: 2, manager: 'MGR_RD' },
  { id: 7, name: 'Oldham', address: '66 George St, Oldham OL1 1LS', area: 2, manager: 'MGR_OL' },
];

// Sample sales data for visualization
const salesData = [
  { name: 'Cheetham Hill', sales: 8450 },
  { name: 'Oxford Road', sales: 7320 },
  { name: 'Old Trafford', sales: 5980 },
  { name: 'Trafford Centre', sales: 9200 },
  { name: 'Stockport', sales: 6100 },
  { name: 'Rochdale', sales: 5400 },
  { name: 'Oldham', sales: 4800 },
];

// Sample tasks data
const tasks = [
  { id: 1, title: 'Restock chai supplies', location: 'Cheetham Hill', dueDate: '2025-03-28', completed: false },
  { id: 2, title: 'Staff training session', location: 'Oxford Road', dueDate: '2025-03-29', completed: false },
  { id: 3, title: 'Health inspection preparation', location: 'Trafford Centre', dueDate: '2025-03-30', completed: true },
  { id: 4, title: 'Update menu prices', location: 'All Stores', dueDate: '2025-03-27', completed: false },
];

// Sample notifications data
const notifications = [
  { id: 1, title: 'Low stock alert', description: 'Chai masala running low at Rochdale', time: '2 hours ago', isHighlighted: true },
  { id: 2, title: 'New staff onboarded', description: 'James Wilson joined Oxford Road team', time: '3 hours ago', isHighlighted: false },
  { id: 3, title: 'Weekly sales report', description: 'All stores exceeded targets this week', time: '1 day ago', isHighlighted: false },
];

export default function DashboardBasic() {
  const { toast } = useToast();
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>(undefined);
  const [selectedStoreName, setSelectedStoreName] = useState<string>("All Stores");
  
  // Fetch inventory data for the selected store
  const { inventory, isLoading: isLoadingInventory } = useInventory(selectedStoreId);
  
  // Fetch user data directly - matches approach in ProtectedComponent
  const { data: user } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // Simulate query for stores to be ready for real API integration later
  const { data: stores = chaiiwalaStores, isLoading } = useQuery({
    queryKey: ['/api/stores'],
    queryFn: async () => {
      // This would normally fetch from API
      return chaiiwalaStores;
    },
    enabled: false // Disable actual fetching since we're using sample data
  });
  
  // Get status color for inventory items
  const getStatusColor = (status: string) => {
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
  
  const handleStoreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const storeId = value === "all" ? undefined : Number(value);
    setSelectedStoreId(storeId);
    
    // Update the selected store name
    if (storeId) {
      const store = stores.find(s => s.id === storeId);
      setSelectedStoreName(store?.name || "Unknown Store");
    } else {
      setSelectedStoreName("All Stores");
    }
  };

  return (
    <DashboardLayout title="Dashboard">
      <div className="py-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <p className="text-xs sm:text-sm text-white">
              An overview of your Chaiiwala stores performance
            </p>
          </div>
          <div className="mt-2 md:mt-0 flex items-center">
            <span className="text-xs sm:text-sm text-white">Welcome, {user?.username ? user.username.charAt(0).toUpperCase() + user.username.slice(1) : 'User'}</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                  <Store className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Stores</dt>
                    <dd>
                      <div className="text-lg font-semibold text-gray-900">{stores.length}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                  <Sparkles className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Sales (Weekly)</dt>
                    <dd>
                      <div className="text-lg font-semibold text-gray-900">£ {salesData.reduce((sum, item) => sum + item.sales, 0).toLocaleString()}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Staff</dt>
                    <dd>
                      <div className="text-lg font-semibold text-gray-900">28</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          
          {/* Compact Stock Widget */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex flex-col">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                        <Package className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="ml-2">
                        <span className="text-sm font-medium text-gray-500">Stock</span>
                      </div>
                    </div>
                    <div className="ml-12 mt-1">
                      {!selectedStoreId && inventory ? (
                        <span className="text-lg font-semibold text-gray-900">{inventory.length} items</span>
                      ) : selectedStoreId && inventory ? (
                        <div>
                          <span className="text-lg font-semibold text-gray-900">{inventory.length} items</span>
                          <div className="text-xs text-gray-500 mt-1">
                            {inventory.filter(item => item.status === 'low_stock' || item.status === 'out_of_stock').length > 0 ? (
                              <span className="text-yellow-600">
                                {inventory.filter(item => item.status === 'low_stock').length} low stock
                              </span>
                            ) : (
                              <span className="text-green-600">Stock levels good</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-lg font-semibold text-gray-900">Loading...</span>
                      )}
                    </div>
                  </div>
                  <select 
                    className="border rounded-md py-1 px-2 text-xs bg-white"
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
                
                <div className="mt-1 text-xs text-gray-600">
                  <div 
                    onClick={() => {
                      handleStoreChange({ target: { value: selectedStoreId ? selectedStoreId.toString() : "all" } } as React.ChangeEvent<HTMLSelectElement>);
                      setIsStockDialogOpen(true);
                    }}
                    className="cursor-pointer hover:underline text-chai-gold"
                  >
                    View details
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Charts & Tables */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Sales Chart */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Sales by Store (Weekly)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={salesData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={70}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <Tooltip formatter={(value) => `£${value}`} />
                  <Bar dataKey="sales" fill="#D4AF37" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Tasks */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Upcoming Tasks</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {tasks.map(task => (
                <div key={task.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 h-4 w-4 rounded-full ${task.completed ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{task.title}</p>
                        <p className="text-sm text-gray-500">{task.location} • Due {new Date(task.dueDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${task.completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {task.completed ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-3 bg-gray-50 text-right">
              <button onClick={() => toast({ title: "Coming soon", description: "Task management will be available in the next version" })} className="text-sm font-medium text-chai-gold hover:text-yellow-600">
                View All Tasks
              </button>
            </div>
          </div>
        </div>
        
        {/* Stock Widget */}
        <div className="mt-8">
          <StockWidget stores={stores} />
        </div>
        
        {/* Notifications */}
        <div className="mt-8 mb-12">
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Recent Notifications</h3>
            </div>
            <ul className="divide-y divide-gray-200">
              {notifications.map((notification) => (
                <li key={notification.id} className={notification.isHighlighted ? 'bg-yellow-50' : ''}>
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          {notification.isHighlighted && (
                            <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                          )}
                          <p className={`text-sm font-medium ${notification.isHighlighted ? 'text-yellow-800' : 'text-gray-900'}`}>
                            {notification.title}
                          </p>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">{notification.description}</p>
                      </div>
                      <div className="ml-6 flex-shrink-0">
                        <p className="text-sm text-gray-500">{notification.time}</p>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="px-6 py-3 bg-gray-50 text-right">
              <button onClick={() => toast({ title: "Coming soon", description: "Notifications management will be available in the next version" })} className="text-sm font-medium text-chai-gold hover:text-yellow-600">
                View All Notifications
              </button>
            </div>
          </div>
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
            <div className="space-y-4 p-1">
              {isLoadingInventory ? (
                <div className="space-y-2">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="bg-gray-100 h-14 animate-pulse rounded"></div>
                  ))}
                </div>
              ) : inventory && inventory.length > 0 ? (
                <div className="space-y-2">
                  {(inventory as InventoryWithBreakdown[]).map((item: InventoryWithBreakdown) => (
                    <div key={item.id} className="flex justify-between p-3 rounded-md bg-gray-50 border border-gray-100">
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-gray-500">
                          SKU: {item.sku} • Category: {item.category}
                        </div>
                        {!selectedStoreId && item.storeBreakdown && (
                          <div className="mt-1 text-xs text-gray-500">
                            <details className="cursor-pointer">
                              <summary className="text-chai-gold hover:underline">View breakdown</summary>
                              <div className="mt-1 pl-3 border-l-2 border-gray-200">
                                {item.storeBreakdown.map((store, idx) => (
                                  <div key={idx} className="flex justify-between">
                                    <span>{store.name}:</span>
                                    <span className="font-medium">{store.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            </details>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-sm font-medium">
                          {item.quantity}
                          {!selectedStoreId && item.storeBreakdown && (
                            <span className="ml-1 text-xs text-gray-500">
                              (Combined)
                            </span>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  No stock data available for {selectedStoreName}
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}