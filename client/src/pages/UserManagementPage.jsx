import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Search, Edit, Trash, UserPlus, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/UseAuth";

export default function UserManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [passwordReset, setPasswordReset] = useState({ password: "", confirm: "" });
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState(null);

  const createAuthUser = async (user) => {
  try {
   const response = await fetch("https://pjdycbnegzxzhauecrck.functions.supabase.co/create-user", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: user.email,
    password: user.password,
    name: user.name,
    permissions: user.permissions,
    store_id: user.store_id,
  }),
});

    const result = await response.json();

    if (!response.ok) throw new Error(result.error || 'Something went wrong');

    console.log('✅ User created:', result.message);
    return result;
  } catch (err) {
    console.error('❌ Failed to create user:', err.message);
    throw err;
  }
};


  const { data: profiles = [], refetch: refetchprofiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles")
      .select("*"); // include auth_id
      if (error) throw new Error(error.message);
      return data;
    },
  });

  

  const { data: stores = [] } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("*");
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff",
    storeId: "",
    storeIds: [],
  });

  const { profile, accessToken  } = useAuth();

  if (!profile || !["admin", "regional"].includes(profile.permissions)) {
    return (
      <DashboardLayout title="User Management">
        <p className="p-6 text-muted-foreground">Access Denied</p>
      </DashboardLayout>
    );
  }

  const filteredUsers = profiles.filter((user) => {
    const matchesSearch =
      searchTerm === "" ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  console.log("Filtered Users:", filteredUsers);

  const getRoleBadge = (permissions) => {
    switch (permissions) {
      case "admin": return <Badge className="bg-purple-100 text-purple-800">Admin</Badge>;
      case "area": return <Badge className="bg-indigo-100 text-indigo-800">Area Manager</Badge>;
      case "regional": return <Badge className="bg-blue-100 text-blue-800">Regional</Badge>;
      case "store": return <Badge className="bg-green-100 text-green-800">Store</Badge>;
      case "staff": return <Badge className="bg-gray-100 text-gray-800">Staff</Badge>;
      default: return <Badge>{permissions}</Badge>;
    }
  };

  const getStoreName = (storeId) => {
    if (!storeId) return "N/A";
    const store = stores.find((s) => s.id === storeId);
    return store ? store.name : `Store #${storeId}`;
  };

  const handleAddUser = () => {
    setSelectedUser(null);
    setNewUser({
      name: "",
      email: "",
      password: "",
      permissions: "staff",
      storeId: "",
      storeIds: [],
    });
    setPasswordReset({ password: "", confirm: "" });
    setShowAddUserDialog(true);
  };

  const handleEditUser = (user) => {
    if (!user) return;
    setSelectedUser(user);
    setNewUser({
      name: user.name,
      email: user.email,
      password: "",
      permissions: user.role,
      storeId: user.store_id || "",
      store_location: user.store_location || [],
    });
    setPasswordReset({ password: "", confirm: "" });
    setShowAddUserDialog(true);
  };

    const handleSyncAuth = async (user) => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data?.session?.access_token;
      if (!token) throw new Error("Missing token");

      const res = await fetch("https://pjdycbnegzxzhauecrck.functions.supabase.co/sync-auth-for-profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: user.email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      toast({ title: "Success", description: data.details?.[0] || `Auth created for ${user.email}` });
      refetchprofiles();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };


  const handleSetLogin = async (user) => {
    try {
      const { data: authUser, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: "password123",
        email_confirm: true,
        user_metadata: {
          name: user.name,
          permissions: user.permissions || user.role || "store",
        },
      });

      if (error) throw error;

      await supabase
        .from("profiles")
        .update({ auth_id: authUser.user.id })
        .eq("id", user.id);

      toast({
        title: "Login Enabled",
        description: `Account created for ${user.name}`,
      });

      refetchUsers();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };


  const handleResetPassword = (user) => {
    setSelectedUser(user);
    setPasswordReset({ password: "", confirm: "" });
    setShowResetPasswordDialog(true);
  };

  const submitPasswordReset = async () => {
    if (passwordReset.password !== passwordReset.confirm) {
      return toast({ title: "Passwords do not match", variant: "destructive" });
    }

    try {
      const { error } = await supabase.auth.admin.updateUserById(selectedUser.id, {
        password: passwordReset.password,
      });

      if (error) throw error;

      toast({ title: "Password Reset", description: "Password has been reset successfully." });
      setShowResetPasswordDialog(false);
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const submitUserForm = async () => {
    if (passwordReset.password !== passwordReset.confirm) {
      return toast({ title: "Passwords do not match", variant: "destructive" });
    }

    try {
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: newUser.email,
        password: passwordReset.password,
        email_confirm: true,
        user_metadata: {
          name: newUser.name,
          permissions: newUser.role,
        },
      });

      if (authError) throw authError;

      toast({
        title: "User Created",
        description: `${newUser.name} has been created.`,
      });

      setShowAddUserDialog(false);
      refetchUsers();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const renderStoreAssignment = () => {
    if (newUser.permissions === "store" || newUser.permissions === "staff") {
      return (
        <div className="space-y-2">
          <Label>Assigned Store</Label>
          <Select
            value={newUser.storeId}
            onValueChange={(value) => setNewUser({ ...newUser, storeId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select store" />
            </SelectTrigger>
            <SelectContent>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id.toString()}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (newUser.permissions === "area") {
      return (
        <div className="space-y-2">
          <Label>Assigned Stores</Label>
          <div className="grid gap-2 max-h-48 overflow-y-auto">
            {stores.map((store) => (
              <label key={store.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={newUser.storeIds?.includes(store.id.toString())}
                  onChange={(e) => {
                    const updated = e.target.checked
                      ? [...(newUser.storeIds || []), store.id.toString()]
                      : (newUser.storeIds || []).filter((id) => id !== store.id.toString());
                    setNewUser({ ...newUser, storeIds: updated });
                  }}
                />
                <span>{store.name}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardLayout title="User Management">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Input
            placeholder="Search by name email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-sm"
          />
          <Button onClick={handleAddUser}>
            <UserPlus className="w-4 h-4 mr-2" /> Add User
          </Button>
        </div>

        <div className="overflow-auto border rounded">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Store</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getRoleBadge(user.permissions)}</TableCell>
                  <TableCell>{getStoreName(user.store_id)}</TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <Button size="icon" variant="ghost" onClick={() => handleEditUser(user)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleResetPassword(user)}>
                      <Lock className="w-4 h-4" />
                    </Button>
                    
<Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleSyncAuth(user)}
                    >
                      <UserPlus className="w-4 h-4" />
                    </Button>



                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredUsers.length === 0 && (
            <p className="p-4 text-muted-foreground">No users found.</p>
            
          )}
        </div>
      </div>

      {/* Add/Edit User Dialog */}
      <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedUser ? "Edit User" : "Add New User"}</DialogTitle>
            <DialogDescription>
              {selectedUser
                ? "Update the user information below."
                : "Enter the details for the new user."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="Full name"
              />
            </div>

             <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="Email address"
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={newUser.permissions}
                onValueChange={(value) => setNewUser({ ...newUser, permissions: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="regional">Regional</SelectItem>
                  <SelectItem value="area">Area Manager</SelectItem>
                  <SelectItem value="store">Store Manager</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {renderStoreAssignment()}

            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={passwordReset.password}
                onChange={(e) => setPasswordReset({ ...passwordReset, password: e.target.value })}
                placeholder="Enter new password"
              />
            </div>

            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={passwordReset.confirm}
                onChange={(e) => setPasswordReset({ ...passwordReset, confirm: e.target.value })}
                placeholder="Confirm new password"
              />
            </div>
          </div>
          

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUserDialog(false)}>
              Cancel
            </Button>
            <Button className="bg-chai-gold hover:bg-yellow-600" onClick={submitUserForm}>
              {selectedUser ? "Update User" : "Add User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset the password for {selectedUser?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordReset.password}
                onChange={(e) => setPasswordReset({ ...passwordReset, password: e.target.value })}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordReset.confirm}
                onChange={(e) => setPasswordReset({ ...passwordReset, confirm: e.target.value })}
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetPasswordDialog(false)}>
              Cancel
            </Button>
            <Button className="bg-chai-gold hover:bg-yellow-600" onClick={submitPasswordReset}>
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
