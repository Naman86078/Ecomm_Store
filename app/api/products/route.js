import connectDB from "@/lib/db";
import Product from "@/models/Product";
import { haversineDistance } from "@/lib/geoUtils";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase().trim() || "";
    const category = searchParams.get("category") || "all";
    const id = searchParams.get("id");
    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");
    const radiusParam = searchParams.get("radius") || "10";

    await connectDB();

    // Auto-backfill existing products in MongoDB that don't have location coordinates
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
    } catch {}

    if (id) {
      const single = await Product.findById(id).lean();
      return NextResponse.json({
        success: Boolean(single),
        product: single || null,
        source: "mongodb",
      });
    }

    let products = [];

    if (latParam && lngParam) {
      const lat = parseFloat(latParam);
      const lng = parseFloat(lngParam);
      const radiusKm = parseFloat(radiusParam) || 10;
      const radiusMeters = radiusKm * 1000;

      try {
        await Product.collection.createIndex({ location: "2dsphere" });
      } catch {}

      const matchFilter = {};
      if (search) {
        matchFilter.$or = [
          { title: { $regex: search, $options: "i" } },
          { category: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }
      if (category && category !== "all") {
        matchFilter.category = { $regex: new RegExp(`^${category}$`, "i") };
      }

      try {
        products = await Product.aggregate([
          {
            $geoNear: {
              near: { type: "Point", coordinates: [lng, lat] },
              distanceField: "distance",
              maxDistance: radiusMeters,
              spherical: true,
              query: matchFilter,
            },
          },
          {
            $addFields: {
              distanceKm: { $round: [{ $divide: ["$distance", 1000] }, 2] },
            },
          },
          { $sort: { distance: 1 } },
        ]);
      } catch (geoErr) {
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
            const dist = haversineDistance(lat, lng, pLat, pLng);
            return {
              ...p,
              distance: dist !== null ? Math.round(dist * 1000) : null,
              distanceKm: dist,
            };
          })
          .filter((p) => p.distanceKm !== null && p.distanceKm <= radiusKm)
          .sort((a, b) => a.distanceKm - b.distanceKm);
      }
    } else {
      const filter = {};
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: "i" } },
          { category: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }
      if (category && category !== "all") {
        filter.category = { $regex: new RegExp(`^${category}$`, "i") };
      }

      products = await Product.find(filter).sort({ createdAt: -1 }).lean();
    }

    return NextResponse.json({
      success: true,
      count: products.length,
      products,
      source: "mongodb",
    });
  } catch (error) {
    console.error("Products API error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to load products",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
