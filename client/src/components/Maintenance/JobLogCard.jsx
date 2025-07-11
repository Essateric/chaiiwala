import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog.jsx";
import { Button } from "../../components/ui/button.jsx";
import { Badge } from "../../components/ui/badge.jsx";
import { CalendarDays, User } from "lucide-react";
import { useAuth } from "../../hooks/UseAuth.jsx";
import { supabase } from "../../lib/supabaseClient.js";
import { MentionsInput, Mention } from "react-mentions";
import { useJobLogs } from "../../hooks/use-joblogs.jsx";
import { useJobLogComments } from "../../hooks/useJobLogComments.jsx";
import { useQueryClient } from "@tanstack/react-query";

export default function JobLogCard({ log }) {
  if (!log || typeof log !== "object") return null;

  const [open, setOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const { user, profile } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const { comments, addComment, loading } = useJobLogComments(log.id);
  const { refetch: refetchJobLogs } = useJobLogs();
  const queryClient = useQueryClient();

  // --------- Edit/delete state ---------
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ title: log.title, description: log.description });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchStaff = async () => {
      const { data, error } = await supabase.from("profiles").select("id, name");
      if (!error && Array.isArray(data)) {
        setStaffList(data.map((u) => ({ id: u.id, display: u.name })));
      }
    };
    fetchStaff();
  }, []);

  // Update edit fields if log changes
  useEffect(() => {
    setEditData({ title: log.title, description: log.description });
  }, [log.title, log.description]);

  const isUrgent = log.flag === "urgent" || log.priority === "urgent";

  const getAllowedNextStatuses = (currentStatus, role) => {
    if (role === "admin") {
      if (currentStatus === "pending") return ["approved", "in_progress", "completed"];
      if (currentStatus === "approved") return ["in_progress", "completed"];
      if (currentStatus === "in_progress") return ["completed"];
    }
    if (role === "regional") {
      if (currentStatus === "pending") return ["approved"];
      if (currentStatus === "approved") return ["in_progress", "completed"];
      if (currentStatus === "in_progress") return ["completed"];
    }
    if (role === "maintenance") {
      if (currentStatus === "approved") return ["in_progress"];
      if (currentStatus === "in_progress") return ["completed"];
    }
    return [];
  };

  const handleStatusChange = async (newStatus) => {
    if (!log?.id) {
      console.error("Missing log ID");
      return;
    }
    const { error } = await supabase
      .from("joblogs")
      .update({ status: newStatus })
      .eq("id", log.id);
    if (error) {
      alert("Failed to update status: " + error.message);
    } else {
      setOpen(false);
      await refetchJobLogs();
    }
  };

  let displayDate = "Unknown date";
  try {
    const parsed = new Date(`${log.logDate} ${log.logTime}`);
    if (!isNaN(parsed)) {
      displayDate = format(parsed, "d MMM yyyy, h:mmaaa");
    }
  } catch {}

  const hasImage = Array.isArray(log?.ImageUpload) && log.ImageUpload.length > 0;
  const allowedStatuses = getAllowedNextStatuses(log.status, profile?.permissions);

  // THIS IS WHERE YOU DISPLAY THE STORE DETAILS FROM THE JOINED OBJECT
  const store = log.stores && typeof log.stores === "object" ? log.stores : null;

  // ----- Edit/Save logic -----
  const handleEditChange = (key, value) => {
    setEditData((prev) => ({ ...prev, [key]: value }));
  };

  const handleEditSave = async () => {
    if (!editData.title.trim() || !editData.description.trim()) return;
    const { error } = await supabase
      .from("joblogs")
      .update({
        title: editData.title,
        description: editData.description,
      })
      .eq("id", log.id);
    if (error) {
      alert("Failed to update: " + error.message);
    } else {
      setEditing(false);
      await refetchJobLogs(); // Refresh!
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this maintenance ticket?")) return;
    setDeleting(true);
    const { error } = await supabase.from("joblogs").delete().eq("id", log.id);
    if (error) {
      alert("Failed to delete: " + error.message);
    } else {
      setOpen(false);
      await refetchJobLogs();
    }
    setDeleting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div
          className={`relative cursor-pointer border rounded shadow hover:border-chai-gold
            ${isUrgent ? " bg-red-200" : ""}`}
        >
          {hasImage && (
            <img
              src={log.ImageUpload[0]}
              className="h-32 w-full object-cover rounded-t"
              alt="Job Preview"
            />
          )}
          {isUrgent && (
            <Badge className="bg-red-600 text-white absolute top-2 right-2 z-10">
              Urgent
            </Badge>
          )}

          <div className="p-4 space-y-1 text-sm">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Logged for:</span>
              <span className="font-bold">
                {store
                  ? `${store.store_code || ""}${store.name ? ` (${store.name})` : ""}`
                  : log.storeId || "Unknown"}
              </span>
            </div>
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
              {log.status ? log.status.replace("_", " ") : "pending"}
            </Badge>
          </div>
        </div>
      </DialogTrigger>

      <DialogContent className="max-w-3xl w-full sm:max-w-[90%] md:max-w-2xl overflow-y-auto max-h-[90vh]">
        {/* ---- Pending: Edit/Delete buttons ---- */}
        {log.status === "pending" && !editing && (
          <div className="flex gap-2 mb-4">
            <Button size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        )}

        {/* ---- Edit Form ---- */}
        {editing ? (
          <div className="space-y-2 mb-4">
            <label className="block font-bold">Title</label>
            <input
              className="border rounded w-full p-2"
              value={editData.title}
              onChange={e => handleEditChange("title", e.target.value)}
              maxLength={100}
              disabled={deleting}
            />
            <label className="block font-bold">Description</label>
            <textarea
              className="border rounded w-full p-2"
              rows={3}
              value={editData.description}
              onChange={e => handleEditChange("description", e.target.value)}
              maxLength={1000}
              disabled={deleting}
            />
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={handleEditSave} disabled={deleting}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={deleting}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DialogTitle>{log.title}</DialogTitle>
            <DialogDescription>
              Logged on {displayDate} by {log.loggedBy || "Unknown"}
            </DialogDescription>
          </>
        )}

        {/* Show rest of details if NOT editing */}
        {!editing && (
          <>
            {hasImage && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-4">
                {log.ImageUpload.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                    title="Click to view full size"
                  >
                    <img
                      src={url}
                      alt={`Job Image ${i + 1}`}
                      className="w-full max-h-40 object-cover rounded cursor-zoom-in hover:scale-105 transition-transform"
                    />
                  </a>
                ))}
              </div>
            )}

            <p className="text-sm whitespace-pre-wrap mb-4">{log.description}</p>

            {log.initial_comment && (
              <div className="mb-4">
                <h3 className="font-semibold text-sm mb-1">Initial Comment</h3>
                <p className="text-sm whitespace-pre-wrap bg-muted rounded p-2">
                  {log.initial_comment}
                </p>
              </div>
            )}

            <div className="text-xs text-muted-foreground space-y-1 mb-4">
              <p>
                <strong>Category:</strong> {log.category}
              </p>
              <p>
                <strong>Priority:</strong> {log.flag?.replace("_", " ")}
              </p>
            </div>

            {allowedStatuses.length > 0 && (
              <div className="mt-2 text-xs mb-4">
                <strong>Change Status:</strong>{" "}
                {allowedStatuses.map((nextStatus) => (
                  <button
                    key={nextStatus}
                    onClick={() => handleStatusChange(nextStatus)}
                    className="underline text-blue-600 hover:text-blue-800 mr-2"
                  >
                    Mark as {nextStatus.replace("_", " ")}
                  </button>
                ))}
              </div>
            )}

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
                        <strong>{c.profiles?.name || c.commenter_name || "Unknown"}:</strong>{" "}
                        {format(new Date(c.created_at), "d MMM yyyy, h:mmaaa")}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!user?.id || !newComment.trim()) return;
              const commenterName = profile?.name || user?.email || "Unknown User";
              await addComment(user.id, newComment, commenterName);
              setNewComment("");
            }} className="space-y-2">
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
