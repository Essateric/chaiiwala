import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import DashboardLayout from '@/components/layout/dashboard-layout';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Save, Package, AlertTriangle, CheckCircle2, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';

type StockItem = {
  id: number;
  itemCode: string;
  name: string;
  category: string;
  lowStockThreshold: number;
  price: number;
  sku: string;
};

type StockLevel = {
  id: number;
  storeId: number;
  stockItemId: number;
  quantity: number;
  lastUpdated: string;
  updatedBy: number;
};

type StockItemWithLevel = StockItem & {
  quantity: number;
  lastUpdated: string | null;
};

export default function StockLevelsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [editedItems, setEditedItems] = useState<{ [key: number]: number }>({});
  
  // Get user's store
  const storeId = user?.storeId;

  // Fetch all stock items
  const { data: stockItems = [], isLoading: isLoadingStockItems } = useQuery<StockItem[]>({
    queryKey: ['/api/stock-config'],
    enabled: !!user,
  });

  // Fetch stock levels for this store
  const { data: stockLevels = [], isLoading: isLoadingStockLevels } = useQuery<StockLevel[]>({
    queryKey: ['/api/stock-levels', storeId],
    enabled: !!user && !!storeId,
  });

  // Create combined data
  const combinedStockData: StockItemWithLevel[] = stockItems.map(item => {
    const stockLevel = stockLevels.find(level => level.stockItemId === item.id);
    return {
      ...item,
      quantity: stockLevel?.quantity || 0,
      lastUpdated: stockLevel?.lastUpdated || null,
    };
  });

  // Filter and search
  const filteredStockItems = combinedStockData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'all') return matchesSearch;
    if (filter === 'low') return matchesSearch && (item.quantity > 0 && item.quantity <= item.lowStockThreshold);
    if (filter === 'out') return matchesSearch && item.quantity === 0;
    if (filter === 'in') return matchesSearch && item.quantity > item.lowStockThreshold;
    if (filter === filter) return matchesSearch && item.category.toLowerCase() === filter.toLowerCase();
    
    return true;
  });

  // Handle quantity changes
  const handleQuantityChange = (itemId: number, quantity: number) => {
    setEditedItems({
      ...editedItems,
      [itemId]: quantity
    });
  };

  // Update stock level mutation
  const updateStockLevelMutation = useMutation({
    mutationFn: async (data: { stockItemId: number, quantity: number }) => {
      const response = await apiRequest('POST', '/api/stock-levels/update', {
        storeId: storeId,
        stockItemId: data.stockItemId,
        quantity: data.quantity,
        updatedBy: user?.id,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stock-levels', storeId] });
      toast({
        title: "Stock levels updated",
        description: "The stock levels have been successfully updated",
      });
      setEditedItems({});
    },
    onError: (error) => {
      toast({
        title: "Error updating stock levels",
        description: error.message || "There was an error updating stock levels",
        variant: "destructive",
      });
    }
  });

  // Save changes
  const handleSave = () => {
    Object.entries(editedItems).forEach(([itemId, quantity]) => {
      updateStockLevelMutation.mutate({
        stockItemId: parseInt(itemId),
        quantity: quantity
      });
    });
  };

  // Get stock status
  const getStockStatus = (item: StockItemWithLevel) => {
    if (item.quantity === 0) {
      return { status: 'Out of Stock', variant: 'destructive', icon: <AlertTriangle className="h-4 w-4" /> };
    } else if (item.quantity <= item.lowStockThreshold) {
      return { status: 'Low Stock', variant: 'warning', icon: <ShoppingCart className="h-4 w-4" /> };
    } else {
      return { status: 'In Stock', variant: 'default', icon: <CheckCircle2 className="h-4 w-4" /> };
    }
  };

  const isLoading = isLoadingStockItems || isLoadingStockLevels;

  return (
    <DashboardLayout title="Stock Levels">
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="mr-2 h-5 w-5" />
              Manage Stock Levels
            </CardTitle>
            <CardDescription>
              Update and track stock levels for your store
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
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="low">Low Stock</SelectItem>
                  <SelectItem value="out">Out of Stock</SelectItem>
                  <SelectItem value="in">In Stock</SelectItem>
                  <SelectItem value="Food">Food</SelectItem>
                  <SelectItem value="Drinks">Drinks</SelectItem>
                  <SelectItem value="Packaging">Packaging</SelectItem>
                  <SelectItem value="Dry Food">Dry Food</SelectItem>
                  <SelectItem value="Frozen Food">Frozen Food</SelectItem>
                  <SelectItem value="Miscellaneous">Miscellaneous</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Current Qty</TableHead>
                      <TableHead className="text-center">New Qty</TableHead>
                      <TableHead className="text-right">Last Updated</TableHead>
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
                        const { status, variant, icon } = getStockStatus(item);
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono">{item.itemCode}</TableCell>
                            <TableCell>
                              <div>
                                <div>{item.name}</div>
                                <div className="text-xs text-muted-foreground">SKU: {item.sku || "-"}</div>
                              </div>
                            </TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={variant as any} className="flex items-center justify-center gap-1 w-28 mx-auto">
                                {icon}
                                {status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {item.quantity || "0"}
                            </TableCell>
                            <TableCell className="w-32">
                              <Input
                                type="number"
                                min="0"
                                value={(editedItems[item.id] !== undefined) ? editedItems[item.id] : item.quantity}
                                onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                                className="w-full text-center"
                              />
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              {item.lastUpdated 
                                ? format(new Date(item.lastUpdated), 'dd/MM/yyyy HH:mm') 
                                : 'Never'}
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
              {filteredStockItems.length} items shown
            </div>
            <Button
              onClick={handleSave}
              disabled={Object.keys(editedItems).length === 0 || updateStockLevelMutation.isPending}
              className="bg-chai-gold hover:bg-amber-600"
            >
              <Save className="mr-2 h-4 w-4" />
              {updateStockLevelMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
}