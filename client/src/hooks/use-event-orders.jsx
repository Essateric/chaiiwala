import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useEventOrders(storeId) {
  const { toast } = useToast();

  const {
    data: eventOrders = [],
    isLoading,
    error
  } = useQuery({
    queryKey: storeId ? ["/api/event-orders", "store", storeId] : ["/api/event-orders"],
    queryFn: async () => {
      const endpoint = storeId 
        ? `/api/event-orders/store/${storeId}` 
        : '/api/event-orders';
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch event orders');
      }
      return response.json();
    },
    refetchOnWindowFocus: true,
  });

  const { mutateAsync: createEventOrder, isPending: isCreating } = useMutation({
    mutationFn: async (eventOrder) => {
      const response = await apiRequest("POST", "/api/event-orders", eventOrder);
      return await response.json();
    },
    onSuccess: (newOrder) => {
      console.log("New event order created:", newOrder);

      queryClient.setQueryData(["/api/event-orders"], (oldData = []) => {
        return oldData ? [...oldData, newOrder] : [newOrder];
      });

      if (storeId) {
        queryClient.setQueryData(["/api/event-orders", "store", storeId], (oldData = []) => {
          return oldData ? [...oldData, newOrder] : [newOrder];
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/event-orders"] });

      toast({
        title: "Event Order Created",
        description: "The event order has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error Creating Event Order",
        description: error.message || "Failed to create event order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const { mutateAsync: updateEventOrder, isPending: isUpdating } = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await apiRequest("PATCH", `/api/event-orders/${id}`, data);
      return await response.json();
    },
    onSuccess: (updatedOrder) => {
      console.log("Event order updated:", updatedOrder);

      queryClient.setQueryData(["/api/event-orders"], (oldData = []) => {
        if (!oldData) return [updatedOrder];
        return oldData.map(order =>
          order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order
        );
      });

      if (storeId) {
        queryClient.setQueryData(["/api/event-orders", "store", storeId], (oldData = []) => {
          if (!oldData) return [updatedOrder];
          return oldData.map(order =>
            order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order
          );
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/event-orders"] });

      toast({
        title: "Event Order Updated",
        description: "The event order has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error Updating Event Order",
        description: error.message || "Failed to update event order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getEventOrder = async (id) => {
    const response = await fetch(`/api/event-orders/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch event order');
    }
    return response.json();
  };

  return {
    eventOrders,
    isLoading,
    error,
    createEventOrder,
    updateEventOrder,
    getEventOrder,
    isCreating,
    isUpdating,
  };
}
