"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState({ total: 0, active: 0 });
  const [productStats, setProductStats] = useState({ total: 0, inStock: 0 });
  const [refundStats, setRefundStats] = useState({ pending: 0, refunded: 0 });
  const [zoneStats, setZoneStats] = useState({ total: 0, active: 0 });

  useEffect(() => {
    const encryptedToken = localStorage.getItem("token");

    if (!encryptedToken) {
      router.push("/admin/login");
    } else {
      try {
        const token = atob(encryptedToken);
        if (token) {
          setLoading(false);
          // Fetch quick count for dashboard customers
          fetch("/api/admin/users")
            .then((res) => res.json())
            .then((data) => {
              if (data.success) {
                const total = data.users.length;
                const active = data.users.filter((u) => u.status === "active").length;
                setUserStats({ total, active });
              }
            })
            .catch(() => {});

          // Fetch quick count for dashboard products
          fetch("/api/admin/products")
            .then((res) => res.json())
            .then((data) => {
              if (data.success) {
                const total = data.products.length;
                const inStock = data.products.filter((p) => p.status === "in_stock" && p.quantity > 0).length;
                setProductStats({ total, inStock });
              }
            })
            .catch(() => {});

          // Fetch quick count for refund requests
          fetch("/api/admin/refunds")
            .then((res) => res.json())
            .then((data) => {
              if (data.success && data.stats) {
                setRefundStats({
                  pending: data.stats.pendingRefundsCount || 0,
                  refunded: data.stats.completedRefundsCount || 0,
                });
              }
            })
            .catch(() => {});

          // Fetch delivery zones
          fetch("/api/delivery-zones")
            .then((res) => res.json())
            .then((data) => {
              if (data.success && Array.isArray(data.zones)) {
                const total = data.zones.length;
                const active = data.zones.filter((z) => z.isActive !== false).length;
                setZoneStats({ total, active });
              }
            })
            .catch(() => {});

        } else {
          router.push("/admin/login");
        }
      } catch (e) {
        router.push("/admin/login");
      }
    }
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("token");
    router.push("/admin/login");
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-zinc-950">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="mt-3 text-sm text-gray-500 dark:text-zinc-400">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Welcome Back, Admin! 👋
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
            Overview and quick access to all administrative modules.
          </p>
        </div>


        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Live Dispatch Module Card */}
          <Link
            href="/admin/live-orders"
            className="group block p-6 bg-zinc-900/90 rounded-2xl border-2 border-emerald-500/60 hover:border-emerald-400 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/25 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white text-2xl group-hover:scale-110 shadow-lg shadow-emerald-600/40 border border-emerald-300/40 transition-transform">
                🛵
              </span>
              <span className="text-xs font-black text-emerald-400 group-hover:text-emerald-300 group-hover:translate-x-1 transition-all uppercase tracking-wider">
                Live Dispatch &rarr;
              </span>
            </div>
            <h3 className="mt-4 text-xl font-black text-white group-hover:text-emerald-300 transition-colors">
              Live Orders & GPS Dispatch
            </h3>
            <p className="mt-1 text-xs font-medium text-zinc-300 leading-relaxed">
              Track active delivery routes on the live map, control order phases, and monitor rider fleet GPS.
            </p>
            <div className="mt-4 pt-4 border-t-2 border-zinc-800/80 flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-bold">Rider Fleet: <strong className="text-white text-sm font-black">Active</strong></span>
              <span className="text-emerald-400 font-black px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50">WebSocket Live</span>
            </div>
          </Link>

          {/* Riders Fleet Module Card */}
          <Link
            href="/admin/riders"
            className="group block p-6 bg-zinc-900/90 rounded-2xl border-2 border-amber-500/60 hover:border-amber-400 shadow-xl hover:shadow-2xl hover:shadow-amber-500/25 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white text-2xl group-hover:scale-110 shadow-lg shadow-amber-500/40 border border-amber-300/40 transition-transform">
                🏍️
              </span>
              <span className="text-xs font-black text-amber-400 group-hover:text-amber-300 group-hover:translate-x-1 transition-all uppercase tracking-wider">
                Fleet & Panels &rarr;
              </span>
            </div>
            <h3 className="mt-4 text-xl font-black text-white group-hover:text-amber-300 transition-colors">
              Riders Fleet & Panels
            </h3>
            <p className="mt-1 text-xs font-medium text-zinc-300 leading-relaxed">
              Manage seeded delivery riders, dispatch assignments, and access individual rider panels as Admin.
            </p>
            <div className="mt-4 pt-4 border-t-2 border-zinc-800/80 flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-bold">Rider Panels: <strong className="text-white text-sm font-black">Auth Protected</strong></span>
              <span className="text-amber-400 font-black px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/50">Admin Access</span>
            </div>
          </Link>

          {/* Delivery Zones Module Card */}
          <Link
            href="/admin/delivery-zones"
            className="group block p-6 bg-zinc-900/90 rounded-2xl border-2 border-indigo-500/50 hover:border-indigo-400 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/25 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white text-2xl group-hover:scale-110 shadow-lg shadow-indigo-600/40 border border-indigo-300/40 transition-transform">
                🗺️
              </span>
              <span className="text-xs font-black text-indigo-400 group-hover:text-indigo-300 group-hover:translate-x-1 transition-all uppercase tracking-wider">
                Manage Zones &rarr;
              </span>
            </div>
            <h3 className="mt-4 text-xl font-black text-white group-hover:text-indigo-300 transition-colors">
              Delivery Zones
            </h3>
            <p className="mt-1 text-xs font-medium text-zinc-300 leading-relaxed">
              Draw map polygons, configure delivery fees, minimum order amounts, and test coordinates.
            </p>
            <div className="mt-4 pt-4 border-t-2 border-zinc-800/80 flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-bold">Total Zones: <strong className="text-white text-sm font-black">{zoneStats.total}</strong></span>
              <span className="text-emerald-400 font-black px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50">Active: {zoneStats.active}</span>
            </div>
          </Link>

          {/* Customers Module Card */}
          <Link
            href="/admin/users"
            className="group block p-6 bg-zinc-900/90 rounded-2xl border-2 border-cyan-500/40 hover:border-cyan-400 shadow-xl hover:shadow-2xl hover:shadow-cyan-500/25 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white text-2xl group-hover:scale-110 shadow-lg shadow-cyan-600/40 border border-cyan-300/40 transition-transform">
                👥
              </span>
              <span className="text-xs font-black text-cyan-400 group-hover:text-cyan-300 group-hover:translate-x-1 transition-all uppercase tracking-wider">
                Manage Customers &rarr;
              </span>
            </div>
            <h3 className="mt-4 text-xl font-black text-white group-hover:text-cyan-300 transition-colors">
              Registered Customers
            </h3>
            <p className="mt-1 text-xs font-medium text-zinc-300 leading-relaxed">
              View customer profiles, contact info, statuses, and registration dates.
            </p>
            <div className="mt-4 pt-4 border-t-2 border-zinc-800/80 flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-bold">Total: <strong className="text-white text-sm font-black">{userStats.total}</strong></span>
              <span className="text-emerald-400 font-black px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50">Active: {userStats.active}</span>
            </div>
          </Link>

          {/* Products Module Card */}
          <Link
            href="/admin/products"
            className="group block p-6 bg-zinc-900/90 rounded-2xl border-2 border-emerald-500/40 hover:border-emerald-400 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/25 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white text-2xl group-hover:scale-110 shadow-lg shadow-emerald-600/40 border border-emerald-300/40 transition-transform">
                📦
              </span>
              <span className="text-xs font-black text-emerald-400 group-hover:text-emerald-300 group-hover:translate-x-1 transition-all uppercase tracking-wider">
                Manage Catalog &rarr;
              </span>
            </div>
            <h3 className="mt-4 text-xl font-black text-white group-hover:text-emerald-300 transition-colors">
              Products Catalog
            </h3>
            <p className="mt-1 text-xs font-medium text-zinc-300 leading-relaxed">
              Manage inventory, pricing, stock levels, and upload photos with Multer.
            </p>
            <div className="mt-4 pt-4 border-t-2 border-zinc-800/80 flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-bold">Total: <strong className="text-white text-sm font-black">{productStats.total}</strong></span>
              <span className="text-emerald-400 font-black px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50">In Stock: {productStats.inStock}</span>
            </div>
          </Link>

          {/* Promotions Module Card */}
          <Link
            href="/admin/promotion"
            className="group block p-6 bg-zinc-900/90 rounded-2xl border-2 border-purple-500/40 hover:border-purple-400 shadow-xl hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white text-2xl group-hover:scale-110 shadow-lg shadow-purple-600/40 border border-purple-300/40 transition-transform">
                ✉️
              </span>
              <span className="text-xs font-black text-purple-400 group-hover:text-purple-300 group-hover:translate-x-1 transition-all uppercase tracking-wider">
                Send Campaign &rarr;
              </span>
            </div>
            <h3 className="mt-4 text-xl font-black text-white group-hover:text-purple-300 transition-colors">
              Email Promotions
            </h3>
            <p className="mt-1 text-xs font-medium text-zinc-300 leading-relaxed">
              Compose custom HTML emails and dispatch bulk marketing campaigns via Nodemailer.
            </p>
            <div className="mt-4 pt-4 border-t-2 border-zinc-800/80 flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-bold">Audience: <strong className="text-white font-black">All Customers</strong></span>
              <span className="text-purple-300 font-black px-2.5 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/50">Nodemailer</span>
            </div>
          </Link>

          {/* Refunds Module Card */}
          <Link
            href="/admin/refunds"
            className="group block p-6 bg-zinc-900/90 rounded-2xl border-2 border-amber-500/40 hover:border-amber-400 shadow-xl hover:shadow-2xl hover:shadow-amber-500/25 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-600 text-white text-2xl group-hover:scale-110 shadow-lg shadow-amber-600/40 border border-amber-300/40 transition-transform">
                💸
              </span>
              <span className="text-xs font-black text-amber-400 group-hover:text-amber-300 group-hover:translate-x-1 transition-all uppercase tracking-wider">
                Stripe Refunds &rarr;
              </span>
            </div>
            <h3 className="mt-4 text-xl font-black text-white group-hover:text-amber-300 transition-colors">
              Refunds & Stripe
            </h3>
            <p className="mt-1 text-xs font-medium text-zinc-300 leading-relaxed">
              Review customer return claims and execute automated refunds directly through Stripe.
            </p>
            <div className="mt-4 pt-4 border-t-2 border-zinc-800/80 flex items-center justify-between text-xs">
              <span className="text-amber-300 font-black px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/50">Pending: {refundStats.pending}</span>
              <span className="text-purple-300 font-black px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/50">Refunded: {refundStats.refunded}</span>
            </div>
          </Link>
        </div>
    </div>
  );
}