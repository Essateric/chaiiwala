import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { getStatusFromQty } from "../lib/utils.js";

// Custom hook to get inventory for user/store
export function useInventoryData({ currentUser, storeFilter, chaiiwalaStores }) {
  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storeCards, setStoreCards] = useState([]);

  // Helper: Check permissions
  const isStoreManager = currentUser?.permissions === "store";
  const isArea = currentUser?.permissions === "area";
  const isAdminOrRegional =
    currentUser?.permissions === "admin" ||
    currentUser?.permissions === "regional";

  // Helper: Get store name by ID
  const getStoreName = (storeId) => {
    const store = chaiiwalaStores.find((store) => store.id === storeId);
    return store ? store.name : "Unknown Store";
  };

  // Fetch inventory data
  useEffect(() => {
    async function fetchStock() {
      setLoading(true);

      if (!currentUser) {
        setInventoryData([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from("store_stock_levels")
        .select(`
          id,
          store_id,
          quantity,
          last_updated,
          stock_items (
            sku,
            name,
            price,
            category,
            daily_check
          )
        `);

      if (isStoreManager) {
        const storeId = Array.isArray(currentUser?.store_ids)
          ? currentUser.store_ids[0]
          : currentUser?.store_id || currentUser?.storeId;
        if (storeId) query = query.eq("store_id", storeId);
      } else if (isArea && Array.isArray(currentUser.store_ids) && currentUser.store_ids.length > 0) {
        query = query.in("store_id", currentUser.store_ids);
      } else if (isAdminOrRegional && storeFilter !== "all") {
        query = query.eq("store_id", Number(storeFilter));
      }
      // else, admin/regional with "all" sees all stores

      const { data, error } = await query;
      if (error) {
        setInventoryData([]);
      } else {
        const mappedData = (data || []).map((row) => ({
          id: row.id,
          storeId: row.store_id,
          storeName: getStoreName(row.store_id),
          sku: row.stock_items?.sku,
          product: row.stock_items?.name,
          price: Number(row.stock_items?.price),
          category: row.stock_items?.category,
          stock: Number(row.quantity) || 0,
          status: getStatusFromQty(row.quantity),
          daily_check: !!row.stock_items?.daily_check, // from stock_items!
        }));
        setInventoryData(mappedData);
      }
      setLoading(false);
    }

    fetchStock();
    // eslint-disable-next-line
  }, [currentUser, storeFilter, chaiiwalaStores]);

  // Update storeCards every time inventoryData changes
  useEffect(() => {
    const storeTotals = {};
    (inventoryData || []).forEach(item => {
      if (!storeTotals[item.storeId]) storeTotals[item.storeId] = 0;
      storeTotals[item.storeId] += Number(item.stock) || 0;
    });

    setStoreCards(
      chaiiwalaStores.map(store => ({
        ...store,
        totalQuantity: storeTotals[store.id] || 0,
      }))
    );
  }, [inventoryData, chaiiwalaStores]);

  return { inventoryData, loading, storeCards };
}
