import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../hooks/use-toast.jsx";
import { subDays, startOfDay } from "date-fns";

function useJobLogs(storeId, { recentCompletedOnly = false } = {}) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: jobLogs = [], isLoading, error, refetch } = useQuery({
    queryKey: ["joblogs", storeId, recentCompletedOnly],
    queryFn: async () => {
      let query = supabase
        .from("joblogs")
        .select(`
          *,
          stores:storeId (
            id,
            name,
            store_code
          )
        `)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (storeId) {
        query = query.eq("storeId", storeId);
      }

if (recentCompletedOnly) {
  const sevenDaysAgo = startOfDay(subDays(new Date(), 7)).toISOString();

query = query.or(
  `and(status.eq.completed,completed_at.gte.${sevenDaysAgo}),status.neq.completed`
);

}

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: true,
  });

  const { mutateAsync: createJobLog, isPending: isCreating } = useMutation({
    mutationFn: async (jobLog) => {
      const { data, error } = await supabase.from("joblogs").insert([jobLog]);
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Job Log Created",
        description: "Your maintenance task has been logged successfully!",
      });
      queryClient.invalidateQueries(["joblogs", storeId]);
    },
    onError: (error) => {
      toast({
        title: "Error Creating Job Log",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    jobLogs,
    isLoading,
    error,
    createJobLog,
    isCreating,
    refetch,
  };
}

export { useJobLogs };
