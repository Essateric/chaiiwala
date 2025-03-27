import { useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import ChecklistItem from "@/components/checklists/checklist-item";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Types for checklist data
interface ChecklistTask {
  id: string;
  title: string;
  completed: boolean;
}

interface Checklist {
  id: string;
  title: string;
  description: string;
  dueDate?: string;
  category: string;
  assignedTo: string;
  tasks: ChecklistTask[];
}

export default function ChecklistsPage() {
  const [showAddChecklistDialog, setShowAddChecklistDialog] = useState(false);
  const [newChecklist, setNewChecklist] = useState({
    title: "",
    description: "",
    category: "",
    assignedTo: "",
    dueDate: ""
  });
  const { toast } = useToast();

  // Fetch checklists data
  const { data: checklists = [] } = useQuery<Checklist[]>({
    queryKey: ["/api/checklists"],
  });

  // Toggle task mutation
  const toggleTaskMutation = useMutation({
    mutationFn: async ({ checklistId, taskId, completed }: {
      checklistId: string;
      taskId: string;
      completed: boolean;
    }) => {
      const res = await apiRequest("PATCH", `/api/checklists/${checklistId}/tasks/${taskId}`, {
        completed
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklists"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update task: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Add checklist mutation
  const addChecklistMutation = useMutation({
    mutationFn: async (checklistData: typeof newChecklist) => {
      const res = await apiRequest("POST", "/api/checklists", checklistData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklists"] });
      setShowAddChecklistDialog(false);
      setNewChecklist({
        title: "",
        description: "",
        category: "",
        assignedTo: "",
        dueDate: ""
      });
      toast({
        title: "Checklist Added",
        description: "New checklist has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to add checklist: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleTaskToggle = (checklistId: string, taskId: string, completed: boolean) => {
    toggleTaskMutation.mutate({ checklistId, taskId, completed });
  };

  const handleAddChecklist = () => {
    setShowAddChecklistDialog(true);
  };

  const submitNewChecklist = () => {
    if (!newChecklist.title || !newChecklist.category || !newChecklist.assignedTo) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    addChecklistMutation.mutate(newChecklist);
  };

  return (
    <DashboardLayout title="Checklists">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-montserrat font-bold mb-1">Weekly Checklists</h2>
          <p className="text-gray-600">Manage recurring tasks and operational procedures</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button className="bg-chai-gold hover:bg-yellow-600" onClick={handleAddChecklist}>
            <Plus className="mr-2 h-4 w-4" />
            Add Checklist
          </Button>
        </div>
      </div>
      
      {/* Checklist Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="opening">Opening Procedures</SelectItem>
            <SelectItem value="closing">Closing Procedures</SelectItem>
            <SelectItem value="weekly">Weekly Cleaning</SelectItem>
            <SelectItem value="health">Health & Safety</SelectItem>
          </SelectContent>
        </Select>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Filter by location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            <SelectItem value="1">Cheetham Hill</SelectItem>
            <SelectItem value="2">Oxford Road</SelectItem>
            <SelectItem value="3">Old Trafford</SelectItem>
          </SelectContent>
        </Select>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="not_started">Not Started</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Checklists */}
      <div className="space-y-4">
        {checklists.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
            <p className="mb-4">No checklists found</p>
            <Button className="bg-chai-gold hover:bg-yellow-600" onClick={handleAddChecklist}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Checklist
            </Button>
          </div>
        ) : (
          checklists.map(checklist => (
            <ChecklistItem 
              key={checklist.id}
              id={checklist.id}
              title={checklist.title}
              description={checklist.description}
              tasks={checklist.tasks}
              dueDate={checklist.dueDate}
              category={checklist.category}
              assignedTo={checklist.assignedTo}
              onTaskToggle={handleTaskToggle}
            />
          ))
        )}
      </div>
      
      {/* Add Checklist Dialog */}
      <Dialog open={showAddChecklistDialog} onOpenChange={setShowAddChecklistDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Checklist</DialogTitle>
            <DialogDescription>
              Add a new checklist with tasks to be completed.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Checklist Title</Label>
              <Input
                id="title"
                value={newChecklist.title}
                onChange={(e) => setNewChecklist({...newChecklist, title: e.target.value})}
                placeholder="Enter checklist title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newChecklist.description}
                onChange={(e) => setNewChecklist({...newChecklist, description: e.target.value})}
                placeholder="Enter checklist description"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={newChecklist.category} 
                  onValueChange={(value) => setNewChecklist({...newChecklist, category: value})}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opening">Opening Procedures</SelectItem>
                    <SelectItem value="closing">Closing Procedures</SelectItem>
                    <SelectItem value="weekly">Weekly Cleaning</SelectItem>
                    <SelectItem value="health">Health & Safety</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assigned-to">Assign To</Label>
                <Select 
                  value={newChecklist.assignedTo} 
                  onValueChange={(value) => setNewChecklist({...newChecklist, assignedTo: value})}
                >
                  <SelectTrigger id="assigned-to">
                    <SelectValue placeholder="Select role/person" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_staff">All Staff</SelectItem>
                    <SelectItem value="store_manager">Store Manager</SelectItem>
                    <SelectItem value="kitchen_staff">Kitchen Staff</SelectItem>
                    <SelectItem value="front_of_house">Front of House</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="due-date">Due Date (Optional)</Label>
              <Input
                id="due-date"
                type="date"
                value={newChecklist.dueDate}
                onChange={(e) => setNewChecklist({...newChecklist, dueDate: e.target.value})}
              />
            </div>
            {/* Tasks would be added after creation in a real implementation */}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddChecklistDialog(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-chai-gold hover:bg-yellow-600" 
              onClick={submitNewChecklist}
              disabled={addChecklistMutation.isPending}
            >
              {addChecklistMutation.isPending ? "Creating..." : "Create Checklist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
