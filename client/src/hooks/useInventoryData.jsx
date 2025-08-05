import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { getStatusFromQty } from "../lib/utils.js";

// Custom hook to get inventory for user/store
export function useInventoryData({ currentUser, storeFilter, chaiiwalaStores }) {
  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  const isStoreManager = currentUser?.permissions === "store";
  const isArea = currentUser?.permissions === "area";
  const isAdminOrRegional =
    currentUser?.permissions === "admin" ||
    currentUser?.permissions === "regional";

  // Get store name by ID
  const getStoreName = (storeId) => {
    const store = chaiiwalaStores.find((store) => store.id === storeId);
    return store ? store.name : "Unknown Store";
  };

  useEffect(() => {
    async function fetchStock() {
      setLoading(true);
      let query = supabase
        .from("store_stock_levels")
        .select(`
          id,
          store_id,
          quantity,
          last_updated,
          daily_check,
          stock_items (
            sku,
            name,
            price,
            category
          )
        `);

      if (isStoreManager) {
        query = query.eq("store_id", currentUser.store_id || currentUser.storeId);
      } else if (isArea && Array.isArray(currentUser.store_ids) && currentUser.store_ids.length > 0) {
        query = query.in("store_id", currentUser.store_ids);
      } else if (isAdminOrRegional && storeFilter !== "all") {
        query = query.eq("store_id", Number(storeFilter));
      }

      const { data, error } = await query;
      if (error) {
        setInventoryData([]);
      } else {
        setInventoryData(
          (data || []).map((row) => ({
            id: row.id,
            storeId: row.store_id,
            storeName: getStoreName(row.store_id),
            sku: row.stock_items?.sku,
            product: row.stock_items?.name,
            price: Number(row.stock_items?.price),
            category: row.stock_items?.category,
            stock: row.quantity,
            status: getStatusFromQty(row.quantity),
            daily_check: !!row.daily_check,
          }))
        );
      }
      setLoading(false);
    }
    fetchStock();
    // eslint-disable-next-line
  }, [currentUser, storeFilter, chaiiwalaStores]);

  return { inventoryData, loading };
}
