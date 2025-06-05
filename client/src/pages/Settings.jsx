import { useEffect, useState } from 'react';
import { supabase } from "@/lib/supabaseClient";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from "@/lib/queryClient";
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, Settings, Save, Plus, Edit, Trash2, Package, Shield, Lock, UserCog, FileUp, Tag } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useStockCategories } from "@/hooks/use-stock-categories";


// Fetch categories from Supabase
function useStockCategoriesFromDB() {
  return useQuery({
    queryKey: ['stock_categories'],
    queryFn: async () => {
      let { data, error } = await supabase
        .from('stock_categories')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw new Error(error.message);
      return data || [];
    }
  });
}


export default function SettingsPage() {
  const [stockConfig, setStockConfig] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingStock, setLoadingStock] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const totalPages = Math.ceil(stockConfig.length / itemsPerPage);
 const filteredStockConfig = stockConfig.filter(item =>
  item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  item.item_code.toLowerCase().includes(searchTerm.toLowerCase())
);
const paginatedItems = filteredStockConfig.slice(
  (currentPage - 1) * itemsPerPage,
  currentPage * itemsPerPage
);
  const [stockLevels, setStockLevels] = useState([]);
  const [editItem, setEditItem] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
const [newItem, setNewItem] = useState({
  name: "",
  lowStockThreshold: 5,
  category: "Food",
  price: 0.00,
  sku: "",
  daily_check: false // <--- default off
});

  const [activeTab, setActiveTab] = useState("general");
  const [newCategory, setNewCategory] = useState({ name: "", prefix: "", description: "" });
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const { data: dbcategories = [], isLoading: loadingCategories } = useStockCategoriesFromDB();


  const { categories = [], createCategory, updateCategory, deleteCategory } = useStockCategories() || {};
  const { data: allStores = [] } = useQuery({
    queryKey: ['/api/stores'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  const { data: allStaff = [] } = useQuery({
    queryKey: ['/api/staff'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  const { toast } = useToast();
  const { data: user } = useQuery({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  

  // Fetch stock config and levels
  const fetchStockItems = async () => {
    setLoadingStock(true);
    const { data, error } = await supabase
      .from('stock_items')
      .select('*')
      .order('id', { ascending: true });
    if (error) setStockConfig([]);
    else setStockConfig(data);
    setLoadingStock(false);
  };
  const fetchStockLevels = async () => {
    const { data, error } = await supabase.from('store_stock_levels').select('*');
    if (!error) setStockLevels(data);
    else setStockLevels([]);
  };
  useEffect(() => {
    fetchStockItems();
    fetchStockLevels();
  }, []);

  // Generate item code (unchanged)
  const generateItemCode = (category, name) => {
    const prefix =
      category === "Food" ? "BP" :
      category === "Drinks" ? "DP" :it
      category === "Packaging" ? "FPFC" :
      category === "Dry Food" ? "DF" :
      category === "Miscellaneous" ? "MS" :
      category === "Frozen Food" ? "FZ" : "IT";
    const suffix = Math.floor(100 + Math.random() * 900).toString();
    return `${prefix}${suffix}`;
  };

  // CSV Upload/Download (unchanged)
  const handleCsvUpload = (event) => { /* unchanged from your original */ };
  const processCSV = (csvData) => { /* unchanged from your original */ };
  const downloadCsvTemplate = () => { /* unchanged from your original */ };
const handleAddItem = async () => {
  if (!newItem.name || !newItem.category) {
    toast({
      title: "Validation Error",
      description: "Product name and category are required.",
      variant: "destructive"
    });
    return;
  }

  const itemData = {
    item_code: generateItemCode(newItem.category, newItem.name),
    name: newItem.name,
    category: newItem.category,
    low_stock_threshold: newItem.lowStockThreshold,
    price: newItem.price,
    sku: newItem.sku,
    daily_check: !!newItem.daily_check, // ALWAYS present, always boolean
  };

  console.log("Inserting:", itemData);

  const { error } = await supabase.from('stock_items').insert([itemData]);
  if (error) {
    toast({ title: "Error", description: error.message, variant: "destructive" });
    return;
  }
  toast({ title: "Item Added", description: `${newItem.name} added.` });
  setIsAddDialogOpen(false);
  setNewItem({ name: "", lowStockThreshold: 5, category: "", price: 0.00, sku: "", daily_check: false });
  fetchStockItems();
  setSearchTerm('');
};



  // Edit logic
  const handleEditItem = (item) => {
    // Find possible stock level for this item
    const level = stockLevels.find(l => l.stock_item_id === item.id);
    setEditItem({
      id: item.id,
      item_code: item.item_code,
      sku: item.sku || "",
      name: item.name,
      category: item.category,
      price: item.price,
      lowStockThreshold: level ? level.low_stock_limit : item.low_stock_threshold,
      daily_check: typeof item.daily_check === 'boolean'
        ? item.daily_check
        : (level ? level.daily_check : false)
    });
    setDialogOpen(true);
  };

  // Save changes logic
  const handleSaveChanges = async () => {
     if (!user) {
    toast({
      title: "Error",
      description: "User profile not loaded yet. Please try again.",
      variant: "destructive"
    });
    return;
  }
    if (!editItem) return;
    // 1. Update stock_items table
    let { error: itemError } = await supabase
      .from('stock_items')
      .update({
        name: editItem.name,
        category: editItem.category,
        price: editItem.price,
        sku: editItem.sku,
        low_stock_threshold: editItem.lowStockThreshold,
        daily_check: editItem.daily_check
      })
      .eq('id', editItem.id);

    // 2. Update or upsert store_stock_levels (if needed, based on your db design)
await supabase
  .from('store_stock_levels')
  .upsert({
    store_id: user.store_id, // <-- get this from user context/session
    stock_item_id: editItem.id,
    low_stock_limit: editItem.lowStockThreshold,
    daily_check: editItem.daily_check
  }, { onConflict: ['store_id', 'stock_item_id'] });

    if (itemError) {
      toast({ title: "Error", description: itemError.message, variant: "destructive" });
      return;
    }
    toast({ title: "Item Updated", description: `${editItem.name} updated.` });
    setprofile.store_idOpen(false);
    setEditItem(null);
    fetchStockItems();
    fetchStockLevels();
  };

  // Delete logic (unchanged)
  const handleDeleteItem = async (id) => { /* unchanged from your original */ };
 
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
                <div className="mb-4 flex items-center gap-2">
  <Input
    type="text"
    placeholder="Search by item name or code..."
    value={searchTerm}
    onChange={e => setSearchTerm(e.target.value)}
    className="w-64"
  />
</div>

                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[10%]">Item Code</TableHead>
                        <TableHead className="w-[20%]">Name</TableHead>
                        <TableHead className="w-[15%]">Category</TableHead>
                        <TableHead className="w-[10%] text-center">Stock</TableHead>
                        <TableHead className="w-[10%] text-center">Threshold</TableHead>
                        <TableHead className="w-[10%] text-center">Price</TableHead>
                        <TableHead className="w-[15%]">SKU</TableHead>
                        <TableHead className="w-[10%] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
<TableBody>
  {loadingStock ? (
    <TableRow>
      <TableCell colSpan={8} className="text-center py-8">Loading...</TableCell>
    </TableRow>
  ) : stockConfig.length === 0 ? (
    <TableRow>
      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
        No stock items found.
      </TableCell>
    </TableRow>
  ) : (
paginatedItems.map((item) => (
  <TableRow key={item.id}>
        <TableCell className="font-mono">{item.item_code}</TableCell>
        <TableCell>{item.name}</TableCell>
        <TableCell>{item.category}</TableCell>
        <TableCell className="text-center">
          <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
            No Stock
          </span>
        </TableCell>
        <TableCell className="text-center">
          <span className="text-sm">
            {item.low_stock_threshold || 0} units
          </span>
        </TableCell>
        <TableCell className="text-center">
          <span className="text-sm">
            {Number(item.price).toFixed(2)}
          </span>
        </TableCell>
        <TableCell className="font-mono text-sm">
          {item.sku || "-"}
        </TableCell>
<TableCell className="text-right">
  <div className="flex justify-end gap-2">
    {/* Edit Button (always visible) */}
    <Button
      variant="outline"
      size="icon"
      onClick={() => handleEditItem(item)}
      title="Edit"
    >
      <Edit className="h-4 w-4" />
    </Button>
    {/* Delete Button (only for admin, regional, area) */}
    {["admin", "regional", "area"].includes(user?.role) && (
      <Button
        variant="outline"
        size="icon"
        className="text-red-500"
        onClick={() => handleDeleteItem(item.id)}
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    )}
  </div>
</TableCell>
      </TableRow>
    ))
  )}
</TableBody>

                  </Table>
                  <div className="flex items-center justify-between mt-4">
  {/* Item count summary */}
  <div className="text-sm text-gray-600">
    Showing{" "}
    <b>
      {stockConfig.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage + 1)}
      {" - "}
      {Math.min(currentPage * itemsPerPage, stockConfig.length)}
    </b>
    {" "}of <b>{stockConfig.length}</b> items
  </div>
  {/* Prev/Next buttons */}
  <div className="flex gap-2">
    <Button
      variant="outline"
      size="sm"
      disabled={currentPage === 1}
      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
    >
      Previous
    </Button>
    <span className="text-xs text-gray-700">
      Page {currentPage} of {totalPages || 1}
    </span>
    <Button
      variant="outline"
      size="sm"
      disabled={currentPage === totalPages || totalPages === 0}
      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
    >
      Next
    </Button>
  </div>
</div>

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
                          <li><strong>sku</strong> - Alternative item code or SKU reference</li>
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
            </TabsContent>

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
            
<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
<DialogContent className="sm:max-w-md">
<DialogHeader>
  <DialogTitle>Edit Stock Configuration</DialogTitle>
  <DialogDescription>
    Update low stock threshold for {editItem?.name}
  </DialogDescription>
</DialogHeader>
<div className="grid gap-4 py-4">
  <Label htmlFor="itemCode">Item Code</Label>
  <Input id="itemCode" value={editItem?.item_code || ''} disabled />

  <Label htmlFor="sku">SKU</Label>
  <Input id="sku" value={editItem?.sku || ''} disabled />

  <Label htmlFor="product">Product</Label>
  <Input id="product" value={editItem?.name || ''} disabled />

  <Label htmlFor="price">Price (£)</Label>
  <Input id="price" value={editItem?.price || ''} disabled />

  <Label htmlFor="threshold">Low Stock Limit</Label>
  <Input
    id="threshold"
    type="number"
    value={
      editItem?.lowStockThreshold !== undefined &&
      editItem?.lowStockThreshold !== null
        ? editItem.lowStockThreshold
        : 0
    }
    onChange={e =>
      setEditItem({
        ...editItem,
        lowStockThreshold: parseInt(e.target.value) || 0
      })
    }
  />

  {/* --- VISUAL daily check switch with label --- */}
<div className="flex items-center gap-2 mt-2">
  <Label htmlFor="new-daily-check" className="mb-0">Daily Check</Label>
  <Switch
    id="new-daily-check"
    checked={!!newItem.daily_check}
    onCheckedChange={checked => setNewItem({ ...newItem, daily_check: checked })}
    className={
      newItem.daily_check
        ? "bg-green-600 border-green-600"
        : "bg-gray-300 border-gray-300"
    }
  />
  <span
    className={`ml-2 text-xs font-bold px-2 py-0.5 rounded ${
      newItem.daily_check
        ? "bg-green-100 text-green-800"
        : "bg-gray-200 text-gray-700"
    }`}
  >
    {newItem.daily_check ? "ON" : "OFF"}
  </span>
</div>
<span className="text-xs text-muted-foreground">
  Include this item in daily stock checklist
</span>

</div>
<DialogFooter>
  <Button variant="outline" onClick={() => setDialogOpen(false)}>
    Cancel
  </Button>
  <Button
    onClick={() => {
      // DEBUG: log value before saving
      console.log("Saving editItem:", editItem);
      handleSaveChanges();
    }}
    className="bg-chai-gold hover:bg-amber-600"
  >
    Save Changes
  </Button>
</DialogFooter>

</DialogContent>

</Dialog>



          
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
  {allStores.map((store) => (
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
                  value={editItem.item_code || ""}
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
  onChange={(e) => setEditItem({ ...editItem, category: e.target.value })}
  className="border rounded h-10 px-2 text-gray-700 bg-white border-gray-300"
>
  {categories.map((cat) => (
    <option key={cat.id} value={cat.name}>
      {cat.name}
    </option>
  ))}
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
        Add a new item to your stock configuration
      </DialogDescription>
    </DialogHeader>
    <div className="grid gap-4 py-4">
      <Label htmlFor="new-name">Product Name</Label>
      <Input
        id="new-name"
        value={newItem.name}
        onChange={e => setNewItem({ ...newItem, name: e.target.value })}
        placeholder="e.g. Baked Potato"
      />

      <Label htmlFor="new-category">Category</Label>
<select
  id="new-category"
  value={newItem.category}
  onChange={e => setNewItem({ ...newItem, category: e.target.value })}
  className="border rounded h-10 px-2 text-gray-700 bg-white border-gray-300"
>
  {dbcategories.map((cat) => (
    <option key={cat.id} value={cat.name}>
      {cat.name}
    </option>
  ))}
</select>


      <Label htmlFor="new-sku">SKU</Label>
      <Input
        id="new-sku"
        value={newItem.sku}
        onChange={e => setNewItem({ ...newItem, sku: e.target.value })}
        placeholder="e.g. BP001"
      />

      <Label htmlFor="new-price">Price (£)</Label>
      <Input
        id="new-price"
        type="number"
        min={0}
        step="0.01"
        value={newItem.price}
        onChange={e => setNewItem({ ...newItem, price: parseFloat(e.target.value) })}
        placeholder="0.00"
      />

      <Label htmlFor="new-threshold">Low Stock Threshold</Label>
      <Input
        id="new-threshold"
        type="number"
        min={1}
        value={newItem.lowStockThreshold}
        onChange={e => setNewItem({ ...newItem, lowStockThreshold: parseInt(e.target.value) || 1 })}
        placeholder="5"
      />
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

