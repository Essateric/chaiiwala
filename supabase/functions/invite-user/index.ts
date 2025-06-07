import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Supabase admin client using service role
const supabaseAdmin = createClient(
  Deno.env.get("PROJECT_URL"),
  Deno.env.get("SERVICE_ROLE_KEY")
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "Content-Length, X-JSON",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    // Authenticate the caller (should be admin or regional)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(
      Deno.env.get("PROJECT_URL"),
      Deno.env.get("ANON_KEY"),
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
      }
    );

    const { data, error: userError } = await supabaseClient.auth.getUser();
    const inviter = data?.user;
    if (userError || !inviter) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    // Check if the authenticated user has permission to invite
    const { data: inviterProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("permissions")
      .eq("auth_id", inviter.id)
      .single();

    if (profileError || !inviterProfile || !["admin", "regional"].includes(inviterProfile.permissions)) {
      return new Response(JSON.stringify({ error: "Forbidden: Only Admin or Regional Managers can invite users." }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const body = await req.json();
    console.log("Received body in invite-user:", body);
    const { email, permissions, full_name, store_ids, primary_store_id } = body;

    if (!email || !permissions || !full_name || !full_name.trim()) {
      return new Response(JSON.stringify({ error: "Missing required fields: email, permissions, and full_name are required." }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Prepare user_metadata
    const user_metadata_payload = {};
    const trimmed_full_name = full_name.trim();
    user_metadata_payload.name = trimmed_full_name;
const nameParts = trimmed_full_name.split(" ");
user_metadata_payload.first_name = nameParts[0] || '';
user_metadata_payload.last_name = nameParts.length > 1 ? nameParts.slice(1).join(" ") : '';


    // Prepare app_metadata
    const app_metadata_payload = { user_role: permissions };
    const numericStoreIds = (store_ids && Array.isArray(store_ids))
      ? store_ids.map(Number).filter(id => !isNaN(id))
      : [];
    app_metadata_payload.user_store_ids = numericStoreIds;

    let numericPrimaryStoreId = (primary_store_id && !isNaN(Number(primary_store_id)))
      ? Number(primary_store_id)
      : null;

    if (numericPrimaryStoreId) {
      app_metadata_payload.primary_store_id = numericPrimaryStoreId;
      if (!app_metadata_payload.user_store_ids.includes(numericPrimaryStoreId)) {
        app_metadata_payload.user_store_ids.push(numericPrimaryStoreId);
      }
    } else if (app_metadata_payload.user_store_ids.length > 0) {
      app_metadata_payload.primary_store_id = app_metadata_payload.user_store_ids[0];
    } else {
      app_metadata_payload.primary_store_id = null;
    }

    if ((permissions === 'staff' || permissions === 'store') && !app_metadata_payload.primary_store_id) {
      return new Response(JSON.stringify({ error: `A store must be assigned for role: ${permissions}.` }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Step 1: Send the invitation email, this sets user_metadata
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: user_metadata_payload,
      redirectTo: `${Deno.env.get("SITE_URL")}/auth`
    });

    if (inviteError) {
      console.error("❌ Failed to send invitation (Step 1):", inviteError.message);
      return new Response(JSON.stringify({ error: `Failed to send invitation: ${inviteError.message}` }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    if (!inviteData || !inviteData.user || !inviteData.user.id) {
      console.error("❌ Invitation sent but no user data returned from inviteUserByEmail.");
      return new Response(JSON.stringify({ error: "Invitation sent but no user data returned from invite step." }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Step 2: Update the invited user to set app_metadata
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      inviteData.user.id,
      { app_metadata: app_metadata_payload }
    );

    if (updateError) {
      console.error(`❌ Failed to update app_metadata for invited user ${inviteData.user.id}:`, updateError.message);
      return new Response(JSON.stringify({ error: `Invitation sent, but failed to set user role/store: ${updateError.message}` }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    console.log(`✅ Invitation sent to ${email} with role ${permissions}. User ID: ${inviteData.user.id}. App metadata updated.`);
    return new Response(
      JSON.stringify({ message: `Invitation sent to ${email}`, user: inviteData.user }),
      { status: 200, headers: corsHeaders }
    );

  } catch (err) {
    console.log("🔥 Uncaught error in invite-user:", err?.message || err);
    return new Response(JSON.stringify({ error: "Unhandled server error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
