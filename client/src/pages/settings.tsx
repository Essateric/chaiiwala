import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from '@tanstack/react-query';
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { User as SelectUser, Permission as SelectPermission } from "@shared/schema";
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, Settings, Save, Plus, Edit, Trash2, Package, Shield, Lock, Users, Check, UserCog } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { usePermissions } from "@/hooks/use-permissions";

// Mock stock configuration data
// Type declaration for stock items
interface StockConfigItem {
  id: number;
  itemCode: string;
  name: string;
  lowStockThreshold: number;
  category: string;
}

const initialStockConfig: StockConfigItem[] = [
  { 
    id: 1, 
    itemCode: "BP401", 
    name: "Masala Beans", 
    lowStockThreshold: 5, 
    category: "Food" 
  },
  { 
    id: 2, 
    itemCode: "BP402", 
    name: "Daal", 
    lowStockThreshold: 4, 
    category: "Food" 
  },
  { 
    id: 3, 
    itemCode: "BP440", 
    name: "Mogo Sauce", 
    lowStockThreshold: 6, 
    category: "Food" 
  },
  { 
    id: 4, 
    itemCode: "DP196", 
    name: "Orange Juice (12x250ml)", 
    lowStockThreshold: 3, 
    category: "Drinks" 
  },
  { 
    id: 5, 
    itemCode: "FPFC204", 
    name: "Karak Chaii Sugar free (50 per box)", 
    lowStockThreshold: 2, 
    category: "Drinks" 
  },
];

export default function SettingsPage() {
  const [stockConfig, setStockConfig] = useState(initialStockConfig);
  const [activeTab, setActiveTab] = useState("general");
  const [editItem, setEditItem] = useState<StockConfigItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    lowStockThreshold: 5,
    category: "Food"
  });
  
  // Function to generate item code based on category and name
  const generateItemCode = (category: string, name: string) => {
    const prefix = category === 'Food' ? 'BP' : 
                  category === 'Drinks' ? 'DP' : 
                  category === 'Packaging' ? 'FPFC' : 'IT';
                  
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
      // In a real application, this would make an API call to update the database
      const updatedConfig = stockConfig.map(item => 
        item.id === editItem.id ? editItem : item
      );
      setStockConfig(updatedConfig);
      
      toast({
        title: "Settings Updated",
        description: `${editItem.name} threshold has been updated.`,
      });
      
      // Close the dialog
      setDialogOpen(false);
      setEditItem(null);
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
    
    // Create new item with a unique ID
    const newId = Math.max(...stockConfig.map(item => item.id)) + 1;
    const itemToAdd = {
      ...newItem,
      itemCode,
      id: newId
    };
    
    // Add to stock configuration
    setStockConfig([...stockConfig, itemToAdd]);
    
    // Reset form and close dialog
    setNewItem({
      name: "",
      lowStockThreshold: 5,
      category: "Food"
    });
    setIsAddDialogOpen(false);
    
    toast({
      title: "Item Added",
      description: `${newItem.name} has been added to stock configuration.`,
    });
  };
  
  // Handle delete item
  const handleDeleteItem = (id: number) => {
    const updatedConfig = stockConfig.filter(item => item.id !== id);
    setStockConfig(updatedConfig);
    
    toast({
      title: "Item Removed",
      description: "Item has been removed from stock configuration.",
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
                    >
                      <option value="light">Light</option>
                      <option value="dark" selected>Dark</option>
                      <option value="system">System Default</option>
                    </select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="language">Language</Label>
                    <select 
                      id="language" 
                      className="w-full p-2 border rounded"
                    >
                      <option value="en" selected>English</option>
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
                  <Button 
                    onClick={() => setIsAddDialogOpen(true)}
                    className="bg-chai-gold hover:bg-amber-600"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>
                
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-1/6">Item Code</TableHead>
                        <TableHead className="w-2/6">Name</TableHead>
                        <TableHead className="w-1/6">Category</TableHead>
                        <TableHead className="w-1/6 text-center">Low Stock Threshold</TableHead>
                        <TableHead className="w-1/6 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockConfig.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono">{item.itemCode}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                              {item.lowStockThreshold} units
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
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
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
              </CardContent>
            </Card>
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
                    >
                      <option value="summary" selected>Summary View</option>
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
                              <Select defaultValue="user-1">
                                <SelectTrigger>
                                  <SelectValue placeholder="Select user" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user-1">Jubayed Alam (Store Manager)</SelectItem>
                                  <SelectItem value="user-2">Imran Khan (Store Manager)</SelectItem>
                                  <SelectItem value="user-3">Zahra Ahmed (Store Manager)</SelectItem>
                                  <SelectItem value="user-4">Usman Ali (Regional Manager)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="store-select">Assign to Store</Label>
                              <Select defaultValue="store-1">
                                <SelectTrigger>
                                  <SelectValue placeholder="Select store" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="store-1">Stockport Road</SelectItem>
                                  <SelectItem value="store-2">Wilmslow Road</SelectItem>
                                  <SelectItem value="store-3">Deansgate</SelectItem>
                                  <SelectItem value="store-4">Oxford Road</SelectItem>
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
                                <TableRow>
                                  <TableCell>Jubayed Alam</TableCell>
                                  <TableCell>Store Manager</TableCell>
                                  <TableCell>Stockport Road</TableCell>
                                  <TableCell className="text-right">
                                    <Button variant="outline" size="sm">
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell>Imran Khan</TableCell>
                                  <TableCell>Store Manager</TableCell>
                                  <TableCell>Wilmslow Road</TableCell>
                                  <TableCell className="text-right">
                                    <Button variant="outline" size="sm">
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell>Zahra Ahmed</TableCell>
                                  <TableCell>Store Manager</TableCell>
                                  <TableCell>Deansgate</TableCell>
                                  <TableCell className="text-right">
                                    <Button variant="outline" size="sm">
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell>Usman Ali</TableCell>
                                  <TableCell>Regional Manager</TableCell>
                                  <TableCell>All Stores</TableCell>
                                  <TableCell className="text-right">
                                    <Button variant="outline" size="sm" disabled>
                                      <Lock className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
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
                  <option value="Drinks">Drinks</option>
                  <option value="Packaging">Packaging</option>
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
                <option value="Drinks">Drinks</option>
                <option value="Packaging">Packaging</option>
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