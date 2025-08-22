import DashboardLayout from "../components/layout/DashboardLayout.jsx";
import StatsCard from "../components/dashboard/stats-card.jsx";
import TaskItem from "../components/dashboard/task-item.jsx";
import AnnouncementItem from "../components/dashboard/announcement-item.jsx";
import {
  Building,
  ClipboardList,
  Package,
  ShoppingCart,
  Loader2
} from "lucide-react";
import { useAuth } from "../hooks/UseAuth.jsx";
import { useToast } from "../hooks/use-toast.jsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card.jsx";
import { Tabs, TabsContent } from "../components/ui/tabs.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { useState, useEffect, useMemo } from "react";
import JobLogsGrid from "../components/Maintenance/JobLogsGrid.jsx";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import TasksLast7DaysChart from "../components/dashboard/TasksLast7DaysChart.jsx";
import { Link } from "react-router-dom";
import DailytaskListChart from "../components/dashboard/DailyTaskListChart.jsx";
import { formatDeliveryDateVerbose } from "../lib/formatters.js";
import {
  getMostRecentFreshwaysDeliveryDate,
  getOrderDateForTodayDelivery,
  isTodayDeliveryDay,
  isOrderDay,
  getOrderCutoffDate
} from "../lib/getFreshwaysDeliveryDate.jsx";
import MaintenanceRequestsPie from "../components/Maintenance/MaintenanceRequestsPie.jsx";
import ChaiiwalaOrderStatusWidget from "../components/orders/ChaiiwalaOrderStatusWidget.jsx";
import StockCheckCompliancePanel from "../components/dashboard/StockCheckCompliancePanel.jsx";
import TaskProgressPanel from "../components/dashboard/TaskProgressPanel.jsx";


// Get the most recent delivery date (today if valid, else yesterday, else last valid)
const deliveryDateISO = getMostRecentFreshwaysDeliveryDate();
const today = new Date();

let deliveryDateStr = null;
let orderDeadlineDate = null;

if (isTodayDeliveryDay(today)) {
  deliveryDateStr = today.toISOString().split("T")[0]; // Use today as delivery date
  orderDeadlineDate = getOrderDateForTodayDelivery(today); // JS Date for cutoff
} else {
  deliveryDateStr = getMostRecentFreshwaysDeliveryDate(today); // Fallback to most recent delivery
  orderDeadlineDate = null;
}


export default function DashboardPage() {
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();

  const [updatingTaskId, setUpdatingTaskId] = useState(null);
const deliveryDate = getMostRecentFreshwaysDeliveryDate();



const now = new Date();
const todayIsOrderDay = isOrderDay(now);
const cutoff11 = getOrderCutoffDate(now);

const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
const endOfToday   = new Date(now); endOfToday.setHours(23, 59, 59, 999);


const { data: orderLogsToday = [], isLoading: isLoadingOrders } = useQuery({
  queryKey: ["freshways_order_log_today", startOfToday.toISOString()],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("freshways_orders")
      .select("id, store_id, created_at, stores(name)")
      .gte("created_at", startOfToday.toISOString())
      .lte("created_at", endOfToday.toISOString())
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  }
});

  const { data: stores = [], isLoading: isLoadingStores } = useQuery({
  queryKey: ["stores"],
  queryFn: async () => {
    const { data, error } = await supabase.from("stores").select("*");
    if (error) throw error;
    return data;
  }
});
  // 2 dropdowns (one for tasks, one for stock), default "all"
  const [selectedTaskStoreId, setSelectedTaskStoreId] = useState("all");
  const [selectedStockStoreId, setSelectedStockStoreId] = useState("all");

  // Fetch dashboard user profile
  const [dashboardProfile, setDashboardProfile] = useState(null);
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) {
        setDashboardProfile(null);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, name, permissions, store_ids")
        .eq("auth_id", user.id)
        .single();
      if (error) setDashboardProfile(null);
      else setDashboardProfile(data);
    };
    fetchProfile();
  }, [user]);

  // Announcements
  const { data: announcements = [], isLoading: isLoadingAnnouncements } = useQuery({
    queryKey: ["recent_announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    }
  });

  // Staff count
  const { data: staffCount = 0 } = useQuery({
    queryKey: ["staff_count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("id", { count: "exact" });
      if (error) throw error;
      return count || 0;
    }
  });

  // Low stock count for selected store or all stores
  const { data: lowStockCount = 0, isLoading: isLoadingLowStock } = useQuery({
    queryKey: ["low_stock_count", selectedStockStoreId],
    queryFn: async () => {
      if (selectedStockStoreId === "all") {
        const { count, error } = await supabase
          .from("stock_items")
          .lt("quantity", 10)
          .select('id', { count: "exact" });
        if (error) throw error;
        return count || 0;
      } else {
        const { count, error } = await supabase
          .from("stock_items")
          .eq("store_id", selectedStockStoreId)
          .lt("quantity", 10)
          .select('id', { count: "exact" });
        if (error) throw error;
        return count || 0;
      }
    },
    enabled: !!stores.length
  });

  // Fetch all checklist rows for today (all stores)
  const today = new Date().toISOString().split("T")[0];
  const { data: checklistRows = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ["v_daily_checklist_with_status", today, selectedTaskStoreId],
    queryFn: async () => {
      let query = supabase
        .from("v_daily_checklist_with_status")
        .select("*")
        .eq("date", today);

      if (selectedTaskStoreId !== "all") {
        query = query.eq("store_id", selectedTaskStoreId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!today
  });




  const storeTaskData = useMemo(() => {
    if (!stores.length) return [];
    // For each store, count number of completed tasks today
    return stores.map(store => {
      const completed = checklistRows.filter(
        row => String(row.store_id) === String(store.id) && row.status === "completed"
      ).length;
      return {
        store: store.name,
        tasksCompleted: completed
      };
    });
  }, [stores, checklistRows]);

const mergedOrderLog = useMemo(() => {
  return stores.map(store => {
    const todays = orderLogsToday.filter(o => o.store_id === store.id);
    const earliest = todays[0] ? new Date(todays[0].created_at) : null;

    if (!todayIsOrderDay) {
      return { storeName: store.name, status: "no_order_day", createdAt: null };
    }

    if (now < cutoff11) {
      if (earliest && earliest <= cutoff11) {
        return { storeName: store.name, status: "placed", createdAt: earliest };
      }
      return { storeName: store.name, status: "pending", createdAt: null };
    }

    if (earliest && earliest <= cutoff11) {
      return { storeName: store.name, status: "placed", createdAt: earliest };
    }
    if (todays.length > 0) {
      return { storeName: store.name, status: "missed_late", createdAt: new Date(todays[0].created_at) };
    }
    return { storeName: store.name, status: "missed", createdAt: null };
  });
}, [stores, orderLogsToday, todayIsOrderDay, now, cutoff11]);



  // For stats card: SUM all rows across all stores if "all"
  let filteredChecklistRows = checklistRows;
  if (selectedTaskStoreId && selectedTaskStoreId !== "all") {
    filteredChecklistRows = checklistRows.filter(row => String(row.store_id) === String(selectedTaskStoreId));
  }

  let totalTasks, completedTasks, percentComplete, openTasksStatDisplay;
  if (selectedTaskStoreId === "all") {
    totalTasks = checklistRows.length;
    completedTasks = checklistRows.filter(row => row.status === "completed").length;
    percentComplete = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
    openTasksStatDisplay = `${completedTasks}/${totalTasks}`;
  } else {
    totalTasks = filteredChecklistRows.length;
    completedTasks = filteredChecklistRows.filter(row => row.status === "completed").length;
    percentComplete = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
    openTasksStatDisplay = `${completedTasks}/${totalTasks}`;
  }

  // Fetch task titles for today's tasks (allDailyTasks)
  const { data: allDailyTasks = [] } = useQuery({
    queryKey: ["all_daily_tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_tasks")
        .select("id, title");
      if (error) throw error;
      return data || [];
    },
    enabled: !!today
  });

  // Map tasks for "Today's Tasks" list
  const todaysTasksForList = useMemo(() => {
    let filteredRows = checklistRows;
    if (selectedTaskStoreId && selectedTaskStoreId !== "all") {
      filteredRows = checklistRows.filter(row => String(row.store_id) === String(selectedTaskStoreId));
    }
    return filteredRows.map(row => ({
      ...row,
      title: allDailyTasks.find(t => t.id === row.task_id)?.title || "Untitled Task",
      location: stores.find(s => s.id === row.store_id)?.name || "Store",
    }));
  }, [checklistRows, allDailyTasks, stores, selectedTaskStoreId]);

  // Task complete handler
  const handleTaskComplete = async (id, newStatus) => {
    setUpdatingTaskId(id);
    const { error } = await supabase
      .from("daily_checklist_status")
      .update({
        status: newStatus,
        completed_at: newStatus === "completed" ? new Date().toISOString() : null,
        user_id: user.id
      })
      .eq("id", id);

    if (error && error.code !== "409") {
      toast({
        title: "❌ Update Failed",
        description: error.message || "Could not update task.",
        variant: "destructive"
      });
    }
    queryClient.invalidateQueries(["freshways_order_log", deliveryDate]);
    setUpdatingTaskId(null);

  };

  // Loading and error handling
  if (isAuthLoading || isLoadingStores) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-chai-gold" />
        <p className="ml-2 text-gray-700">Initializing dashboard...</p>
      </div>
    );
  }
  if (!user && !isAuthLoading) {
    return <p className="p-4 text-center text-red-600">No active session. Please log in.</p>;
  }
  if (!dashboardProfile) {
    return (
      <DashboardLayout title="Dashboard" profile={dashboardProfile} announcements={announcements || []}>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-chai-gold" />
          <p className="ml-2 text-gray-700">Loading dashboard data...</p>
        </div>
      </DashboardLayout>
    );
  }
  if (dashboardProfile?.permissions === "maintenance") {
    return (
      <DashboardLayout title="Maintenance Dashboard" profile={dashboardProfile} announcements={announcements || []}>
        <div className="p-4">
          <h2 className="text-2xl font-montserrat font-bold mb-2">
            Maintenance View
          </h2>
          <p className="mb-4 text-gray-700">
            Welcome, {dashboardProfile?.first_name || dashboardProfile?.name || "Maintenance User"}.
          </p>
          <JobLogsGrid />
        </div>
      </DashboardLayout>
    );
  }

  // Only admin/regional users can see stats and chart
  const canViewStatsAndChart =
    dashboardProfile?.permissions === "admin" ||
    dashboardProfile?.permissions === "regional";

  // ========== MAIN DASHBOARD RENDER ===========
  return (
    <DashboardLayout title="Dashboard" profile={dashboardProfile} announcements={announcements || []}>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <h2 className="text-2xl font-montserrat font-bold mb-2">
          Welcome back, {dashboardProfile?.first_name || dashboardProfile?.name || "there"}.
        </h2>
      </div>
      <Tabs defaultValue="overview" className="mb-6">
        <TabsContent value="overview">
          {canViewStatsAndChart && (
            <>
              {/* Stats cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
<MaintenanceRequestsPie
  daysBack={14}
  icon={Building}
  iconColor="text-blue-600"
  iconBgColor="bg-blue-100"
/>
<ChaiiwalaOrderStatusWidget />
<TaskProgressPanel
   stores={stores}
  selectedTaskStoreId={selectedTaskStoreId}
   onChangeSelectedTaskStoreId={setSelectedTaskStoreId}
   isLoadingTasks={isLoadingTasks}
   percentComplete={percentComplete}
  completedTasks={completedTasks}
  totalTasks={totalTasks}
/>
                 <DailytaskListChart storeTaskData={storeTaskData} />
                {/* Weekly Stock Check Compliance - Regional/Admin Only */}

                <StatsCard
                  title={
                    <span className="flex flex-col">
                      Low Stock Items
                      <select
                        className="border border-gray-200 rounded px-2 py-1 mt-1 text-xs bg-white"
                        value={selectedStockStoreId}
                        onChange={e => setSelectedStockStoreId(e.target.value)}
                      >
                        <option value="all">All Stores</option>
                        {stores.map(store => (
                          <option key={store.id} value={store.id}>{store.name}</option>
                        ))}
                      </select>
                    </span>
                  }
                  value={isLoadingLowStock
                    ? <Loader2 className="h-6 w-6 animate-spin" />
                    : lowStockCount}
                  icon={Package}
                  iconColor="text-red-600"
                  iconBgColor="bg-red-100"
                  change={{ value: "Immediate attention", isPositive: false, text: "" }}
                />
                    <StockCheckCompliancePanel />
                     {/* Freshways Widget */}
    <Card className="relative bg-blue-50 border border-blue-100 shadow-sm h-full">
      <div className="absolute left-4 top-4">
        <div className="rounded-full bg-blue-100 p-2">
          <ShoppingCart className="h-6 w-6 text-blue-600" />
        </div>
      </div>
      <CardHeader className="pl-20 pt-4 pb-2">
        <CardTitle className="text-base font-bold text-gray-800">
          Freshways Order Status
        </CardTitle>
        <CardDescription>
          for delivery on {formatDeliveryDateVerbose(deliveryDate)}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {isLoadingOrders ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : mergedOrderLog.length === 0 ? (
          <p className="text-gray-500 text-sm">No stores available</p>
        ) : (
          <table className="w-full text-sm text-gray-700">
            <thead>
              <tr className="text-left border-b text-xs text-gray-400">
                <th className="py-1">Store</th>
                <th className="py-1">Status</th>
                <th className="py-1">Placed At</th>
              </tr>
            </thead>
            <tbody>
              {mergedOrderLog.map((log, idx) => (
                <tr key={idx} className="border-b">
                  <td className="py-2">{log.storeName}</td>
                  <td className="py-2">
                    {log.status === "placed" ? (
                      <span className="text-green-600 font-semibold">Placed</span>
                    ) : log.status === "missed" ? (
                      <span className="text-red-600 font-semibold">Missed</span>
                    ) : (
                      <span className="text-yellow-600 font-semibold">No Entry</span>
                    )}
                  </td>
                  <td className="py-2">
                    {log.status === "placed" && log.createdAt
                      ? new Date(log.createdAt).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
                  </div>

              </>
          )}

              </TabsContent>
        {/* ... all other tabs remain unchanged ... */}
        <TabsContent value="stock">
          {/* ... Stock Tab Content ... */}
        </TabsContent>
        <TabsContent value="cleaning">
          {/* ... Cleaning Tab Content ... */}
        </TabsContent>
        <TabsContent value="orders">
          {/* ... Orders Tab Content ... */}
        </TabsContent>
        <TabsContent value="maintenance">
          {/* ... Maintenance Tab Content ... */}
        </TabsContent>
        <TabsContent value="staff">
          {/* ... Staff Tab Content ... */}
        </TabsContent>
        <TabsContent value="bookings">
          {/* ... Bookings Tab Content ... */}
        </TabsContent>
        <TabsContent value="audit">
          {/* ... Audit Tab Content ... */}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}