import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { Loader2, AlertCircle } from "lucide-react";

export default function TasksLast7DaysChart({ stores, selectedStoreId }) {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // ❗ If no store is selected (or "all"), show the empty state and skip querying
      if (!selectedStoreId || selectedStoreId === "all") {
        setChartData([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      // 1) Build last 7 dates as YYYY-MM-DD
      const today = new Date();
      let dates = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        dates.push(d.toISOString().split("T")[0]);
      }

      // 2) Fetch rows just for the selected store (limit kept from your fix)
      let query = supabase
        .from("daily_checklist_status")
        .select("store_id, date, status")
        .limit(10000)
        .eq("store_id", selectedStoreId)
        .gte("date", dates[0])
        .lte("date", dates[dates.length - 1]);

      const { data, error } = await query;
      if (error) {
        console.error("[TasksLast7DaysChart] fetch error:", error.message);
        setChartData([]);
        setLoading(false);
        return;
      }

      // 3) Group by date -> pending/in_progress/completed
      const grouped = {};
      dates.forEach((date) => {
        grouped[date] = { date, pending: 0, in_progress: 0, completed: 0 };
      });

      data.forEach((row) => {
        if (!grouped[row.date]) return;
        if (row.status === "pending") grouped[row.date].pending += 1;
        else if (["in progress", "in_progress"].includes(row.status))
          grouped[row.date].in_progress += 1;
        else if (row.status === "completed") grouped[row.date].completed += 1;
      });

      setChartData(Object.values(grouped));
      setLoading(false);
    }

    fetchData();
  }, [selectedStoreId]);

  // 🔹 Empty state when no store is selected
  if (!selectedStoreId || selectedStoreId === "all") {
    return (
      <div className="bg-white rounded-xl shadow p-4 mt-6 relative">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-yellow-100 p-2">
            <AlertCircle className="h-5 w-5 text-yellow-700" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Tasks (Last 7 Days)</h3>
            <p className="text-sm text-gray-600">
              Select a store to view the last 7 days chart for that store.
            </p>
            <button
              type="button"
              onClick={() => document.getElementById("taskStoreSelect")?.focus()}
              className="mt-3 inline-flex items-center rounded-md bg-chai-gold/90 px-3 py-1.5 text-white hover:bg-chai-gold"
            >
              Go to store selector
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow p-4 mt-6">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-lg">Tasks (Last 7 Days)</h3>
        <span className="text-xs text-gray-500">Showing selected store</span>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-chai-gold" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="pending" stroke="#FFA500" name="Pending" />
            <Line type="monotone" dataKey="in_progress" stroke="#2196F3" name="In Progress" />
            <Line type="monotone" dataKey="completed" stroke="#4CAF50" name="Completed" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
