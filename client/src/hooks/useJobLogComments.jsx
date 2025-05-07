import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient"; // make sure this path is correct

export function useJobLogComments(joblogId) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("joblog_comments")
      .select("*, users(name)")
      .eq("joblog_id", joblogId)
      .order("created_at", { ascending: true });

    if (!error) {
      setComments(data);
    } else {
      console.error("❌ Error fetching comments:", error);
    }

    setLoading(false);
  };

  const addComment = async (authId, commentText, commenterName) => {
    const { error } = await supabase.from("joblog_comments").insert([
      {
        joblog_id: joblogId,
        user_auth_id: authId,
        comment: commentText,
        commenter_name: commenterName,
      },
    ]);

    if (error) {
      console.error("❌ Error adding comment:", error);
    } else {
      await fetchComments();
    }
  };

  useEffect(() => {
    if (joblogId) fetchComments();
  }, [joblogId]);

  return { comments, loading, addComment };
}
