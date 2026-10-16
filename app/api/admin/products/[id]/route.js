import connectDB from "@/lib/db";
import Product from "@/models/Product";
import { saveUploadedFile } from "@/lib/multer";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";


// Helper function: Deletes uploaded photo file from disk if it was saved locally
function deleteLocalPhoto(imageUrl) {
  if (imageUrl && imageUrl.startsWith("/uploads/")) {
    const filename = imageUrl.replace("/uploads/", "");
    const filePath = path.join(process.cwd(), "public", "uploads", filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error("Could not remove photo file:", err);
      }
    }
  }
}

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json(
        { success: false, message: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, product });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to fetch product", error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    // STEP 1: Find the existing product in MongoDB
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return NextResponse.json(
        { success: false, message: "Product not found" },
        { status: 404 }
      );
    }

    // STEP 2: Read form data submitted from browser
    const formData = await request.formData();

    const title = formData.get("title");
    const description = formData.get("description");
    const category = formData.get("category");
    const price = formData.get("price");
    const quantity = formData.get("quantity");
    const status = formData.get("status");
    const newImageFile = formData.get("image"); // Uploaded file object
    const textImageUrl = formData.get("imageUrl");

    // STEP 3: Collect updated fields
    const updateData = {};

    if (title) updateData.title = title.trim();
    if (description !== null) updateData.description = description.trim();
    if (category) updateData.category = category.trim();

    if (price !== null) {
      const parsedPrice = parseFloat(price);
      if (!isNaN(parsedPrice) && parsedPrice >= 0) {
        updateData.price = parsedPrice;
      }
    }

    if (quantity !== null) {
      const parsedQty = parseInt(quantity, 10);
      if (!isNaN(parsedQty) && parsedQty >= 0) {
        updateData.quantity = parsedQty;
        // Auto status adjustment
        updateData.status = parsedQty > 0 ? (status || "in_stock") : "out_of_stock";
      }
    } else if (status) {
      updateData.status = status;
    }

    // STEP 4: If a new photo was uploaded, replace the old photo
    if (newImageFile && typeof newImageFile === "object" && newImageFile.size > 0) {
      deleteLocalPhoto(existingProduct.imageUrl); // Delete previous photo from disk
      updateData.imageUrl = await saveUploadedFile(newImageFile); // Save new photo to disk
    } else if (textImageUrl) {
      updateData.imageUrl = textImageUrl.trim();
    }

    // STEP 5: Parse optional geographical location
    const latitude = formData.get("latitude");
    const longitude = formData.get("longitude");
    const address = formData.get("address");
    const removeLocation = formData.get("removeLocation");

    const mongoUpdate = { $set: updateData };

    if (removeLocation === "true") {
      mongoUpdate.$unset = { location: 1 };
    } else if (latitude !== null && longitude !== null && latitude !== "" && longitude !== "") {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        updateData.location = {
          type: "Point",
          coordinates: [lng, lat], // GeoJSON order: [longitude, latitude]
          address: address ? address.trim() : "",
        };
      }
    }

    // STEP 6: Update the document in MongoDB
    const updatedProduct = await Product.findByIdAndUpdate(id, mongoUpdate, {
      returnDocument: "after",
      runValidators: true,
    });

    return NextResponse.json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update product", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    // STEP 1: Find and delete the product from MongoDB
    const deletedProduct = await Product.findByIdAndDelete(id);
    if (!deletedProduct) {
      return NextResponse.json(
        { success: false, message: "Product not found" },
        { status: 404 }
      );
    }

    // STEP 2: Delete associated photo from "public/uploads" folder
    deleteLocalPhoto(deletedProduct.imageUrl);

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to delete product", error: error.message },
      { status: 500 }
    );
  }
}
