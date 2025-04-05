import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/layout/app-layout";
import StoreSelector from "@/components/common/store-selector";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, Filter } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function InventoryPage() {
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: stores, isLoading: isLoadingStores } = useQuery({
    queryKey: ["/api/stores"],
  });
  
  const { data: inventory, isLoading: isLoadingInventory } = useQuery({
    queryKey: ["/api/stores", selectedStoreId, "inventory"],
    enabled: !!selectedStoreId,
  });
  
  // Filter inventory items based on search query
  const filteredInventory = inventory?.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function getStatusBadge(currentStock: number, minimumStock: number) {
    const ratio = currentStock / minimumStock;
    
    if (ratio <= 0.25) {
      return <Badge variant="destructive">Critical</Badge>;
    } else if (ratio <= 0.5) {
      return <Badge variant="outline" className="border-red-500 text-red-500">Low</Badge>;
    } else if (ratio <= 0.75) {
      return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Warning</Badge>;
    } else {
      return <Badge variant="outline" className="border-green-500 text-green-500">Good</Badge>;
    }
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold">Inventory Management</h2>
            <p className="text-gray-400">Track and manage inventory across all Chaiwala stores</p>
          </div>
          
          <div>
            <StoreSelector 
              stores={stores || []} 
              selectedStoreId={selectedStoreId} 
              onSelectStore={setSelectedStoreId}
              isLoading={isLoadingStores}
            />
          </div>
        </div>
        
        {/* Inventory Management */}
        <Card className="bg-dark-secondary border-gray-700 mb-6">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <CardTitle className="text-xl font-semibold">Inventory Items</CardTitle>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search items..."
                  className="pl-9 bg-dark border-gray-700"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Button variant="outline" className="border-gray-700">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              
              <Button className="bg-gold hover:bg-gold-dark text-dark">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            {isLoadingInventory || !selectedStoreId ? (
              <div className="text-center py-8 text-gray-400">
                {!selectedStoreId ? "Select a store to view inventory" : "Loading inventory data..."}
              </div>
            ) : filteredInventory && filteredInventory.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-dark">
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Min Stock</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.map((item) => (
                      <TableRow key={item.id} className="hover:bg-dark">
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.currentStock}</TableCell>
                        <TableCell>{item.minimumStock}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>
                          {getStatusBadge(item.currentStock, item.minimumStock)}
                        </TableCell>
                        <TableCell>
                          {new Date(item.lastUpdated).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm" className="text-gold hover:text-gold-dark">
                              Update
                            </Button>
                            <Button variant="ghost" size="sm" className="text-blue-500 hover:text-blue-600">
                              History
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                No inventory items found matching your search.
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Inventory Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card className="bg-dark-secondary border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-gray-300">Total Items</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{inventory?.length || 0}</p>
              <p className="text-sm text-gray-400">Across {filteredInventory?.filter(i => i.category !== "").length || 0} categories</p>
            </CardContent>
          </Card>
          
          <Card className="bg-dark-secondary border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-gray-300">Low Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-500">
                {filteredInventory?.filter(i => i.currentStock < i.minimumStock * 0.75 && i.currentStock >= i.minimumStock * 0.5).length || 0}
              </p>
              <p className="text-sm text-gray-400">Items need attention</p>
            </CardContent>
          </Card>
          
          <Card className="bg-dark-secondary border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-gray-300">Critical Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-500">
                {filteredInventory?.filter(i => i.currentStock < i.minimumStock * 0.5).length || 0}
              </p>
              <p className="text-sm text-gray-400">Items need immediate action</p>
            </CardContent>
          </Card>
          
          <Card className="bg-dark-secondary border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-gray-300">Inventory Value</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                £{filteredInventory?.reduce((total, item) => total + (item.costPerUnit || 0) * item.currentStock, 0).toFixed(2) || 0}
              </p>
              <p className="text-sm text-gray-400">Total value of current stock</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
