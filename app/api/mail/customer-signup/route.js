import { NextResponse } from "next/server";
import { sendSignupEmail, scheduleDelayedSignupEmail } from "@/lib/nodemailer";

export async function POST(request) {
  try {
    const { email, name, delayMinutes } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 }
      );
    }

    if (delayMinutes && Number(delayMinutes) > 0) {
      scheduleDelayedSignupEmail({ email, name }, Number(delayMinutes) * 60 * 1000);
      return NextResponse.json({
        success: true,
        message: `Thank you for registration email scheduled in ${delayMinutes} minute(s)`,
      });
    }

    await sendSignupEmail({ email, name });

    return NextResponse.json({
      success: true,
      message: "Registration thank you email sent successfully",
    });
  } catch (error) {
    console.error("Signup email error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to send signup email", error: error.message },
      { status: 500 }
    );
  }
}
