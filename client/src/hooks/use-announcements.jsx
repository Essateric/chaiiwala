import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/UseAuth";

export function useAnnouncements(storeId, regionId) {
  const { user } = useAuth();
  
  const {
    data: announcements,
    isLoading,
    error
  } = useQuery({
    queryKey: ['/api/announcements', storeId, regionId],
    queryFn: async () => {
      let endpoint = '/api/announcements';
      
      if (storeId) {
        endpoint += `?storeId=${storeId}`;
      } else if (regionId) {
        endpoint += `?regionId=${regionId}`;
      }
      
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch announcements');
      }
      return response.json();
    }
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: async (announcement) => {
      const res = await apiRequest("POST", "/api/announcements", {
        ...announcement,
        fromUser: user?.id || 1
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
    }
  });

  const createAnnouncement = (announcement) => createAnnouncementMutation.mutateAsync(announcement);

  return {
    announcements: announcements || [],
    isLoading,
    error,
    createAnnouncement,
    isCreating: createAnnouncementMutation.isPending
  };
}
