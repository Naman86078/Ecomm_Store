import { NextResponse } from "next/server";
import { sendSignupEmail } from "@/lib/nodemailer";

export async function POST(request) {
  try {
    const { email, name } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 }
      );
    }

    await sendSignupEmail({ email, name });

    return NextResponse.json({
      success: true,
      message: "Signup welcome email sent successfully",
    });
  } catch (error) {
    console.error("Signup email error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to send signup email", error: error.message },
      { status: 500 }
    );
  }
}
