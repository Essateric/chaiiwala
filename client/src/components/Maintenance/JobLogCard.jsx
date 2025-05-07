import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, User } from "lucide-react";
import { useAuth } from "@/hooks/UseAuth";
import { useJobLogComments } from "@/hooks/useJobLogComments";
import { supabase } from "@/lib/supabaseClient";
import { MentionsInput, Mention } from "react-mentions";

export default function JobLogCard({ log }) {
  const [open, setOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const { user } = useAuth();
  const { comments, addComment, loading } = useJobLogComments(log.id);
  const [staffList, setStaffList] = useState([]);

  useEffect(() => {
    const fetchStaff = async () => {
      const { data, error } = await supabase.from("users").select("id, name");
      if (!error) {
        setStaffList(data.map((u) => ({ id: u.id, display: u.name })));
      }
    };
    fetchStaff();
  }, []);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!user?.id || !newComment.trim()) return;
    await addComment(user.id, newComment);
    setNewComment("");
  };

  let displayDate = "Unknown date";
  try {
    const parsed = new Date(`${log.logDate} ${log.logTime}`);
    if (!isNaN(parsed)) {
      displayDate = format(parsed, "d MMM yyyy, h:mmaaa");
    }
  } catch {}

  const hasImage = Array.isArray(log.ImageUpload) && log.ImageUpload.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="cursor-pointer border rounded shadow hover:border-chai-gold">
          {hasImage && (
            <img
              src={log.ImageUpload[0]}
              className="h-32 w-full object-cover rounded-t"
              alt="Job Preview"
            />
          )}
          <div className="p-4 space-y-1 text-sm">
            <p className="font-semibold truncate">{log.title}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
              {displayDate}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              {log.loggedBy || "Unknown"}
            </div>
            <Badge variant="outline" className="capitalize">
              {log.flag.replace("_", " ")}
            </Badge>
          </div>
        </div>
      </DialogTrigger>

      <DialogContent className="max-w-3xl w-full sm:max-w-[90%] md:max-w-2xl overflow-y-auto max-h-[90vh]">
        <DialogTitle>{log.title}</DialogTitle>
        <DialogDescription>
          Logged on {displayDate} by {log.loggedBy || "Unknown"}
        </DialogDescription>

        {hasImage && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-4">
            {log.ImageUpload.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Job Image ${i + 1}`}
                className="w-full max-h-40 object-cover rounded"
              />
            ))}
          </div>
        )}

        <p className="text-sm whitespace-pre-wrap mb-4">{log.description}</p>

        <div className="text-xs text-muted-foreground space-y-1 mb-4">
          <p>
            <strong>Category:</strong> {log.category}
          </p>
          <p>
            <strong>Priority:</strong> {log.flag.replace("_", " ")}
          </p>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold text-sm mb-1">Comments</h3>
          <div className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading comments...</p>
            ) : comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="bg-yellow-600 rounded p-2 text-sm text-white">
                  <p>{c.comment}</p>
                  <div className="text-xs mt-1 opacity-80">
                    <strong>{c.users?.name || "Unknown"}:</strong>{" "}
                    {format(new Date(c.created_at), "d MMM yyyy, h:mmaaa")}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <form onSubmit={handleAddComment} className="space-y-2">
          <MentionsInput
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="mentions-input w-full border rounded p-2 text-sm"
            placeholder="Add a comment and tag someone using @"
          >
            <Mention
              trigger="@"
              data={staffList}
              displayTransform={(id, display) => `@${display}`}
              className="mention"
            />
          </MentionsInput>

          <Button size="sm" type="submit">
            Add Comment
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
