// sendFeedbackEmail.js (ESM + Netlify-compatible)
// -----------------------------------------------------------------------------
// This function:
//  1) Accepts POST JSON from your frontend
//  2) Generates a coloured "traffic-light" PDF (WITH COLOUR-CODED STARS)
//  3) Emails the PDF using Gmail SMTP via nodemailer
//  4) Returns clean JSON (never HTML) with proper CORS
// -----------------------------------------------------------------------------

import nodemailer from 'nodemailer';
import { PDFDocument, rgb, StandardFonts, PDFName, PDFArray } from 'pdf-lib';
// Keeping these imports in case you later want local font/images, etc.
import path from 'path';
import fs from 'fs';

import dotenv from 'dotenv';
dotenv.config();

// ---- Boot logs (helpful locally; harmless on Netlify) -----------------------
console.log('🛠️ FUNCTION BOOTED ✅');
console.log('EMAIL_USER:', process.env.EMAIL_USER ? '✅ Set' : '❌ Not Set');

// =============================================================================
// Colours & helpers (traffic light)
// =============================================================================
const red = rgb(1, 0, 0);
const orange = rgb(1, 0.65, 0);
const green = rgb(0, 0.6, 0);
const grey = rgb(0.45, 0.45, 0.45);
const blue = rgb(0, 0, 1);
const black = rgb(0, 0, 0);

const ratingToColor = (v) => {
  const n = Number(v || 0);
  if (n <= 0) return grey;
  if (n <= 2) return red;
  if (n <= 4) return orange;
  return green;
};

const yesNoToColorText = (v) => {
  if (v === 'Yes') return { t: 'Yes', c: green };
  if (v === 'No')  return { t: 'No',  c: red };
  return { t: 'N/A', c: grey };
};

// =============================================================================
// PDF helpers
//  - drawLine: writes text and optionally makes it a clickable link
//  - drawWrappedText: word-wrap text
//  - star drawing: vector stars (no external font required)
// =============================================================================

/**
 * Draw a single line of text at (margin, y).
 * If `link` is provided, creates a clickable link annotation over the text.
 */
function drawLine(page, text, y, fontSize, font, link) {
  const margin = 50;
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const color = link ? blue : black;

  page.drawText(text, {
    x: margin,
    y,
    size: fontSize,
    font,
    color
  });

  if (link) {
    const context = page.doc.context;
    const uriAction = context.obj({
      Type: PDFName.of('Action'),
      S: PDFName.of('URI'),
      URI: context.obj(link)
    });

    const linkAnnotation = context.obj({
      Type: PDFName.of('Annot'),
      Subtype: PDFName.of('Link'),
      Rect: context.obj([margin, y, margin + textWidth, y + fontSize]),
      Border: context.obj([0, 0, 0]),
      A: uriAction
    });

    let annots = page.node.lookup(PDFName.of('Annots'), PDFArray);
    if (!annots) {
      annots = context.obj([]);
      page.node.set(PDFName.of('Annots'), annots);
    }
    annots.push(linkAnnotation);
  }
}

/**
 * Draw wrapped text (no links). Returns the new Y cursor after writing.
 */
function drawWrappedText({
  page,
  text,
  y,
  font,
  size,
  color,
  maxWidth,
  margin = 50,
  lineHeight = 20
}) {
  const words = String(text ?? '').split(' ');
  let line = '';
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

// -----------------------------------------------------------------------------
// ⭐ Vector star drawing (no font required)
// -----------------------------------------------------------------------------

/**
 * Returns an SVG path string for a 5-point star centered at (cx, cy) with outer
 * radius R and inner radius r. We'll build the raw path at (0,0) and simply
 * translate when drawing.
 *
 * NOTE: We draw at origin and rely on page.drawSvgPath's translate option.
 */
function buildStarPath(R = 10, r = 4) {
  // 5-point star math (angles in radians)
  // Outer points every 72°, inner points offset by 36°
  const outer = [];
  const inner = [];
  for (let i = 0; i < 5; i++) {
    const aOuter = (-90 + i * 72) * (Math.PI / 180);
    const aInner = (-90 + i * 72 + 36) * (Math.PI / 180);
    outer.push({ x: R * Math.cos(aOuter), y: R * Math.sin(aOuter) });
    inner.push({ x: r * Math.cos(aInner), y: r * Math.sin(aInner) });
  }

  // Build path: O0 -> I0 -> O1 -> I1 -> ... -> O4 -> I4 -> close
  let d = `M ${outer[0].x} ${outer[0].y}`;
  for (let i = 0; i < 5; i++) {
    d += ` L ${inner[i].x} ${inner[i].y}`;
    d += ` L ${outer[(i + 1) % 5].x} ${outer[(i + 1) % 5].y}`;
  }
  d += ' Z';
  return d;
}

/**
 * Draw a single star shape at (x, yBottom) where yBottom is the baseline for
 * easy alignment with text rows. We translate the star so that its center
 * sits at (cx, cy). We'll compute cy as yBottom + size/2.
 */
function drawStarShape(page, x, yBottom, size, color) {
  const R = size / 2;         // outer radius
  const r = R * 0.45;         // inner radius
  const cx = x + R;           // center x
  const cy = yBottom + R;     // center y
  const d = buildStarPath(R, r);

  page.drawSvgPath(d, {
    // We created the path around origin, so translate to (cx, cy)
    x: cx,
    y: cy,
    color,
    borderColor: color,
    borderWidth: 0,
  });
}

/**
 * Draw 5 stars in a row. Filled stars use `filledColor`; unfilled use `emptyColor`.
 * Returns new Y after drawing the row (i.e., y - (size + padding)).
 */
function drawStarsRow(page, {
  x,
  yBottom,
  size,
  rating,
  filledColor,
  emptyColor,
  gap = 6
}) {
  const r = Math.max(0, Math.min(5, Number(rating) || 0));
  for (let i = 0; i < 5; i++) {
    const color = i < r ? filledColor : emptyColor;
    drawStarShape(page, x + i * (size + gap), yBottom, size, color);
  }
  // new y cursor (one row of stars equals roughly size height plus a bit)
  return yBottom - (size + 6);
}

// =============================================================================
// PDF generator (traffic-light text + coloured vector stars)
// =============================================================================
async function generateTrafficLightPDF(payload, fileName) {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595.28, 841.89]); // A4
  let { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  const maxWidth = width - margin * 2;
  const lineHeight = 20;
  let y = height - 50;

  // Safety: new page if we’re too close to the bottom
  const newPageIfNeeded = (needed = lineHeight) => {
    if (y < 50 + needed) {
      page = pdfDoc.addPage([595.28, 841.89]);
      ({ width, height } = page.getSize());
      y = height - 50;
    }
  };

  const heading = (text) => {
    newPageIfNeeded(30);
    page.drawText(text, { x: margin, y, size: 16, font: boldFont, color: black });
    y -= lineHeight + 10;
  };

  const labelValue = (label, value, color = black) => {
    newPageIfNeeded();
    const text = `${label}: ${value}`;
    y = drawWrappedText({ page, text, y, font, size: 12, color, maxWidth, margin, lineHeight });
  };

  // A rating block draws the label and a row of coloured stars below it
  const ratingBlock = (label, value) => {
    const numeric = Number(value || 0);
    const trafficColor = ratingToColor(numeric);
    const filled = trafficColor;     // filled stars pick traffic-light color
    const empty  = grey;             // empty stars grey
    const size = 14;                 // star size (px-ish)
    const xStars = margin;           // left align with margin

    // line 1: label
    labelValue(label, numeric ? `${numeric}/5` : 'Not Rated', trafficColor);

    // line 2: stars row
    newPageIfNeeded(size + 10);
    y = drawStarsRow(page, {
      x: xStars,
      yBottom: y,
      size,
      rating: numeric,
      filledColor: filled,
      emptyColor: empty,
      gap: 5
    });
    // add small gap after the stars
    y -= 4;
  };

  const yesNoLine = (label, value) => {
    const { t, c } = yesNoToColorText(value);
    labelValue(label, t, c);
  };

  // ----------------- CONTENT -----------------

  // Title
  heading('Chaiiwala Customer Feedback');

  // Customer info
  labelValue('Store Location', payload.location || 'Not specified');
  labelValue('Visit Date', payload.visit_date || 'Not specified');
  labelValue('Customer Name', payload.customer_name || 'Anonymous');

  // Service Quality
  heading('Service Quality');
  yesNoLine('Order Read Back', payload.order_read_back);
  yesNoLine('Cutlery Provided', payload.cutlery_provided);
  yesNoLine('Staff In Uniform', payload.staff_in_uniform);
  ratingBlock('Friendly Greeting', payload.friendly_greeting);
  yesNoLine('Staff Chewing Gum', payload.staff_chewing_gum);

  // Experience Ratings
  heading('Experience Ratings');
  ratingBlock('Customer Experience', payload.customer_experience);
  ratingBlock('Display Presentable', payload.display_presentable);
  ratingBlock('Customer Area Clean', payload.customer_area_clean);
  ratingBlock('Shop Vibe', payload.shop_vibe);

  // Environment
  heading('Environment');
  labelValue('Temperature', payload.temperature_suitable || 'Not specified');
  labelValue('Hot Drink Temperature', payload.hot_drink_temperature || 'Not specified');

  // Food & Drink
  heading('Food & Drink');
  ratingBlock('Food & Drink Quality', payload.food_drink_quality);
  labelValue('Description', payload.food_drink_description || 'Not provided');
  labelValue('Offered Other Items', payload.offered_other_items || 'Not specified');

  // Additional
  heading('Additional Information');
  labelValue('Staff Work Activities', payload.staff_work_activities || 'Not specified');
  labelValue('Additional Comments', payload.additional_comments || 'No additional comments');

  // Images (as clickable links)
  heading('Food Images');
  const images = Array.isArray(payload.food_images) ? payload.food_images : [];
  if (images.length === 0) {
    labelValue('Images', 'No images uploaded');
  } else {
    for (let i = 0; i < images.length; i++) {
      newPageIfNeeded();
      const url = String(images[i] || '').trim();
      if (!url) continue;
      const linkText = `Image ${i + 1}`;
      drawLine(page, linkText, y, 12, font, url);
      y -= lineHeight;
      // raw URL in grey (helpful if client strips links)
      y = drawWrappedText({
        page,
        text: `(${url})`,
        y,
        font,
        size: 9,
        color: grey,
        maxWidth,
        margin
      }) - 2;
    }
  }

  // Legend
  newPageIfNeeded(40);
  page.drawText('Legend: 1–2 = Red, 3–4 = Orange, 5 = Green (stars use these colours)', {
    x: margin,
    y,
    size: 10,
    font,
    color: grey
  });
  y -= lineHeight;

  const pdfBytes = await pdfDoc.save();
  return {
    buffer: Buffer.from(pdfBytes),
    fileName: `${fileName}.pdf`,
    size: pdfBytes.length
  };
}

// =============================================================================
// (Old) HTML-to-PDF (kept, unchanged - not used by handler but retained per request)
// =============================================================================
async function generateRealPDF(htmlContent, fileName) {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595.28, 841.89]);
  let { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const textContent = stripHtmlAndFormat(htmlContent);
  let yPosition = height - 50;
  const lineHeight = 20;
  const margin = 50;
  const maxWidth = width - margin * 2;

  for (const line of textContent.lines) {
    if (yPosition < 50) {
      page = pdfDoc.addPage([595.28, 841.89]);
      yPosition = page.getSize().height - 50;
    }

    const currentFont = line.bold ? boldFont : font;
    const fontSize = line.heading ? 16 : 12;
    const words = line.text.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const textWidth = currentFont.widthOfTextAtSize(testLine, fontSize);
      if (textWidth > maxWidth && currentLine) {
        drawLine(page, currentLine, yPosition, fontSize, currentFont, line.link);
        yPosition -= lineHeight;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      drawLine(page, currentLine, yPosition, fontSize, currentFont, line.link);
      yPosition -= lineHeight + (line.heading ? 10 : 0);
    }
  }

  const pdfBytes = await pdfDoc.save();
  return {
    buffer: Buffer.from(pdfBytes),
    fileName: `${fileName}.pdf`,
    size: pdfBytes.length
  };
}

function stripHtmlAndFormat(html) {
  const lines = [];
  const cleanText = String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6])>/gi, '\n');
  const textLines = cleanText.split('\n');

  for (const line of textLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const linkMatch = trimmed.match(/<a\s+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/i);
    if (linkMatch) {
      const [, url, text] = linkMatch;
      lines.push({ text: String(text).trim(), bold: false, heading: false, link: url });
      continue;
    }

    const isHeading = /<h[1-6][^>]*>/i.test(trimmed);
    const isBold = /<b[^>]*>|<strong[^>]*>/i.test(trimmed);
    const cleanLine = trimmed.replace(/<[^>]*>/g, '');
    if (cleanLine) lines.push({ text: cleanLine, bold: isBold, heading: isHeading });
  }

  return { lines };
}

// =============================================================================
/** Email (Gmail via nodemailer) */
// =============================================================================
async function sendRealEmail(pdfBuffer, fileName, recipientEmail = 'essateric@gmail.com') {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  if (!emailUser || !emailPass) {
    throw new Error('Missing EMAIL_USER or EMAIL_PASS');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass
    },
    debug: true,
    logger: true
  });

  await transporter.verify();

  const mailOptions = {
    from: emailUser,
    to: recipientEmail || 'usman.aftab@chaiiwala.co.uk',
    cc: ['essateric@gmail.com'],
    subject: `Chaiiwala Customer Feedback - ${fileName}`,
    text: `PDF "${fileName}" attached.\n\nGenerated by Essateric Solutions`,
    html: `<h2>Chaiiwala Customer Feedback Submission</h2><p>PDF "<strong>${fileName}</strong>" is attached.</p>`,
    attachments: [
      {
        filename: fileName,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  };

  const info = await transporter.sendMail(mailOptions);
  return { success: true, messageId: info.messageId, response: info.response };
}

// =============================================================================
// (Old) HTML generator (kept as requested)
// =============================================================================
const formatRating = (r) => (!r || r === 0 ? 'Not Rated' : `${r}/5 ${'*'.repeat(Math.min(5, Number(r) || 0))}`);

const generateFeedbackHTML = (d) => `
<h1>Chaiiwala Customer Feedback Form</h1>
<p><strong>Store Location:</strong> ${d.location || 'Not specified'}</p>
<p><strong>Visit Date:</strong> ${d.visit_date || 'Not specified'}</p>
<p><strong>Customer Name:</strong> ${d.customer_name || 'Anonymous'}</p>
<h2>Service Quality</h2>
<p><strong>Order Read Back:</strong> ${d.order_read_back || 'Not specified'}</p>
<p><strong>Cutlery Provided:</strong> ${d.cutlery_provided || 'Not specified'}</p>
<p><strong>Staff In Uniform:</strong> ${d.staff_in_uniform || 'Not specified'}</p>
<p><strong>Friendly Greeting:</strong> ${formatRating(d.friendly_greeting)}</p>
<p><strong>Staff Chewing Gum:</strong> ${d.staff_chewing_gum || 'Not specified'}</p>
<h2>Experience Ratings</h2>
<p><strong>Customer Experience:</strong> ${formatRating(d.customer_experience)}</p>
<p><strong>Display Presentable:</strong> ${formatRating(d.display_presentable)}</p>
<p><strong>Customer Area Clean:</strong> ${formatRating(d.customer_area_clean)}</p>
<p><strong>Shop Vibe:</strong> ${formatRating(d.shop_vibe)}</p>
<h2>Environment</h2>
<p><strong>Temperature:</strong> ${d.temperature_suitable || 'Not specified'}</p>
<p><strong>Hot Drink Temperature:</strong> ${d.hot_drink_temperature || 'Not specified'}</p>
<h2>Food & Drink</h2>
<p><strong>Food and Drink Quality:</strong> ${formatRating(d.food_drink_quality)}</p>
<p><strong>Description:</strong> ${d.food_drink_description || 'Not provided'}</p>
<p><strong>Offered Other Items:</strong> ${d.offered_other_items || 'Not specified'}</p>
<h2>Additional Information</h2>
<p><strong>Staff Work Activities:</strong> ${d.staff_work_activities || 'Not specified'}</p>
<p><strong>Additional Comments:</strong> ${d.additional_comments || 'No additional comments'}</p>
<h2>Food Images</h2>
<p>${(d.food_images || []).map((url, i) => `<a href="${url}" target="_blank">Image ${i + 1}</a>`).join('<br>') || 'No images uploaded'}</p>
`.trim();

const generateFeedbackFileName = (d) => {
  const name = (d.customer_name || 'Anonymous').replace(/[^a-zA-Z0-9]/g, '_');
  const date = (d.visit_date || new Date().toISOString().split('T')[0]).replace(/[^0-9-]/g, '');
  return `${name}_${date}`;
};

// =============================================================================
// Netlify handler
// =============================================================================
export async function handler(event) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  // Method check
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse JSON body safely
    let payload;
    try {
      payload = JSON.parse(event.body || '{}');
    } catch (jsonErr) {
      console.error('❌ Invalid JSON:', jsonErr);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid JSON in request body.' })
      };
    }

    // Minimal required data
    if (!payload || (!payload.location && !payload.customer_name)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing required feedback data.' })
      };
    }

    const fileName = generateFeedbackFileName(payload);

    // Generate coloured-stars PDF
    let pdfResult;
    try {
      pdfResult = await generateTrafficLightPDF(payload, fileName);
    } catch (err) {
      console.error('❌ PDF generation failed:', err);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'PDF generation failed', detail: err.message })
      };
    }

    // Route recipient based on score + presence of required fields
    const score = Number(payload.customer_experience || 0);
    const recipient =
      score >= 4 && payload.location && payload.customer_name
        ? 'usman.aftab@chaiiwala.co.uk'
        : 'essateric@gmail.com';

    // Send email with PDF attachment
    let emailResult;
    try {
      emailResult = await sendRealEmail(pdfResult.buffer, pdfResult.fileName, recipient);
    } catch (emailError) {
      console.error('❌ Failed to send email:', emailError);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Email send failed', detail: emailError.message })
      };
    }

    // Success!
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: 'PDF generated and email sent.',
        emailSent: emailResult.success,
        recipient,
        fileName: pdfResult.fileName
      })
    };
  } catch (err) {
    console.error('❌ Unexpected server error:', err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message || 'Internal Server Error' })
    };
  }
}
