// netlify/functions/_lib/images.js
import { buildSupabaseRenderUrl, looksLikeImageUrl } from "./payload.js";

/** Your current fetch/convert logic (webp/heic → jpeg), preserved. :contentReference[oaicite:8]{index=8} */
export async function fetchImageBytes(url) {
  const tryFetch = async (u) => {
    const res = await fetch(u);
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    const ab = await res.arrayBuffer();
    return { ct, bytes: new Uint8Array(ab) };
  };
  let got = await tryFetch(url);
  if (!got) return null;

  const isJpg = got.ct.includes("image/jpeg") || got.ct.includes("image/jpg");
  const isPng = got.ct.includes("image/png");
  if (isJpg) return { kind: "jpg", bytes: got.bytes };
  if (isPng) return { kind: "png", bytes: got.bytes };

  const needsConvert = got.ct.includes("image/heic") || got.ct.includes("image/heif") || got.ct.includes("image/webp");
  if (needsConvert || (!isJpg && !isPng)) {
    const renderUrl = buildSupabaseRenderUrl(url, { format: "jpeg", width: 1600 });
    if (renderUrl) {
      const converted = await tryFetch(renderUrl);
      if (converted && (converted.ct.includes("image/jpeg") || converted.ct.includes("image/jpg"))) {
        return { kind: "jpg", bytes: converted.bytes };
      }
    }
  }
  try {
    const u = new URL(url);
    u.searchParams.set("format", "jpeg");
    const fallback = await tryFetch(u.toString());
    if (fallback && (fallback.ct.includes("image/jpeg") || fallback.ct.includes("image/jpg"))) {
      return { kind: "jpg", bytes: fallback.bytes };
    }
  } catch {}
  return null;
}

/** Your URL collectors for questions, preserved. :contentReference[oaicite:9]{index=9} */
export function collectQuestionImageUrls(q) {
  const urls = new Set();
  const pushIfLooksUrl = (v) => {
    if (!v) return;
    const s = String(v);
    if (/^https?:\/\//i.test(s)) urls.add(s);
  };
  pushIfLooksUrl(q.image_url);
  pushIfLooksUrl(q.photo_url);
  pushIfLooksUrl(q.answer?.image_url);
  pushIfLooksUrl(q.answer?.photo_url);
  (q.answer?.image_urls || q.answer?.photo_urls || q.photos || q.images || []).forEach(pushIfLooksUrl);
  if (looksLikeImageUrl(q.answer?.value_text)) pushIfLooksUrl(q.answer?.value_text);
  return Array.from(urls);
}
