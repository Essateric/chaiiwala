import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.jsx";
import { Button } from "../ui/button.jsx";
import { supabase } from "../../lib/supabaseClient.js";
import { Link } from "react-router-dom";

export default function StockCountPanel({
  title = "Stock",
  storeId, // number or string id
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["stock_total_by_store", storeId],
    queryFn: async () => {
      // store name
      const { data: storeRow } = await supabase
        .from("stores")
        .select("id,name")
        .eq("id", storeId)
        .maybeSingle();

      // total quantity for the store
      const { data: rows } = await supabase
        .from("store_stock_levels")
        .select("quantity")
        .eq("store_id", storeId);

      const total = (rows || []).reduce(
        (sum, r) => sum + (Number(r.quantity) || 0),
        0
      );

      return {
        storeName: storeRow?.name ?? `Store ${storeId}`,
        total,
      };
    },
    enabled: !!storeId,
  });

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">
          {title}
          {data?.storeName ? (
            <span className="text-gray-500 font-normal"> — {data.storeName}</span>
          ) : null}
        </CardTitle>
        <Link to="/stock-management">
          <Button size="sm" variant="outline">Open</Button>
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <>
            <div className="text-3xl font-semibold">
              {Number.isFinite(Number(data?.total))
                ? Number(data.total).toFixed(2)
                : "0.00"}
            </div>
            <div className="text-xs text-gray-500 mt-1">Total stock quantity</div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
