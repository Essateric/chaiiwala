import DashboardLayout from "../components/layout/DashboardLayout.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.jsx";
import { Button } from "../components/ui/button.jsx";
import { Input } from "../components/ui/input.jsx";
import { Select, SelectContent, SelectTrigger, SelectItem, SelectValue } from "../components/ui/select.jsx";
import { useAuth } from "../hooks/UseAuth.jsx";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import AnnouncementCard from "../components/announcements/announcement-card.jsx";
import { useToast } from "../hooks/use-toast.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { MentionsInput, Mention } from "react-mentions";

// Helper for handling target_user_ids field
function getTargetUserIds(field) {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  if (typeof field === "string") {
    try { return JSON.parse(field); } catch { return []; }
  }
  return [];
}

export default function AnnouncementsPage() {
  const { user, profile, isLoading: isLoadingAuth } = useAuth();
  const { toast } = useToast();

  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [targetRole, setTargetRole] = useState("all");
  const [targetStore, setTargetStore] = useState("all");
  const [targetUser, setTargetUser] = useState("all");
  const [title, setTitle] = useState("");
  const [important, setImportant] = useState(false);

  const [filterUserId, setFilterUserId] = useState("all");
  const [users, setUsers] = useState([]);
  const [mentionUsers, setMentionUsers] = useState([]);

  // Roles from your permissions
  const roles = [
    { name: "admin", label: "Administrator" },
    { name: "regional", label: "Regional Manager" },
    { name: "area", label: "Area Manager" },
    { name: "store", label: "Store Manager" },
    { name: "staff", label: "Staff" }
  ];

  const { data: stores = [] } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const res = await fetch("/api/stores");
      return res.json();
    },
  });

  // 1. Lock dropdowns for store managers and set targeting automatically
  useEffect(() => {
    if (profile?.permissions === "store" && Array.isArray(profile.store_ids) && profile.store_ids.length) {
      setTargetStore(String(profile.store_ids[0]));
      setTargetRole("store");
      setTargetUser("all");
    }
  }, [profile]);

  useEffect(() => {
    async function fetchUsers() {
      const { data } = await supabase
        .from("profiles")
        .select("id, name, first_name, last_name, email, permissions, store_ids");
      if (data) {
        setUsers(data);
        setMentionUsers(
          data
            .filter(u => u.name)
            .map(u => ({
              id: u.id,
              display: u.name,
            }))
        );
      }
    }
    fetchUsers();
  }, []);

  const canSend = ["admin", "regional", "area", "store"].includes(profile?.permissions);
  const showAllMentions = ["admin", "regional", "area", "store"].includes(profile?.permissions);

  const filteredMentionUsers = showAllMentions
    ? mentionUsers
    : mentionUsers.filter(u => u.id === profile?.id);

  async function fetchAnnouncements() {
    setIsLoading(true);
    // Fetch the author name by joining with profiles
    const { data, error } = await supabase
      .from("announcements")
      .select(`
        *,
        profiles:from_user (name, first_name, last_name)
      `)
      .order("created_at", { ascending: false });
    if (!error) setAnnouncements(data || []);
    setIsLoading(false);
  }

  useEffect(() => { fetchAnnouncements(); }, []);

  // --------------------------
  // Announcement creation handler
  // --------------------------
  async function handleCreate(e) {
    e.preventDefault();
    if (!title || !message) {
      toast({ title: "Title and message required", variant: "destructive" });
      return;
    }
    setIsCreating(true);

    // 1. Extract all @names (case-insensitive)
    const mentionedNames = Array.from(
      message.matchAll(/@([a-zA-Z ]+)/g),
      m => m[1].trim().toLowerCase()
    );
    // 2. Map mentionUsers to [{id, display}]
    const allUsers = mentionUsers.map(u => ({
      id: u.id,
      display: u.display?.toLowerCase().trim()
    }));
    // 3. Find all user IDs for the @mentions
    const taggedUserIds = allUsers
      .filter(u => mentionedNames.includes(u.display))
      .map(u => u.id);
    // 4. Also include any manually selected user (from dropdown)
    const manualUserIds = targetUser === "all" ? [] : [String(targetUser)];
    // 5. Remove duplicates (Set)
    const allTargetUserIds = Array.from(new Set([...manualUserIds, ...taggedUserIds]));

    // 6. Prepare insert data, lock for store manager
    let effectiveTargetStoreIds = [];
    let effectiveTargetRole = targetRole === "all" ? null : [targetRole]; // always as array or null!
    let effectiveTargetUserIds = allTargetUserIds;

    // ---- TYPE FIX: Make sure store ids are integer[] and role is text[] ----
    if (profile.permissions === "store") {
      effectiveTargetStoreIds =
        Array.isArray(profile.store_ids) && profile.store_ids.length > 0
          ? profile.store_ids.map(Number)
          : [];
      effectiveTargetRole = ["store"]; // always array!
      effectiveTargetUserIds = [];
    } else {
      effectiveTargetStoreIds = targetStore === "all" ? [] : [Number(targetStore)];
    }

    // --- DEBUG: you can remove these logs ---
    //console.log("InsertData", { target_store_ids: effectiveTargetStoreIds, typeofTargetStore: typeof effectiveTargetStoreIds[0], effectiveTargetRole });

    const insertData = {
      title,
      content: message,
      from_user: profile?.id,
      target_role: effectiveTargetRole,   // always array or null
      target_store_ids: effectiveTargetStoreIds, // always array of numbers
      target_user_ids: effectiveTargetUserIds,   // always array of uuids
      important: !!important,
    };

    //console.log("InsertData", insertData);

    // 7. Save to Supabase (announcements)
    const { data: newAnnouncementArr, error: announcementError } = await supabase
      .from("announcements")
      .insert([insertData])
      .select();
    setIsCreating(false);

    if (announcementError) {
      toast({ title: "Error", description: announcementError.message, variant: "destructive" });
    } else {
      toast({ title: "Announcement Sent", variant: "success" });
      setTitle("");
      setMessage("");
      setTargetRole("all");
      setTargetStore("all");
      setTargetUser("all");
      setImportant(false);
      fetchAnnouncements();

      // ----------------------
      // NEW: Insert notifications
      // ----------------------
      const newAnnouncement = newAnnouncementArr?.[0];
      if (newAnnouncement && users.length) {
        // Find users to notify (all relevant, no duplicates)
        let usersToNotify = [];

        if (profile.permissions === "store") {
          // Store manager: ONLY users in their store(s)
          usersToNotify = users.filter(
            u =>
              u.permissions === "store" &&
              u.store_ids &&
              u.store_ids.some(id => effectiveTargetStoreIds.includes(Number(id)))
          );
        } else {
          // Admin/area/regional: all users for all, or filtered by dropdowns
          if (allTargetUserIds.length > 0) {
            usersToNotify = users.filter(u => allTargetUserIds.includes(u.id));
          }
          if (targetRole !== "all") {
            usersToNotify = [
              ...usersToNotify,
              ...users.filter(u => u.permissions === targetRole)
            ];
          }
          if (targetStore !== "all") {
            usersToNotify = [
              ...usersToNotify,
              ...users.filter(
                u =>
                  Array.isArray(u.store_ids) &&
                  u.store_ids.includes(Number(targetStore))
              )
            ];
          }
          if (
            allTargetUserIds.length === 0 &&
            targetRole === "all" &&
            targetStore === "all"
          ) {
            usersToNotify = [...users];
          }
        }

        // Remove duplicates
        usersToNotify = Array.from(new Set(usersToNotify.map(u => u.id)))
          .map(id => users.find(u => u.id === id));

        // Insert notification row for each user
        const notificationsToInsert = usersToNotify.map(u => ({
          user_id: u.id,
          announcement_id: newAnnouncement.id,
          is_read: false,
          created_at: new Date().toISOString(),
        }));

        if (notificationsToInsert.length) {
          await supabase.from("notifications").insert(notificationsToInsert);
        }
      }
    }
  }

  // User filter for announcement list
  let filteredAnnouncements = announcements;
  if (filterUserId !== "all") {
    filteredAnnouncements = announcements.filter(a => {
      const ids = getTargetUserIds(a.target_user_ids);
      return ids.includes(filterUserId);
    });
  }

  // Normal user visibility logic (for non-senders)
  let visibleAnnouncements = filteredAnnouncements;
  if (!canSend) {
    visibleAnnouncements = filteredAnnouncements.filter(a =>
      (a.target_role === null || (Array.isArray(a.target_role) && a.target_role.includes(profile?.permissions))) &&
      ((a.target_store_ids?.length === 0) || (profile?.store_ids?.some(id => a.target_store_ids.includes(Number(id))))) &&
      ((a.target_user_ids?.length === 0) || getTargetUserIds(a.target_user_ids).includes(profile?.id))
    );
  }

  // Utility to get author's display name from profiles join
  function getAuthorName(a) {
    return (
      a?.profiles?.name ||
      [a?.profiles?.first_name, a?.profiles?.last_name].filter(Boolean).join(" ") ||
      "Head Office"
    );
  }

  if (isLoadingAuth) {
    return (
      <DashboardLayout title="Announcements">
        <div className="max-w-xl mx-auto py-16 flex items-center justify-center text-muted-foreground">
          Loading profile...
        </div>
      </DashboardLayout>
    );
  }
  if (!profile) {
    return (
      <DashboardLayout title="Announcements">
        <div className="max-w-xl mx-auto py-16 text-center text-red-500">
          Could not load profile. Please refresh or contact support.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Announcements">
      <div className="max-w-xl mx-auto">

        {/* Announcement Creation Form */}
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
                <MentionsInput
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Type your message and use @ to tag users..."
                  className="border p-2 rounded w-full"
                  style={{ minHeight: 80 }}
                >
                  <Mention
                    trigger="@"
                    data={filteredMentionUsers}
                    markup="@__display__"
                    style={{ backgroundColor: "#DCF7C5", fontWeight: 500 }}
                  />
                </MentionsInput>
                {/* Only show targeting selects if NOT a store manager */}
                {profile.permissions !== "store" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Select value={targetRole} onValueChange={setTargetRole}>
                      <SelectTrigger><SelectValue placeholder="Target role (optional)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        {roles.map(role => (
                          <SelectItem key={role.name} value={role.name}>{role.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={targetStore} onValueChange={setTargetStore}>
                      <SelectTrigger><SelectValue placeholder="Target store (optional)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Stores</SelectItem>
                        {stores.map(store => (
                          <SelectItem key={store.id} value={String(store.id)}>{store.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={targetUser} onValueChange={setTargetUser}>
                      <SelectTrigger><SelectValue placeholder="Target user (optional)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        {users.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
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
                author={getAuthorName(a)}
                date={new Date(a.created_at)}
                category={Array.isArray(a.target_role) && a.target_role.length ? a.target_role.join(", ") : "All"}
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
