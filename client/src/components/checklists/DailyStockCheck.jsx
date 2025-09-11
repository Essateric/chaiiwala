// components/stock/DailyStockCheck.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient.js";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { useAuth } from "@/hooks/UseAuth.jsx";
import { ChevronDown, ChevronUp } from "lucide-react";

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

  // Build a wall-clock London datetime string that Date can read consistently
  const londonIsoLike = `${y}-${m}-${d}T${h}:${min}:${s}`;
  return new Date(londonIsoLike).getDay();
}

function getLondonWeekdayName(now = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "long",
  }).format(now);
}

export default function DailyStockCheck({
  /** Optional: force a specific store id. If omitted, uses the user's first store. */
  storeId: storeIdProp = null,
  /** Optional: page size (defaults to 10) */
  itemsPerPageProp = 10,
  /** Optional: custom title (defaults to "Daily Stock Check") */
  title = "Daily Stock Check",
  /** NEW: collapsible header + default state */
  collapsible = true,
  defaultExpanded = true,
}) {
  const { profile } = useAuth();

  const resolvedStoreId =
    storeIdProp ?? (Array.isArray(profile?.store_ids) ? profile.store_ids[0] : null);

  // --- FORCE-SUNDAY TEST SUPPORT (safe in prod) ---
  const isDev = typeof import.meta !== "undefined" && import.meta.env?.MODE === "development";

  const urlForceSunday =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("forceSunday") === "1";

  const lsForceSunday =
    typeof window !== "undefined" &&
    window.localStorage?.getItem("forceSunday") === "1";

  const envForceSunday =
    typeof import.meta !== "undefined" &&
    isDev &&
    import.meta.env?.VITE_FORCE_SUNDAY === "1";

  // Only true if explicitly set via URL/localStorage in any env, or via env var in dev
  const forceSunday = urlForceSunday || lsForceSunday || envForceSunday;

  // Define isSunday BEFORE any hook uses it
  const isSunday = forceSunday || getLondonDayOfWeek() === 0;
  const londonWeekdayName = getLondonWeekdayName();

  const [expanded, setExpanded] = useState(defaultExpanded);
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [editing, setEditing] = useState({});
  const [search, setSearch] = useState("");

  // NEW: Category filter state
  const [selectedCategory, setSelectedCategory] = useState("all");

  const itemsPerPage = itemsPerPageProp;

  const fetchStock = async () => {
    if (!resolvedStoreId) {
      setStockItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    let { data: items, error: itemError } = await supabase
      .from("stock_items")
      .select("*")
      .order("name", { ascending: true });

    items = items || [];

    // Hide non-daily items except on Sundays
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
        .select("*")
        .in("stock_item_id", itemIds)
        .eq("store_id", resolvedStoreId);

      if (!levelsError && levelData) levels = levelData;
    }

    const levelsByItem = {};
    levels.forEach((level) => {
      levelsByItem[level.stock_item_id] = level;
    });

    const merged = items.map((item) => ({
      ...item,
      current_qty: levelsByItem[item.id]?.quantity ?? 0,
      store_stock_level_id: levelsByItem[item.id]?.id ?? null,
    }));

    setStockItems(merged);
    setLoading(false);
  };

  useEffect(() => {
    fetchStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedStoreId, isSunday]); // <-- isSunday is defined above

  const handleEditChange = (id, value) => {
    // Allow empty for “clear”, but guard negative values
    const v = value === "" ? "" : Math.max(0, Number(value));
    setEditing((prev) => ({
      ...prev,
      [id]: value === "" ? "" : String(v),
    }));
  };

  // Build unique, sorted category list from data
  const categoryOptions = useMemo(() => {
    const set = new Set(
      (stockItems || []).map((i) => {
        const c = (i.category ?? "").trim();
        return c.length ? c : "Uncategorized";
      })
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [stockItems]);

  // Filtering (category + search)
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

  // Pagination
  const totalPages = Math.ceil(filteredStockItems.length / itemsPerPage) || 1;

  // Keep currentPage in range if filtering changes total
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, search]);

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = currentPage * itemsPerPage;
    return filteredStockItems.slice(start, end);
  }, [filteredStockItems, currentPage, itemsPerPage]);

  // Determine which edits on this page are valid and changed
  const pageChanges = useMemo(() => {
    return pageItems
      .map((item) => {
        const raw = editing[item.id];
        if (typeof raw === "undefined" || raw === "") return null;
        const qty = Number(raw);
        if (Number.isNaN(qty)) return null;
        if (qty === item.current_qty) return null;
        return { item, qty };
      })
      .filter(Boolean);
  }, [pageItems, editing]);

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

      // Build batched rows for upsert
      const now = new Date().toISOString();
      const rows = pageChanges.map(({ item, qty }) => ({
        id: item.store_stock_level_id ?? undefined,
        stock_item_id: item.id,
        store_id: resolvedStoreId,
        quantity: qty,
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

      // Refresh and clear only the edited entries for this page
      await fetchStock();

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
          {/* Toolbar: search + category + save */}
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

            {/* Save current page button (top-right for convenience) */}
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
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">SKU</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Category</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Current Qty</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">New Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="px-4 py-2">{item.sku}</td>
                          <td className="px-4 py-2">{item.name}</td>
                          <td className="px-4 py-2">
                            {(item.category ?? "").trim() || "Uncategorized"}
                          </td>
                          <td className="px-4 py-2 text-right">{item.current_qty}</td>
                          <td className="px-4 py-2 text-right">
                            <Input
                              type="number"
                              min={0}
                              value={editing[item.id] ?? ""}
                              onChange={(e) => handleEditChange(item.id, e.target.value)}
                              placeholder="Qty"
                              className="w-24"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

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

                      {/* Duplicate Save at bottom for easy access */}
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
                </div>
              )}
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

          {/* Optional floating Save on small screens when there are edits */}
          {hasPageChanges && (
            <Button
              className="fixed right-4 bottom-20 z-50 sm:hidden"
              onClick={handleSavePage}
              disabled={saving || loading}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}
