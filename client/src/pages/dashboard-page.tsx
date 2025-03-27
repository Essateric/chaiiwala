import DashboardLayout from "@/components/layout/dashboard-layout";
import StatsCard from "@/components/dashboard/stats-card";
import StoreTable from "@/components/dashboard/store-table";
import TaskItem from "@/components/dashboard/task-item";
import AnnouncementItem from "@/components/dashboard/announcement-item";
import { 
  Building, 
  Users, 
  ClipboardList, 
  Package 
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Types for data
interface Store {
  id: number;
  name: string;
  address: string;
  area: number;
  manager: string;
}

interface Task {
  id: string;
  title: string;
  location: string;
  dueDate: string;
  completed: boolean;
}

interface Announcement {
  id: string;
  title: string;
  description: string;
  date: string;
  isHighlighted: boolean;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch stores data
  const { data: stores = [] } = useQuery<Store[]>({
    queryKey: ["/api/stores"],
  });

  // Fetch tasks data
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks/today"],
  });

  // Fetch announcements data
  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements/recent"],
  });

  const handleTaskComplete = async (id: string, completed: boolean) => {
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

  return (
    <DashboardLayout title="Dashboard">
      {/* Welcome Section */}
      <div className="mb-6">
        <h2 className="text-2xl font-montserrat font-bold mb-2">Welcome back, {user?.name}!</h2>
        <p className="text-gray-600">Here's what's happening across your stores today.</p>
      </div>
      
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
      
      {/* Store Locations & Quick Access */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Store Locations */}
        <div className="lg:col-span-2">
          <StoreTable stores={stores} limit={4} />
        </div>
        
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
    </DashboardLayout>
  );
}
