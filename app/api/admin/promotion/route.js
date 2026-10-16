import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { subject, htmlContent, recipients } = await request.json();

    if (!subject || !subject.trim()) {
      return NextResponse.json(
        { success: false, message: "Email subject is required" },
        { status: 400 }
      );
    }

    if (!htmlContent || !htmlContent.trim()) {
      return NextResponse.json(
        { success: false, message: "HTML content is required" },
        { status: 400 }
      );
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { success: false, message: "Please select at least one customer recipient" },
        { status: 400 }
      );
    }

    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const emailService = process.env.EMAIL_SERVICE || "gmail";

    if (!emailUser || !emailPass) {
      return NextResponse.json(
        {
          success: false,
          message: "Email credentials not configured in .env (EMAIL_USER & EMAIL_PASS).",
        },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: emailService,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    // Send emails
    const results = await Promise.allSettled(
      recipients.map((toEmail) =>
        transporter.sendMail({
          from: `"Admin Promotions" <${emailUser}>`,
          to: toEmail,
          subject: subject.trim(),
          html: htmlContent,
        })
      )
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (successful === 0 && failed > 0) {
      const firstError = results.find((r) => r.status === "rejected")?.reason?.message || "Failed to send";
      return NextResponse.json(
        { success: false, message: `Failed to send emails: ${firstError}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Promotional email successfully sent to ${successful} customer(s)${
        failed > 0 ? ` (${failed} failed)` : ""
      }!`,
      successful,
      failed,
    });
  } catch (error) {
    console.error("Promotion mail error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server error while sending emails" },
      { status: 500 }
    );
  }
}
