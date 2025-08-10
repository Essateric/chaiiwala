import React, { useEffect, useMemo, useState } from "react";
import { startOfDay, endOfDay, format, addDays } from "date-fns";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronRight as CaretRight, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button.jsx";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select.jsx";
import { useToast } from "../hooks/use-toast.jsx";
import { supabase } from "../lib/supabaseClient.js";

export default function DeepCleaningAdminDayView({ profile }) {
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [stores, setStores] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [storeOpen, setStoreOpen] = useState({}); // { [store_id]: boolean }
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "pending" | "completed"
  const [search, setSearch] = useState("");

  const dayStart = startOfDay(selectedDate);
  const dayEnd = endOfDay(selectedDate);

  // Load stores
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("stores").select("id,name").order("name", { ascending: true });
      if (!error) setStores(data || []);
    })();
  }, []);

  // Load tasks for the selected day (all stores)
  const loadTasks = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("deep_cleaning")
      .select("*")
      .gte("start", dayStart.toISOString())
      .lte("start", dayEnd.toISOString());
    if (error) {
      toast({ title: "Error", description: "Could not load tasks.", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    setTasks(data || []);
    setIsLoading(false);
  };

  useEffect(() => { loadTasks(); /* eslint-disable-next-line */ }, [selectedDate]);

  // Group tasks by store
  const groups = useMemo(() => {
    const map = new Map();
    for (const t of tasks) {
      const key = t.store_id;
      const entry = map.get(key) || { store_id: key, store_name: t.store_name || "Unknown", items: [] };
      entry.items.push(t);
      map.set(key, entry);
    }
    // Order stores by name; order tasks: pending first, then by time
    return Array.from(map.values())
      .sort((a, b) => (a.store_name || "").localeCompare(b.store_name || ""))
      .map(group => ({
        ...group,
        items: group.items
          .filter(t => {
            if (statusFilter === "pending") return !t.completed_at;
            if (statusFilter === "completed") return !!t.completed_at;
            return true;
          })
          .filter(t => {
            if (!search.trim()) return true;
            const q = search.toLowerCase();
            return (
              (t.task || "").toLowerCase().includes(q) ||
              (t.store_name || "").toLowerCase().includes(q)
            );
          })
          .sort((a, b) => {
            if (!!a.completed_at !== !!b.completed_at) return a.completed_at ? 1 : -1;
            return new Date(a.start) - new Date(b.start);
          })
      }));
  }, [tasks, statusFilter, search]);

  // Expand/Collapse all helpers
  const allStoreIds = useMemo(() => groups.map(g => g.store_id), [groups]);
  const expandAll = () => setStoreOpen(Object.fromEntries(allStoreIds.map(id => [id, true])));
  const collapseAll = () => setStoreOpen(Object.fromEntries(allStoreIds.map(id => [id, false])));

  // Mark complete/undo
  const toggleComplete = async (task) => {
    const completed_at = task.completed_at ? null : new Date().toISOString();
    const { error } = await supabase.from("deep_cleaning").update({ completed_at }).eq("id", task.id);
    if (error) {
      toast({ title: "Error", description: "Could not update task.", variant: "destructive" });
      return;
    }
    setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, completed_at } : t)));
  };

  const fmtTime = (iso) => format(new Date(iso), "HH:mm");

  // Date nav
  const goPrev = () => setSelectedDate(d => addDays(d, -1));
  const goNext = () => setSelectedDate(d => addDays(d, 1));
  const goToday = () => setSelectedDate(startOfDay(new Date()));

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Deep Cleaning — All Stores</h2>
            <p className="text-sm text-gray-300">{format(dayStart, "EEEE, MMM d yyyy")}</p>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goPrev}><ChevronLeft className="h-4 w-4" /></Button>
              <input
                type="date"
                className="flex h-9 w-[150px] rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={format(selectedDate, "yyyy-MM-dd")}
                onChange={(e) => setSelectedDate(new Date(e.target.value + "T00:00:00"))}
              />
              <Button variant="outline" size="sm" onClick={goNext}><ChevronRight className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={goToday}>Today</Button>
            </div>

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Filter status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending only</SelectItem>
                <SelectItem value="completed">Completed only</SelectItem>
              </SelectContent>
            </Select>

            {/* Search */}
            <input
              type="text"
              placeholder="Search task or store..."
              className="flex h-9 w-[220px] rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {/* Expand/Collapse */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={expandAll}>Expand all</Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>Collapse all</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center gap-2 p-4 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading tasks…
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-lg bg-white p-4 text-sm text-gray-600">No tasks for this day.</div>
      ) : (
        <div className="space-y-4">
          {groups.map(group => {
            const total = group.items.length;
            const done = group.items.filter(i => !!i.completed_at).length;
            const pct = total ? Math.round((done / total) * 100) : 0;
            const open = storeOpen[group.store_id] ?? true;
            return (
              <div key={group.store_id} className="rounded-lg border bg-white overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-3 py-2 text-left bg-gray-50"
                  onClick={() => setStoreOpen(s => ({ ...s, [group.store_id]: !open }))}
                >
                  <div className="flex items-center gap-2">
                    {open ? <ChevronDown className="h-4 w-4" /> : <CaretRight className="h-4 w-4" />}
                    <span className="font-semibold">{group.store_name}</span>
                    <span className="text-xs text-gray-600">({done}/{total})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-28 bg-gray-200 rounded overflow-hidden">
                      <div className="h-full bg-green-600" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-600">{pct}%</span>
                  </div>
                </button>

                {open && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="text-left p-2">Task</th>
                          <th className="text-left p-2">Time</th>
                          <th className="text-left p-2">Status</th>
                          <th className="text-left p-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.length === 0 ? (
                          <tr><td className="p-3 text-gray-500" colSpan={4}>No tasks match filters.</td></tr>
                        ) : (
                          group.items.map(t => {
                            const isDone = !!t.completed_at;
                            const timeLabel = t.anytime ? "Anytime" : `${fmtTime(t.start)} - ${fmtTime(t.end_time)}`;
                            return (
                              <tr key={t.id} className="border-b">
                                <td className="p-2">{t.task}</td>
                                <td className="p-2">{timeLabel}</td>
                                <td className="p-2">{isDone ? <span className="text-green-600">Completed</span> : <span className="text-gray-600">Pending</span>}</td>
                                <td className="p-2">
                                  <Button
                                    size="sm"
                                    variant={isDone ? "outline" : "default"}
                                    className={isDone ? "" : "bg-green-600 hover:bg-green-700"}
                                    onClick={() => toggleComplete(t)}
                                  >
                                    {isDone ? "Undo" : "Mark Done"}
                                  </Button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
