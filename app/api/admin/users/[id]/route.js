import connectDB from "@/lib/db";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to delete user", error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const updatedUser = await User.findByIdAndUpdate(id, body, {
      returnDocument: "after",
      runValidators: true,
    });

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Customer updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to update user", error: error.message },
      { status: 500 }
    );
  }
}
