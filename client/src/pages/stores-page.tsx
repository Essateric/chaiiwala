import { useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PlusCircle, Search, Edit, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

interface Store {
  id: number;
  name: string;
  address: string;
  area: number;
  manager: string;
}

export default function StoresPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddStoreDialog, setShowAddStoreDialog] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const [newStore, setNewStore] = useState({
    name: "",
    address: "",
    area: 1,
    manager: ""
  });

  // Fetch stores
  const { data: stores = [] } = useQuery<Store[]>({
    queryKey: ["/api/stores"],
  });

  // Filter stores based on search
  const filteredStores = stores.filter(store => {
    return store.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           store.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
           store.manager.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Add store mutation
  const addStoreMutation = useMutation({
    mutationFn: async (storeData: typeof newStore) => {
      const res = await apiRequest("POST", "/api/stores", storeData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      setShowAddStoreDialog(false);
      setNewStore({
        name: "",
        address: "",
        area: 1,
        manager: ""
      });
      toast({
        title: "Store Added",
        description: "New store has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to add store: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleAddStore = () => {
    setSelectedStore(null);
    setNewStore({
      name: "",
      address: "",
      area: 1,
      manager: ""
    });
    setShowAddStoreDialog(true);
  };

  const handleEditStore = (store: Store) => {
    setSelectedStore(store);
    setNewStore({
      name: store.name,
      address: store.address,
      area: store.area,
      manager: store.manager
    });
    setShowAddStoreDialog(true);
  };

  const submitStoreForm = () => {
    if (!newStore.name || !newStore.address || !newStore.manager) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    addStoreMutation.mutate(newStore);
  };

  return (
    <DashboardLayout title="Stores">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-montserrat font-bold mb-1">Store Locations</h2>
          <p className="text-gray-600">Manage all your Chaiiwala store locations</p>
        </div>
        {user?.role === 'admin' && (
          <div className="mt-4 md:mt-0">
            <Button className="bg-chai-gold hover:bg-yellow-600" onClick={handleAddStore}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Store
            </Button>
          </div>
        )}
      </div>
      
      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search stores by name, address, or manager..."
            className="pl-10 pr-4"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {/* Stores Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Location</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Manager</TableHead>
              {(user?.role === 'admin' || user?.role === 'regional') && (
                <TableHead className="text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={(user?.role === 'admin' || user?.role === 'regional') ? 5 : 4} className="text-center py-8">
                  <p>No stores found</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredStores.map((store) => (
                <TableRow key={store.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{store.name}</TableCell>
                  <TableCell>{store.address}</TableCell>
                  <TableCell>{store.area}</TableCell>
                  <TableCell>{store.manager}</TableCell>
                  {(user?.role === 'admin' || user?.role === 'regional') && (
                    <TableCell className="text-right">
                      <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => handleEditStore(store)}>
                        <span className="sr-only">Edit</span>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Add/Edit Store Dialog */}
      <Dialog open={showAddStoreDialog} onOpenChange={setShowAddStoreDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedStore ? "Edit Store" : "Add New Store"}</DialogTitle>
            <DialogDescription>
              {selectedStore 
                ? "Update the store information below." 
                : "Enter the details for the new store location."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Store Name</Label>
                <Input
                  id="name"
                  value={newStore.name}
                  onChange={(e) => setNewStore({...newStore, name: e.target.value})}
                  placeholder="e.g. Chaiiwala Oxford Road"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="address"
                    value={newStore.address}
                    onChange={(e) => setNewStore({...newStore, address: e.target.value})}
                    placeholder="Full store address"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="area">Area</Label>
                  <Input
                    id="area"
                    type="number"
                    value={newStore.area}
                    onChange={(e) => setNewStore({...newStore, area: parseInt(e.target.value)})}
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manager">Manager ID</Label>
                  <Input
                    id="manager"
                    value={newStore.manager}
                    onChange={(e) => setNewStore({...newStore, manager: e.target.value})}
                    placeholder="e.g. MGR_OX"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddStoreDialog(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-chai-gold hover:bg-yellow-600" 
              onClick={submitStoreForm}
              disabled={addStoreMutation.isPending}
            >
              {addStoreMutation.isPending 
                ? (selectedStore ? "Updating..." : "Adding...") 
                : (selectedStore ? "Update Store" : "Add Store")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
