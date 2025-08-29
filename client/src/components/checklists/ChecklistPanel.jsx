import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.jsx";
import { Button } from "../ui/button.jsx";
import ChecklistItem from "./checklist-item.jsx";
import { useToast } from "../../hooks/use-toast.jsx";
import { apiRequest, queryClient } from "../../lib/queryClient.js";
import { Link } from "react-router-dom";

export default function ChecklistPanel({
  title = "Checklists",
  showAddButton = false,
}) {
  const { toast } = useToast();

  // fetch all checklists (same API your page uses)
  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ["/api/checklists"],
  });

  // toggle completion on a task
  const toggleTaskMutation = useMutation({
    mutationFn: async ({ checklistId, taskId, completed }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/checklists/${checklistId}/tasks/${taskId}`,
        { completed }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklists"] });
    },
    onError: (err) => {
      toast({
        title: "Error",
        description: `Failed to update task: ${err.message}`,
        variant: "destructive",
      });
    },
  });

  const handleTaskToggle = (checklistId, taskId, completed) => {
    toggleTaskMutation.mutate({ checklistId, taskId, completed });
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        {showAddButton && (
          <Link to="/checklists">
            <Button size="sm" className="bg-chai-gold hover:bg-yellow-600">
              Manage
            </Button>
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : checklists.length === 0 ? (
          <div className="text-sm text-gray-500">
            No checklists found.{" "}
            <Link className="text-chai-gold underline" to="/checklists">
              Create one
            </Link>
            .
          </div>
        ) : (
          <div className="space-y-3">
            {checklists.slice(0, 5).map((c) => (
              <ChecklistItem
                key={c.id}
                id={c.id}
                title={c.title}
                description={c.description}
                tasks={c.tasks}
                dueDate={c.dueDate}
                category={c.category}
                assignedTo={c.assignedTo}
                onTaskToggle={handleTaskToggle}
              />
            ))}
            {checklists.length > 5 && (
              <div className="pt-2">
                <Link to="/checklists" className="text-sm text-chai-gold underline">
                  View all checklists
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
