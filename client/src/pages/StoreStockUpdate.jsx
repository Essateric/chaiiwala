import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from '@tanstack/react-query';
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { format } from 'date-fns';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { 
  Search,
  Save,
  ArrowUpDown,
  Package,
  Plus,
  Minus,
  RefreshCw 
} from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from '@/hooks/use-permissions';

export default function StoreStockUpdatePage() {
  const { user } = useAuth();
  const { hasStoreAccess, canEditStockLevels } = usePermissions();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockStatus, setStockStatus] = useState('all');
  const [editedItems, setEditedItems] = useState({});
  
  // Get user's store
  const storeId = user?.storeId;
  const isStoreManager = user?.role === 'store';

  // Check permissions
  if (!isStoreManager || !storeId) {
    return (
      <DashboardLayout title="Daily Stock Update">
        <div className="container mx-auto py-10">
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-red-500">Access Restricted</CardTitle>
              <CardDescription className="text-center">
                This page is only accessible to store managers. Please contact your administrator if you need access.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Fetch all stock configuration items
  const { data: stockItems = [], isLoading: isLoadingStockItems } = useQuery({
    queryKey: ['/api/stock-config'],
    enabled: !!user,
  });

  // Fetch stock levels for this store
  const { data: stockLevels = [], isLoading: isLoadingStockLevels } = useQuery({
    queryKey: ['/api/stock-levels', storeId],
    enabled: !!user && !!storeId,
  });

  // Create combined data for display
  const combinedStockData = stockItems.map(item => {
    const stockLevel = stockLevels.find(level => level.stockItemId === item.id);
    return {
      ...item,
      quantity: stockLevel?.quantity || 0,
      lastUpdated: stockLevel?.lastUpdated || null,
      isEdited: false
    };
  });

  // Update stock level mutation
  const updateStockLevelMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiRequest('PATCH', `/api/stock-levels/${data.storeId}/${data.stockItemId}`, {
        quantity: data.quantity,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stock-levels', storeId] });
      toast({
        title: "Stock Updated",
        description: "Stock quantities have been successfully updated",
      });
      setEditedItems({});
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update stock quantities. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle quantity change
  const handleQuantityChange = (itemId, newQuantity) => {
    if (newQuantity < 0) newQuantity = 0;
    setEditedItems(prev => ({...prev, [itemId]: newQuantity}));
  };

  // Quick increment/decrement functions
  const incrementQuantity = (itemId, currentQuantity) => {
    handleQuantityChange(itemId, (editedItems[itemId] !== undefined ? editedItems[itemId] : currentQuantity) + 1);
  };

  const decrementQuantity = (itemId, currentQuantity) => {
    handleQuantityChange(itemId, Math.max(0, (editedItems[itemId] !== undefined ? editedItems[itemId] : currentQuantity) - 1));
  };

  // Save all edited items
  const handleSaveChanges = async () => {
    const updatePromises = Object.entries(editedItems).map(([itemId, quantity]) => {
      return updateStockLevelMutation.mutateAsync({
        storeId: storeId,
        stockItemId: parseInt(itemId),
        quantity
      });
    });

    try {
      await Promise.all(updatePromises);
    } catch (error) {
      // Error toast already handled in onError
    }
  };

  // Reset all changes
  const handleResetChanges = () => {
    setEditedItems({});
    toast({
      title: "Changes Reset",
      description: "All unsaved changes have been discarded",
    });
  };

  // Filter stock items based on search, category, and stock status
  const filteredStockItems = combinedStockData.filter(item => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.itemCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku ? item.sku.toLowerCase().includes(searchTerm.toLowerCase()) : false);
    
    // Category filter
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    
    // Stock status filter
    const quantity = editedItems[item.id] !== undefined ? editedItems[item.id] : item.quantity;
    const isOutOfStock = quantity === 0;
    const isLowStock = !isOutOfStock && quantity <= item.lowStockThreshold;
    const isInStock = !isOutOfStock && !isLowStock;
    
    const matchesStockStatus = 
      stockStatus === 'all' || 
      (stockStatus === 'out' && isOutOfStock) || 
      (stockStatus === 'low' && isLowStock) || 
      (stockStatus === 'in' && isInStock);
    
    return matchesSearch && matchesCategory && matchesStockStatus;
  });

  // Get unique categories for the filter
  const categoriesSet = new Set(stockItems.map(item => item.category));
  const categories = Array.from(categoriesSet);

  // Helper to determine stock status for styling
  const getStockStatusClass = (item) => {
    const quantity = editedItems[item.id] !== undefined ? editedItems[item.id] : item.quantity;
    if (quantity === 0) {
      return 'bg-red-100 text-red-800 border-red-200';
    } else if (quantity <= item.lowStockThreshold) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    } else {
      return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  // Helper to get stock status text
  const getStockStatusText = (item) => {
    const quantity = editedItems[item.id] !== undefined ? editedItems[item.id] : item.quantity;
    if (quantity === 0) {
      return 'Out of Stock';
    } else if (quantity <= item.lowStockThreshold) {
      return 'Low Stock';
    } else {
      return 'In Stock';
    }
  };

  return (
    <DashboardLayout title="Daily Stock Update">
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="mr-2 h-5 w-5" />
              Daily Stock Update
            </CardTitle>
            <CardDescription>
              Update your store's inventory levels for today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row justify-between mb-4 gap-4">
              <div className="relative w-full md:w-1/3">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  placeholder="Search by name or code..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={stockStatus} onValueChange={setStockStatus}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stock Status</SelectItem>
                    <SelectItem value="out">Out of Stock</SelectItem>
                    <SelectItem value="low">Low Stock</SelectItem>
                    <SelectItem value="in">In Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLoadingStockItems || isLoadingStockLevels ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Item Code</TableHead>
                      <TableHead>
                        <button 
                          className="flex items-center"
                          onClick={() => {/* Add sorting logic here */}}
                        >
                          Product
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </button>
                      </TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="w-[110px] text-center">Current</TableHead>
                      <TableHead className="w-[180px] text-center">Quantity</TableHead>
                      <TableHead className="w-[120px] text-center">Status</TableHead>
                      <TableHead className="w-[160px]">Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStockItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No stock items found matching your criteria
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStockItems.map((item) => {
                        const currentQuantity = item.quantity;
                        const editedQuantity = editedItems[item.id] !== undefined ? editedItems[item.id] : currentQuantity;
                        const hasChanged = editedQuantity !== currentQuantity;
                        
                        return (
                          <TableRow key={item.id} className={hasChanged ? "bg-blue-50" : ""}>
                            <TableCell className="font-mono text-sm">
                              {item.itemCode}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{item.name}</div>
                              <div className="text-xs text-muted-foreground">{item.sku || 'No SKU'}</div>
                            </TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell className="text-center">{currentQuantity}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center space-x-1">
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  onClick={() => decrementQuantity(item.id, currentQuantity)}
                                  disabled={editedQuantity <= 0}
                                  className="h-8 w-8"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <Input
                                  type="number"
                                  value={editedQuantity}
                                  onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                                  className="w-16 text-center"
                                  min="0"
                                />
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  onClick={() => incrementQuantity(item.id, currentQuantity)}
                                  className="h-8 w-8"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={getStockStatusClass(item)}>
                                {getStockStatusText(item)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {item.lastUpdated 
                                ? format(new Date(item.lastUpdated), 'dd/MM/yyyy HH:mm') 
                                : 'Never updated'}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="text-sm text-muted-foreground">
              {filteredStockItems.length} items shown • 
              {Object.keys(editedItems).length > 0 ? 
                ` ${Object.keys(editedItems).length} items modified` : 
                ' No changes pending'}
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline" 
                onClick={handleResetChanges}
                disabled={Object.keys(editedItems).length === 0 || updateStockLevelMutation.isPending}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button
                onClick={handleSaveChanges}
                disabled={Object.keys(editedItems).length === 0 || updateStockLevelMutation.isPending}
                className="bg-chai-gold hover:bg-amber-600"
              >
                <Save className="mr-2 h-4 w-4" />
                {updateStockLevelMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
}
