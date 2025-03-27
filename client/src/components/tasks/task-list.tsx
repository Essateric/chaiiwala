import { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import TaskItem from "../dashboard/task-item";
import { Plus, Calendar } from "lucide-react";

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

interface TaskListProps {
  tasks: Task[];
  onTaskComplete: (id: string, completed: boolean) => void;
  onAddTask: () => void;
}

export default function TaskList({ tasks, onTaskComplete, onAddTask }: TaskListProps) {
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();

  const filteredTasks = activeTab === "all" 
    ? tasks 
    : tasks.filter(task => task.status === activeTab);

  const getPriorityBadge = (priority: Task["priority"]) => {
    switch (priority) {
      case "high":
        return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">High</Badge>;
      case "medium":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Medium</Badge>;
      case "low":
        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Low</Badge>;
      default:
        return null;
    }
  };

  const handleTaskComplete = (id: string, completed: boolean) => {
    onTaskComplete(id, completed);
    toast({
      title: completed ? "Task Completed" : "Task Reopened",
      description: `Task has been marked as ${completed ? "completed" : "reopened"}.`,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Tasks</CardTitle>
            <CardDescription>Manage and track tasks across all locations</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-chai-gold text-chai-gold hover:bg-yellow-50" asChild>
              <a href="/deep-cleaning">
                <Calendar className="mr-2 h-4 w-4" /> Deep Cleaning
              </a>
            </Button>
            <Button onClick={onAddTask} className="bg-chai-gold hover:bg-yellow-600">
              <Plus className="mr-2 h-4 w-4" /> Add Task
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 bg-gray-100">
            <TabsTrigger value="all">All Tasks</TabsTrigger>
            <TabsTrigger value="todo">To Do</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          <TabsContent value={activeTab} className="mt-0">
            <div className="divide-y">
              {filteredTasks.length === 0 ? (
                <div className="py-6 text-center text-gray-500">
                  No tasks found in this category
                </div>
              ) : (
                filteredTasks.map(task => (
                  <div key={task.id} className="py-4">
                    <div className="flex justify-between items-start mb-2">
                      <TaskItem
                        id={task.id}
                        title={task.title}
                        location={task.location}
                        dueDate={`Due ${task.dueDate}`}
                        completed={task.status === "completed"}
                        onComplete={handleTaskComplete}
                      />
                      <div className="flex space-x-2">
                        {getPriorityBadge(task.priority)}
                        <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                          {task.assignedTo}
                        </Badge>
                      </div>
                    </div>
                    {task.description && (
                      <div className="ml-7 mt-1 text-sm text-gray-600">
                        {task.description}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
