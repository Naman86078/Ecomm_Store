"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { clearCart } from "@/lib/cart";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const totalParam = searchParams.get("total");
  const orderNumberParam = searchParams.get("order_number");
  const isMock = searchParams.get("mock") === "true";
  const [orderNumber, setOrderNumber] = useState("");

  useEffect(() => {
    // Automatically clear customer cart after successful Stripe checkout
    clearCart();
    setOrderNumber(
      orderNumberParam || "ORD-" + Math.floor(100000 + Math.random() * 900000)
    );
  }, [orderNumberParam]);

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-neutral-200 shadow-xl text-center">
        {/* Animated Checkmark Badge */}
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full">
          Payment Successful
        </span>

        <h1 className="text-2xl font-bold text-neutral-900 mt-3">
          Thank you for your order!
        </h1>

        <p className="text-sm text-neutral-600 mt-2">
          Your payment has been processed securely via Stripe. We are preparing your order for shipment.
        </p>

        {isMock && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-800">
            <strong>Demo Mode:</strong> You tested checkout without a live Stripe key. To enable live card payments, set your <code className="font-mono text-[11px] bg-amber-100 px-1 py-0.5 rounded">STRIPE_SECRET_KEY</code> in <code className="font-mono text-[11px] bg-amber-100 px-1 py-0.5 rounded">.env.local</code>.
          </div>
        )}

        {/* Order Details Card */}
        <div className="mt-6 bg-neutral-50 rounded-2xl p-4 border border-neutral-100 text-left space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-neutral-500">Order ID:</span>
            <span className="font-mono font-semibold text-neutral-900">{orderNumber || "ORD-783921"}</span>
          </div>
          {sessionId && (
            <div className="flex justify-between">
              <span className="text-neutral-500">Stripe Session:</span>
              <span className="font-mono text-neutral-800 truncate max-w-[180px]">{sessionId}</span>
            </div>
          )}
          {totalParam && (
            <div className="flex justify-between pt-2 border-t border-neutral-200 text-sm">
              <span className="font-semibold text-neutral-800">Total Paid:</span>
              <span className="font-bold text-emerald-600">₹{totalParam}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-neutral-500">Estimated Delivery:</span>
            <span className="font-medium text-neutral-800">3-5 Business Days</span>
          </div>
        </div>

        {/* Customer Refund Guarantee Note */}
        <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-left text-xs text-indigo-900 flex items-start gap-2">
          <span className="text-base">🛡️</span>
          <div>
            <strong>Buyer Protection Guarantee:</strong>
            <p className="text-[11px] text-indigo-700 mt-0.5">
              If your item arrives defective, damaged, or not as ordered, you can request a full Stripe refund directly from your Orders page.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-2.5">
          <Link
            href={`/orders?orderNumber=${orderNumber}`}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs shadow transition-all"
          >
            <span>📦</span>
            <span>View Order & Refund Options</span>
          </Link>

          <Link
            href="/"
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 font-semibold text-xs transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Continue Shopping</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading order confirmation...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
