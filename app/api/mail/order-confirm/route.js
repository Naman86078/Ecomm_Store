import { NextResponse } from "next/server";
import { sendOrderConfirmationEmail } from "@/lib/nodemailer";
import connectDB from "@/lib/db";
import Order from "@/models/Order";

export async function POST(request) {
  try {
    const body = await request.json();
    let { orderId, email, name, orderNumber, items, totalAmount } = body;

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
      items = items || order.items;
      totalAmount = totalAmount !== undefined ? totalAmount : order.totalAmount;
    }

    if (!email || !orderNumber) {
      return NextResponse.json(
        { success: false, message: "Customer email and order number are required" },
        { status: 400 }
      );
    }

    await sendOrderConfirmationEmail({
      email,
      name,
      orderNumber,
      items: items || [],
      subtotal: body.subtotal,
      deliveryCharge: body.deliveryCharge,
      totalAmount: totalAmount || 0,
      deliveryAddress: body.deliveryAddress,
      deliveryZone: body.deliveryZone,
    });

    return NextResponse.json({
      success: true,
      message: "Order confirmation email sent successfully",
    });
  } catch (error) {
    console.error("Order confirmation email error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to send order confirmation email", error: error.message },
      { status: 500 }
    );
  }
}
