// netlify/functions/_lib/pdf.js
import { PDFDocument, StandardFonts } from "pdf-lib";

export async function createPdf() {
  const pdfDoc = await PDFDocument.create();
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  return { pdfDoc, fonts: { regular, bold } };
}
