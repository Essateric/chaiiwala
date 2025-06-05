import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/UseAuth"; // Make sure this import matches your file casing!
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Edit, Trash2, Plus, Shield, Tag, Package } from 'lucide-react';

// --- Stock Management State/Mocks (you would load from API/DB in real app)
const initialStockConfig = [
  { id: 1, itemCode: "BP401", name: "Masala Beans", lowStockThreshold: 5, category: "Food", price: 3.99, sku: "CHW-MB-001", daily_check: false },
  { id: 2, itemCode: "BP402", name: "Daal", lowStockThreshold: 4, category: "Food", price: 2.99, sku: "CHW-DA-001", daily_check: false },
  { id: 3, itemCode: "BP440", name: "Mogo Sauce", lowStockThreshold: 6, category: "Food", price: 1.99, sku: "CHW-MS-001", daily_check: false },
  { id: 4, itemCode: "DP196", name: "Orange Juice (12x250ml)", lowStockThreshold: 3, category: "Drinks", price: 6.99, sku: "CHW-OJ-001", daily_check: false },
  { id: 5, itemCode: "FPFC204", name: "Karak Chaii Sugar free (50 per box)", lowStockThreshold: 2, category: "Drinks", price: 24.99, sku: "CHW-KC-001", daily_check: false },
];

export default function SettingsPage() {
  // --- Auth & Role
  const { user } = useAuth?.() || {};
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");

  // --- Profile state
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [notificationSettings, setNotificationSettings] = useState({
    emailAlerts: true,
    stockAlerts: true,
    taskAssignments: true,
    announcements: true,
  });

  // --- Admin/Business settings
  const [stockConfig, setStockConfig] = useState(initialStockConfig);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    lowStockThreshold: 5,
    category: "Food",
    price: 0.00,
    sku: "",
    daily_check: false,
  });
  // Categories mock (replace with your fetch logic)
  const [categories, setCategories] = useState([
    { id: 1, name: "Food", prefix: "BP", description: "Edible items" },
    { id: 2, name: "Drinks", prefix: "DP", description: "Beverages" },
  ]);
  const [newCategory, setNewCategory] = useState({ name: "", prefix: "", description: "" });
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  // --- Profile handlers
  const handleSaveProfile = () => {
    toast({
      title: "Profile Updated",
      description: "Your profile information has been updated successfully."
    });
  };
  const handleChangePassword = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match. Please try again.",
        variant: "destructive"
      });
      return;
    }
    toast({
      title: "Password Changed",
      description: "Your password has been changed successfully."
    });
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
  };
  const handleSaveNotifications = () => {
    toast({
      title: "Notification Settings Updated",
      description: "Your notification preferences have been saved."
    });
  };

  // --- Stock management handlers (mock logic)
  const handleEditItem = (item) => { setEditItem(item); setDialogOpen(true); };
  const handleSaveChanges = () => {
    if (editItem) {
      const updatedConfig = stockConfig.map(item => item.id === editItem.id ? editItem : item);
      setStockConfig(updatedConfig);
      toast({ title: "Settings Updated", description: `${editItem.name} threshold has been updated.` });
      setDialogOpen(false); setEditItem(null);
    }
  };
  const handleAddItem = () => {
    if (!newItem.name) {
      toast({ title: "Validation Error", description: "Product name is required.", variant: "destructive" });
      return;
    }
    const itemCode = generateItemCode(newItem.category, newItem.name);
    const newId = Math.max(0, ...stockConfig.map(item => item.id)) + 1;
    const itemToAdd = { ...newItem, itemCode, id: newId };
    setStockConfig([...stockConfig, itemToAdd]);
    setNewItem({ name: "", lowStockThreshold: 5, category: "Food", price: 0.00, sku: "", daily_check: false });
    setIsAddDialogOpen(false);
    toast({ title: "Item Added", description: `${newItem.name} has been added to stock configuration.` });
  };
  const handleDeleteItem = (id) => {
    setStockConfig(stockConfig.filter(item => item.id !== id));
    toast({ title: "Item Removed", description: "Item has been removed from stock configuration." });
  };

  // --- Helpers
  const generateItemCode = (category, name) => {
    const prefix =
      category === "Food" ? "BP" :
      category === "Drinks" ? "DP" :
      category === "Packaging" ? "FPFC" :
      category === "Dry Food" ? "DF" :
      category === "Miscellaneous" ? "MS" :
      category === "Frozen Food" ? "FZ" : "IT";
    const suffix = Math.floor(100 + Math.random() * 900).toString();
    return `${prefix}${suffix}`;
  };

  // --- Role logic
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager" || user?.role === "regional";

  return (
    <DashboardLayout title="Settings">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">Account Settings</h2>
        <p className="text-gray-600">Manage your account, preferences, and business settings</p>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white border">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          {(isAdmin || isManager) && <TabsTrigger value="stock">Stock</TabsTrigger>}
          {(isAdmin || isManager) && <TabsTrigger value="categories">Categories</TabsTrigger>}
          {isAdmin && <TabsTrigger value="permissions">Permissions</TabsTrigger>}
          {isAdmin && <TabsTrigger value="system">System</TabsTrigger>}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal info and contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input id="role" value={
                  user?.role === "admin" ? "Administrator" :
                  user?.role === "regional" ? "Regional Manager" :
                  user?.role === "store" ? "Store Manager" :
                  "Staff"
                } disabled />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="bg-chai-gold hover:bg-yellow-600" onClick={handleSaveProfile}>Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Password Tab */}
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input id="confirm-password" type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="bg-chai-gold hover:bg-yellow-600" onClick={handleChangePassword}>Change Password</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Manage how you receive notifications and alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-alerts">Email Notifications</Label>
                  <p className="text-sm text-gray-500">Receive important updates via email</p>
                </div>
                <Switch id="email-alerts" checked={notificationSettings.emailAlerts} onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, emailAlerts: checked })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="stock-alerts">Low Stock Alerts</Label>
                  <p className="text-sm text-gray-500">Notify when inventory items are running low</p>
                </div>
                <Switch id="stock-alerts" checked={notificationSettings.stockAlerts} onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, stockAlerts: checked })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="task-assignments">Task Assignments</Label>
                  <p className="text-sm text-gray-500">Notify when you're assigned a new task</p>
                </div>
                <Switch id="task-assignments" checked={notificationSettings.taskAssignments} onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, taskAssignments: checked })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="announcements">Announcements</Label>
                  <p className="text-sm text-gray-500">Notify for new announcements</p>
                </div>
                <Switch id="announcements" checked={notificationSettings.announcements} onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, announcements: checked })} />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="bg-chai-gold hover:bg-yellow-600" onClick={handleSaveNotifications}>Save Preferences</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* --- ADVANCED BUSINESS TABS --- */}
        {/* Stock Tab */}
        {(isAdmin || isManager) && (
          <TabsContent value="stock">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><Package className="mr-2 h-5 w-5" />Stock Configuration</CardTitle>
                <CardDescription>Manage item thresholds and stock settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between mb-4">
                  <Button onClick={() => setIsAddDialogOpen(true)} className="bg-chai-gold hover:bg-amber-600">
                    <Plus className="mr-2 h-4 w-4" />Add Item
                  </Button>
                </div>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Threshold</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Daily Check</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockConfig.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono">{item.itemCode}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>{item.lowStockThreshold}</TableCell>
                          <TableCell>£{item.price.toFixed(2)}</TableCell>
                          <TableCell>{item.sku}</TableCell>
                          <TableCell>
                            <Switch
                              checked={!!item.daily_check}
                              onCheckedChange={(checked) => {
                                setStockConfig(prev =>
                                  prev.map(row =>
                                    row.id === item.id
                                      ? { ...row, daily_check: checked }
                                      : row
                                  )
                                );
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => handleEditItem(item)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteItem(item.id)} className="text-red-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
            {/* Edit Item Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Stock Item</DialogTitle>
                  <DialogDescription>Update low stock threshold for {editItem?.name}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Label htmlFor="threshold">Low Stock Threshold</Label>
                  <Input id="threshold" type="number" value={editItem?.lowStockThreshold || 0} min={1}
                    onChange={(e) => setEditItem({...editItem, lowStockThreshold: parseInt(e.target.value)})}
                  />
                  <div className="flex items-center gap-2">
                    <Label htmlFor="edit-daily-check">Daily Check</Label>
                    <Switch
                      id="edit-daily-check"
                      checked={!!editItem?.daily_check}
                      onCheckedChange={checked =>
                        setEditItem({ ...editItem, daily_check: checked })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveChanges} className="bg-chai-gold hover:bg-amber-600">Save Changes</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {/* Add Item Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Stock Item</DialogTitle>
                  <DialogDescription>Create a new stock item</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Label htmlFor="new-item-name">Name</Label>
                  <Input id="new-item-name" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="e.g. Masala Beans" />
                  <Label htmlFor="new-item-category">Category</Label>
                  <select id="new-item-category" value={newItem.category} className="w-full p-2 border rounded"
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}>
                    <option value="Food">Food</option>
                    <option value="Dry Food">Dry Food</option>
                    <option value="Frozen Food">Frozen Food</option>
                    <option value="Drinks">Drinks</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                    <option value="Other">Other</option>
                  </select>
                  <Label htmlFor="new-threshold">Low Stock Threshold</Label>
                  <Input id="new-threshold" type="number" value={newItem.lowStockThreshold} min={1}
                    onChange={(e) => setNewItem({ ...newItem, lowStockThreshold: parseInt(e.target.value) })}
                  />
                  <Label htmlFor="new-price">Price</Label>
                  <Input id="new-price" type="number" value={newItem.price} min={0}
                    onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) })}
                  />
                  <Label htmlFor="new-sku">SKU</Label>
                  <Input id="new-sku" value={newItem.sku} onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })} />
                  <div className="flex items-center gap-2">
                    <Label htmlFor="add-daily-check">Daily Check</Label>
                    <Switch
                      id="add-daily-check"
                      checked={!!newItem.daily_check}
                      onCheckedChange={checked => setNewItem({ ...newItem, daily_check: checked })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddItem} className="bg-chai-gold hover:bg-amber-600">Add Item</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        )}
        {/* Categories Tab */}
        {(isAdmin || isManager) && (
          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle><Tag className="mr-2 h-5 w-5" />Stock Categories</CardTitle>
                <CardDescription>Manage product categories and their prefix codes</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => { setNewCategory({ name: "", prefix: "", description: "" }); setCategoryDialogOpen(true); }} className="bg-chai-gold hover:bg-amber-600 mb-2">
                  <Plus className="mr-2 h-4 w-4" />Add Category
                </Button>
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
                    {categories && categories.length > 0 ? categories.map(category => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>{category.prefix}</TableCell>
                        <TableCell>{category.description || "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="icon" onClick={() => { setEditingCategory(category); setNewCategory({ name: category.name, prefix: category.prefix, description: category.description || "" }); setCategoryDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
                          <Button variant="outline" size="icon" className="text-red-500" onClick={() => setCategories(categories.filter(c => c.id !== category.id))}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No categories found. Add your first category.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
                  <DialogDescription>{editingCategory ? 'Update this category' : 'Add a new category'}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Label htmlFor="categoryName">Category Name</Label>
                  <Input id="categoryName" value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} placeholder="e.g. Drinks, Food" />
                  <Label htmlFor="categoryPrefix">Prefix Code</Label>
                  <Input id="categoryPrefix" value={newCategory.prefix} onChange={(e) => setNewCategory({ ...newCategory, prefix: e.target.value.toUpperCase() })} placeholder="e.g. DP, BP" maxLength={5} />
                  <Label htmlFor="categoryDescription">Description (Optional)</Label>
                  <Input id="categoryDescription" value={newCategory.description} onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })} placeholder="Brief description" />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
                  <Button onClick={() => {
                    if (editingCategory) {
                      setCategories(categories.map(c => c.id === editingCategory.id ? { ...editingCategory, ...newCategory } : c));
                    } else {
                      setCategories([...categories, { ...newCategory, id: Date.now() }]);
                    }
                    setCategoryDialogOpen(false); setEditingCategory(null);
                  }} className="bg-chai-gold hover:bg-amber-600">{editingCategory ? "Update" : "Create"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        )}
        {/* Permissions Tab (admin only) */}
        {isAdmin && (
          <TabsContent value="permissions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><Shield className="mr-2 h-5 w-5" />Permissions Management</CardTitle>
                <CardDescription>Configure user roles and feature access</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Add your permissions table or logic here */}
                <p className="text-gray-500">[Permissions management UI goes here]</p>
              </CardContent>
            </Card>
          </TabsContent>
        )}
        {/* System Tab (admin only) */}
        {isAdmin && (
          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>Configure global system settings and defaults</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="data-retention">Data Retention Period</Label>
                  <Select defaultValue="90">
                    <SelectTrigger id="data-retention">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">How long to keep historical data before archiving</p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="low-stock-threshold">Low Stock Threshold (%)</Label>
                  <Input id="low-stock-threshold" type="number" defaultValue="20" min="1" max="100" />
                  <p className="text-sm text-gray-500">Default percentage for triggering low stock alerts</p>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="bg-chai-gold hover:bg-yellow-600">Save System Settings</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </DashboardLayout>
  );
}
