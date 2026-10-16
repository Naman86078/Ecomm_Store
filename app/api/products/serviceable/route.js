import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DeliveryZone from "@/models/DeliveryZone";
import Product from "@/models/Product";
import {
  isValidCoordinate,
  isPointInPolygon,
  pickBestDeliveryZone,
} from "@/lib/geoUtils";

/**
 * ====================================================================
 * GET /api/products/serviceable
 * ====================================================================
 * Returns products eligible for delivery at the specified coordinates.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");
    const category = searchParams.get("category") || "all";
    const search = searchParams.get("search")?.toLowerCase().trim() || "";

    if (!latParam || !lngParam) {
      return NextResponse.json(
        { success: false, message: "Latitude and longitude query parameters are required." },
        { status: 400 }
      );
    }

    const lat = parseFloat(latParam);
    const lng = parseFloat(lngParam);

    if (!isValidCoordinate(lat, lng)) {
      return NextResponse.json(
        { success: false, message: "Invalid geographical coordinates." },
        { status: 400 }
      );
    }

    await connectDB();

    // 1. Locate serviceable zone via MongoDB $geoIntersects
    let matchingZones = [];
    try {
      matchingZones = await DeliveryZone.find({
        isActive: true,
        boundary: {
          $geoIntersects: {
            $geometry: {
              type: "Point",
              coordinates: [lng, lat],
            },
          },
        },
      }).lean();
    } catch (e) {
      console.warn("Geospatial index fallback in products/serviceable:", e.message);
    }

    // Fallback ray-casting check
    if (!matchingZones || matchingZones.length === 0) {
      const allActive = await DeliveryZone.find({ isActive: true }).lean();
      matchingZones = allActive.filter((zone) => {
        const ring = zone?.boundary?.coordinates?.[0];
        return ring ? isPointInPolygon([lng, lat], ring) : false;
      });
    }

    if (!matchingZones || matchingZones.length === 0) {
      return NextResponse.json({
        success: true,
        serviceable: false,
        zone: null,
        products: [],
        message: "No delivery zone serves this location.",
      });
    }

    const zone = pickBestDeliveryZone(matchingZones);

    // 2. Build product query according to zone rules
    const productQuery = {};

    if (zone.assignedType === "categories" && zone.assignedCategories?.length > 0) {
      productQuery.category = { $in: zone.assignedCategories };
    } else if (zone.assignedType === "products" && zone.assignedProducts?.length > 0) {
      productQuery.$or = [
        { _id: { $in: zone.assignedProducts } },
        { deliveryZones: zone._id },
      ];
    }

    if (category && category !== "all") {
      productQuery.category = { $regex: new RegExp(`^${category}$`, "i") };
    }

    if (search) {
      productQuery.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    const products = await Product.find(productQuery)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      serviceable: true,
      zone: {
        _id: zone._id,
        name: zone.name,
        deliveryCharge: zone.deliveryCharge,
        minOrderAmount: zone.minOrderAmount,
        estimatedDeliveryTime: zone.estimatedDeliveryTime,
        color: zone.color,
      },
      products,
      total: products.length,
    });
  } catch (error) {
    console.error("GET /api/products/serviceable error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load serviceable products." },
      { status: 500 }
    );
  }
}
