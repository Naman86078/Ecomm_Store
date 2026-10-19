import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Rider from "@/models/Rider";
import Order from "@/models/Order";
import { createToken } from "@/lib/auth";
import { sendOrderStatusEmail, sendOrderCancellationEmail } from "@/lib/nodemailer";

// GET /api/admin/riders
export async function GET(request) {
  try {
    await connectDB();

    const riders = await Rider.find().sort({ riderId: 1 });

    // Fetch all store orders to provide the same single source of truth across fleet and dispatch
    const allOrders = await Order.find().sort({ createdAt: -1 });

    const deliveredOrders = allOrders.filter((o) => o.deliveryStatus === "delivered");
    const activeOrders = allOrders.filter((o) => ["assigned", "out_for_delivery"].includes(o.deliveryStatus));
    const unassignedOrders = allOrders.filter(
      (o) => !o.deliveryStatus || o.deliveryStatus === "pending"
    );

    // Compute fleet overview statistics
    const stats = {
      total: riders.length,
      available: riders.filter((r) => r.status === "available").length,
      busy: riders.filter((r) => r.status === "busy").length,
      offline: riders.filter((r) => r.status === "offline").length,
      totalTrips: riders.reduce((acc, r) => acc + (r.totalTrips || 0), 0),
      todayEarnings: riders.reduce((acc, r) => acc + (r.todayEarnings || 0), 0),
      totalOrders: allOrders.length,
      deliveredOrdersCount: deliveredOrders.length,
      activeDeliveriesCount: activeOrders.length,
      pendingOrdersCount: unassignedOrders.length,
    };

    return NextResponse.json({
      success: true,
      stats,
      riders,
      orders: allOrders,
      deliveredOrders,
      activeOrders,
      unassignedOrders,
    });
  } catch (error) {
    console.error("Fetch admin riders error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch riders", error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/admin/riders
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { action, riderId, orderNumber, newStatus, deliveryStatus } = body;

    if (action === "assign_order") {
      if (!riderId || !orderNumber) {
        return NextResponse.json(
          { success: false, message: "Rider ID and Order number are required" },
          { status: 400 }
        );
      }

      const rider = await Rider.findOne({ riderId: riderId.toUpperCase() });
      if (!rider) {
        return NextResponse.json({ success: false, message: "Rider not found" }, { status: 404 });
      }

      const order = await Order.findOne({ orderNumber });
      if (!order) {
        return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
      }

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

      // Automatically inform customer rider assigned
      sendOrderStatusEmail({
        email: order.customerEmail,
        name: order.customerName,
        orderNumber: order.orderNumber,
        deliveryStatus: "assigned",
        riderName: rider.name,
        riderPhone: rider.phone,
        deliveryAddress: order.deliveryAddress,
      }).catch((err) => console.warn("[AutoMail] Admin assign email error:", err.message));

      return NextResponse.json({
        success: true,
        message: `Order #${orderNumber} assigned to ${rider.name} (${rider.riderId})`,
        order,
        rider,
      });
    }

    if (action === "mark_delivered") {
      if (!orderNumber) {
        return NextResponse.json({ success: false, message: "Order number required" }, { status: 400 });
      }

      const order = await Order.findOne({ orderNumber });
      if (!order) {
        return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
      }

      order.deliveryStatus = "delivered";
      order.deliveredAt = new Date();
      await order.save();

      // Update rider if assigned
      if (order.riderCode) {
        const rider = await Rider.findOne({ riderId: order.riderCode.toUpperCase() });
        if (rider) {
          rider.activeOrderNumber = null;
          rider.status = "available";
          rider.totalTrips = (rider.totalTrips || 0) + 1;
          const tripEarning = Math.round((order.deliveryCharge || 40) + 35);
          rider.todayEarnings = (rider.todayEarnings || 0) + tripEarning;
          await rider.save();
        }
      }

      // Automatically notify customer order delivered
      sendOrderStatusEmail({
        email: order.customerEmail,
        name: order.customerName,
        orderNumber: order.orderNumber,
        deliveryStatus: "delivered",
        riderName: order.riderName,
        riderPhone: order.riderPhone,
        deliveryAddress: order.deliveryAddress,
      }).catch((err) => console.warn("[AutoMail] Admin mark delivered email error:", err.message));

      return NextResponse.json({
        success: true,
        message: `Order #${orderNumber} marked as Delivered!`,
        order,
      });
    }

    if (action === "change_order_status") {
      if (!orderNumber || !deliveryStatus) {
        return NextResponse.json({ success: false, message: "orderNumber and deliveryStatus required" }, { status: 400 });
      }

      const order = await Order.findOne({ orderNumber });
      if (!order) {
        return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
      }

      order.deliveryStatus = deliveryStatus;
      if (deliveryStatus === "delivered") {
        order.deliveredAt = new Date();
      } else if (deliveryStatus === "assigned") {
        order.assignedAt = new Date();
      }
      await order.save();

      // Automatically dispatch notification to customer
      if (deliveryStatus === "cancelled") {
        sendOrderCancellationEmail({
          email: order.customerEmail,
          name: order.customerName,
          orderNumber: order.orderNumber,
          reason: "Order status updated to cancelled by administrator",
          refundAmount: order.totalAmount,
        }).catch((err) => console.warn("[AutoMail] Admin cancel status email error:", err.message));
      } else if (["out_for_delivery", "delivered", "assigned"].includes(deliveryStatus)) {
        sendOrderStatusEmail({
          email: order.customerEmail,
          name: order.customerName,
          orderNumber: order.orderNumber,
          deliveryStatus,
          riderName: order.riderName,
          riderPhone: order.riderPhone,
          deliveryAddress: order.deliveryAddress,
          deliveryOtp: order.deliveryOtp,
        }).catch((err) => console.warn("[AutoMail] Admin status update email error:", err.message));
      }

      return NextResponse.json({
        success: true,
        message: `Order #${orderNumber} status changed to ${deliveryStatus}`,
        order,
      });
    }

    if (action === "toggle_status") {
      if (!riderId) {
        return NextResponse.json({ success: false, message: "Rider ID is required" }, { status: 400 });
      }

      const rider = await Rider.findOne({ riderId: riderId.toUpperCase() });
      if (!rider) {
        return NextResponse.json({ success: false, message: "Rider not found" }, { status: 404 });
      }

      const targetStatus = newStatus || (rider.status === "offline" ? "available" : "offline");
      rider.status = targetStatus;
      await rider.save();

      return NextResponse.json({
        success: true,
        message: `Rider ${rider.name} status updated to ${targetStatus}`,
        rider,
      });
    }

    if (action === "impersonate") {
      if (!riderId) {
        return NextResponse.json({ success: false, message: "Rider ID is required" }, { status: 400 });
      }

      const rider = await Rider.findOne({ riderId: riderId.toUpperCase() });
      if (!rider) {
        return NextResponse.json({ success: false, message: "Rider not found" }, { status: 404 });
      }

      const token = createToken({
        _id: rider._id,
        id: rider._id,
        email: rider.email || rider.riderId,
        riderId: rider.riderId,
        name: rider.name,
        role: "rider",
        isAdminImpersonating: true,
      });

      return NextResponse.json({
        success: true,
        token,
        rider,
      });
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Admin rider action error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to perform admin rider action", error: error.message },
      { status: 500 }
    );
  }
}
