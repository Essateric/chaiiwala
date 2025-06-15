// Only works in Supabase Edge Functions (Deno environment)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Grab secrets from environment (set these in "Secrets" in dashboard)
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); // Use Service Role for DB access

const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async (req) => {
  // Call your SQL function
  const { error } = await supabase.rpc("rotate_daily_checklist");
  if (error) {
    return new Response("Error: " + error.message, { status: 500 });
  }
  return new Response("Checklist rotated successfully!", { status: 200 });
});
