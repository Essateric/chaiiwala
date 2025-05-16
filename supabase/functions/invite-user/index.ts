/// <reference types="jsr:@supabase/functions-js/edge-runtime" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Supabase admin client using service role
const supabaseAdmin = createClient(
  Deno.env.get("PROJECT_URL")!,
  Deno.env.get("SERVICE_ROLE_KEY")!
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
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(
      Deno.env.get("PROJECT_URL")!,
      Deno.env.get("ANON_KEY")!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    // Check if the authenticated user has permission to invite
    const { data: inviterProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("permissions")
      .eq("auth_id", user.id)
      .single();

    if (profileError || !inviterProfile || !["admin", "regional"].includes(inviterProfile.permissions)) {
      return new Response(JSON.stringify({ error: "Forbidden: Only Admin or Regional Managers can invite users." }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const body = await req.json();
    // Expecting email, role, optional full_name, store_ids (array), primary_store_id
    const { email, role, full_name, store_ids, primary_store_id } = body;

    if (!email || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields: email and role are required." }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Prepare metadata for the invited user
    const user_metadata_payload: Record<string, any> = {};
    if (full_name) {
        user_metadata_payload.name = full_name;
        // Attempt to split full name into first/last if only full_name is provided
        const nameParts = full_name.trim().split(" ");
        user_metadata_payload.first_name = nameParts[0] || '';
        user_metadata_payload.last_name = nameParts.slice(1).join(" ") || null;
    }
    // If frontend sends first_name/last_name separately, add them here too if needed,
    // but the trigger should handle parsing 'name' if only that's sent.

    const app_metadata_payload: Record<string, any> = {
      user_role: role, // The trigger will look for 'user_role'
    };

    // Add store info to app_metadata if provided
    if (store_ids && Array.isArray(store_ids)) {
        app_metadata_payload.user_store_ids = store_ids.map(Number).filter(id => !isNaN(id));
    } else {
        app_metadata_payload.user_store_ids = []; // Ensure it's always an array
    }

    if (primary_store_id && !isNaN(Number(primary_store_id))) {
        app_metadata_payload.primary_store_id = Number(primary_store_id);
        // Ensure primary_store_id is also in user_store_ids if it wasn't already
        if (!app_metadata_payload.user_store_ids.includes(app_metadata_payload.primary_store_id)) {
             app_metadata_payload.user_store_ids.push(app_metadata_payload.primary_store_id);
        }
    } else if (app_metadata_payload.user_store_ids.length > 0) {
         // If no primary_store_id is explicitly set, use the first one from the array
         app_metadata_payload.primary_store_id = app_metadata_payload.user_store_ids[0];
    } else {
         app_metadata_payload.primary_store_id = null;
    }

    // Send the invitation email
    const { data, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { // This data goes into raw_user_meta_data and raw_app_meta_data
        ...user_metadata_payload,
        ...app_metadata_payload, // Merge app_metadata fields here
      },
      // Optional: redirect the user after they click the confirmation link
      // redirectTo: 'https://your-app.com/auth/confirm',
    });

    if (inviteError) {
      console.error("❌ Failed to send invitation:", inviteError.message);
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    console.log(`✅ Invitation sent to ${email} with role ${role}`);
    return new Response(
      JSON.stringify({ message: `Invitation sent to ${email}`, user: data.user }),
      { status: 200, headers: corsHeaders }
    );

  } catch (err: any) {
    console.log("🔥 Uncaught error:", err?.message || err);
    return new Response(JSON.stringify({ error: "Unhandled server error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});