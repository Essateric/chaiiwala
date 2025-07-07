import React, { useState, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { useQuery } from "@tanstack/react-query";

export default function StockWidget() {
  const { data: stores = [] } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name");
      if (error) throw error;
      return data || [];
    }
  });

  const [selectedStoreId, setSelectedStoreId] = useState("all");

  // Fetch all daily check stock items
  const { data: dailyCheckStockItems = [], isLoading } = useQuery({
    queryKey: ["daily_check_stock_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_items")
        .select("id, name, sku, quantity, store_id, low_stock_threshold, category, price, quantity_per_unit") // Added more fields as per user's table schema
        .eq("daily_check", true);
      if (error) throw error;
      return data || [];
    }
  });

  // Filter by store if selected
  const filteredItems = useMemo(() => {
    if (selectedStoreId === "all") return dailyCheckStockItems;
    return dailyCheckStockItems.filter(item => String(item.store_id) === String(selectedStoreId));
  }, [dailyCheckStockItems, selectedStoreId]);

  // Helper
  const getStoreName = id =>
    stores.find(s => String(s.id) === String(id))?.name || "Unknown";

  return (
    <div className="bg-[#faebc8] border border-[#f6d67a] rounded-lg p-4 mb-4">
      <div className="mb-2 flex items-center">
        <label className="mr-2 font-semibold">Store:</label>
        <select
          className="border rounded p-1 bg-white"
          value={selectedStoreId}
          onChange={e => setSelectedStoreId(e.target.value)}
        >
          <option value="all">All Stores</option>
          {stores.map(store => (
            <option key={store.id} value={store.id}>{store.name}</option>
          ))}
        </select>
      </div>
      <div className="font-medium mb-2">
        {isLoading ? (
          <span>Loading...</span>
        ) : (
          <span>
            <b>{filteredItems.length}</b> item{filteredItems.length !== 1 ? "s" : ""} for daily check
            {selectedStoreId !== "all" && (
              <> for <b>{getStoreName(selectedStoreId)}</b></>
            )}
          </span>
        )}
      </div>
      <div className="mt-2 font-semibold">Daily Stock Check Items</div>
      <div className="text-sm text-gray-700 mt-1"> {/* Changed text color from red for less alarm */}
        {isLoading
          ? "Loading..."
          : filteredItems.length === 0
            ? "No items marked for daily check."
            : (
              <ul className="list-disc ml-5">
                {filteredItems.map(item => (
                  <li key={item.id}>
                    {item.name} (SKU: {item.sku}, Qty: {item.quantity ?? 'N/A'}, Store: {getStoreName(item.store_id)})
                    {item.quantity < item.low_stock_threshold && <span className="text-red-600 font-bold ml-2">LOW STOCK</span>}
                  </li>
                ))}
              </ul>
            )
        }
      </div>
    </div>
  );
}
