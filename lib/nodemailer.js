import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sender = `"Store Support" <${process.env.EMAIL_USER}>`;

export async function sendSignupEmail({ email, name }) {
  const mailOptions = {
    from: sender,
    to: email,
    subject: "Welcome to Our Store! Your Account is Ready",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #111827;">Welcome, ${name || "Customer"}!</h2>
        <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
          Thank you for creating an account with us. Your registration was successful, and you can now explore our catalog, track orders, and enjoy exclusive deals.
        </p>
        <div style="margin: 25px 0;">
          <a href="${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Start Shopping
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 12px;">
          If you did not sign up for this account, please ignore this email.
        </p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

export async function sendOrderConfirmationEmail({ email, name, orderNumber, items = [], totalAmount }) {
  const itemListHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #374151;">${item.title || "Item"}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #374151; text-align: center;">${item.quantity || 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #374151; text-align: right;">₹${Number(item.price || 0).toFixed(2)}</td>
      </tr>
    `
    )
    .join("");

  const mailOptions = {
    from: sender,
    to: email,
    subject: `Order Confirmed: #${orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #16a34a;">Thank You for Your Order!</h2>
        <p style="color: #4b5563; font-size: 15px;">Hello ${name || "Customer"},</p>
        <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
          Your order <strong>#${orderNumber}</strong> has been received and confirmed. We are preparing it for shipment.
        </p>

        <table style="width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 14px;">
          <thead>
            <tr style="background-color: #f3f4f6; text-align: left;">
              <th style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Product</th>
              <th style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">Qty</th>
              <th style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemListHtml}
          </tbody>
        </table>

        <div style="text-align: right; margin-top: 15px; font-size: 16px; font-weight: bold; color: #111827;">
          Total: ₹${Number(totalAmount || 0).toFixed(2)}
        </div>

        <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 12px;">
          Have questions about your order? Reply directly to this email or visit our store support.
        </p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

export async function sendOrderCancellationEmail({ email, name, orderNumber, reason, refundAmount }) {
  const mailOptions = {
    from: sender,
    to: email,
    subject: `Order Cancelled: #${orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #dc2626;">Order Cancelled</h2>
        <p style="color: #4b5563; font-size: 15px;">Hello ${name || "Customer"},</p>
        <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
          Your order <strong>#${orderNumber}</strong> has been cancelled.
        </p>
        ${
          reason
            ? `<div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 16px 0; color: #991b1b; font-size: 14px;">
                <strong>Reason:</strong> ${reason}
              </div>`
            : ""
        }
        ${
          refundAmount !== undefined
            ? `<p style="color: #4b5563; font-size: 15px;">
                A refund of <strong>₹${Number(refundAmount).toFixed(2)}</strong> has been initiated and should reflect in your account within 5-10 business days.
              </p>`
            : ""
        }
        <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 12px;">
          If this cancellation was in error, please contact our support team immediately.
        </p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}
