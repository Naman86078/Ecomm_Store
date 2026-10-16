import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Rider from "@/models/Rider";

export async function POST(request) {
  try {
    await connectDB();

    const { riderId, status, location } = await request.json();

    if (!riderId) {
      return NextResponse.json(
        { success: false, message: "Rider ID is required" },
        { status: 400 }
      );
    }

    const updateFields = {};
    if (status) {
      if (!["available", "busy", "offline"].includes(status)) {
        return NextResponse.json(
          { success: false, message: "Invalid status value" },
          { status: 400 }
        );
      }
      updateFields.status = status;
    }

    if (location && typeof location.lat === "number" && typeof location.lng === "number") {
      updateFields.currentLocation = {
        lat: location.lat,
        lng: location.lng,
        address: location.address || "Updated Live GPS",
        updatedAt: new Date(),
      };
    }

    const updatedRider = await Rider.findOneAndUpdate(
      { riderId: riderId.toUpperCase() },
      { $set: updateFields },
      { new: true }
    );

    if (!updatedRider) {
      return NextResponse.json(
        { success: false, message: "Rider not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Rider status updated successfully",
      rider: updatedRider,
    });
  } catch (error) {
    console.error("Update rider status error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update rider status", error: error.message },
      { status: 500 }
    );
  }
}
