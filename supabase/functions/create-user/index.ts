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

    console.log("🔐 Authenticated as:", user.email);

    const { data: userRecord, error: fetchError } = await supabaseAdmin
      .from("profiles")
      .select("permissions")
      .eq("auth_id", user.id)
      .single();

    if (fetchError || !userRecord || !["admin", "regional"].includes(userRecord.permissions)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const body = await req.json();
    const { name, email, password, permissions, store_id } = body;

    if (!email || !password || !name) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // ✅ Try to create auth user
    const metadata: Record<string, any> = { name, permissions };
    if (store_id && !isNaN(Number(store_id))) {
      metadata.store_id = Number(store_id);
    }

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    return new Response(
      JSON.stringify({ message: `Auth login created for ${email}`, user: created.user }),
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
