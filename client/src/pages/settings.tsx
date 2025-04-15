import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from '@tanstack/react-query';
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { User as SelectUser, Permission as SelectPermission, Store as SelectStore, StockCategory as SelectStockCategory } from "@shared/schema";
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Settings, Save, Plus, Edit, Trash2, Package, PackageX, Shield, Lock, Users, Check, UserCog, FileUp, Tags, Tag } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { usePermissions } from "@/hooks/use-permissions";
import { useStockCategories } from "@/hooks/use-stock-categories";

// Mock stock configuration data
// Type declaration for stock items
interface StockConfigItem {
  id: number;
  itemCode: string;
  name: string;
  lowStockThreshold: number;
  category: string;
  price: number;
  sku: string;
}

// Removed static initialStockConfig array - using real data from the API

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [editItem, setEditItem] = useState<StockConfigItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [newItem, setNewItem] = useState({
    name: "",
    lowStockThreshold: 5,
    category: "Food",
    price: 0.00,
    sku: ""
  });
  
  // Fetch stock configuration items from API
  const { 
    data: stockConfig = [], 
    isLoading: isLoadingStockConfig,
    refetch: refetchStockConfig
  } = useQuery<StockConfigItem[]>({
    queryKey: ['/api/stock-config'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // Create mutation for updating stock items
  const updateStockItemMutation = useMutation({
    mutationFn: async (data: { id: number, updates: Partial<StockConfigItem> }) => {
      const response = await apiRequest('PATCH', `/api/stock-config/${data.id}`, data.updates);
      return await response.json();
    },
    onSuccess: () => {
      // Refetch stock items after successful update
      refetchStockConfig();
    }
  });
  
  // Create mutation for adding stock items
  const addStockItemMutation = useMutation({
    mutationFn: async (data: Omit<StockConfigItem, 'id'>) => {
      const response = await apiRequest('POST', '/api/stock-config', data);
      return await response.json();
    },
    onSuccess: () => {
      // Refetch stock items after successful addition
      refetchStockConfig();
    }
  });
  
  // State for category management
  const [newCategory, setNewCategory] = useState({ name: "", prefix: "", description: "" });
  const [editingCategory, setEditingCategory] = useState<SelectStockCategory | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  
  // Fetch stock categories
  const { 
    categories, 
    createCategory, 
    updateCategory, 
    deleteCategory, 
    isCreating, 
    isUpdating, 
    isDeleting 
  } = useStockCategories();
  
  // Fetch all stores for the store dropdown
  const { data: allStores = [] } = useQuery<SelectStore[]>({
    queryKey: ['/api/stores'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // Fetch all staff members with their assigned stores
  const { data: allStaff = [] } = useQuery<{ id: number; name: string; role: string; color: string; storeId?: number; }[]>({
    queryKey: ['/api/staff'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // Function to generate item code based on category and name
  const generateItemCode = (category: string, name: string) => {
    const prefix = 
      category === 'Food' ? 'BP' : 
      category === 'Drinks' ? 'DP' : 
      category === 'Packaging' ? 'FPFC' : 
      category === 'Dry Food' ? 'DF' :
      category === 'Miscellaneous' ? 'MS' :
      category === 'Frozen Food' ? 'FZ' : 'IT';
                  
    // Generate a random 3-digit number
    const suffix = Math.floor(100 + Math.random() * 900).toString();
    
    return `${prefix}${suffix}`;
  };
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  const { toast } = useToast();
  
  // Fetch real authenticated user data
  const { data: user } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // Handle edit item
  const handleEditItem = (item: StockConfigItem) => {
    setEditItem(item);
    setDialogOpen(true);
  };
  
  // Handle save changes
  const handleSaveChanges = () => {
    if (editItem) {
      // Send update to the API
      updateStockItemMutation.mutate({
        id: editItem.id,
        updates: editItem
      }, {
        onSuccess: () => {
          toast({
            title: "Settings Updated",
            description: `${editItem.name} threshold has been updated.`,
          });
          
          // Close the dialog
          setDialogOpen(false);
          setEditItem(null);
        },
        onError: (error) => {
          toast({
            title: "Update Failed",
            description: error.message || "Failed to update stock item",
            variant: "destructive"
          });
        }
      });
    }
  };
  
  // Handle add new item
  const handleAddItem = () => {
    // Validate input
    if (!newItem.name) {
      toast({
        title: "Validation Error",
        description: "Product name is required.",
        variant: "destructive"
      });
      return;
    }
    
    // Generate item code based on category and name
    const itemCode = generateItemCode(newItem.category, newItem.name);
    
    // Create new item to add
    const itemToAdd = {
      ...newItem,
      itemCode
    };
    
    // Add item via API
    addStockItemMutation.mutate(itemToAdd, {
      onSuccess: () => {
        // Reset form and close dialog
        setNewItem({
          name: "",
          lowStockThreshold: 5,
          category: "Food",
          price: 0.00,
          sku: ""
        });
        setIsAddDialogOpen(false);
        
        toast({
          title: "Item Added",
          description: `${newItem.name} has been added to stock configuration.`,
        });
      },
      onError: (error) => {
        toast({
          title: "Failed to Add Item",
          description: error.message || "Could not add the item. Please try again.",
          variant: "destructive"
        });
      }
    });
  };
  
  // Handle delete item
  const handleDeleteItem = (id: number) => {
    // In this version, we don't have a delete endpoint yet, 
    // so we'll just show a notification
    toast({
      title: "Delete Not Implemented",
      description: "The delete operation is not yet implemented on the server.",
      variant: "destructive"
    });
    
    // When the API is ready, we would implement:
    // deleteStockItemMutation.mutate(id, {
    //   onSuccess: () => {
    //     toast({
    //       title: "Item Removed",
    //       description: "Item has been removed from stock configuration.",
    //     });
    //   },
    //   onError: (error) => {
    //     toast({
    //       title: "Delete Failed",
    //       description: error.message || "Could not delete the item",
    //       variant: "destructive"
    //     });
    //   }
    // });
  };
  
  // Handle CSV upload
  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csvData = e.target?.result as string;
        const items = processCSV(csvData);
        
        if (items.length === 0) {
          toast({
            title: "Error",
            description: "No valid data found in CSV file.",
            variant: "destructive"
          });
          return;
        }
        
        // Show processing notification
        toast({
          title: "Processing",
          description: `Processing ${items.length} items...`,
        });
        
        // Use our API to add each item
        let successCount = 0;
        let errorCount = 0;
        
        for (const item of items) {
          try {
            // Generate item code for each item
            const itemCode = generateItemCode(item.category, item.name);
            const itemToAdd = {
              ...item,
              itemCode
            };
            
            // Send to API
            await apiRequest("POST", "/api/stock-config", itemToAdd);
            successCount++;
          } catch (err) {
            console.error("Error adding item:", err);
            errorCount++;
          }
        }
        
        // Refresh the data
        refetchStockConfig();
        
        // Reset file input
        event.target.value = '';
        
        // Show results
        if (successCount > 0) {
          toast({
            title: "Import Successful",
            description: `${successCount} items were imported. ${errorCount > 0 ? `${errorCount} items failed.` : ''}`,
          });
        } else {
          toast({
            title: "Import Failed",
            description: "Failed to import any items. Please check the console for errors.",
            variant: "destructive"
          });
        }
        
      } catch (error) {
        console.error('Error processing CSV:', error);
        toast({
          title: "Import Failed",
          description: "There was an error processing the CSV file. Please check the format.",
          variant: "destructive"
        });
      }
    };
    
    reader.readAsText(file);
  };
  
  // Process CSV data
  const processCSV = (csvData: string) => {
    const lines = csvData.split(/\r?\n/);
    const headers = lines[0].split(',').map(header => header.trim().toLowerCase());
    
    // Validate headers based on Cleaned_Stock_Data.csv format
    const requiredColumns = ['item_code', 'product', 'price_box'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      toast({
        title: "CSV Format Error",
        description: `Missing required columns: ${missingColumns.join(', ')}. Expected format: item_code, alt_item_code, product, price_box`,
        variant: "destructive"
      });
      return [];
    }
    
    const itemCodeIndex = headers.indexOf('item_code');
    const altItemCodeIndex = headers.indexOf('alt_item_code');
    const productIndex = headers.indexOf('product');
    const priceIndex = headers.indexOf('price_box');
    
    const items: { 
      name: string; 
      category: string; 
      lowStockThreshold: number;
      price: number;
      sku: string;
      itemCode?: string;
    }[] = [];
    
    // Skip header row and process data
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Skip empty lines
      
      const values = lines[i].split(',').map(val => val.trim());
      
      // Skip rows with insufficient data for required columns
      if (values.length < 3 || !values[itemCodeIndex] || !values[productIndex]) continue;
      
      const itemCode = values[itemCodeIndex];
      const altItemCode = altItemCodeIndex >= 0 ? values[altItemCodeIndex] : "";
      const name = values[productIndex];
      const price = priceIndex >= 0 && values[priceIndex] ? parseFloat(values[priceIndex]) : 0.00;
      
      // Determine category from item code
      let category = 'Other';
      if (itemCode.startsWith('BP')) {
        category = 'Food';
      } else if (itemCode.startsWith('DP')) {
        category = 'Drinks';
      } else if (itemCode.startsWith('PP')) {
        category = 'Packaging';
      } else if (itemCode.startsWith('MS')) {
        category = 'Miscellaneous';
      } else if (itemCode.startsWith('DF')) {
        category = 'Dry Food';
      } else if (itemCode.startsWith('FZ')) {
        category = 'Frozen Food';
      }
      
      // Default threshold based on category
      const threshold = 10;
      
      if (name && itemCode) {
        items.push({
          name,
          category,
          lowStockThreshold: threshold,
          price: isNaN(price) ? 0.00 : price,
          sku: altItemCode || itemCode,
          itemCode: itemCode
        });
      }
    }
    
    return items;
  };
  
  // Map category string to valid category
  const mapCategory = (category: string): string => {
    const categoryMap: Record<string, string> = {
      'food': 'Food',
      'drinks': 'Drinks',
      'packaging': 'Packaging',
      'dry food': 'Dry Food',
      'dry': 'Dry Food',
      'frozen food': 'Frozen Food',
      'frozen': 'Frozen Food',
      'miscellaneous': 'Miscellaneous',
      'misc': 'Miscellaneous',
      'other': 'Other'
    };
    
    return categoryMap[category.toLowerCase()] || 'Other';
  };
  
  // Function to download a CSV template
  const downloadCsvTemplate = () => {
    // Create CSV header and example rows
    const csvContent = [
      'item_code,alt_item_code,product,price_box',
      'BP401,FPBC101,Masala Beans,52.91',
      'BP402,FPBC102,Daal,32.39',
      'BP440,FPBC105,Mogo Sauce,9.00',
      'DP196,FF722,Orange Juice (12x250ml),127.62',
      'DP190,FPFC204,Karak Chaii Sugar free (50 per box),5.70'
    ].join('\n');
    
    // Create a Blob with the CSV content
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create a download link and trigger the download
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'stock_items_template.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Template Downloaded",
      description: "CSV template has been downloaded successfully.",
    });
  };
  
  return (
    <DashboardLayout title="Settings">
      <div className="container max-w-7xl mx-auto py-6">
        {/* Removed heading as it's already in the page title */}
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="stock">Stock Configuration</TabsTrigger>
            <TabsTrigger value="users">User Preferences</TabsTrigger>
            {user?.role === 'admin' && (
              <TabsTrigger value="permissions">
                <Shield className="mr-2 h-4 w-4" />
                Permissions
              </TabsTrigger>
            )}
          </TabsList>
          
          {/* General Settings Tab */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="mr-2 h-5 w-5" />
                  General Settings
                </CardTitle>
                <CardDescription>
                  Manage application-wide settings and defaults
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="theme">Theme</Label>
                    <select 
                      id="theme" 
                      className="w-full p-2 border rounded"
                      defaultValue="dark"
                      onChange={(e) => {
                        const newTheme = e.target.value;
                        // Apply theme to document element
                        const html = document.documentElement;
                        
                        // Remove existing theme classes
                        html.classList.remove('light', 'dark');
                        
                        if (newTheme === 'system') {
                          // Check system preference
                          const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                          html.classList.add(systemPreference);
                        } else {
                          // Apply selected theme
                          html.classList.add(newTheme);
                        }
                        
                        // Store preference
                        localStorage.setItem('theme', newTheme);
                        
                        toast({
                          title: "Theme updated",
                          description: `Changed to ${newTheme} theme`,
                        });
                      }}
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="system">System Default</option>
                    </select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="language">Language</Label>
                    <select 
                      id="language" 
                      className="w-full p-2 border rounded"
                      defaultValue="en"
                    >
                      <option value="en">English</option>
                      <option value="fr">French</option>
                      <option value="es">Spanish</option>
                      <option value="de">German</option>
                    </select>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="bg-chai-gold hover:bg-amber-600">
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* Stock Configuration Tab */}
          <TabsContent value="stock">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="mr-2 h-5 w-5" />
                  Stock Configuration
                </CardTitle>
                <CardDescription>
                  Manage item thresholds and stock settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between mb-4">
                  <div className="text-sm text-muted-foreground">
                    Configure when items should be marked as "low stock"
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setIsAddDialogOpen(true)}
                      className="bg-chai-gold hover:bg-amber-600"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Item
                    </Button>
                    <input
                      type="file"
                      id="csv-upload"
                      accept=".csv"
                      className="hidden"
                      onChange={handleCsvUpload}
                    />
                    <Button 
                      onClick={() => document.getElementById('csv-upload')?.click()}
                      variant="outline"
                      className="border-chai-gold text-chai-gold hover:bg-amber-50"
                    >
                      <FileUp className="mr-2 h-4 w-4" />
                      Import CSV
                    </Button>
                  </div>
                </div>
                
                {/* Category Filter */}
                <div className="mb-4 flex items-center gap-3">
                  <Label htmlFor="categoryFilter" className="whitespace-nowrap">Filter by Category:</Label>
                  <Select 
                    onValueChange={(value) => {
                      // We would implement filtering here if we had actual filtering state
                      // For now, we'll just use all items
                    }}
                    defaultValue="all"
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories?.map((category) => (
                        <SelectItem key={category.id} value={category.name}>{category.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="ml-auto text-sm">
                    <span className="font-medium">Total Items:</span> {isLoadingStockConfig ? (
                      <span className="animate-pulse rounded-md bg-muted inline-block h-4 w-10 align-middle"></span>
                    ) : (
                      <span className="ml-1">{stockConfig.length}</span>
                    )}
                  </div>
                </div>
                
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[15%]">Item Code</TableHead>
                        <TableHead className="w-[25%]">Name</TableHead>
                        <TableHead className="w-[20%]">Category</TableHead>
                        <TableHead className="w-[10%] text-center">Stock</TableHead>
                        <TableHead className="w-[15%] text-center">Threshold</TableHead>
                        <TableHead className="w-[15%] text-center">Price</TableHead>
                        <TableHead className="w-[10%] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingStockConfig ? (
                        // Loading state
                        Array.from({ length: 5 }).map((_, index) => (
                          <TableRow key={`skeleton-${index}`}>
                            <TableCell><div className="animate-pulse rounded-md bg-muted h-4 w-16" /></TableCell>
                            <TableCell><div className="animate-pulse rounded-md bg-muted h-4 w-24" /></TableCell>
                            <TableCell><div className="animate-pulse rounded-md bg-muted h-4 w-20" /></TableCell>
                            <TableCell className="text-center"><div className="animate-pulse rounded-md bg-muted h-4 w-12 mx-auto" /></TableCell>
                            <TableCell className="text-center"><div className="animate-pulse rounded-md bg-muted h-4 w-12 mx-auto" /></TableCell>
                            <TableCell className="text-center"><div className="animate-pulse rounded-md bg-muted h-4 w-12 mx-auto" /></TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <div className="animate-pulse rounded-md bg-muted h-8 w-8" />
                                <div className="animate-pulse rounded-md bg-muted h-8 w-8" />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : stockConfig.length === 0 ? (
                        // Empty state
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <PackageX className="h-8 w-8 text-muted-foreground mb-2" />
                              <p className="text-muted-foreground">No stock items found</p>
                              <p className="text-sm text-muted-foreground mt-1">Add items manually or import from a CSV file</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        // Data display
                        stockConfig.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono">{item.itemCode}</TableCell>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell className="text-center">
                              <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                                No Stock
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-sm">
                                {item.lowStockThreshold} units
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-sm">
                                £{(item.price / 100).toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleEditItem(item)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="text-red-500 hover:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                <div className="mt-4 space-y-4">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-amber-600 mr-2 flex-shrink-0" />
                      <div className="text-sm text-amber-800">
                        <p className="font-medium">Important</p>
                        <p>Stock status is automatically updated based on these thresholds:</p>
                        <ul className="ml-6 mt-1 list-disc">
                          <li>Items with stock level <strong>at or below</strong> the threshold will be marked as <strong>Low Stock</strong></li>
                          <li>Items with <strong>zero</strong> stock will be marked as <strong>Out of Stock</strong></li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex">
                      <FileUp className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium">CSV Import Instructions</p>
                        <p>To import stock items via CSV, your file should include the following columns:</p>
                        <ul className="ml-6 mt-1 list-disc">
                          <li><strong>item_code</strong> - The unique item code (e.g., BP401, DP196)</li>
                          <li><strong>alt_item_code</strong> - Alternative item code or SKU reference</li>
                          <li><strong>product</strong> - The name of the product</li>
                          <li><strong>price_box</strong> - The price of the box/unit</li>
                        </ul>
                        <div className="mt-2">
                          <Button 
                            onClick={downloadCsvTemplate}
                            variant="outline"
                            size="sm"
                            className="text-blue-600 border-blue-600 hover:bg-blue-50"
                          >
                            Download Template
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Categories Management Section */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Tag className="mr-2 h-5 w-5" />
                  Stock Categories
                </CardTitle>
                <CardDescription>
                  Manage product categories and their prefix codes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between mb-4">
                  <div className="text-sm text-muted-foreground">
                    These categories are used for organizing stock items and generating item codes
                  </div>
                  <Button 
                    onClick={() => {
                      setNewCategory({ name: "", prefix: "", description: "" });
                      setCategoryDialogOpen(true);
                    }}
                    className="bg-chai-gold hover:bg-amber-600"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Category
                  </Button>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Prefix</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories && categories.length > 0 ? (
                      categories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium">{category.name}</TableCell>
                          <TableCell>{category.prefix}</TableCell>
                          <TableCell>{category.description || "-"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  setEditingCategory(category);
                                  setNewCategory({
                                    name: category.name,
                                    prefix: category.prefix,
                                    description: category.description || "",
                                  });
                                  setCategoryDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="text-red-500"
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to delete ${category.name}?`)) {
                                    deleteCategory(category.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                          No categories found. Add your first category to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            
            {/* Category Add/Edit Dialog */}
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? 'Edit Category' : 'Add New Category'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingCategory 
                      ? 'Update the details of the existing category' 
                      : 'Add a new category for stock item organization'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="categoryName">Category Name</Label>
                    <Input 
                      id="categoryName" 
                      value={newCategory.name} 
                      onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                      placeholder="e.g. Drinks, Food, Packaging"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="categoryPrefix">Prefix Code</Label>
                    <Input 
                      id="categoryPrefix" 
                      value={newCategory.prefix} 
                      onChange={(e) => setNewCategory({ ...newCategory, prefix: e.target.value.toUpperCase() })}
                      placeholder="e.g. DP, BP, FPFC"
                      maxLength={5}
                    />
                    <p className="text-xs text-muted-foreground">
                      Short code used for generating item codes (max 5 characters)
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="categoryDescription">Description (Optional)</Label>
                    <Input 
                      id="categoryDescription" 
                      value={newCategory.description} 
                      onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                      placeholder="Brief description of this category"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    disabled={!newCategory.name || !newCategory.prefix || isCreating || isUpdating}
                    onClick={() => {
                      if (editingCategory) {
                        updateCategory({
                          id: editingCategory.id,
                          data: {
                            name: newCategory.name,
                            prefix: newCategory.prefix,
                            description: newCategory.description || null
                          }
                        });
                      } else {
                        createCategory({
                          name: newCategory.name,
                          prefix: newCategory.prefix,
                          description: newCategory.description || null
                        });
                      }
                      setCategoryDialogOpen(false);
                      setEditingCategory(null);
                    }}
                    className="bg-chai-gold hover:bg-amber-600"
                  >
                    {isCreating || isUpdating ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {editingCategory ? 'Updating...' : 'Creating...'}
                      </span>
                    ) : (
                      <span>{editingCategory ? 'Update Category' : 'Create Category'}</span>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
          
          {/* User Preferences Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Preferences</CardTitle>
                <CardDescription>
                  Configure your personal preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="email-notifications" 
                        className="h-4 w-4 border-gray-300 rounded"
                        defaultChecked
                      />
                      <Label htmlFor="email-notifications" className="text-sm font-normal">
                        Receive email notifications for low stock alerts
                      </Label>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="dashboard-view">Default Dashboard View</Label>
                    <select 
                      id="dashboard-view" 
                      className="w-full p-2 border rounded"
                      defaultValue="summary"
                    >
                      <option value="summary">Summary View</option>
                      <option value="detailed">Detailed View</option>
                      <option value="kanban">Kanban View</option>
                    </select>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="bg-chai-gold hover:bg-amber-600">
                  <Save className="mr-2 h-4 w-4" />
                  Save Preferences
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Permissions Tab */}
          {user?.role === 'admin' && (
            <TabsContent value="permissions">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="mr-2 h-5 w-5" />
                    Permissions Management
                  </CardTitle>
                  <CardDescription>
                    Configure user roles and feature access
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium">System Access Levels</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Define which user roles can access specific features
                      </p>
                      
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[250px]">Feature</TableHead>
                              <TableHead className="text-center">Admin</TableHead>
                              <TableHead className="text-center">Regional Manager</TableHead>
                              <TableHead className="text-center">Store Manager</TableHead>
                              <TableHead className="text-center">Staff</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {[
                              { id: 'dashboard', name: 'Dashboard', description: 'View main dashboard' },
                              { id: 'inventory', name: 'Inventory Management', description: 'Access and modify inventory' },
                              { id: 'stock_check', name: 'Stock Check', description: 'Access stock check page' },
                              { id: 'stock', name: 'Stock Tab', description: 'Access stock configuration tab' },
                              { id: 'event_orders', name: 'Event Orders', description: 'Manage event orders' },
                              { id: 'deep_cleaning', name: 'Deep Cleaning', description: 'Access deep cleaning management' },
                              { id: 'announcements', name: 'Announcements', description: 'Create and view announcements' },
                              { id: 'reports', name: 'Reports', description: 'Generate and view reports' },
                              { id: 'user_management', name: 'User Management', description: 'Manage user accounts' }
                            ].map((feature) => (
                              <TableRow key={feature.id}>
                                <TableCell className="font-medium">
                                  <div>
                                    {feature.name}
                                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Checkbox 
                                    id={`admin-${feature.id}`} 
                                    defaultChecked={true} 
                                    disabled
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <Checkbox 
                                    id={`regional-${feature.id}`} 
                                    defaultChecked={['dashboard', 'inventory', 'stock_check', 'stock', 'event_orders', 'deep_cleaning', 'announcements', 'reports'].includes(feature.id)}
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <Checkbox 
                                    id={`store-${feature.id}`} 
                                    defaultChecked={['dashboard', 'inventory', 'event_orders', 'deep_cleaning', 'announcements'].includes(feature.id)}
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <Checkbox 
                                    id={`staff-${feature.id}`} 
                                    defaultChecked={['dashboard'].includes(feature.id)} 
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium">Store-Specific Permissions</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Configure access to specific store locations
                      </p>
                      
                      <div className="border rounded-lg p-4">
                        <div className="mb-4 flex items-center space-x-2">
                          <UserCog className="h-5 w-5" />
                          <span className="font-medium">Assign Store Access to Managers</span>
                        </div>
                        
                        <div className="grid gap-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="user-select">Select User</Label>
                              <Select defaultValue="">
                                <SelectTrigger>
                                  <SelectValue placeholder="Select user" />
                                </SelectTrigger>
                                <SelectContent>
                                  {allStaff
                                    .filter(staff => staff.role !== 'Admin') // Filter out Admin users
                                    .map(staff => (
                                      <SelectItem key={staff.id} value={String(staff.id)}>
                                        {staff.name} ({staff.role})
                                      </SelectItem>
                                    ))
                                  }
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="store-select">Assign to Store</Label>
                              <Select defaultValue="">
                                <SelectTrigger>
                                  <SelectValue placeholder="Select store" />
                                </SelectTrigger>
                                <SelectContent>
                                  {allStores.map((store: SelectStore) => (
                                    <SelectItem key={store.id} value={String(store.id)}>
                                      {store.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <Button className="w-full bg-chai-gold hover:bg-amber-600">
                            <Plus className="mr-2 h-4 w-4" />
                            Assign Store Access
                          </Button>
                        </div>
                        
                        <div className="mt-6">
                          <h4 className="text-sm font-medium mb-2">Current Store Assignments</h4>
                          <div className="border rounded-md overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>User</TableHead>
                                  <TableHead>Role</TableHead>
                                  <TableHead>Assigned Store</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {allStaff.map(staff => {
                                  // Find the store name for this staff member if they have a storeId
                                  const store = staff.storeId 
                                    ? allStores.find(s => s.id === staff.storeId) 
                                    : null;
                                  
                                  const storeName = staff.role === 'Regional Manager' || staff.role === 'Admin'
                                    ? 'All Stores'
                                    : (store ? store.name : 'None');
                                  
                                  const isManagementRole = staff.role === 'Admin' || staff.role === 'Regional Manager';
                                  
                                  return (
                                    <TableRow key={staff.id}>
                                      <TableCell>{staff.name}</TableCell>
                                      <TableCell>{staff.role}</TableCell>
                                      <TableCell>{storeName}</TableCell>
                                      <TableCell className="text-right">
                                        <Button variant="outline" size="sm" disabled={isManagementRole}>
                                          {isManagementRole ? (
                                            <Lock className="h-4 w-4" />
                                          ) : (
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                          )}
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                                {allStaff.length === 0 && (
                                  <TableRow>
                                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                                      No staff members found
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Note: Regional managers have access to all stores by default.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline">
                    Reset to Defaults
                  </Button>
                  <Button className="bg-chai-gold hover:bg-amber-600">
                    <Save className="mr-2 h-4 w-4" />
                    Save Permission Changes
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
      
      {/* Edit Item Dialog */}
      {dialogOpen && editItem && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Stock Configuration</DialogTitle>
              <DialogDescription>
                Update low stock threshold for {editItem.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4 place-items-center">
              <div className="grid grid-cols-4 items-center gap-4 w-full">
                <Label className="text-right" htmlFor="item-code">Item Code</Label>
                <Input 
                  id="item-code"
                  value={editItem.itemCode} 
                  className="col-span-3"
                  readOnly
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4 w-full">
                <Label className="text-right" htmlFor="item-name">Name</Label>
                <Input 
                  id="item-name"
                  value={editItem.name} 
                  className="col-span-3"
                  onChange={(e) => setEditItem({...editItem, name: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4 w-full">
                <Label className="text-right" htmlFor="item-category">Category</Label>
                <select 
                  id="item-category"
                  value={editItem.category}
                  className="col-span-3 w-full p-2 border rounded"
                  onChange={(e) => setEditItem({...editItem, category: e.target.value})}
                >
                  <option value="Food">Food</option>
                  <option value="Dry Food">Dry Food</option>
                  <option value="Frozen Food">Frozen Food</option>
                  <option value="Drinks">Drinks</option>
                  <option value="Packaging">Packaging</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4 w-full">
                <Label className="text-right" htmlFor="threshold">Low Stock Threshold</Label>
                <Input 
                  id="threshold"
                  type="number" 
                  value={editItem.lowStockThreshold} 
                  className="col-span-3"
                  min={1}
                  onChange={(e) => setEditItem({...editItem, lowStockThreshold: parseInt(e.target.value)})}
                />
              </div>
              
              <div className="col-span-3 text-xs text-muted-foreground ml-auto text-center w-full">
                Items with stock level at or below this threshold will be marked as "Low Stock"
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveChanges} className="bg-chai-gold hover:bg-amber-600">
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Add New Item Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Stock Item</DialogTitle>
            <DialogDescription>
              Create a new stock item configuration
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4 place-items-center">
            <div className="grid grid-cols-4 items-center gap-4 w-full">
              <Label className="text-right" htmlFor="new-item-code">Item Code</Label>
              <div className="col-span-3 flex items-center">
                <Input 
                  id="new-item-code"
                  value={generateItemCode(newItem.category, newItem.name)}
                  className="text-gray-500"
                  readOnly
                />
                <div className="ml-2 text-xs text-gray-500">Auto-generated</div>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4 w-full">
              <Label className="text-right" htmlFor="new-item-name">Name</Label>
              <Input 
                id="new-item-name"
                value={newItem.name} 
                className="col-span-3"
                onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                placeholder="e.g. Masala Beans"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4 w-full">
              <Label className="text-right" htmlFor="new-item-category">Category</Label>
              <select 
                id="new-item-category"
                value={newItem.category}
                className="col-span-3 w-full p-2 border rounded"
                onChange={(e) => setNewItem({...newItem, category: e.target.value})}
              >
                <option value="Food">Food</option>
                <option value="Dry Food">Dry Food</option>
                <option value="Frozen Food">Frozen Food</option>
                <option value="Drinks">Drinks</option>
                <option value="Packaging">Packaging</option>
                <option value="Miscellaneous">Miscellaneous</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4 w-full">
              <Label className="text-right" htmlFor="new-threshold">Low Stock Threshold</Label>
              <Input 
                id="new-threshold"
                type="number" 
                value={newItem.lowStockThreshold} 
                className="col-span-3"
                min={1}
                onChange={(e) => setNewItem({...newItem, lowStockThreshold: parseInt(e.target.value)})}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddItem} className="bg-chai-gold hover:bg-amber-600">
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}