import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { getStatusFromQty } from "../lib/utils.js";

/**
 * Custom React hook to fetch inventory stock levels, with role-based filtering.
 *
 * @param {Object}   params
 * @param {Object}   params.currentUser      - The current user (must include .permissions)
 * @param {string}   params.storeFilter      - Store ID to filter for (or "all" for everything)
 * @param {Array}    params.chaiiwalaStores  - Array of { id, name } for all stores
 *
 * @returns {Object} { inventoryData, loading, error }
 */
export function useInventoryData({ currentUser, storeFilter, chaiiwalaStores }) {
  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper to get store name by ID
  const getStoreName = (storeId) => {
    if (!Array.isArray(chaiiwalaStores)) return "Unknown Store";
    const store = chaiiwalaStores.find((store) => Number(store.id) === Number(storeId));
    return store ? store.name : "Unknown Store";
  };

  useEffect(() => {
    let isMounted = true; // Avoid setting state on unmounted component

    async function fetchStock() {
      setLoading(true);
      setError(null);

      try {
        // If currentUser is not ready, skip
        if (!currentUser || !currentUser.permissions) {
          setInventoryData([]);
          setLoading(false);
          return;
        }

        // Base Supabase query for store_stock_levels
        let query = supabase
          .from("store_stock_levels")
          .select(`
  id,
  store_id,
  stock_item_id,
  quantity,
  last_updated,
  daily_check,
  stock_items (
    sku,
    product_name,
    price,
    category
  )
`);

        // Filter by user role
        if (currentUser.permissions === "store") {
          // Only this store's stock
          const userStoreId = currentUser.store_id || currentUser.storeId;
          if (userStoreId) query = query.eq("store_id", userStoreId);
        } else if (
          currentUser.permissions === "area" &&
          Array.isArray(currentUser.store_ids) &&
          currentUser.store_ids.length > 0
        ) {
          // Area manager: filter for their stores
          query = query.in("store_id", currentUser.store_ids);
        } else if (
          (currentUser.permissions === "admin" || currentUser.permissions === "regional") &&
          storeFilter !== "all"
        ) {
          // Admin/regional can filter by store (if storeFilter provided)
          query = query.eq("store_id", Number(storeFilter));
        }

        const { data, error } = await query;

        if (!isMounted) return;

        if (error) {
          setInventoryData([]);
          setError(error);
        } else {
          setInventoryData(
            (data || []).map((row) => ({
              id: row.id,
              storeId: row.store_id,
              storeName: getStoreName(row.store_id),
              sku: row.stock_items?.sku,
              product: row.stock_items?.product_name,
              price: Number(row.stock_items?.price),
              category: row.stock_items?.category,
              stock: row.quantity,
              status: getStatusFromQty(row.quantity),
              daily_check: !!row.daily_check,
            }))
          );
          setError(null);
        }
      } catch (err) {
        if (!isMounted) return;
        setInventoryData([]);
        setError(err);
      }
      setLoading(false);
    }

    fetchStock();

    // Clean up function to prevent setting state on unmounted component
    return () => {
      isMounted = false;
    };
    // Only rerun when these change
  }, [currentUser, storeFilter, chaiiwalaStores]);

  return { inventoryData, loading, error };
}
