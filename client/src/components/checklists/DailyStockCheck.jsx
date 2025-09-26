// components/checklists/DailyStockCheck.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient.js";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { useAuth } from "@/hooks/UseAuth.jsx";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useLast5DayHistoryForRows } from "@/hooks/useStockHistory.jsx";

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
// prefer per-store override → legacy override → master item threshold
const calcEffectiveThreshold = (row) => {
  const override = toNum(row.threshold);            // store_stock_levels.threshold
  const legacy   = toNum(row.low_stock_limit);      // legacy (no longer in table; may be 0)
  const master   = toNum(row.low_stock_threshold);  // stock_items.low_stock_threshold
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
function getLastNDatesLondon(n = 5, now = new Date()) {
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

  // Sunday logic
  const isDev = typeof import.meta !== "undefined" && import.meta.env?.MODE === "development";
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
  const handleDeliveryChange = (id, value) => {
    const v = value === "" ? "" : Math.max(0, Number(value));
    setEditingDelivery((prev) => ({
      ...prev,
      [id]: value === "" ? "" : String(v),
    }));
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
  }, [resolvedStoreId, isSunday]);

  const itemsPerPage = itemsPerPageProp;

  /** ------- data fetch: current stock rows ------- */
  const fetchStock = async () => {
    if (!resolvedStoreId) {
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
        .select("id, store_id, stock_item_id, quantity, threshold, last_updated, updated_by")
        .in("stock_item_id", itemIds)
        .eq("store_id", resolvedStoreId);

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
        storeId: Number(resolvedStoreId),
        sku: String(item.id), // id is the stock_item_id
      })),
    [pageItems, resolvedStoreId]
  );
  const { historyMap: histMap, loading: loadingHist } = useLast5DayHistoryForRows(historyRows);

  // ✅ Last 5 full days + today (6 columns), oldest → newest
  const lastDates = useMemo(() => getLastNDatesLondon(6, new Date()), []);

  /** Map item → aligned qty array for the header dates */
  const getHistoryCells = (itemId) => {
    const key = `${resolvedStoreId}:${String(itemId)}`;
    const timelineNewestFirst = histMap[key] || [];
    const byDate = new Map();
    timelineNewestFirst.forEach(({ date, qty }) => byDate.set(date, qty));
    return lastDates.map((d) => (typeof byDate.get(d) === "number" ? byDate.get(d) : null));
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
        let finalQty;

        if (hasNew) {
          const newQty = Number(rawNew);
          if (Number.isNaN(newQty)) return null;
          finalQty = newQty; // absolute override
        } else {
          const delQty = Number(rawDel);
          if (Number.isNaN(delQty)) return null;
          finalQty = current + delQty; // increment current by delivery
        }

        if (finalQty === current) return null;

        return { item, finalQty, usedNewQty: hasNew, usedDelivery: !hasNew && hasDel };
      })
      .filter(Boolean);
  }, [pageItems, editing, editingDelivery]);

  const hasPageChanges = pageChanges.length > 0;

  const handleSavePage = async () => {
    if (!resolvedStoreId || !hasPageChanges) return;
    setSaving(true);
    try {
      const { data: authData, error: userError } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) {
        console.error("❌ No user found:", userError);
        alert("Could not find current user.");
        setSaving(false);
        return;
      }

      const now = new Date().toISOString();
      // ✅ use finalQty (not 'qty')
      const rows = pageChanges.map(({ item, finalQty }) => ({
        id: item.store_stock_level_id ?? undefined,
        stock_item_id: item.id,
        store_id: resolvedStoreId,
        quantity: finalQty,
        last_updated: now,
        updated_by: user.id,
      }));

      const { data, error } = await supabase
        .from("store_stock_levels")
        .upsert(rows)
        .select();

      if (error) {
        console.error("❌ Supabase error:", error);
        alert("Failed to save this page.");
        setSaving(false);
        return;
      }

      await fetchStock();

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
      // also clear Delivery inputs
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

      console.log("✅ Page saved successfully:", data);
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
              disabled={!hasPageChanges || saving || loading}
            >
              {saving ? "Saving..." : "Save This Page"}
            </Button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading stock items...</div>
          ) : (
            <>
              {pageItems.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No stock items found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full table-fixed divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2 text-left  text-xs font-medium text-gray-500 w-24">SKU</th>
                        <th className="px-4 py-2 text-left  text-xs font-medium text-gray-500">Name</th>
                        <th className="px-4 py-2 text-left  text-xs font-medium text-gray-500 w-40">Category</th>

                        {/* Last 5 full days + today (6 columns), oldest → newest */}
                        {lastDates.map((d, idx) => {
                          const isTodayCol = idx === lastDates.length - 1;
                          return (
                            <th
                              key={d}
                              className={[
                                "px-2 py-2 text-right text-xs font-medium w-20",
                                idx > 0 ? "border-l border-gray-200" : "",
                                isTodayCol ? "text-gray-900" : "text-gray-500"
                              ].join(" ")}
                              title={d}
                            >
                              {fmtShortDay(d)}
                            </th>
                          );
                        })}

                        {/* Removed the “Current Qty” column to avoid duplicating today */}
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 w-32">New Qty</th>
                        {/* NEW: Delivery column */}
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 w-32">Delivery</th>
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
                            className={`border-t ${isLow ? "bg-red-50 hover:bg-red-50/80 border-l-4 border-red-400" : ""}`}
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

                            <td className="px-4 py-2">{(item.category ?? "").trim() || "Uncategorized"}</td>

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
                                    isTodayCol && isNumber ? "font-semibold text-gray-900" : ""
                                  ].filter(Boolean).join(" ")}
                                >
                                  {isNumber ? (
                                    // Bigger number + aligned digits
                                    <span className="font-mono tabular-nums text-base sm:text-lg leading-none">
                                      {qty}
                                    </span>
                                  ) : (
                                    // Subtle "No Entry"
                                    <span className="text-[11px] uppercase tracking-wide text-gray-400">
                                      No Entry
                                    </span>
                                  )}
                                </td>
                              );
                            })}

                            {/* New Qty input */}
                            <td className="px-4 py-2 text-center">
                              <Input
                                type="number"
                                min={0}
                                value={editing[item.id] ?? ""}
                                onChange={(e) => handleEditChange(item.id, e.target.value)}
                                placeholder="Qty"
                                className={`w-24 text-center ${isLow ? "border-red-300 bg-red-50/70 focus-visible:ring-red-400" : ""}`}
                              />
                            </td>

                            {/* NEW: Delivery Qty input */}
                            <td className="px-4 py-2 text-center">
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={editingDelivery[item.id] ?? ""}
                                onChange={(e) => handleDeliveryChange(item.id, e.target.value)}
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
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  >
                    Next
                  </Button>

                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSavePage}
                    disabled={!hasPageChanges || saving || loading}
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
                disabled={!hasPageChanges || saving || loading}
              >
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>

          {/* Optional floating Save on small screens */}
          {hasPageChanges && (
            <Button
              className="fixed right-4 bottom-20 z-50 sm:hidden"
              onClick={handleSavePage}
              disabled={saving || loading}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          )}

          {/* Record Delivery Modal */}
          {deliveryOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-xl w-full max-w-2xl p-4 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Record Delivery</h3>
                  <Button variant="ghost" size="sm" onClick={() => setDeliveryOpen(false)}>Close</Button>
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
                                  stock_item_id: e.target.value ? Number(e.target.value) : null,
                                })
                              }
                            >
                              <option value="">Select item…</option>
                              {stockItems.map((si) => (
                                <option key={si.id} value={si.id}>
                                  {si.sku ? `${si.sku} — ` : ""}{si.name || "Untitled"}
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
                              onChange={(e) => updateDeliveryRow(idx, { quantity: e.target.value })}
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
                      if (!resolvedStoreId) return;
                      const items = deliveryRows
                        .filter((r) => r.stock_item_id && Number(r.quantity) > 0)
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
                          p_store_id: Number(resolvedStoreId),
                          p_supplier_name: supplier || null,
                          p_reference_code: reference || null,
                          p_delivered_at: new Date(deliveredAt).toISOString(),
                          p_items: items,
                        });

                        // Refresh on-hand so the table shows new totals immediately
                        await fetchStock();

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
