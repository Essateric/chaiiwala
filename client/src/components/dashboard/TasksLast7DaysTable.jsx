import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient.js";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card.jsx";
import { ClipboardList } from "lucide-react";

/**
 * Helper: format YYYY-MM-DD to "Mon, 01 Sep 2025"
 */
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

/**
 * Helper: range label like "Mon, 25 Aug 2025 → Sun, 31 Aug 2025"
 */
function formatRangeLabel(startISO, endISO) {
  return `${formatNiceDate(startISO)} → ${formatNiceDate(endISO)}`;
}

/**
 * A table-styled widget (same vibe as Chaiiwala/Freshways) that lists
 * task completion by Store for the last N days (default 7).
 */
export default function TasksLast7DaysTable({
  stores = [],               // optional pre-fetched stores for consistency with your dashboard
  days = 7,                  // last N days, including today
  storeFilterId = "all",     // pass selectedTaskStoreId if you want to filter
}) {
  // Build date range (date-only, local to GB)
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));

  const startISO = start.toISOString().split("T")[0];
  const endISO   = end.toISOString().split("T")[0];

  // Fetch rows from the view
  const { data: checklistRows = [], isLoading, error } = useQuery({
    queryKey: ["v_daily_checklist_with_status_last7", startISO, endISO, storeFilterId],
    queryFn: async () => {
      let query = supabase
        .from("v_daily_checklist_with_status")
        .select("date, store_id, status")
        .gte("date", startISO)
        .lte("date", endISO);

      if (storeFilterId && storeFilterId !== "all") {
        query = query.eq("store_id", storeFilterId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
  });

  // Quick lookup for store names
  const storeById = useMemo(() => {
    const map = new Map();
    (stores || []).forEach(s => map.set(String(s.id), s.name));
    return map;
  }, [stores]);

  // Group by (date, store)
  const rows = useMemo(() => {
    // key = `${date}|${store_id}`
    const buckets = new Map();

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

    // Convert to array, fill names, compute status
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

    // If there were stores but zero checklist rows on some day,
    // they won't appear here (that’s fine). You could also synthesize “No Entry”
    // rows per store/day if needed — keeping it simple for now.

    // Sort by date DESC, then store ASC
    arr.sort((a, b) => {
      if (a.date < b.date) return 1;
      if (a.date > b.date) return -1;
      return a.storeName.localeCompare(b.storeName);
    });
    return arr;
  }, [checklistRows, storeById]);

  const rangeLabel = formatRangeLabel(startISO, endISO);

  return (
    <Card className="relative bg-purple-50 border border-purple-100 shadow-sm">
      <div className="absolute left-4 top-4">
        <div className="rounded-full bg-purple-100 p-2">
          <ClipboardList className="h-6 w-6 text-purple-600" />
        </div>
      </div>
      <CardHeader className="pl-20 pt-4 pb-2">
        <CardTitle className="text-base font-bold text-gray-800">
          Tasks — Last {days} Days
        </CardTitle>
        <CardDescription>{rangeLabel}</CardDescription>
      </CardHeader>

      <CardContent className="px-5 pb-5">
        {error ? (
          <p className="text-sm text-red-600">Error: {error.message || "Failed to load."}</p>
        ) : isLoading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="text-gray-500 text-sm">No data for the selected range.</p>
        ) : (
          <div className="max-h-[360px] overflow-auto rounded-md border border-gray-100">
            <table className="w-full text-sm text-gray-700">
              <thead className="sticky top-0 bg-white">
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
      </CardContent>
    </Card>
  );
}
