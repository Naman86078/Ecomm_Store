require("dotenv").config();
const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({}, { strict: false });
const UserSchema = new mongoose.Schema({}, { strict: false });
const OrderSchema = new mongoose.Schema({}, { strict: false });

const LOCAL_URI = "mongodb://127.0.0.1:27017/ecomm_stripe";
const ATLAS_URI = process.env.MONGODB_URI;

async function migrate() {
  if (!ATLAS_URI) {
    console.error("❌ MONGODB_URI is not set in .env");
    process.exit(1);
  }

  console.log("Connecting to Local MongoDB (127.0.0.1:27017)...");
  let localConn;
  try {
    localConn = await mongoose.createConnection(LOCAL_URI, {
      serverSelectionTimeoutMS: 5000,
    }).asPromise();
    console.log("✓ Connected to Local MongoDB!");
  } catch (err) {
    console.error("❌ Could not connect to local MongoDB. Ensure MongoDB service is running locally on port 27017.");
    console.error(err.message);
    process.exit(1);
  }

  console.log("Connecting to MongoDB Atlas...");
  const atlasConn = await mongoose.createConnection(ATLAS_URI, {
    dbName: "ecomm_stripe",
    serverSelectionTimeoutMS: 10000,
  }).asPromise();
  console.log("✓ Connected to MongoDB Atlas!");

  const LocalProduct = localConn.model("Product", ProductSchema, "products");
  const AtlasProduct = atlasConn.model("Product", ProductSchema, "products");

  const localProducts = await LocalProduct.find({}).lean();
  console.log(`\n📦 Found ${localProducts.length} products on your local machine:`);
  localProducts.forEach((p, idx) => {
    console.log(`  ${idx + 1}. ${p.title} (₹${p.price}) [${p.category || 'General'}]`);
  });

  if (localProducts.length === 0) {
    console.log("\n⚠️ No products found in local database 'ecomm_stripe'.");
    process.exit(0);
  }

  console.log("\nReplacing Atlas sample products with your localhost products...");
  await AtlasProduct.deleteMany({});
  await AtlasProduct.insertMany(localProducts);
  console.log(`✅ Successfully copied ${localProducts.length} localhost products to MongoDB Atlas!`);

  // Optionally check orders / users if needed
  const LocalOrder = localConn.model("Order", OrderSchema, "orders");
  const AtlasOrder = atlasConn.model("Order", OrderSchema, "orders");
  const localOrders = await LocalOrder.find({}).lean();
  if (localOrders.length > 0) {
    const atlasOrderCount = await AtlasOrder.countDocuments();
    if (atlasOrderCount === 0) {
      await AtlasOrder.insertMany(localOrders);
      console.log(`✅ Also migrated ${localOrders.length} local orders to Atlas.`);
    }
  }

  await localConn.close();
  await atlasConn.close();
  console.log("\nMigration completed successfully! Refresh your live site.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
