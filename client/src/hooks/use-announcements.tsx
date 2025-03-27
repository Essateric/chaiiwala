import { useQuery, useMutation } from "@tanstack/react-query";
import { Announcement, InsertAnnouncement } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export function useAnnouncements(storeId?: number, regionId?: number) {
  const { user } = useAuth();
  
  // Fetch announcements (combines store, regional, and global)
  const {
    data: announcements,
    isLoading,
    error
  } = useQuery<Announcement[]>({
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

  // Create a new announcement
  const createAnnouncementMutation = useMutation({
    mutationFn: async (announcement: InsertAnnouncement) => {
      const res = await apiRequest("POST", "/api/announcements", {
        ...announcement,
        fromUser: user?.id || 1 // Default to admin if no user
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
    }
  });

  const createAnnouncement = (announcement: InsertAnnouncement) => createAnnouncementMutation.mutateAsync(announcement);

  return {
    announcements: announcements || [],
    isLoading,
    error,
    createAnnouncement,
    isCreating: createAnnouncementMutation.isPending
  };
}