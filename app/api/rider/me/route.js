import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Rider from "@/models/Rider";
import Order from "@/models/Order";
import { checkToken } from "@/lib/auth";

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const requestedRiderId = searchParams.get("riderId");

    // Check token from headers or cookies
    const authHeader = request.headers.get("authorization");
    const cookieToken = request.cookies.get("rider_token")?.value || request.cookies.get("token")?.value;
    const token = authHeader ? authHeader.replace("Bearer ", "") : cookieToken;

    let decoded = checkToken(token);

    // If no token or invalid, but requestedRiderId is passed in local/dev or by admin token
    let targetRiderId = decoded?.riderId;

    // Admin can inspect any rider
    if (decoded?.role === "admin" && requestedRiderId) {
      targetRiderId = requestedRiderId.toUpperCase();
    } else if (!targetRiderId && requestedRiderId) {
      targetRiderId = requestedRiderId.toUpperCase();
    }

    if (!targetRiderId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please log in as a rider or admin." },
        { status: 401 }
      );
    }

    const rider = await Rider.findOne({ riderId: targetRiderId.toUpperCase() });
    if (!rider) {
      return NextResponse.json(
        { success: false, message: "Rider not found" },
        { status: 404 }
      );
    }

    // If rider has an active order, populate full order details
    let activeOrder = null;
    if (rider.activeOrderNumber) {
      activeOrder = await Order.findOne({ orderNumber: rider.activeOrderNumber });
    }

    return NextResponse.json({
      success: true,
      rider: {
        id: rider._id.toString(),
        riderId: rider.riderId,
        name: rider.name,
        phone: rider.phone,
        email: rider.email,
        vehicle: rider.vehicle,
        vehicleType: rider.vehicleType,
        rating: rider.rating,
        totalTrips: rider.totalTrips,
        todayEarnings: rider.todayEarnings,
        status: rider.status,
        currentLocation: rider.currentLocation,
        activeOrderNumber: rider.activeOrderNumber,
      },
      activeOrder,
    });
  } catch (error) {
    console.error("Fetch rider profile error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch rider profile", error: error.message },
      { status: 500 }
    );
  }
}
