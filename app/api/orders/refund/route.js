import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Order from "@/models/Order";

// POST /api/orders/refund
// Customer calls this to request a refund when a product is wrong or defective
export async function POST(request) {
  try {
    await connectDB();

    const { orderId, refundReason, refundNotes } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "Order ID is required." },
        { status: 400 }
      );
    }

    if (!refundReason) {
      return NextResponse.json(
        { success: false, message: "Please specify why the product is not correct." },
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

    if (order.status === "refunded") {
      return NextResponse.json(
        { success: false, message: "This order has already been refunded." },
        { status: 400 }
      );
    }

    if (order.status === "refund_requested") {
      return NextResponse.json(
        { success: false, message: "A refund request is already pending for this order." },
        { status: 400 }
      );
    }

    // Update order with customer's refund request details
    order.status = "refund_requested";
    order.refundReason = refundReason;
    order.refundNotes = refundNotes || "";
    order.refundRequestedAt = new Date();

    await order.save();

    return NextResponse.json({
      success: true,
      message: "Refund request submitted successfully! Our admin team will review it shortly.",
      order,
    });
  } catch (error) {
    console.error("Refund request error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to submit refund request", error: error.message },
      { status: 500 }
    );
  }
}
