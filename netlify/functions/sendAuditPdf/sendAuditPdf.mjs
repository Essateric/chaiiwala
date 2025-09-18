// netlify/functions/sendAuditPdf.js
import { PDFDocument, rgb, StandardFonts, PDFName, PDFArray } from "pdf-lib";
import { createClient } from "@supabase/supabase-js";

/* ---------------- WinAnsi-safe sanitizers ---------------- */
const REPLACEMENTS = {
  "≥": ">=", "≤": "<=", "–": "-", "—": "-", "−": "-",
  "“": '"', "”": '"', "‘": "'", "’": "'",
  "•": "*", "·": "-", "…": "...",
  "£": "GBP ", "€": "EUR "
};
const safeAnsi = (v) =>
  String(v ?? "").replace(/[≥≤–—−“”‘’•·…£€]/g, (ch) => REPLACEMENTS[ch] || "?");

const sanitizeDeep = (x) => {
  if (x == null) return x;
  if (typeof x === "string") return safeAnsi(x);
  if (Array.isArray(x)) return x.map(sanitizeDeep);
  if (typeof x === "object") {
    const out = {};
    for (const k of Object.keys(x)) out[k] = sanitizeDeep(x[k]);
    return out;
  }
  return x;
};

const ddmmyy = (d) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}${pad(d.getMonth() + 1)}${String(d.getFullYear()).slice(-2)}`;
};

/* ---------- robust human store name ---------- */
const asString = (v) => {
  if (v == null) return "";
  if (typeof v === "object") {
    return String(v.name ?? v.title ?? v.display_name ?? v.store_name ?? v.id ?? "");
  }
  return String(v);
};
const looksUuid = (s) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
const looksNumericId = (s) => /^\d+$/.test(s);

function deriveStoreName(p) {
  const candidates = [
    p.store_name, p.store, p.store_title, p.store_display_name, p.store?.name, p.store?.title,
  ];
  for (const c of candidates) {
    const s = asString(c).trim();
    if (!s) continue;
    if (looksUuid(s) || looksNumericId(s)) continue; // skip IDs
    return s;
  }
  for (const c of candidates) {
    const s = asString(c).trim();
    if (s) return s;
  }
  return "Unknown";
}

/* ---------------- PDF helpers ---------------- */
const red = rgb(1, 0, 0);
const orange = rgb(1, 0.65, 0);
const green = rgb(0, 0.6, 0);
const grey = rgb(0.45, 0.45, 0.45);
const blue = rgb(0, 0, 1);
const black = rgb(0, 0, 0);

const yesNoToColorText = (v) => {
  if (v === true || v === "Yes") return { t: "Yes", c: green };
  if (v === false || v === "No") return { t: "No", c: red };
  return { t: "N/A", c: grey };
};

function drawWrappedText({
  page, text, y, font, size, color, maxWidth, margin = 50, lineHeight = 20,
}) {
  const words = safeAnsi(text).split(" ");
  let line = "";
  let currentY = y;

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    const w = font.widthOfTextAtSize(candidate, size);
    if (w > maxWidth && line) {
      page.drawText(line, { x: margin, y: currentY, size, font, color });
      currentY -= lineHeight;
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) {
    page.drawText(line, { x: margin, y: currentY, size, font, color });
    currentY -= lineHeight;
  }
  return currentY;
}

function addLinkAnnotation(page, x, y, width, height, link) {
  const context = page.doc.context;
  const uriAction = context.obj({
    Type: PDFName.of("Action"),
    S: PDFName.of("URI"),
    URI: context.obj(String(link)),
  });
  const linkAnnotation = context.obj({
    Type: PDFName.of("Annot"),
    Subtype: PDFName.of("Link"),
    Rect: context.obj([x, y, x + width, y + height]),
    Border: context.obj([0, 0, 0]),
    A: uriAction,
  });
  let annots = page.node.lookup(PDFName.of("Annots"), PDFArray);
  if (!annots) {
    annots = context.obj([]);
    page.node.set(PDFName.of("Annots"), annots);
  }
  annots.push(linkAnnotation);
}

function ratingToColor(v) {
  const n = Number(v || 0);
  if (n <= 0) return grey;
  if (n <= 2) return red;
  if (n <= 4) return orange;
  return green;
}

/* ---------------- Image handling ---------------- */

/**
 * Attempts to build a Supabase "render" URL (server-side transform) for images.
 * Works for both public and signed URLs coming from Supabase Storage.
 * Example:
 *   /storage/v1/object/public/bucket/path.jpg
 * → /storage/v1/render/image/public/bucket/path.jpg?format=jpeg&width=1600&resize=contain
 */
function buildSupabaseRenderUrl(originalUrl, { format = "jpeg", width = 1600 } = {}) {
  try {
    const u = new URL(originalUrl);
    if (!u.pathname.includes("/storage/v1/object/")) return null;
    const renderPath = u.pathname.replace("/storage/v1/object/", "/storage/v1/render/image/");
    u.pathname = renderPath;
    u.searchParams.set("format", format);
    u.searchParams.set("width", String(width));
    u.searchParams.set("resize", "contain");
    return u.toString();
  } catch {
    return null;
  }
}

function looksLikeImageUrl(s) {
  return /^https?:\/\//i.test(s) && /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(s);
}

/**
 * Fetch bytes for an image URL, converting to JPEG via Supabase render if needed.
 * Returns: { kind: 'jpg'|'png', bytes: Uint8Array } or null on failure.
 */
async function fetchImageBytes(url) {
  const tryFetch = async (u) => {
    const res = await fetch(u);
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    const ab = await res.arrayBuffer();
    return { ct, bytes: new Uint8Array(ab) };
  };

  // 1) Try as-is
  let got = await tryFetch(url);
  if (!got) return null;

  const isJpg = got.ct.includes("image/jpeg") || got.ct.includes("image/jpg");
  const isPng = got.ct.includes("image/png");

  if (isJpg) return { kind: "jpg", bytes: got.bytes };
  if (isPng) return { kind: "png", bytes: got.bytes };

  // 2) If heic/webp/etc., try Supabase render→jpeg (works for Supabase Storage URLs)
  const needsConvert =
    got.ct.includes("image/heic") ||
    got.ct.includes("image/heif") ||
    got.ct.includes("image/webp");

  if (needsConvert || (!isJpg && !isPng)) {
    const renderUrl = buildSupabaseRenderUrl(url, { format: "jpeg", width: 1600 });
    if (renderUrl) {
      const converted = await tryFetch(renderUrl);
      if (converted && (converted.ct.includes("image/jpeg") || converted.ct.includes("image/jpg"))) {
        return { kind: "jpg", bytes: converted.bytes };
      }
    }
  }

  // 3) If we got here, we couldn't convert; last resort: try "?format=jpeg" naive param
  try {
    const u = new URL(url);
    u.searchParams.set("format", "jpeg");
    const fallback = await tryFetch(u.toString());
    if (fallback && (fallback.ct.includes("image/jpeg") || fallback.ct.includes("image/jpg"))) {
      return { kind: "jpg", bytes: fallback.bytes };
    }
  } catch { /* ignore */ }

  return null;
}

/** Collect candidate image URLs/paths from a question object (be liberal). */
function collectQuestionImageUrls(q) {
  const urls = new Set();

  const pushIfLooksUrl = (v) => {
    if (!v) return;
    const s = String(v);
    if (/^https?:\/\//i.test(s)) urls.add(s);
  };

  // common shapes you’ve used before—kept liberal for backwards compat:
  pushIfLooksUrl(q.image_url);
  pushIfLooksUrl(q.photo_url);
  pushIfLooksUrl(q.answer?.image_url);
  pushIfLooksUrl(q.answer?.photo_url);

  (q.answer?.image_urls || q.answer?.photo_urls || q.photos || q.images || [])
    .forEach(pushIfLooksUrl);

  // sometimes value_text itself is a direct image link
  if (looksLikeImageUrl(q.answer?.value_text)) pushIfLooksUrl(q.answer?.value_text);

  return Array.from(urls);
}

/** Draw one or more images on the page, scaling to maxWidth. Returns new Y. */
async function drawImagesOnPage({ pdfDoc, page, y, maxWidth, margin, imageEntries, font }) {
  let currentY = y;

  for (const { kind, bytes, sourceUrl } of imageEntries) {
    // New page if not enough space (reserve ~220px)
    if (currentY < 90 + 220) {
      page = pdfDoc.addPage([595.28, 841.89]);
      currentY = page.getSize().height - 50;
    }

    try {
      const img = kind === "png"
        ? await pdfDoc.embedPng(bytes)
        : await pdfDoc.embedJpg(bytes);

      const iw = img.width;
      const ih = img.height;
      const targetW = Math.min(maxWidth, iw);
      const scale = targetW / iw;
      const targetH = ih * scale;

      const x = margin;
      const yPos = currentY - targetH;

      page.drawImage(img, { x, y: yPos, width: targetW, height: targetH });

      // tiny caption (the URL), clickable
      const caption = sourceUrl.length > 100 ? `${sourceUrl.slice(0, 100)}…` : sourceUrl;
      const captionSize = 9;
      const captionY = yPos - 14;
      const textWidth = font.widthOfTextAtSize(caption, captionSize);

      page.drawText(safeAnsi(caption), {
        x,
        y: captionY,
        size: captionSize,
        font,
        color: blue,
      });
      // Add link annotation
      addLinkAnnotation(page, x, captionY, textWidth, captionSize + 4, sourceUrl);

      currentY = captionY - 10;
    } catch {
      // Draw a placeholder box
      const phW = Math.min(300, maxWidth);
      const phH = 160;
      const x = margin;
      const yPos = currentY - phH;

      page.drawRectangle({ x, y: yPos, width: phW, height: phH, color: rgb(0.95, 0.95, 0.95) });
      page.drawText("Image unavailable", { x: x + 12, y: yPos + phH / 2 - 6, size: 12, font, color: grey });

      currentY = yPos - 16;
    }
  }

  return currentY;
}

async function generateAuditPDF(payload, friendlyBaseName) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(safeAnsi(`${friendlyBaseName}.pdf`));

  let page = pdfDoc.addPage([595.28, 841.89]); // A4
  let { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  const maxWidth = width - margin * 2;
  const lineHeight = 20;
  let y = height - 50;

  const newPageIfNeeded = (needed = lineHeight) => {
    if (y < 50 + needed) {
      page = pdfDoc.addPage([595.28, 841.89]);
      ({ width, height } = page.getSize());
      y = height - 50;
    }
  };
  const heading = (text) => {
    newPageIfNeeded(30);
    page.drawText(safeAnsi(text), { x: margin, y, size: 16, font: bold, color: black });
    y -= lineHeight + 10;
  };
  const labelValue = (label, value, color = black) => {
    newPageIfNeeded();
    const t = `${label}: ${value ?? ""}`;
    y = drawWrappedText({ page, text: t, y, font, size: 12, color, maxWidth, margin, lineHeight });
  };
  const yesNoLine = (label, value) => {
    const { t, c } = yesNoToColorText(value);
    labelValue(label, t, c);
  };
  const ratingBlock = (label, value) => {
    const n = Number(value || 0);
    labelValue(label, n ? `${n}/5` : "Not Rated", ratingToColor(n));
    y -= 4;
  };

  const storeHumanName = deriveStoreName(payload);

  heading("Chaiiwala Audit");
  labelValue("File", `${friendlyBaseName}.pdf`);
  labelValue("Store", storeHumanName);
  labelValue("Template", payload.template_name);
  labelValue("Audit ID", payload.id);
  labelValue("Started", payload.started_at || "—");
  labelValue("Submitted", payload.submitted_at || "—");

  for (const s of payload.sections || []) {
    heading(s.title);
    for (const q of s.questions || []) {
      const line = `${q.code} - ${q.prompt}`;
      labelValue("Question", line);

      if (q.answer_type === "binary") {
        yesNoLine("Answer", q.answer?.value_bool);
      } else if (q.answer_type === "score") {
        yesNoLine("Pass", q.answer?.value_bool);
        labelValue("Score", q.answer?.value_num ?? "—");
      } else if (q.answer_type === "text" || q.answer_type === "photo" || q.answer_type === "images") {
        labelValue("Answer", q.answer?.value_text || "—");
      }
      if (q.answer?.notes) labelValue("Notes", q.answer.notes);

      // --- NEW: embed images for this question (JPG/PNG direct, HEIC/WebP via renderer) ---
      const candidateUrls = collectQuestionImageUrls(q);
      if (candidateUrls.length) {
        // fetch + convert as needed, but don't blow up if any fail
        const imageEntries = [];
        for (const u of candidateUrls) {
          try {
            const got = await fetchImageBytes(u);
            if (got) imageEntries.push({ ...got, sourceUrl: u });
          } catch { /* ignore this one */ }
        }

        if (imageEntries.length) {
          // leave a tiny gap
          y -= 4;
          y = await drawImagesOnPage({
            pdfDoc, page, y, maxWidth, margin, imageEntries, font
          });
        }
      }

      y -= 6;
      newPageIfNeeded();
    }
  }

  const pdfBytes = await pdfDoc.save();
  return { buffer: Buffer.from(pdfBytes), fileName: `${friendlyBaseName}.pdf` };
}

/* ---------------- Netlify handler ---------------- */
export async function handler(event) {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    let payload = JSON.parse(event.body || "{}");
    payload = sanitizeDeep(payload);

    // Friendly filename: Audit_<StoreName>_<ddmmyy>
    const storeHumanName = deriveStoreName(payload);
    const when = new Date(payload.submitted_at || Date.now());
    const storeToken = safeAnsi(storeHumanName)
      .trim()
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const friendlyBaseName = `Audit_${storeToken}_${ddmmyy(when)}`;

    const { buffer, fileName } = await generateAuditPDF(
      { ...payload, store_name: storeHumanName },
      friendlyBaseName
    );

    // If the client asked for a PDF stream, return binary
    const accept = (event.headers?.accept || event.headers?.Accept || "").toLowerCase();
    const wantsPdf = (event.queryStringParameters?.format === "pdf") || accept.includes("application/pdf");
    if (wantsPdf) {
      return {
        statusCode: 200,
        headers: {
          ...cors,
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${fileName}"`,
          "Cache-Control": "no-store",
        },
        body: buffer.toString("base64"),
        isBase64Encoded: true,
      };
    }

    // Otherwise: upload to Supabase and return a URL + { bucket, path }
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
    const BUCKET = process.env.SUPABASE_AUDIT_BUCKET || "audit-files";

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      return {
        statusCode: 500,
        headers: { ...cors, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Supabase environment variables are missing." }),
      };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    const cleanId = String(payload.id || "unknown").replace(/[^A-Za-z0-9_-]+/g, "_");
    const path = `${cleanId}/${fileName}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        upsert: true,
        cacheControl: "3600",
        contentType: "application/pdf",
      });
    if (upErr) throw upErr;

    let url = null;
    const pub = supabase.storage.from(BUCKET).getPublicUrl(path);
    url = pub?.data?.publicUrl || null;

    if (!url) {
      const { data: signed, error: signErr } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signErr) throw signErr;
      url = signed?.signedUrl || null;
    }

    return {
      statusCode: 200,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        fileName,
        url,                 // direct link (preferred by the UI)
        bucket: BUCKET,      // fallback shape
        path,                // fallback shape
      }),
    };
  } catch (err) {
    console.error("sendAuditPdf error:", err);
    return {
      statusCode: 500,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message || "Internal Server Error" }),
    };
  }
}
