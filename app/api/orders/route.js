import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Order from "@/models/Order";
import Rider from "@/models/Rider";

// GET /api/orders?email=... or ?orderNumber=... or ?admin=true or ?deliveryStatus=... or ?riderId=...
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const orderNumber = searchParams.get("orderNumber");
    const isAdmin = searchParams.get("admin") === "true";
    const deliveryStatus = searchParams.get("deliveryStatus");
    const riderCode = searchParams.get("riderCode");

    let query = {};

    if (orderNumber) {
      query.orderNumber = orderNumber.trim();
    } else if (email) {
      query.customerEmail = email.toLowerCase().trim();
    } else if (isAdmin) {
      // Admin dispatch view
      query = {};
      if (deliveryStatus && deliveryStatus !== "all") {
        query.deliveryStatus = deliveryStatus;
      }
      if (riderCode && riderCode !== "all") {
        query.riderCode = riderCode.toUpperCase();
      }
    } else {
      // Unauthenticated visitor with no email: return empty array to protect customer data
      return NextResponse.json({
        success: true,
        orders: [],
      });
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });

    // Compute delivery counts for live telemetry
    const deliveryStats = {
      total: orders.length,
      pending: orders.filter((o) => !o.deliveryStatus || o.deliveryStatus === "pending").length,
      assigned: orders.filter((o) => o.deliveryStatus === "assigned").length,
      out_for_delivery: orders.filter((o) => o.deliveryStatus === "out_for_delivery").length,
      delivered: orders.filter((o) => o.deliveryStatus === "delivered").length,
    };

    return NextResponse.json({
      success: true,
      orders,
      stats: deliveryStats,
    });
  } catch (error) {
    console.error("Fetch orders error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch orders", error: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/orders
// Update order deliveryStatus, rider assignment, or OTP verification
export async function PATCH(request) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      orderNumber,
      deliveryStatus,
      riderId,
      riderCode,
      riderName,
      riderPhone,
      riderVehicle,
      deliveryOtp,
    } = body;

    if (!orderNumber) {
      return NextResponse.json(
        { success: false, message: "orderNumber is required" },
        { status: 400 }
      );
    }

    const order = await Order.findOne({ orderNumber });
    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    // Update rider info if supplied
    if (riderCode !== undefined) order.riderCode = riderCode;
    if (riderName !== undefined) order.riderName = riderName;
    if (riderPhone !== undefined) order.riderPhone = riderPhone;
    if (riderVehicle !== undefined) order.riderVehicle = riderVehicle;
    if (riderId !== undefined) order.riderId = riderId;
    if (deliveryOtp !== undefined) order.deliveryOtp = deliveryOtp;

    // Update delivery status and lifecycle timestamps
    if (deliveryStatus) {
      const validStatuses = ["pending", "assigned", "out_for_delivery", "delivered", "cancelled"];
      if (!validStatuses.includes(deliveryStatus)) {
        return NextResponse.json(
          { success: false, message: "Invalid deliveryStatus value" },
          { status: 400 }
        );
      }

      order.deliveryStatus = deliveryStatus;

      if (deliveryStatus === "assigned" && !order.assignedAt) {
        order.assignedAt = new Date();
      }

      if (deliveryStatus === "delivered") {
        order.deliveredAt = new Date();
      }

      if (deliveryStatus === "pending") {
        order.deliveredAt = null;
        order.assignedAt = null;
        order.riderCode = "";
        order.riderName = "";
        order.riderPhone = "";
        order.riderVehicle = "";
        order.riderId = null;
      }
    }

    await order.save();

    // Synchronize the Rider model in MongoDB
    const targetRiderCode = order.riderCode || riderCode;
    if (targetRiderCode) {
      const rider = await Rider.findOne({ riderId: targetRiderCode.toUpperCase() });
      if (rider) {
        if (order.deliveryStatus === "delivered") {
          rider.activeOrderNumber = null;
          rider.status = "available";
          rider.totalTrips = (rider.totalTrips || 0) + 1;
          const earningBonus = Math.round((order.deliveryCharge || 40) + 35);
          rider.todayEarnings = (rider.todayEarnings || 0) + earningBonus;
          await rider.save();
        } else if (order.deliveryStatus === "out_for_delivery" || order.deliveryStatus === "assigned") {
          rider.activeOrderNumber = order.orderNumber;
          rider.status = "busy";
          await rider.save();
        } else if (order.deliveryStatus === "pending" || order.deliveryStatus === "cancelled") {
          if (rider.activeOrderNumber === order.orderNumber) {
            rider.activeOrderNumber = null;
            rider.status = "available";
            await rider.save();
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Order #${order.orderNumber} deliveryStatus updated to ${order.deliveryStatus}`,
      order,
    });
  } catch (error) {
    console.error("Update order error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update order", error: error.message },
      { status: 500 }
    );
  }
}
