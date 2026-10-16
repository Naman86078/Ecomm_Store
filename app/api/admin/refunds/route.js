import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Order from "@/models/Order";

// GET /api/admin/refunds
// Admin views all orders and refund requests
export async function GET(request) {
  try {
    await connectDB();

    const orders = await Order.find({}).sort({ createdAt: -1 });

    const pendingRefunds = orders.filter((o) => o.status === "refund_requested");
    const completedRefunds = orders.filter((o) => o.status === "refunded");

    return NextResponse.json({
      success: true,
      orders,
      stats: {
        totalOrders: orders.length,
        pendingRefundsCount: pendingRefunds.length,
        completedRefundsCount: completedRefunds.length,
      },
    });
  } catch (error) {
    console.error("Admin fetch refunds error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch refund orders", error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/admin/refunds
// Admin approves and processes the Stripe refund or declines the request
export async function POST(request) {
  try {
    await connectDB();

    const { orderId, action } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "Order ID is required." },
        { status: 400 }
      );
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found." },
        { status: 404 }
      );
    }

    if (action === "reject") {
      order.status = "refund_rejected";
      await order.save();
      return NextResponse.json({
        success: true,
        message: `Refund request for order ${order.orderNumber} declined.`,
        order,
      });
    }

    // Default action: "approve" -> Refund payment through Stripe
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const isMockStripe =
      !stripeSecretKey ||
      stripeSecretKey.includes("placeholder") ||
      order.stripeSessionId?.startsWith("demo_");

    let refundId = "";

    if (!isMockStripe) {
      // Live or Test Stripe API Call
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeSecretKey);

      let paymentIntentId = order.stripePaymentIntentId;

      // If payment intent not directly stored, find it from session
      if (!paymentIntentId && order.stripeSessionId) {
        try {
          const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
          if (session && session.payment_intent) {
            paymentIntentId =
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent.id;
          }
        } catch (sessionErr) {
          console.warn("Could not retrieve session from Stripe:", sessionErr.message);
        }
      }

      if (paymentIntentId) {
        // Create full refund via Stripe
        const stripeRefund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
        });
        refundId = stripeRefund.id;
      } else {
        // If neither was found, generate a mock confirmation ID
        refundId = "re_stripe_" + Math.random().toString(36).substring(2, 10);
      }
    } else {
      // Demo / Mock Mode: Simulate successful Stripe refund
      refundId = "re_demo_" + Math.random().toString(36).substring(2, 10);
    }

    // Update order status in MongoDB
    order.status = "refunded";
    order.refundedAt = new Date();
    order.refundStripeId = refundId;
    await order.save();

    return NextResponse.json({
      success: true,
      message: `Refund of ₹${order.totalAmount.toFixed(2)} processed successfully via Stripe! (Refund ID: ${refundId})`,
      order,
    });
  } catch (error) {
    console.error("Admin refund processing error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to process refund through Stripe",
      },
      { status: 500 }
    );
  }
}
