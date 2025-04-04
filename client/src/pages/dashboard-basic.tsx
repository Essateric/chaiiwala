import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from "@/lib/queryClient";
import { User as SelectUser } from "@shared/schema";
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
  Coffee, 
  Store, 
  Users, 
  CheckSquare, 
  AlertTriangle,
  Sparkles,
  Bell,
  Menu,
  ShoppingBasket,
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { toast } = useToast();
  
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

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar - desktop only */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-grow pt-5 bg-[#1c1f2a] overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4 py-2">
            <div className="h-12 w-auto bg-chai-gold rounded-md flex items-center justify-center mr-3 px-2">
              <img 
                src="/assets/chaiiwala.png" 
                alt="Chaiiwala Logo" 
                className="h-8 w-auto"
              />
            </div>
          </div>
          <div className="mt-5 flex-1 flex flex-col">
            <nav className="flex-1 px-2 pb-4 space-y-1">
              <a href="/" className="bg-chai-gold text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                <Store className="mr-3 flex-shrink-0 h-6 w-6 text-white" />
                Dashboard
              </a>
              <a href="/inventory" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                <ShoppingBasket className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-300" />
                Inventory
              </a>
              <a href="#" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                <Users className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-300" />
                Staff
              </a>
              <a href="#" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                <CheckSquare className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-300" />
                Tasks
              </a>
              <a href="#" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                <Bell className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-300" />
                Announcements
              </a>
            </nav>
          </div>
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="md:hidden fixed top-0 left-0 z-20 w-full bg-[#1c1f2a]">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-10 w-auto bg-chai-gold rounded-md flex items-center justify-center px-2">
              <img 
                src="/assets/chaiiwala.png" 
                alt="Chaiiwala Logo" 
                className="h-6 w-auto"
              />
            </div>
          </div>
          <button 
            onClick={toggleMobileMenu}
            className="text-white focus:outline-none"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-10 bg-[#1c1f2a] pt-14">
          <nav className="px-4 pt-4 pb-5 space-y-1">
            <a href="/" className="bg-chai-gold text-white group flex items-center px-2 py-2 text-base font-medium rounded-md">
              <Store className="mr-3 flex-shrink-0 h-6 w-6 text-white" />
              Dashboard
            </a>
            <a href="/inventory" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-base font-medium rounded-md">
              <ShoppingBasket className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400" />
              Inventory
            </a>
            <a href="#" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-base font-medium rounded-md">
              <Users className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400" />
              Staff
            </a>
            <a href="#" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-base font-medium rounded-md">
              <CheckSquare className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400" />
              Tasks
            </a>
            <a href="#" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-base font-medium rounded-md">
              <Bell className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400" />
              Announcements
            </a>
          </nav>
        </div>
      )}

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1">
          <div className="py-6 px-4 sm:px-6 lg:px-8 mt-12 md:mt-0">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
                <p className="mt-1 text-sm text-gray-500">
                  An overview of your Chaiiwala stores performance
                </p>
              </div>
              <div className="mt-4 md:mt-0 flex items-center">
                <span className="mr-4 text-sm text-gray-700">Welcome, {user?.username || 'User'}</span>
                <a href="/auth" className="bg-chai-gold text-white px-4 py-2 rounded-md hover:bg-yellow-600 transition-colors">
                  Logout
                </a>
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
              
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Pending Tasks</dt>
                        <dd>
                          <div className="text-lg font-semibold text-gray-900">{tasks.filter(task => !task.completed).length}</div>
                        </dd>
                      </dl>
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
            
            {/* Store List */}
            <div className="mt-8">
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">All Stores</h3>
                </div>
                <ul className="divide-y divide-gray-200">
                  {stores.map((store) => (
                    <li key={store.id}>
                      <div className="px-6 py-4 flex items-center">
                        <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                          <div>
                            <div className="flex text-sm">
                              <p className="font-medium text-chai-gold truncate">{store.name}</p>
                              <p className="ml-1 flex-shrink-0 font-normal text-gray-500">
                                • Area {store.area}
                              </p>
                            </div>
                            <div className="mt-2 flex">
                              <div className="flex items-center text-sm text-gray-500">
                                <Store className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                <p>{store.address}</p>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 flex-shrink-0 sm:mt-0">
                            <div className="flex overflow-hidden">
                              <p className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                                {store.manager}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
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
        </main>
      </div>
    </div>
  );
}