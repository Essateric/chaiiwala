import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient"; // Make sure your supabase client is set up

export function useCategories() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["maintenance-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_categories")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  return {
    categories: data || [],
    isLoading,
    error,
  };
}
