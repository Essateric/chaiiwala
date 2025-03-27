import { useQuery, useMutation } from "@tanstack/react-query";
import { StaffSchedule, InsertStaffSchedule } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { addDays, startOfWeek } from "date-fns";

export function useStaffSchedule(storeId?: number) {
  const [weekStart, setWeekStart] = useState<Date>(() => {
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

  // Fetch staff schedules for the store
  const {
    data: schedules,
    isLoading,
    error
  } = useQuery<StaffSchedule[]>({
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
    enabled: !!storeId
  });

  // Create a new schedule
  const createScheduleMutation = useMutation({
    mutationFn: async (schedule: InsertStaffSchedule) => {
      const res = await apiRequest("POST", "/api/staff-schedules", schedule);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff-schedules', storeId, weekStart.toISOString()] });
    }
  });

  // Update an existing schedule
  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<StaffSchedule> }) => {
      const res = await apiRequest("PATCH", `/api/staff-schedules/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff-schedules', storeId, weekStart.toISOString()] });
    }
  });

  // Delete a schedule
  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/staff-schedules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff-schedules', storeId, weekStart.toISOString()] });
    }
  });

  const createSchedule = (schedule: InsertStaffSchedule) => createScheduleMutation.mutateAsync(schedule);
  const updateSchedule = (id: number, data: Partial<StaffSchedule>) => updateScheduleMutation.mutateAsync({ id, data });
  const deleteSchedule = (id: number) => deleteScheduleMutation.mutateAsync(id);

  // Staff data (in a real app, this would come from the API)
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