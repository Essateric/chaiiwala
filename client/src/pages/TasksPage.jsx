import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import TaskItem from "@/components/tasks/task-item"; // <-- import here
// ...rest of your imports

import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

  // If you want to disable just one item at a time:
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  // Fetch tasks data
  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks"],
  });

  // ...your fetch for locations/staff...

  // Task complete mutation (patch)
  const taskCompleteMutation = useMutation({
    mutationFn: async ({id, completed}) => {
      setUpdatingTaskId(id); // <-- Mark this task as updating!
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, {
        status: completed ? "completed" : "todo"
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setUpdatingTaskId(null); // <-- Reset after patch
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update task: ${error.message}`,
        variant: "destructive",
      });
      setUpdatingTaskId(null); // <-- Reset even on error
    }
  });

  // Add task mutation (no changes needed here)
  // ...

  const handleTaskComplete = (id, completed) => {
    // Don't re-run if already updating this one
    if (updatingTaskId === id) return;
    taskCompleteMutation.mutate({ id, completed });
  };

  // ...rest of addTask logic...

  return (
    <DashboardLayout title="Tasks">
      <div className="mb-6">
        <h2 className="text-2xl font-montserrat font-bold mb-1">Task Management</h2>
        <p className="text-gray-600">Create, assign, and track tasks across all locations</p>
      </div>
      
      {/* --- Task List --- */}
      <div>
        {tasks.map(task => (
          <TaskItem
            key={task.id}
            id={task.id}
            title={task.title}
            location={task.location}
            dueDate={task.dueDate}
            completed={task.status === "completed"}
            onComplete={handleTaskComplete}
            // Only disable the one that's updating
            isUpdating={updatingTaskId === task.id}
          />
        ))}
      </div>

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
