// File: supabase/functions/log-freshways-missed-orders/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

console.log("🔁 Running Freshways missed order check...");

serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const validOrderDays: Record<string, string> = {
    Monday: "Tuesday",
    Tuesday: "Wednesday",
    Thursday: "Friday",
    Friday: "Saturday",
    Saturday: "Monday",
  };

  const now = new Date();
  const orderDay = now.toLocaleDateString("en-GB", { weekday: "long" });

  if (!(orderDay in validOrderDays)) {
    return new Response("Not a valid order day", { status: 200 });
  }

  const deliveryDay = validOrderDays[orderDay];
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 1); // delivery is always the next day
  const deliveryDateISO = deliveryDate.toISOString().split("T")[0];

  // 1. Get all stores
  const { data: stores, error: storesError } = await supabaseClient
    .from("stores")
    .select("id");

  if (storesError) {
    return new Response(JSON.stringify(storesError), { status: 500 });
  }

  // 2. Get all orders placed for that delivery date
  const { data: orders } = await supabaseClient
    .from("freshways_orders")
    .select("store_id, user_id, order_display_id")
    .eq("expected_delivery_date", deliveryDateISO);

  const placedStoreIds = new Set(orders.map((o) => o.store_id));

  // 3. Prepare log entries
  const logs = stores.map((store) => {
    const placedOrder = orders.find((o) => o.store_id === store.id);
    if (placedOrder) {
      return {
        store_id: store.id,
        user_id: placedOrder.user_id,
        delivery_date: deliveryDateISO,
        status: "placed",
        order_id: placedOrder.order_display_id,
      };
    } else {
      return {
        store_id: store.id,
        user_id: null,
        delivery_date: deliveryDateISO,
        status: "missed",
        order_id: null,
      };
    }
  });

  const { error: insertError } = await supabaseClient
    .from("freshways_order_log")
    .upsert(logs, { onConflict: "store_id,delivery_date" });

  if (insertError) {
    return new Response(JSON.stringify(insertError), { status: 500 });
  }

  return new Response("✅ Freshways order log updated", { status: 200 });
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
