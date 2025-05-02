import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/UseAuth";

export function useChecklists(storeId) {
  const { user } = useAuth();
  
  const {
    data: checklists,
    isLoading: isLoadingChecklists,
    error: checklistsError
  } = useQuery({
    queryKey: ['/api/checklists', storeId],
    queryFn: async () => {
      const endpoint = storeId 
        ? `/api/checklists?storeId=${storeId}` 
        : '/api/checklists';
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch checklists');
      }
      return response.json();
    },
    enabled: !!storeId
  });

  const createChecklistMutation = useMutation({
    mutationFn: async (checklist) => {
      const res = await apiRequest("POST", "/api/checklists", checklist);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/checklists', storeId] });
    }
  });

  const updateChecklistMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await apiRequest("PATCH", `/api/checklists/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/checklists', storeId] });
    }
  });

  const getChecklistItems = (checklistId) => {
    return useQuery({
      queryKey: ['/api/checklist-items', checklistId],
      queryFn: async () => {
        const response = await fetch(`/api/checklist-items?checklistId=${checklistId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch checklist items');
        }
        return response.json();
      },
      enabled: !!checklistId
    });
  };

  const createChecklistItemMutation = useMutation({
    mutationFn: async (item) => {
      const res = await apiRequest("POST", "/api/checklist-items", item);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/checklist-items', data.checklistId] });
    }
  });

  const updateChecklistItemMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await apiRequest("PATCH", `/api/checklist-items/${id}`, data);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/checklist-items', data.checklistId] });
    }
  });

  const createChecklist = (checklist) => createChecklistMutation.mutateAsync(checklist);
  const updateChecklist = (id, data) => updateChecklistMutation.mutateAsync({ id, data });
  const createChecklistItem = (item) => createChecklistItemMutation.mutateAsync(item);
  const updateChecklistItem = (id, data) => updateChecklistItemMutation.mutateAsync({ id, data });

  return {
    checklists: checklists || [],
    isLoadingChecklists,
    checklistsError,
    createChecklist,
    updateChecklist,
    getChecklistItems,
    createChecklistItem,
    updateChecklistItem,
    isCreatingChecklist: createChecklistMutation.isPending,
    isUpdatingChecklist: updateChecklistMutation.isPending,
    isCreatingItem: createChecklistItemMutation.isPending,
    isUpdatingItem: updateChecklistItemMutation.isPending
  };
}
