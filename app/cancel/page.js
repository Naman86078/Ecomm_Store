"use client";

import Link from "next/link";

export default function CancelPage() {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-neutral-200 shadow-xl text-center">
        {/* Cancel Icon */}
        <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        <span className="text-xs font-bold text-rose-700 uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-full">
          Checkout Cancelled
        </span>

        <h1 className="text-2xl font-bold text-neutral-900 mt-3">
          No charge was made
        </h1>

        <p className="text-sm text-neutral-600 mt-2">
          Your payment session was cancelled. Don&apos;t worry, any items you added to your cart are still saved and ready for you whenever you&apos;re ready.
        </p>

        {/* Buttons */}
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/"
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md transition-all active:scale-95"
          >
            <span>Return to Store</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
