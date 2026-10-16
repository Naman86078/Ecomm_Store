"use client";

import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
        <div className="w-20 h-20 rounded-full bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center text-4xl mx-auto shadow-inner">
          📡
        </div>

        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            You Are Offline
          </h1>
          <p className="text-sm text-neutral-400 mt-2 leading-relaxed">
            It looks like your internet connection is unavailable. NovaStore has saved your essential offline cache.
          </p>
        </div>

        <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 text-xs text-neutral-400 text-left space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <span>●</span>
            <span>Offline Tips:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-neutral-400">
            <li>Check your Wi-Fi or mobile data toggle</li>
            <li>Previously loaded pages remain accessible</li>
            <li>Reconnecting will sync live order tracking</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg transition cursor-pointer"
          >
            Retry Connection
          </button>
          <Link
            href="/"
            className="flex-1 py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-sm font-bold border border-neutral-700 transition flex items-center justify-center"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
