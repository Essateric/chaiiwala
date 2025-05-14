import { useState } from "react";

export default function AddUserForm() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    role: "store",
    store_id: ""
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("Creating user...");

    const res = await fetch("https://pjdycbnegzxzhauecrck.functions.supabase.co/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    const data = await res.json();
    if (res.ok) {
      setMessage("✅ User created successfully");
    } else {
      setMessage("❌ Error: " + data.error);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 border rounded w-full max-w-md bg-white shadow">
      <h2 className="text-xl font-semibold">Add New User</h2>

      <input
        type="email"
        name="email"
        placeholder="Email"
        onChange={handleChange}
        required
        className="w-full p-2 border rounded"
      />
      <input
        type="password"
        name="password"
        placeholder="Password"
        onChange={handleChange}
        required
        className="w-full p-2 border rounded"
      />
      <input
        type="text"
        name="first_name"
        placeholder="First name"
        onChange={handleChange}
        required
        className="w-full p-2 border rounded"
      />
      <input
        type="text"
        name="last_name"
        placeholder="Last name"
        onChange={handleChange}
        required
        className="w-full p-2 border rounded"
      />
      <input
        type="text"
        name="store_id"
        placeholder="Store ID (optional)"
        onChange={handleChange}
        className="w-full p-2 border rounded"
      />

      <select name="role" onChange={handleChange} value={form.role} className="w-full p-2 border rounded">
        <option value="store">Store</option>
        <option value="admin">Admin</option>
        <option value="regional">Regional</option>
        <option value="maintenance">Maintenance</option>
      </select>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        disabled={loading}
      >
        {loading ? "Adding..." : "Add User"}
      </button>

      <p className="text-sm text-gray-700">{message}</p>
    </form>
  );
}
