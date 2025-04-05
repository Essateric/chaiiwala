import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/layout/app-layout";
import SummaryCard from "@/components/dashboard/summary-card";
import StoreSelector from "@/components/common/store-selector";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  
  const { data: stores, isLoading: isLoadingStores } = useQuery({
    queryKey: ["/api/stores"],
  });
  
  const { data: maintenanceStats, isLoading: isLoadingMaintenanceStats } = useQuery({
    queryKey: ["/api/maintenance/stats", selectedStoreId],
    enabled: !!selectedStoreId,
  });
  
  // Sample data for demo charts - in a real app, this would come from the API
  const salesData = [
    { name: 'Mon', sales: 2400 },
    { name: 'Tue', sales: 1398 },
    { name: 'Wed', sales: 9800 },
    { name: 'Thu', sales: 3908 },
    { name: 'Fri', sales: 4800 },
    { name: 'Sat', sales: 3800 },
    { name: 'Sun', sales: 4300 },
  ];
  
  const inventoryData = [
    { name: 'Tea Leaves', stock: 85 },
    { name: 'Milk', stock: 90 },
    { name: 'Sugar', stock: 70 },
    { name: 'Spices', stock: 65 },
    { name: 'Cups', stock: 40 },
  ];

  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold">Dashboard</h2>
            <p className="text-gray-400">View key metrics and performance data for Chaiwala stores</p>
          </div>
          
          <div>
            <StoreSelector 
              stores={stores || []} 
              selectedStoreId={selectedStoreId} 
              onSelectStore={setSelectedStoreId}
              isLoading={isLoadingStores}
            />
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SummaryCard
            title="Daily Sales"
            value="£3,850"
            subValue="+5% vs yesterday"
            trend="up"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            iconBgColor="bg-green-500"
          />
          
          <SummaryCard
            title="Open Maintenance"
            value={maintenanceStats?.openJobs.toString() || "—"}
            subValue={maintenanceStats ? `${maintenanceStats.highPriorityJobs} high priority` : "Loading..."}
            trend={maintenanceStats?.jobsLastWeek > 0 ? "down" : "neutral"}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            iconBgColor="bg-red-500"
            isLoading={isLoadingMaintenanceStats}
          />
          
          <SummaryCard
            title="Customer Traffic"
            value="438"
            subValue="+12% vs last week"
            trend="up"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
            iconBgColor="bg-blue-500"
          />
          
          <SummaryCard
            title="Low Stock Items"
            value="5"
            subValue="Action required"
            trend="neutral"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
            iconBgColor="bg-yellow-500"
          />
        </div>
        
        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-dark-secondary border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-gray-300">Weekly Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={salesData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        borderColor: '#374151',
                        color: '#F9FAFB'
                      }} 
                    />
                    <Line type="monotone" dataKey="sales" stroke="#F7D670" strokeWidth={2} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-dark-secondary border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-gray-300">Inventory Levels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={inventoryData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        borderColor: '#374151',
                        color: '#F9FAFB'
                      }} 
                    />
                    <Bar dataKey="stock" fill="#F7D670" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Quick Overview Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-dark-secondary border-gray-700 col-span-1">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-gray-300">Recent Announcements</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingStores ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gold" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-dark p-3 rounded-md border border-gray-700">
                    <h3 className="font-medium text-white">New Menu Items Coming</h3>
                    <p className="text-sm text-gray-400">Three new specialty chai flavors will be available next week.</p>
                    <p className="text-xs text-gray-500 mt-1">Posted 2 days ago</p>
                  </div>
                  
                  <div className="bg-dark p-3 rounded-md border border-gray-700">
                    <h3 className="font-medium text-white">Maintenance Scheduled</h3>
                    <p className="text-sm text-gray-400">System maintenance scheduled for Sunday night.</p>
                    <p className="text-xs text-gray-500 mt-1">Posted 3 days ago</p>
                  </div>
                  
                  <div className="bg-dark p-3 rounded-md border border-gray-700">
                    <h3 className="font-medium text-white">Holiday Hours</h3>
                    <p className="text-sm text-gray-400">Updated holiday hours for all locations. Please review.</p>
                    <p className="text-xs text-gray-500 mt-1">Posted 5 days ago</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="bg-dark-secondary border-gray-700 col-span-1 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-gray-300">Top Performing Stores</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingStores ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gold" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-dark">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Store
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Sales
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Traffic
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Rating
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700 bg-dark-secondary">
                      <tr className="hover:bg-dark">
                        <td className="px-6 py-4 whitespace-nowrap font-medium">Wilmslow Road</td>
                        <td className="px-6 py-4 whitespace-nowrap">£4,875</td>
                        <td className="px-6 py-4 whitespace-nowrap">532</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-gold">★★★★★</span>
                            <span className="ml-2">4.9</span>
                          </div>
                        </td>
                      </tr>
                      <tr className="hover:bg-dark">
                        <td className="px-6 py-4 whitespace-nowrap font-medium">Stockport Road</td>
                        <td className="px-6 py-4 whitespace-nowrap">£4,245</td>
                        <td className="px-6 py-4 whitespace-nowrap">487</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-gold">★★★★</span><span className="text-gray-500">★</span>
                            <span className="ml-2">4.2</span>
                          </div>
                        </td>
                      </tr>
                      <tr className="hover:bg-dark">
                        <td className="px-6 py-4 whitespace-nowrap font-medium">Deansgate</td>
                        <td className="px-6 py-4 whitespace-nowrap">£3,980</td>
                        <td className="px-6 py-4 whitespace-nowrap">445</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-gold">★★★★</span><span className="text-gray-500">★</span>
                            <span className="ml-2">4.3</span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
