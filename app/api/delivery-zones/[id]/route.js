import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DeliveryZone from "@/models/DeliveryZone";
import { validateGeoJSONPolygon } from "@/lib/geoUtils";

/**
 * ====================================================================
 * GET /api/delivery-zones/[id]
 * ====================================================================
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    await connectDB();

    const zone = await DeliveryZone.findById(id)
      .populate("assignedProducts", "title price category imageUrl status")
      .lean();

    if (!zone) {
      return NextResponse.json(
        { success: false, message: "Delivery zone not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, zone });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch delivery zone." },
      { status: 500 }
    );
  }
}

/**
 * ====================================================================
 * PUT /api/delivery-zones/[id]
 * ====================================================================
 */
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    await connectDB();

    const zone = await DeliveryZone.findById(id);
    if (!zone) {
      return NextResponse.json(
        { success: false, message: "Delivery zone not found." },
        { status: 404 }
      );
    }

    // If new boundary polygon passed, validate it
    const updateCoords =
      body.boundary?.coordinates ||
      body.boundaryCoordinates ||
      (Array.isArray(body.boundary) ? body.boundary : null);

    if (updateCoords && Array.isArray(updateCoords) && updateCoords.length > 0) {
      const validation = validateGeoJSONPolygon(updateCoords);
      if (!validation.valid) {
        return NextResponse.json(
          { success: false, message: validation.message },
          { status: 400 }
        );
      }
      zone.boundary = {
        type: "Polygon",
        coordinates: updateCoords,
      };
    }

    if (body.name !== undefined) zone.name = body.name.trim();
    if (body.description !== undefined) zone.description = body.description.trim();
    if (body.deliveryCharge !== undefined) {
      const fee = Number(body.deliveryCharge);
      if (isNaN(fee) || fee < 0) {
        return NextResponse.json(
          { success: false, message: "Delivery charge must be a non-negative number." },
          { status: 400 }
        );
      }
      zone.deliveryCharge = fee;
    }
    if (body.minOrderAmount !== undefined) {
      const minAmount = Number(body.minOrderAmount);
      if (isNaN(minAmount) || minAmount < 0) {
        return NextResponse.json(
          { success: false, message: "Minimum order amount cannot be negative." },
          { status: 400 }
        );
      }
      zone.minOrderAmount = minAmount;
    }
    if (body.estimatedDeliveryTime !== undefined) {
      zone.estimatedDeliveryTime = body.estimatedDeliveryTime.trim();
    }
    if (body.assignedType !== undefined) {
      zone.assignedType = body.assignedType;
    }
    if (body.assignedCategories !== undefined) {
      zone.assignedCategories = Array.isArray(body.assignedCategories)
        ? body.assignedCategories
        : [];
    }
    if (body.assignedProducts !== undefined) {
      zone.assignedProducts = Array.isArray(body.assignedProducts)
        ? body.assignedProducts
        : [];
    }
    if (body.priority !== undefined) {
      zone.priority = Number(body.priority) || 1;
    }
    if (body.color !== undefined) {
      zone.color = body.color;
    }
    if (body.isActive !== undefined) {
      zone.isActive = Boolean(body.isActive);
    }

    await zone.save();

    const updated = await DeliveryZone.findById(id)
      .populate("assignedProducts", "title price category imageUrl status")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Delivery zone updated successfully.",
      zone: updated,
    });
  } catch (error) {
    console.error("PUT /api/delivery-zones/[id] error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update zone." },
      { status: 500 }
    );
  }
}

/**
 * ====================================================================
 * DELETE /api/delivery-zones/[id]
 * ====================================================================
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await connectDB();

    const deleted = await DeliveryZone.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Delivery zone not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Delivery zone "${deleted.name}" deleted successfully.`,
    });
  } catch (error) {
    console.error("DELETE /api/delivery-zones/[id] error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete zone." },
      { status: 500 }
    );
  }
}
