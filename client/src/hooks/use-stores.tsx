import { useQuery } from "@tanstack/react-query";
import { Store } from "@shared/schema";

export function useStores() {
  const {
    data: stores = [],
    isLoading,
    error
  } = useQuery<Store[]>({
    queryKey: ["/api/stores"],
  });

  return { stores, isLoading, error };
}