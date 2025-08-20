import React, { useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useAuth } from "../../hooks/UseAuth.jsx";

export default function TicketForm({ onCreated }) {
  const supabase = useSupabaseClient();
  const { user, profile } = useAuth();
  const [page, setPage] = useState("");
  const [description, setDescription] = useState("");
  const [repSteps, setRepSteps] = useState([""]);
  const [screenshots, setScreenshots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedImage, setExpandedImage] = useState(null);




  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    const uploadedUrls = [];

    if (screenshots.length > 0) {
     for (const { file } of screenshots) {
        const filePath = `${user.id}/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from("support-screenshots")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          alert("Screenshot upload error: " + uploadError.message);
          continue;
        }

      const publicUrl = `https://pjdycbnegzxzhauecrck.supabase.co/storage/v1/object/public/support-screenshots/${filePath}`;
uploadedUrls.push(publicUrl);

      }
    }

    const storeLocation = profile?.store_location || "";
    const userRole = profile?.permissions || "";

    await supabase.from("support_tickets").insert([
      {
        user_id: user.id,
        user_name: user.user_metadata?.name || user.email,
        user_role: userRole,
        store: storeLocation,
        page,
        error_message: description,
        replication_steps: repSteps.filter(Boolean),
        screenshot_url: uploadedUrls, // stored as text[] in Supabase
        status: "todo",
      },
    ]);

    const makeWebhookURL = "https://hook.eu2.make.com/8pdrel42bt65yzcncv7picyrxgdtnih2";
    await fetch(makeWebhookURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        store: storeLocation,
        page,
        description,
        repSteps,
        userName: user.user_metadata?.name || user.email,
        userRole,
        screenshot_url: uploadedUrls,
      }),
    });

    setPage("");
    setDescription("");
    setRepSteps([""]);
    setScreenshots([]);
    setLoading(false);
    if (onCreated) onCreated();
  }

  function removeScreenshot(index) {
  setScreenshots(prev => prev.filter((_, i) => i !== index));
}


  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-lg mx-auto bg-white rounded-xl shadow p-6 space-y-4 mt-4"
    >
      <h2 className="text-xl font-semibold mb-2">Log a new Issue</h2>

      <div>
        <label className="block text-sm font-medium mb-1">Page / Screen</label>
        <input
          required
          placeholder="e.g. Dashboard, Stock Orders"
          className="block w-full rounded border px-3 py-2 text-base"
          value={page}
          onChange={(e) => setPage(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Describe the Error <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          rows={3}
          placeholder="Explain what went wrong, or any message on screen"
          className="block w-full rounded border px-3 py-2 text-base"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

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
              onChange={(e) =>
                setRepSteps((reps) =>
                  reps.map((r, j) => (i === j ? e.target.value : r))
                )
              }
            />
            {i > 0 && (
              <button
                type="button"
                className="text-red-500 font-bold"
                onClick={() =>
                  setRepSteps((reps) => reps.filter((_, j) => j !== i))
                }
                title="Remove step"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="text-blue-600 underline text-sm"
          onClick={() => setRepSteps([...repSteps, ""])}
        >
          + Add Step
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Screenshots <span className="text-gray-400">(optional)</span>
        </label>
        <input
          type="file"
          accept="image/*"
          multiple
          className="block"
          onChange={(e) => {
  const files = Array.from(e.target.files);
  const withPreviews = files.map(file => ({
    file,
    previewUrl: URL.createObjectURL(file),
  }));
  setScreenshots(prev => [...prev, ...withPreviews]);
}}

        />
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
  {screenshots.map((s, i) => (
    <div key={i} className="relative w-24 h-24 border rounded overflow-hidden">
      <img
        src={s.previewUrl}
        alt={`Screenshot ${i + 1}`}
        className="object-cover w-full h-full cursor-pointer"
        onClick={() => setExpandedImage(s.previewUrl)}
      />
      <button
        type="button"
        className="absolute top-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1"
        onClick={() => removeScreenshot(i)}
      >
        ×
      </button>
    </div>
  ))}
</div>
{expandedImage && (
  <div
    className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
    onClick={() => setExpandedImage(null)}
  >
    <img src={expandedImage} alt="Expanded screenshot" className="max-w-full max-h-full" />
  </div>
)}



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
