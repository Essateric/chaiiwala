// src/components/dashboard/TasksLast30DaysChart.jsx
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";

export default function TasksLast30DaysChart({ stores, selectedStoreId }) {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      // 1. Get the last 30 days as an array of dates (YYYY-MM-DD)
      const today = new Date();
      let dates = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        dates.push(d.toISOString().split("T")[0]);
      }

      // 2. Fetch from Supabase for last 30 days, all stores or one
      let query = supabase
        .from("daily_checklist_status")
        .select("store_id, date, status");

      if (selectedStoreId && selectedStoreId !== "all") {
        query = query.eq("store_id", selectedStoreId);
      } else {
        // all stores
        // no additional filtering
      }
      query = query.gte("date", dates[0]).lte("date", dates[dates.length - 1]);

      const { data, error } = await query;
      if (error) {
        setChartData([]);
        setLoading(false);
        return;
      }

      // 3. Transform for chart (group by date, status)
      const grouped = {};
      dates.forEach(date => {
        grouped[date] = { date, pending: 0, in_progress: 0, completed: 0 };
      });
      data.forEach(row => {
        if (grouped[row.date]) {
          if (row.status === "pending") grouped[row.date].pending += 1;
          else if (row.status === "in progress" || row.status === "in_progress") grouped[row.date].in_progress += 1;
          else if (row.status === "completed") grouped[row.date].completed += 1;
        }
      });
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
