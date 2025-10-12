// netlify/functions/_sections/cover.js
import { rgb } from "pdf-lib";
import { COLORS } from "../_lib/text.js";

/** Inserts the cover at index 0 – no Audit ID here (as requested). */
export async function drawAuditCoverPage(pdfDoc, fonts, cover) {
  const page = pdfDoc.insertPage(0, [595.28, 841.89]); // A4
  const { height, width } = page.getSize();

  // Title centred
  const title = cover.title || "Chaiiwala Audit";
  const tSize = 28;
  const tWidth = fonts.bold.widthOfTextAtSize(title, tSize);
  page.drawText(title, { x: (width - tWidth) / 2, y: height - 90, size: tSize, font: fonts.bold, color: COLORS.black });

  // Details left aligned
  let y = height - 140;
  const left = 60;
  const gap = 22;

  const pair = (label, value) => {
    page.drawText(`${label}:`, { x: left, y, size: 12, font: fonts.bold, color: COLORS.black });
    if (value != null) page.drawText(String(value), { x: left + 170, y, size: 12, font: fonts.regular, color: COLORS.black });
    y -= gap;
  };

  pair("File", cover.file);
  pair("Store", cover.store);
  pair("Template", cover.template);
  pair("Reported by", cover.reportedBy);
  pair("Started", cover.startedHuman);
  pair("Submitted", cover.submittedHuman);
}
