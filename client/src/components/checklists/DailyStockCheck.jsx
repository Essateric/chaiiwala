// components/checklists/DailyStockCheck.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient.js";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { useAuth } from "@/hooks/UseAuth.jsx";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useLast5DayHistoryForRows } from "@/hooks/useStockHistory.jsx";
import { londonTodayDateISO } from "@/lib/dates.js";

/** Robust: get London day-of-week without Date parsing ambiguity (0=Sun..6=Sat) */
function getLondonDayOfWeek(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const min = parts.find((p) => p.type === "minute")?.value ?? "00";
  const s = parts.find((p) => p.type === "second")?.value ?? "00";

  const londonIsoLike = `${y}-${m}-${d}T${h}:${min}:${s}`;
  return new Date(londonIsoLike).getDay();
}
function getLondonWeekdayName(now = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "long",
  }).format(now);
}

/* ----- helpers ----- */
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
/** Return YYYY-MM-DD for a timestamp, using Europe/London calendar date */
function londonDateKeyFromTs(ts) {
  const d = new Date(ts);
  const [dd, mm, yyyy] = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(d)
    .split("/");
  return `${yyyy}-${mm}-${dd}`;
}

/** add n days to a YYYY-MM-DD string */
function addDaysISO(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// prefer per-store override → legacy override → master item threshold
const calcEffectiveThreshold = (row) => {
  const override = toNum(row.threshold); // store_stock_levels.threshold
  const legacy = toNum(row.low_stock_limit); // legacy
  const master = toNum(row.low_stock_threshold); // stock_items.low_stock_threshold
  if (override > 0) return override;
  if (legacy > 0) return legacy;
  return master; // may be 0 if unset
};

/** dd MMM for yyyy-mm-dd (London) */
function fmtShortDay(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)); // noon UTC avoids DST wobble
  return dt.toLocaleDateString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "short",
  });
}

/** Get last N consecutive London calendar days (yyyy-mm-dd), oldest → newest */
function getLastNDatesLondon(n = 6, now = new Date()) {
  const toLondonISO = (d) => {
    const [dd, mm, yyyy] = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(d)
      .split("/"); // dd/mm/yyyy
    return `${yyyy}-${mm}-${dd}`;
  };
  // Build dates ending today (London), newest-first then reverse to oldest → newest
  const result = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - (n - 1 - i));
    result.push(toLondonISO(d));
  }
  return result.reverse();
}

export default function DailyStockCheck({
  storeId: storeIdProp = null,
  itemsPerPageProp = 10,
  title = "Daily Stock Check",
  collapsible = true,
  defaultExpanded = true,
}) {
  const { profile } = useAuth();
  const resolvedStoreId =
    storeIdProp ?? (Array.isArray(profile?.store_ids) ? profile.store_ids[0] : null);

  // ✅ normalize store_id for all queries/keys (works for bigint strings or uuids)
  const storeIdForQuery =
    /^\d+$/.test(String(resolvedStoreId)) ? Number(resolvedStoreId) : resolvedStoreId;

  // Sunday logic
  const isDev =
    typeof import.meta !== "undefined" && import.meta.env?.MODE === "development";
  const urlForceSunday =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("forceSunday") === "1";
  const lsForceSunday =
    typeof window !== "undefined" && window.localStorage?.getItem("forceSunday") === "1";
  const envForceSunday =
    typeof import.meta !== "undefined" && isDev && import.meta.env?.VITE_FORCE_SUNDAY === "1";
  const forceSunday = urlForceSunday || lsForceSunday || envForceSunday;

  const isSunday = forceSunday || getLondonDayOfWeek() === 0;
  const londonWeekdayName = getLondonWeekdayName();

  const [expanded, setExpanded] = useState(defaultExpanded);
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [editing, setEditing] = useState({});
  // Per-row delivery quantities (adds to current on-hand if New Qty not provided)
  const [editingDelivery, setEditingDelivery] = useState({});

  // NEW: track rows the user touched (even if value ends up unchanged)
  const [touchedRows, setTouchedRows] = useState(new Set());
  const markTouched = (id) =>
    setTouchedRows((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

  const handleDeliveryChange = (id, value) => {
    const v = value === "" ? "" : Math.max(0, Number(value));
    setEditingDelivery((prev) => ({
      ...prev,
      [id]: value === "" ? "" : String(v),
    }));
    // NEW
    markTouched(id);
  };

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  // --- Delivery modal state ---
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [deliveredAt, setDeliveredAt] = useState(() => {
    // local datetime-local default (no seconds), e.g., "2025-09-25T10:30"
    const d = new Date();
    d.setSeconds(0, 0);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });
  const [supplier, setSupplier] = useState("");
  const [reference, setReference] = useState("");
  const [deliveryRows, setDeliveryRows] = useState([
    { stock_item_id: null, quantity: "" },
  ]);

  const addDeliveryRow = () =>
    setDeliveryRows((r) => [...r, { stock_item_id: null, quantity: "" }]);

  const removeDeliveryRow = (idx) =>
    setDeliveryRows((r) => r.filter((_, i) => i !== idx));

  const updateDeliveryRow = (idx, patch) =>
    setDeliveryRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));

  useEffect(() => {
    fetchStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeIdForQuery, isSunday]);

  const itemsPerPage = itemsPerPageProp;

  /** ------- data fetch: current stock rows ------- */
  const fetchStock = async () => {
    if (!storeIdForQuery) {
      setStockItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    // all item fields (need low_stock_threshold, sku, category, daily_check)
    let { data: items, error: itemError } = await supabase
      .from("stock_items")
      .select("*")
      .order("name", { ascending: true });

    items = items || [];

    // hide non-daily except Sundays
    if (!itemError && !isSunday) {
      items = items.filter((item) => item.daily_check === true);
    }
    if (itemError) {
      setStockItems([]);
      setLoading(false);
      return;
    }

    const itemIds = items.map((i) => i.id);

    let levels = [];
    if (itemIds.length > 0) {
      const { data: levelData, error: levelsError } = await supabase
        .from("store_stock_levels")
        .select(
          "id, store_id, stock_item_id, quantity, threshold, last_updated, updated_by, checked_at, checked_by"
        )
        .in("stock_item_id", itemIds)
        .eq("store_id", storeIdForQuery);

      if (!levelsError && levelData) levels = levelData;
    }

    const levelsByItem = {};
    levels.forEach((level) => {
      levelsByItem[level.stock_item_id] = level;
    });

    const merged = items.map((item) => {
      const lvl = levelsByItem[item.id] ?? {};
      return {
        ...item,
        current_qty: toNum(lvl.quantity ?? 0),
        store_stock_level_id: lvl.id ?? null,
        threshold: lvl.threshold,
        // legacy property left for compatibility (will be 0/undefined)
        low_stock_limit: lvl.low_stock_limit,
      };
    });

    setStockItems(merged);
    setLoading(false);
  };

  const handleEditChange = (id, value) => {
    const v = value === "" ? "" : Math.max(0, Number(value));
    setEditing((prev) => ({
      ...prev,
      [id]: value === "" ? "" : String(v),
    }));
    // NEW
    markTouched(id);
  };

  // category options
  const categoryOptions = useMemo(() => {
    const set = new Set(
      (stockItems || []).map((i) => {
        const c = (i.category ?? "").trim();
        return c.length ? c : "Uncategorized";
      })
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [stockItems]);

  // filtering
  const filteredStockItems = useMemo(() => {
    let list = stockItems;
    if (selectedCategory !== "all") {
      list = list.filter((i) => {
        const cat = (i.category ?? "").trim() || "Uncategorized";
        return cat === selectedCategory;
      });
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (item) =>
          item.name?.toLowerCase().includes(q) ||
          item.sku?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [stockItems, selectedCategory, search]);

  // pagination
  const totalPages = Math.ceil(filteredStockItems.length / itemsPerPage) || 1;
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, search]);

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = currentPage * itemsPerPage;
    return filteredStockItems.slice(start, end);
  }, [filteredStockItems, currentPage, itemsPerPage]);

  // 🔁 Build "rows" for shared history hook (one store, page's item ids)
  const historyRows = useMemo(
    () =>
      pageItems.map((item) => ({
        storeId: storeIdForQuery, // normalized
        sku: String(item.id), // id is the stock_item_id
      })),
    [pageItems, storeIdForQuery]
  );
  const { historyMap: histMap } = useLast5DayHistoryForRows(historyRows);

  // ✅ Last 5 full days + today (6 columns), oldest → newest
  const lastDates = useMemo(() => getLastNDatesLondon(6, new Date()), []);
  const dateStart = lastDates[0];
  const dateEnd = lastDates[lastDates.length - 1];

  // 🔁 Overlay: fetch EXACT per-day entries for visible page
  // Prefer stock_history (daily snapshots), fallback to latest stock_history_changes per day
  const [overrideHistMap, setOverrideHistMap] = useState({});

  const refetchOverlay = async () => {
    if (!storeIdForQuery || pageItems.length === 0) {
      setOverrideHistMap({});
      return;
    }

    const ids = pageItems.map((i) => i.id);

    const fetchDaily = async () =>
      supabase
        .from("stock_history")
        .select("stock_item_id, date, quantity")
        .eq("store_id", storeIdForQuery)
        .in("stock_item_id", ids)
        .gte("date", dateStart)
        .lte("date", dateEnd);

    const fetchChanges = async () =>
      supabase
        .from("stock_history_changes")
        .select("stock_item_id, new_quantity, changed_at, updated_by")
        .eq("store_id", storeIdForQuery)
        .in("stock_item_id", ids)
        .gte("changed_at", `${dateStart}T00:00:00Z`)
        .lt("changed_at", `${addDaysISO(dateEnd, 1)}T00:00:00Z`)
        .order("changed_at", { ascending: true });

    try {
      // A) Primary: snapshots
      const dailyRes = await fetchDaily();
      if (dailyRes.error) throw dailyRes.error;
      const snapshots = dailyRes.data || [];

      const out = {};
      // Fill from stock_history first
      for (const r of snapshots) {
        const key = `${storeIdForQuery}:${String(r.stock_item_id)}`;
        out[key] = out[key] || {};
        out[key][r.date] = typeof r.quantity === "number" ? r.quantity : null;
      }

      // B) Fallback: use latest change of the day (absolute = new_quantity)
      const changesRes = await fetchChanges();
      if (changesRes.error) throw changesRes.error;
      const chRows = changesRes.data || [];

      const chosen = {};
      for (const r of chRows) {
        const key = `${storeIdForQuery}:${String(r.stock_item_id)}`;
        const day = londonDateKeyFromTs(r.changed_at);
        chosen[key] = chosen[key] || {};
        const prev = chosen[key][day];
        if (!prev) {
          chosen[key][day] = r;
          continue;
        }
        const prevUser = prev.updated_by != null;
        const curUser = r.updated_by != null;
        if (!prevUser && curUser) {
          chosen[key][day] = r;
          continue;
        }
        // both user or both non-user → keep latest by changed_at
        if (new Date(r.changed_at) > new Date(prev.changed_at)) {
          chosen[key][day] = r;
        }
      }

      // Only fill cells missing from stock_history
      Object.entries(chosen).forEach(([k, byDay]) => {
        out[k] = out[k] || {};
        Object.entries(byDay).forEach(([d, row]) => {
          if (typeof out[k][d] !== "number") {
            out[k][d] =
              typeof row.new_quantity === "number" ? Number(row.new_quantity) : null;
          }
        });
      });

      setOverrideHistMap(out);
    } catch (e) {
      console.error("history overlay fetch failed", e);
      setOverrideHistMap({});
    }
  };

  useEffect(() => {
    refetchOverlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeIdForQuery, pageItems, dateStart, dateEnd]);

  /** Map item → aligned qty array for the header dates (prefer overlay, fallback to hook) */
  const getHistoryCells = (itemId) => {
    const key = `${storeIdForQuery}:${String(itemId)}`;

    if (overrideHistMap[key]) {
      const byDate = overrideHistMap[key];
      return lastDates.map((d) =>
        typeof byDate[d] === "number" ? byDate[d] : null
      );
    }

    const timelineNewestFirst = histMap[key] || [];
    const byDate = new Map();
    timelineNewestFirst.forEach(({ date, qty }) => byDate.set(date, qty));
    return lastDates.map((d) =>
      typeof byDate.get(d) === "number" ? byDate.get(d) : null
    );
  };

  // changed rows on this page
  const pageChanges = useMemo(() => {
    return pageItems
      .map((item) => {
        const rawNew = editing[item.id];
        const rawDel = editingDelivery[item.id];

        const hasNew = typeof rawNew !== "undefined" && rawNew !== "";
        const hasDel = typeof rawDel !== "undefined" && rawDel !== "";

        if (!hasNew && !hasDel) return null;

        const current = Number(item.current_qty) || 0;

        // values entered by the user (parsed)
        const newQty = hasNew ? Number(rawNew) : null;
        const delQty = hasDel ? Number(rawDel) : null;
        if ((hasNew && Number.isNaN(newQty)) || (hasDel && Number.isNaN(delQty)))
          return null;

        // what snapshot should become (for store_stock_levels)
        const finalQty = hasNew ? newQty : current + delQty;

        // what to store in daily history (what was entered today) — not used for changes table now
        const historyQty = hasNew ? newQty : delQty;

        if (finalQty === current) return null;

        return {
          item,
          finalQty,
          historyQty, // left as-is for UI semantics
          usedNewQty: hasNew,
          usedDelivery: !hasNew && hasDel,
        };
      })
      .filter(Boolean);
  }, [pageItems, editing, editingDelivery]);

  const hasPageChanges = pageChanges.length > 0;

  // NEW: can save if any row was touched OR there are actual changes
  const canSavePage = (touchedRows.size > 0 || hasPageChanges) && !saving && !loading;

  const handleSavePage = async () => {
    // NEW: allow save when user touched rows (even if no changes)
    if (!storeIdForQuery || touchedRows.size === 0) return;
    setSaving(true);
    try {
      // ✅ get the signed-in user and name it authUser (avoid shadowing)
      const { data: authData, error: getUserErr } = await supabase.auth.getUser();
      const authUser = authData?.user;
      if (!authUser) {
        console.error("❌ No user found:", getUserErr);
        alert("Could not find current user.");
        setSaving(false);
        return;
      }

      const nowIso = new Date().toISOString();
      const todayISO = londonTodayDateISO(); // London calendar date (YYYY-MM-DD)

      // NEW: build snapshots from *touched* rows (proof-of-check even if unchanged)
      const touchedIds = Array.from(touchedRows);
      const touchedSnapshots = touchedIds
        .map((id) => {
          const item = pageItems.find((x) => x.id === id);
          if (!item) return null;

          const current = Number(item.current_qty) || 0;
          const rawNew = editing[item.id];
          const rawDel = editingDelivery[item.id];

          const hasNew = typeof rawNew !== "undefined" && rawNew !== "";
          const hasDel = typeof rawDel !== "undefined" && rawDel !== "";

          const newQty = hasNew ? Number(rawNew) : null;
          const delQty = hasDel ? Number(rawDel) : null;

          const finalQty = hasNew
            ? newQty
            : hasDel
            ? current + Number(delQty)
            : current; // unchanged allowed

          return {
            store_id: storeIdForQuery,
            stock_item_id: Number(item.id),
            quantity: Number(finalQty),
            last_updated: nowIso,
            updated_by: authUser.id,
            checked_at: nowIso, // proof-of-check
            checked_by: authUser.id,
          };
        })
        .filter(Boolean);

      // ✅ 1) Upsert touched snapshots (includes unchanged qty; stamps checked_at/by)
      const { error: snapshotErr } = await supabase
        .from("store_stock_levels")
        .upsert(touchedSnapshots, { onConflict: "store_id,stock_item_id" });

      if (snapshotErr) {
        console.error("❌ Supabase error (store_stock_levels):", snapshotErr);
        alert(snapshotErr.message || "Failed to save this page.");
        setSaving(false);
        return;
      }

      // ✅ 2) Append change rows (audit) to stock_history_changes (today only) — CHANGED ONLY
      if (hasPageChanges) {
        const changeRows = pageChanges.map(({ item, finalQty }) => ({
          store_id: storeIdForQuery,
          stock_item_id: Number(item.id),
          old_quantity: Number(item.current_qty) || 0,
          new_quantity: Number(finalQty),
          updated_by: authUser.id,
          changed_at: nowIso,
        }));

        const { error: changeErr } = await supabase
          .from("stock_history_changes")
          .insert(changeRows);

        if (changeErr) {
          console.error("❌ stock_history_changes insert failed", changeErr);
          alert(changeErr.message || "Failed to write history rows");
          setSaving(false);
          return;
        }
      }

      // ✅ 3) Upsert daily snapshot for reporting & the grid — CHANGED ONLY
      if (hasPageChanges) {
        const dailyRows = pageChanges.map(({ item, finalQty }) => ({
          store_id: storeIdForQuery,
          stock_item_id: Number(item.id),
          date: todayISO, // London day
          quantity: Number(finalQty),
          recorded_at: nowIso,
        }));

        const { error: dailyErr } = await supabase
          .from("stock_history")
          .upsert(dailyRows, { onConflict: "store_id,stock_item_id,date" });

        if (dailyErr) {
          console.error("❌ stock_history upsert failed", dailyErr);
          alert(dailyErr.message || "Failed to write daily snapshots");
          setSaving(false);
          return;
        }
      }

      await fetchStock();
      await refetchOverlay();

      // clear inputs only for rows we changed
      setEditing((prev) => {
        const next = { ...prev };
        pageItems.forEach((item) => {
          if (typeof next[item.id] !== "undefined") {
            const wasChanged = pageChanges.some((c) => c.item.id === item.id);
            if (wasChanged) delete next[item.id];
          }
        });
        return next;
      });
      setEditingDelivery((prev) => {
        const next = { ...prev };
        pageItems.forEach((item) => {
          if (typeof next[item.id] !== "undefined") {
            const wasChanged = pageChanges.some((c) => c.item.id === item.id);
            if (wasChanged) delete next[item.id];
          }
        });
        return next;
      });

      // NEW: clear touched set after save
      setTouchedRows(new Set());

      alert("Saved this page!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="flex items-center justify-between relative">
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="text-sm text-gray-500">
            {isSunday
              ? "Weekly Stock Check — update quantities for all stock items."
              : `Daily Stock Check for ${londonWeekdayName} — only daily-check items.`}
          </p>
        </div>

        {collapsible && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded((s) => !s)}
            className="absolute top-3 right-4"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" /> Collapse
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" /> Expand
              </>
            )}
          </Button>
        )}
      </CardHeader>

      {expanded && (
        <CardContent>
          {/* Toolbar */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
              <Input
                placeholder="Search by name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-64"
              />
              <select
                className="border rounded px-3 py-2 text-sm w-full sm:w-auto"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">All categories</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <Button
              className="w-full sm:w-auto"
              variant="secondary"
              size="sm"
              onClick={() => setDeliveryOpen(true)}
            >
              Record Delivery
            </Button>

            <Button
              className="w-full sm:w-auto"
              variant="default"
              size="sm"
              onClick={handleSavePage}
              disabled={!canSavePage}
            >
              {saving ? "Saving..." : "Save This Page"}
            </Button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Loading stock items...
            </div>
          ) : (
            <>
              {pageItems.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No stock items found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full table-fixed divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2 text-left  text-xs font-medium text-gray-500 w-24">
                          SKU
                        </th>
                        <th className="px-4 py-2 text-left  text-xs font-medium text-gray-500">
                          Name
                        </th>
                        <th className="px-4 py-2 text-left  text-xs font-medium text-gray-500 w-40">
                          Category
                        </th>

                        {/* Last 5 full days + today (6 columns), oldest → newest */}
                        {lastDates.map((d, idx) => {
                          const isTodayCol = idx === lastDates.length - 1;
                          return (
                            <th
                              key={d}
                              className={[
                                "px-2 py-2 text-right text-xs font-medium w-20",
                                idx > 0 ? "border-l border-gray-200" : "",
                                isTodayCol ? "text-gray-900" : "text-gray-500",
                              ].join(" ")}
                              title={d}
                            >
                              {fmtShortDay(d)}
                            </th>
                          );
                        })}

                        {/* Inputs */}
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 w-32">
                          New Qty
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 w-32">
                          Delivery
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {pageItems.map((item) => {
                        const currentQty = Number(item.current_qty) || 0;
                        const limit = calcEffectiveThreshold(item);
                        const isLow = limit > 0 && currentQty <= limit;

                        // aligned quantities for the header dates (oldest → newest)
                        const cells = getHistoryCells(item.id);

                        return (
                          <tr
                            key={item.id}
                            className={`border-t ${
                              isLow
                                ? "bg-red-50 hover:bg-red-50/80 border-l-4 border-red-400"
                                : ""
                            }`}
                          >
                            <td className="px-4 py-2">{item.sku}</td>

                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                {item.name}
                                {isLow && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-semibold">
                                    LOW
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="px-4 py-2">
                              {(item.category ?? "").trim() || "Uncategorized"}
                            </td>

                            {/* 6 date columns with vertical separators; last (today) emphasized */}
                            {cells.map((qty, idx) => {
                              const isTodayCol = idx === cells.length - 1;
                              const isNumber = typeof qty === "number";

                              return (
                                <td
                                  key={idx}
                                  className={[
                                    "px-2 py-2 text-right",
                                    idx > 0 ? "border-l border-gray-200" : "",
                                    isTodayCol && isNumber
                                      ? "font-semibold text-gray-900"
                                      : "",
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                >
                                  {isNumber ? (
                                    <span className="font-mono tabular-nums text-base sm:text-lg leading-none">
                                      {qty}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] uppercase tracking-wide text-gray-400">
                                      No Entry
                                    </span>
                                  )}
                                </td>
                              );
                            })}

                            {/* New Qty input (no “No Entry” here) */}
                            <td className="px-4 py-2 text-center">
                              <Input
                                type="number"
                                min={0}
                                value={editing[item.id] ?? ""}
                                onChange={(e) =>
                                  handleEditChange(item.id, e.target.value)
                                }
                                placeholder="Qty"
                                className={`w-24 text-center ${
                                  isLow
                                    ? "border-red-300 bg-red-50/70 focus-visible:ring-red-400"
                                    : ""
                                }`}
                              />
                            </td>

                            {/* Delivery Qty input (no “No Entry” here) */}
                            <td className="px-4 py-2 text-center">
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={editingDelivery[item.id] ?? ""}
                                onChange={(e) =>
                                  handleDeliveryChange(item.id, e.target.value)
                                }
                                placeholder="0"
                                className="w-24 text-center"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination + bottom save */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
                <span>
                  Page {currentPage} of {totalPages}
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                  >
                    Next
                  </Button>

                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSavePage}
                    disabled={!canSavePage}
                  >
                    {saving ? "Saving..." : "Save This Page"}
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Spacer so content won't be hidden behind the sticky bar */}
          <div className="h-20 sm:h-0" />

          {/* Sticky action bar */}
          <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t p-3 pb-[env(safe-area-inset-bottom)] z-40">
            <div className="flex justify-end gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleSavePage}
                disabled={!canSavePage}
              >
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>

          {/* Optional floating Save on small screens */}
          {(touchedRows.size > 0 || hasPageChanges) && (
            <Button
              className="fixed right-4 bottom-20 z-50 sm:hidden"
              onClick={handleSavePage}
              disabled={saving || loading}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          )}

          {/* Record Delivery Modal (unchanged, still uses RPC) */}
          {deliveryOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-xl w-full max-w-2xl p-4 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Record Delivery</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeliveryOpen(false)}
                  >
                    Close
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <Input
                    placeholder="Supplier (optional)"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="sm:col-span-1"
                  />
                  <Input
                    placeholder="Reference (optional)"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="sm:col-span-1"
                  />
                  <input
                    type="datetime-local"
                    className="border rounded px-3 py-2 text-sm sm:col-span-1"
                    value={deliveredAt}
                    onChange={(e) => setDeliveredAt(e.target.value)}
                  />
                </div>

                {/* Lines editor */}
                <div className="border rounded">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2">Item</th>
                        <th className="text-right px-3 py-2 w-32">Quantity</th>
                        <th className="px-3 py-2 w-20"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveryRows.map((row, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-3 py-2">
                            <select
                              className="w-full border rounded px-2 py-1"
                              value={row.stock_item_id ?? ""}
                              onChange={(e) =>
                                updateDeliveryRow(idx, {
                                  stock_item_id: e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                })
                              }
                            >
                              <option value="">Select item…</option>
                              {stockItems.map((si) => (
                                <option key={si.id} value={si.id}>
                                  {si.sku ? `${si.sku} — ` : ""}
                                  {si.name || "Untitled"}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0"
                              value={row.quantity}
                              onChange={(e) =>
                                updateDeliveryRow(idx, {
                                  quantity: e.target.value,
                                })
                              }
                              className="text-right"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeDeliveryRow(idx)}
                              disabled={deliveryRows.length === 1}
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between mt-3">
                  <Button variant="outline" size="sm" onClick={addDeliveryRow}>
                    Add Line
                  </Button>

                  <Button
                    size="sm"
                    onClick={async () => {
                      if (!storeIdForQuery) return;
                      const items = deliveryRows
                        .filter(
                          (r) => r.stock_item_id && Number(r.quantity) > 0
                        )
                        .map((r) => ({
                          stock_item_id: Number(r.stock_item_id),
                          quantity: Number(r.quantity),
                          unit_cost: null, // extend later if you add cost
                        }));

                      if (items.length === 0) {
                        alert("Add at least one line with quantity > 0");
                        return;
                      }

                      try {
                        // RPC that records a delivery and (via trigger) updates on-hand
                        await supabase.rpc("record_delivery", {
                          p_store_id: storeIdForQuery,
                          p_supplier_name: supplier || null,
                          p_reference_code: reference || null,
                          p_delivered_at: new Date(deliveredAt).toISOString(),
                          p_items: items,
                        });

                        // Refresh on-hand + day entries
                        await fetchStock();
                        await refetchOverlay();

                        // reset & close
                        setSupplier("");
                        setReference("");
                        setDeliveryRows([{ stock_item_id: null, quantity: "" }]);
                        setDeliveryOpen(false);
                      } catch (err) {
                        console.error("record_delivery failed", err);
                        alert(err?.message || "Failed to record delivery");
                      }
                    }}
                  >
                    Save Delivery
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
