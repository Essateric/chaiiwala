import { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ChecklistTask {
  id: string;
  title: string;
  completed: boolean;
}

interface ChecklistItemProps {
  id: string;
  title: string;
  description: string;
  tasks: ChecklistTask[];
  dueDate?: string;
  category: string;
  assignedTo: string;
  onTaskToggle: (checklistId: string, taskId: string, completed: boolean) => void;
}

export default function ChecklistItem({
  id,
  title,
  description,
  tasks,
  dueDate,
  category,
  assignedTo,
  onTaskToggle
}: ChecklistItemProps) {
  const completedCount = tasks.filter(task => task.completed).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;
  const [expanded, setExpanded] = useState(false);

  const handleTaskToggle = (taskId: string, completed: boolean) => {
    onTaskToggle(id, taskId, completed);
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2 pt-6 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg mb-1">{title}</CardTitle>
            <div className="text-sm text-gray-500 mb-2">{description}</div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                {category}
              </Badge>
              {dueDate && (
                <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                  Due: {dueDate}
                </Badge>
              )}
              <Badge variant="outline" className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                {assignedTo}
              </Badge>
            </div>
          </div>
          <div className="text-sm font-medium">
            {completedCount} of {tasks.length} tasks
          </div>
        </div>
        <div className="mt-4">
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-4">
          <div className="space-y-3">
            {tasks.map(task => (
              <div key={task.id} className="flex items-start">
                <Checkbox 
                  id={`task-${id}-${task.id}`}
                  checked={task.completed}
                  onCheckedChange={(checked) => handleTaskToggle(task.id, !!checked)}
                  className="mt-1 h-4 w-4 text-chai-gold rounded border-gray-300 focus:ring-chai-gold"
                />
                <label 
                  htmlFor={`task-${id}-${task.id}`}
                  className={cn(
                    "ml-3 text-sm font-medium cursor-pointer",
                    task.completed ? "text-gray-500 line-through" : "text-gray-900"
                  )}
                >
                  {task.title}
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
