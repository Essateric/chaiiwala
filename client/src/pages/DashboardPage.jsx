// client/src/pages/DashboardPage.jsx
import DashboardLayout from "../components/layout/DashboardLayout.jsx";
import StockWidget from "../components/dashboard/stock-widget.jsx";
import TaskItem from "../components/dashboard/task-item.jsx";
import StatsCard from "../components/dashboard/stats-card.jsx";
import AnnouncementItem from "../components/announcements/announcement-item.jsx";
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
import StockCheckCompliancePanel from "../components/dashboard/StockCheckComplianceWidget.jsx";
import TaskProgressPanel from "../components/dashboard/TaskProgressPanel.jsx";

/* ✅ Use the exact same components as the Daily Checklist page */
import DailyStoreChecklistCard from "../components/checklists/DailyStoreChecklistCard.jsx";
import DailyStockCheck from "../components/checklists/DailyStockCheck.jsx";

/* ✅ Centralized columns for store_stock_levels */
import {
  STORE_STOCK_LEVELS_TABLE,
  STORE_STOCK_LEVELS_SELECT,
} from "@/lib/db-columns.js";

// ---------- Freshways delivery context ----------
const deliveryDateISO = getMostRecentFreshwaysDeliveryDate();
const today = new Date();

let deliveryDateStr = null;
let orderDeadlineDate = null;

if (isTodayDeliveryDay(today)) {
  deliveryDateStr = today.toISOString().split("T")[0];
  orderDeadlineDate = getOrderDateForTodayDelivery(today);
} else {
  deliveryDateStr = getMostRecentFreshwaysDeliveryDate(today);
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

  // ---------- Freshways orders placed today ----------
  const { data: orderLogsToday = [], isLoading: isLoadingOrders } = useQuery({
    queryKey: ["freshways_order_log_today", startOfToday.toISOString(), endOfToday.toISOString()],
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

  // ---------- Stores ----------
  const { data: stores = [], isLoading: isLoadingStores } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("*");
      if (error) throw error;
      return data;
    }
  });

  // Two dropdown states (tasks + stock), default "all"
  const [selectedTaskStoreId, setSelectedTaskStoreId] = useState("all");
  const [selectedStockStoreId, setSelectedStockStoreId] = useState("all");

  // ---------- Current user profile for dashboard ----------
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

  // ---------- Announcements ----------
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

  // ---------- Staff count ----------
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

  // ---------- Low stock count (UPDATED: uses store_stock_levels + threshold) ----------
  const { data: lowStockCount = 0, isLoading: isLoadingLowStock } = useQuery({
    queryKey: ["low_stock_count_threshold", selectedStockStoreId],
    queryFn: async () => {
      // Fetch minimal columns, then compute client-side due to column-vs-column compare
      let query = supabase
        .from(STORE_STOCK_LEVELS_TABLE)
        .select("id, store_id, quantity, threshold");

      if (selectedStockStoreId !== "all") {
        query = query.eq("store_id", selectedStockStoreId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const FALLBACK_THRESHOLD = 10; // business default if no per-row threshold
      const count = (data || []).reduce((acc, row) => {
        const qty = typeof row.quantity === "number" ? row.quantity : null;
        const thr = typeof row.threshold === "number" ? row.threshold : null;
        if (qty === null) return acc;
        const effectiveLimit = thr ?? FALLBACK_THRESHOLD;
        return acc + (qty <= effectiveLimit ? 1 : 0);
      }, 0);

      return count;
    },
    enabled: true
  });

  // ---------- Daily checklist rows (today) ----------
  const todayISO = new Date().toISOString().split("T")[0];
  const { data: checklistRows = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ["v_daily_checklist_with_status", todayISO, selectedTaskStoreId],
    queryFn: async () => {
      let query = supabase
        .from("v_daily_checklist_with_status")
        .select("*")
        .eq("date", todayISO);

      if (selectedTaskStoreId !== "all") {
        query = query.eq("store_id", selectedTaskStoreId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!todayISO
  });

  const storeTaskData = useMemo(() => {
    if (!stores.length) return [];
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

  // ---------- Freshways status merge ----------
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

  // ---------- Stats: open/completed ----------
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

  // ---------- Task titles for list ----------
  const { data: allDailyTasks = [] } = useQuery({
    queryKey: ["all_daily_tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_tasks")
        .select("id, title");
      if (error) throw error;
      return data || [];
    },
    enabled: !!todayISO
  });

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

  // ---------- Toggle task complete ----------
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
    queryClient.invalidateQueries(["freshways_order_log_today"]);
    setUpdatingTaskId(null);
  };

  // ---------- Role gates ----------
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

  const canViewStatsAndChart =
    dashboardProfile?.permissions === "admin" ||
    dashboardProfile?.permissions === "regional";

  /* Store manager's primary store (first id in array) or 'all' for others */
  const myStoreId =
    dashboardProfile?.permissions === "store"
      ? (dashboardProfile?.store_ids?.[0] ?? "all")
      : "all";

  // ---------- MAIN DASH ----------
  return (
    <DashboardLayout title="Dashboard" profile={dashboardProfile} announcements={announcements || []}>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <h2 className="text-2xl font-montserrat font-bold mb-2">
          Welcome back, {dashboardProfile?.first_name || dashboardProfile?.name || "there"}.
        </h2>
      </div>

      <Tabs defaultValue="overview" className="mb-6">
        <TabsContent value="overview">
          {/* Store Manager view: stacked cards – checklist then stock check */}
          {!canViewStatsAndChart && (
            <div className="flex flex-col gap-6 mb-6">
              <DailyStoreChecklistCard
                title="Daily Store Checklist"
                collapsible
                defaultExpanded={true}
              />

              <DailyStockCheck
                title="Daily Stock Check"
                // storeId={myStoreId}
                itemsPerPageProp={10}
                collapsible
                defaultExpanded={true}
              />
            </div>
          )}

          {/* Admin/Regional widgets */}
          {canViewStatsAndChart && (
            <>
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

                <DailytaskListChart storeTaskData={storeTaskData} dateISO={todayISO} />

                <StockCheckCompliancePanel />

                {/* Threshold-aware stock widget */}
                <Card className="relative bg-amber-50 border border-amber-100 shadow-sm h-full">
                  <CardHeader className="pt-4 pb-2">
                    <CardTitle className="text-base font-bold text-gray-800">
                      Stock Status (by Threshold)
                    </CardTitle>
                    <CardDescription>
                      Highlights items at/below their effective limit
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <StockWidget />
                    {/* You can surface lowStockCount here if useful */}
                    {/* <p className="text-sm text-amber-700 mt-3">Low items: {lowStockCount}</p> */}
                  </CardContent>
                </Card>

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
                                ) : log.status === "missed_late" ? (
                                  <span className="text-orange-600 font-semibold">Late (after 11:00)</span>
                                ) : log.status === "pending" ? (
                                  <span className="text-yellow-600 font-semibold">Pending</span>
                                ) : (
                                  <span className="text-gray-500 font-semibold">No Entry</span>
                                )}
                              </td>
                              <td className="py-2">
                                {log.createdAt
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

        {/* other tabs unchanged */}
        <TabsContent value="stock">{/* ... */}</TabsContent>
        <TabsContent value="cleaning">{/* ... */}</TabsContent>
        <TabsContent value="orders">{/* ... */}</TabsContent>
        <TabsContent value="maintenance">{/* ... */}</TabsContent>
        <TabsContent value="staff">{/* ... */}</TabsContent>
        <TabsContent value="bookings">{/* ... */}</TabsContent>
        <TabsContent value="audit">{/* ... */}</TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
