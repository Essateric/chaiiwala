import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { formatDeliveryDateVerbose } from '../../client/src/lib/formatters.js';


dotenv.config();

console.log('📧 FRESHWAYS EMAIL BOOTING...');
console.log('🔐 USER:', process.env.FRESHWAYS_ORDER_EMAIL_USER || '❌ Not Set');

export async function handler(event) {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: ''
      };
    }

    if (!event.body) {
      console.error("❌ No body received in POST request");
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing request body" })
      };
    }

    const data = JSON.parse(event.body);
    const formattedDeliveryDate = formatDeliveryDateVerbose(data.deliveryDate);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.FRESHWAYS_ORDER_EMAIL_USER,
        pass: process.env.FRESHWAYS_ORDER_EMAIL_PASS
      },
      debug: true,
      logger: true
    });

    await transporter.verify();
    console.log('✅ Email transporter verified.');

    const htmlBody = `
      <h2>🧾 Freshways Order</h2>
      <p><strong>Order ID:</strong> ${data.orderId}</p>
      <p><strong>Account Number:</strong> ${data.accountNumber}</p>
      <p><strong>Delivery Date:</strong> ${formattedDeliveryDate}</p>
      <p><strong>Store:</strong> ${data.store}</p>
      <p><strong>Total:</strong> <strong>£${data.totalPriceFormatted}</strong></p>

      <h3>🛒 Order Items</h3>
      <table border="1" cellspacing="0" cellpadding="6">
        <tr>
          <th>Item</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Subtotal</th>
        </tr>
        ${data.items.map(item => `
          <tr>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>£${item.price.toFixed(2)}</td>
            <td>${item.subtotal}</td>
          </tr>
        `).join('')}
      </table>

      <p><strong>Notes:</strong> ${data.notes || '—'}</p>
    `;

    const info = await transporter.sendMail({
      from: `"Freshways Orders" <${process.env.FRESHWAYS_ORDER_EMAIL_USER}>`,
      to: ['gurjit@freshways.co.uk, vishvas.verma@freshways.co.uk'],
      cc: ['usman.aftab@chaiiwala.co.uk, essateric@gmail.com'],
      subject: `New Freshways Order: ${data.orderId}`,
      html: htmlBody
    });

    console.log('📤 Email sent:', info.messageId);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: 'Email sent successfully', messageId: info.messageId })
    };

  } catch (err) {
    console.error('❌ Email send failed:', err);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Failed to send email', details: err.message })
    };
  }
}
