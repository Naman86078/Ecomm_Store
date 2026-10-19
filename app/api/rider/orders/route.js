import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Order from "@/models/Order";
import Rider from "@/models/Rider";
import { sendOrderStatusEmail } from "@/lib/nodemailer";

// GET /api/rider/orders?riderId=...
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const riderId = searchParams.get("riderId");

    let myActiveOrder = null;
    let assignedOrders = [];
    let availableOrders = [];

    if (riderId) {
      const normalizedRiderId = riderId.toUpperCase();
      const rider = await Rider.findOne({ riderId: normalizedRiderId });

      if (rider && rider.activeOrderNumber) {
        myActiveOrder = await Order.findOne({ orderNumber: rider.activeOrderNumber });
      }

      // Orders assigned specifically to this rider
      assignedOrders = await Order.find({
        $or: [
          { riderCode: normalizedRiderId },
          { riderName: rider?.name },
          { orderNumber: rider?.activeOrderNumber },
        ],
      }).sort({ createdAt: -1 });
    }

    // Available unassigned orders that need a rider
    availableOrders = await Order.find({
      deliveryStatus: { $in: ["pending", "refund_rejected"] },
      status: "paid",
    })
      .sort({ createdAt: -1 })
      .limit(10);

    return NextResponse.json({
      success: true,
      myActiveOrder,
      assignedOrders,
      availableOrders,
    });
  } catch (error) {
    console.error("Fetch rider orders error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch orders", error: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/rider/orders
// Body: { riderId, orderNumber, action: "accept" | "pickup" | "deliver" | "release", otp?: string }
export async function PATCH(request) {
  try {
    await connectDB();

    const { riderId, orderNumber, action, otp } = await request.json();

    if (!riderId || !orderNumber || !action) {
      return NextResponse.json(
        { success: false, message: "riderId, orderNumber, and action are required" },
        { status: 400 }
      );
    }

    const normalizedRiderId = riderId.toUpperCase();
    const rider = await Rider.findOne({ riderId: normalizedRiderId });
    if (!rider) {
      return NextResponse.json(
        { success: false, message: "Rider not found" },
        { status: 404 }
      );
    }

    const order = await Order.findOne({ orderNumber });
    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    if (action === "accept") {
      // Assign this order to the rider
      order.deliveryStatus = "assigned";
      order.riderId = rider._id;
      order.riderCode = rider.riderId;
      order.riderName = rider.name;
      order.riderPhone = rider.phone;
      order.riderVehicle = rider.vehicle;
      order.assignedAt = new Date();
      await order.save();

      rider.activeOrderNumber = orderNumber;
      rider.status = "busy";
      await rider.save();

      // Automatically inform customer that rider was assigned
      sendOrderStatusEmail({
        email: order.customerEmail,
        name: order.customerName,
        orderNumber: order.orderNumber,
        deliveryStatus: "assigned",
        riderName: rider.name,
        riderPhone: rider.phone,
        deliveryAddress: order.deliveryAddress,
      }).catch((err) => console.warn("[AutoMail] Assigned email failed:", err.message));

      return NextResponse.json({
        success: true,
        message: `Order #${orderNumber} accepted successfully!`,
        order,
        rider,
      });
    }

    if (action === "pickup") {
      // Mark as Out for Delivery
      order.deliveryStatus = "out_for_delivery";
      await order.save();

      // Automatically notify customer order is out for delivery
      sendOrderStatusEmail({
        email: order.customerEmail,
        name: order.customerName,
        orderNumber: order.orderNumber,
        deliveryStatus: "out_for_delivery",
        riderName: rider?.name || order.riderName,
        riderPhone: rider?.phone || order.riderPhone,
        deliveryAddress: order.deliveryAddress,
        deliveryOtp: order.deliveryOtp,
      }).catch((err) => console.warn("[AutoMail] Out for delivery email failed:", err.message));

      return NextResponse.json({
        success: true,
        message: `Order #${orderNumber} picked up. Out for delivery!`,
        order,
      });
    }

    if (action === "deliver") {
      // OTP verification: Accept provided OTP or match order OTP (or 4 digits in demo)
      if (order.deliveryOtp && otp && String(order.deliveryOtp) !== String(otp).trim()) {
        return NextResponse.json(
          { success: false, message: "Incorrect Delivery OTP! Please confirm with customer." },
          { status: 400 }
        );
      }

      order.deliveryStatus = "delivered";
      order.deliveredAt = new Date();
      await order.save();

      rider.activeOrderNumber = null;
      rider.status = "available";
      rider.totalTrips = (rider.totalTrips || 0) + 1;
      const tripEarning = Math.round((order.deliveryCharge || 40) + 35);
      rider.todayEarnings = (rider.todayEarnings || 0) + tripEarning;
      await rider.save();

      // Automatically notify customer order is delivered
      sendOrderStatusEmail({
        email: order.customerEmail,
        name: order.customerName,
        orderNumber: order.orderNumber,
        deliveryStatus: "delivered",
        riderName: rider?.name || order.riderName,
        riderPhone: rider?.phone || order.riderPhone,
        deliveryAddress: order.deliveryAddress,
      }).catch((err) => console.warn("[AutoMail] Delivered email failed:", err.message));

      return NextResponse.json({
        success: true,
        message: `Order #${orderNumber} marked as Delivered! ₹${tripEarning} added to earnings.`,
        order,
        rider,
      });
    }

    if (action === "release") {
      // Release order back to pool
      order.deliveryStatus = "pending";
      order.riderId = null;
      order.riderCode = "";
      order.riderName = "";
      order.assignedAt = null;
      await order.save();

      rider.activeOrderNumber = null;
      rider.status = "available";
      await rider.save();

      return NextResponse.json({
        success: true,
        message: `Order #${orderNumber} released.`,
        order,
        rider,
      });
    }

    return NextResponse.json(
      { success: false, message: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Rider order action error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to process order action", error: error.message },
      { status: 500 }
    );
  }
}
