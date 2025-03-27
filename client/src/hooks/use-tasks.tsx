import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Task, InsertTask } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

// Staff interface (simplified since we don't access the full User data here)
interface StaffMember {
  id: number;
  name: string;
}

export function useTasks(storeId?: number) {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([
    { id: 1, name: "Admin User" },
    { id: 2, name: "Ajay Patel" },
    { id: 3, name: "Sarah Khan" },
    { id: 4, name: "Amit Patel" }
  ]);
  
  // Fetch tasks for the store
  const {
    data: tasks,
    isLoading,
    error
  } = useQuery<Task[]>({
    queryKey: ['/api/tasks', storeId],
    queryFn: async () => {
      const endpoint = storeId 
        ? `/api/tasks?storeId=${storeId}` 
        : '/api/tasks';
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      return response.json();
    },
    enabled: !!storeId
  });

  // Create a new task
  const createTaskMutation = useMutation({
    mutationFn: async (task: InsertTask) => {
      const res = await apiRequest("POST", "/api/tasks", task);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', storeId] });
    }
  });

  // Update an existing task
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<Task> }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', storeId] });
    }
  });

  // Delete a task
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', storeId] });
    }
  });
  
  const createTask = (task: InsertTask) => createTaskMutation.mutateAsync(task);
  const updateTask = (id: number, data: Partial<Task>) => updateTaskMutation.mutateAsync({ id, data });
  const deleteTask = (id: number) => deleteTaskMutation.mutateAsync(id);

  return {
    tasks: tasks || [],
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
    isCreating: createTaskMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending,
    staff
  };
}