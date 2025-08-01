import { useEffect, useState } from "react";
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
  const [currentPage, setCurrentPage] = useState(1);
  const [editing, setEditing] = useState({});
  const [search, setSearch] = useState('');
  const itemsPerPage = 10;

  const fetchStock = async () => {
    if (!storeId) return;

    setLoading(true);

    let { data: items, error: itemError } = await supabase
      .from("stock_items")
      .select("*")
      .order("name", { ascending: true });

    if (!itemError && !isSunday) {
      items = items.filter(item => item.daily_check === true);
    }

    if (itemError) {
      setStockItems([]);
      setLoading(false);
      return;
    }

    const itemIds = items.map(i => i.id);

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
    levels.forEach(level => {
      levelsByItem[level.stock_item_id] = level;
    });

    const merged = items.map(item => ({
      ...item,
      current_qty: levelsByItem[item.id]?.quantity ?? 0,
      store_stock_level_id: levelsByItem[item.id]?.id ?? null,
    }));

    setStockItems(merged);
    setLoading(false);
  };

  useEffect(() => {
    fetchStock();
  }, [storeId]);

  const handleSaveStock = async (stockRow, user) => {
    console.log("🧪 Upserting to store_stock_levels with data:", stockRow);
    console.log("🧪 Double-check user.id === updated_by?", user.id === stockRow.updated_by);

    const { data, error } = await supabase
      .from("store_stock_levels")
      .upsert(stockRow)
      .select();

    if (error) {
      console.error("❌ Supabase error:", error);
      alert("Failed to save stock.");
      return;
    }

    console.log("✅ Stock saved successfully:", data);
    alert("Stock saved!");
    await fetchStock();
  };

  const handleSave = async (item) => {
    const quantity = Number(editing[item.id]);
    if (isNaN(quantity)) return;

    const {
      data,
      error: userError
    } = await supabase.auth.getUser();

    const user = data?.user;

    if (!user) {
      console.error("❌ No user found:", userError);
      return;
    }

    const stockRow = {
      stock_item_id: item.id,
      store_id: storeId,
      quantity,
      last_updated: new Date().toISOString(),
      updated_by: user.id,
      ...(item.store_stock_level_id && { id: item.store_stock_level_id })
    };

    console.log("🧾 Final payload to send:", stockRow);
    console.log("👤 Current user ID:", user.id);

    await handleSaveStock(stockRow, user);
  };

  const handleEditChange = (id, value) => {
    setEditing(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const filteredStockItems = search
    ? stockItems.filter(item =>
        item.name?.toLowerCase().includes(search.toLowerCase()) ||
        item.sku?.toLowerCase().includes(search.toLowerCase())
      )
    : stockItems;

  const totalPages = Math.ceil(filteredStockItems.length / itemsPerPage);
  const pageItems = filteredStockItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
        <div className="mb-4 flex items-center">
          <Input
            placeholder="Search by name or SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-64"
          />
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
                      <th className="px-4 py-2"></th>
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
                            className="w-20"
                          />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSave(item)}
                            disabled={
                              typeof editing[item.id] === "undefined" ||
                              editing[item.id] === "" ||
                              isNaN(Number(editing[item.id]))
                            }
                          >
                            Save
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-between items-center mt-4">
                  <span>Page {currentPage} of {totalPages || 1}</span>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((prev) => prev - 1)}
                    >
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages || totalPages === 0}
                      onClick={() => setCurrentPage((prev) => prev + 1)}
                    >
                      Next
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
