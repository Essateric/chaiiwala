import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient.js";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card.jsx";
import { Loader2 } from "lucide-react";
import { PieChart, Pie, Tooltip, Legend, Cell, ResponsiveContainer } from "recharts";

/**
 * MaintenanceRequestsPie — merged with StatsCard header
 * Props:
 * - daysBack: number (default 60)
 * - icon: React component from lucide-react (e.g., Building)
 * - iconColor: tailwind text color class (e.g., "text-blue-600")
 * - iconBgColor: tailwind bg color class (e.g., "bg-blue-100")
 * - change: { value: string, isPositive: boolean, text: string } (optional)
 */
export default function MaintenanceRequestsPie({
  daysBack = 60,
  icon: Icon = null,
  iconColor = "text-blue-600",
  iconBgColor = "bg-blue-100",
  change = null,
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["maintenance_requests_by_store", daysBack],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - daysBack);

      const { data, error } = await supabase
        .from("joblogs")
        .select('id, status, "storeId", created_at, stores(name)')
        .gte("created_at", since.toISOString());

      if (error) throw error;
      return data ?? [];
    },
  });

  const { chartRows, totalOpen } = useMemo(() => {
    const byStore = new Map();

    (data || []).forEach((row) => {
      const s = row.status?.toLowerCase?.();
      const isOpen =
        s === null || s === undefined || s === "pending" || s === "in_progress";
      if (!isOpen) return;

      const storeName = row.stores?.name || `Store #${row["storeId"]}`;
      byStore.set(storeName, (byStore.get(storeName) || 0) + 1);
    });

    const rows = Array.from(byStore, ([name, value]) => ({ name, value }));
    const total = rows.reduce((sum, r) => sum + r.value, 0);
    return { chartRows: rows, totalOpen: total };
  }, [data]);

  const COLORS = [
    "#2563eb","#16a34a","#ea580c","#a855f7","#dc2626",
    "#0ea5e9","#f59e0b","#10b981","#f43f5e","#8b5cf6",
  ];

  return (
    <Card className="relative h-full">
      {/* StatsCard-like header UI */}
      {Icon && (
        <div className="absolute left-4 top-4 z-10">
          <div className={`rounded-full ${iconBgColor} p-2`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
        </div>
      )}
      <div className="absolute right-6 top-6 z-10">
        {isLoading ? (
          <Loader2 className="h-8 w-8 animate-spin text-gray-700" />
        ) : (
          <span className="block text-4xl font-extrabold text-right">
            {totalOpen}
          </span>
        )}
      </div>

      <CardHeader className="pl-20 pr-24 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">
              Open Maintenance Requests
            </CardTitle>
            {change && (
              <div className="mt-0.5 text-xs text-gray-500">
                {change.value} {change.text}
              </div>
            )}
          </div>
          <span className="text-sm text-gray-600">Last {daysBack} days</span>
        </div>
      </CardHeader>

      <CardContent className="h-80">
        {error ? (
          <p className="text-sm text-red-600">{error.message}</p>
        ) : chartRows.length === 0 ? (
          <p className="text-sm text-gray-600">No open maintenance requests.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartRows}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label
              >
                {chartRows.map((entry, index) => (
                  <Cell key={`slice-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(val) => [`${val}`, "Open requests"]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}

        {/* Mini summary */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-gray-500">Total open</div>
            <div className="text-lg font-semibold">
              {isLoading ? "…" : totalOpen}
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-gray-500">Stores with issues</div>
            <div className="text-lg font-semibold">{chartRows.length}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function useOpenMaintenanceCount() {
  return useQuery({
    queryKey: ["open_maintenance_count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("joblogs")
        .select("id, status");
      if (error) throw error;

      return (data || []).filter((r) => {
        const s = r.status?.toLowerCase?.();
        return s === null || s === undefined || s === "pending" || s === "in_progress";
      }).length;
    },
  });
}