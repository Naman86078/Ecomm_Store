import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    customerName: {
      type: String,
      default: "Customer",
    },
    customerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    items: [
      {
        productId: String,
        title: String,
        price: Number,
        quantity: Number,
        imageUrl: String,
      },
    ],
    subtotal: {
      type: Number,
      default: 0,
    },
    deliveryCharge: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    // Customer geographical delivery coordinates & address
    deliveryAddress: {
      address: { type: String, default: "" },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    // Immutable snapshot of the delivery zone at time of order
    deliveryZone: {
      zoneId: { type: String, default: "" },
      name: { type: String, default: "" },
      deliveryCharge: { type: Number, default: 0 },
      estimatedDeliveryTime: { type: String, default: "" },
      minOrderAmount: { type: Number, default: 0 },
    },
    stripeSessionId: {
      type: String,
      default: "",
    },
    stripePaymentIntentId: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["paid", "refund_requested", "refunded", "refund_rejected"],
      default: "paid",
    },
    refundReason: {
      type: String,
      default: "",
    },
    refundNotes: {
      type: String,
      default: "",
    },
    refundRequestedAt: {
      type: Date,
    },
    refundedAt: {
      type: Date,
    },
    refundStripeId: {
      type: String,
      default: "",
    },
    // Rider Delivery Assignment & Tracking
    deliveryStatus: {
      type: String,
      enum: ["pending", "assigned", "out_for_delivery", "delivered", "cancelled"],
      default: "pending",
    },
    riderId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    riderCode: {
      type: String,
      default: "",
    },
    riderName: {
      type: String,
      default: "",
    },
    riderPhone: {
      type: String,
      default: "",
    },
    riderVehicle: {
      type: String,
      default: "",
    },
    deliveryOtp: {
      type: String,
      default: "",
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.models.Order || mongoose.model("Order", OrderSchema);

export default Order;
