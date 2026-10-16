"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  // List of navigation links
  const navLinks = [
    {
      name: "Dashboard",
      href: "/admin/dashboard",
      icon: "📊",
    },
    {
      name: "Orders & Live Dispatch",
      href: "/admin/live-orders",
      icon: "🛵",
    },
    {
      name: "Riders Fleet",
      href: "/admin/riders",
      icon: "🏍️",
    },
    {
      name: "Delivery Zones",
      href: "/admin/delivery-zones",
      icon: "🗺️",
    },
    {
      name: "Products",
      href: "/admin/products",
      icon: "📦",
    },
    {
      name: "Customers",
      href: "/admin/users",
      icon: "👥",
    },
    {
      name: "Refunds",
      href: "/admin/refunds",
      icon: "💸",
    },
    {
      name: "Promotions",
      href: "/admin/promotion",
      icon: "✉️",
    },
  ];

  // Logout function: Clears token and redirects to login
  function handleLogout() {
    localStorage.removeItem("token");
    router.push("/admin/login");
  }

  return (
    <>
      {/* Mobile Top Bar with Hamburger Toggle */}
      <div className="md:hidden flex items-center justify-between p-4 bg-zinc-950 border-b-2 border-zinc-800 sticky top-0 z-40 shadow-xl">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 font-black text-white text-base shadow-lg shadow-indigo-500/40 border border-indigo-300/40">
            A
          </span>
          <span className="font-black text-white text-base tracking-tight">Admin Panel</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-900 border border-zinc-700 text-lg cursor-pointer"
          aria-label="Toggle Navigation"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-sm"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-zinc-950 border-r-2 border-zinc-800/90 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 shadow-2xl ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top: Logo & Brand */}
        <div>
          <div className="flex items-center gap-3 px-6 h-20 border-b-2 border-zinc-800/90 bg-zinc-950">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-600 font-black text-white text-lg shadow-xl shadow-indigo-600/40 border-2 border-indigo-400">
              A
            </span>
            <div>
              <h2 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                Admin Panel
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-xs shadow-emerald-400" />
              </h2>
              <p className="text-[11px] font-bold text-indigo-400 tracking-wide uppercase">Command Center</p>
            </div>
          </div>

          {/* Navigation Menu Links */}
          <nav className="p-4 space-y-2">
            <p className="px-3 text-[10px] font-black uppercase tracking-widest text-zinc-300 mb-2.5">
              System Modules
            </p>
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href === "/admin/live-orders" && pathname === "/admin/orders");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white font-black shadow-xl shadow-indigo-600/40 border-2 border-indigo-400 scale-[1.02]"
                      : "text-zinc-300 hover:text-white font-bold hover:bg-zinc-900 border-2 border-transparent hover:border-zinc-700"
                  }`}
                >
                  <span className="text-lg">{link.icon}</span>
                  <span className="tracking-tight">{link.name}</span>
                </Link>
              );
            })}

            <div className="pt-3">
              <Link
                href="/"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-black text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 border-2 border-emerald-500/60 hover:border-emerald-400 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
              >
                <span className="text-lg">🛍️</span>
                <span>Open Storefront</span>
              </Link>
            </div>
          </nav>
        </div>

        {/* Bottom: Admin Info & Logout */}
        <div className="p-4 border-t-2 border-zinc-800/90 bg-zinc-950 space-y-3">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white text-xs border border-indigo-300/40 shadow-md">
              AD
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-black text-white truncate">
                Super Administrator
              </p>
              <p className="text-[10px] font-bold text-zinc-300 truncate">
                Active Session
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-black text-rose-300 bg-rose-950/50 hover:bg-rose-900/70 border-2 border-rose-500/60 hover:border-rose-400 shadow-lg shadow-rose-500/20 transition-all cursor-pointer active:scale-95"
          >
            <span>🚪</span>
            <span>Exit Admin Panel</span>
          </button>
        </div>
      </aside>
    </>
  );
}
