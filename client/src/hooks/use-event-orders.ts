import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { EventOrder, InsertEventOrder } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useEventOrders(storeId?: number) {
  const { toast } = useToast();

  // Fetch all event orders or event orders for a specific store
  const { 
    data: eventOrders = [], 
    isLoading, 
    error 
  } = useQuery<EventOrder[]>({
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
    }
  });

  // Create a new event order
  const { mutateAsync: createEventOrder, isPending: isCreating } = useMutation({
    mutationFn: async (eventOrder: InsertEventOrder) => {
      const response = await apiRequest("POST", "/api/event-orders", eventOrder);
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate event orders queries
      queryClient.invalidateQueries({ queryKey: ["/api/event-orders"] });
      toast({
        title: "Event Order Created",
        description: "The event order has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Creating Event Order",
        description: error.message || "Failed to create event order. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update an event order
  const { mutateAsync: updateEventOrder, isPending: isUpdating } = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<EventOrder> }) => {
      const response = await apiRequest("PATCH", `/api/event-orders/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate event orders queries
      queryClient.invalidateQueries({ queryKey: ["/api/event-orders"] });
      toast({
        title: "Event Order Updated",
        description: "The event order has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Updating Event Order",
        description: error.message || "Failed to update event order. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Get a single event order by ID
  const getEventOrder = async (id: number): Promise<EventOrder> => {
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