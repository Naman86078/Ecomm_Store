import connectDB from "@/lib/db";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { phone: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const users = await User.find(query).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to fetch users", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { name, email, phone, role, status } = body;

    if (!name || !email) {
      return NextResponse.json(
        { success: false, message: "Name and email are required" },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "User with this email already exists" },
        { status: 409 }
      );
    }

    const newUser = await User.create({
      name,
      email,
      phone: phone || "",
      role: role || "customer",
      status: status || "active",
    });

    return NextResponse.json(
      { success: true, message: "Customer created successfully", user: newUser },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to create user", error: error.message },
      { status: 500 }
    );
  }
}
