import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient"; // Make sure your supabase client is set up

export function useStores() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  return { stores: data, isLoading, error };
}
