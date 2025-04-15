import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { JobLog, InsertJobLog } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useJobLogs(storeId?: number) {
  const { toast } = useToast();

  // Fetch all job logs
  const { data: jobLogs = [], isLoading, error } = useQuery<JobLog[]>({
    queryKey: storeId ? ["/api/joblogs", storeId] : ["/api/joblogs"],
    // Remove the custom queryFn to use the default one with on401 handling
  });

  // Create a new job log
  const { mutateAsync: createJobLog, isPending: isCreating } = useMutation({
    mutationFn: async (jobLog: InsertJobLog) => {
      const response = await apiRequest("POST", "/api/joblogs", jobLog);
      return await response.json();
    },
    onSuccess: (newJobLog) => {
      // Invalidate all job logs queries to ensure immediate refresh
      queryClient.invalidateQueries({ queryKey: ["/api/joblogs"] });
      
      // Also update the current job logs data with the new job log
      if (storeId) {
        // For store-specific queries
        queryClient.setQueryData(["/api/joblogs", storeId], (oldData: JobLog[] = []) => {
          return [...oldData, newJobLog];
        });
      } else {
        // For all job logs
        queryClient.setQueryData(["/api/joblogs"], (oldData: JobLog[] = []) => {
          return [...oldData, newJobLog];
        });
      }
      
      toast({
        title: "Job Log Created",
        description: "The job log has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Creating Job Log",
        description: error.message || "Failed to create job log. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update job log
  const { mutateAsync: updateJobLog } = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<JobLog> }) => {
      const response = await apiRequest("PUT", `/api/joblogs/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate all job logs queries
      queryClient.invalidateQueries({ queryKey: ["/api/joblogs"] });
      toast({
        title: "Job Log Updated",
        description: "The job log has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Updating Job Log",
        description: error.message || "Failed to update job log. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    jobLogs,
    isLoading,
    error,
    createJobLog,
    updateJobLog,
    isCreating,
  };
}