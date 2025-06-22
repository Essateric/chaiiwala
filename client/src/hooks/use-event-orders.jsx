import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Main hook for event orders
export function useEventOrders(storeId) {
  const { toast } = useToast();

  // Fetch event orders (filtered by store if given)
  const {
    data: eventOrders = [],
    isLoading,
    error,
    refetch, // <-- ADD THIS!
  } = useQuery({
    queryKey: storeId ? ["event_orders", "store", storeId] : ["event_orders"],
    queryFn: async () => {
      let query = supabase
        .from("event_orders")
        .select("*")
        .order("event_date", { ascending: false });

      if (storeId) query = query.eq("store_id", storeId);

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data || [];
    },
    refetchOnWindowFocus: true,
  });

  // Create event order mutation (SAFE)
  const { mutateAsync: createEventOrder, isPending: isCreating } = useMutation({
    mutationFn: async (eventOrder) => {
      // Defensive: require required fields, and return early if undefined
      if (!eventOrder || typeof eventOrder !== "object") {
        throw new Error("No event order data provided.");
      }
      const { data, error } = await supabase
        .from("event_orders")
        .insert([eventOrder])
        .select();
      if (error) throw new Error(error.message);
      return data?.[0];
    },
    onSuccess: (newOrder) => {
      // Invalidate to refresh
      queryClient.invalidateQueries({ queryKey: ["event_orders"] });
      if (storeId) {
        queryClient.invalidateQueries({ queryKey: ["event_orders", "store", storeId] });
      }
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

  // Update event order mutation (SAFE)
  const { mutateAsync: updateEventOrder, isPending: isUpdating } = useMutation({
    // Defensive: ensure object shape and id present
    mutationFn: async (params) => {
      if (!params || typeof params !== "object") {
        throw new Error("Update parameters not provided.");
      }
      const { id, data } = params;
      if (!id || !data) {
        throw new Error("Both 'id' and 'data' are required to update an event order.");
      }
      const { data: updated, error } = await supabase
        .from("event_orders")
        .update(data)
        .eq("id", id)
        .select();
      if (error) throw new Error(error.message);
      return updated?.[0];
    },
    onSuccess: (updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: ["event_orders"] });
      if (storeId) {
        queryClient.invalidateQueries({ queryKey: ["event_orders", "store", storeId] });
      }
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

  // Fetch a single event order by ID
  const getEventOrder = async (id) => {
    if (!id) throw new Error("No event order ID provided.");
    const { data, error } = await supabase
      .from("event_orders")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw new Error(error.message);
    return data;
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
    refetch, // <-- now works
  };
}
