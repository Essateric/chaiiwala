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
      .select("id, name, email, auth_id, permissions, store_id");

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
       console.log("👤 Attempting auth create for:", user.email); // 🔍 ADD THIS

      const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: "password123",
        email_confirm: true,
        user_metadata: {
          name: user.name,
          permissions: user.permissions,
          store_id: user.store_id || null,
        },
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
