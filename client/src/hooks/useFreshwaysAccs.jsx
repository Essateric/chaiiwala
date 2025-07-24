import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient.js";

export function useFreshwaysAcc() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["freshways_accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, freshways_account_no")
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  return { freshwaysStores: data, isLoading, error };
}
