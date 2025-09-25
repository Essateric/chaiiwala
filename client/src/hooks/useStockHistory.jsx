// hooks/useStockHistory.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient.js";

/**
 * Accepts the current page's rows (each must have: storeId, sku/stock_item_id)
 * Returns: historyMap keyed by `${storeId}:${stockItemId}` -> [{ date, qty }] (newest→oldest)
 */
export function useLast5DayHistoryForRows(rows = []) {
  const [historyMap, setHistoryMap] = useState({});
  const [loading, setLoading] = useState(false);

  // Group the incoming rows by store and dedupe item ids
  const plan = useMemo(() => {
    const byStore = {};
    (rows || []).forEach((r) => {
      const sid = Number(r.storeId);
      const stockId = String(r.sku ?? r.stock_item_id ?? r.id);
      if (!byStore[sid]) byStore[sid] = new Set();
      byStore[sid].add(stockId);
    });
    return byStore; // { [storeId]: Set(stockItemIds) }
  }, [rows]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!rows?.length) {
        setHistoryMap({});
        return;
      }
      setLoading(true);
      try {
        const resultMap = {};
        const storeIds = Object.keys(plan);

        // London date formatter and helper
        const fmt = new Intl.DateTimeFormat("en-GB", {
          timeZone: "Europe/London",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        const toLondonISO = (d) => {
          const [dd, mm, yyyy] = fmt.format(new Date(d)).split("/");
          return `${yyyy}-${mm}-${dd}`; // e.g. "2025-09-24"
        };

        for (const sidStr of storeIds) {
          const sid = Number(sidStr);
          const wanted = plan[sid]; // Set of stock item ids for this page & store

          // Pull recent rows for this store using the exact schema columns
          const { data, error, status } = await supabase
            .from("store_stock_levels")
            .select("id, store_id, stock_item_id, quantity, last_updated, updated_by, threshold")
            .eq("store_id", sid)
            .order("last_updated", { ascending: false }) // if nulls exist, we'll handle below
            .limit(1000); // adjust if you need deeper history

          if (error) {
            const msg = String(error.message || "");
            if (error.code === "42P01" || status === 404 || msg.includes("relation")) {
              // table missing in env — skip gracefully
              continue;
            }
            console.warn("[useLast5DayHistoryForRows] fetch error:", error);
            continue;
          }

          // If some rows have null last_updated, sort client-side with fallback
          const rowsSorted = (data || []).slice().sort((a, b) => {
            const ta = new Date(a.last_updated ?? Date.now()).getTime();
            const tb = new Date(b.last_updated ?? Date.now()).getTime();
            return tb - ta; // newest first
          });

          // Group per London calendar day and keep the latest qty for each item per day
          // day -> itemId -> qty
          const dayItemLatestQty = new Map();

          for (const row of rowsSorted) {
            const when = row.last_updated ?? new Date();
            const day = toLondonISO(when);

            const itemId = String(row.stock_item_id ?? row.id);
            if (!wanted.has(itemId)) continue;

            if (!dayItemLatestQty.has(day)) dayItemLatestQty.set(day, new Map());
            const itemMap = dayItemLatestQty.get(day);

            // rowsSorted is newest→older; first seen per day is the latest
            if (!itemMap.has(itemId)) {
              itemMap.set(itemId, Number(row.quantity ?? 0));
            }
          }

          // Take latest 5 days (ascending for stable render), then build per-item timelines newest→oldest
          const last5DaysAsc = [...dayItemLatestQty.keys()]
            .sort((a, b) => a.localeCompare(b))
            .slice(-5);

          for (const itemId of wanted) {
            const key = `${sid}:${itemId}`;
            const timelineAsc = [];
            for (const day of last5DaysAsc) {
              const qty = dayItemLatestQty.get(day)?.get(itemId);
              if (typeof qty === "number") {
                timelineAsc.push({ date: day, qty });
              }
            }
            const timelineDesc = [...timelineAsc].sort((a, b) => b.date.localeCompare(a.date)); // newest→oldest
            if (timelineDesc.length) resultMap[key] = timelineDesc;
          }
        }

        setHistoryMap(resultMap);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [rows, plan]);

  return { historyMap, loading };
}

/**
 * Variant when you just have one store and a list of item ids.
 * itemIds: array of stock_item_id (string/number).
 */
export function useLast5DayHistoryByStore(storeId, itemIds = []) {
  const rows = useMemo(
    () => (itemIds || []).map((id) => ({ storeId, sku: String(id) })),
    [storeId, itemIds]
  );
  return useLast5DayHistoryForRows(rows);
}
