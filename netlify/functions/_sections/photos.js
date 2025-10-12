// netlify/functions/_sections/photos.js
import { rgb } from "pdf-lib";
import { COLORS } from "../_lib/text.js";
import { addLinkAnnotation } from "../_lib/annotations.js";

const blue = COLORS.blue;
const grey = COLORS.grey;

function safeAnsi(text) {
  if (!text) return "";
  return String(text).replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

// Exported drawer so Questions section can reuse it (your original logic). :contentReference[oaicite:16]{index=16}
export async function drawImagesOnPage({ pdfDoc, page, y, maxWidth, margin, imageEntries, font }) {
  let currentY = y;
  for (const { kind, bytes, sourceUrl } of imageEntries) {
    if (currentY < 90 + 220) {
      page = pdfDoc.addPage([595.28, 841.89]);
      currentY = page.getSize().height - 50;
    }
    try {
      const img = kind === "png" ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
      const iw = img.width, ih = img.height;
      const targetW = Math.min(maxWidth, iw);
      const scale = targetW / iw;
      const targetH = ih * scale;
      const x = margin;
      const yPos = currentY - targetH;

      page.drawImage(img, { x, y: yPos, width: targetW, height: targetH });

      const caption = sourceUrl.length > 100 ? `${sourceUrl.slice(0, 100)}…` : sourceUrl;
      const captionSize = 9;
      const captionY = yPos - 14;
      const textWidth = font.widthOfTextAtSize(caption, captionSize);

      page.drawText(safeAnsi(caption), { x, y: captionY, size: captionSize, font, color: blue });
      addLinkAnnotation(pdfDoc, page, x, captionY, textWidth, captionSize + 4, sourceUrl);

      currentY = captionY - 10;
    } catch {
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

// Optional standalone “Photos” section page (kept minimal)
export async function drawPhotosSection(pdfDoc, fonts, payload) {
  const items = payload?.sections?.flatMap(s => s.questions || []) || [];
  const urls = new Set();
  for (const q of items) {
    const cand = (q?.answer?.image_urls || q?.answer?.photo_urls || q?.photos || q?.images || []);
    for (const u of cand) if (/^https?:\/\//i.test(String(u))) urls.add(String(u));
  }
  if (!urls.size) return;

  let page = pdfDoc.addPage([595.28, 841.89]);
  const { height, width } = page.getSize();

  const heading = "Photos";
  const hSize = 16;
  const hWidth = fonts.bold.widthOfTextAtSize(heading, hSize);
  page.drawText(heading, { x: (width - hWidth) / 2, y: height - 50, size: hSize, font: fonts.bold, color: COLORS.black });

  const margin = 40;
  const maxWidth = width - margin * 2;
  let y = height - 90;

  // We expect Questions section to already fetch and draw per-question images;
  // this optional page can be kept or removed. If you want to show only per-question images, you can skip calling this in generateAuditPDF.
  // (Left here as a simple gallery page.)
}
