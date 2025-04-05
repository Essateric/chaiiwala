import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { StoreSelector } from "@/components/layout/store-selector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function Dashboard() {
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const { user } = useAuth();
  
  // This would be a real API call in production
  const { data: storeKpis, isLoading: loadingKpis } = useQuery({
    queryKey: ['/api/kpis', selectedStoreId],
    queryFn: async () => {
      // Simulated data for mockup purposes - in real app, this would come from the API
      return {
        sales: 28540,
        customers: 1245,
        averageOrder: 22.92,
        popularItems: [
          { name: "Masala Chai", value: 428 },
          { name: "Karak Chai", value: 376 },
          { name: "Samosa", value: 312 },
          { name: "Butter Chicken", value: 253 },
          { name: "Mango Lassi", value: 195 }
        ],
        dailySales: [
          { day: "Mon", sales: 3250 },
          { day: "Tue", sales: 3800 },
          { day: "Wed", sales: 4200 },
          { day: "Thu", sales: 3900 },
          { day: "Fri", sales: 4800 },
          { day: "Sat", sales: 4950 },
          { day: "Sun", sales: 3640 }
        ],
        maintenanceAlerts: 2,
        lowStockItems: 5
      };
    },
  });

  // Handler for store selection
  const handleStoreChange = (storeId: number | null) => {
    setSelectedStoreId(storeId);
  };

  return (
    <MainLayout 
      title="Dashboard" 
      description={`Welcome ${user?.fullName}, here's an overview of your stores performance.`}
    >
      {/* Store selector in the header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <StoreSelector
          onStoreChange={handleStoreChange}
          selectedStoreId={selectedStoreId}
        />
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-[#262a38] border-gray-700">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400">Total Sales</CardDescription>
            <CardTitle className="text-2xl text-gray-200">
              {loadingKpis ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                `£${storeKpis?.sales.toLocaleString()}`
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-gray-400">This Week</div>
          </CardContent>
        </Card>
        
        <Card className="bg-[#262a38] border-gray-700">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400">Customers</CardDescription>
            <CardTitle className="text-2xl text-gray-200">
              {loadingKpis ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                storeKpis?.customers.toLocaleString()
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-gray-400">This Week</div>
          </CardContent>
        </Card>
        
        <Card className="bg-[#262a38] border-gray-700">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400">Average Order</CardDescription>
            <CardTitle className="text-2xl text-gray-200">
              {loadingKpis ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                `£${storeKpis?.averageOrder.toFixed(2)}`
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-gray-400">This Week</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="bg-[#262a38] border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg text-gray-200">Daily Sales</CardTitle>
            <CardDescription className="text-gray-400">Last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loadingKpis ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={storeKpis?.dailySales}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d4af37" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#d4af37" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#262a38', borderColor: '#4b5563' }}
                    labelStyle={{ color: '#d4af37' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#d4af37" 
                    fillOpacity={1} 
                    fill="url(#colorSales)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-[#262a38] border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg text-gray-200">Popular Items</CardTitle>
            <CardDescription className="text-gray-400">Top selling items this week</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loadingKpis ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={storeKpis?.popularItems}>
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#262a38', borderColor: '#4b5563' }}
                    labelStyle={{ color: '#d4af37' }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#d4af37" 
                    barSize={30} 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-[#262a38] border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg text-gray-200">Maintenance Alerts</CardTitle>
            <CardDescription className="text-gray-400">Issues requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingKpis ? (
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-[#2d3142] rounded-md">
                  <div>
                    <div className="font-medium">Coffee machine pressure issue</div>
                    <div className="text-sm text-gray-400">Stockport Road</div>
                  </div>
                  <div className="px-2 py-1 rounded-full bg-red-900 bg-opacity-20 text-red-400 text-xs font-medium">
                    High
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#2d3142] rounded-md">
                  <div>
                    <div className="font-medium">Refrigerator not cooling properly</div>
                    <div className="text-sm text-gray-400">Stockport Road</div>
                  </div>
                  <div className="px-2 py-1 rounded-full bg-yellow-900 bg-opacity-20 text-yellow-400 text-xs font-medium">
                    Medium
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-[#262a38] border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg text-gray-200">Inventory Alerts</CardTitle>
            <CardDescription className="text-gray-400">Items low in stock</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingKpis ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-[#2d3142] rounded-md">
                  <div>
                    <div className="font-medium">Cardamom</div>
                    <div className="text-sm text-gray-400">2 units remaining</div>
                  </div>
                  <div className="px-2 py-1 rounded-full bg-red-900 bg-opacity-20 text-red-400 text-xs font-medium">
                    Critical
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#2d3142] rounded-md">
                  <div>
                    <div className="font-medium">Basmati Rice</div>
                    <div className="text-sm text-gray-400">5kg remaining</div>
                  </div>
                  <div className="px-2 py-1 rounded-full bg-yellow-900 bg-opacity-20 text-yellow-400 text-xs font-medium">
                    Low
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#2d3142] rounded-md">
                  <div>
                    <div className="font-medium">Takeaway Cups (Medium)</div>
                    <div className="text-sm text-gray-400">50 units remaining</div>
                  </div>
                  <div className="px-2 py-1 rounded-full bg-yellow-900 bg-opacity-20 text-yellow-400 text-xs font-medium">
                    Low
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
