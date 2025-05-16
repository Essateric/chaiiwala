/// <reference types="jsr:@supabase/functions-js/edge-runtime" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseAdmin = createClient(
  Deno.env.get("PROJECT_URL")!,
  Deno.env.get("SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    const body = await req.json();
    const specificEmail = body?.email;

    let profilesQuery = supabaseAdmin
      .from("profiles")
      // Ensure you select all necessary fields from profiles table
      .select("id, name, first_name, last_name, email, auth_id, permissions, store_id, store_ids");

    if (specificEmail) {
      profilesQuery = profilesQuery.eq("email", specificEmail);
    }

    const { data: profiles, error: fetchError } = await profilesQuery;

    if (fetchError) {
      console.log("❌ Failed to fetch profiles:", fetchError.message);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    let createdCount = 0;
    let skipped = 0;
    const messages: string[] = [];

    for (const user of profiles) {
      if (!user.email || user.auth_id) {
        console.log(`⏭ Skipping user ${user.email} (missing email or already has auth_id)`);
        skipped++;
        continue;
      }
      console.log("👤 Attempting auth create for:", user.email);

      const user_metadata_payload: Record<string, any> = {
        name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        first_name: user.first_name || user.name?.split(" ")[0] || '',
        last_name: user.last_name || user.name?.split(" ").slice(1).join(" ") || '',
      };

      const app_metadata_payload: Record<string, any> = {
        user_role: user.permissions,
      };

      // Handle store_id (primary) and store_ids (array)
      if (user.store_id && !isNaN(Number(user.store_id))) {
        app_metadata_payload.primary_store_id = Number(user.store_id);
        // If store_ids array isn't on the profile, use primary_store_id to form it
        app_metadata_payload.user_store_ids = user.store_ids && user.store_ids.length > 0 ? user.store_ids.map(Number).filter(id => !isNaN(id)) : [Number(user.store_id)];
      } else if (user.store_ids && user.store_ids.length > 0) {
        app_metadata_payload.user_store_ids = user.store_ids.map(Number).filter(id => !isNaN(id));
        app_metadata_payload.primary_store_id = app_metadata_payload.user_store_ids[0]; // Default to first in array
      }

      const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: "password123", // SECURITY RISK: Still hardcoded. Consider a flow to force password reset.
        email_confirm: true,
        user_metadata: user_metadata_payload,
        app_metadata: app_metadata_payload,
      });

  if (createError || !authUser?.user?.id) {
  console.log(`❌ Failed to create auth for ${user.email}:`, createError?.message || "No user returned");
  messages.push(`Failed for ${user.email}: ${createError?.message || "No user returned"}`);
  continue;
}

      await supabaseAdmin
        .from("profiles")
        .update({ auth_id: authUser.user.id })
        .eq("id", user.id);

      messages.push(`✅ Created and linked: ${user.email}`);
      createdCount++;
    }

    return new Response(
      JSON.stringify({
        created: createdCount,
        skipped,
        details: messages,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.log("🔥 Uncaught error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
