import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { useAuth } from "../../hooks/UseAuth.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card.jsx";
import { Button } from "../../components/ui/button.jsx";

// Minimal notification card
function NotificationCard({ id, title, content, date, isRead, author, onMarkRead }) {
  return (
    <Card className={`mb-2 ${isRead ? "bg-white" : "bg-yellow-50"}`}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <div className="text-xs text-gray-400 flex gap-2">
          {author && <span>By {author}</span>}
          <span>{new Date(date).toLocaleString()}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm">{content}</div>
        {!isRead && (
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => onMarkRead(id)}
          >
            Mark as Read
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function NotificationPanel() {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch profiles for author lookup
  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, name")
      .then(({ data }) => setProfiles(data || []));
  }, []);

  // 2. Fetch notifications (only unread; change as needed)
  useEffect(() => {
    if (!profile?.id) return;
    setLoading(true);
    supabase
      .from("notifications")
      .select("*, announcements(title, content, from_user)")
      .eq("user_id", profile.id)
      .eq("is_read", false) // Only unread notifications!
      // To see ALL notifications, comment ↑ and uncomment ↓
      // .order("is_read", { ascending: true }) // unread first
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        setNotifications(data || []);
        setLoading(false);
        if (error) {
          console.error("Supabase error:", error);
        }
      });
  }, [profile?.id]);

  // 3. Handle marking as read
  const handleMarkAsRead = async (notificationId) => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, is_read: true } : n
      )
    );
  };

  // Helper to look up author's name by from_user id
  function getAuthorName(from_user) {
    if (!from_user) return "Head Office";
    const author = profiles.find((p) => p.id === from_user);
    return author?.name || "Head Office";
  }

  // UI states
  if (!profile?.id) {
    return <div className="p-4 text-gray-400">Sign in to see notifications.</div>;
  }
  if (loading) {
    return <div className="p-4 text-gray-400">Loading notifications...</div>;
  }
  if (!notifications.length) {
    return <div className="p-4 text-gray-400">No notifications yet.</div>;
  }

  return (
    <div className="p-2">
      {notifications.map((n) => (
        <NotificationCard
          key={n.id}
          id={n.id}
          title={n.announcements?.title || "Announcement"}
          content={n.announcements?.content || ""}
          date={n.created_at}
          isRead={n.is_read}
          author={getAuthorName(n.announcements?.from_user)}
          onMarkRead={handleMarkAsRead}
        />
      ))}
    </div>
  );
}
