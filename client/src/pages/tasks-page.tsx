import { useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import TaskList from "@/components/tasks/task-list";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Types for tasks data
interface Task {
  id: string;
  title: string;
  description?: string;
  location: string;
  assignedTo: string;
  dueDate: string;
  status: "todo" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
}

interface StoreLocation {
  id: number;
  name: string;
}

interface StaffMember {
  id: number;
  name: string;
}

export default function TasksPage() {
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    locationId: "",
    assignedToId: "",
    dueDate: "",
    priority: "medium"
  });
  const { toast } = useToast();

  // Fetch tasks data
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  // Fetch locations
  const { data: locations = [] } = useQuery<StoreLocation[]>({
    queryKey: ["/api/locations"],
  });

  // Fetch staff
  const { data: staff = [] } = useQuery<StaffMember[]>({
    queryKey: ["/api/staff"],
  });

  // Task complete mutation
  const taskCompleteMutation = useMutation({
    mutationFn: async ({id, completed}: {id: string, completed: boolean}) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, {
        status: completed ? "completed" : "todo"
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update task: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Add task mutation
  const addTaskMutation = useMutation({
    mutationFn: async (taskData: typeof newTask) => {
      const res = await apiRequest("POST", "/api/tasks", taskData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setShowAddTaskDialog(false);
      setNewTask({
        title: "",
        description: "",
        locationId: "",
        assignedToId: "",
        dueDate: "",
        priority: "medium"
      });
      toast({
        title: "Task Added",
        description: "New task has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to add task: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleTaskComplete = (id: string, completed: boolean) => {
    taskCompleteMutation.mutate({ id, completed });
  };

  const handleAddTask = () => {
    setShowAddTaskDialog(true);
  };

  const submitNewTask = () => {
    if (!newTask.title || !newTask.locationId || !newTask.assignedToId || !newTask.dueDate) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    addTaskMutation.mutate(newTask);
  };

  return (
    <DashboardLayout title="Tasks">
      <div className="mb-6">
        <h2 className="text-2xl font-montserrat font-bold mb-1">Task Management</h2>
        <p className="text-gray-600">Create, assign, and track tasks across all locations</p>
      </div>
      
      {/* Task List */}
      <TaskList 
        tasks={tasks} 
        onTaskComplete={handleTaskComplete}
        onAddTask={handleAddTask}
      />
      
      {/* Add Task Dialog */}
      <Dialog open={showAddTaskDialog} onOpenChange={setShowAddTaskDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
            <DialogDescription>
              Create a new task and assign it to a team member.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Task Title</Label>
              <Input
                id="title"
                value={newTask.title}
                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                placeholder="Enter task title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={newTask.description}
                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                placeholder="Enter task description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Select 
                  value={newTask.locationId} 
                  onValueChange={(value) => setNewTask({...newTask, locationId: value})}
                >
                  <SelectTrigger id="location">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(location => (
                      <SelectItem key={location.id} value={location.id.toString()}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assigned-to">Assign To</Label>
                <Select 
                  value={newTask.assignedToId} 
                  onValueChange={(value) => setNewTask({...newTask, assignedToId: value})}
                >
                  <SelectTrigger id="assigned-to">
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map(member => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="due-date">Due Date</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select 
                  value={newTask.priority} 
                  onValueChange={(value) => setNewTask({...newTask, priority: value as "low" | "medium" | "high"})}
                >
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTaskDialog(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-chai-gold hover:bg-yellow-600" 
              onClick={submitNewTask}
              disabled={addTaskMutation.isPending}
            >
              {addTaskMutation.isPending ? "Adding..." : "Add Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
