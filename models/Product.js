import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Product title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0, "Quantity cannot be negative"],
      default: 0,
    },
    category: {
      type: String,
      default: "General",
      trim: true,
    },
    imageUrl: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["in_stock", "out_of_stock"],
      default: "in_stock",
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], 
        required: false,
      },
      address: {
        type: String,
        default: "",
        trim: true,
      },
    },
    deliveryZones: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DeliveryZone",
      },
    ],
  },
  {
    timestamps: true,
  }
);

ProductSchema.index({ location: "2dsphere" });

const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema);

export default Product;
