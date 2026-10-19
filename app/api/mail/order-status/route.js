import { NextResponse } from "next/server";
import { sendOrderStatusEmail } from "@/lib/nodemailer";
import connectDB from "@/lib/db";
import Order from "@/models/Order";

export async function POST(request) {
  try {
    const body = await request.json();
    let {
      orderId,
      orderNumber,
      email,
      name,
      deliveryStatus,
      riderName,
      riderPhone,
      deliveryAddress,
      deliveryOtp,
    } = body;

    if (orderId || orderNumber) {
      await connectDB();
      const order = orderId
        ? await Order.findById(orderId)
        : await Order.findOne({ orderNumber });

      if (!order) {
        return NextResponse.json(
          { success: false, message: "Order not found" },
          { status: 404 }
        );
      }

      email = email || order.customerEmail;
      name = name || order.customerName;
      orderNumber = orderNumber || order.orderNumber;
      deliveryStatus = deliveryStatus || order.deliveryStatus;
      riderName = riderName || order.riderName;
      riderPhone = riderPhone || order.riderPhone;
      deliveryAddress = deliveryAddress || order.deliveryAddress;
      deliveryOtp = deliveryOtp || order.deliveryOtp;
    }

    if (!email || !orderNumber || !deliveryStatus) {
      return NextResponse.json(
        {
          success: false,
          message: "Email, orderNumber, and deliveryStatus are required",
        },
        { status: 400 }
      );
    }

    const result = await sendOrderStatusEmail({
      email,
      name,
      orderNumber,
      deliveryStatus,
      riderName,
      riderPhone,
      deliveryAddress,
      deliveryOtp,
    });

    return NextResponse.json({
      success: true,
      message: "Order status email dispatched successfully",
      result,
    });
  } catch (error) {
    console.error("Order status email error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to send order status email",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
