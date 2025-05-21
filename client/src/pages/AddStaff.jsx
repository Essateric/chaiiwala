import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/UseAuth";
import { useStores } from "@/hooks/use-stores";
// import { supabase } from "@/lib/supabaseClient"; // No longer needed for direct admin calls

export default function AddStaffPage() {
  const { profile, accessToken } = useAuth(); // Get accessToken
  const { stores } = useStores();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff", // Default role to staff, can be changed
    storeId: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (key, value) => {
    console.log(`handleChange called - Key: ${key}, Value: ${value}`); // Log 1: See if handleChange is triggered
    setForm((prev) => {
      const newState = { ...prev, [key]: value };
      console.log("handleChange - New form state after update:", newState); // Log 2: See the state just after setForm
      return newState;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!accessToken) {
      toast({ title: "Authentication Error", description: "You are not authenticated. Please log in again.", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Split name into first_name and last_name
    const nameParts = form.name.trim().split(" ");
    const first_name = nameParts[0] || "";
    const last_name = nameParts.slice(1).join(" ") || "";

    if (!first_name) { // Basic validation for first name
      toast({ title: "Validation Error", description: "Full Name (at least first name) is required.", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Log 3: See the form state right before creating the payload
    console.log("handleSubmit - Current form state before creating payload:", form);

    const payload = {
      email: form.email,
      password: form.password,
      first_name: first_name,
      last_name: last_name,
      permissions: form.role, // Edge function expects 'permissions'

            store_ids: form.storeId ? [Number(form.storeId)] : [],
    };

    // Log the payload to the browser console to inspect what's being sent
    console.log("Payload being sent to create-user:", payload);

    try {
      const response = await fetch("https://pjdycbnegzxzhauecrck.functions.supabase.co/create-user", { // Ensure this URL is correct
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to create employee. Please check the details and try again.");

      toast({ title: "✅ Employee added successfully", description: result.message || `User ${form.email} created.` });
      setForm({ name: "", email: "", password: "", role: "staff", storeId: "" }); // Reset to new default role
    } catch (err) {
      toast({ title: "❌ Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const allowed = ["admin", "regional"].includes(profile?.permissions);
  if (!allowed) return <p className="p-4">You do not have access to this page.</p>;

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold text-center mb-6">Add New Employee</h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg shadow-lg">
        <div>
          <Label htmlFor="name-addstaff">Full Name</Label>
          <Input
            id="name-addstaff"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            required
            className="bg-white"
          />
        </div>

        <div>
          <Label htmlFor="email-addstaff">Email Address</Label>
          <Input
            id="email-addstaff"
            type="email"
            placeholder="Enter employee's email"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            required
            className="bg-white"
          />
        </div>

        <div>
          <Label htmlFor="password-addstaff">Password</Label>
          <Input
            id="password-addstaff"
            type="password"
            placeholder="Create a password"
            value={form.password}
            onChange={(e) => handleChange("password", e.target.value)}
            required
            className="bg-white"
          />
        </div>

        <div>
          <Label htmlFor="role-addstaff">Role</Label>
          <select
            id="role-addstaff"
            className="w-full border p-2 rounded bg-white shadow-sm focus:ring-chai-gold focus:border-chai-gold mt-1"
            value={form.role}
            onChange={(e) => handleChange("role", e.target.value)}
          >
            {/* Ensure roles match what your system expects */}
            <option value="staff">Staff</option>
            <option value="store">Store Manager</option>
            <option value="maintenance">Maintenance</option>
            <option value="area">Area Manager</option>
            <option value="regional">Regional Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {(form.role === "store" || form.role === "staff" || form.role === "area") && (
          <div>
            <Label htmlFor="storeId-addstaff">Assign to Store</Label>
            <select
              id="storeId-addstaff"
              className="w-full border p-2 rounded bg-white shadow-sm focus:ring-chai-gold focus:border-chai-gold mt-1"
              value={form.storeId}
              onChange={(e) => handleChange("storeId", e.target.value)}
              // Conditionally required
              required={form.role === "store" || form.role === "staff"}
            >
              <option value="">Select store { (form.role === "store" || form.role === "staff") && "(required)"}</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full bg-chai-gold hover:bg-yellow-600 text-white py-2.5">
          {loading ? "Adding..." : "Add Employee"}
        </Button>
      </form>
    </div>
  );
}
