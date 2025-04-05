import { useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import InventoryFilters from "@/components/inventory/inventory-filters";
import InventoryTable from "@/components/inventory/inventory-table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

// Types for inventory data
interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  location: string;
  quantity: string;
  status: "in_stock" | "low_stock" | "out_of_stock" | "on_order";
  lastUpdated: string;
}

interface StoreLocation {
  id: number;
  name: string;
}

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch inventory data
  const { data: inventoryItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  // Fetch store locations
  const { data: locations = [] } = useQuery<StoreLocation[]>({
    queryKey: ["/api/locations"],
  });

  // Filter inventory items based on search and filters
  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = searchTerm === "" || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === "" || item.category.toLowerCase().includes(categoryFilter.toLowerCase());
    const matchesLocation = locationFilter === "" || item.location.toLowerCase().includes(locationFilter.toLowerCase());
    const matchesStatus = statusFilter === "" || item.status === statusFilter;

    return matchesSearch && matchesCategory && matchesLocation && matchesStatus;
  });

  const handleEditItem = (id: string) => {
    setEditItemId(id);
  };

  const handleExport = () => {
    toast({
      title: "Export Started",
      description: "Your inventory data is being exported.",
    });
  };

  const handleAddItem = () => {
    toast({
      title: "Add Item",
      description: "New item form would appear here.",
    });
  };

  return (
    <DashboardLayout title="Inventory">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-montserrat font-bold mb-1">Inventory Management</h2>
          <p className="text-gray-600">Track and manage stock across all locations</p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <Button className="bg-chai-gold hover:bg-yellow-600" onClick={handleAddItem}>
            <Plus className="mr-2 h-5 w-5" />
            Add Item
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <FileDown className="mr-2 h-5 w-5" />
            Export
          </Button>
        </div>
      </div>
      
      {/* Filters & Search */}
      <InventoryFilters 
        onSearch={setSearchTerm}
        onCategoryChange={setCategoryFilter}
        onLocationChange={setLocationFilter}
        onStatusChange={setStatusFilter}
        locations={locations}
      />
      
      {/* Inventory Table */}
      <InventoryTable items={filteredItems} onEdit={handleEditItem} />
      
      {/* Edit Item Dialog */}
      {editItemId && (
        <Dialog open={!!editItemId} onOpenChange={(open) => !open && setEditItemId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Inventory Item</DialogTitle>
              <DialogDescription>
                Update the information for this inventory item.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <p className="text-sm text-gray-500">
                This would be a form to edit the item with ID: {editItemId}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditItemId(null)}>
                Cancel
              </Button>
              <Button className="bg-chai-gold hover:bg-yellow-600" onClick={() => setEditItemId(null)}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}
