import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card.jsx";
import { Button } from "../../components/ui/button.jsx";
import { Input } from "../../components/ui/input.jsx";
import { useAuth } from "../../hooks/UseAuth.jsx";

export default function DailyStockCheck() {
  const { profile } = useAuth();
  const storeId = Array.isArray(profile?.store_ids) ? profile.store_ids[0] : null;

  const isSunday = new Date().getDay() === 0; // Sunday = 0

  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [editing, setEditing] = useState({});
  const [search, setSearch] = useState("");
  const itemsPerPage = 10;

  const fetchStock = async () => {
    if (!storeId) return;

    setLoading(true);

    let { data: items, error: itemError } = await supabase
      .from("stock_items")
      .select("*")
      .order("name", { ascending: true });

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
        .eq("store_id", storeId);

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
  }, [storeId]);

  const handleEditChange = (id, value) => {
    // Allow empty for “clear”, but guard negative values
    const v = value === "" ? "" : Math.max(0, Number(value));
    setEditing((prev) => ({
      ...prev,
      [id]: value === "" ? "" : String(v),
    }));
  };

  // Filtering
  const filteredStockItems = useMemo(() => {
    if (!search) return stockItems;
    const q = search.toLowerCase();
    return stockItems.filter(
      (item) =>
        item.name?.toLowerCase().includes(q) ||
        item.sku?.toLowerCase().includes(q)
    );
  }, [stockItems, search]);

  // Pagination
  const totalPages = Math.ceil(filteredStockItems.length / itemsPerPage) || 1;

  // Keep currentPage in range if filtering changes total
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = currentPage * itemsPerPage;
    return filteredStockItems.slice(start, end);
  }, [filteredStockItems, currentPage]);

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
    if (!storeId || !hasPageChanges) return;
    setSaving(true);

    try {
      const {
        data: authData,
        error: userError
      } = await supabase.auth.getUser();

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
        store_id: storeId,
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
            // Clear only values that were actually changed/saved
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
      <CardHeader>
        <CardTitle>Daily Stock Check</CardTitle>
        <p className="text-sm text-gray-500">
          {isSunday
            ? "Sunday Weekly Stock Check — update quantities for all stock items."
            : "Update today’s stock levels for all daily-check items."}
        </p>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center justify-between gap-4">
          <Input
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />

          {/* Save current page button (top-right for convenience) */}
          <Button
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
                        <td className="px-4 py-2">{item.category}</td>
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
                  <span>Page {currentPage} of {totalPages}</span>

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
      </CardContent>
    </Card>
  );
}
