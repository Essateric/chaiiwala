import DashboardLayout from "@/components/layout/DashboardLayout";
import StatsCard from "@/components/dashboard/stats-card";
import TaskItem from "@/components/dashboard/task-item";
import AnnouncementItem from "@/components/dashboard/announcement-item";
import JobLogsWidget from "@/components/dashboard/job-logs-widget";
import { 
  Building, 
  Users, 
  ClipboardList, 
  Package,
  Calendar,
  Brush, // Instead of CleaningServices
  ShoppingCart,
  Wrench, // Instead of Tools
  UserX,
  CalendarCheck,
  CalendarPlus,
  Clipboard
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/UseAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { BadgeAlert, Bell, BarChart3 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useState, useEffect } from "react";
import JobLogsGrid from "@/components/Maintenance/JobLogsGrid";
import AddUserForm from "@/components/AddUserForm";


export default function DashboardPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [selectedStore, setSelectedStore] = useState("all"); 

  // Fetch stores data
  const { data: stores = [] } = useQuery({
    queryKey: ["/api/stores"],
  });

  // Fetch tasks data
  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks/today"],
  });

  // Fetch announcements data
  const { data: announcements = [] } = useQuery({
    queryKey: ["/api/announcements/recent"],
  });

  const handleTaskComplete = async (id, completed) => {
    try {
      await apiRequest("PUT", `/api/tasks/${id}`, { completed });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/today"] });
      toast({
        title: completed ? "Task Completed" : "Task Reopened",
        description: `Task has been marked as ${completed ? "completed" : "reopened"}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task status.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    console.log("👤 Auth user in useEffect:", user);
    const fetchProfile = async () => {
      if (!user?.id) {
        console.log("⚠️ No user ID found, skipping profile fetch.");
        return;
      }
      console.log("📡 Fetching profile for auth_id:", user.id);
  
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("first_name, name, permissions, store_ids")
          .eq("auth_id", user.id)
          .single();
  
        if (error) {
          console.error("❌ Profile fetch error:", error.message);
        } else {
          console.log("✅ Profile fetch result:", data);
          setProfile(data);
        }
      } catch (err) {
        console.error("❌ Unexpected error during profile fetch:", err.message);
      }
    };
  
    fetchProfile();
  }, [user]);
  

  if (profile?.permissions !== "maintenance") {
  return (
    <DashboardLayout title="Dashboard">
      {/* Welcome Section */}
      <div className="mb-6">
      <h2 className="text-2xl font-montserrat font-bold mb-2">
  Welcome back, {profile?.first_name || profile?.name || "there"}.
</h2>
        <p className="text-gray-600">Here's what's happening across your stores today.</p>
      </div>
      
      {/* Maintenance Job Logs Widget - Always visible on dashboard */}
      <div className="mb-6">
        {/* <JobLogsWidget /> */}
      </div>
      
      {/* Main Dashboard Categories - Based on handwritten diagram */}
      <Tabs defaultValue="overview" className="mb-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stock">Stock Count</TabsTrigger>
          <TabsTrigger value="cleaning">Deep Clean</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab - Summary of all categories */}
        <TabsContent value="overview">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatsCard 
              title="Total Stores" 
              value={stores.length} 
              icon={Building} 
              iconColor="text-blue-600" 
              iconBgColor="bg-blue-100" 
              change={{ value: "+1 location", isPositive: true, text: "since last month" }}
            />
            <StatsCard 
              title="Staff Members" 
              value="42" 
              icon={Users} 
              iconColor="text-green-600" 
              iconBgColor="bg-green-100" 
              change={{ value: "+4 members", isPositive: true, text: "since last month" }}
            />
            <StatsCard 
              title="Open Tasks" 
              value={tasks.filter(t => !t.completed).length} 
              icon={ClipboardList} 
              iconColor="text-yellow-600" 
              iconBgColor="bg-yellow-100" 
              change={{ value: "+3 tasks", isPositive: false, text: "from yesterday" }}
            />
            <StatsCard 
              title="Low Stock Items" 
              value="5" 
              icon={Package} 
              iconColor="text-red-600" 
              iconBgColor="bg-red-100" 
              change={{ value: "Immediate attention", isPositive: false, text: "" }}
            />
          </div>
          
          {/* Quick Access Section */}
          <div className="grid grid-cols-1 gap-6">
            {/* Quick Access */}
            <div className="space-y-6">
              {/* Today's Tasks */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">Today's Tasks</CardTitle>
                    <a href="/tasks" className="text-chai-gold hover:underline text-sm font-medium">
                      View All
                    </a>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tasks.length === 0 ? (
                      <p className="text-gray-500 text-sm">No tasks for today</p>
                    ) : (
                      tasks.slice(0, 3).map(task => (
                        <TaskItem 
                          key={task.id}
                          id={task.id}
                          title={task.title}
                          location={task.location}
                          dueDate={task.dueDate}
                          completed={task.completed}
                          onComplete={handleTaskComplete}
                        />
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Recent Announcements */}
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
                          description={announcement.description}
                          date={announcement.date}
                          isHighlighted={announcement.isHighlighted}
                        />
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        {/* Stock Count Tab - Info from handwritten diagram */}
        <TabsContent value="stock">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Stock Count Management</CardTitle>
                <CardDescription>
                  Track and manage inventory across all stores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4 border border-border">
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-10 w-10 text-chai-gold" />
                        <div>
                          <h3 className="font-semibold">Daily Count</h3>
                          <p className="text-sm text-muted-foreground">Regular inventory checks</p>
                        </div>
                      </div>
                    </Card>
                    <Card className="p-4 border border-border">
                      <div className="flex items-center space-x-3">
                        <BarChart3 className="h-10 w-10 text-chai-gold" />
                        <div>
                          <h3 className="font-semibold">Weekly Report</h3>
                          <p className="text-sm text-muted-foreground">Comprehensive analysis</p>
                        </div>
                      </div>
                    </Card>
                    <Card className="p-4 border border-border">
                      <div className="flex items-center space-x-3">
                        <BadgeAlert className="h-10 w-10 text-chai-gold" />
                        <div>
                          <h3 className="font-semibold">Monthly Trends</h3>
                          <p className="text-sm text-muted-foreground">Long-term tracking</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold">Additional Resources</h3>
                      <p className="text-sm text-muted-foreground">Forms and tools for stock management</p>
                    </div>
                    <Button variant="outline" className="gap-2">
                      <Clipboard className="h-4 w-4" />
                      Stock Templates
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Deep Clean Tab - Info from handwritten diagram */}
        <TabsContent value="cleaning">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Deep Cleaning Management</CardTitle>
                <CardDescription>
                  Schedule and track cleaning tasks across all locations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <a href="/deep-cleaning" className="block">
                      <Card className="p-4 border border-border cursor-pointer hover:border-chai-gold">
                        <div className="flex items-center space-x-3">
                          <Brush className="h-10 w-10 text-chai-gold" />
                          <div>
                            <h3 className="font-semibold">Schedule Jobs</h3>
                            <p className="text-sm text-muted-foreground">Plan and assign cleaning tasks</p>
                          </div>
                        </div>
                      </Card>
                    </a>
                    <a href="/deep-cleaning" className="block">
                      <Card className="p-4 border border-border cursor-pointer hover:border-chai-gold">
                        <div className="flex items-center space-x-3">
                          <Calendar className="h-10 w-10 text-chai-gold" />
                          <div>
                            <h3 className="font-semibold">30-Day Schedule</h3>
                            <p className="text-sm text-muted-foreground">Monthly cleaning calendar</p>
                          </div>
                        </div>
                      </Card>
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Orders Tab - Info from handwritten diagram */}
        <TabsContent value="orders">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Management</CardTitle>
                <CardDescription>
                  Track and manage all orders through various channels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4 border border-border">
                      <div className="flex items-center space-x-3">
                        <ShoppingCart className="h-10 w-10 text-chai-gold" />
                        <div>
                          <h3 className="font-semibold">Fresh Way</h3>
                          <p className="text-sm text-muted-foreground">Fresh inventory orders</p>
                        </div>
                      </div>
                    </Card>
                    <Card className="p-4 border border-border">
                      <div className="flex items-center space-x-3">
                        <Building className="h-10 w-10 text-chai-gold" />
                        <div>
                          <h3 className="font-semibold">Amazon</h3>
                          <p className="text-sm text-muted-foreground">Bulk supply orders</p>
                        </div>
                      </div>
                    </Card>
                    <Card className="p-4 border border-border">
                      <div className="flex items-center space-x-3">
                        <Bell className="h-10 w-10 text-chai-gold" />
                        <div>
                          <h3 className="font-semibold">Direct Orders</h3>
                          <p className="text-sm text-muted-foreground">Email & phone orders</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Maintenance Tab - Active Job Logs */}
        <TabsContent value="maintenance">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Maintenance Management</CardTitle>
                <CardDescription>
                  Track and manage active maintenance jobs across all stores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-muted-foreground">This section provides access to the maintenance management page for handling maintenance tasks.</p>
                </div>
                <Separator className="my-4" />
                {/* Quick actions */}
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">Maintenance Tools</h3>
                    <p className="text-sm text-muted-foreground">Quick access to maintenance resources</p>
                  </div>
                  <Button variant="outline" className="gap-2" onClick={() => window.location.href = "/maintenance"}>
                    <Wrench className="h-4 w-4" />
                    View Full Maintenance Page
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Staff Tab - Info from handwritten diagram */}
<TabsContent value="staff">
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Staff Management</CardTitle>
        <CardDescription>Manage staff and create new accounts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AddUserForm />
      </CardContent>
    </Card>
  </div>
</TabsContent>

        
        {/* Bookings Tab - Info from handwritten diagram */}
        <TabsContent value="bookings">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Large Bookings</CardTitle>
                <CardDescription>
                  Manage special events and large party reservations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="p-4 border border-border">
                      <div className="flex items-center space-x-3">
                        <CalendarPlus className="h-10 w-10 text-chai-gold" />
                        <div>
                          <h3 className="font-semibold">Booking Requests</h3>
                          <p className="text-sm text-muted-foreground">New reservation management</p>
                        </div>
                      </div>
                    </Card>
                    <Card className="p-4 border border-border">
                      <div className="flex items-center space-x-3">
                        <Clipboard className="h-10 w-10 text-chai-gold" />
                        <div>
                          <h3 className="font-semibold">Booking Forms</h3>
                          <p className="text-sm text-muted-foreground">Request documentation</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Audit Tab - Info from handwritten diagram */}
        <TabsContent value="audit">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Audit Reports</CardTitle>
                <CardDescription>
                  Company-wide auditing and compliance tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4 border border-border">
                      <div className="flex items-center space-x-3">
                        <Clipboard className="h-10 w-10 text-chai-gold" />
                        <div>
                          <h3 className="font-semibold">Templates</h3>
                          <p className="text-sm text-muted-foreground">Standard audit forms</p>
                        </div>
                      </div>
                    </Card>
                    <Card className="p-4 border border-border">
                      <div className="flex items-center space-x-3">
                        <ClipboardList className="h-10 w-10 text-chai-gold" />
                        <div>
                          <h3 className="font-semibold">Audit Findings</h3>
                          <p className="text-sm text-muted-foreground">Previous results</p>
                        </div>
                      </div>
                    </Card>
                    <Card className="p-4 border border-border">
                      <div className="flex items-center space-x-3">
                        <BarChart3 className="h-10 w-10 text-chai-gold" />
                        <div>
                          <h3 className="font-semibold">Pass Rates</h3>
                          <p className="text-sm text-muted-foreground">Performance metrics</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Access Level Information */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Levels</CardTitle>
            <CardDescription>Dashboard sections are restricted by user role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-md">
                <h3 className="font-semibold text-lg mb-2">Managers</h3>
                <p className="text-sm text-muted-foreground mb-2">Store-specific access</p>
                <ul className="text-sm space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                    Stock count
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                    Daily cleaning
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                    Orders
                  </li>
                </ul>
              </div>
              <div className="p-4 border rounded-md">
                <h3 className="font-semibold text-lg mb-2">Senior Managers</h3>
                <p className="text-sm text-muted-foreground mb-2">Multi-store oversight</p>
                <ul className="text-sm space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                    All store access
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                    Maintenance
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                    Staff management
                  </li>
                </ul>
              </div>
              <div className="p-4 border rounded-md">
                <h3 className="font-semibold text-lg mb-2">Assistant Access</h3>
                <p className="text-sm text-muted-foreground mb-2">Limited functionality</p>
                <ul className="text-sm space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                    View tasks
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                    Record stock
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-red-500 rounded-full"></span>
                    No management features
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
}
