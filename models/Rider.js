import mongoose from "mongoose";

const RiderSchema = new mongoose.Schema(
  {
    riderId: {
      type: String,
      required: [true, "Rider ID is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Rider name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    vehicle: {
      type: String,
      default: "Standard Bike",
    },
    vehicleType: {
      type: String,
      default: "Electric Scooter",
    },
    rating: {
      type: Number,
      default: 4.9,
    },
    totalTrips: {
      type: Number,
      default: 0,
    },
    todayEarnings: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["available", "busy", "offline"],
      default: "available",
    },
    currentLocation: {
      lat: {
        type: Number,
        default: 30.7046,
      },
      lng: {
        type: Number,
        default: 76.7179,
      },
      address: {
        type: String,
        default: "Mohali, Punjab",
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    },
    activeOrderNumber: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Rider = mongoose.models.Rider || mongoose.model("Rider", RiderSchema);

export default Rider;
