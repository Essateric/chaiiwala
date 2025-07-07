import DashboardLayout from "../components/layout/DashboardLayout.jsx";
import StatsCard from "../components/dashboard/stats-card.jsx";
import TaskItem from "../components/dashboard/task-item.jsx";
import AnnouncementItem from "../components/dashboard/announcement-item.jsx";
import {
  Building,
  BadgeAlert,
  Users,
  ClipboardList,
  Package,
  Calendar,
  Brush,
  BarChart3,
  Bell,
  ShoppingCart,
  Wrench,
  CalendarPlus,
  Clipboard,
  Loader2
} from "lucide-react";
import { useAuth } from "../hooks/UseAuth.jsx";
import { useToast } from "../hooks/use-toast.jsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs.jsx";
import { Separator } from "../components/ui/separator.jsx";
import { Button } from "../components/ui/button.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { useState, useEffect, useMemo } from "react";
import JobLogsGrid from "../components/Maintenance/JobLogsGrid.jsx";
import AddUserForm from "../components/AddUserForm.jsx";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import TasksLast30DaysChart from "../components/dashboard/TasksLast30DaysChart.jsx";
import StockWidget from "../components/dashboard/stock-widget.jsx"; // Import the StockWidget
import { Link } from "react-router-dom";


export default function DashboardPage() {
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading, profile: authProfile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all stores for dropdown
  const { data: stores = [], isLoading: isLoadingStores } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name");
      if (error) throw error;
      return data || [];
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
        // All stores: count all low stock items
        const { count, error } = await supabase
          .from("stock_items")
          .lt("quantity", 10)
          .select('id', { count: "exact" });
        if (error) throw error;
        return count || 0;
      } else {
        // Single store
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
    queryKey: ["daily_checklist_status", today],
    queryFn: async () => {
      // fetch all checklist rows for today (all stores)
      const { data, error } = await supabase
        .from("daily_checklist_status")
        .select("id, task_id, store_id, status, date")
        .eq("date", today); // adjust if needed for your column
      if (error) throw error;
      return data || [];
    },
    enabled: !!today
  });

  // Calculate percent/complete/total for stats card
  let filteredChecklistRows = checklistRows;
  if (selectedTaskStoreId && selectedTaskStoreId !== "all") {
    filteredChecklistRows = checklistRows.filter(row => String(row.store_id) === String(selectedTaskStoreId));
  }
  const totalTasks = filteredChecklistRows.length;
  const completedTasks = filteredChecklistRows.filter(row => row.status === "completed").length;
  const percentComplete = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  // For "All Stores" show %, else show completed/total
  let openTasksStatDisplay;
  if (selectedTaskStoreId === "all") {
    openTasksStatDisplay = totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}%` : "0%";
  } else {
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

  // Map tasks for "Today's Tasks" list, based on selectedTaskStoreId
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
    try {
      const { error } = await supabase
        .from("daily_checklist_status")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["daily_checklist_status", today] });
      toast({
        title: newStatus === "completed" ? "Task Completed" : "Task Updated",
        description: `Task has been marked as ${newStatus}.`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task status.",
        variant: "destructive"
      });
    }
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
          {/* Only admin/regional see stats & chart */}
          {canViewStatsAndChart && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatsCard
                  title="Maintenance Request"
                  value={stores.length}
                  icon={Building}
                  iconColor="text-blue-600"
                  iconBgColor="bg-blue-100"
                  change={{ value: "+1 location", isPositive: true, text: "since last month" }}
                />
                <StatsCard
                  title="Staff Members"
                  value={staffCount}
                  icon={Users}
                  iconColor="text-green-600"
                  iconBgColor="bg-green-100"
                  change={{ value: "+4 members", isPositive: true, text: "since last month" }}
                />
                {/* TASKS COMPLETE CARD */}
                <Card className="relative bg-yellow-50">
                  {/* Clipboard icon at top-left */}
                  <div className="absolute left-5 top-5 z-10">
                    <div className="rounded-full bg-yellow-100 p-2">
                      <ClipboardList className="h-7 w-7 text-yellow-600" />
                    </div>
                  </div>
                  {/* Big Value at top-right */}
                  <div className="absolute right-8 top-7 z-10">
                    {isLoadingTasks
                      ? <Loader2 className="h-10 w-10 animate-spin" />
                      : selectedTaskStoreId === "all"
                        ? <span className="block text-5xl font-extrabold text-right">{percentComplete}%</span>
                        : <span className="block text-5xl font-extrabold text-right">{completedTasks}/{totalTasks}</span>
                    }
                  </div>
                  {/* Central content higher up */}
                  <div className="flex flex-col items-center pt-6 pb-2 relative z-0">
                    <CardTitle className="text-base text-center font-bold mb-2">Daily Checklist Tasks Complete</CardTitle>
                    <select
                      className="border border-gray-300 rounded-lg px-4 text-base max-w-xs text-center font-semibold bg-white h-14 shadow-sm focus:outline-none focus:ring-2 focus:ring-chai-gold transition-all duration-200"
                      value={selectedTaskStoreId}
                      onChange={e => setSelectedTaskStoreId(e.target.value)}
                    >
                      <option value="all">All Stores</option>
                      {stores.map(store => (
                        <option key={store.id} value={store.id}>{store.name}</option>
                      ))}
                    </select>
                  </div>
                </Card>
                {/* LOW STOCK (with dropdown inside card) */}
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
              </div>
              {/* --- CHART --- */}
              <TasksLast30DaysChart
                stores={stores}
                selectedStoreId={selectedTaskStoreId}
              />
            </>
          )}
          {/* Today's Tasks Card */}
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-6">
                            {["admin", "store"].includes(dashboardProfile?.permissions) && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">Today's Tasks</CardTitle>
   <Link to="/daily-checklist" className="text-chai-gold hover:underline text-sm font-medium">
  View All
</Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {isLoadingTasks ? (
                      <Loader2 className="h-5 w-5 animate-spin text-chai-gold mx-auto my-3" />
                    ) : todaysTasksForList.length === 0 ? (
                      <p className="text-gray-500 text-sm">No tasks for today</p>
                    ) : (
                      todaysTasksForList.slice(0, 3).map(task => (
                        <TaskItem
                          key={task.id}
                          id={task.id}
                          title={task.title}
                          location={task.location}
                          dueDate={task.date}
                          completed={task.status === "completed"}
                          onComplete={(id, value) =>
                            handleTaskComplete(id, value ? "completed" : "pending")
                          }
                        />
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>)}

              {/* Daily Stock Check Items Widget */}
              {["admin", "store"].includes(dashboardProfile?.permissions) && (
                <StockWidget />
              )}

              {/* Recent Announcements */}
              {["admin", "regional"].includes(dashboardProfile?.permissions) && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">Recent Announcements</CardTitle>
                    <a href="/announcements" className="text-chai-gold hover:underline text-sm font-medium">
                      View All
                    </a>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {announcements.length === 0 ? (
                      <p className="text-gray-500 text-sm">No recent announcements</p>
                    ) : (
                      announcements.slice(0, 2).map(announcement => (
                        <AnnouncementItem
                          key={announcement.id}
                          title={announcement.title}
                          description={announcement.content}
                          date={announcement.created_at}
                          isHighlighted={announcement.important}
                        />
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>)}
              {/* Chart moved here if you want managers to see it too, else keep above */}
            </div>
          </div>
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
      {/* Access Level Information (unchanged) */}
      {/* ... You can include your access level cards here as in your existing file ... */}
    </DashboardLayout>
  );
}
