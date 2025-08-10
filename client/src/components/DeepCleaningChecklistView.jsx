import React, { useEffect, useMemo, useState } from "react";
import { startOfDay, endOfDay, format, addDays } from "date-fns";
import { CheckCircle2, Circle, Plus, Loader2, ChevronLeft, ChevronRight, Calendar as CalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import DeepCleaningFormComponent from "@/components/DeepCleaningForm.jsx";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

export default function DeepCleaningChecklistView({ profile }) {
  const { toast } = useToast();
  const [stores, setStores] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedStore, setSelectedStore] = useState("auto");
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date())); // NEW
  const [isLoading, setIsLoading] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const isAdminOrRegional =
  profile?.permissions === "admin" || profile?.permissions === "regional";

const tasksByStore = React.useMemo(() => {
  if (!isAdminOrRegional || selectedStore !== "auto") return [];
  const map = new Map();
  for (const t of tasks) {
    const key = t.store_id;
    if (!map.has(key)) {
      map.set(key, { store_id: key, store_name: t.store_name || "Unknown", items: [] });
    }
    map.get(key).items.push(t);
  }
  // sort stores and tasks (pending first, then by time)
  return Array.from(map.values())
    .sort((a, b) => a.store_name.localeCompare(b.store_name))
    .map(group => ({
      ...group,
      items: group.items.sort((a, b) => {
        if (!!a.completed_at !== !!b.completed_at) return a.completed_at ? 1 : -1;
        return new Date(a.start) - new Date(b.start);
      })
    }));
}, [isAdminOrRegional, selectedStore, tasks]);

  

  // Load stores + task types once
  useEffect(() => {
    (async () => {
      const { data: storeRows } = await supabase.from("stores").select("id,name");
      setStores(storeRows || []);
      const { data: types } = await supabase.from("deep_cleaning_tasks").select("id,dc_task");
      setTaskTypes(types || []);
    })();
  }, []);

  // Resolved store logic
  const resolvedStoreId = useMemo(() => {
    if (profile?.permissions === "store") return profile.store_ids?.[0] ?? null;
    if (selectedStore === "auto") return null; // admin/regional → All stores
    return Number(selectedStore);
  }, [profile, selectedStore]);

  const visibleStores =
    profile?.permissions === "admin"
      ? stores
      : stores.filter(s => profile?.store_ids?.includes(s.id));

  const dayStart = startOfDay(selectedDate);
  const dayEnd = endOfDay(selectedDate);

  // Fetch tasks for the selected date
  const loadTasks = async () => {
    setIsLoading(true);
    let { data } = await supabase
      .from("deep_cleaning")
      .select("*")
      .gte("start", dayStart.toISOString())
      .lte("start", dayEnd.toISOString());

    data = data || [];

    if (profile?.permissions === "store") {
      data = data.filter(t => t.store_id === profile.store_ids?.[0]);
    } else if (resolvedStoreId) {
      data = data.filter(t => t.store_id === resolvedStoreId);
    }

    setTasks(data);
    setIsLoading(false);
  };

  useEffect(() => {
    if (profile) loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, resolvedStoreId, selectedDate]);

  const done = tasks.filter(t => !!t.completed_at).length;
  const total = tasks.length;

  const toggleComplete = async (task) => {
    const completed_at = task.completed_at ? null : new Date().toISOString();
    const { error } = await supabase.from("deep_cleaning").update({ completed_at }).eq("id", task.id);
    if (error) {
      toast({ title: "Error", description: "Could not update task.", variant: "destructive" });
      return;
    }
    setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, completed_at } : t)));
  };

  // Date navigation handlers
  const goPrev = () => setSelectedDate(d => addDays(d, -1));
  const goNext = () => setSelectedDate(d => addDays(d, 1));
  const goToday = () => setSelectedDate(startOfDay(new Date()));

  return (
    <div className="space-y-4">
      {/* Header / Filters */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Daily Store Deep Cleaning</h2>
            <p className="text-sm text-gray-300">
              {format(dayStart, "EEEE, MMM d yyyy")}
            </p>
            <p className="text-sm text-gray-300">
              <span className="font-medium">{done} of {total}</span> tasks
            </p>
          </div>

        {/* Right controls */}
          <div className="flex flex-col gap-2 items-stretch md:flex-row md:items-center">
            {/* Admin/Regional store filter */}
            {(profile?.permissions === "admin" || profile?.permissions === "regional") && (
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Choose store" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">All Stores</SelectItem>
                  {visibleStores.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Date controls */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goPrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <input
                type="date"
                className="flex h-9 w-[150px] rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={format(selectedDate, "yyyy-MM-dd")}
                onChange={(e) => setSelectedDate(new Date(e.target.value + "T00:00:00"))}
              />
              <Button variant="outline" size="sm" onClick={goNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToday}>
                <CalIcon className="h-4 w-4 mr-1" /> Today
              </Button>

              {/* Quick Add */}
              <Button className="bg-chai-gold hover:bg-yellow-600" onClick={() => setIsAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Task
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="rounded-lg bg-white p-2">
        {isLoading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading tasks…
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-4 text-sm text-gray-600">No tasks for this day.</div>
        ) : (
          <ul className="divide-y">
            {tasks
              .sort((a, b) => (a.anytime === b.anytime ? 0 : a.anytime ? 1 : -1))
              .map((t) => {
                const isDone = !!t.completed_at;
                const timeLabel = t.anytime
                  ? "Anytime"
                  : `${format(new Date(t.start), "HH:mm")} - ${format(new Date(t.end_time), "HH:mm")}`;
                return (
                  <li key={t.id} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {isDone ? <CheckCircle2 className="text-green-600 shrink-0" /> : <Circle className="text-gray-400 shrink-0" />}
                      <div className="min-w-0">
                        <div className={`text-sm font-medium ${isDone ? "line-through text-gray-400" : "text-gray-900"}`}>
                          {t.task}
                          {(profile?.permissions !== "store" && t.store_name) && (
                            <span className="ml-2 text-xs text-gray-500">— {t.store_name}</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{timeLabel}</div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant={isDone ? "outline" : "default"}
                      className={isDone ? "" : "bg-green-600 hover:bg-green-700"}
                      onClick={() => toggleComplete(t)}
                    >
                      {isDone ? "Undo" : "Mark Done"}
                    </Button>
                  </li>
                );
              })}
          </ul>
        )}
      </div>

      {/* Quick add (uses your shared form) */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Deep Cleaning Task</DialogTitle>
            <DialogDescription>
              Schedule for {format(selectedDate, "MMMM dd, yyyy")}
            </DialogDescription>
          </DialogHeader>
          <DeepCleaningFormComponent
            profile={profile}
            stores={stores}
            cleaningTasks={taskTypes}
            selectedDate={selectedDate}
            onSubmit={async (payload) => {
              // Build start/end from selectedDate + form times
              const start = new Date(selectedDate);
              const end = new Date(selectedDate);
              if (payload.anytime) {
                start.setHours(0,0,0,0); end.setHours(23,59,59,999);
              } else {
                const [sh, sm] = payload.startTime.split(":").map(Number);
                const [eh, em] = payload.endTime.split(":").map(Number);
                start.setHours(sh, sm, 0, 0); end.setHours(eh, em, 0, 0);
              }

              const finalStoreId = profile?.permissions === "store"
                ? profile.store_ids?.[0]
                : Number(payload.storeId);

              const storeName = stores.find(s => s.id === finalStoreId)?.name || "";

              const { error } = await supabase.from("deep_cleaning").insert([{
                task: payload.task,
                start: start.toISOString(),
                end_time: end.toISOString(),
                store_id: finalStoreId,
                store_name: storeName,
                created_by: profile?.id,
                created_at: new Date().toISOString(),
                anytime: payload.anytime
              }]);

              if (error) {
                toast({ title: "Error", description: error.message, variant: "destructive" });
                return;
              }
              toast({ title: "Task added", description: `${payload.task} for ${storeName}` });
              setIsAddOpen(false);
              loadTasks();
            }}
            isLoading={isLoading}
            setIsModalOpen={setIsAddOpen}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
