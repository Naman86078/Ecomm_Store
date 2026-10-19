import { NextResponse } from "next/server";
import { sendOrderCancellationEmail } from "@/lib/nodemailer";
import connectDB from "@/lib/db";
import Order from "@/models/Order";

export async function POST(request) {
  try {
    const body = await request.json();
    let { orderId, email, name, orderNumber, reason, refundAmount } = body;

    if (orderId) {
      await connectDB();
      const order = await Order.findById(orderId);
      if (!order) {
        return NextResponse.json(
          { success: false, message: "Order not found" },
          { status: 404 }
        );
      }
      email = email || order.customerEmail;
      name = name || order.customerName;
      orderNumber = orderNumber || order.orderNumber;
      refundAmount = refundAmount !== undefined ? refundAmount : order.totalAmount;
    }

    if (!email || !orderNumber) {
      return NextResponse.json(
        { success: false, message: "Customer email and order number are required" },
        { status: 400 }
      );
    }

    await sendOrderCancellationEmail({
      email,
      name,
      orderNumber,
      reason: reason || "Cancelled by customer request",
      refundAmount,
      refundStripeId: body.refundStripeId,
    });

    return NextResponse.json({
      success: true,
      message: "Order cancellation email sent successfully",
    });
  } catch (error) {
    console.error("Order cancellation email error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to send order cancellation email", error: error.message },
      { status: 500 }
    );
  }
}
