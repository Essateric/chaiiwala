// netlify/functions/_lib/payload.js
export const REPLACEMENTS = {
  "≥": ">=", "≤": "<=", "–": "-", "—": "-", "−": "-",
  "“": '"', "”": '"', "‘": "'", "’": "'", "•": "*", "·": "-",
  "…": "...", "£": "GBP ", "€": "EUR "
};
export const safeAnsi = (v) => String(v ?? "").replace(/[≥≤–—−“”‘’•·…£€]/g, ch => REPLACEMENTS[ch] || "?"); // :contentReference[oaicite:10]{index=10}

export const sanitizeDeep = (x) => {
  if (x == null) return x;
  if (typeof x === "string") return safeAnsi(x);
  if (Array.isArray(x)) return x.map(sanitizeDeep);
  if (typeof x === "object") {
    const out = {}; for (const k of Object.keys(x)) out[k] = sanitizeDeep(x[k]); return out;
  }
  return x;
}; // :contentReference[oaicite:11]{index=11}

export const ddmmyy = (d) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}${pad(d.getMonth() + 1)}${String(d.getFullYear()).slice(-2)}`;
}; // :contentReference[oaicite:12]{index=12}

const asString = (v) => {
  if (v == null) return "";
  if (typeof v === "object") return String(v.name ?? v.title ?? v.display_name ?? v.store_name ?? v.id ?? "");
  return String(v);
};
const looksUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
const looksNumericId = (s) => /^\d+$/.test(s);

/** Your store-name chooser, unchanged. :contentReference[oaicite:13]{index=13} */
export function deriveStoreName(p) {
  const candidates = [p.store_name, p.store, p.store_title, p.store_display_name, p.store?.name, p.store?.title];
  for (const c of candidates) {
    const s = asString(c).trim();
    if (!s) continue;
    if (looksUuid(s) || looksNumericId(s)) continue;
    return s;
  }
  return asString(p.store_name || p.store || p.store_title || p.store_display_name || "");
}

/** Small helpers re-used by image code */
export function looksLikeImageUrl(s) {
  if (!s) return false;
  return /^https?:\/\//i.test(String(s)) && /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(String(s)); // :contentReference[oaicite:14]{index=14}
}
export function buildSupabaseRenderUrl(url, { format = "jpeg", width = 1600 } = {}) {
  // if your storage CDN supports rendering, derive URL here; else return null
  return null;
}
