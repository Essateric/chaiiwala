import { useQuery, useMutation } from "@tanstack/react-query";
import { JobLog, InsertJobLog } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export function useJobLogs(storeId?: number) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const queryKey = storeId 
    ? ['/api/joblogs/store', storeId] 
    : ['/api/joblogs'];
  
  const { data: jobLogs = [], isLoading, error } = useQuery<JobLog[]>({
    queryKey,
    enabled: !!user,
  });

  const createJobLogMutation = useMutation({
    mutationFn: async (jobLog: InsertJobLog) => {
      const res = await apiRequest("POST", "/api/joblogs", jobLog);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/joblogs'] });
      if (storeId) {
        queryClient.invalidateQueries({ queryKey: ['/api/joblogs/store', storeId] });
      }
      toast({
        title: "Job Log Created",
        description: "The job log has been successfully created.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Creating Job Log",
        description: error.message || "An error occurred while creating the job log.",
        variant: "destructive",
      });
    },
  });

  const updateJobLogMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<JobLog> }) => {
      const res = await apiRequest("PATCH", `/api/joblogs/${id}`, data);
      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/joblogs'] });
      if (storeId) {
        queryClient.invalidateQueries({ queryKey: ['/api/joblogs/store', storeId] });
      }
      toast({
        title: "Job Log Updated",
        description: "The job log has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Updating Job Log",
        description: error.message || "An error occurred while updating the job log.",
        variant: "destructive",
      });
    },
  });

  const createJobLog = (jobLog: InsertJobLog) => createJobLogMutation.mutateAsync(jobLog);
  const updateJobLog = (id: number, data: Partial<JobLog>) => updateJobLogMutation.mutateAsync({ id, data });

  return {
    jobLogs,
    isLoading,
    error,
    createJobLog,
    updateJobLog,
    isCreating: createJobLogMutation.isPending,
    isUpdating: updateJobLogMutation.isPending,
  };
}