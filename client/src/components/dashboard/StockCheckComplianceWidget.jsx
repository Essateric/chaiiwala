import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient.js";
import { useAuth } from "../../hooks/UseAuth.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs.jsx";
import { formatDeliveryDateVerbose } from "../../lib/formatters.js";
import { CheckCircle2, XCircle, Dot } from "lucide-react";

/* Helpers */
const pad2 = (n) => String(n).padStart(2, "0");
const ymd = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const startOfDayISO = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
};
const endOfDayISO = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.toISOString();
};
const startOfWeekISO = (date) => {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // Sunday
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

/* ---------- Shared presentational block (keeps logic from callers) ---------- */
function ComplianceBlock({ title, subtitle, stores, completedStoresIds }) {
  const totalStores = stores.length;
  const doneStores = stores.filter((s) => completedStoresIds.includes(s.id));
  const missedStores = stores.filter((s) => !completedStoresIds.includes(s.id));
  const completedCount = doneStores.length;
  const percent = totalStores ? Math.round((completedCount / totalStores) * 100) : 0;

return (
  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-4">
    {/* Header */}
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-gray-900 leading-tight">
          {title}
        </h3>
        <p className="mt-0.5 text-xs text-gray-600 truncate">{subtitle}</p>
      </div>

      <div className="text-right shrink-0">
        <div className="text-[22px] font-bold leading-none text-emerald-600">
          {completedCount}
          <span className="text-gray-900 text-base font-semibold"> / {totalStores}</span>
        </div>
        <div className="mt-1 text-[11px] text-gray-500">stores completed</div>
      </div>
    </div>

    {/* Progress */}
    <div className="w-full h-1.5 rounded bg-gray-200 overflow-hidden">
      <div
        className="h-full bg-emerald-500 transition-all"
        style={{ width: `${percent}%` }}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progress ${percent}%`}
      />
    </div>

    {/* Lists */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Completed */}
      <section className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
            <span>Stores that completed</span>
          </div>
          <span className="text-xs font-medium text-emerald-700">{doneStores.length}</span>
        </header>

        {doneStores.length === 0 ? (
          <p className="mt-2 text-xs text-emerald-700">— None —</p>
        ) : (
          <ul className="mt-2 divide-y divide-emerald-100 rounded">
            {doneStores.map((store) => (
              <li key={store.id} className="py-1.5 text-sm text-emerald-900 flex items-center">
                <Dot className="h-5 w-5 -ml-1" />
                <span className="truncate">{store.name}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Missed */}
      <section className="rounded-md border border-rose-200 bg-rose-50 p-3">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-800">
            <XCircle className="h-4 w-4" />
            <span>Stores that missed</span>
          </div>
          <span className="text-xs font-medium text-rose-700">{missedStores.length}</span>
        </header>

        {missedStores.length === 0 ? (
          <p className="mt-2 text-xs text-rose-700">— None —</p>
        ) : (
          <ul className="mt-2 divide-y divide-rose-100 rounded">
            {missedStores.map((store) => (
              <li key={store.id} className="py-1.5 text-sm text-rose-900 flex items-center">
                <Dot className="h-5 w-5 -ml-1" />
                <span className="truncate">{store.name}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  </div>
);
}

/* --- Today --- */
function DailyStockCheckWidget() {
  const { profile } = useAuth();
  const isRegional = profile?.permissions === "regional" || profile?.permissions === "admin";
  if (!isRegional) return null;

  const today = new Date();
  const startISO = startOfDayISO(today);
  const endISO = endOfDayISO(today);

  const { data: stores = [] } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: stockLevels = [] } = useQuery({
    queryKey: ["daily_stock_levels", startISO, endISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_stock_levels")
        .select("store_id, last_updated")
        .gte("last_updated", startISO)
        .lte("last_updated", endISO);
      if (error) throw error;
      return data || [];
    },
    refetchOnWindowFocus: true,
    refetchInterval: 300000,
  });

  const completedStoresIds = useMemo(() => {
    const set = new Set();
    for (const entry of stockLevels) set.add(Number(entry.store_id));
    return Array.from(set);
  }, [stockLevels]);

  return (
    <ComplianceBlock
      title="📆 Daily Stock Check Compliance"
      subtitle={`Based on updates today (${formatDeliveryDateVerbose(ymd(today))})`}
      stores={stores}
      completedStoresIds={completedStoresIds}
    />
  );
}

/* --- Yesterday --- */
function YesterdayStockCheckWidget() {
  const { profile } = useAuth();
  const isRegional = profile?.permissions === "regional" || profile?.permissions === "admin";
  if (!isRegional) return null;

  const y = new Date();
  y.setDate(y.getDate() - 1);
  const startISO = startOfDayISO(y);
  const endISO = endOfDayISO(y);

  const { data: stores = [] } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: stockLevels = [] } = useQuery({
    queryKey: ["yesterday_stock_levels", startISO, endISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_stock_levels")
        .select("store_id, last_updated")
        .gte("last_updated", startISO)
        .lte("last_updated", endISO);
      if (error) throw error;
      return data || [];
    },
    refetchOnWindowFocus: true,
    refetchInterval: 300000,
  });

  const completedStoresIds = useMemo(() => {
    const set = new Set();
    for (const entry of stockLevels) set.add(Number(entry.store_id));
    return Array.from(set);
  }, [stockLevels]);

  return (
    <ComplianceBlock
      title="📆 Yesterday’s Stock Check Compliance"
      subtitle={`Based on updates for yesterday (${formatDeliveryDateVerbose(ymd(y))})`}
      stores={stores}
      completedStoresIds={completedStoresIds}
    />
  );
}

/* --- Weekly (since Sunday) --- */
function WeeklyStockCheckWidget() {
  const { profile } = useAuth();
  const isRegional = profile?.permissions === "regional" || profile?.permissions === "admin";
  if (!isRegional) return null;

  const sunday = startOfWeekISO(new Date());

  const { data: stores = [] } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: stockLevels = [] } = useQuery({
    queryKey: ["weekly_stock_levels", sunday],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_stock_levels")
        .select("store_id, last_updated")
        .gte("last_updated", sunday);
      if (error) throw error;
      return data || [];
    },
    refetchOnWindowFocus: true,
    refetchInterval: 300000,
  });

  const completedStoresIds = useMemo(() => {
    const latestByStore = {};
    for (const entry of stockLevels) {
      if (
        !latestByStore[entry.store_id] ||
        new Date(entry.last_updated) > new Date(latestByStore[entry.store_id])
      ) {
        latestByStore[entry.store_id] = entry.last_updated;
      }
    }
    return Object.keys(latestByStore).map((id) => Number(id));
  }, [stockLevels]);

  return (
    <ComplianceBlock
      title="📦 Weekly Stock Check Compliance"
      subtitle={`Based on updates since ${formatDeliveryDateVerbose(sunday)} (Sundays)`}
      stores={stores}
      completedStoresIds={completedStoresIds}
    />
  );
}

/* --- Panel with 3 tabs --- */
export default function StockCheckCompliancePanel() {
  return (
    <div className="w-full">
      <Tabs defaultValue="daily" className="mb-2">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="weekly">Weekly (Sundays)</TabsTrigger>
          <TabsTrigger value="daily">Today</TabsTrigger>
          <TabsTrigger value="yesterday">Yesterday</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly">
          <WeeklyStockCheckWidget />
        </TabsContent>

        <TabsContent value="daily">
          <DailyStockCheckWidget />
        </TabsContent>

        <TabsContent value="yesterday">
          <YesterdayStockCheckWidget />
        </TabsContent>
      </Tabs>
    </div>
  );
}
