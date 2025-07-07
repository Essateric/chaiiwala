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


  // Fetch all daily check stock items
  const { data: dailyCheckStockItems = [], isLoading: isLoadingDailyCheckItems } = useQuery({
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

  const showStoreSelector = useMemo(() => {
    if (!userProfile) return false; // Don't show if profile not loaded
    if (userProfile.permissions === "store") {
      return userProfile.store_ids?.length > 1; // Show if manager of >1 store
    }
    return true; // Show for admin, regional, etc.
  }, [userProfile]);

  if (isAuthLoading) {
    return (
      <div className="bg-[#faebc8] border border-[#f6d67a] rounded-lg p-4 mb-4">
        Loading user data...
      </div>
    );
  }

  return (
    <div className="bg-[#faebc8] border border-[#f6d67a] rounded-lg p-4 mb-4">
      {showStoreSelector && (
        <div className="mb-2 flex items-center">
          <label className="mr-2 font-semibold">Store:</label>
          <select
            className="border rounded p-1 bg-white"
            value={selectedStoreId}
            onChange={e => setSelectedStoreId(e.target.value)}
          >
            {/* Admins/Regionals see "All Stores" option if they are not store managers */}
            {userProfile?.permissions !== "store" && <option value="all">All Stores</option>}
            {storeOptions.map(store => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
        </div>
      )}
      <div className="font-medium mb-2">
        {isLoadingDailyCheckItems ? (
          <span>Loading...</span>
        ) : (
          <span>
            <b>{filteredItems.length}</b> item{filteredItems.length !== 1 ? "s" : ""} for daily check
            {/* Display store name if it's not "all" or if it's a single-store manager */}
            {(selectedStoreId !== "all" || (userProfile?.permissions === "store" && userProfile.store_ids?.length === 1)) && storeOptions.length > 0 && (
              <> for <b>{getStoreName(selectedStoreId) || (storeOptions.length === 1 ? storeOptions[0].name : '')}</b></>
            )}
          </span>
        )}
      </div>
      <div className="mt-2 font-semibold">Daily Stock Check Items</div>
      <div className="text-sm text-gray-700 mt-1"> {/* Changed text color from red for less alarm */}
        {isLoadingDailyCheckItems
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
