import { useState, useMemo } from "react"; // Removed useEffect, added useMemo
import { supabase } from "../../lib/supabaseClient.js";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card.jsx";
import { Button } from "../../components/ui/button.jsx";
import { Input } from "../../components/ui/input.jsx";
import { useAuth } from "../../hooks/UseAuth.jsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"; // Added react-query imports

export default function DailyStockCheck() {
  const { profile } = useAuth();
  const queryClient = useQueryClient(); // Initialize queryClient

  // storeId derived for use in query key and functions
  const storeId = useMemo(() =>
    Array.isArray(profile?.store_ids) && profile.store_ids.length > 0
      ? profile.store_ids[0]
      : null,
    [profile?.store_ids]
  );

  // const [stockItems, setStockItems] = useState([]); // To be replaced by useQuery data
  // const [loading, setLoading] = useState(true); // To be replaced by useQuery isLoading
  const [currentPage, setCurrentPage] = useState(1);
  const [editing, setEditing] = useState({});
  const itemsPerPage = 10;
  const [search, setSearch] = useState('');

  const fetchDailyStockCheckItems = async (currentStoreId) => {
    console.log('[DailyStockCheck] fetchDailyStockCheckItems CALLED for storeId:', currentStoreId, 'at:', new Date().toLocaleTimeString());
    if (!currentStoreId) return []; // Don't fetch if storeId is not available

    // 1. Get all daily_check items
    const { data: items, error: itemError } = await supabase
      .from("stock_items")
      .select("id, sku, name, category, low_stock_threshold, daily_check") // Select specific fields
      .eq("daily_check", true)
      .order("name", { ascending: true });

    if (itemError) {
      console.error("Error fetching stock_items:", itemError);
      throw itemError; // Propagate error to react-query
    }

    const itemIds = items.map(i => i.id);
    if (itemIds.length === 0) return []; // No daily check items found

    // 2. Get store_stock_levels for this store, including last_updated
    let processedLevelData = [];
    const { data: levelData, error: levelsError } = await supabase
      .from("store_stock_levels")
      .select("stock_item_id, quantity, id, last_updated") // Select id directly
      .in("stock_item_id", itemIds)
      .eq("store_id", currentStoreId);

    if (levelsError) {
      console.error("Error fetching store_stock_levels:", levelsError);
      // Propagate the error so react-query can handle it
      throw levelsError;
    }

    if (levelData) {
      processedLevelData = levelData.map(level => ({
        ...level,
        store_stock_level_id: level.id // Create the 'alias' in JS
      }));
    }

    // 3. Merge - ensuring only the most recent stock level for each item is used
    const latestLevelsByItem = {};
    if (processedLevelData) {
      processedLevelData.forEach(level => {
        // Ensure last_updated is valid before comparison
        if (level.last_updated) {
          const existingLevel = latestLevelsByItem[level.stock_item_id];
          if (!existingLevel || new Date(level.last_updated) > new Date(existingLevel.last_updated)) {
            latestLevelsByItem[level.stock_item_id] = level;
          }
        } else if (!latestLevelsByItem[level.stock_item_id]) {
          // If this item has no entry with a last_updated date yet, take this one
          // This case might be less common if last_updated is always set
          latestLevelsByItem[level.stock_item_id] = level;
        }
      });
    }

    const merged = items.map(item => ({
      ...item,
      current_qty: latestLevelsByItem[item.id]?.quantity ?? 0,
      store_stock_level_id: latestLevelsByItem[item.id]?.store_stock_level_id ?? null,
      last_updated: latestLevelsByItem[item.id]?.last_updated ?? null,
    }));
    console.log('[DailyStockCheck] Data RETURNED by fetchDailyStockCheckItems length:', merged?.length, 'First item if exists:', merged?.[0] ? JSON.parse(JSON.stringify(merged[0])) : 'N/A');
    return merged;
  };

  const {
    data: stockListData = [], // Default to empty array
    isLoading, // Replaces manual loading state
    isError,
    error,
    isFetching, // Destructure isFetching
    dataUpdatedAt // Destructure dataUpdatedAt
  } = useQuery({
    queryKey: ['dailyStockCheckItems', storeId],
    queryFn: () => fetchDailyStockCheckItems(storeId),
    enabled: !!storeId, // Only run query if storeId is available
  });

  console.log('[DailyStockCheck] Component Render - useQuery STATE: isLoading:', isLoading, 'isFetching:', isFetching, 'isError:', isError, 'dataUpdatedAt:', dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : 'N/A', 'stockListData length:', stockListData?.length);
  console.log('[DailyStockCheck] stockListData length:', stockListData?.length, 'First item if exists:', stockListData?.[0] ? JSON.parse(JSON.stringify(stockListData[0])) : 'N/A');


  // Pagination & Search now operates on stockListData from useQuery
  const filteredStockItems = useMemo(() => {
    if (!stockListData) return [];
    return search
      ? stockListData.filter(item =>
          (item.name?.toLowerCase().includes(search.toLowerCase()) ||
          item.sku?.toLowerCase().includes(search.toLowerCase()))
        )
      : stockListData;
  }, [stockListData, search]);

const totalPages = Math.ceil(filteredStockItems.length / itemsPerPage);
const pageItems = filteredStockItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);


  // Editing logic for quantity
  const handleEditChange = (id, value) => {
    setEditing((prev) => ({
      ...prev,
      [id]: value
    }));
  };

  // Mutation for saving stock data
  const { mutate: saveStockLevel, isLoading: isSavingStock } = useMutation({
    mutationFn: async ({ item, newQtyString }) => {
      const newQty = Number(newQtyString);
      // Validation for newQty is done in handleSave before calling mutate

      const commonPayloadParts = {
        quantity: newQty,
        last_updated: new Date().toISOString(),
        updated_by: profile?.id ?? null, // Ensure profile.id is the correct FK reference
      };

      console.log("[DailyStockCheck] Attempting to save stock level via useMutation.");
      console.log("[DailyStockCheck] Item details:", JSON.parse(JSON.stringify(item)));
      console.log("[DailyStockCheck] New Quantity (parsed):", newQty);
      console.log("[DailyStockCheck] Store ID for operation:", storeId);
      console.log("[DailyStockCheck] Profile ID (for updated_by):", profile?.id);

      if (item.store_stock_level_id) {
        // Update existing row
        const updateData = { ...commonPayloadParts };
        console.log("[DailyStockCheck] Attempting UPDATE on store_stock_levels.");
        console.log("[DailyStockCheck] Update Condition: id =", item.store_stock_level_id);
        console.log("[DailyStockCheck] Update Payload:", updateData);

        const { error: updateError } = await supabase
          .from("store_stock_levels")
          .update(updateData)
          .eq("id", item.store_stock_level_id);

        if (updateError) {
          console.error("[DailyStockCheck] Supabase update error:", updateError);
          throw updateError; // Propagate error to useMutation's onError
        }
      } else {
        // Insert new row
        const insertData = {
          ...commonPayloadParts,
          stock_item_id: item.id, // This is stock_items.id
          store_id: storeId,
        };
        console.log("[DailyStockCheck] Attempting INSERT into store_stock_levels.");
        console.log("[DailyStockCheck] Insert Payload:", insertData);

        const { error: insertError } = await supabase
          .from("store_stock_levels")
          .insert([insertData]);

        if (insertError) {
          console.error("[DailyStockCheck] Supabase insert error:", insertError);
          throw insertError; // Propagate error to useMutation's onError
        }
      }
    },
    onSuccess: (data, variables) => {
      console.log("[DailyStockCheck] MUTATION onSuccess: Save successful for item ID:", variables.item.id, "at", new Date().toLocaleTimeString());
      console.log("[DailyStockCheck] MUTATION onSuccess: Attempting to invalidate queries with key:", ['dailyStockCheckItems', storeId]);
      queryClient.invalidateQueries({ queryKey: ['dailyStockCheckItems', storeId] });
      console.log("[DailyStockCheck] MUTATION onSuccess: Query invalidation initiated for key:", ['dailyStockCheckItems', storeId]);
      setEditing((prev) => ({ ...prev, [variables.item.id]: undefined }));
    },
    onError: (error, variables) => {
      console.error("[DailyStockCheck] Save failed for item ID:", variables.item.id, error);
      alert(`Error saving stock: ${error.message}`);
      // No need for manual setLoading(false) here
    },
  });

  const handleSave = (item) => {
    const newQtyString = editing[item.id];
    if (typeof newQtyString === "undefined" || newQtyString === "" || isNaN(Number(newQtyString))) {
      alert("Please enter a valid quantity.");
      return;
    }
    saveStockLevel({ item, newQtyString });
  };

  

  return (
    
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Daily Stock Check</CardTitle>
        <p className="text-sm text-gray-500">Update today’s stock levels for all daily-check items.</p>
        {isError && <p className="text-sm text-red-500">Error loading data: {error?.message}</p>}
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
        
        {isLoading ? ( // Use isLoading from useQuery
          <div className="p-8 text-center text-gray-500">Loading stock items...</div>
        ) : pageItems.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {search ? "No items match your search." : "No daily stock items found for this store."}
          </div>
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
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Last Updated</th>
                  <th className="px-4 py-2"></th> {/* For Save button */}
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
                            placeholder="New Qty"
                            className="w-24 text-right" // Adjusted width and alignment
                          />
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-500"> {/* Column for Last Updated */}
                          {item.last_updated
                            ? new Date(item.last_updated).toLocaleString()
                            : "N/A"}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSave(item)}
                            disabled={
                              isSavingStock || // Disable if any save is in progress
                              typeof editing[item.id] === "undefined" ||
                              editing[item.id] === "" ||
                              isNaN(Number(editing[item.id])) ||
                              Number(editing[item.id]) === item.current_qty // Disable if new qty is same as current
                            }
                          >
                            {isSavingStock && editing[item.id] !== undefined ? "Saving..." : "Save"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Pagination controls */}
                {totalPages > 1 && ( // Only show pagination if there's more than one page
                  <div className="flex justify-between items-center mt-4">
                    <span>
                      Page {currentPage} of {totalPages}
                    </span>
                    <div className="space-x-2">
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
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
      </CardContent>
    </Card>
  );
}
