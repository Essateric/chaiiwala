import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { StockCategory as SelectStockCategory, InsertStockCategory } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useStockCategories() {
  const { toast } = useToast();
  
  // Fetch all stock categories
  const { 
    data: categories = [], 
    isLoading, 
    error
  } = useQuery<SelectStockCategory[]>({
    queryKey: ['/api/stock-categories'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Create a new category
  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: InsertStockCategory) => {
      const res = await apiRequest('POST', '/api/stock-categories', categoryData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stock-categories'] });
      toast({
        title: "Category Created",
        description: "New stock category has been added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Creating Category",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  // Update an existing category
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<SelectStockCategory> }) => {
      const res = await apiRequest('PATCH', `/api/stock-categories/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stock-categories'] });
      toast({
        title: "Category Updated",
        description: "Stock category has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Updating Category",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  // Delete a category
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/stock-categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stock-categories'] });
      toast({
        title: "Category Deleted",
        description: "Stock category has been removed successfully",
      });
    },
    onError: (error: Error) => {
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