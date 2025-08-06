import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { getStatusFromQty } from "../lib/utils.js";

// Helper: Pretty print for easier reading in console
function printDebug(title, data) {
  console.log(`--- ${title} ---`);
  console.log(data);
  console.log('----------------------');
}

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
    const id = Number(storeId);
    const store = chaiiwalaStores.find((store) => Number(store.id) === id);
    return store ? store.name : "Unknown Store";
  };

  // ========== FETCH FILTERED INVENTORY (for TABLE) ==========
  useEffect(() => {
    async function fetchStock() {
      setLoading(true);

      if (!currentUser) {
        setInventoryData([]);
        setLoading(false);
        return;
      }

      // Set up base query (but don't call yet)
      let queryBase = supabase
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

      // Apply filtering
      if (isStoreManager) {
        const storeId = Array.isArray(currentUser?.store_ids)
          ? Number(currentUser.store_ids[0])
          : Number(currentUser?.store_id || currentUser?.storeId);
        if (storeId) queryBase = queryBase.eq("store_id", storeId);
      } else if (isArea && Array.isArray(currentUser.store_ids) && currentUser.store_ids.length > 0) {
        queryBase = queryBase.in("store_id", currentUser.store_ids.map(Number));
      } else if (isAdminOrRegional && storeFilter !== "all") {
        queryBase = queryBase.eq("store_id", Number(storeFilter));
      }
      // else, admin/regional with "all" sees all stores

      // Pagination loop
      let allRows = [];
      let page = 0;
      const pageSize = 1000;
      let moreData = true;

      while (moreData) {
        const { data, error } = await queryBase
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          console.error("Inventory data error:", error);
          break;
        }
        if (data && data.length > 0) {
          allRows = allRows.concat(data);
          moreData = data.length === pageSize;
          page++;
        } else {
          moreData = false;
        }
      }

      printDebug("Filtered inventory fetched (ALL ROWS)", allRows);

      const mappedData = (allRows || []).map((row) => ({
        id: row.id,
        storeId: Number(row.store_id),
        storeName: getStoreName(row.store_id),
        sku: row.stock_items?.sku,
        product: row.stock_items?.name,
        price: Number(row.stock_items?.price),
        category: row.stock_items?.category,
        stock: Number(row.quantity) || 0,
        status: getStatusFromQty(row.quantity),
        daily_check: !!row.stock_items?.daily_check,
      }));
      printDebug("Mapped inventoryData for table", mappedData);
      setInventoryData(mappedData);

      setLoading(false);
    }

    fetchStock();
    // eslint-disable-next-line
  }, [currentUser, storeFilter, chaiiwalaStores]);

  // ========== FETCH ALL STOCK LEVELS FOR STORE CARDS (UNFILTERED) ==========
  useEffect(() => {
    if (!chaiiwalaStores.length) {
      setStoreCards([]);
      return;
    }

    async function fetchAllStockForCards() {
      // PAGINATION ADDED HERE!
      let allRows = [];
      let page = 0;
      const pageSize = 1000;
      let moreData = true;

      while (moreData) {
        let { data, error } = await supabase
          .from("store_stock_levels")
          .select("store_id, quantity")
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          console.error("Error fetching all store stock:", error);
          break;
        }
        if (data && data.length > 0) {
          allRows = allRows.concat(data);
          moreData = data.length === pageSize;
          page++;
        } else {
          moreData = false;
        }
      }
      // Print all data fetched
      printDebug("Fetched ALL store_stock_levels for cards (ALL ROWS)", allRows);

      // Print all unique store_ids found
      const allIds = new Set((allRows || []).map(r => Number(r.store_id)));
      printDebug("All unique store_ids in fetched data", Array.from(allIds));

      // Print out all rows for each store (for thoroughness)
      chaiiwalaStores.forEach(store => {
        const sid = Number(store.id);
        const rowsForStore = (allRows || []).filter(row => Number(row.store_id) === sid);
        printDebug(`Rows for store [${store.name}] (id ${sid})`, rowsForStore);
      });

      // Calculate total quantity for each store
      const storeTotals = {};
      (allRows || []).forEach(row => {
        const storeId = Number(row.store_id); // Always cast to number!
        const qty = Number(row.quantity) || 0;
        if (!storeTotals[storeId]) storeTotals[storeId] = 0;
        storeTotals[storeId] += qty;
      });

      printDebug("storeTotals object (sum by id)", storeTotals);

      // Print value that will show on each stat card
      chaiiwalaStores.forEach(store => {
        const cardVal = storeTotals[Number(store.id)] || 0;
        printDebug(
          `Stat card for [${store.name}] (id ${store.id}, type ${typeof store.id})`,
          cardVal
        );
      });

      setStoreCards(
        chaiiwalaStores.map(store => ({
          ...store,
          id: Number(store.id), // force ID to number
          totalQuantity: storeTotals[Number(store.id)] || 0,
        }))
      );
    }

    fetchAllStockForCards();
  }, [chaiiwalaStores]);

  return { inventoryData, loading, storeCards };
}
