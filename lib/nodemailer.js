import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function getSender() {
  const fromName = process.env.EMAIL_FROM_NAME || "Store Support";
  const user = process.env.EMAIL_USER || "noreply@store.com";
  return `"${fromName}" <${user}>`;
}

function getBaseUrl() {
  let url = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  if (url.endsWith("/")) url = url.slice(0, -1);
  return url;
}

/**
 * Safe mail sender that logs and prevents unhandled errors from breaking API flows.
 */
async function sendMailSafe(mailOptions) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn(
      "[Nodemailer] EMAIL_USER or EMAIL_PASS not configured. Skipping email to:",
      mailOptions.to
    );
    return { success: false, skipped: true, reason: "Credentials not configured" };
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[AutoMail] Successfully dispatched '${mailOptions.subject}' to ${mailOptions.to}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[AutoMail] Failed to send email to ${mailOptions.to}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 1. Automatic Welcome & Thank You Email on Customer Registration
 */
export async function sendSignupEmail({ email, name }) {
  const baseUrl = getBaseUrl();
  const displayName = name ? name.trim() : "Customer";

  const mailOptions = {
    from: getSender(),
    to: email,
    subject: "Thank You for Registering with Us! 🎉",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff; color: #1f2937;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #f3f4f6;">
          <span style="background-color: #dbeafe; color: #1d4ed8; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase;">
            Registration Confirmed
          </span>
          <h1 style="color: #111827; font-size: 24px; font-weight: 800; margin: 12px 0 4px;">Thank You for Registering!</h1>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Welcome to Ecomm Store</p>
        </div>

        <div style="padding: 24px 0;">
          <h2 style="color: #111827; font-size: 18px; margin-top: 0;">Hello ${displayName},</h2>
          <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
            Thank you for registering with us! Your account has been successfully verified and activated. You can now browse our full collection, place orders with fast local delivery, and track shipments in real time.
          </p>

          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 6px; font-size: 13px; color: #111827; font-weight: 600;">Your Account Details:</p>
            <p style="margin: 0; font-size: 13px; color: #4b5563;">
              <strong>Registered Email:</strong> ${email}
            </p>
          </div>

          <div style="text-align: center; margin: 28px 0 10px;">
            <a href="${baseUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
              Start Shopping Now
            </a>
          </div>
        </div>

        <div style="border-top: 1px solid #f3f4f6; padding-top: 16px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            If you did not register for this account, please disregard this email.
          </p>
        </div>
      </div>
    `,
  };

  return sendMailSafe(mailOptions);
}

/**
 * Schedules the Thank You for Registration email with a 5-minute delay (300,000 ms).
 */
export function scheduleDelayedSignupEmail({ email, name }, delayMs = 5 * 60 * 1000) {
  console.log(
    `[AutoMail] Scheduled Thank You for Registration email for ${email} in ${Math.round(delayMs / 60000)} minute(s).`
  );

  const timer = setTimeout(async () => {
    try {
      console.log(`[AutoMail] Executing 5-minute delayed registration email for: ${email}`);
      await sendSignupEmail({ email, name });
    } catch (err) {
      console.error("[AutoMail] Delayed registration email failed:", err.message);
    }
  }, delayMs);

  if (timer.unref) {
    timer.unref();
  }

  return timer;
}

/**
 * 2. Automatic Order Confirmation Email on Successful Checkout
 */
export async function sendOrderConfirmationEmail({
  email,
  name,
  orderNumber,
  items = [],
  subtotal,
  deliveryCharge = 0,
  totalAmount,
  deliveryAddress,
  deliveryZone,
}) {
  const baseUrl = getBaseUrl();
  const displayName = name ? name.trim() : "Customer";
  const formattedTotal = Number(totalAmount || 0).toFixed(2);
  const formattedSubtotal = subtotal !== undefined ? Number(subtotal).toFixed(2) : formattedTotal;
  const formattedDelivery = Number(deliveryCharge) > 0 ? `₹${Number(deliveryCharge).toFixed(2)}` : "FREE";

  const itemListHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #f3f4f6; color: #1f2937; font-weight: 500;">
          ${item.title || "Store Item"}
        </td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #f3f4f6; color: #4b5563; text-align: center;">
          ${item.quantity || 1}
        </td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #f3f4f6; color: #111827; text-align: right; font-weight: 600;">
          ₹${Number((item.price || 0) * (item.quantity || 1)).toFixed(2)}
        </td>
      </tr>
    `
    )
    .join("");

  const addressText =
    typeof deliveryAddress === "string"
      ? deliveryAddress
      : deliveryAddress?.address || "Selected Map Location";

  const zoneName = typeof deliveryZone === "string" ? deliveryZone : deliveryZone?.name || "Standard";

  const mailOptions = {
    from: getSender(),
    to: email,
    subject: `Order Confirmed: #${orderNumber} 📦`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff; color: #1f2937;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #f3f4f6;">
          <span style="background-color: #dcfce7; color: #15803d; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase;">Payment Confirmed</span>
          <h1 style="color: #111827; font-size: 22px; font-weight: 800; margin: 12px 0 4px;">Thank you for your order!</h1>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Order #${orderNumber}</p>
        </div>

        <div style="padding: 20px 0;">
          <p style="color: #4b5563; font-size: 15px; margin-top: 0;">
            Hello <strong>${displayName}</strong>, we have received your order and our fulfillment team is preparing it for dispatch.
          </p>

          <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px;">
            <thead>
              <tr style="background-color: #f9fafb; text-align: left; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">
                <th style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb;">Product</th>
                <th style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">Qty</th>
                <th style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemListHtml}
            </tbody>
          </table>

          <div style="margin-top: 16px; padding: 12px; background-color: #f9fafb; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 14px; color: #4b5563; margin-bottom: 6px;">
              <span>Subtotal:</span>
              <span>₹${formattedSubtotal}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 14px; color: #4b5563; margin-bottom: 6px;">
              <span>Delivery Charge (${zoneName}):</span>
              <span>${formattedDelivery}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; color: #111827; padding-top: 8px; border-top: 1px solid #e5e7eb;">
              <span>Total Paid:</span>
              <span style="color: #16a34a;">₹${formattedTotal}</span>
            </div>
          </div>

          <div style="margin-top: 20px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px;">
            <p style="margin: 0 0 6px; font-size: 13px; font-weight: 700; color: #1e40af;">📍 Delivery Address:</p>
            <p style="margin: 0; font-size: 13px; color: #1e3a8a;">${addressText}</p>
          </div>

          <div style="text-align: center; margin: 28px 0 10px;">
            <a href="${baseUrl}/orders?orderNumber=${orderNumber}" style="background-color: #111827; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
              Track Your Order & Delivery
            </a>
          </div>
        </div>

        <div style="border-top: 1px solid #f3f4f6; padding-top: 16px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            Need help? Reply to this email or visit our store support.
          </p>
        </div>
      </div>
    `,
  };

  return sendMailSafe(mailOptions);
}

/**
 * 3. Automatic Delivery Status Update Email (Out for delivery, Delivered, Assigned)
 */
export async function sendOrderStatusEmail({
  email,
  name,
  orderNumber,
  deliveryStatus,
  riderName,
  riderPhone,
  deliveryAddress,
  deliveryOtp,
}) {
  const baseUrl = getBaseUrl();
  const displayName = name ? name.trim() : "Customer";

  let statusTitle = "Order Update";
  let statusBadgeColor = "#2563eb";
  let statusBadgeBg = "#dbeafe";
  let statusMessage = `Your order #${orderNumber} status has been updated to: <strong>${deliveryStatus}</strong>.`;

  if (deliveryStatus === "out_for_delivery") {
    statusTitle = "Your Order is Out for Delivery! 🚚";
    statusBadgeColor = "#d97706";
    statusBadgeBg = "#fef3c7";
    statusMessage = `Great news! Your order <strong>#${orderNumber}</strong> has been picked up by our delivery rider and is on its way to you.`;
  } else if (deliveryStatus === "delivered") {
    statusTitle = "Your Order Has Been Delivered! 🎉";
    statusBadgeColor = "#16a34a";
    statusBadgeBg = "#dcfce7";
    statusMessage = `Your order <strong>#${orderNumber}</strong> has been successfully delivered. We hope you enjoy your purchase!`;
  } else if (deliveryStatus === "assigned") {
    statusTitle = "Rider Assigned to Your Order 🛵";
    statusBadgeColor = "#6366f1";
    statusBadgeBg = "#e0e7ff";
    statusMessage = `A delivery partner has been assigned to your order <strong>#${orderNumber}</strong> and will pick it up shortly.`;
  }

  const riderBlock =
    riderName || riderPhone
      ? `
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; margin: 18px 0;">
        <p style="margin: 0 0 6px; font-size: 13px; font-weight: 700; color: #111827;">🛵 Delivery Partner Details:</p>
        ${riderName ? `<p style="margin: 0 0 4px; font-size: 13px; color: #4b5563;"><strong>Rider:</strong> ${riderName}</p>` : ""}
        ${riderPhone ? `<p style="margin: 0; font-size: 13px; color: #4b5563;"><strong>Contact:</strong> ${riderPhone}</p>` : ""}
      </div>
    `
      : "";

  const otpBlock = deliveryOtp
    ? `
      <div style="background-color: #fefce8; border: 1px dashed #ca8a04; border-radius: 8px; padding: 12px; margin: 16px 0; text-align: center;">
        <span style="font-size: 12px; color: #854d0e; font-weight: 600;">Delivery Verification OTP:</span>
        <div style="font-size: 24px; font-weight: 800; letter-spacing: 4px; color: #713f12; margin-top: 4px;">${deliveryOtp}</div>
      </div>
    `
    : "";

  const mailOptions = {
    from: getSender(),
    to: email,
    subject: `${statusTitle} (#${orderNumber})`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff; color: #1f2937;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #f3f4f6;">
          <span style="background-color: ${statusBadgeBg}; color: ${statusBadgeColor}; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase;">
            ${deliveryStatus.replace(/_/g, " ")}
          </span>
          <h1 style="color: #111827; font-size: 22px; font-weight: 800; margin: 12px 0 4px;">${statusTitle}</h1>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Order #${orderNumber}</p>
        </div>

        <div style="padding: 20px 0;">
          <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin-top: 0;">
            Hello ${displayName},<br /><br />
            ${statusMessage}
          </p>

          ${otpBlock}
          ${riderBlock}

          ${
            deliveryAddress
              ? `<p style="font-size: 13px; color: #6b7280; margin-top: 12px;"><strong>Destination:</strong> ${typeof deliveryAddress === "string" ? deliveryAddress : deliveryAddress.address || ""}</p>`
              : ""
          }

          <div style="text-align: center; margin: 28px 0 10px;">
            <a href="${baseUrl}/orders?orderNumber=${orderNumber}" style="background-color: #111827; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
              View Live Tracking
            </a>
          </div>
        </div>

        <div style="border-top: 1px solid #f3f4f6; padding-top: 16px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            Thank you for ordering with us!
          </p>
        </div>
      </div>
    `,
  };

  return sendMailSafe(mailOptions);
}

/**
 * 4. Automatic Order Cancellation & Refund Email
 */
export async function sendOrderCancellationEmail({
  email,
  name,
  orderNumber,
  reason,
  refundAmount,
  refundStripeId,
}) {
  const baseUrl = getBaseUrl();
  const displayName = name ? name.trim() : "Customer";

  const mailOptions = {
    from: getSender(),
    to: email,
    subject: `Order Update: #${orderNumber} Cancelled & Refunded`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff; color: #1f2937;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #f3f4f6;">
          <span style="background-color: #fee2e2; color: #b91c1c; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase;">
            Order Cancelled
          </span>
          <h1 style="color: #111827; font-size: 22px; font-weight: 800; margin: 12px 0 4px;">Order #${orderNumber}</h1>
        </div>

        <div style="padding: 20px 0;">
          <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin-top: 0;">
            Hello ${displayName},<br /><br />
            Your order <strong>#${orderNumber}</strong> has been cancelled.
          </p>

          ${
            reason
              ? `
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0; color: #991b1b; font-size: 14px;">
              <strong>Reason:</strong> ${reason}
            </div>
          `
              : ""
          }

          ${
            refundAmount !== undefined
              ? `
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px; margin: 16px 0;">
              <p style="margin: 0 0 6px; font-size: 14px; color: #166534; font-weight: 700;">
                Refund Processed: ₹${Number(refundAmount).toFixed(2)}
              </p>
              <p style="margin: 0; font-size: 12px; color: #15803d;">
                The refund has been issued to your original payment method. Depending on your bank, it may take 5-10 business days to appear on your statement.
                ${refundStripeId ? `<br /><span style="color: #4ade80; font-family: monospace;">Ref ID: ${refundStripeId}</span>` : ""}
              </p>
            </div>
          `
              : ""
          }

          <div style="text-align: center; margin: 28px 0 10px;">
            <a href="${baseUrl}" style="background-color: #111827; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
              Return to Store
            </a>
          </div>
        </div>

        <div style="border-top: 1px solid #f3f4f6; padding-top: 16px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            If you have questions or believe this was a mistake, please reply to this email.
          </p>
        </div>
      </div>
    `,
  };

  return sendMailSafe(mailOptions);
}

/**
 * 5. Automatic Email when Customer files a Refund Request
 */
export async function sendRefundRequestEmail({
  email,
  name,
  orderNumber,
  reason,
  notes,
  totalAmount,
}) {
  const baseUrl = getBaseUrl();
  const displayName = name ? name.trim() : "Customer";

  const mailOptions = {
    from: getSender(),
    to: email,
    subject: `Refund Request Received: #${orderNumber} 📝`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff; color: #1f2937;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #f3f4f6;">
          <span style="background-color: #fef3c7; color: #b45309; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase;">
            Refund Under Review
          </span>
          <h1 style="color: #111827; font-size: 22px; font-weight: 800; margin: 12px 0 4px;">Refund Request Received</h1>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Order #${orderNumber}</p>
        </div>

        <div style="padding: 20px 0;">
          <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin-top: 0;">
            Hello ${displayName},<br /><br />
            We have received your refund request for order <strong>#${orderNumber}</strong>. Our admin review team is inspecting the details and will process your refund shortly.
          </p>

          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; margin: 16px 0;">
            <p style="margin: 0 0 6px; font-size: 13px; color: #4b5563;">
              <strong>Reason:</strong> ${reason}
            </p>
            ${notes ? `<p style="margin: 0 0 6px; font-size: 13px; color: #4b5563;"><strong>Notes:</strong> ${notes}</p>` : ""}
            ${totalAmount ? `<p style="margin: 0; font-size: 13px; color: #111827; font-weight: 700;"><strong>Order Total:</strong> ₹${Number(totalAmount).toFixed(2)}</p>` : ""}
          </div>

          <div style="text-align: center; margin: 28px 0 10px;">
            <a href="${baseUrl}/orders?orderNumber=${orderNumber}" style="background-color: #111827; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
              Check Refund Status
            </a>
          </div>
        </div>

        <div style="border-top: 1px solid #f3f4f6; padding-top: 16px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            We aim to process all verified returns and refunds within 24-48 hours.
          </p>
        </div>
      </div>
    `,
  };

  return sendMailSafe(mailOptions);
}

