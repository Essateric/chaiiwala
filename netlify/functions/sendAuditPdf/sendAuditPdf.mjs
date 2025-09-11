// netlify/functions/sendAuditPdf.js
import { PDFDocument, rgb, StandardFonts, PDFName, PDFArray } from "pdf-lib";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

/* ---------------- WinAnsi-safe sanitizers ---------------- */
const REPLACEMENTS = {
  "≥": ">=",
  "≤": "<=",
  "–": "-",
  "—": "-",
  "−": "-",
  "“": '"',
  "”": '"',
  "‘": "'",
  "’": "'",
  "•": "*",
  "·": "-",
  "…": "...",
  "£": "GBP ",
  "€": "EUR ",
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
    // common nested shapes
    return String(v.name ?? v.title ?? v.display_name ?? v.store_name ?? v.id ?? "");
  }
  return String(v);
};
const looksUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
const looksNumericId = (s) => /^\d+$/.test(s);

function deriveStoreName(p) {
  // try a bunch of fields safely, in order
  const candidates = [
    p.store_name,
    p.store, // may be object or id
    p.store_title,
    p.store_display_name,
    p.store?.name,
    p.store?.title,
  ];

  for (const c of candidates) {
    const s = asString(c).trim();
    if (!s) continue;
    // skip obvious ids
    if (looksUuid(s) || looksNumericId(s)) continue;
    return s;
  }

  // if everything looked like an id, still return the first non-empty thing
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

function drawLine(page, text, y, fontSize, font, link) {
  const margin = 50;
  const clean = safeAnsi(text);
  const textWidth = font.widthOfTextAtSize(clean, fontSize);
  const color = link ? blue : black;

  page.drawText(clean, { x: margin, y, size: fontSize, font, color });

  if (link) {
    const context = page.doc.context;
    const uriAction = context.obj({
      Type: PDFName.of("Action"),
      S: PDFName.of("URI"),
      URI: context.obj(String(link)),
    });
    const linkAnnotation = context.obj({
      Type: PDFName.of("Annot"),
      Subtype: PDFName.of("Link"),
      Rect: context.obj([margin, y, margin + textWidth, y + fontSize]),
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
}

function drawWrappedText({
  page,
  text,
  y,
  font,
  size,
  color,
  maxWidth,
  margin = 50,
  lineHeight = 20,
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

const ratingToColor = (v) => {
  const n = Number(v || 0);
  if (n <= 0) return grey;
  if (n <= 2) return red;
  if (n <= 4) return orange;
  return green;
};

async function generateAuditPDF(payload, fileName) {
  const pdfDoc = await PDFDocument.create();
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
  labelValue("Audit ID", payload.id);
  labelValue("Store", storeHumanName);
  labelValue("Template", payload.template_name);
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
      } else if (q.answer_type === "text" || q.answer_type === "photo") {
        labelValue("Answer", q.answer?.value_text || "—");
      }
      if (q.answer?.notes) labelValue("Notes", q.answer.notes);
      y -= 6;
      newPageIfNeeded();
    }
  }

  const pdfBytes = await pdfDoc.save();
  return { buffer: Buffer.from(pdfBytes), fileName: `${fileName}.pdf` };
}

/* Optional email (skipped unless creds exist) */
async function sendEmail(pdfBuffer, fileName, to) {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  if (!emailUser || !emailPass) return { ok: false, skipped: true };

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: emailUser, pass: emailPass },
  });

  await transporter.verify();

  const info = await transporter.sendMail({
    from: emailUser,
    to: to || emailUser,
    subject: `Audit PDF - ${fileName}`,
    text: `Audit PDF "${fileName}" attached.`,
    attachments: [{ filename: `${fileName}.pdf`, content: pdfBuffer, contentType: "application/pdf" }],
  });
  return { ok: true, id: info.messageId };
}

/* ---------------- Netlify handler ---------------- */
export async function handler(event) {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };
  if (event.httpMethod !== "POST")
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };

  try {
    let payload = JSON.parse(event.body || "{}");
    payload = sanitizeDeep(payload);

    // derive a human name safely (handles numbers/objects/ids)
    const storeHumanName = deriveStoreName(payload);

    // File name EXACT: Audit_<StoreName>_<ddmmyy>
    const when = new Date(payload.submitted_at || Date.now());
    const storeToken = safeAnsi(storeHumanName)
      .trim()
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const fileName = `Audit_${storeToken}_${ddmmyy(when)}`;

    const pdf = await generateAuditPDF({ ...payload, store_name: storeHumanName }, fileName);

    // Email only if creds provided (otherwise skipped)
    const emailRes = await sendEmail(pdf.buffer, fileName, payload.email_to);

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        success: true,
        fileName: `${fileName}.pdf`,
        email: emailRes.ok ? "sent" : "skipped",
      }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: err.message || "Internal Server Error" }),
    };
  }
}
