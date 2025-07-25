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

  // Fetch all low stock items
  const { data: lowStockItems = [], isLoading } = useQuery({
    queryKey: ["all_low_stock_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_items")
        .select("id, name, sku, quantity, store_id")
        .lt("quantity", 10);
      if (error) throw error;
      return data || [];
    }
  });

  // Filter by store if selected
  const filteredItems = useMemo(() => {
    if (selectedStoreId === "all") return lowStockItems;
    return lowStockItems.filter(item => String(item.store_id) === String(selectedStoreId));
  }, [lowStockItems, selectedStoreId]);

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
            <b>{filteredItems.length}</b> low stock item{filteredItems.length !== 1 ? "s" : ""}
            {selectedStoreId !== "all" && (
              <> for <b>{getStoreName(selectedStoreId)}</b></>
            )}
          </span>
        )}
      </div>
      <div className="mt-2 font-semibold">Immediate attention</div>
      <div className="text-sm text-red-600 mt-1">
        {isLoading
          ? "Loading..."
          : filteredItems.length === 0
            ? "No low stock items."
            : (
              <ul className="list-disc ml-5">
                {filteredItems.map(item => (
                  <li key={item.id}>
                    {item.name} (SKU: {item.sku}, Qty: {item.quantity}, {getStoreName(item.store_id)})
                  </li>
                ))}
              </ul>
            )
        }
      </div>
    </div>
  );
}
