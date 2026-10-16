import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db";
import Rider from "@/models/Rider";
import { createToken } from "@/lib/auth";

export async function POST(request) {
  try {
    const { riderId, password } = await request.json();

    if (!riderId || !password) {
      return NextResponse.json(
        { success: false, message: "Rider ID and password are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const normalizedId = riderId.trim().toUpperCase();
    const rider = await Rider.findOne({
      $or: [
        { riderId: normalizedId },
        { email: riderId.trim().toLowerCase() },
        { phone: riderId.trim() },
      ],
    });

    if (!rider) {
      return NextResponse.json(
        { success: false, message: "Invalid Rider ID or Password" },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, rider.password);
    if (!isMatch && rider.password !== password) {
      return NextResponse.json(
        { success: false, message: "Invalid Rider ID or Password" },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = createToken({
      _id: rider._id,
      id: rider._id,
      email: rider.email || rider.riderId,
      riderId: rider.riderId,
      name: rider.name,
      role: "rider",
    });

    const safeRider = {
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
    };

    const response = NextResponse.json({
      success: true,
      message: "Rider authenticated successfully",
      token,
      rider: safeRider,
    });

    response.cookies.set("rider_token", token, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Rider login error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to log in" },
      { status: 500 }
    );
  }
}
