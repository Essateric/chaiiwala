import { useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

import DashboardLayout from "../components/layout/DashboardLayout.jsx";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../components/ui/table.jsx";
import { Button } from "../components/ui/button.jsx";
import { Input } from "../components/ui/input.jsx";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "../components/ui/dialog.jsx";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select.jsx";
import { Label } from "../components/ui/label.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { PlusCircle, Search, Edit, UserPlus, Lock } from "lucide-react"; // Removed unused Trash icon
import { useToast } from "../hooks/use-toast.jsx";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/UseAuth.jsx";
globalThis.supabase = supabase;


export default function UserManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [passwordReset, setPasswordReset] = useState({ password: "", confirm: "" });
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState(null);

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    permissions: "staff",
    storeId: "", // Represents the ID of a single selected store for roles like staff/store manager
    storeIds: [], // Represents the array of store IDs for roles like area manager
  });

  const [showInviteUserDialog, setShowInviteUserDialog] = useState(false);
  const [newInviteUser, setNewInviteUser] = useState({
    email: "",
    permissions: "staff",
    storeId: "",
    storeIds: [],
    full_name: "",
  });

  const { profile, accessToken } = useAuth();

  const { data: profiles = [], refetch: refetchprofiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles")
      .select("id, auth_id, name, first_name, last_name, email, permissions, store_ids, store_location"); // Removed primary_store_id
      if (error) throw new Error(error.message);
      console.log("UserManagementPage: Fetched profiles data:", data);
      return data;
    },
  });

  const { data: stores = [] } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name");
      if (error) throw new Error(error.message);
      return data;
    },
  });

  if (!profile || !["admin", "regional"].includes(profile.permissions)) {
    return (
      <DashboardLayout title="User Management">
        <p className="p-6 text-muted-foreground text-center">Access Denied</p>
      </DashboardLayout>
    );
  }

  const filteredUsers = profiles.filter((user) => {
    const userName = user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim();
    const matchesSearch =
      searchTerm === "" ||
      userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === "all" || user.permissions === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (permissions) => {
    switch (permissions) {
      case "admin": return <Badge className="bg-purple-100 text-purple-800">Admin</Badge>;
      case "area": return <Badge className="bg-indigo-100 text-indigo-800">Area Manager</Badge>;
      case "regional": return <Badge className="bg-blue-100 text-blue-800">Regional</Badge>;
      case "store": return <Badge className="bg-green-100 text-green-800">Store Manager</Badge>;
      case "staff": return <Badge className="bg-gray-100 text-gray-800">Staff</Badge>;
      case "maintenance": return <Badge className="bg-orange-100 text-orange-800">Maintenance</Badge>;
      default: return <Badge>{permissions}</Badge>;
    }
  };

  const getStoreName = (storeId) => {
    if (!storeId) return "";
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

  const handleInviteUserClick = () => {
    setNewInviteUser({ email: "", permissions: "staff", storeId: "", storeIds: [], full_name: "" });
    setShowInviteUserDialog(true);
  };

  const handleEditUser = (user) => {
    if (!user) return;
    setSelectedUser(user);

    let initialStoreId = "";
    // If the user is staff or store manager and has store_ids, use the first one for the single-select dropdown.
    if ((user.permissions === "staff" || user.permissions === "store") && user.store_ids && user.store_ids.length > 0) {
      initialStoreId = user.store_ids[0].toString();
    }
    // For area managers, storeId (single select) can be left blank as multi-select (storeIds) is primary.
    // For admin/regional/maintenance, storeId will also be blank.

    setNewUser({
      name: user.name || "",
      email: user.email || "",
      password: "", // Password is not fetched/edited here directly
      permissions: user.permissions || "staff",
      storeId: initialStoreId, 
      storeIds: user.store_ids || [],
    });
    setPasswordReset({ password: "", confirm: "" });
    setShowAddUserDialog(true);
  };

  const handleSyncAuth = async (user) => {
    if (!accessToken) {
       return toast({ title: "Authentication Error", description: "Missing token.", variant: "destructive" });
    }
    try {
      // The sync-auth-for-profiles function expects 'email' in the body.
      // It seems to be designed to create an auth user if one doesn't exist for a profile.
      console.log("Payload for invite-user:", {
  email: newInviteUser.email,
  role: newInviteUser.role,
  full_name: newInviteUser.full_name,
  primary_store_id: primaryStoreIdForInvite,
  store_ids: storeIdsArrayForInvite,
});
console.log(typeof store_ids[0])
      const res = await fetch("https://pjdycbnegzxzhauecrck.functions.supabase.co/sync-auth-for-profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ email: user.email }), // Consider if more data is needed by the function
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong during sync");

      toast({ title: "Sync Complete", description: data.details?.[0] || `Auth sync processed for ${user.email}` });
      refetchprofiles();
    } catch (err) {
      console.error("❌ Failed to sync auth:", err.message);
      toast({ title: "❌ Sync Error", description: err.message, variant: "destructive" });
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
    if (!selectedUser?.auth_id) {
        return toast({ title: "Error", description: "User does not have an associated login.", variant: "destructive" });
    }
    if (!accessToken) {
       return toast({ title: "Authentication Error", description: "Missing token.", variant: "destructive" });
    }

    try {
      // SECURITY NOTE: Calling supabase.auth.admin.updateUserById directly from client is a security risk.
      // This should ideally be an Edge Function.
      const { error } = await supabase.auth.admin.updateUserById(selectedUser.auth_id, {
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
    // Password match validation for new user or if password is being changed for existing
    if (!selectedUser && passwordReset.password !== passwordReset.confirm) {
      return toast({ title: "Passwords do not match", variant: "destructive" });
    }
    // Basic validation for new user
    if (!selectedUser && (!newUser.name || !newUser.email || !passwordReset.password)) {
         return toast({ title: "Validation Error", description: "Name, Email, and Password are required for new users.", variant: "destructive" });
    }
    // Store assignment validation for new user
     if (!selectedUser && (newUser.permissions === "store" || newUser.permissions === "staff") && !newUser.storeId) {
        return toast({ title: "Validation Error", description: `Please assign a store for role: ${newUser.permissions}.`, variant: "destructive" });
     }
     if (!selectedUser && newUser.permissions === "area" && (!newUser.storeIds || newUser.storeIds.length === 0)) {
         return toast({ title: "Validation Error", description: "Please assign at least one store for Area Manager role.", variant: "destructive" });
     }

    try {
      if (!accessToken) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      if (!selectedUser) { // Adding a NEW User
        const nameParts = newUser.name.trim().split(" ");
        const first_name = nameParts[0] || "";
        const last_name = nameParts.slice(1).join(" ") || "";

        // The create-user Edge Function expects 'store_id' (singular) for the primary store.
        // It uses this to populate app_metadata.primary_store_id and app_metadata.user_store_ids.
        // The database trigger then uses this app_metadata to populate profiles.store_ids and profiles.store_location.
        let primaryStoreIdForFunction = undefined;
        if ((newUser.permissions === "store" || newUser.permissions === "staff") && newUser.storeId) {
            primaryStoreIdForFunction = Number(newUser.storeId);
        } else if (newUser.permissions === "area" && newUser.storeIds && newUser.storeIds.length > 0) {
            // For area managers, create-user expects a single store_id.
            // We send the first selected storeId as the primary for the function.
            // The function will then create user_store_ids as [primaryStoreIdForFunction].
            // If create-user needs to set multiple store_ids directly in app_metadata, it needs modification.
            primaryStoreIdForFunction = Number(newUser.storeIds[0]);
        }


        const payload = {
          email: newUser.email,
          password: passwordReset.password,
          first_name: first_name,
          last_name: last_name,
          permissions: newUser.permissions,
          store_id: primaryStoreIdForFunction, // This is what create-user Edge Function expects
        };

        const response = await fetch("https://pjdycbnegzxzhauecrck.functions.supabase.co/create-user", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to create user");
        toast({ title: "✅ User Created", description: result.message || `${newUser.name} created.` });

      } else { // Editing an EXISTING User
        const profileUpdates = {
          name: newUser.name,
          first_name: newUser.name.trim().split(" ")[0] || "",
          last_name: newUser.name.trim().split(" ").slice(1).join(" ") || null,
          permissions: newUser.permissions,
          store_ids: [], // Default to empty
          store_location: null, // Default to null
        };

        if ((newUser.permissions === "store" || newUser.permissions === "staff") && newUser.storeId) {
          const numericStoreId = parseInt(newUser.storeId, 10);
          if (!isNaN(numericStoreId)) {
            profileUpdates.store_ids = [numericStoreId];
            profileUpdates.store_location = getStoreName(numericStoreId); // Derive store_location
          }
        } else if (newUser.permissions === "area" && newUser.storeIds && newUser.storeIds.length > 0) {
          const numericStoreIds = newUser.storeIds.map(idStr => parseInt(idStr, 10)).filter(idNum => !isNaN(idNum));
          profileUpdates.store_ids = numericStoreIds;
          // Set store_location to the name of the first store, or a generic message, or leave null
          profileUpdates.store_location = numericStoreIds.length > 0 ? getStoreName(numericStoreIds[0]) : "Multiple Stores";
        }
        // For admin, regional, maintenance, store_ids remains [] and store_location remains null (access to all)
        // This is handled by the defaults if the conditions above are not met.

        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update(profileUpdates) // profileUpdates no longer contains primary_store_id
          .eq("auth_id", selectedUser.auth_id);
        if (profileUpdateError) throw profileUpdateError;
        toast({ title: "User Updated", description: `${newUser.name}'s details have been updated.` });
      }
      setShowAddUserDialog(false);
      refetchprofiles();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

const submitInviteUser = async () => {
  if (!newInviteUser.email || !newInviteUser.permissions || !newInviteUser.full_name.trim()) {
    return toast({ title: "Validation Error", description: "Email, Full Name, and Role are required.", variant: "destructive" });
  }
  if ((newInviteUser.permissions === "store" || newInviteUser.permissions === "staff") && !newInviteUser.storeId) {
    return toast({ title: "Validation Error", description: "Please assign a store for Staff or Store Manager roles.", variant: "destructive" });
  }
  if (newInviteUser.permissions === "area" && (!newInviteUser.storeIds || newInviteUser.storeIds.length === 0)) {
    return toast({ title: "Validation Error", description: "Please assign at least one store for Area Manager role.", variant: "destructive" });
  }

  // Prepare payload for invite-user Edge Function
  let primaryStoreIdForInvite = undefined;
  let storeIdsArrayForInvite = [];

  if ((newInviteUser.permissions === "store" || newInviteUser.permissions === "staff") && newInviteUser.storeId) {
    const id = parseInt(newInviteUser.storeId, 10);
    if (!isNaN(id)) {
      primaryStoreIdForInvite = id;
      storeIdsArrayForInvite = [id];
    }
  } else if (newInviteUser.permissions === "area" && newInviteUser.storeIds.length > 0) {
    storeIdsArrayForInvite = newInviteUser.storeIds.map(idStr => parseInt(idStr, 10)).filter(idNum => !isNaN(idNum));
    if (storeIdsArrayForInvite.length > 0) {
      primaryStoreIdForInvite = storeIdsArrayForInvite[0];
    }
  }

  try {
    if (!accessToken) {
      throw new Error("Authentication token not found. Please log in again.");
    }

    // Log what is being sent
    console.log("UserManagementPage.jsx - Payload for invite-user:", {
      email: newInviteUser.email,
      permissions: newInviteUser.permissions,    // <- THIS IS THE FIX!
      full_name: newInviteUser.full_name,
      primary_store_id: primaryStoreIdForInvite,
      store_ids: storeIdsArrayForInvite,
    });

    const response = await fetch("https://pjdycbnegzxzhauecrck.functions.supabase.co/invite-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        email: newInviteUser.email,
        permissions: newInviteUser.permissions,    // <- THIS MATCHES THE EDGE FUNCTION AND DB
        full_name: newInviteUser.full_name,
        primary_store_id: primaryStoreIdForInvite,
        store_ids: storeIdsArrayForInvite,
      }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to send invitation');
    toast({ title: "✅ Invitation Sent", description: `Invitation sent to ${newInviteUser.email}` });
    setShowInviteUserDialog(false);
    refetchprofiles();
  } catch (err) {
    console.error("❌ Failed to send invitation:", err.message);
    toast({ title: "❌ Error Sending Invite", description: err.message, variant: "destructive" });
  }
};


  const renderStoreAssignment = () => {
    const activeFormState = showInviteUserDialog ? newInviteUser : newUser;
    const updateActiveFormState = showInviteUserDialog ? setNewInviteUser : setNewUser;
    const roleField = showInviteUserDialog ? activeFormState.permissions: activeFormState.permissions;

    if (roleField === "admin" || roleField === "regional" || roleField === "maintenance") {
        return <p className="text-sm text-muted-foreground">This role has access to all stores.</p>;
    }

    if (roleField === "store" || roleField === "staff") {
      return (
        <div className="space-y-2">
          <Label htmlFor={showInviteUserDialog ? "invite-store" : "add-edit-store"}>
            Assigned Store { (roleField === "store" || roleField === "staff") && <span className="text-red-500">*</span>}
          </Label>
          <Select
            value={activeFormState.storeId}
            onValueChange={(value) => updateActiveFormState({ ...activeFormState, storeId: value, storeIds: value ? [parseInt(value,10)] : [] })}
          >
            <SelectTrigger id={showInviteUserDialog ? "invite-store" : "add-edit-store"}>
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

    if (roleField === "area") {
      return (
        <div className="space-y-2">
          <Label>Assigned Stores <span className="text-red-500">*</span></Label>
          <div className="grid gap-2 max-h-48 overflow-y-auto border rounded p-2">
            {stores.map((store) => (
              <label key={store.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeFormState.storeIds?.includes(store.id)}
                  onChange={(e) => {
                    const storeIdNum = store.id;
                    const updated = e.target.checked
                      ? [...(activeFormState.storeIds || []), storeIdNum]
                      : (activeFormState.storeIds || []).filter((id) => id !== storeIdNum);
                    // Update storeId (single select) to the first in the array for consistency, or clear if empty
                    updateActiveFormState({ ...activeFormState, storeIds: updated, storeId: updated.length > 0 ? updated[0].toString() : "" });
                  }}
                  className="form-checkbox text-chai-gold"
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
           <Select
            value={roleFilter}
            onValueChange={setRoleFilter}
          >
            <SelectTrigger className="w-full max-w-[180px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="regional">Regional</SelectItem>
              <SelectItem value="area">Area Manager</SelectItem>
              <SelectItem value="store">Store Manager</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>

          {/* <Button onClick={handleAddUser}>
            <UserPlus className="w-4 h-4 mr-2" /> Add User
          </Button> */}
          <Button onClick={handleInviteUserClick} variant="outline">
            <UserPlus className="w-4 h-4 mr-2" /> Invite User
          </Button>
        </div>

        <div className="overflow-auto border rounded">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Store(s)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getRoleBadge(user.permissions)}</TableCell>
                  <TableCell className="min-w-[150px]">
                    {user.store_ids && user.store_ids.length > 0
                      ? user.store_ids.map(id => getStoreName(id)).join(', ')
                      : (user.store_location || 'N/A') // Display store_location if store_ids is empty
                    }
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <Button size="icon" variant="ghost" onClick={() => handleEditUser(user)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    {user.auth_id && (
                       <Button size="icon" variant="ghost" onClick={() => handleResetPassword(user)}>
                         <Lock className="w-4 h-4" />
                       </Button>
                    )}
                    {!user.auth_id && ( // This button is for profiles without an auth_id
                       <Button
                         size="icon"
                         variant="ghost"
                         onClick={() => handleSyncAuth(user)}
                         title="Sync Auth (Create login for existing profile)"
                       >
                         <UserPlus className="w-4 h-4" />
                       </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredUsers.length === 0 && (
            <p className="p-4 text-muted-foreground text-center">No users found matching criteria.</p>
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
                : "Enter the details for the new user. A login will be created."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-edit-name">Full Name</Label>
              <Input
                id="add-edit-name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="Full name"
                required
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="add-edit-email">Email</Label>
              <Input
                id="add-edit-email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="Email address"
                required
                disabled={!!selectedUser} // Email cannot be changed for existing users
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-edit-permissions">Role</Label>
              <Select
                value={newUser.permissions}
                onValueChange={(value) => setNewUser({ ...newUser, permissions: value, storeId: "", storeIds: [] })}
              >
                <SelectTrigger id="add-edit-permissions">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="regional">Regional</SelectItem>
                  <SelectItem value="area">Area Manager</SelectItem>
                  <SelectItem value="store">Store Manager</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {renderStoreAssignment()}
            {!selectedUser && ( // Only show password fields for new users
              <>
                <div className="space-y-2">
                  <Label htmlFor="add-password">Password</Label>
                  <Input
                    id="add-password"
                    type="password"
                    value={passwordReset.password}
                    onChange={(e) => setPasswordReset({ ...passwordReset, password: e.target.value })}
                    placeholder="Enter password"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-confirm-password">Confirm Password</Label>
                  <Input
                    id="add-confirm-password"
                    type="password"
                    value={passwordReset.confirm}
                    onChange={(e) => setPasswordReset({ ...passwordReset, confirm: e.target.value })}
                    placeholder="Confirm password"
                    required
                  />
                </div>
              </>
            )}
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
              Reset the password for {selectedUser?.name || selectedUser?.email}.
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
                required
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
                required
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

      {/* Invite User Dialog */}
      <Dialog open={showInviteUserDialog} onOpenChange={setShowInviteUserDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
            <DialogDescription>
              Send an email invitation for a new user to set up their account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={newInviteUser.email}
                onChange={(e) => setNewInviteUser({ ...newInviteUser, email: e.target.value })}
                placeholder="Email address to invite"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-name">Full Name <span className="text-red-500">*</span></Label>
              <Input
                id="invite-name"
                type="text"
                required
                value={newInviteUser.full_name}
                onChange={(e) => setNewInviteUser({ ...newInviteUser, full_name: e.target.value })}
                placeholder="Full name (for profile)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select
                value={newInviteUser.permissions}
                onValueChange={(value) => setNewInviteUser({ ...newInviteUser, role: value, storeId: "", storeIds: [] })}
              >
                <SelectTrigger id="invite-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="regional">Regional</SelectItem>
                  <SelectItem value="area">Area Manager</SelectItem>
                  <SelectItem value="store">Store Manager</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {renderStoreAssignment()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteUserDialog(false)}>Cancel</Button>
            <Button className="bg-chai-gold hover:bg-yellow-600" onClick={submitInviteUser}>Send Invitation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
