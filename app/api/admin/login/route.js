import connectDB from "@/lib/db";
import Admin from "@/models/Admin";
import bcrypt from "bcryptjs";
import { createToken } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request) {
    await connectDB();

    const { email, password } = await request.json();

    if (!email || !password) {
        return NextResponse.json(
            { message: "Email aur password dono daalo" },
            { status: 400 }
        );
    }

    const admin = await Admin.findOne({ email: email });

    if (!admin) {
        return NextResponse.json(
            { message: "Email ya password galat hai" },
            { status: 401 }
        );
    }

    const isPasswordCorrect = await bcrypt.compare(password, admin.password);

    if (!isPasswordCorrect) {
        return NextResponse.json(
            { message: "Email ya password galat hai" },
            { status: 401 }
        );
    }

    const token = createToken(admin);

    const response = NextResponse.json({
        message: "Login successful!",
        token: token,
        name: admin.name,
    });

    // Token ko cookie me save karo
    response.cookies.set("token", token, {
        path: "/",
    });

    return response;
}