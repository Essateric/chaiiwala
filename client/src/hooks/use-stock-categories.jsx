import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useStockCategories() {
  const { toast } = useToast();
  
  const { 
    data: categories = [], 
    isLoading, 
    error
  } = useQuery({
    queryKey: ['/api/stock-categories'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData) => {
      const res = await apiRequest('POST', '/api/stock-categories', categoryData);
      return res.json();
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
        variant: "destructive"
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await apiRequest('PATCH', `/api/stock-categories/${id}`, data);
      return res.json();
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
        variant: "destructive"
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id) => {
      await apiRequest('DELETE', `/api/stock-categories/${id}`);
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
        variant: "destructive"
      });
    },
  });

  return {
    categories,
    isLoading,
    error,
    createCategory: createCategoryMutation.mutate,
    updateCategory: updateCategoryMutation.mutate,
    deleteCategory: deleteCategoryMutation.mutate,
    isCreating: createCategoryMutation.isPending,
    isUpdating: updateCategoryMutation.isPending,
    isDeleting: deleteCategoryMutation.isPending,
  };
}
