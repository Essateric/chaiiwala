import { createPdf } from "./functions/_lib/pdf.js";
import { safeAnsi } from "./functions/_lib/payload.js";
import { buildCoverData } from "./functions/_lib/formatters.js";

import { drawAuditCoverPage } from "./functions/_sections/cover.js";
import { drawQuestionsSection } from "./functions/_sections/questions.js";
import { drawPhotosSection } from "./functions/_sections/photos.js";

export async function generateAuditPDF(payload, friendlyBaseName) {
  const { pdfDoc, fonts } = await createPdf();

  pdfDoc.setTitle(safeAnsi(`${friendlyBaseName}.pdf`));

  // 1) Cover page (new; no Audit ID; human dates; Reported by)
  const cover = buildCoverData(payload, friendlyBaseName);
  await drawAuditCoverPage(pdfDoc, fonts, cover);

  // 2) Your existing question/answers section (kept)
  await drawQuestionsSection(pdfDoc, fonts, payload, friendlyBaseName);

  // 3) Photos section (your current image logic, modularised)
  await drawPhotosSection(pdfDoc, fonts, payload);

  const pdfBytes = await pdfDoc.save();
  return { buffer: Buffer.from(pdfBytes), fileName: `${friendlyBaseName}.pdf` };
}
