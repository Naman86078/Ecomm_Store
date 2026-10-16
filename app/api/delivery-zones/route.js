import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DeliveryZone from "@/models/DeliveryZone";
import { validateGeoJSONPolygon } from "@/lib/geoUtils";

/**
 * ====================================================================
 * GET /api/delivery-zones
 * ====================================================================
 * Returns all delivery zones.
 * Query param: ?active=true returns only active delivery zones.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";

    await connectDB();

    const queryFilter = {};
    if (activeOnly) {
      queryFilter.isActive = true;
    }

    const zones = await DeliveryZone.find(queryFilter)
      .populate("assignedProducts", "title price category imageUrl status")
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      zones,
      total: zones.length,
    });
  } catch (error) {
    console.error("GET /api/delivery-zones error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch delivery zones." },
      { status: 500 }
    );
  }
}

/**
 * ====================================================================
 * POST /api/delivery-zones
 * ====================================================================
 * Creates a new delivery zone with a GeoJSON Polygon boundary.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      boundary,
      deliveryCharge,
      minOrderAmount,
      estimatedDeliveryTime,
      assignedType,
      assignedCategories,
      assignedProducts,
      priority,
      color,
      isActive,
    } = body;

    // Validate Zone Name
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, message: "Zone name is required." },
        { status: 400 }
      );
    }

    // Support flexible coordinates passed as boundary.coordinates, boundaryCoordinates, or array
    const rawCoords =
      boundary?.coordinates ||
      body.boundaryCoordinates ||
      (Array.isArray(boundary) ? boundary : null);

    if (!rawCoords || !Array.isArray(rawCoords) || rawCoords.length === 0) {
      return NextResponse.json(
        { success: false, message: "Zone boundary polygon coordinates are required." },
        { status: 400 }
      );
    }

    const validation = validateGeoJSONPolygon(rawCoords);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: validation.message },
        { status: 400 }
      );
    }

    const boundaryPolygon = {
      type: "Polygon",
      coordinates: rawCoords,
    };

    // Validate delivery charge
    const fee = Number(deliveryCharge);
    if (isNaN(fee) || fee < 0) {
      return NextResponse.json(
        { success: false, message: "Delivery charge must be a non-negative number." },
        { status: 400 }
      );
    }

    const minAmount = Number(minOrderAmount) || 0;
    if (minAmount < 0) {
      return NextResponse.json(
        { success: false, message: "Minimum order amount cannot be negative." },
        { status: 400 }
      );
    }

    await connectDB();

    // Ensure 2dsphere index exists in MongoDB collection
    try {
      await DeliveryZone.collection.createIndex({ boundary: "2dsphere" });
    } catch (idxErr) {
      console.warn("DeliveryZone 2dsphere index notice:", idxErr.message);
    }

    const newZone = await DeliveryZone.create({
      name: name.trim(),
      description: (description || "").trim(),
      boundary: boundaryPolygon,
      deliveryCharge: fee,
      minOrderAmount: minAmount,
      estimatedDeliveryTime: (estimatedDeliveryTime || "30-45 mins").trim(),
      assignedType: assignedType || "all",
      assignedCategories: Array.isArray(assignedCategories) ? assignedCategories : [],
      assignedProducts: Array.isArray(assignedProducts) ? assignedProducts : [],
      priority: Number(priority) || 1,
      color: color || "#4f46e5",
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    const populated = await DeliveryZone.findById(newZone._id)
      .populate("assignedProducts", "title price category imageUrl status")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Delivery zone created successfully.",
      zone: populated,
    });
  } catch (error) {
    console.error("POST /api/delivery-zones error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create delivery zone." },
      { status: 500 }
    );
  }
}
