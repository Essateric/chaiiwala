import nodemailer from 'nodemailer';

export async function handler(event) {
  try {
    const data = JSON.parse(event.body);

    // 1. Configure your mail transport
    const transporter = nodemailer.createTransport({
      service: 'gmail', // or use 'hotmail', 'outlook', 'yahoo' etc.
      auth: {
        user: process.env.FRESHWAYS_ORDER_EMAIL_USER,
        pass: process.env.FRESHWAYS_ORDER_EMAIL_PASS
      }
    });

    // 2. Build the email HTML
    const htmlBody = `
      <h2>🧾 Freshways Order</h2>
      <p><strong>Order ID:</strong> ${data.orderId}</p>
      <p><strong>Account Number:</strong> ${data.accountNumber}</p>
      <p><strong>Delivery Date:</strong> ${data.deliveryDate}</p>
      <p><strong>Store:</strong> ${data.store}</p>
      <p><strong>Address:</strong> ${data.storeAddress}</p>
      <p><strong>Phone:</strong> ${data.storePhone}</p>
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

    // 3. Send the email
    await transporter.sendMail({
      from: `"Freshways Orders" <${process.env.FRESHWAYS_ORDER_EMAIL_USER}>`,
      to: 'essateric@gmail.com', // 👈 Replace this with your real destination
      subject: `New Freshways Order: ${data.orderId}`,
      html: htmlBody
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Email sent successfully' })
    };
  } catch (err) {
    console.error('Email failed:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send email', details: err.message })
    };
  }
}
