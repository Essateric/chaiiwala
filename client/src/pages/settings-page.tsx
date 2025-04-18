import { useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import MaintenanceCategorySettings from "@/components/settings/maintenance-category-settings";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");

  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: "example@chaiiwala.com",
    phone: "+44 7700 900123"
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailAlerts: true,
    stockAlerts: true,
    taskAssignments: true,
    announcements: true
  });

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
    
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    });
  };
  
  const handleSaveNotifications = () => {
    toast({
      title: "Notification Settings Updated",
      description: "Your notification preferences have been saved."
    });
  };

  const canAccessAdvancedSettings = user?.role === 'admin' || user?.role === 'regional';

  return (
    <DashboardLayout title="Settings">
      <div className="mb-6">
        <h2 className="text-2xl font-montserrat font-bold mb-1">Account Settings</h2>
        <p className="text-gray-600">Manage your account and preferences</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white border">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          {canAccessAdvancedSettings && (
            <TabsTrigger value="integration">Integrations</TabsTrigger>
          )}
          {canAccessAdvancedSettings && (
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          )}
          {user?.role === 'admin' && (
            <TabsTrigger value="system">System</TabsTrigger>
          )}
        </TabsList>
        
        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and contact details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                  id="phone" 
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input 
                  id="role" 
                  value={user?.role === 'admin' 
                    ? 'Administrator' 
                    : user?.role === 'regional' 
                      ? 'Regional Manager' 
                      : user?.role === 'store' 
                        ? 'Store Manager' 
                        : 'Staff'}
                  disabled
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="bg-chai-gold hover:bg-yellow-600" onClick={handleSaveProfile}>
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Password Tab */}
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your account password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input 
                  id="current-password" 
                  type="password" 
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input 
                  id="new-password" 
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input 
                  id="confirm-password" 
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="bg-chai-gold hover:bg-yellow-600" onClick={handleChangePassword}>
                Change Password
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Manage how you receive notifications and alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-alerts">Email Notifications</Label>
                  <p className="text-sm text-gray-500">Receive important updates via email</p>
                </div>
                <Switch 
                  id="email-alerts" 
                  checked={notificationSettings.emailAlerts}
                  onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, emailAlerts: checked})}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="stock-alerts">Low Stock Alerts</Label>
                  <p className="text-sm text-gray-500">Notify when inventory items are running low</p>
                </div>
                <Switch 
                  id="stock-alerts"
                  checked={notificationSettings.stockAlerts}
                  onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, stockAlerts: checked})}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="task-assignments">Task Assignments</Label>
                  <p className="text-sm text-gray-500">Notify when you're assigned a new task</p>
                </div>
                <Switch 
                  id="task-assignments"
                  checked={notificationSettings.taskAssignments}
                  onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, taskAssignments: checked})}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="announcements">Announcements</Label>
                  <p className="text-sm text-gray-500">Notify for new announcements</p>
                </div>
                <Switch 
                  id="announcements"
                  checked={notificationSettings.announcements}
                  onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, announcements: checked})}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="bg-chai-gold hover:bg-yellow-600" onClick={handleSaveNotifications}>
                Save Preferences
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Integration Tab - Only for admin and regional managers */}
        {canAccessAdvancedSettings && (
          <TabsContent value="integration">
            <Card>
              <CardHeader>
                <CardTitle>External Integrations</CardTitle>
                <CardDescription>
                  Configure connections to external services and data sources
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sheet-integration">Google Sheets Integration</Label>
                  <div className="flex items-center gap-2">
                    <Input id="sheet-integration" placeholder="Enter Google Sheet ID" />
                    <Button variant="outline">Connect</Button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Connect to Google Sheets for inventory management
                  </p>
                </div>
                <Separator className="my-4" />
                <div className="space-y-2">
                  <Label htmlFor="airtable-integration">Airtable Integration</Label>
                  <div className="flex items-center gap-2">
                    <Input id="airtable-integration" placeholder="Enter Airtable API Key" />
                    <Button variant="outline">Connect</Button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Connect to Airtable for advanced data management
                  </p>
                </div>
                <Separator className="my-4" />
                <div className="space-y-2">
                  <Label htmlFor="pos-integration">POS System Integration</Label>
                  <Select>
                    <SelectTrigger id="pos-integration">
                      <SelectValue placeholder="Select POS System" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="square">Square</SelectItem>
                      <SelectItem value="shopify">Shopify POS</SelectItem>
                      <SelectItem value="toast">Toast POS</SelectItem>
                      <SelectItem value="lightspeed">Lightspeed</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">
                    Connect to your Point of Sale system for sales data
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="bg-chai-gold hover:bg-yellow-600">
                  Save Integration Settings
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        )}

        {/* Maintenance Categories Tab - Only for admin and regional managers */}
        {canAccessAdvancedSettings && (
          <TabsContent value="maintenance">
            <MaintenanceCategorySettings />
          </TabsContent>
        )}
        
        {/* System Tab - Admin only */}
        {user?.role === 'admin' && (
          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>
                  Configure global system settings and defaults
                </CardDescription>
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
                  <p className="text-sm text-gray-500">
                    How long to keep historical data before archiving
                  </p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="low-stock-threshold">Low Stock Threshold (%)</Label>
                  <Input id="low-stock-threshold" type="number" defaultValue="20" min="1" max="100" />
                  <p className="text-sm text-gray-500">
                    Default percentage for triggering low stock alerts
                  </p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="default-view">Default Dashboard View</Label>
                  <Select defaultValue="overview">
                    <SelectTrigger id="default-view">
                      <SelectValue placeholder="Select default view" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="overview">Overview</SelectItem>
                      <SelectItem value="inventory">Inventory</SelectItem>
                      <SelectItem value="tasks">Tasks</SelectItem>
                      <SelectItem value="schedule">Schedule</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">
                    Default dashboard view for all users
                  </p>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                    <p className="text-sm text-gray-500">
                      Put the system in maintenance mode (only admins can access)
                    </p>
                  </div>
                  <Switch id="maintenance-mode" />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="bg-chai-gold hover:bg-yellow-600">
                  Save System Settings
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </DashboardLayout>
  );
}
