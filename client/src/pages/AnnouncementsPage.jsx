import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectTrigger, SelectItem, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/UseAuth";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import AnnouncementCard from "@/components/announcements/announcement-card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

export default function AnnouncementsPage() {
  const { profile, user } = useAuth();
  const { toast } = useToast();

  // Announcements, users, stores state
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [message, setMessage] = useState("");
  const [targetRole, setTargetRole] = useState("all");
  const [targetStore, setTargetStore] = useState("all");
  const [targetUser, setTargetUser] = useState("all");
  const [title, setTitle] = useState("");
  const [important, setImportant] = useState(false);

  // Users and stores queries
  const { data: users = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      return res.json();
    },
  });
  const { data: stores = [] } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const res = await fetch("/api/stores");
      return res.json();
    },
  });

  // Only allow these roles to send
  const canSend = ["admin", "regional", "area"].includes(profile?.permissions);

  // Fetch announcements from Supabase directly
  async function fetchAnnouncements() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setAnnouncements(data || []);
    setIsLoading(false);
  }

  // Fetch on mount
  useState(() => { fetchAnnouncements(); }, []); // Use useEffect if warning

async function handleCreate(e) {
  e.preventDefault();
  if (!title || !message) {
    toast({ title: "Title and message required", variant: "destructive" });
    return;
  }
  setIsCreating(true);

  const insertData = {
    title,
    content: message,
    from_user: user?.id,
    target_role: targetRole === "all" ? null : targetRole, // null if All
    target_store_ids: targetStore === "all" ? [] : [parseInt(targetStore, 10)], // array of ints
    target_user_ids: targetUser === "all" ? [] : [targetUser], // array of uuids/texts
    important: !!important,
  };
  // Remove any fields not in your table!
  // If target_role is NOT nullable, use "all" or ""
  // If target_store_ids is not array, adjust
  // If from_user must be uuid, make sure it is

  const { error } = await supabase.from("announcements").insert([insertData]);
  setIsCreating(false);

  if (error) {
    toast({ title: "Error", description: error.message, variant: "destructive" });
  } else {
    toast({ title: "Announcement Sent", variant: "success" });
    setTitle("");
    setMessage("");
    setTargetRole("all");
    setTargetStore("all");
    setTargetUser("all");
    setImportant(false);
    fetchAnnouncements();
  }
}


  // Filter for current user if not canSend
  let visibleAnnouncements = announcements;
  if (!canSend) {
    visibleAnnouncements = announcements.filter(a =>
      (a.target_role === "all" || a.target_role === profile?.permissions) &&
      ((a.target_store_ids?.length === 0) || (profile?.store_ids?.some(id => a.target_store_ids.includes(id)))) &&
      ((a.target_user_ids?.length === 0) || a.target_user_ids.includes(profile?.id))
    );
  }

  return (
    <DashboardLayout title="Announcements">
      <div className="max-w-xl mx-auto">
        {canSend && (
          <form className="space-y-4 mb-10" onSubmit={handleCreate}>
            <Card>
              <CardHeader>
                <CardTitle>Create Announcement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />
                <Textarea
                  placeholder="Message"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  required
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Select value={targetRole} onValueChange={setTargetRole}>
                    <SelectTrigger><SelectValue placeholder="Target role (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="store">Store Manager</SelectItem>
                      <SelectItem value="area">Area Manager</SelectItem>
                      <SelectItem value="regional">Regional</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={targetStore} onValueChange={setTargetStore}>
                    <SelectTrigger><SelectValue placeholder="Target store (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stores</SelectItem>
                      {stores.map(s => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={targetUser} onValueChange={setTargetUser}>
                    <SelectTrigger><SelectValue placeholder="Target user (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={important} onChange={() => setImportant(v => !v)} />
                    Mark as Important
                  </label>
                </div>
                <Button type="submit" disabled={isCreating} className="w-full bg-chai-gold hover:bg-yellow-600">
                  {isCreating ? "Sending..." : "Send Announcement"}
                </Button>
              </CardContent>
            </Card>
          </form>
        )}

        <h2 className="font-semibold text-lg mb-2">Announcements</h2>
        <div className="space-y-4">
          {isLoading ? (
            <div>Loading...</div>
          ) : visibleAnnouncements.length === 0 ? (
            <div className="text-gray-500 p-6 text-center">No announcements</div>
          ) : (
            visibleAnnouncements.map(a => (
              <AnnouncementCard
                key={a.id}
                id={a.id}
                title={a.title}
                content={a.content}
                author={a.author_name || "Head Office"}
                date={new Date(a.created_at)}
                category={a.target_role || "All"}
                important={!!a.important}
                likes={a.likes || 0}
                onLike={() => {}}
              />
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
