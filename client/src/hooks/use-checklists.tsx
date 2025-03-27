import { useQuery, useMutation } from "@tanstack/react-query";
import { Checklist, ChecklistItem, InsertChecklist, InsertChecklistItem } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export function useChecklists(storeId?: number) {
  const { user } = useAuth();
  
  // Fetch checklists for the store
  const {
    data: checklists,
    isLoading: isLoadingChecklists,
    error: checklistsError
  } = useQuery<Checklist[]>({
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

  // Create a new checklist
  const createChecklistMutation = useMutation({
    mutationFn: async (checklist: InsertChecklist) => {
      const res = await apiRequest("POST", "/api/checklists", checklist);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/checklists', storeId] });
    }
  });

  // Update an existing checklist
  const updateChecklistMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<Checklist> }) => {
      const res = await apiRequest("PATCH", `/api/checklists/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/checklists', storeId] });
    }
  });

  // Fetch checklist items for a specific checklist
  const getChecklistItems = (checklistId: number) => {
    return useQuery<ChecklistItem[]>({
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

  // Create a new checklist item
  const createChecklistItemMutation = useMutation({
    mutationFn: async (item: InsertChecklistItem) => {
      const res = await apiRequest("POST", "/api/checklist-items", item);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/checklist-items', data.checklistId] });
    }
  });

  // Update an existing checklist item
  const updateChecklistItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<ChecklistItem> }) => {
      const res = await apiRequest("PATCH", `/api/checklist-items/${id}`, data);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/checklist-items', data.checklistId] });
    }
  });

  const createChecklist = (checklist: InsertChecklist) => createChecklistMutation.mutateAsync(checklist);
  const updateChecklist = (id: number, data: Partial<Checklist>) => updateChecklistMutation.mutateAsync({ id, data });
  const createChecklistItem = (item: InsertChecklistItem) => createChecklistItemMutation.mutateAsync(item);
  const updateChecklistItem = (id: number, data: Partial<ChecklistItem>) => updateChecklistItemMutation.mutateAsync({ id, data });

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