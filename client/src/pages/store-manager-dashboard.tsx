import { useState, useEffect } from 'react';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  ClipboardCheck, 
  Package, 
  BarChart3, 
  CalendarDays, 
  AlertTriangle,
  CheckCircle2,
  Coffee,
  ChevronRight,
  Plus
} from 'lucide-react';

// Type definitions
interface ChecklistTask {
  id: number;
  title: string;
  completed: boolean;
  checklistId: number;
}

interface Checklist {
  id: number;
  title: string;
  category: string;
  tasks: ChecklistTask[];
  storeId: number;
  description: string;
  assignedTo: string;
  dueDate: string | null;
}

interface StoreData {
  id: number;
  name: string;
  address: string;
  area?: number;
  manager?: string;
}

interface InventoryItem {
  id: number;
  name: string;
  status: string;
  quantity: string;
  category: string;
  storeId: number;
  sku: string;
}

export default function StoreManagerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [openChecklistDialog, setOpenChecklistDialog] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null);
  
  // Get the user's store
  const { data: stores = [] } = useQuery<StoreData[]>({
    queryKey: ['/api/stores'],
  });
  
  const userStore = stores.find(store => store.id === user?.storeId);
  
  // Fetch checklists for the manager's store
  const { data: checklists = [], isLoading: isLoadingChecklists } = useQuery<Checklist[]>({
    queryKey: ['/api/checklists', user?.storeId],
    queryFn: async () => {
      if (!user?.storeId) return [];
      const res = await fetch(`/api/checklists?storeId=${user.storeId}`);
      if (!res.ok) throw new Error('Failed to fetch checklists');
      return res.json();
    },
    enabled: !!user?.storeId
  });
  
  // Fetch inventory for the manager's store
  const { data: inventory = [], isLoading: isLoadingInventory } = useQuery<InventoryItem[]>({
    queryKey: ['/api/inventory', user?.storeId],
    queryFn: async () => {
      if (!user?.storeId) return [];
      const res = await fetch(`/api/inventory?storeId=${user.storeId}`);
      if (!res.ok) throw new Error('Failed to fetch inventory');
      return res.json();
    },
    enabled: !!user?.storeId
  });
  
  // Mutation to update a checklist task
  const updateTaskMutation = useMutation({
    mutationFn: async ({ 
      checklistId, 
      taskId, 
      completed 
    }: { 
      checklistId: number;
      taskId: number;
      completed: boolean;
    }) => {
      const res = await apiRequest(
        "PATCH", 
        `/api/checklists/${checklistId}/tasks/${taskId}`, 
        { completed }
      );
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/checklists', user?.storeId] });
      toast({
        title: "Task updated",
        description: "Your checklist has been updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update the checklist task",
        variant: "destructive",
      });
    }
  });
  
  // Handle task check change
  const handleTaskChange = (checklistId: number, taskId: number, completed: boolean) => {
    updateTaskMutation.mutate({ checklistId, taskId, completed });
  };
  
  // Calculate completion percentage
  const calculateCompletion = (tasks: ChecklistTask[]) => {
    if (!tasks.length) return 0;
    const completedTasks = tasks.filter(task => task.completed).length;
    return Math.round((completedTasks / tasks.length) * 100);
  };
  
  // Get category badge color
  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'opening':
        return 'bg-blue-100 text-blue-800';
      case 'closing':
        return 'bg-purple-100 text-purple-800';
      case 'health':
        return 'bg-red-100 text-red-800';
      case 'weekly':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Get human-readable category name
  const getCategoryName = (category: string) => {
    switch (category.toLowerCase()) {
      case 'opening':
        return 'Opening Procedures';
      case 'closing':
        return 'Closing Procedures';
      case 'health':
        return 'Health & Safety';
      case 'weekly':
        return 'Weekly Cleaning';
      default:
        return category;
    }
  };
  
  // Open checklist detail dialog
  const openChecklist = (checklist: Checklist) => {
    setSelectedChecklist(checklist);
    setOpenChecklistDialog(true);
  };
  
  // Get inventory summaries
  const getInventoryCounts = () => {
    const inStock = inventory.filter(item => item.status === 'in_stock').length;
    const lowStock = inventory.filter(item => item.status === 'low_stock').length;
    const outOfStock = inventory.filter(item => item.status === 'out_of_stock').length;
    return { inStock, lowStock, outOfStock, total: inventory.length };
  };
  
  const inventoryCounts = getInventoryCounts();
  
  return (
    <DashboardLayout title="Store Manager Dashboard">
      <div className="py-2">
        {/* Welcome Banner */}
        <Card className="mb-6 border-l-4 border-l-chai-gold bg-white">
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <h2 className="text-xl font-bold">Welcome back, {user?.name}!</h2>
                <p className="text-gray-600 mt-1">
                  {userStore?.name || 'Your Store'} Dashboard
                </p>
              </div>
              <div className="mt-2 md:mt-0 bg-chai-gold/10 rounded-md px-3 py-2 flex items-center">
                <Coffee className="h-5 w-5 text-chai-gold mr-2" />
                <span className="text-sm font-medium">Store Manager View</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Checklists Section */}
        <h3 className="text-lg font-bold mb-3 text-white">Daily Checklists</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {isLoadingChecklists ? (
            <Card className="animate-pulse h-48"></Card>
          ) : checklists.length === 0 ? (
            <Card>
              <CardContent className="p-6 flex flex-col items-center justify-center">
                <div className="rounded-full bg-gray-100 p-3 mb-3">
                  <ClipboardCheck className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-center">No Checklists Available</h3>
                <p className="text-gray-500 text-center mt-1">There are no checklists assigned to your store yet.</p>
              </CardContent>
            </Card>
          ) : (
            checklists.map((checklist) => (
              <Card key={checklist.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge variant="outline" className={cn("mb-1", getCategoryColor(checklist.category))}>
                        {getCategoryName(checklist.category)}
                      </Badge>
                      <CardTitle className="text-base">{checklist.title}</CardTitle>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0" 
                      onClick={() => openChecklist(checklist)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Completion</span>
                      <span className="font-medium">
                        {calculateCompletion(checklist.tasks)}%
                      </span>
                    </div>
                    <Progress 
                      value={calculateCompletion(checklist.tasks)} 
                      className="h-2"
                    />
                    <div className="pt-2">
                      {checklist.tasks.slice(0, 3).map((task) => (
                        <div key={task.id} className="flex items-center mb-1">
                          <Checkbox 
                            id={`task-${task.id}`}
                            checked={task.completed}
                            disabled={task.completed}
                            onCheckedChange={(checked: boolean | "indeterminate") => 
                              handleTaskChange(checklist.id, task.id, checked === true)
                            }
                          />
                          <label 
                            htmlFor={`task-${task.id}`}
                            className={cn(
                              "ml-2 text-sm", 
                              task.completed && "line-through text-gray-400"
                            )}
                          >
                            {task.title}
                          </label>
                        </div>
                      ))}
                      {checklist.tasks.length > 3 && (
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="px-0 py-0 h-6 text-chai-gold"
                          onClick={() => openChecklist(checklist)}
                        >
                          +{checklist.tasks.length - 3} more tasks
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Management Sections */}
        <h3 className="text-lg font-bold mb-3 text-white">Store Management</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Stock Overview Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center">
                <Package className="h-4 w-4 mr-2 text-chai-gold" />
                Stock Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Total Items</span>
                  <span className="font-medium">{inventoryCounts.total}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">In Stock</span>
                  <span className="font-medium text-green-600">{inventoryCounts.inStock}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Low Stock</span>
                  <span className="font-medium text-yellow-600">{inventoryCounts.lowStock}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Out of Stock</span>
                  <span className="font-medium text-red-600">{inventoryCounts.outOfStock}</span>
                </div>
              </div>
              <Separator className="my-3" />
              <div className="flex justify-end">
                <Button 
                  variant="outline"
                  size="sm" 
                  className="text-chai-gold"
                  onClick={() => window.location.href = '/store-stock-update'}
                >
                  Update Stock Levels
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Daily Tasks Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center">
                <ClipboardCheck className="h-4 w-4 mr-2 text-chai-gold" />
                Today's Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center">
                  <Checkbox id="task-1" defaultChecked />
                  <label htmlFor="task-1" className="ml-2 text-sm line-through text-gray-400">
                    Morning stock check
                  </label>
                </div>
                <div className="flex items-center">
                  <Checkbox id="task-2" />
                  <label htmlFor="task-2" className="ml-2 text-sm">
                    Update staff schedule
                  </label>
                </div>
                <div className="flex items-center">
                  <Checkbox id="task-3" />
                  <label htmlFor="task-3" className="ml-2 text-sm">
                    Process today's deliveries
                  </label>
                </div>
                <div className="flex items-center">
                  <Checkbox id="task-4" />
                  <label htmlFor="task-4" className="ml-2 text-sm">
                    Review weekly promotions
                  </label>
                </div>
              </div>
              <Separator className="my-3" />
              <div className="flex justify-end">
                <Button 
                  variant="outline"
                  size="sm" 
                  className="text-chai-gold"
                  onClick={() => window.location.href = '/tasks'}
                >
                  View All Tasks
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <h3 className="text-lg font-bold mb-3 text-white">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="hover:border-chai-gold cursor-pointer transition-colors" onClick={() => window.location.href = '/store-stock-update'}>
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <Package className="h-8 w-8 text-chai-gold mb-2" />
              <span className="text-sm font-medium text-center">Update Stock</span>
            </CardContent>
          </Card>
          <Card className="hover:border-chai-gold cursor-pointer transition-colors" onClick={() => window.location.href = '/event-orders'}>
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <CalendarDays className="h-8 w-8 text-chai-gold mb-2" />
              <span className="text-sm font-medium text-center">Event Orders</span>
            </CardContent>
          </Card>
          <Card className="hover:border-chai-gold cursor-pointer transition-colors" onClick={() => window.location.href = '/job-logs'}>
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-chai-gold mb-2" />
              <span className="text-sm font-medium text-center">Log Issue</span>
            </CardContent>
          </Card>
          <Card className="hover:border-chai-gold cursor-pointer transition-colors" onClick={() => window.location.href = '/checklists'}>
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <ClipboardCheck className="h-8 w-8 text-chai-gold mb-2" />
              <span className="text-sm font-medium text-center">Checklists</span>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Checklist Dialog */}
      <Dialog open={openChecklistDialog} onOpenChange={setOpenChecklistDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedChecklist?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedChecklist && (
            <div className="py-4">
              <div className="flex justify-between items-center mb-3">
                <Badge className={getCategoryColor(selectedChecklist.category)}>
                  {getCategoryName(selectedChecklist.category)}
                </Badge>
                <span className="text-sm text-gray-500">
                  {calculateCompletion(selectedChecklist.tasks)}% Complete
                </span>
              </div>
              <Progress 
                value={calculateCompletion(selectedChecklist.tasks)} 
                className="h-2 mb-4"
              />
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {selectedChecklist.tasks.map((task) => (
                    <div key={task.id} className="flex items-start mb-1 bg-gray-50 p-2 rounded">
                      <Checkbox 
                        id={`dialog-task-${task.id}`}
                        checked={task.completed}
                        disabled={task.completed}
                        onCheckedChange={(checked: boolean | "indeterminate") => 
                          handleTaskChange(selectedChecklist.id, task.id, checked === true)
                        }
                        className="mt-0.5"
                      />
                      <label 
                        htmlFor={`dialog-task-${task.id}`}
                        className={cn(
                          "ml-2 text-sm", 
                          task.completed && "line-through text-gray-400"
                        )}
                      >
                        {task.title}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setOpenChecklistDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}