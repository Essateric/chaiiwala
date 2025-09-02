import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient.js";
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from "../ui/card.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs.jsx";
import { Loader2, AlertCircle } from "lucide-react";

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
function formatRangeLabel(startISO, endISO) {
  return `${formatNiceDate(startISO)} → ${formatNiceDate(endISO)}`;
}

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

  const end = new Date(); end.setHours(0,0,0,0);
  const start = new Date(end); start.setDate(start.getDate() - 6);
  const startISO = start.toISOString().split("T")[0];
  const endISO   = end.toISOString().split("T")[0];
  const rangeLabel = formatRangeLabel(startISO, endISO);

  const { data: checklistRows = [], isLoading: isLoading7, error: error7 } = useQuery({
    queryKey: ["v_daily_checklist_with_status_last7", startISO, endISO, selectedTaskStoreId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_daily_checklist_with_status")
        .select("date, store_id, status")
        .gte("date", startISO)
        .lte("date", endISO)
        .eq("store_id", selectedTaskStoreId);
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
    enabled: !isAllSelected, // unchanged
  });

  const storeById = useMemo(() => {
    const map = new Map();
    (stores || []).forEach((s) => map.set(String(s.id), s.name));
    return map;
  }, [stores]);

  const rows = useMemo(() => {
    const buckets = new Map();
    for (const r of checklistRows) {
      const key = `${r.date}|${r.store_id}`;
      if (!buckets.has(key)) {
        buckets.set(key, { date: r.date, store_id: r.store_id, total: 0, completed: 0 });
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
      arr.push({ date: b.date, storeName, completed: b.completed, total: b.total, status });
    }
    arr.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.storeName.localeCompare(b.storeName)));
    return arr;
  }, [checklistRows, storeById]);

  return (
    <Card className="bg-white shadow rounded-xl h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Checklist Progress</CardTitle>
            <CardDescription className="mt-1">
              Track completion across stores
            </CardDescription>
          </div>

          {/* 🔹 Give this select an id so other components/buttons can focus it */}
          <select
            id="taskStoreSelect"
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

        {/* 🔸 Gentle nudge when “All Stores” is selected */}
        {isAllSelected && (
          <div className="mt-3 flex items-start gap-2 rounded-md bg-yellow-50 border border-yellow-100 p-2">
            <AlertCircle className="h-4 w-4 text-yellow-700 mt-0.5" />
            <p className="text-xs text-yellow-800">
              Select a store to enable the <strong>Last 7 Days</strong> view for that store.
            </p>
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

          {/* ===== TODAY (unchanged) ===== */}
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
                <p className="mt-2 text-xs text-gray-500">
                  {percentComplete}% complete
                </p>
              )}
            </div>
          </TabsContent>

          {/* ===== LAST 7 DAYS ===== */}
          <TabsContent value="last7">
            {/* If somehow navigated here with “all” selected, show the nudge inline too */}
            {isAllSelected ? (
              <div className="rounded-md bg-yellow-50 border border-yellow-100 p-3 text-sm text-yellow-800">
                Please select a store from the dropdown above to view the last 7 days.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">{rangeLabel}</span>
                </div>

                {error7 ? (
                  <p className="text-sm text-red-600">
                    Error: {error7.message || "Failed to load."}
                  </p>
                ) : isLoading7 ? (
                  <div className="flex items-center text-gray-500 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading…
                  </div>
                ) : rows.length === 0 ? (
                  <p className="text-gray-500 text-sm">No data for this store.</p>
                ) : (
                  <div className="rounded-md border border-gray-100">
                    <table className="w-full text-sm text-gray-700">
                      <thead className="bg-white">
                        <tr className="text-left border-b text-xs text-gray-400">
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Store</th>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3 text-right">Completed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="py-2 px-3 whitespace-nowrap">{formatNiceDate(r.date)}</td>
                            <td className="py-2 px-3">{r.storeName}</td>
                            <td className="py-2 px-3">
                              {r.total === 0 ? (
                                <span className="text-yellow-600 font-semibold">No Entry</span>
                              ) : r.completed === r.total ? (
                                <span className="text-green-600 font-semibold">All Done</span>
                              ) : (
                                <span className="text-red-600 font-semibold">Incomplete</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right">
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
