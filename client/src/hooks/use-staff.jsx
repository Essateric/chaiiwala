import { useQuery } from "@tanstack/react-query";
import { getQueryFn, queryClient } from "@/lib/queryClient";

export function useStaff() {
  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["/api/staff"],
    queryFn: getQueryFn({ on401: "throw" })
  });
  
  return { staff, isLoading };
}

export function useStaffByStore(storeId) {
  const { data: staff = [], isLoading } = useQuery({
    queryKey: [`/api/staff/store/${storeId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!storeId
  });
  
  return { staff, isLoading };
}
