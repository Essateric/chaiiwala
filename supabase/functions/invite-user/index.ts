/// <reference types="jsr:@supabase/functions-js/edge-runtime" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Supabase admin client using service role
// This client has elevated privileges and should only be used in secure backend environments.
const supabaseAdmin = createClient(
  Deno.env.get("PROJECT_URL")!,
  Deno.env.get("SERVICE_ROLE_KEY")!
);

// CORS headers for allowing requests from your frontend
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // ⚠️ Consider restricting this to your frontend URL in production
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

// Define the expected structure of the request body
interface InvitePayload {
  email: string;
  role: string; // e.g., 'store', 'area', 'maintenance', 'admin', 'regional', 'staff'
  store_ids?: number[] | string[] | any; // Allow various types initially for logging, but expect number[]
  full_name?: string; // Optional, for user_metadata (user can see/edit)
  redirect_to?: string; // Optional, where to redirect the user after they set their password
}

// The main handler for the Edge Function
Deno.serve(async (req) => {
  try {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    // 1. Authenticate the caller (ensure only authorized users can send invites)
    // We'll check the JWT from the Authorization header.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized: Missing token" }), {
        status: 401,
        headers: corsHeaders,
      });
    }
    const token = authHeader.replace("Bearer ", "");

    // Use a regular Supabase client (not admin) to verify the user's identity from the token
    const supabaseClient = createClient(
      Deno.env.get("PROJECT_URL")!,
      Deno.env.get("ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user: inviterUser }, error: inviterUserError } = await supabaseClient.auth.getUser();
    if (inviterUserError || !inviterUser) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid token" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    // Check the inviter's permissions from their profile using the admin client
    // This ensures only users with specific roles (like admin/regional) can invite.
    const { data: inviterProfile, error: inviterProfileError } = await supabaseAdmin
      .from("profiles")
      .select("permissions")
      .eq("auth_id", inviterUser.id)
      .single();

    if (inviterProfileError || !inviterProfile || !["admin", "regional"].includes(inviterProfile.permissions)) {
      // Add 'area' or other roles here if they should also be allowed to invite
      return new Response(JSON.stringify({ error: "Forbidden: Insufficient permissions to invite users" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    // 2. Get the invitation details from the request body
    const payload = (await req.json()) as InvitePayload;
    const { email, role, store_ids, full_name, redirect_to } = payload;

    console.log('--- invite-user function received payload ---:', JSON.stringify(payload)); // Log received payload

    if (!email || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields: email and role" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // 3. Construct app_metadata and user_metadata to be sent with the invite
    // app_metadata is for internal app use (like roles/store_ids for the trigger)
    // Ensure user_store_ids is always a JSON array of numbers or empty array
    const appMetadataForInvite: Record<string, any> = { user_role: role };

    let storeIdsForAppMetadata: number[] = []; // Default to an empty array

    // Attempt to parse store_ids if it's provided
    if (store_ids !== undefined && store_ids !== null) {
        if (Array.isArray(store_ids) && store_ids.every(id => typeof id === 'number')) {
            // It's already a valid array of numbers
            storeIdsForAppMetadata = store_ids;
        } else if (Array.isArray(store_ids) && store_ids.every(id => typeof id === 'string')) {
            // It's an array of strings, attempt to parse to numbers
            const parsedIds = store_ids.map(idStr => parseInt(idStr, 10)).filter(idNum => !isNaN(idNum));
            if (parsedIds.length === store_ids.length) { // Check if all strings were valid numbers
                 storeIdsForAppMetadata = parsedIds;
            } else {
                 console.warn(`--- invite-user function WARNING: Received array of strings for store_ids, but some could not be parsed to numbers for ${email}: ${JSON.stringify(store_ids)}. Using only valid numbers.`);
                 storeIdsForAppMetadata = parsedIds; // Use the valid ones
            }
        } else {
            // It's provided but not an array of numbers or strings
            console.warn(`--- invite-user function WARNING: Invalid store_ids format received for invite for ${email}: ${JSON.stringify(store_ids)}. Expected array of numbers or strings. Using empty array.`);
            // storeIdsForAppMetadata remains []
        }
    }
    // If store_ids is undefined or null, storeIdsForAppMetadata remains []
    appMetadataForInvite.user_store_ids = storeIdsForAppMetadata; // Always set user_store_ids to an array

    // user_metadata is for user-facing data (like full name)
    const userMetadataForInvite: Record<string, any> = {};
    if (full_name) userMetadataForInvite.full_name = full_name;

    // 4. Send the invitation email using the admin client
    console.log('--- invite-user function sending app_metadata to inviteUserByEmail ---:', JSON.stringify(appMetadataForInvite)); // Log app_metadata being sent
    const { data: invitedUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirect_to || `${Deno.env.get("SITE_URL")}/auth`, // Default redirect to your auth page after password set
      data: userMetadataForInvite, // Populates raw_user_meta_data
      app_metadata: appMetadataForInvite, // Populates raw_app_meta_data (used by your trigger)
    });

    if (inviteError) {
      console.error("Error inviting user via Supabase API:", inviteError);
      // This error might contain details if the email is invalid, already exists, etc.
      // Or it could be the database error if the trigger fails immediately (less likely now with COALESCE fix).
      // The error message "Database error saving new user" comes from Supabase Auth when the trigger fails.
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: inviteError.status || 500, // Use Supabase error status if available
        headers: corsHeaders,
      });
    }

    console.log(`✅ Invitation sent successfully to ${email}. User ID: ${invitedUser.user?.id}`);

    return new Response(JSON.stringify({ message: "Invitation sent successfully.", user: invitedUser.user }), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (err: any) {
    console.error("🔥 Uncaught error in invite-user function:", err?.message || err);
    return new Response(JSON.stringify({ error: "Unhandled server error during invitation" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
