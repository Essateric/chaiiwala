// src/components/support/CommentsSection.jsx
import React, { useState, useEffect } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useAuth } from "../../hooks/UseAuth.jsx";

export default function CommentsSection({ ticketId }) {
  const supabase = useSupabaseClient();
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch comments
  useEffect(() => {
    async function fetchComments() {
      const { data } = await supabase
        .from("support_ticket_comments")
        .select("*, profiles!inner(first_name)")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      setComments(data || []);
    }
    if (ticketId) fetchComments();
  }, [supabase, ticketId]);

  // Add new comment and notify ticket creator
  async function handleAddComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setLoading(true);

    // 1. Insert the comment
    const { error } = await supabase
      .from("support_ticket_comments")
      .insert([{
        ticket_id: ticketId,
        user_id: user.id,
        comment: commentText,
      }]);

    setLoading(false);
    setCommentText("");

    if (!error) {
      // 2. Fetch ticket creator's user_id
      const { data: ticket } = await supabase
        .from("support_tickets")
        .select("user_id")
        .eq("id", ticketId)
        .single();

      // 3. If commenter is NOT the creator, insert notification
      if (ticket && ticket.user_id && ticket.user_id !== user.id) {
        await supabase.from("notifications").insert([{
          user_id: ticket.user_id,
          message: "💬 New comment on your support ticket.",
          link: `/support/ticket/${ticketId}`,
          created_at: new Date().toISOString()
        }]);
      }

      // 4. Re-fetch comments
      const { data } = await supabase
        .from("support_ticket_comments")
        .select("*, profiles!inner(first_name)")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      setComments(data || []);
    }
  }

  return (
    <div className="mt-4 border-t pt-3">
      <h4 className="font-semibold mb-2">Comments</h4>
      <div className="space-y-2 mb-3">
        {comments.length === 0 && <div className="text-gray-500 text-sm">No comments yet.</div>}
        {comments.map(c => (
          <div key={c.id} className="border-b pb-2 mb-1">
            <div className="font-bold text-xs">{c.profiles?.first_name || "User"}</div>
            <div className="text-sm">{c.comment}</div>
            <div className="text-gray-400 text-xs">{new Date(c.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
      <form onSubmit={handleAddComment} className="flex space-x-2">
        <input
          className="flex-1 border rounded px-2 py-1 text-sm"
          placeholder="Add a comment…"
          value={commentText}
          onChange={e => setCommentText(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          className="bg-yellow-700 text-white px-3 py-1 rounded"
          disabled={loading}
        >
          {loading ? "Adding..." : "Add"}
        </button>
      </form>
    </div>
  );
}
