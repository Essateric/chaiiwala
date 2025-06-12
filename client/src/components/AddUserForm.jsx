import { useState } from "react";
import { Input } from "../components/ui/input.jsx";
import { Button } from "../components/ui/button.jsx";
import { Label } from "../components/ui/label.jsx";
import { useToast } from "../hooks/use-toast.jsx";
import { useAuth } from "../hooks/UseAuth.jsx";
import { useStores } from "../hooks/use-stores.jsx";
// import { supabase } from "@/lib/supabaseClient"; // No longer needed for direct admin calls

export default function AddEmployeePage() {
  console.log("DEBUG: AddEmployeePage mounted!");

  const { profile, accessToken } = useAuth(); // Get accessToken
  const { stores } = useStores();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "store", // Default role, will be mapped to 'permissions'
    storeId: "",   // Will be sent as 'store_id'
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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

    if (!first_name) {
      toast({ title: "Validation Error", description: "Name (first name) is required.", variant: "destructive" });
      setLoading(false);
      return;
    }

    const payload = {
      email: form.email,
      password: form.password,
      first_name: first_name,
      last_name: last_name,
      permissions: form.role, // Map form's 'role' to 'permissions' for the Edge Function
      store_ids: form.storeId ? [Number(form.storeId)] : [],
    };

    try {
      const response = await fetch("https://pjdycbnegzxzhauecrck.functions.supabase.co/create-user", { // Ensure this URL is correct for your Edge Function
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`, // Add Authorization header
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        // Use the error message from the Edge Function if available
        throw new Error(result.error || "Failed to create employee. Please check the details and try again.");
      }

      toast({ title: "✅ Employee added successfully", description: result.message || `User ${form.email} created.` });
      // Reset the form to initial state
      setForm({ name: "", email: "", password: "", role: "store", storeId: "" });
    } catch (err) {
      toast({ title: "❌ Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Role-based access control for the page itself
  const allowed = ["admin", "regional"].includes(profile?.permissions);
  if (!allowed) {
    return <p className="p-4 text-center text-red-600">You do not have access to this page.</p>;
  }

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold text-center mb-6">Add New Employee</h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg shadow-lg">
        <div>
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            required
            placeholder="Enter employee's full name"
            className="bg-white mt-1" // Retained class if it's intentional for styling
          />
        </div>

        <div>
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            required
            placeholder="Enter employee's email"
            className="bg-white mt-1" // Retained class
          />
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={form.password}
            onChange={(e) => handleChange("password", e.target.value)}
            required
            placeholder="Create a password"
            className="bg-white mt-1" // Retained class
          />
        </div>

        <div>
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            className="w-full border p-2 rounded bg-white shadow-sm focus:ring-chai-gold focus:border-chai-gold mt-1"
            value={form.role}
            onChange={(e) => handleChange("role", e.target.value)}
          >
            {/* Ensure roles match what your system expects */}
            <option value="staff">Staff</option>
            <option value="store">Store Manager</option>
            <option value="maintenance">Maintenance</option>
            <option value="area">Area Manager</option> {/* Added Area Manager for completeness */}
            <option value="regional">Regional Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {(form.role === "store" || form.role === "staff" || form.role === "area") && ( // Area managers might also be assigned to specific stores
          <div>
            <Label htmlFor="storeId">Assign to Store</Label>
            <select
              id="storeId"
              className="w-full border p-2 rounded bg-white shadow-sm focus:ring-chai-gold focus:border-chai-gold mt-1"
              value={form.storeId}
              onChange={(e) => handleChange("storeId", e.target.value)}
              // Conditionally required if the role needs a store
              required={form.role === "store" || form.role === "staff"}
            >
              <option value="">Select store (required for Staff/Store Manager)</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name} (ID: {store.id})
                </option>
              ))}
            </select>
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full bg-chai-gold hover:bg-yellow-600 text-white py-2.5">
          {loading ? "Adding Employee..." : "Add Employee"}
        </Button>
      </form>
    </div>
  );
}
