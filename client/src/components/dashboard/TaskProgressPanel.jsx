import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient.js";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs.jsx";
import { Loader2 } from "lucide-react";

/* Helpers */
function formatNiceDate(isoDate) {
  if (!isoDate) return "N/A";
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Shorter date for compact table cells
function formatNiceDateShort(isoDate) {
  if (!isoDate) return "N/A";
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function formatTimeHM(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatRangeLabel(startISO, endISO) {
  return `${formatNiceDate(startISO)} → ${formatNiceDate(endISO)}`;
}

/**
 * Checklist progress widget with Today + Last 7 Days tabs.
 * - “Today” shows progress bar + (if a store is selected) a table of tasks completed today.
 * - “Last 7 Days” only shows when a single store is selected.
 */
export default function TaskProgressPanel({
  stores = [],
  selectedTaskStoreId = "all",
  onChangeSelectedTaskStoreId = () => {},
  isLoadingTasks = false,
  percentComplete = 0,
  completedTasks = 0,
  totalTasks = 0,
}) {
  const isAllSelected = !selectedTaskStoreId || selectedTaskStoreId === "all";

  /* ----- Date range for last 7 days (including today) ----- */
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);

  const startISO = start.toISOString().split("T")[0];
  const endISO = end.toISOString().split("T")[0];
  const rangeLabel = formatRangeLabel(startISO, endISO);

  /* ----- Store name lookup ----- */
  const storeById = useMemo(() => {
    const map = new Map();
    (stores || []).forEach((s) => map.set(String(s.id), s.name));
    return map;
  }, [stores]);

  /* ----------------------- TODAY (Completed list) ----------------------- */
  const todayISO = new Date().toISOString().split("T")[0];

  // ✅ select("*") so we don't 400 if the view doesn’t expose completed_at
  const {
    data: todayRows = [],
    isLoading: isLoadingTodayRows,
    error: errorTodayRows,
  } = useQuery({
    queryKey: ["today_tasks_for_store", todayISO, selectedTaskStoreId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_daily_checklist_with_status")
        .select("*")
        .eq("date", todayISO)
        .eq("store_id", selectedTaskStoreId);
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
    enabled: !isAllSelected, // only fetch when a single store is selected
  });

  const { data: allDailyTasks = [] } = useQuery({
    queryKey: ["all_daily_tasks_titles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("daily_tasks").select("id,title");
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const titleById = useMemo(() => {
    const m = new Map();
    for (const t of allDailyTasks) m.set(t.id, t.title);
    return m;
  }, [allDailyTasks]);

  const completedTodayForStore = useMemo(() => {
    if (!todayRows.length) return [];
    return todayRows
      .filter((r) => r.status === "completed")
      .map((r) => ({
        task_id: r.task_id,
        title: titleById.get(r.task_id) || `Task #${r.task_id}`,
        completed_at: r.completed_at ?? null,
      }))
      .sort(
        (a, b) =>
          new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime()
      );
  }, [todayRows, titleById]);

  /* ----------------------- LAST 7 DAYS (Table) ----------------------- */
  const {
    data: checklistRows = [],
    isLoading: isLoading7,
    error: error7,
  } = useQuery({
    queryKey: ["v_daily_checklist_with_status_last7", startISO, endISO, selectedTaskStoreId],
    queryFn: async () => {
      let query = supabase
        .from("v_daily_checklist_with_status")
        .select("date, store_id, status")
        .gte("date", startISO)
        .lte("date", endISO)
        .eq("store_id", selectedTaskStoreId);
      const { data, error } = await query;
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
    enabled: !isAllSelected, // don’t run for "All Stores"
  });

  const rows = useMemo(() => {
    const buckets = new Map(); // key: `${date}|${store_id}`
    for (const r of checklistRows) {
      const key = `${r.date}|${r.store_id}`;
      if (!buckets.has(key)) {
        buckets.set(key, {
          date: r.date,
          store_id: r.store_id,
          total: 0,
          completed: 0,
        });
      }
      const b = buckets.get(key);
      b.total += 1;
      if (r.status === "completed") b.completed += 1;
    }

    const arr = [];
    for (const b of buckets.values()) {
      const storeName = storeById.get(String(b.store_id)) || `Store #${b.store_id}`;
      let status = "Incomplete";
      if (b.total === 0) status = "No Entry";
      else if (b.completed === b.total) status = "All Done";
      arr.push({
        date: b.date,
        storeName,
        completed: b.completed,
        total: b.total,
        status,
      });
    }

    // Sort by date DESC, then store ASC
    arr.sort((a, b) => {
      if (a.date < b.date) return 1;
      if (a.date > b.date) return -1;
      return a.storeName.localeCompare(b.storeName);
    });

    return arr;
  }, [checklistRows, storeById]);

  return (
    <Card className="bg-white shadow rounded-xl h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Checklist Progress</CardTitle>
            <CardDescription className="mt-1">Track completion across stores</CardDescription>
          </div>

          {/* Store Filter */}
          <select
            className="border border-gray-200 rounded px-2 py-1 text-xs bg-white"
            value={selectedTaskStoreId}
            onChange={(e) => onChangeSelectedTaskStoreId(e.target.value)}
          >
            <option value="all">All Stores</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Helpful hint when "All Stores" is selected */}
        {isAllSelected && (
          <div className="mt-2 text-[11px] text-gray-500">
            Select a store to see the Last 7 Days and the list of tasks completed today.
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-2">
        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid grid-cols-2 mb-3">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="last7" disabled={isAllSelected}>
              Last 7 Days
            </TabsTrigger>
          </TabsList>

          {/* ===== TODAY ===== */}
          <TabsContent value="today">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {isLoadingTasks ? "Loading…" : "Today’s completion"}
              </div>
              <div className="text-xs text-gray-500">
                {isLoadingTasks ? "" : `${completedTasks}/${totalTasks} tasks`}
              </div>
            </div>

            <div className="mt-3">
              {isLoadingTasks ? (
                <div className="flex items-center text-gray-500 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Fetching…
                </div>
              ) : (
                <div className="w-full bg-gray-100 h-3 rounded overflow-hidden">
                  <div
                    className="bg-emerald-500 h-3"
                    style={{ width: `${Math.min(100, Math.max(0, percentComplete))}%` }}
                  />
                </div>
              )}
              {!isLoadingTasks && (
                <p className="mt-2 text-xs text-gray-500">{percentComplete}% complete</p>
              )}
            </div>

            {/* Completed Today (per selected store) */}
            {!isAllSelected && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-700">
                    Completed Today — {storeById.get(String(selectedTaskStoreId)) || "Store"}
                  </h4>
                  {isLoadingTodayRows && (
                    <div className="flex items-center text-gray-500 text-xs">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading…
                    </div>
                  )}
                </div>

                {errorTodayRows ? (
                  <p className="text-sm text-red-600">
                    Error: {errorTodayRows.message || "Failed to load."}
                  </p>
                ) : completedTodayForStore.length === 0 ? (
                  <p className="text-gray-500 text-sm">No tasks completed yet today.</p>
                ) : (
                  <div className="rounded-md border border-gray-100">
                    <table className="w-full text-sm text-gray-700">
                      <thead className="bg-white">
                        <tr className="text-left border-b text-xs text-gray-400">
                          <th className="py-2 px-3">Task</th>
                          <th className="py-2 px-3">Completed At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {completedTodayForStore.map((t) => (
                          <tr key={t.task_id} className="border-b">
                            <td className="py-2 px-3">{t.title}</td>
                            <td className="py-2 px-3">{formatTimeHM(t.completed_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ===== LAST 7 DAYS (TABLE) – compact, no-scroll ===== */}
          <TabsContent value="last7">
            {isAllSelected ? null : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">{rangeLabel}</span>
                </div>

                {error7 ? (
                  <p className="text-sm text-red-600">Error: {error7.message || "Failed to load."}</p>
                ) : isLoading7 ? (
                  <div className="flex items-center text-gray-500 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading…
                  </div>
                ) : rows.length === 0 ? (
                  <p className="text-gray-500 text-sm">No data for this store.</p>
                ) : (
                  <div className="rounded-md border border-gray-100 overflow-x-hidden">
                    <table className="w-full table-fixed text-[13px] text-gray-700">
                      {/* Lock widths so the table always fits the card */}
                      <colgroup>
                        <col style={{ width: "120px" }} /> {/* Date */}
                        <col />                            {/* Store (flex) */}
                        <col style={{ width: "96px" }} />  {/* Status */}
                        <col style={{ width: "90px" }} />  {/* Completed */}
                      </colgroup>

                      <thead className="bg-white">
                        <tr className="text-left border-b text-xs text-gray-400">
                          <th className="py-2 px-2">Date</th>
                          <th className="py-2 px-2">Store</th>
                          <th className="py-2 px-2">Status</th>
                          <th className="py-2 px-2 text-right">Completed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="py-1.5 px-2 whitespace-normal break-words leading-tight">
                              {formatNiceDateShort(r.date)}
                            </td>
                            <td className="py-1.5 px-2 truncate" title={r.storeName}>
                              {r.storeName}
                            </td>
                            <td className="py-1.5 px-2">
                              {r.total === 0 ? (
                                <span className="text-yellow-700 font-semibold text-xs">No Entry</span>
                              ) : r.completed === r.total ? (
                                <span className="text-green-700 font-semibold text-xs">All Done</span>
                              ) : (
                                <span className="text-red-700 font-semibold text-xs">Incomplete</span>
                              )}
                            </td>
                            <td className="py-1.5 px-2 text-right">
                              {r.total > 0 ? (
                                <span className="font-medium">
                                  {r.completed}/{r.total}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
