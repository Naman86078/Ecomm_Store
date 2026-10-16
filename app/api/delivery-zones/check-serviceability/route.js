import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DeliveryZone from "@/models/DeliveryZone";
import {
  isValidCoordinate,
  isPointInPolygon,
  pickBestDeliveryZone,
} from "@/lib/geoUtils";

/**
 * Common serviceability logic for both GET and POST requests
 */
async function evaluateLocationServiceability(latParam, lngParam) {
  const lat = parseFloat(latParam);
  const lng = parseFloat(lngParam);

  // 1. Validate geographical coordinates
  if (!isValidCoordinate(lat, lng)) {
    return {
      status: 400,
      body: {
        success: false,
        serviceable: false,
        message: "Invalid geographical coordinates. Latitude must be -90..90 and Longitude -180..180.",
      },
    };
  }

  await connectDB();

  // 2. Query active delivery zones using MongoDB $geoIntersects
  let matchingZones = [];
  try {
    matchingZones = await DeliveryZone.find({
      isActive: true,
      boundary: {
        $geoIntersects: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat], // GeoJSON order: [longitude, latitude]
          },
        },
      },
    })
      .populate("assignedProducts", "title price category imageUrl status")
      .lean();
  } catch (geoErr) {
    console.warn("MongoDB $geoIntersects fallback:", geoErr.message);
  }

  // 3. Fallback: Ray-casting algorithm in case 2dsphere index is rebuilding
  if (!matchingZones || matchingZones.length === 0) {
    const allActive = await DeliveryZone.find({ isActive: true })
      .populate("assignedProducts", "title price category imageUrl status")
      .lean();

    matchingZones = allActive.filter((zone) => {
      const ring = zone?.boundary?.coordinates?.[0];
      return ring ? isPointInPolygon([lng, lat], ring) : false;
    });
  }

  // 4. Outside delivery area
  if (!matchingZones || matchingZones.length === 0) {
    return {
      status: 200,
      body: {
        success: true,
        serviceable: false,
        zone: null,
        allMatchingZones: [],
        message: "Sorry, delivery is currently not available to this location.",
      },
    };
  }

  // 5. Overlapping zone resolution: choose highest priority / lowest delivery charge
  const bestZone = pickBestDeliveryZone(matchingZones);

  return {
    status: 200,
    body: {
      success: true,
      serviceable: true,
      zone: bestZone,
      allMatchingZones: matchingZones,
      deliveryCharge: bestZone.deliveryCharge,
      estimatedDeliveryTime: bestZone.estimatedDeliveryTime,
      minOrderAmount: bestZone.minOrderAmount,
      message: `Delivery available in ${bestZone.name}! Delivery charge: ₹${bestZone.deliveryCharge}. Est: ${bestZone.estimatedDeliveryTime}.`,
    },
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    const result = await evaluateLocationServiceability(lat, lng);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("GET check-serviceability error:", error);
    return NextResponse.json(
      { success: false, serviceable: false, message: error.message || "Failed to check serviceability." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { lat, lng } = body;

    const result = await evaluateLocationServiceability(lat, lng);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("POST check-serviceability error:", error);
    return NextResponse.json(
      { success: false, serviceable: false, message: error.message || "Failed to check serviceability." },
      { status: 500 }
    );
  }
}
