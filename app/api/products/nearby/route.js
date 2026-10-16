import connectDB from "@/lib/db";
import Product from "@/models/Product";
import { haversineDistance, isValidCoordinate } from "@/lib/geoUtils";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");
    const radiusParam = searchParams.get("radius") || "10";
    const category = searchParams.get("category") || "all";
    const search = searchParams.get("search")?.toLowerCase().trim() || "";
    const inStockOnly = searchParams.get("inStockOnly") === "true";

    // 1. Validate latitude and longitude
    if (!latParam || !lngParam) {
      return NextResponse.json(
        {
          success: false,
          message: "Both latitude ('lat') and longitude ('lng') query parameters are required.",
        },
        { status: 400 }
      );
    }

    const lat = parseFloat(latParam);
    const lng = parseFloat(lngParam);
    const radiusKm = Math.max(0.1, parseFloat(radiusParam) || 10);
    const radiusMeters = radiusKm * 1000;

    if (!isValidCoordinate(lat, lng)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid geographical coordinates. Latitude must be between -90 and 90, Longitude between -180 and 180.",
        },
        { status: 400 }
      );
    }

    // 2. Connect to MongoDB
    await connectDB();

    // Ensure 2dsphere index exists on Product collection
    try {
      await Product.collection.createIndex({ location: "2dsphere" });
    } catch {
      // Index might already exist
    }

    // Auto-backfill existing products in MongoDB that don't have location coordinates
    // with target coordinates [76.69360137728076, 30.710210638829736] ("Sector 70, Mohali")
    try {
      await Product.updateMany(
        {
          $or: [
            { location: null },
            { location: { $exists: false } },
            { "location.coordinates": null },
            { "location.coordinates": { $exists: false } },
            { "location.coordinates": { $size: 0 } },
            { "location.coordinates.1": { $exists: false } },
          ],
        },
        {
          $set: {
            location: {
              type: "Point",
              coordinates: [76.69360137728076, 30.710210638829736],
              address: "Sector 70, Mohali",
            },
          },
        }
      );
    } catch (backfillErr) {
      console.warn("Location backfill note:", backfillErr.message);
    }

    // Build query filters
    const matchFilter = {};
    if (category && category !== "all") {
      matchFilter.category = { $regex: new RegExp(`^${category}$`, "i") };
    }
    if (search) {
      matchFilter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }
    if (inStockOnly) {
      matchFilter.status = "in_stock";
      matchFilter.quantity = { $gt: 0 };
    }

    let products = [];

    // 3. Query using MongoDB $geoNear aggregation
    try {
      const geoPipeline = [
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [lng, lat], // GeoJSON order: [longitude, latitude]
            },
            distanceField: "distance",
            maxDistance: radiusMeters,
            spherical: true,
            query: matchFilter,
          },
        },
        {
          $addFields: {
            distanceKm: {
              $round: [{ $divide: ["$distance", 1000] }, 2],
            },
          },
        },
        {
          $sort: { distance: 1 },
        },
      ];

      products = await Product.aggregate(geoPipeline);
    } catch (geoError) {
      console.warn("MongoDB $geoNear error, using Haversine calculation on DB products:", geoError.message);
      // Fallback: Query all matching database products and calculate Haversine distance in memory
      const dbProducts = await Product.find(matchFilter).lean();
      products = dbProducts
        .filter(
          (p) =>
            p.location &&
            Array.isArray(p.location.coordinates) &&
            p.location.coordinates.length >= 2
        )
        .map((p) => {
          const [pLng, pLat] = p.location.coordinates;
          const distKm = haversineDistance(lat, lng, pLat, pLng);
          return {
            ...p,
            distance: distKm !== null ? Math.round(distKm * 1000) : null,
            distanceKm: distKm,
          };
        })
        .filter((p) => p.distanceKm !== null && p.distanceKm <= radiusKm)
        .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    }

    return NextResponse.json({
      success: true,
      count: products.length,
      radiusKm,
      center: {
        lat,
        lng,
      },
      products,
      source: "mongodb",
    });
  } catch (error) {
    console.error("Error in nearby products API:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to perform location-based product search",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
