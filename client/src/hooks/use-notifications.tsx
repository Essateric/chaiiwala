import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { UserNotification } from "@shared/schema";

export function useNotifications() {
  const {
    data: notifications = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<UserNotification[]>({
    queryKey: ['/api/notifications'],
    refetchInterval: 60000, // Refetch every minute
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await apiRequest(
        'PATCH',
        `/api/notifications/${notificationId}/read`,
        {}
      );
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate the notifications query to refetch
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    }
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest(
        'DELETE',
        `/api/notifications/${notificationId}`,
        {}
      );
    },
    onSuccess: () => {
      // Invalidate the notifications query to refetch
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    }
  });

  // Helper to get unread notifications count
  const unreadCount = notifications.filter(notification => !notification.read).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    isError,
    error,
    refetch,
    markAsRead: markAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
    isDeleting: deleteNotificationMutation.isPending,
  };
}