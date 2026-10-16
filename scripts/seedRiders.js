require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const initialRiders = [
  {
    riderId: "RIDER-001",
    name: "Aman Verma",
    phone: "+91 98721 04921",
    email: "aman.rider@novastore.in",
    passwordPlain: "rider123",
    vehicle: "Hero Electric Optima • PB65-AK-9201",
    vehicleType: "Electric Scooter",
    rating: 4.9,
    totalTrips: 1420,
    todayEarnings: 840,
    status: "available",
    currentLocation: {
      lat: 30.7166,
      lng: 76.7039,
      address: "Phase 7 Market, Sector 61, Mohali",
      updatedAt: new Date(),
    },
  },
  {
    riderId: "RIDER-002",
    name: "Vikram Rathore",
    phone: "+91 98144 55219",
    email: "vikram.rider@novastore.in",
    passwordPlain: "rider123",
    vehicle: "Honda Activa 6G • CH01-BX-4482",
    vehicleType: "Motorcycle",
    rating: 4.8,
    totalTrips: 890,
    todayEarnings: 620,
    status: "available",
    currentLocation: {
      lat: 30.708,
      lng: 76.711,
      address: "Phase 3B2, Mohali",
      updatedAt: new Date(),
    },
  },
  {
    riderId: "RIDER-003",
    name: "Deepak Saini",
    phone: "+91 99882 19203",
    email: "deepak.rider@novastore.in",
    passwordPlain: "rider123",
    vehicle: "TVS iQube Electric • PB65-ET-1109",
    vehicleType: "Electric Scooter",
    rating: 4.9,
    totalTrips: 2150,
    todayEarnings: 1150,
    status: "available",
    currentLocation: {
      lat: 30.712,
      lng: 76.72,
      address: "Sector 70, Mohali",
      updatedAt: new Date(),
    },
  },
  {
    riderId: "RIDER-004",
    name: "Harpreet Singh",
    phone: "+91 97800 32189",
    email: "harpreet.rider@novastore.in",
    passwordPlain: "rider123",
    vehicle: "Ather 450X • CH01-EM-8821",
    vehicleType: "Electric Scooter",
    rating: 4.7,
    totalTrips: 640,
    todayEarnings: 480,
    status: "available",
    currentLocation: {
      lat: 30.699,
      lng: 76.715,
      address: "Sector 67 Industrial Area, Mohali",
      updatedAt: new Date(),
    },
  },
];

async function seedRiders() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI not set in .env!");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB for Rider seeding...");

    const RiderSchema = new mongoose.Schema(
      {
        riderId: { type: String, unique: true, uppercase: true },
        name: String,
        phone: String,
        email: String,
        password: String,
        vehicle: String,
        vehicleType: String,
        rating: Number,
        totalTrips: Number,
        todayEarnings: Number,
        status: { type: String, default: "available" },
        currentLocation: {
          lat: Number,
          lng: Number,
          address: String,
          updatedAt: Date,
        },
        activeOrderNumber: { type: String, default: null },
      },
      { timestamps: true }
    );

    const Rider = mongoose.models.Rider || mongoose.model("Rider", RiderSchema);

    console.log(`Seeding ${initialRiders.length} delivery fleet riders...`);

    for (const r of initialRiders) {
      const hashedPassword = await bcrypt.hash(r.passwordPlain, 10);
      const riderData = {
        riderId: r.riderId,
        name: r.name,
        phone: r.phone,
        email: r.email,
        password: hashedPassword,
        vehicle: r.vehicle,
        vehicleType: r.vehicleType,
        rating: r.rating,
        totalTrips: r.totalTrips,
        todayEarnings: r.todayEarnings,
        status: r.status,
        currentLocation: r.currentLocation,
      };

      await Rider.findOneAndUpdate({ riderId: r.riderId }, riderData, {
        upsert: true,
        returnDocument: "after",
      });

      console.log(`✓ Seeded Rider: ${r.riderId} | ${r.name} | Pass: ${r.passwordPlain}`);
    }

    console.log("\n===========================================");
    console.log("Rider Seeding Completed Successfully!");
    console.log("Default Credentials for testing:");
    console.log("  • ID: RIDER-001 | Pass: rider123 (Aman Verma)");
    console.log("  • ID: RIDER-002 | Pass: rider123 (Vikram Rathore)");
    console.log("  • ID: RIDER-003 | Pass: rider123 (Deepak Saini)");
    console.log("  • ID: RIDER-004 | Pass: rider123 (Harpreet Singh)");
    console.log("===========================================\n");

    process.exit(0);
  } catch (err) {
    console.error("Failed to seed riders:", err);
    process.exit(1);
  }
}

seedRiders();
