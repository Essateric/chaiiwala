import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/UseAuth";

export function useTasks(storeId) {
  const { user } = useAuth();
  const [staff, setStaff] = useState([
    { id: 1, name: "Admin User" },
    { id: 2, name: "Ajay Patel" },
    { id: 3, name: "Sarah Khan" },
    { id: 4, name: "Amit Patel" }
  ]);
  
  const {
    data: tasks,
    isLoading,
    error
  } = useQuery({
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

  const createTaskMutation = useMutation({
    mutationFn: async (task) => {
      const res = await apiRequest("POST", "/api/tasks", task);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', storeId] });
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', storeId] });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id) => {
      await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', storeId] });
    }
  });

  const createTask = (task) => createTaskMutation.mutateAsync(task);
  const updateTask = (id, data) => updateTaskMutation.mutateAsync({ id, data });
  const deleteTask = (id) => deleteTaskMutation.mutateAsync(id);

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
