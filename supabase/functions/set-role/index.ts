import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const { user } = await req.json();

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("permissions, store_id")
    .eq("auth_id", user.id)
    .single();

  if (error || !profile) {
    console.log("❌ Could not fetch profile:", error?.message);
    return new Response(JSON.stringify({ error: "No profile found" }), { status: 403 });
  }

  const customClaims: any = {
    role: profile.permissions || "staff",
  };

  if (profile.permissions === "staff") {
    customClaims.store_id = profile.store_id?.toString();
  } else if (profile.permissions === "area") {
    customClaims.stores = profile.store_id?.toString(); // comma-separated string if needed
  }

  return new Response(JSON.stringify({ app_metadata: customClaims }), {
    headers: { "Content-Type": "application/json" },
  });
});
