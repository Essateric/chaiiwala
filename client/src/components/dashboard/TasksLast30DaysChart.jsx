import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";

/**
 * Shows last 30 days of task status counts for checklist, for either
 * a specific store or all stores together.
 *
 * @param {Array} stores - Array of store objects (optional, for future)
 * @param {string|number} selectedStoreId - "all" or a specific store ID
 */
export default function TasksLast30DaysChart({ stores, selectedStoreId }) {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
useEffect(() => {
  async function fetchData() {
    setLoading(true);
    // 1. Array of last 30 days as YYYY-MM-DD
    const today = new Date();
    let dates = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.push(d.toISOString().split("T")[0]);
    }

    // 2. Fetch all relevant rows for 30 days, all stores or single
    let query = supabase
      .from("daily_checklist_status")
      .select("store_id, date, status")
      .limit(10000); // <--- THIS IS THE FIX!

    if (selectedStoreId && selectedStoreId !== "all") {
      query = query.eq("store_id", selectedStoreId);
    }
    query = query.gte("date", dates[0]).lte("date", dates[dates.length - 1]);

    const { data, error } = await query;
    if (error) {
      setChartData([]);
      setLoading(false);
      return;
    }

    // PRINT the data returned for today, and pending
    const todayStr = dates[dates.length - 1];
    const pendingToday = data.filter(
      (row) => row.date === todayStr && row.status === "pending"
    );
    console.log("ALL DATA for today:", data.filter(row => row.date === todayStr));
    console.log("PENDING DATA for today:", pendingToday);
    console.log("Count PENDING for today (should be 77):", pendingToday.length);

    // 3. Group by date: sum all for that date, across all stores
    const grouped = {};
    dates.forEach((date) => {
      grouped[date] = { date, pending: 0, in_progress: 0, completed: 0 };
    });
    data.forEach((row) => {
      if (grouped[row.date]) {
        if (row.status === "pending") grouped[row.date].pending += 1;
        else if (["in progress", "in_progress"].includes(row.status))
          grouped[row.date].in_progress += 1;
        else if (row.status === "completed") grouped[row.date].completed += 1;
      }
    });
    // PRINT grouped chart data for today
    console.log("Grouped for chart (should have 77 pending for today):", grouped[todayStr]);
    setChartData(Object.values(grouped));
    setLoading(false);
  }
  fetchData();
}, [selectedStoreId]);



  return (
    <div className="bg-white rounded-xl shadow p-4 mt-6">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-lg">Tasks (Last 30 Days)</h3>
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
