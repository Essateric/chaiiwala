

// =============================================
// File: netlify/functions/sendChaiiwalaOrderEmail.mjs
// - ESM, uses Nodemailer. Mirrors your existing setup preferences.
// - Expects POST JSON: { filename, storeName, archivePublicUrl, mimeType, fileDataBase64 }
// - Sends to orders@chaiiwala.co.uk, CC usman.aftab@chaiiwala.co.uk
// - Uses environment vars for SMTP (recommended):
//     CHAIWALA_EMAIL_USER, CHAIWALA_EMAIL_PASS, CHAIWALA_EMAIL_HOST (optional), CHAIWALA_EMAIL_PORT (optional)
//
// If you already have a transporter (like your Freshways function), you can reuse it.
// =============================================

import 'dotenv/config';
import nodemailer from 'nodemailer';

export const handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const body = JSON.parse(event.body || '{}');
    const { filename, storeName, archivePublicUrl, mimeType, fileDataBase64 } = body;

    if (!filename || !fileDataBase64) {
      return { statusCode: 400, body: 'Missing filename or file data' };
    }

    const user = process.env.CHAIWALA_EMAIL_USER || process.env.FRESHWAYS_ORDER_EMAIL_USER;
    const pass = process.env.CHAIWALA_EMAIL_PASS || process.env.FRESHWAYS_ORDER_EMAIL_PASS;
    const host = process.env.CHAIWALA_EMAIL_HOST || 'smtp.gmail.com';
    const port = Number(process.env.CHAIWALA_EMAIL_PORT || 465);

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for 587
      auth: { user, pass }
    });

    const to = 'orders@chaiiwala.co.uk';
    const cc = 'usman.aftab@chaiiwala.co.uk';

    const subject = `Chaiiwala Order – ${storeName || 'Store'} – ${filename}`;
    const text = [
      `Please find attached the Chaiiwala order for ${storeName || 'the store'}.`,
      archivePublicUrl ? `Archive copy: ${archivePublicUrl}` : '',
    ].filter(Boolean).join('\n');

    const info = await transporter.sendMail({
      from: user,
      to,
      cc,
      subject,
      text,
      attachments: [
        {
          filename,
          content: Buffer.from(fileDataBase64, 'base64'),
          contentType: mimeType || 'application/vnd.ms-excel'
        }
      ]
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, messageId: info.messageId })
    };
  } catch (err) {
    console.error('sendChaiiwalaOrderEmail error:', err);
    return { statusCode: 500, body: err?.message || 'Internal Server Error' };
  }
};
