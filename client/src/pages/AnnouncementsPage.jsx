import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectTrigger, SelectItem, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/UseAuth";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import AnnouncementCard from "@/components/announcements/announcement-card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
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

  // Store and roles data
  const { data: stores = [] } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const res = await fetch("/api/stores");
      return res.json();
    },
  });

  // Get roles dynamically from users
  const [roles, setRoles] = useState([]);
  useEffect(() => {
    setRoles([
      ...Array.from(new Set(users.map(u => u.permissions).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b))
    ]);
  }, [users]);

  // --- Fetch all users for mentions and dropdowns ---
  useEffect(() => {
    async function fetchUsers() {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, permissions, store_ids");
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

  // -------------- Fetch Announcements --------------
  async function fetchAnnouncements() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setAnnouncements(data || []);
    setIsLoading(false);
  }

  useEffect(() => { fetchAnnouncements(); }, []);

  // ------------- Store Manager Logic --------------
  const isStoreManager = profile?.permissions === "store";
  const managerStoreIds = Array.isArray(profile?.store_ids) ? profile.store_ids : [];

  // ------------- Announcement Creation Handler -------------
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

    // 6. Prepare insert data
    // If store manager, only target their own store(s)
    let announcementStoreIds =
      isStoreManager
        ? managerStoreIds.map(String)
        : (targetStore === "all" ? [] : [String(targetStore)]);

    const insertData = {
      title,
      content: message,
      from_user: profile?.id,
      target_role: targetRole === "all" ? null : targetRole,
      target_store_ids: announcementStoreIds,
      target_user_ids: allTargetUserIds,
      important: !!important,
    };

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

      // ------------ Notifications Logic ------------
      const newAnnouncement = newAnnouncementArr?.[0];
      if (newAnnouncement && users.length) {
        let usersToNotify = [];

        // ADMIN/REGIONAL/AREA: Notify everyone (except self)
        if (["admin", "regional", "area"].includes(profile?.permissions)) {
          usersToNotify = users.filter(u => u.id !== profile.id);
        }
        // STORE MANAGER: Only notify people in own store(s), except self
        else if (isStoreManager) {
          usersToNotify = users.filter(u =>
            Array.isArray(u.store_ids) &&
            u.store_ids.some(id => managerStoreIds.includes(id)) &&
            u.id !== profile.id
          );
        }
        // Else, use targeting (manual/mentions/role/store)
        if (!usersToNotify.length) {
          // 1. Start with explicit user mentions/manual select
          if (allTargetUserIds.length > 0) {
            usersToNotify = users.filter(u => allTargetUserIds.includes(u.id) && u.id !== profile.id);
          }
          // 2. Add users by role (if not "all")
          else if (targetRole !== "all") {
            usersToNotify = users.filter(u => u.permissions === targetRole && u.id !== profile.id);
          }
          // 3. Add users by store (if not "all")
          else if (targetStore !== "all") {
            usersToNotify = users.filter(u =>
              Array.isArray(u.store_ids) && u.store_ids.includes(Number(targetStore)) && u.id !== profile.id
            );
          }
          // 4. If no targeting, notify everyone except sender
          else {
            usersToNotify = users.filter(u => u.id !== profile.id);
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
      // ------------ End Notifications Logic ------------
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
      (a.target_role === "all" || a.target_role === profile?.permissions) &&
      ((a.target_store_ids?.length === 0) || (profile?.store_ids?.some(id => a.target_store_ids.includes(id)))) &&
      ((a.target_user_ids?.length === 0) || getTargetUserIds(a.target_user_ids).includes(profile?.id))
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Role dropdown */}
                  <Select value={targetRole} onValueChange={setTargetRole} disabled={isStoreManager}>
                    <SelectTrigger><SelectValue placeholder="Target role (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {roles.map(role => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Store dropdown */}
                  <Select
                    value={isStoreManager ? (managerStoreIds[0]?.toString() || "all") : targetStore}
                    onValueChange={setTargetStore}
                    disabled={isStoreManager}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Target store (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {isStoreManager ? (
                        stores
                          .filter(s => managerStoreIds.includes(s.id))
                          .map(s => (
                            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                          ))
                      ) : (
                        <>
                          <SelectItem value="all">All Stores</SelectItem>
                          {stores.map(s => (
                            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  {/* User dropdown */}
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
