require("dotenv").config();
const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true },
    quantity: { type: Number, default: 0 },
    category: { type: String, default: "General" },
    imageUrl: { type: String, default: "" },
    status: { type: String, enum: ["in_stock", "out_of_stock"], default: "in_stock" },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [76.6936, 30.7102] },
      address: { type: String, default: "Sector 70, Mohali" },
    },
    deliveryZones: [{ type: mongoose.Schema.Types.ObjectId, ref: "DeliveryZone" }],
  },
  { timestamps: true }
);

ProductSchema.index({ location: "2dsphere" });

const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema);

const sampleProducts = [
  {
    title: "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
    description: "Industry-leading noise canceling with Auto NC Optimizer, 30-hour battery life, and crystal-clear hands-free calling.",
    price: 29990,
    quantity: 15,
    category: "Electronics",
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
    status: "in_stock",
    location: {
      type: "Point",
      coordinates: [76.6936, 30.7102],
      address: "Sector 70, Mohali",
    },
  },
  {
    title: "Apple Watch Series 9 GPS 45mm",
    description: "Powerful S9 SiP chip, magical double tap gesture, brighter display, and advanced health sensors.",
    price: 44900,
    quantity: 10,
    category: "Electronics",
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80",
    status: "in_stock",
    location: {
      type: "Point",
      coordinates: [76.695, 30.712],
      address: "Phase 7, Mohali",
    },
  },
  {
    title: "Nike Air Zoom Pegasus 40 Running Shoes",
    description: "Responsive cushioning and neutral support engineered for daily road running and maximum comfort.",
    price: 10495,
    quantity: 25,
    category: "Footwear",
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
    status: "in_stock",
    location: {
      type: "Point",
      coordinates: [76.692, 30.709],
      address: "Sector 71, Mohali",
    },
  },
  {
    title: "Classic Oversized Cotton Hoodie",
    description: "Heavyweight 400 GSM brushed fleece cotton hoodie with relaxed dropped shoulders and double-lined hood.",
    price: 2499,
    quantity: 40,
    category: "Clothing",
    imageUrl: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&q=80",
    status: "in_stock",
    location: {
      type: "Point",
      coordinates: [76.7039, 30.7166],
      address: "Phase 3B2, Mohali",
    },
  },
  {
    title: "Minimalist Italian Leather Wallet",
    description: "Handcrafted full-grain vegetable-tanned leather bi-fold wallet with RFID blocking layer and slim profile.",
    price: 1899,
    quantity: 30,
    category: "Accessories",
    imageUrl: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&q=80",
    status: "in_stock",
    location: {
      type: "Point",
      coordinates: [76.6936, 30.7102],
      address: "Sector 70, Mohali",
    },
  },
  {
    title: "Delonghi Dedica Espresso Machine",
    description: "Compact 15-bar pump espresso maker with manual steam wand for rich barista-grade cappuccinos and lattes.",
    price: 21990,
    quantity: 8,
    category: "Home & Kitchen",
    imageUrl: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800&q=80",
    status: "in_stock",
    location: {
      type: "Point",
      coordinates: [76.695, 30.712],
      address: "Phase 7, Mohali",
    },
  },
  {
    title: "Hydrating Hyaluronic Acid & Vitamin C Serum",
    description: "Clinically proven formula with 2% pure hyaluronic acid and 10% stabilized vitamin C for radiant, glowing skin.",
    price: 899,
    quantity: 50,
    category: "Beauty",
    imageUrl: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80",
    status: "in_stock",
    location: {
      type: "Point",
      coordinates: [76.7039, 30.7166],
      address: "Sector 61, Mohali",
    },
  },
  {
    title: "Ray-Ban Polarized Aviator Sunglasses",
    description: "Timeless gold metal frame with polarized G-15 green crystal lenses providing 100% UV protection.",
    price: 9890,
    quantity: 18,
    category: "Accessories",
    imageUrl: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80",
    status: "in_stock",
    location: {
      type: "Point",
      coordinates: [76.6936, 30.7102],
      address: "Sector 70, Mohali",
    },
  },
];

async function seedProducts() {
  if (!process.env.MONGODB_URI) {
    console.error("❌ MONGODB_URI is not set in environment or .env file.");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: "ecomm_stripe",
  });
  console.log("Connected successfully to ecomm_stripe!");

  try {
    await Product.collection.createIndex({ location: "2dsphere" });
  } catch {}

  let addedCount = 0;
  let skippedCount = 0;

  for (const item of sampleProducts) {
    const existing = await Product.findOne({ title: item.title });
    if (!existing) {
      await Product.create(item);
      console.log(`✓ Added product: "${item.title}"`);
      addedCount++;
    } else {
      skippedCount++;
    }
  }

  const total = await Product.countDocuments();
  console.log(`\n===========================================`);
  console.log(`✅ Seed Finished!`);
  console.log(`• New products added: ${addedCount}`);
  console.log(`• Already existing: ${skippedCount}`);
  console.log(`• Total products in database: ${total}`);
  console.log(`===========================================`);
  process.exit(0);
}

seedProducts().catch((err) => {
  console.error("❌ Error seeding products:", err);
  process.exit(1);
});
