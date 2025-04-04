import { useQuery } from "@tanstack/react-query";
import { getQueryFn, queryClient } from "@/lib/queryClient";

export interface Staff {
  id: number;
  name: string;
  role: string;
  storeId?: number;
}

export function useStaff() {
  const { data: staff = [], isLoading } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
    queryFn: getQueryFn()
  });
  
  return { staff, isLoading };
}

export function useStaffByStore(storeId?: number) {
  const { data: staff = [], isLoading } = useQuery<Staff[]>({
    queryKey: ["/api/staff/store", storeId],
    queryFn: getQueryFn(),
    enabled: !!storeId // Only fetch when storeId is provided
  });
  
  return { staff, isLoading };
}