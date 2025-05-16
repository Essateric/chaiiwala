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

  // New state for the Invite User dialog
  const [showInviteUserDialog, setShowInviteUserDialog] = useState(false);
  const [newInviteUser, setNewInviteUser] = useState({
    email: "",
    role: "staff", // Default role for invite form
    storeId: "", // For single store selection (staff, store manager)
    storeIds: [], // For multiple store selection (area manager)
    full_name: "", // Optional name for metadata
  });


  // This function calls the create-user Edge Function
  const createAuthUser = async (user) => {
  try {
   // SECURITY RISK: This fetch call does NOT include the Authorization header.
   // Anyone knowing this URL could potentially call this function.
   // It should include the admin user's JWT from useAuth.
   const response = await fetch("https://pjdycbnegzxzhauecrck.functions.supabase.co/create-user", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    // Add Authorization header here:
    // Authorization: `Bearer ${accessToken}`, // Assuming accessToken is available
  },
  body: JSON.stringify({
    email: user.email,
    password: user.password,
    name: user.name,
    permissions: user.permissions,
    store_id: user.store_id, // Note: create-user Edge Function currently expects single store_id
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
      .select("*"); // include auth_id, permissions, store_ids
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
    permissions: "staff", // Use 'permissions' for consistency with profile table
    storeId: "", // For single store selection in Add/Edit form
    storeIds: [], // For multiple store selection in Add/Edit form
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
    // Filter by permissions (role) - assuming 'role' in filter state matches 'permissions' in profile
    const matchesRole = roleFilter === "all" || user.permissions === roleFilter;
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
      case "maintenance": return <Badge className="bg-orange-100 text-orange-800">Maintenance</Badge>; // Added maintenance badge
      default: return <Badge>{permissions}</Badge>;
    }
  };

  const getStoreName = (storeId) => {
    if (!storeId) return "N/A";
    const store = stores.find((s) => s.id === storeId);
    return store ? store.name : `Store #${storeId}`;
  };

  // Handler to open the Add User dialog
  const handleAddUser = () => {
    setSelectedUser(null);
    setNewUser({
      name: "",
      email: "",
      password: "",
      permissions: "staff", // Default permission for Add User form
      storeId: "",
      storeIds: [],
    });
    setPasswordReset({ password: "", confirm: "" });
    setShowAddUserDialog(true);
  };

  // Handler to open the Invite User dialog
  const handleInviteUserClick = () => {
    setNewInviteUser({ email: "", role: "staff", storeId: "", storeIds: [], full_name: "" }); // Reset invite form
    setShowInviteUserDialog(true);
  };


  const handleEditUser = (user) => {
    if (!user) return;
    setSelectedUser(user);
    setNewUser({
      name: user.name || "", // Use name from profile, fallback to empty string
      email: user.email || "", // Use email from profile, fallback
      password: "", // Password is not fetched/displayed
      permissions: user.permissions || "staff", // Use permissions from profile
      storeId: user.store_ids?.[0]?.toString() || "", // Use first store ID for single select, convert to string
      storeIds: user.store_ids || [], // Use store_ids array
    });
    setPasswordReset({ password: "", confirm: "" });
    setShowAddUserDialog(true);
  };

  // This function seems intended to sync profiles without auth_id by creating auth users
  const handleSyncAuth = async (user) => {
    try {
      // SECURITY RISK: This fetch call does NOT include the Authorization header.
      // Anyone knowing this URL could potentially call this function.
      // It should include the admin user's JWT from useAuth.
      const session = await supabase.auth.getSession();
      const token = session.data?.session?.access_token;
      if (!token) throw new Error("Missing token");

      const res = await fetch("https://pjdycbnegzxzhauecrck.functions.supabase.co/sync-auth-for-profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // This one correctly includes the token
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

  // This function seems intended to create a login for a profile that doesn't have one
  const handleSetLogin = async (user) => {
    try {
      // SECURITY RISK: supabase.auth.admin.createUser is called directly from client-side.
      // This requires exposing your service role key on the frontend.
      // This logic should be moved to a secure backend function.
      const { data: authUser, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: "password123", // SECURITY RISK: Hardcoded password
        email_confirm: true,
        user_metadata: {
          name: user.name,
          permissions: user.permissions || user.role || "store", // Use permissions from profile
        },
      });

      if (error) throw error;

      // Link the newly created auth user to the existing profile
      await supabase
        .from("profiles")
        .update({ auth_id: authUser.user.id })
        .eq("id", user.id); // Update by profile ID

      toast({
        title: "Login Enabled",
        description: `Account created for ${user.name}`,
      });

      refetchprofiles(); // Refetch profiles to show the updated auth_id
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
      // SECURITY RISK: supabase.auth.admin.updateUserById is called directly from client-side.
      // This requires exposing your service role key on the frontend.
      // This logic should be moved to a secure backend function.
      const { error } = await supabase.auth.admin.updateUserById(selectedUser.auth_id, { // Use auth_id
        password: passwordReset.password,
      });

      if (error) throw error;

      toast({ title: "Password Reset", description: "Password has been reset successfully." });
      setShowResetPasswordDialog(false);
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Function to submit the Add/Edit User form
  const submitUserForm = async () => {
    // Password check only if adding a new user or if password fields are filled for an existing user
    if ((!selectedUser || (selectedUser && passwordReset.password)) && passwordReset.password !== passwordReset.confirm) {
      return toast({ title: "Passwords do not match", variant: "destructive" });
    }

    try {
      if (!selectedUser) { // Logic for Adding a NEW User
        // SECURITY RISK: supabase.auth.admin.createUser is called directly from client-side.
        // This requires exposing your service role key on the frontend.
        // This logic should be moved to a secure backend function (like your create-user Edge Function).
        // Note: The existing createAuthUser function above is a better approach, but still needs auth header.
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: newUser.email,
          password: passwordReset.password, // Use password from state
          email_confirm: true,
          user_metadata: { // user_metadata is for user-facing data
            name: newUser.name,
            // permissions: newUser.permissions, // Permissions are better in app_metadata or profile table
            // store_id: newUser.storeId, // Store ID is better in app_metadata or profile table
          },
          // app_metadata: { // app_metadata is for internal app data (used by trigger)
          //   user_role: newUser.permissions,
          //   user_store_ids: newUser.storeIds.map(idStr => parseInt(idStr, 10)).filter(idNum => !isNaN(idNum)), // Ensure array of numbers
          // }
        });

        if (authError) throw authError;

        // If relying on trigger, profile is created automatically.
        // If not relying on trigger, you would manually insert profile here.
        // Given your trigger exists, rely on it.

        toast({
          title: "User Created",
          description: `${newUser.name} has been created. Profile will be set up automatically.`,
        });

      } else { // Logic for Editing an EXISTING User
        // Update profile details in 'profiles' table
        const profileUpdates = {
          name: newUser.name,
          permissions: newUser.permissions, // Update permissions from form state
        };

        // Handle store_ids update based on the selected role and input type
        if ((newUser.permissions === "store" || newUser.permissions === "staff") && newUser.storeId) {
          profileUpdates.store_ids = [parseInt(newUser.storeId, 10)].filter(id => !isNaN(id));
        } else if (newUser.permissions === "area") {
          profileUpdates.store_ids = newUser.storeIds.map(idStr => parseInt(idStr, 10)).filter(idNum => !isNaN(idNum));
        } else {
          profileUpdates.store_ids = []; // Or null, depending on your schema for roles without stores
        }

        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update(profileUpdates)
          .eq("auth_id", selectedUser.auth_id); // Update by auth_id

        if (profileUpdateError) throw profileUpdateError;

        // If password was entered, update auth user's password
        if (passwordReset.password) {
           // SECURITY RISK: supabase.auth.admin.updateUserById is called directly from client-side.
           // This requires exposing your service role key on the frontend.
           // This logic should be moved to a secure backend function.
          const { error: passwordUpdateError } = await supabase.auth.admin.updateUserById(
            selectedUser.auth_id, // Use auth_id of the user being edited
            { password: passwordReset.password }
          );
          if (passwordUpdateError) throw passwordUpdateError;
        }

        toast({ title: "User Updated", description: `${newUser.name}'s details have been updated.` });
      }

      setShowAddUserDialog(false);
      refetchprofiles(); // Refetch profiles to update the list
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Function to submit the invite user form
  const submitInviteUser = async () => {
    if (!newInviteUser.email || !newInviteUser.role) {
      return toast({ title: "Email and Role are required", variant: "destructive" });
    }

    let storeIdsForPayload = [];
    // Determine store_ids based on role and input type in the invite form
    if ((newInviteUser.role === "store" || newInviteUser.role === "staff") && newInviteUser.storeId) {
      const id = parseInt(newInviteUser.storeId, 10);
      if (!isNaN(id)) {
        storeIdsForPayload = [id]; // Single store ID as an array
      }
    } else if (newInviteUser.role === "area" && newInviteUser.storeIds.length > 0) {
      // Area manager can have multiple store IDs
      storeIdsForPayload = newInviteUser.storeIds.map(idStr => parseInt(idStr, 10)).filter(idNum => !isNaN(idNum));
    }
    // For admin, regional, maintenance, storeIdsForPayload remains empty []

    try {
      // Call the new invite-user Edge Function
      const response = await fetch("https://pjdycbnegzxzhauecrck.functions.supabase.co/invite-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`, // Authenticate the inviter (admin/regional)
        },
        body: JSON.stringify({
          email: newInviteUser.email,
          role: newInviteUser.role,
          store_ids: storeIdsForPayload, // Pass the processed array of numbers
          full_name: newInviteUser.full_name, // Optional
          // redirect_to: "https://your-app.com/auth" // Optional: override default redirect
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to send invitation');

      toast({ title: "✅ Invitation Sent", description: `Invitation sent to ${newInviteUser.email}` });
      setShowInviteUserDialog(false);
      // Note: The invited user won't appear in the 'profiles' list until they accept the invite and sign up.
      // So, refetching profiles here might not show them immediately, but it's good practice.
      refetchprofiles();

    } catch (err) {
      console.error("❌ Failed to send invitation:", err.message);
      toast({ title: "❌ Error Sending Invite", description: err.message, variant: "destructive" });
    }
  };


  // Helper function to render store assignment fields based on role and active dialog
  const renderStoreAssignment = () => {
    // Determine which form state to use based on which dialog is open
    const activeFormState = showInviteUserDialog ? newInviteUser : newUser;
    const updateActiveFormState = showInviteUserDialog ? setNewInviteUser : setNewUser;
    // Use 'role' for invite form state, 'permissions' for add/edit form state
    const roleField = showInviteUserDialog ? activeFormState.role : activeFormState.permissions;

    // Render single store select for 'store' or 'staff' roles
    if (roleField === "store" || roleField === "staff") {
      return (
        <div className="space-y-2">
          <Label>Assigned Store</Label>
          <Select
            value={activeFormState.storeId} // Use storeId for single select value
            onValueChange={(value) => updateActiveFormState({ ...activeFormState, storeId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select store" />
            </SelectTrigger>
            <SelectContent>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id.toString()}> {/* Value is string */}
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    // Render multi-store checkboxes for 'area' role
    if (roleField === "area") {
      return (
        <div className="space-y-2">
          <Label>Assigned Stores</Label>
          <div className="grid gap-2 max-h-48 overflow-y-auto">
            {stores.map((store) => (
              <label key={store.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  // Check if the store ID (as number) is included in the storeIds array (of numbers)
                  checked={activeFormState.storeIds?.includes(store.id)}
                  onChange={(e) => {
                    const storeIdNum = store.id; // Store ID is already a number
                    const updated = e.target.checked
                      ? [...(activeFormState.storeIds || []), storeIdNum]
                      : (activeFormState.storeIds || []).filter((id) => id !== storeIdNum);
                    updateActiveFormState({ ...activeFormState, storeIds: updated });
                  }}
                />
                <span>{store.name}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }
    // Return null for roles that don't require store assignment (admin, regional, maintenance)
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
          {/* Role Filter Select (Optional) */}
           <Select
            value={roleFilter}
            onValueChange={setRoleFilter}
            className="w-full max-w-[180px]"
          >
            <SelectTrigger>
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

          <Button onClick={handleAddUser}>
            <UserPlus className="w-4 h-4 mr-2" /> Add User
          </Button>
          {/* New Invite User Button */}
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
                <TableHead>Store(s)</TableHead> {/* Updated column header */}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getRoleBadge(user.permissions)}</TableCell>
                  {/* Updated cell rendering for store_ids array */}
                  <TableCell>
                    {user.store_ids && user.store_ids.length > 0
                      ? user.store_ids.map(id => getStoreName(id)).join(', ') // Display list of store names
                      : (user.store_id ? getStoreName(user.store_id) : 'N/A') // Fallback for old single store_id if needed
                    }
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <Button size="icon" variant="ghost" onClick={() => handleEditUser(user)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    {/* Only show Reset Password if user has an auth_id */}
                    {user.auth_id && (
                       <Button size="icon" variant="ghost" onClick={() => handleResetPassword(user)}>
                         <Lock className="w-4 h-4" />
                       </Button>
                    )}
                    {/* Only show Sync Auth if user does NOT have an auth_id */}
                    {!user.auth_id && (
                       <Button
                         size="icon"
                         variant="ghost"
                         onClick={() => handleSyncAuth(user)}
                         title="Sync Auth (Create login for existing profile)"
                       >
                         <UserPlus className="w-4 h-4" /> {/* Using UserPlus for sync */}
                       </Button>
                    )}
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
                : "Enter the details for the new user. A login will be created."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4"> {/* Added py-4 for spacing */}
            <div className="space-y-2">
              <Label htmlFor="add-edit-name">Name</Label>
              <Input
                id="add-edit-name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="Full name"
                required // Added required
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
                required // Added required
                disabled={!!selectedUser} // Disable email edit for existing users
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-edit-permissions">Role</Label>
              <Select
                value={newUser.permissions}
                onValueChange={(value) => setNewUser({ ...newUser, permissions: value, storeId: "", storeIds: [] })} // Reset store selection on role change
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
                  <SelectItem value="maintenance">Maintenance</SelectItem> {/* Added maintenance */}
                </SelectContent>
              </Select>
            </div>

            {renderStoreAssignment()} {/* Re-use for Add/Edit dialog */}

            {/* Password fields only for adding new user or if explicitly resetting */}
            {!selectedUser && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="add-password">Password</Label>
                  <Input
                    id="add-password"
                    type="password"
                    value={passwordReset.password}
                    onChange={(e) => setPasswordReset({ ...passwordReset, password: e.target.value })}
                    placeholder="Enter password"
                    required={!selectedUser} // Required only when adding
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
                    required={!selectedUser} // Required only when adding
                  />
                </div>
              </>
            )}
             {/* Note: Resetting password for existing users is handled by the separate Reset Password dialog */}

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
              <Label htmlFor="invite-name">Full Name (Optional)</Label>
              <Input
                id="invite-name"
                type="text"
                value={newInviteUser.full_name}
                onChange={(e) => setNewInviteUser({ ...newInviteUser, full_name: e.target.value })}
                placeholder="Full name (for profile)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select
                value={newInviteUser.role}
                onValueChange={(value) => setNewInviteUser({ ...newInviteUser, role: value, storeId: "", storeIds: [] })} // Reset store selection on role change
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
            {renderStoreAssignment()} {/* Re-use for invite dialog */}
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
