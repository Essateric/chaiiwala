import React, { useEffect, useMemo, useState } from "react";
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  format,
  addDays,
  isSameDay,
} from "date-fns";
import { Check, Square, ChevronLeft, ChevronRight, Calendar as CalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

// DeepCleaningChecklistView (Weekly Matrix) — Plain JavaScript (no TypeScript)
export default function DeepCleaningChecklistView({ profile }) {
  const { toast } = useToast();
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState("auto");
  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);

  const isAdminOrRegional = profile?.permissions === "admin" || profile?.permissions === "regional";

  // Fallback task list (client's list)
  const DEFAULT_TASKS = [
    "Bins area(inside/out)",
    "Door Mats",
    "Skirting board",
    "Remove gums from under tables/chairs",
    "Table legs & Backs",
    "Chair legs and backs",
    "Booth Seating /padded seats",
    "Mirrors",
    "Outside Signage",
    "Shop front and window",
    "Outside barriers and poles",
    "Outside point of sale(A frame etc)",
    "Shutters",
    "Fly zappers",
    "Drinks Fridge",
    "Cake fridge",
    "Ice Machine",
    "Behind counters and shelving",
    "Fryer(change oil)",
    "Canopy",
    "Air vents",
    "Stockroom",
    "Behind sink and cookers",
    "All kitchen fridge in/out and seals",
    "Grill (change sheet)",
    "Fire extingushers(all)",
    "Urn taps and seals",
    "Mop bucket and change mop heads",
    "Stairs (brush and mop)",
    "Gray tiles and white walls",
    "Pasty oven and trays",
  ];

  // Load stores + task types once
  useEffect(() => {
    (async () => {
      const { data: storeRows } = await supabase.from("stores").select("id,name");
      setStores(storeRows || []);

      const { data: types } = await supabase
        .from("deep_cleaning_tasks")
        .select("id,dc_task")
        .order("id", { ascending: true });

      const list = (types || []).map((t) => t.dc_task).filter(Boolean);
      setTaskTypes(list.length ? list : DEFAULT_TASKS);
    })();
  }, []);

  // Week boundaries (Mon–Sun)
  const weekStart = useMemo(() => startOfWeek(weekAnchor, { weekStartsOn: 1 }), [weekAnchor]);
  const weekEnd = useMemo(() => endOfWeek(weekAnchor, { weekStartsOn: 1 }), [weekAnchor]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  // Store resolution
  const resolvedStoreId = useMemo(() => {
    if (profile?.permissions === "store") return (profile.store_ids && profile.store_ids[0]) || null;
    if (selectedStore === "auto") return null; // force selection for ticking
    return Number(selectedStore);
  }, [profile, selectedStore]);

  const visibleStores = profile?.permissions === "admin" ? stores : stores.filter((s) => (profile?.store_ids || []).includes(s.id));

  // Load deep_cleaning rows within this week
  const loadWeek = async () => {
    setIsLoading(true);
    let query = supabase
      .from("deep_cleaning")
      .select("id, task, start, end_time, completed_at, store_id, store_name, anytime")
      .gte("start", weekStart.toISOString())
      .lte("start", weekEnd.toISOString());

    const { data, error } = await query;
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setIsLoading(false);
      return;
    }
    let filtered = data || [];

    if (profile?.permissions === "store") {
      filtered = filtered.filter((t) => t.store_id === (profile.store_ids && profile.store_ids[0]));
    } else if (resolvedStoreId) {
      filtered = filtered.filter((t) => t.store_id === resolvedStoreId);
    }

    setRows(filtered);
    setIsLoading(false);
  };

  useEffect(() => {
    if (profile) loadWeek();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, resolvedStoreId, weekStart.toISOString()]);

  // Fast lookup map: key = task|YYYY-MM-DD|storeId
  const cellMap = useMemo(() => {
    const m = new Map();
    for (const r of rows) {
      const key = `${r.task}|${format(new Date(r.start), "yyyy-MM-dd")}|${r.store_id}`;
      m.set(key, r);
    }
    return m;
  }, [rows]);

  const tickState = (task, date) => {
    if (!resolvedStoreId) return false;
    const key = `${task}|${format(date, "yyyy-MM-dd")}|${resolvedStoreId}`;
    const row = cellMap.get(key);
    return !!row && !!row.completed_at;
  };

  const handleToggle = async (task, date) => {
    if (!resolvedStoreId) {
      toast({ title: "Choose a store", description: "Select a store to tick cells.", variant: "destructive" });
      return;
    }
    const dateKey = format(date, "yyyy-MM-dd");
    const key = `${task}|${dateKey}|${resolvedStoreId}`;
    const existing = cellMap.get(key);

    if (existing) {
      const newCompletedAt = existing.completed_at ? null : new Date().toISOString();
      const { error } = await supabase
        .from("deep_cleaning")
        .update({ completed_at: newCompletedAt })
        .eq("id", existing.id);
      if (error) {
        toast({ title: "Error", description: "Could not update.", variant: "destructive" });
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === existing.id ? { ...r, completed_at: newCompletedAt } : r)));
      return;
    }

    // Insert new completed cell
    const dayStartISO = new Date(date);
    dayStartISO.setHours(0, 0, 0, 0);
    const dayEndISO = new Date(date);
    dayEndISO.setHours(23, 59, 59, 999);

    const storeName = (stores.find((s) => s.id === resolvedStoreId) || {}).name || "";

    const payload = {
      task,
      start: dayStartISO.toISOString(),
      end_time: dayEndISO.toISOString(),
      store_id: resolvedStoreId,
      store_name: storeName,
      created_by: profile?.id,
      created_at: new Date().toISOString(),
      anytime: true,
      completed_at: new Date().toISOString(),
    };

    const { data: inserted, error } = await supabase.from("deep_cleaning").insert([payload]).select();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setRows((prev) => [...prev, inserted[0]]);
  };

  // Progress for the selected store
  const totalCells = resolvedStoreId ? taskTypes.length * 7 : 0;
  const doneCells = useMemo(() => {
    if (!resolvedStoreId) return 0;
    let count = 0;
    for (let i = 0; i < taskTypes.length; i++) {
      for (let j = 0; j < days.length; j++) if (tickState(taskTypes[i], days[j])) count++;
    }
    return count;
  }, [taskTypes, days, rows, resolvedStoreId]);

  const goPrevWeek = () => setWeekAnchor((d) => addWeeks(d, -1));
  const goNextWeek = () => setWeekAnchor((d) => addWeeks(d, 1));
  const goThisWeek = () => setWeekAnchor(new Date());

  const DayHeader = ({ d }) => (
    <div className="text-xs font-semibold text-gray-700 text-center">
      <div>{format(d, "EEE")}</div>
      <div className="text-[11px] text-gray-500">{format(d, "d MMM")}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header / Filters */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Weekly Store Deep Cleaning</h2>
            <p className="text-sm text-gray-300">
              Week of {format(weekStart, "EEE, d MMM yyyy")} – {format(weekEnd, "EEE, d MMM yyyy")}
            </p>
            {resolvedStoreId ? (
              <p className="text-sm text-gray-300">
                <span className="font-medium">{doneCells}</span> / {totalCells} cells ticked
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 items-stretch md:flex-row md:items-center">
            {isAdminOrRegional ? (
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Choose store" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Select a store…</SelectItem>
                  {visibleStores.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goPrevWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goThisWeek}>
                <CalIcon className="h-4 w-4 mr-1" /> This week
              </Button>
              <Button variant="outline" size="sm" onClick={goNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Matrix */}
      <div className="rounded-lg bg-white p-2 overflow-x-auto">
        <table className="w-full border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left text-sm font-semibold text-gray-700 sticky left-0 bg-gray-100 z-10">Deep Cleaning Tasks</th>
              {days.map((d) => (
                <th key={d.toISOString()} className="p-2 text-sm font-semibold text-gray-700">
                  <DayHeader d={d} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-4 text-sm text-gray-600">Loading…</td>
              </tr>
            ) : (
              taskTypes.map((task) => (
                <tr key={task} className="border-t">
                  <td className="p-2 text-sm text-gray-800 sticky left-0 bg-white z-10 max-w-[320px]">{task}</td>
                  {days.map((d) => {
                    const done = tickState(task, d);
                    const isToday = isSameDay(d, new Date());
                    return (
                      <td key={task + format(d, "yyyy-MM-dd")} className={`p-2 text-center align-middle ${isToday ? "bg-amber-50" : ""}`}>
                        <button
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-md border transition ${
                            done
                              ? "bg-green-600 text-white border-green-600 hover:bg-green-700"
                              : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                          } ${resolvedStoreId ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
                          onClick={() => handleToggle(task, d)}
                          disabled={!resolvedStoreId}
                          aria-label={`Toggle ${task} for ${format(d, "EEE d MMM")}`}
                        >
                          {done ? <Check className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!resolvedStoreId ? (
          <p className="text-xs text-gray-500 p-2">Select a store to enable ticking.</p>
        ) : null}
      </div>

      <div className="text-xs text-gray-500 px-1">
        <ul className="list-disc pl-5 space-y-1">
          <li>Matrix shows one week (Monday to Sunday). Use arrows to switch weeks.</li>
          <li>Each tick saves to the database for that store and day.</li>
          <li>Tasks load from <code>deep_cleaning_tasks.dc_task</code>. If empty, the default client list is used.</li>
        </ul>
      </div>
    </div>
  );
}
