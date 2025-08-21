// File: src/components/orders/ChaiiwalaOrderStatusWidget.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card.jsx";
import { ShoppingCart } from "lucide-react";

console.log("[ChaiiwalaOrderStatusWidget] BUILD_ID v4");

function formatDeliveryDateVerbose(dateISO) {
  if (!dateISO) return "N/A";
  const d = new Date(dateISO);
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function ChaiiwalaOrderStatusWidget({
  stores: storesProp,
  deliveryDateISO,
}) {
  const [stores, setStores] = useState(Array.isArray(storesProp) ? storesProp : []);
  const [ordersToday, setOrdersToday] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");// Ensure storeName is safe for filenames (replace spaces etc.)

  // If parent didn't pass stores, fetch all stores once.
  useEffect(() => {
    let isMounted = true;
    async function loadStores() {
      if (Array.isArray(storesProp) && storesProp.length) return;
      const { data, error } = await supabase.from("stores").select("*");
      if (!isMounted) return;
      if (error) setLoadError(error.message || "Failed to load stores");
      else setStores(Array.isArray(data) ? data : []);
    }
    loadStores();
    return () => { isMounted = false; };
  }, [storesProp]);

  // Fetch today's chaiiwala orders
  useEffect(() => {
    let isMounted = true;
    async function loadOrders() {
      setIsLoading(true);
      setLoadError("");
      const now = new Date();
      const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
      const endOfToday   = new Date(now); endOfToday.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("chaiiwala_orders")
        .select("id, store_id, store_name, uploaded_at")
        .gte("uploaded_at", startOfToday.toISOString())
        .lte("uploaded_at", endOfToday.toISOString())
        .order("uploaded_at", { ascending: true });

      if (!isMounted) return;
      if (error) {
        setLoadError(error.message || "Failed to load orders");
        setOrdersToday([]);
      } else {
        setOrdersToday(Array.isArray(data) ? data : []);
      }
      setIsLoading(false);
    }
    loadOrders();
    return () => { isMounted = false; };
  }, []);

  // Build a per-store merged view
  const mergedLogs = useMemo(() => {
    if (!Array.isArray(stores) || stores.length === 0) return [];
    const firstByStore = new Map();
    for (const row of ordersToday || []) {
      if (!firstByStore.has(row.store_id)) firstByStore.set(row.store_id, row);
    }
    return stores.map((s) => {
      const hit = firstByStore.get(s.id);
      return {
        storeName: s.name,
        status: hit ? "placed" : "no_entry",
        createdAt: hit ? hit.uploaded_at : null,
      };
    });
  }, [stores, ordersToday]) || [];

  const safeLogs = Array.isArray(mergedLogs) ? mergedLogs : [];

  return (
    <Card className="relative bg-green-50 border border-green-100 shadow-sm h-full">
      <div className="absolute left-4 top-4">
        <div className="rounded-full bg-green-100 p-2">
          <ShoppingCart className="h-6 w-6 text-green-600" />
        </div>
      </div>
      <CardHeader className="pl-20 pt-4 pb-2">
        <CardTitle className="text-base font-bold text-gray-800">
          Chaiiwala Order Status
        </CardTitle>
        <CardDescription>
          for delivery {deliveryDateISO ? `on ${formatDeliveryDateVerbose(deliveryDateISO)}` : "today"}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {loadError ? (
          <p className="text-sm text-red-600">Error: {loadError}</p>
        ) : isLoading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : safeLogs.length === 0 ? (
          <p className="text-gray-500 text-sm">No stores available</p>
        ) : (
          <table className="w-full text-sm text-gray-700">
            <thead>
              <tr className="text-left border-b text-xs text-gray-400">
                <th className="py-1">Store</th>
                <th className="py-1">Status</th>
                <th className="py-1">Uploaded At</th>
              </tr>
            </thead>
            <tbody>
              {safeLogs.map((log, idx) => (
                <tr key={idx} className="border-b">
                  <td className="py-2">{log.storeName}</td>
                  <td className="py-2">
                    {log.status === "placed" ? (
                      <span className="text-green-600 font-semibold">Placed</span>
                    ) : (
                      <span className="text-yellow-600 font-semibold">No Entry</span>
                    )}
                  </td>
                  <td className="py-2">
                    {log.status === "placed" && log.createdAt
                      ? new Date(log.createdAt).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
