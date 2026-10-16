"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RiderLoginPage() {
  const router = useRouter();
  const [riderId, setRiderId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const quickRiders = [
    { id: "RIDER-001", name: "Aman Verma", vehicle: "Electric Optima", pass: "rider123" },
    { id: "RIDER-002", name: "Vikram Rathore", vehicle: "Activa 6G", pass: "rider123" },
    { id: "RIDER-003", name: "Deepak Saini", vehicle: "iQube EV", pass: "rider123" },
    { id: "RIDER-004", name: "Harpreet Singh", vehicle: "Ather 450X", pass: "rider123" },
  ];

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!riderId || !password) {
      setError("Please enter both Rider ID and Password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/rider/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riderId, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Login failed. Check your credentials.");
      }

      // Store in localStorage for client state
      localStorage.setItem("rider_token", data.token);
      localStorage.setItem("rider_info", JSON.stringify(data.rider));

      // Redirect to Rider Panel
      router.push("/rider/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (r) => {
    setRiderId(r.id);
    setPassword(r.pass);
    setError("");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden selection:bg-emerald-500 selection:text-black">
      {/* Background Neon Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[350px] bg-gradient-to-tr from-emerald-600/20 via-teal-500/10 to-transparent blur-3xl pointer-events-none rounded-full" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-amber-500/10 blur-3xl pointer-events-none rounded-full" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 shadow-xl shadow-emerald-500/25 border-2 border-emerald-400/40 mb-4 animate-bounce-slow">
            <span className="text-3xl">🛵</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            Rider Delivery Fleet
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/50 font-bold uppercase tracking-wider">
              Live GPS
            </span>
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Sign in with your assigned Rider ID & Password to access your dispatch dashboard.
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-zinc-900/90 border-2 border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-3">
              <span className="text-base">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
                Rider ID or Registered Phone
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={riderId}
                  onChange={(e) => setRiderId(e.target.value)}
                  placeholder="e.g. RIDER-001"
                  required
                  className="w-full px-4 py-3 bg-zinc-950 border-2 border-zinc-700 rounded-2xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono transition"
                />
                <span className="absolute right-4 top-3.5 text-zinc-500 text-sm">🆔</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 bg-zinc-950 border-2 border-zinc-700 rounded-2xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
                />
                <span className="absolute right-4 top-3.5 text-zinc-500 text-sm">🔒</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl font-black text-sm text-zinc-950 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 shadow-xl shadow-emerald-500/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating Rider...</span>
                </>
              ) : (
                <>
                  <span>🚀 Enter Rider Dispatch Console</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Chips */}
          <div className="mt-6 pt-6 border-t border-zinc-800">
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Seeded Fleet (Click to test):</span>
              <span className="text-emerald-400 font-mono">Pass: rider123</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {quickRiders.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleQuickFill(r)}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col cursor-pointer ${
                    riderId === r.id
                      ? "bg-emerald-950/60 border-emerald-500 text-white"
                      : "bg-zinc-950/80 border-zinc-800 hover:border-zinc-700 text-zinc-300"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono font-bold">
                    <span>{r.id}</span>
                    <span className="text-[10px] text-emerald-400">⚡</span>
                  </div>
                  <span className="text-xs font-semibold text-white truncate">{r.name}</span>
                  <span className="text-[10px] text-zinc-500 truncate">{r.vehicle}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Navigation Links */}
        <div className="mt-8 flex items-center justify-between text-xs text-zinc-400 px-2">
          <Link
            href="/"
            className="hover:text-emerald-400 transition flex items-center gap-1.5 font-medium"
          >
            <span>&larr;</span> Storefront
          </Link>
          <Link
            href="/admin/login"
            className="hover:text-indigo-400 transition flex items-center gap-1.5 font-medium"
          >
            Admin Command Center <span>&rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
