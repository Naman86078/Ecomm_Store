import mongoose from "mongoose";

/**
 * ====================================================================
 * DELIVERY ZONE MODEL
 * ====================================================================
 * Stores delivery zones with GeoJSON Polygon boundaries in MongoDB.
 * A 2dsphere index enables fast geospatial query ($geoIntersects).
 */
const DeliveryZoneSchema = new mongoose.Schema(
  {
    // Name of the delivery zone (e.g. "Mohali Express Zone")
    name: {
      type: String,
      required: [true, "Zone name is required"],
      trim: true,
    },
    // Optional description (e.g. "Covers Phase 1-11, Sectors 67-71")
    description: {
      type: String,
      default: "",
      trim: true,
    },
    // GeoJSON Polygon boundary
    // Format: { type: "Polygon", coordinates: [ [ [lng, lat], [lng, lat], ... ] ] }
    boundary: {
      type: {
        type: String,
        enum: ["Polygon"],
        default: "Polygon",
        required: true,
      },
      coordinates: {
        type: [[[Number]]], // Array of coordinate pairs [longitude, latitude]
        required: [true, "Boundary coordinates are required"],
      },
    },
    // Delivery charge in rupees (e.g. 40)
    deliveryCharge: {
      type: Number,
      required: [true, "Delivery charge is required"],
      min: [0, "Delivery charge cannot be negative"],
      default: 0,
    },
    // Minimum order amount to qualify for delivery (0 = no minimum)
    minOrderAmount: {
      type: Number,
      min: [0, "Minimum order amount cannot be negative"],
      default: 0,
    },
    // Estimated delivery time string (e.g. "30-45 mins")
    estimatedDeliveryTime: {
      type: String,
      default: "30-45 mins",
      trim: true,
    },
    // Product assignment strategy:
    // "all" = all store products are deliverable here
    // "categories" = only specific categories are deliverable
    // "products" = only specific products are deliverable
    assignedType: {
      type: String,
      enum: ["all", "categories", "products"],
      default: "all",
    },
    // List of allowed category names if assignedType === "categories"
    assignedCategories: {
      type: [String],
      default: [],
    },
    // List of allowed Product IDs if assignedType === "products"
    assignedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    // Priority for resolving overlapping zones (higher number wins)
    priority: {
      type: Number,
      default: 1,
    },
    // Hex color code for rendering polygon on map
    color: {
      type: String,
      default: "#4f46e5",
    },
    // Active switch
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index enables MongoDB geospatial queries ($geoIntersects)
DeliveryZoneSchema.index({ boundary: "2dsphere" });

const DeliveryZone =
  mongoose.models.DeliveryZone ||
  mongoose.model("DeliveryZone", DeliveryZoneSchema);

export default DeliveryZone;
