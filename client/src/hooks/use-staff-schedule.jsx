import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { addDays, startOfWeek } from "date-fns";

export function useStaffSchedule(storeId) {
  const [weekStart, setWeekStart] = useState(() => {
    // Get the current week starting from Sunday
    return startOfWeek(new Date(), { weekStartsOn: 0 });
  });

  // Move to next or previous week
  const nextWeek = () => {
    setWeekStart(current => addDays(current, 7));
  };

  const prevWeek = () => {
    setWeekStart(current => addDays(current, -7));
  };

  // Fetch staff schedules
  const {
    data: schedules,
    isLoading,
    error
  } = useQuery({
    queryKey: ['/api/staff-schedules', storeId, weekStart.toISOString()],
    queryFn: async () => {
      const endpoint = storeId
        ? `/api/staff-schedules?storeId=${storeId}&weekStart=${weekStart.toISOString()}`
        : '/api/staff-schedules';
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch staff schedules');
      }
      return response.json();
    },
    enabled: !!storeId,
  });

  // Create a new schedule
  const createScheduleMutation = useMutation({
    mutationFn: async (schedule) => {
      const res = await apiRequest("POST", "/api/staff-schedules", schedule);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff-schedules', storeId, weekStart.toISOString()] });
    }
  });

  // Update a schedule
  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await apiRequest("PATCH", `/api/staff-schedules/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff-schedules', storeId, weekStart.toISOString()] });
    }
  });

  // Delete a schedule
  const deleteScheduleMutation = useMutation({
    mutationFn: async (id) => {
      await apiRequest("DELETE", `/api/staff-schedules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff-schedules', storeId, weekStart.toISOString()] });
    }
  });

  const createSchedule = (schedule) => createScheduleMutation.mutateAsync(schedule);
  const updateSchedule = (id, data) => updateScheduleMutation.mutateAsync({ id, data });
  const deleteSchedule = (id) => deleteScheduleMutation.mutateAsync(id);

  // Dummy staff array
  const staff = [
    { id: 1, name: "Admin User" },
    { id: 2, name: "Ajay Patel" },
    { id: 3, name: "Sarah Khan" },
    { id: 4, name: "Amit Patel" }
  ];

  return {
    schedules: schedules || [],
    isLoading,
    error,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    isCreating: createScheduleMutation.isPending,
    isUpdating: updateScheduleMutation.isPending,
    isDeleting: deleteScheduleMutation.isPending,
    weekStart,
    nextWeek,
    prevWeek,
    staff
  };
}
