import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient.js";
import { useAuth } from "../../hooks/UseAuth.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs.jsx";
import { formatDeliveryDateVerbose } from "../../lib/formatters.js";

// --- Helpers ---
const startOfWeekISO = (date) => {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // Sunday
  return d.toISOString().slice(0, 10);
};

const startOfTodayISO = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const isoDateOnly = (date) => new Date(date).toISOString().slice(0, 10);

// --- Daily Compliance ---
function DailyStockCheckWidget() {
  const { profile } = useAuth();
  const isRegional = profile?.permissions === "regional" || profile?.permissions === "admin";
  const todayStart = startOfTodayISO();
  const todayDateOnly = isoDateOnly(new Date());

  const { data: stores = [] } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name");
      if (error) throw error;
      return data;
    },
  });

  const { data: stockLevels = [] } = useQuery({
    queryKey: ["daily_stock_levels", todayStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_stock_levels")
        .select("store_id, last_updated")
        .gte("last_updated", todayStart);
      if (error) throw error;
      return data;
    },
    refetchOnWindowFocus: true,
    refetchInterval: 300000,
  });

  const completedStores = useMemo(() => {
    const set = new Set();
    for (const entry of stockLevels) {
      set.add(entry.store_id);
    }
    return Array.from(set);
  }, [stockLevels]);

  const totalStores = stores.length;
  const completedCount = completedStores.length;
  const missedStores = stores.filter((s) => !completedStores.includes(s.id));

  if (!isRegional) return null;

  return (
    <div className="bg-white border border-gray-300 rounded-lg p-4 shadow mb-6">
      <h2 className="text-lg font-semibold mb-2">📆 Daily Stock Check Compliance</h2>
      <p className="mb-2 text-sm text-gray-600">
        Based on updates today (<strong>{formatDeliveryDateVerbose(todayDateOnly)}</strong>)
      </p>
      <div className="mb-4">
        <span className="text-2xl font-bold text-green-600">{completedCount}</span>
        <span className="text-gray-700 ml-2">out of</span>
        <span className="text-2xl font-bold ml-2">{totalStores}</span>
        <span className="text-gray-700 ml-2">stores completed today's check</span>
      </div>

      {completedStores.length > 0 && (
        <div className="bg-green-50 border border-green-300 p-3 rounded mb-4">
          <p className="font-semibold text-green-700 mb-1">✅ Stores that completed today:</p>
          <ul className="list-disc list-inside text-sm text-green-800">
            {stores
              .filter((store) => completedStores.includes(store.id))
              .map((store) => (
                <li key={store.id}>{store.name}</li>
              ))}
          </ul>
        </div>
      )}

      {missedStores.length > 0 ? (
        <div className="bg-red-50 border border-red-300 p-3 rounded">
          <p className="font-semibold text-red-700 mb-1">❌ Stores that haven't checked today:</p>
          <ul className="list-disc list-inside text-sm text-red-800">
            {missedStores.map((store) => (
              <li key={store.id}>{store.name}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-300 p-3 rounded text-green-700">
          ✅ All stores have completed today's stock check.
        </div>
      )}
    </div>
  );
}

// --- Weekly Compliance ---
function WeeklyStockCheckWidget() {
  const { profile } = useAuth();
  const isRegional = profile?.permissions === "regional" || profile?.permissions === "admin";
  const sunday = startOfWeekISO(new Date());

  const { data: stores = [] } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name");
      if (error) throw error;
      return data;
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
      return data;
    },
    refetchOnWindowFocus: true,
    refetchInterval: 300000,
  });

  const completedStores = useMemo(() => {
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

  const totalStores = stores.length;
  const completedCount = completedStores.length;
  const missedStores = stores.filter((store) => !completedStores.includes(store.id));

  if (!isRegional) return null;

  return (
    <div className="bg-white border border-gray-300 rounded-lg p-4 shadow mb-6">
      <h2 className="text-lg font-semibold mb-2">📦 Weekly Stock Check Compliance</h2>
      <p className="mb-2 text-sm text-gray-600">
        Based on updates since <strong>{formatDeliveryDateVerbose(sunday)}</strong>
      </p>
      <div className="mb-4">
        <span className="text-2xl font-bold text-green-600">{completedCount}</span>
        <span className="text-gray-700 ml-2">out of</span>
        <span className="text-2xl font-bold ml-2">{totalStores}</span>
        <span className="text-gray-700 ml-2">stores completed the weekly check</span>
      </div>

      {completedStores.length > 0 && (
        <div className="bg-green-50 border border-green-300 p-3 rounded mb-4">
          <p className="font-semibold text-green-700 mb-1">✅ Stores that completed weekly check:</p>
          <ul className="list-disc list-inside text-sm text-green-800">
            {stores
              .filter((store) => completedStores.includes(store.id))
              .map((store) => (
                <li key={store.id}>{store.name}</li>
              ))}
          </ul>
        </div>
      )}

      {missedStores.length > 0 ? (
        <div className="bg-red-50 border border-red-300 p-3 rounded">
          <p className="font-semibold text-red-700 mb-1">❌ Stores that missed weekly check:</p>
          <ul className="list-disc list-inside text-sm text-red-800">
            {missedStores.map((store) => (
              <li key={store.id}>{store.name}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-300 p-3 rounded text-green-700">
          ✅ All stores have completed the weekly stock check.
        </div>
      )}
    </div>
  );
}

// --- Panel Toggle ---
export default function StockCheckCompliancePanel() {
  return (
    <div className="w-full">
      <Tabs defaultValue="daily" className="mb-2">
        <TabsList className="grid grid-cols-2 w-full max-w-xs">
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <DailyStockCheckWidget />
        </TabsContent>

        <TabsContent value="weekly">
          <WeeklyStockCheckWidget />
        </TabsContent>
      </Tabs>
    </div>
  );
}
