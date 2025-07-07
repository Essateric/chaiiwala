import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../hooks/UseAuth.jsx"; // Import useAuth

export default function StockWidget() {
  const { profile: userProfile, isLoading: isAuthLoading } = useAuth(); // Get user profile

  const { data: stores = [] } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!userProfile // Ensure stores are fetched only after profile is available
  });

  const [selectedStoreId, setSelectedStoreId] = useState("all");

  useEffect(() => {
    if (userProfile?.permissions === "store") {
      if (userProfile.store_ids?.length > 0) {
        setSelectedStoreId(String(userProfile.store_ids[0]));
      } else {
        setSelectedStoreId(null); // No specific store selected if manager has no stores
      }
    } else if (userProfile?.permissions !== "store") { // Admin, regional etc.
      setSelectedStoreId("all");
    }
  }, [userProfile]);

  // Determine stores to display in dropdown
  const storeOptions = useMemo(() => {
    if (!userProfile || !stores.length) return [];
    if (userProfile.permissions === "store") {
      if (userProfile.store_ids?.length > 0) {
        return stores.filter(store => userProfile.store_ids.includes(store.id));
      }
      return []; // No options if store manager has no assigned stores
    }
    // For admin/regional or other roles, show all stores
    return stores;
  }, [stores, userProfile]);


  // Query 1: Fetch base daily check items (metadata)
  const { data: baseDailyCheckItems = [], isLoading: isLoadingBaseItems } = useQuery({
    queryKey: ["base_daily_check_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_items")
        .select("id, name, sku, category, low_stock_threshold, price, quantity_per_unit") // Removed quantity, store_id
        .eq("daily_check", true);
      if (error) throw error;
      return data || [];
    }
  });

  const dailyCheckItemIds = useMemo(() => baseDailyCheckItems.map(item => item.id), [baseDailyCheckItems]);

  // Query 2: Fetch all store stock levels for the daily check items
  const { data: allStoreStockLevels = [], isLoading: isLoadingStockLevels } = useQuery({
    queryKey: ["store_stock_levels_for_daily_check", dailyCheckItemIds],
    queryFn: async () => {
      if (!dailyCheckItemIds || dailyCheckItemIds.length === 0) {
        return []; // No items to fetch levels for
      }
      const { data, error } = await supabase
        .from("store_stock_levels")
        .select("stock_item_id, store_id, quantity, id as store_stock_level_id") // id is primary key of store_stock_levels
        .in("stock_item_id", dailyCheckItemIds);
      if (error) throw error;
      return data || [];
    },
    enabled: dailyCheckItemIds.length > 0 // Only run if there are item IDs
  });

  // isLoading state for the component should consider both queries
  const isLoading = isLoadingBaseItems || isLoadingStockLevels;

  // Filter by store if selected - THIS WILL BE REPLACED by processedDailyCheckItems in next step
  // For now, let's adapt it minimally or comment out if it breaks due to schema changes.
  // The `filteredItems` logic will be completely overhauled in the next step.
  // Helper
  const getStoreName = id =>
    stores.find(s => String(s.id) === String(id))?.name || "Unknown";

  const processedDailyCheckItems = useMemo(() => {
    if (isLoadingBaseItems || isLoadingStockLevels) return []; // Still loading upstream data

    if (!selectedStoreId && userProfile?.permissions === "store" && userProfile.store_ids?.length === 0) {
        // Store manager with no stores assigned, selectedStoreId might be null
        return [];
    }

    if (selectedStoreId && selectedStoreId !== "all") {
      // Specific store selected (or store manager view)
      return baseDailyCheckItems.map(item => {
        const level = allStoreStockLevels.find(
          l => String(l.stock_item_id) === String(item.id) && String(l.store_id) === String(selectedStoreId)
        );
        const quantity = level ? level.quantity : null; // null if no record, vs 0 quantity
        const isLow = quantity !== null && item.low_stock_threshold !== null && quantity < item.low_stock_threshold;
        return {
          ...item,
          displayQuantity: quantity === null ? "N/A" : quantity,
          isLowStock: isLow,
          storeName: getStoreName(selectedStoreId), // Store context is the selected store
        };
      }).filter(item => item.displayQuantity !== "N/A"); // Optionally, only show items that exist in the store's stock levels
    } else if (selectedStoreId === "all" && userProfile?.permissions !== "store") {
      // "All Stores" selected by Admin/Regional
      // For each base item, determine if it's low in ANY of the available stores.
      return baseDailyCheckItems.map(item => {
        let lowStockInStores = [];
        for (const store of stores) { // 'stores' contains all store objects
          const level = allStoreStockLevels.find(
            l => String(l.stock_item_id) === String(item.id) && String(l.store_id) === String(store.id)
          );
          if (level && item.low_stock_threshold !== null && level.quantity < item.low_stock_threshold) {
            lowStockInStores.push(store.name);
          }
        }
        return {
          ...item,
          displayQuantity: "Varies", // General placeholder for "All Stores"
          isLowStock: lowStockInStores.length > 0,
          lowStockSummary: lowStockInStores.length > 0 ? `Low in: ${lowStockInStores.join(', ')}` : "",
          storeName: "All Stores",
        };
      });
    }
    return []; // Default empty if no case matches (e.g. initial state for admin before 'all' is set)
  }, [baseDailyCheckItems, allStoreStockLevels, selectedStoreId, userProfile, stores, isLoadingBaseItems, isLoadingStockLevels, getStoreName]);


  const showStoreSelector = useMemo(() => {
    if (!userProfile) return false;
    if (userProfile.permissions === "store") {
      return userProfile.store_ids?.length > 1;
    }
    return true;
  }, [userProfile]);

  if (isAuthLoading) { // This is from useAuth(), for user profile
    return (
      <div className="bg-[#faebc8] border border-[#f6d67a] rounded-lg p-4 mb-4">
        Loading user data...
      </div>
    );
  }

  // Use combined isLoading for component's main loading state
  // if (isLoading) { // isLoading = isLoadingBaseItems || isLoadingStockLevels;
  //   return (
  //     <div className="bg-[#faebc8] border border-[#f6d67a] rounded-lg p-4 mb-4">
  //       Loading stock data...
  //     </div>
  //   );
  // }

  return (
    <div className="bg-[#faebc8] border border-[#f6d67a] rounded-lg p-4 mb-4">
      {showStoreSelector && (
        <div className="mb-2 flex items-center">
          <label className="mr-2 font-semibold">Store:</label>
          <select
            className="border rounded p-1 bg-white"
            value={selectedStoreId} // This should be correctly initialized by useEffect
            onChange={e => setSelectedStoreId(e.target.value)}
          >
            {userProfile?.permissions !== "store" && <option value="all">All Stores</option>}
            {storeOptions.map(store => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
        </div>
      )}
      <div className="font-medium mb-2">
        {isLoading ? ( // Combined loading state
          <span>Loading items...</span>
        ) : (
          <span>
            <b>{processedDailyCheckItems.length}</b> item{processedDailyCheckItems.length !== 1 ? "s" : ""} for daily check
            {(selectedStoreId && selectedStoreId !== "all" || (userProfile?.permissions === "store" && userProfile.store_ids?.length === 1)) && (
              <> for <b>{getStoreName(selectedStoreId)}</b></>
            )}
          </span>
        )}
      </div>
      <div className="mt-2 font-semibold">Daily Stock Check Items</div>
      <div className="text-sm text-gray-700 mt-1">
        {isLoading ? ( // Combined loading state
          "Loading details..."
        ) : processedDailyCheckItems.length === 0 ? (
          selectedStoreId === "all" && userProfile?.permissions !== "store"
            ? "No items marked for daily check, or no stock levels reported."
            : "No items for daily check in this store, or no stock levels reported."
        ) : (
          <ul className="list-disc ml-5">
            {processedDailyCheckItems.map(item => (
              <li key={item.id}>
                {item.name} (SKU: {item.sku})
                {selectedStoreId && selectedStoreId !== "all" && (
                  <>
                    , Qty: {item.displayQuantity}
                    {item.isLowStock && <span className="text-red-600 font-bold ml-2">LOW STOCK</span>}
                  </>
                )}
                {selectedStoreId === "all" && item.isLowStock && (
                  <span className="text-orange-600 font-semibold ml-2">({item.lowStockSummary || "Low Stock in some stores"})</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
