import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/UseAuth";
import { useStores } from "@/hooks/use-stores";
import { supabase } from "@/lib/supabaseClient";

export default function AddEmployeePage() {
  const { profile } = useAuth();
  const { stores } = useStores();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "store",
    storeId: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: form.email,
        password: form.password,
        email_confirm: true,
      });

      if (error) throw error;

      const auth_id = data.user.id;

      const { error: insertError } = await supabase.from("profiles").insert({
        auth_id,
        name: form.name,
        email: form.email,
        permissions: form.role,
        store_id: form.storeId || null,
      });

      if (insertError) throw insertError;

      toast({ title: "✅ Employee added successfully" });
      setForm({ name: "", email: "", password: "", role: "store", storeId: "" });
    } catch (err) {
      toast({ title: "❌ Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const allowed = ["admin", "regional"].includes(profile?.permissions);
  if (!allowed) return <p className="p-4">You do not have access to this page.</p>;

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-semibold">Add New Employee</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Name</Label>
          <Input
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            required
            className="bg-white"
          />
        </div>

        <div>
          <Label>Email</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            required
            className="bg-white"
          />
        </div>

        <div>
          <Label>Password</Label>
          <Input
            type="password"
            value={form.password}
            onChange={(e) => handleChange("password", e.target.value)}
            required
            className="bg-white"
          />
        </div>

        <div>
          <Label>Role</Label>
          <select
            className="w-full border p-2 rounded bg-white"
            value={form.role}
            onChange={(e) => handleChange("role", e.target.value)}
          >
            <option value="store">Store</option>
            <option value="staff">Staff</option>
            <option value="maintenance">Maintenance</option>
            <option value="regional">Regional</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {(form.role === "store" || form.role === "staff") && (
          <div>
            <Label>Assign to Store</Label>
            <select
              className="w-full border p-2 rounded bg-white"
              value={form.storeId}
              onChange={(e) => handleChange("storeId", e.target.value)}
              required
            >
              <option value="">Select store</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <Button type="submit" disabled={loading}>
          {loading ? "Adding..." : "Add Employee"}
        </Button>
      </form>
    </div>
  );
}
