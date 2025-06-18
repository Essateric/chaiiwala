import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

export function useJobLogComments(logId) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("joblog_comments")
      .select("id, comment, created_at, profiles(name)")
      .eq("joblog_id", logId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to load comments:", error.message);
    } else {
      setComments(data);
    }
    setLoading(false);
  };

  const addComment = async (userId, comment, name = "Unknown") => {
    const { error } = await supabase.from("joblog_comments").insert([
      {
        joblog_id: logId,
        comment,
        user_id: userId,
      },
    ]);

    if (error) {
      console.error("Failed to add comment:", error.message);
    } else {
      await fetchComments(); // Refresh after adding
    }
  };

  useEffect(() => {
    if (logId) {
      fetchComments();
    }
  }, [logId]);

  return { comments, loading, addComment };
}
