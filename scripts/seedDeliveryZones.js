require("dotenv").config();
const mongoose = require("mongoose");

const DeliveryZoneSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    color: { type: String, default: "#4f46e5" },
    deliveryCharge: { type: Number, default: 0 },
    minOrderAmount: { type: Number, default: 0 },
    estimatedDeliveryTime: { type: String, default: "30-45 mins" },
    priority: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    boundary: {
      type: {
        type: String,
        enum: ["Polygon"],
        default: "Polygon",
        required: true,
      },
      coordinates: {
        type: [[[Number]]],
        required: true,
      },
    },
    assignedType: {
      type: String,
      enum: ["all", "categories", "products"],
      default: "all",
    },
    assignedCategories: [String],
    assignedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  },
  { timestamps: true }
);

DeliveryZoneSchema.index({ boundary: "2dsphere" });

const DeliveryZone =
  mongoose.models.DeliveryZone || mongoose.model("DeliveryZone", DeliveryZoneSchema);

async function seedDeliveryZones() {
  if (!process.env.MONGODB_URI) {
    console.error("❌ MONGODB_URI is not set in environment or .env file.");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGODB_URI);

  // Ensure 2dsphere geospatial index is created
  await DeliveryZone.collection.createIndex({ boundary: "2dsphere" });

  const zonesToSeed = [
    {
      name: "Mohali Central Zone",
      description: "Covers Mohali Sector 70, 71, and Phase 7 area",
      color: "#3b82f6",
      deliveryCharge: 30,
      minOrderAmount: 100,
      estimatedDeliveryTime: "35-45 mins",
      priority: 5,
      isActive: true,
      assignedType: "all",
      assignedCategories: [],
      boundary: {
        type: "Polygon",
        coordinates: [
          [
            [76.6800, 30.7000],
            [76.7200, 30.7000],
            [76.7200, 30.7250],
            [76.6800, 30.7250],
            [76.6800, 30.7000], // closure
          ],
        ],
      },
    },
    {
      name: "Mohali Express Zone (Sector 70)",
      description: "Overlapping express polygon with higher priority and discounted delivery fee",
      color: "#10b981",
      deliveryCharge: 15,
      minOrderAmount: 150,
      estimatedDeliveryTime: "15-25 mins",
      priority: 10, // Higher priority wins overlap over Central Zone
      isActive: true,
      assignedType: "all",
      assignedCategories: [],
      boundary: {
        type: "Polygon",
        coordinates: [
          [
            [76.6880, 30.7050],
            [76.7020, 30.7050],
            [76.7020, 30.7180],
            [76.6880, 30.7180],
            [76.6880, 30.7050], // closure
          ],
        ],
      },
    },
    {
      name: "Chandigarh Sector 17 Zone",
      description: "City centre shopping district with electronics & tech category assignment",
      color: "#8b5cf6",
      deliveryCharge: 45,
      minOrderAmount: 200,
      estimatedDeliveryTime: "30-40 mins",
      priority: 5,
      isActive: true,
      assignedType: "categories",
      assignedCategories: ["Electronics", "Accessories"],
      boundary: {
        type: "Polygon",
        coordinates: [
          [
            [76.7700, 30.7300],
            [76.7950, 30.7300],
            [76.7950, 30.7550],
            [76.7700, 30.7550],
            [76.7700, 30.7300], // closure
          ],
        ],
      },
    },
    {
      name: "Connaught Place Hub (Delhi)",
      description: "Central Delhi delivery zone covering Inner and Outer Circle",
      color: "#f59e0b",
      deliveryCharge: 50,
      minOrderAmount: 250,
      estimatedDeliveryTime: "30-40 mins",
      priority: 5,
      isActive: true,
      assignedType: "all",
      assignedCategories: [],
      boundary: {
        type: "Polygon",
        coordinates: [
          [
            [77.2050, 28.6200],
            [77.2350, 28.6200],
            [77.2350, 28.6450],
            [77.2050, 28.6450],
            [77.2050, 28.6200], // closure
          ],
        ],
      },
    },
  ];

  console.log(`Seeding ${zonesToSeed.length} delivery zones...`);

  for (const zoneData of zonesToSeed) {
    const existing = await DeliveryZone.findOne({ name: zoneData.name });
    if (existing) {
      await DeliveryZone.updateOne({ name: zoneData.name }, { $set: zoneData });
      console.log(`Updated zone: "${zoneData.name}"`);
    } else {
      await DeliveryZone.create(zoneData);
      console.log(`Created zone: "${zoneData.name}"`);
    }
  }

  console.log("✅ Delivery zones successfully seeded with 2dsphere geospatial index!");
  process.exit(0);
}

seedDeliveryZones().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
