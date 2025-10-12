// netlify/functions/sendAuditPdf.js
import { createClient } from "@supabase/supabase-js";
import { sanitizeDeep, ddmmyy, safeAnsi, deriveStoreName } from "./_lib/payload.js";
import { generateAuditPDF } from "./generateAuditPDF.js";

export const handler = async (event) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    let payload = JSON.parse(event.body || "{}");
    payload = sanitizeDeep(payload); // same logic as your file. :contentReference[oaicite:4]{index=4}

    const storeHumanName = deriveStoreName(payload);     // your store-name resolver. :contentReference[oaicite:5]{index=5}
    const when = new Date(payload.submitted_at || Date.now());
    const storeToken = safeAnsi(storeHumanName).trim().replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    const friendlyBaseName = `Audit_${storeToken}_${ddmmyy(when)}`; // same filename style. :contentReference[oaicite:6]{index=6}

    // Build the PDF
    const { buffer, fileName } = await generateAuditPDF(
      { ...payload, store_name: storeHumanName },
      friendlyBaseName
    );

    // Inline PDF response if requested
    const accept = (event.headers?.accept || event.headers?.Accept || "").toLowerCase();
    const wantsPdf = event.queryStringParameters?.format === "pdf" || accept.includes("application/pdf");
    if (wantsPdf) {
      return {
        statusCode: 200,
        headers: { ...cors, "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${fileName}"`, "Cache-Control": "no-store" },
        body: buffer.toString("base64"),
        isBase64Encoded: true,
      };
    }

    // Otherwise upload to Supabase (unchanged) :contentReference[oaicite:7]{index=7}
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
    const BUCKET = process.env.SUPABASE_AUDIT_BUCKET || "audit-files";

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      return { statusCode: 500, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify({ error: "Supabase environment variables are missing." }) };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const cleanId = String(payload.id || "unknown").replace(/[^A-Za-z0-9_-]+/g, "_");
    const path = `${cleanId}/${fileName}`;

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      upsert: true,
      cacheControl: "3600",
      contentType: "application/pdf",
    });
    if (upErr) throw upErr;

    let url = supabase.storage.from(BUCKET).getPublicUrl(path)?.data?.publicUrl || null;
    if (!url) {
      const { data: signed, error: signErr } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signErr) throw signErr;
      url = signed?.signedUrl || null;
    }

    return { statusCode: 200, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify({ success: true, fileName, url, bucket: BUCKET, path }) };
  } catch (err) {
    console.error("sendAuditPdf error:", err);
    return { statusCode: 500, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify({ error: err.message || "Internal Server Error" }) };
  }
};
