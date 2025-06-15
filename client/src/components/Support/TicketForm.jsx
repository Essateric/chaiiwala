import React, { useState } from "react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";

export default function TicketForm({ onCreated }) {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [store, setStore] = useState("");
  const [page, setPage] = useState("");
  const [description, setDescription] = useState("");
  const [repSteps, setRepSteps] = useState([""]);
  const [screenshot, setScreenshot] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    let screenshot_url = "";
    if (screenshot) {
      // Upload screenshot
      const { data, error } = await supabase.storage
        .from("screenshots")
        .upload(`${user.id}/${Date.now()}_${screenshot.name}`, screenshot);
      if (error) {
        alert("Screenshot upload error!");
        setLoading(false);
        return;
      }
      screenshot_url = supabase.storage.from("screenshots").getPublicUrl(data.path).publicUrl;
    }
await supabase.from("support_tickets").insert([{
  user_id: user.id,
  user_name: user.user_metadata?.name || user.email,
  user_role: user.user_metadata?.role || "user",
  store: user.user_metadata?.store_id || "", // <<-- use the logged-in user's store
  page,
  error_message: description,
  replication_steps: repSteps.filter(Boolean),
  screenshot_url,
  status: "todo",
}]);
    setStore("");
    setPage("");
    setDescription("");
    setRepSteps([""]);
    setScreenshot(null);
    setLoading(false);
    if (onCreated) onCreated();

    // Replace with your Make.com webhook URL
const makeWebhookURL = "https://hook.eu2.make.com/8pdrel42bt65yzcncv7picyrxgdtnih2";
await fetch(makeWebhookURL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    store,
    page,
    description,
    repSteps,
    userName: user.user_metadata?.name || user.email,
    screenshot_url
  })
});

  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-lg mx-auto bg-white rounded-xl shadow p-6 space-y-4 mt-4"
    >
      <h2 className="text-xl font-semibold mb-2">Log a new Issue</h2>
      
      {/* Page/Screen */}
      <div>
        <label className="block text-sm font-medium mb-1">Page / Screen</label>
        <input
          required
          placeholder="e.g. Dashboard, Stock Orders"
          className="block w-full rounded border px-3 py-2 text-base"
          value={page}
          onChange={e => setPage(e.target.value)}
        />
      </div>
      
      {/* Error Description */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Describe the Error <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          rows={3}
          placeholder="Explain what went wrong, or any message on screen"
          className="block w-full rounded border px-3 py-2 text-base"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </div>
      
      {/* Replication Steps */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Steps to Reproduce <span className="text-red-500">*</span>
        </label>
        {repSteps.map((s, i) => (
          <div key={i} className="flex items-center mb-1">
            <input
              required
              placeholder={`Step ${i + 1}`}
              className="flex-1 rounded border px-3 py-2 mr-2"
              value={s}
              onChange={e => setRepSteps(reps => reps.map((r, j) => i === j ? e.target.value : r))}
            />
            {i > 0 && (
              <button
                type="button"
                className="text-red-500 font-bold"
                onClick={() => setRepSteps(reps => reps.filter((_, j) => j !== i))}
                title="Remove step"
              >×</button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="text-blue-600 underline text-sm"
          onClick={() => setRepSteps([...repSteps, ""])}
        >+ Add Step</button>
      </div>
      
      {/* Screenshot */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Screenshot <span className="text-red-500">*</span>
        </label>
        <input
          required
          type="file"
          accept="image/*"
          className="block"
          onChange={e => setScreenshot(e.target.files[0])}
        />
      </div>
      
      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-yellow-700 text-white font-bold px-6 py-2 rounded hover:bg-yellow-800 transition"
          disabled={loading}
        >
          {loading ? "Submitting..." : "Submit Ticket"}
        </button>
      </div>
    </form>
  );
}
