import React, { useState, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { useQuery } from "@tanstack/react-query";

export default function DailyChecklistStatusWidget() {
  const { data: stores = [] } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name");
      if (error) throw error;
      return data || [];
    }
  });

  const [selectedStoreId, setSelectedStoreId] = useState("all");
  const today = new Date().toISOString().slice(0, 10);

  const { data: checklistRows = [], isLoading } = useQuery({
    queryKey: ["daily_checklist_status", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_checklist_status")
        .select("id, task_id, store_id, status, date, completed_at");
      if (error) throw error;
      return data || [];
    }
  });

  // Normalize store_id as string for consistency
  const normalizedRows = useMemo(() => {
    return (checklistRows || []).map(row => ({
      ...row,
      store_id: row.store_id?.toString()
    }));
  }, [checklistRows]);

  // Filter rows for the selected store
  const filteredRows = useMemo(() => {
    if (selectedStoreId === "all") return normalizedRows;
    return normalizedRows.filter(row => row.store_id === selectedStoreId);
  }, [normalizedRows, selectedStoreId]);

  // Count unique task entries across all stores
  const taskCount = useMemo(() => {
    if (selectedStoreId === "all") {
      const uniquePairs = new Set(
        normalizedRows.map(row => `${row.store_id}-${row.task_id}`)
      );
      return uniquePairs.size;
    } else {
      return filteredRows.length;
    }
  }, [normalizedRows, filteredRows, selectedStoreId]);

  return (
    <div className="bg-[#faebc8] border border-[#f6d67a] rounded-lg p-4 mb-4">
      <div className="mb-2 flex items-center">
        <label className="mr-2 font-semibold">Store:</label>
        <select
          value={selectedStoreId}
          onChange={e => setSelectedStoreId(e.target.value)}
          className="border rounded p-1 bg-white"
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
            <b>{taskCount}</b> tasks for{" "}
            {selectedStoreId === "all"
              ? "all stores"
              : stores.find(s => String(s.id) === selectedStoreId)?.name}
          </span>
        )}
      </div>

      <div className="mt-2 font-semibold">Today's Tasks</div>
      <div className="text-sm text-gray-600 mt-1">
        {isLoading ? (
          "Loading..."
        ) : filteredRows.length === 0 ? (
          "No tasks for today."
        ) : (
          <ul className="list-disc ml-5">
            {filteredRows.map(row => (
              <li key={row.id}>
                Task #{row.task_id}
                {row.status === "completed" ? " (Completed)" : ""}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
