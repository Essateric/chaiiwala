import React, { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { Loader2, PlusIcon, Trash2Icon, EditIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Category schemas
const categorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters"),
  description: z.string().optional()
});

// Subcategory schema
const subcategorySchema = z.object({
  categoryId: z.number(),
  name: z.string().min(2, "Subcategory name must be at least 2 characters"),
  description: z.string().optional()
});

// Type definitions for category and subcategory
interface Category {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Subcategory {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function MaintenanceCategorySettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("categories");
  
  // States for dialogs
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [addSubcategoryOpen, setAddSubcategoryOpen] = useState(false);
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [editSubcategoryOpen, setEditSubcategoryOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);

  // Fetching data
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ["/api/maintenance/categories"],
    enabled: activeTab === "categories",
  });

  const { data: subcategories = [], isLoading: isLoadingSubcategories } = useQuery<Subcategory[]>({
    queryKey: ["/api/maintenance/subcategories"],
    enabled: activeTab === "subcategories",
  });

  // Form for adding category
  const addCategoryForm = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: ""
    }
  });

  // Form for editing category
  const editCategoryForm = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: ""
    }
  });

  // Form for adding subcategory
  const addSubcategoryForm = useForm({
    resolver: zodResolver(subcategorySchema),
    defaultValues: {
      categoryId: 0,
      name: "",
      description: ""
    }
  });

  // Form for editing subcategory
  const editSubcategoryForm = useForm({
    resolver: zodResolver(subcategorySchema),
    defaultValues: {
      categoryId: 0,
      name: "",
      description: ""
    }
  });

  // Mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof categorySchema>) => {
      const response = await apiRequest("POST", "/api/maintenance/categories", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/categories"] });
      toast({
        title: "Category created",
        description: "The maintenance category has been created successfully.",
      });
      setAddCategoryOpen(false);
      addCategoryForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating category",
        description: error.message || "Failed to create maintenance category.",
        variant: "destructive",
      });
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof categorySchema> }) => {
      const response = await apiRequest("PUT", `/api/maintenance/categories/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/categories"] });
      toast({
        title: "Category updated",
        description: "The maintenance category has been updated successfully.",
      });
      setEditCategoryOpen(false);
      setSelectedCategory(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating category",
        description: error.message || "Failed to update maintenance category.",
        variant: "destructive",
      });
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/maintenance/categories/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/subcategories"] });
      toast({
        title: "Category deleted",
        description: "The maintenance category has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting category",
        description: error.message || "Failed to delete maintenance category.",
        variant: "destructive",
      });
    }
  });

  const createSubcategoryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof subcategorySchema>) => {
      const response = await apiRequest("POST", "/api/maintenance/subcategories", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/subcategories"] });
      toast({
        title: "Subcategory created",
        description: "The maintenance subcategory has been created successfully.",
      });
      setAddSubcategoryOpen(false);
      addSubcategoryForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating subcategory",
        description: error.message || "Failed to create maintenance subcategory.",
        variant: "destructive",
      });
    }
  });

  const updateSubcategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof subcategorySchema> }) => {
      const response = await apiRequest("PUT", `/api/maintenance/subcategories/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/subcategories"] });
      toast({
        title: "Subcategory updated",
        description: "The maintenance subcategory has been updated successfully.",
      });
      setEditSubcategoryOpen(false);
      setSelectedSubcategory(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating subcategory",
        description: error.message || "Failed to update maintenance subcategory.",
        variant: "destructive",
      });
    }
  });

  const deleteSubcategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/maintenance/subcategories/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/subcategories"] });
      toast({
        title: "Subcategory deleted",
        description: "The maintenance subcategory has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting subcategory",
        description: error.message || "Failed to delete maintenance subcategory.",
        variant: "destructive",
      });
    }
  });

  // Handlers
  const handleAddCategory = (data: z.infer<typeof categorySchema>) => {
    createCategoryMutation.mutate(data);
  };

  const handleEditCategory = (data: z.infer<typeof categorySchema>) => {
    if (selectedCategory) {
      updateCategoryMutation.mutate({ id: selectedCategory.id, data });
    }
  };

  const handleDeleteCategory = (id: number) => {
    if (confirm("Are you sure you want to delete this category? This will also delete all subcategories.")) {
      deleteCategoryMutation.mutate(id);
    }
  };

  const handleAddSubcategory = (data: z.infer<typeof subcategorySchema>) => {
    createSubcategoryMutation.mutate(data);
  };

  const handleEditSubcategory = (data: z.infer<typeof subcategorySchema>) => {
    if (selectedSubcategory) {
      updateSubcategoryMutation.mutate({ id: selectedSubcategory.id, data });
    }
  };

  const handleDeleteSubcategory = (id: number) => {
    if (confirm("Are you sure you want to delete this subcategory?")) {
      deleteSubcategoryMutation.mutate(id);
    }
  };

  const openEditCategoryDialog = (category: Category) => {
    setSelectedCategory(category);
    editCategoryForm.reset({
      name: category.name,
      description: category.description || ""
    });
    setEditCategoryOpen(true);
  };

  const openEditSubcategoryDialog = (subcategory: Subcategory) => {
    setSelectedSubcategory(subcategory);
    editSubcategoryForm.reset({
      categoryId: subcategory.categoryId,
      name: subcategory.name,
      description: subcategory.description || ""
    });
    setEditSubcategoryOpen(true);
  };

  const getCategoryName = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : "Unknown";
  };

  // Render loading state
  if (activeTab === "categories" && isLoadingCategories) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (activeTab === "subcategories" && isLoadingSubcategories) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maintenance Categories</CardTitle>
        <CardDescription>
          Manage categories and subcategories used to organize maintenance tasks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="subcategories">Subcategories</TabsTrigger>
          </TabsList>
          
          <TabsContent value="categories">
            <div className="flex justify-end mb-4">
              <Dialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Maintenance Category</DialogTitle>
                    <DialogDescription>
                      Create a new maintenance category for organizing tasks.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...addCategoryForm}>
                    <form onSubmit={addCategoryForm.handleSubmit(handleAddCategory)} className="space-y-4">
                      <FormField
                        control={addCategoryForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Electrical, Plumbing" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addCategoryForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Brief description of this category" 
                                {...field} 
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button type="submit" disabled={createCategoryMutation.isPending}>
                          {createCategoryMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Create Category
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            
            {categories.length === 0 ? (
              <div className="text-center p-6 bg-muted/30 rounded-md">
                <p className="text-muted-foreground">No maintenance categories have been created yet.</p>
                <p className="text-sm text-muted-foreground mt-1">Click the "Add Category" button to create your first category.</p>
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[150px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>{category.description || "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => openEditCategoryDialog(category)}
                            >
                              <EditIcon className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteCategory(category.id)}
                            >
                              <Trash2Icon className="h-4 w-4 text-destructive" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {/* Edit Category Dialog */}
            <Dialog open={editCategoryOpen} onOpenChange={setEditCategoryOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Maintenance Category</DialogTitle>
                  <DialogDescription>
                    Update the selected maintenance category details.
                  </DialogDescription>
                </DialogHeader>
                <Form {...editCategoryForm}>
                  <form onSubmit={editCategoryForm.handleSubmit(handleEditCategory)} className="space-y-4">
                    <FormField
                      control={editCategoryForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Electrical, Plumbing" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editCategoryForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Brief description of this category" 
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={updateCategoryMutation.isPending}>
                        {updateCategoryMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Update Category
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </TabsContent>
          
          <TabsContent value="subcategories">
            <div className="flex justify-end mb-4">
              <Dialog open={addSubcategoryOpen} onOpenChange={setAddSubcategoryOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Subcategory
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Maintenance Subcategory</DialogTitle>
                    <DialogDescription>
                      Create a new subcategory within an existing maintenance category.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...addSubcategoryForm}>
                    <form onSubmit={addSubcategoryForm.handleSubmit(handleAddSubcategory)} className="space-y-4">
                      <FormField
                        control={addSubcategoryForm.control}
                        name="categoryId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Parent Category</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              value={field.value ? field.value.toString() : undefined}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories.map((category) => (
                                  <SelectItem key={category.id} value={category.id.toString()}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addSubcategoryForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subcategory Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Lighting, Wiring" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addSubcategoryForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Brief description of this subcategory" 
                                {...field} 
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button type="submit" disabled={createSubcategoryMutation.isPending}>
                          {createSubcategoryMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Create Subcategory
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            
            {categories.length === 0 ? (
              <div className="text-center p-6 bg-muted/30 rounded-md">
                <p className="text-muted-foreground">You need to create categories before adding subcategories.</p>
                <p className="text-sm text-muted-foreground mt-1">Switch to the Categories tab to add some categories first.</p>
              </div>
            ) : subcategories.length === 0 ? (
              <div className="text-center p-6 bg-muted/30 rounded-md">
                <p className="text-muted-foreground">No maintenance subcategories have been created yet.</p>
                <p className="text-sm text-muted-foreground mt-1">Click the "Add Subcategory" button to create your first subcategory.</p>
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Parent Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[150px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subcategories.map((subcategory) => (
                      <TableRow key={subcategory.id}>
                        <TableCell className="font-medium">{subcategory.name}</TableCell>
                        <TableCell>{getCategoryName(subcategory.categoryId)}</TableCell>
                        <TableCell>{subcategory.description || "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => openEditSubcategoryDialog(subcategory)}
                            >
                              <EditIcon className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteSubcategory(subcategory.id)}
                            >
                              <Trash2Icon className="h-4 w-4 text-destructive" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {/* Edit Subcategory Dialog */}
            <Dialog open={editSubcategoryOpen} onOpenChange={setEditSubcategoryOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Maintenance Subcategory</DialogTitle>
                  <DialogDescription>
                    Update the selected maintenance subcategory details.
                  </DialogDescription>
                </DialogHeader>
                <Form {...editSubcategoryForm}>
                  <form onSubmit={editSubcategoryForm.handleSubmit(handleEditSubcategory)} className="space-y-4">
                    <FormField
                      control={editSubcategoryForm.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parent Category</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            value={field.value ? field.value.toString() : undefined}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id.toString()}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editSubcategoryForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subcategory Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Lighting, Wiring" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editSubcategoryForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Brief description of this subcategory" 
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={updateSubcategoryMutation.isPending}>
                        {updateSubcategoryMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Update Subcategory
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}