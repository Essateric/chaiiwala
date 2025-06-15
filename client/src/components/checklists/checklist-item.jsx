import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card.jsx";
import { Badge } from "../../components/ui/badge.jsx";
import { Progress } from "../../components/ui/progress.jsx";
import { cn } from "../../lib/utils.js";
import { useState } from "react";

export default function ChecklistItem({
  id,
  title,
  description,
  tasks,
  dueDate,
  category,
  assignedTo,
  onTaskToggle
}) {
  const completedCount = tasks.filter(task => task.status === "completed").length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;
  const [expanded, setExpanded] = useState(false);

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
              <div
                key={task.id}
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => onTaskToggle(id, task.id)}
              >
                {/* Status color dot */}
                <span
                  className={
                    task.status === "completed"
                      ? "inline-block w-3 h-3 rounded-full bg-green-500"
                      : task.status === "in progress"
                      ? "inline-block w-3 h-3 rounded-full bg-yellow-400"
                      : "inline-block w-3 h-3 rounded-full bg-gray-300"
                  }
                  title={task.status}
                ></span>
                <span
                  className={
                    "ml-2 text-sm" +
                    (task.status === "completed" ? " text-gray-500 line-through" : "")
                  }
                >
                  {task.title}
                  <span className="ml-2 text-xs font-medium">
                    {task.status === "pending" && "Pending"}
                    {task.status === "in progress" && "In Progress"}
                    {task.status === "completed" && "Completed"}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
