import connectDB from "@/lib/db";
import Product from "@/models/Product";
import { saveUploadedFile } from "@/lib/multer";
import { NextResponse } from "next/server";


export async function GET(request) {
  try {
    // STEP 1: Connect to MongoDB
    await connectDB();

    // STEP 2: Read query parameters from URL 
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";

    // STEP 3: Build search query filter
    const query = {};

    // Search by title, category, or description 
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by stock status if selected
    if (status && status !== "all") {
      query.status = status;
    }

    // STEP 4: Query MongoDB and sort latest products first
    const products = await Product.find(query).sort({ createdAt: -1 });

    // STEP 5: Return results as JSON
    return NextResponse.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch products", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    // STEP 1: Connect to MongoDB
    await connectDB();

    // STEP 2: Read form data submitted from browser
    const formData = await request.formData();

    const title = formData.get("title")?.trim();
    const price = parseFloat(formData.get("price"));
    const quantity = parseInt(formData.get("quantity") ?? 0, 10);
    const category = formData.get("category")?.trim() || "General";
    const description = formData.get("description")?.trim() || "";
    const imageFile = formData.get("image"); // Uploaded file object
    const textImageUrl = formData.get("imageUrl")?.trim(); // Optional external URL

    // STEP 3: Basic validation checks
    if (!title) {
      return NextResponse.json(
        { success: false, message: "Product title is required" },
        { status: 400 }
      );
    }

    if (isNaN(price) || price < 0) {
      return NextResponse.json(
        { success: false, message: "Valid price is required" },
        { status: 400 }
      );
    }

    if (isNaN(quantity) || quantity < 0) {
      return NextResponse.json(
        { success: false, message: "Valid quantity is required" },
        { status: 400 }
      );
    }

    // STEP 4: Save the uploaded image file to public/uploads
    let imageUrl = "";
    if (imageFile && typeof imageFile === "object" && imageFile.size > 0) {
      imageUrl = await saveUploadedFile(imageFile);
    } else if (textImageUrl) {
      imageUrl = textImageUrl;
    }

    // Determine in_stock or out_of_stock based on quantity
    const status = quantity > 0 ? (formData.get("status") || "in_stock") : "out_of_stock";

    // STEP 5: Parse optional geographical location (GeoJSON Point format)
    const latStr = formData.get("latitude");
    const lngStr = formData.get("longitude");
    const address = formData.get("address")?.trim() || "";

    const productPayload = {
      title,
      price,
      quantity,
      category,
      description,
      imageUrl,
      status,
    };

    if (latStr !== null && lngStr !== null && latStr !== "" && lngStr !== "") {
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      if (!isNaN(lat) && !isNaN(lng)) {
        productPayload.location = {
          type: "Point",
          coordinates: [lng, lat], // GeoJSON order: [longitude, latitude]
          address: address || "Sector 70, Mohali",
        };
      }
    } else {
      productPayload.location = {
        type: "Point",
        coordinates: [76.69360137728076, 30.710210638829736],
        address: address || "Sector 70, Mohali",
      };
    }

    // STEP 6: Create and save the new product in MongoDB
    const newProduct = await Product.create(productPayload);

    // STEP 6: Return success response
    return NextResponse.json(
      {
        success: true,
        message: "Product created successfully",
        product: newProduct,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create product", error: error.message },
      { status: 500 }
    );
  }
}
