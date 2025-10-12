// netlify/functions/_sections/questions.js
import { COLORS, drawWrappedText, yesNoToColorText, ratingToColor } from "../_lib/text.js";
import { safeAnsi } from "../_lib/payload.js";
import { fetchImageBytes, collectQuestionImageUrls } from "../_lib/images.js";
import { drawImagesOnPage } from "./photos.js"; // reuse same drawer

// This mirrors your current layout & loop over sections/questions. :contentReference[oaicite:15]{index=15}
export async function drawQuestionsSection(pdfDoc, fonts, payload, friendlyBaseName) {
  let page = pdfDoc.addPage([595.28, 841.89]);       // A4
  let { width, height } = page.getSize();
  const font = fonts.regular, bold = fonts.bold;
  const black = COLORS.black;

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

  // Header block (kept; still shows Audit ID here if you want to remove it here too, delete next line)
  heading("Chaiiwala Audit");
  labelValue("File", `${friendlyBaseName}.pdf`);
  labelValue("Store", payload.store_name);
  labelValue("Template", payload.template_name);
  labelValue("Audit ID", payload.id); // <-- keep/remove as you prefer (cover already hides it)

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

      const candidateUrls = collectQuestionImageUrls(q);
      if (candidateUrls.length) {
        const imageEntries = [];
        for (const u of candidateUrls) {
          try {
            const got = await fetchImageBytes(u);
            if (got) imageEntries.push({ ...got, sourceUrl: u });
          } catch {}
        }
        if (imageEntries.length) {
          y -= 4;
          y = await drawImagesOnPage({
            pdfDoc,
            page,
            y,
            maxWidth,
            margin,
            imageEntries,
            font,
          });
        }
      }
      y -= 6;
      newPageIfNeeded();
    }
  }
}
