// src/hooks/use-stock-categories.jsx
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from "@/lib/queryClient"; // keep same import for invalidation
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/lib/supabaseClient'; // <-- use Supabase instead of /api

export function useStockCategories() {
  const { toast } = useToast();

  // READ (keep the same queryKey so nothing else breaks)
  const {
    data: categories = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['/api/stock-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_categories')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // CREATE (keep same signature: mutate(categoryData))
  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData) => {
      // Expecting something like { name, prefix, description }
      const payload = {
        name: (categoryData?.name ?? '').trim(),
        prefix: (categoryData?.prefix ?? '').trim(),
        description: categoryData?.description?.trim?.() || null,
      };
      const { data, error } = await supabase
        .from('stock_categories')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stock-categories'] });
      toast({
        title: "Category Created",
        description: "New stock category has been added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error Creating Category",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // UPDATE (keep same signature: mutate({ id, data }))
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const payload = {
        ...(data?.name !== undefined ? { name: data.name?.trim?.() } : {}),
        ...(data?.prefix !== undefined ? { prefix: data.prefix?.trim?.() } : {}),
        ...(data?.description !== undefined
          ? { description: data.description?.trim?.() || null }
          : {}),
        updated_at: new Date().toISOString(),
      };

      const { data: updated, error } = await supabase
        .from('stock_categories')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stock-categories'] });
      toast({
        title: "Category Updated",
        description: "Stock category has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error Updating Category",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // DELETE (keep same signature: mutate(id))
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('stock_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stock-categories'] });
      toast({
        title: "Category Deleted",
        description: "Stock category has been removed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error Deleting Category",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    categories,
    isLoading,
    error,
    createCategory: createCategoryMutation.mutate,     // same names/shape
    updateCategory: updateCategoryMutation.mutate,     // same names/shape
    deleteCategory: deleteCategoryMutation.mutate,     // same names/shape
    isCreating: createCategoryMutation.isPending,
    isUpdating: updateCategoryMutation.isPending,
    isDeleting: deleteCategoryMutation.isPending,
  };
}
