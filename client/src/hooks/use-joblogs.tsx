import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { JobLog, InsertJobLog } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useJobLogs(storeId?: number) {
  const { toast } = useToast();

  // Fetch all job logs
  const { data: jobLogs = [], isLoading, error } = useQuery<JobLog[]>({
    queryKey: storeId ? ["/api/joblogs", storeId] : ["/api/joblogs"],
    queryFn: async () => {
      const endpoint = storeId 
        ? `/api/joblogs/store/${storeId}` 
        : "/api/joblogs";
      
      const response = await apiRequest("GET", endpoint);
      return await response.json();
    },
  });

  // Create a new job log
  const { mutateAsync: createJobLog } = useMutation({
    mutationFn: async (jobLog: InsertJobLog) => {
      const response = await apiRequest("POST", "/api/joblogs", jobLog);
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate all job logs queries
      queryClient.invalidateQueries({ queryKey: ["/api/joblogs"] });
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
  };
}