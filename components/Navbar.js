"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getCart, openCart } from "@/lib/cart";

export default function Navbar({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  categories = [],
  onToggleNearby,
  isNearbyActive = false,
}) {
  const [cartCount, setCartCount] = useState(0);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const updateCartCount = () => {
      const items = getCart();
      const count = items.reduce((acc, item) => acc + (item.quantity || 1), 0);
      setCartCount(count);
    };

    updateCartCount();
    window.addEventListener("cart-updated", updateCartCount);
    window.addEventListener("storage", updateCartCount);

    return () => {
      window.removeEventListener("cart-updated", updateCartCount);
      window.removeEventListener("storage", updateCartCount);
    };
  }, []);

  useEffect(() => {
    const loadUser = () => {
      try {
        const stored = localStorage.getItem("user");
        setUser(stored ? JSON.parse(stored) : null);
      } catch {
        setUser(null);
      }
    };
    loadUser();
    window.addEventListener("storage", loadUser);
    return () => window.removeEventListener("storage", loadUser);
  }, []);

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
    window.dispatchEvent(new Event("storage"));
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b-2 border-slate-200/80 shadow-md backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 group-hover:scale-110 group-hover:rotate-2 border-2 border-indigo-400/50 transition-all duration-300">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-slate-950 group-hover:text-indigo-600 transition-colors">
                Nova<span className="gradient-text">Store</span>
              </span>
              <span className="text-[10px] text-indigo-600 font-extrabold -mt-1 tracking-wider uppercase">
                Premium Store
              </span>
            </div>
          </Link>

          {/* Search bar */}
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <input
                type="text"
                placeholder="Search products by title, category, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                suppressHydrationWarning
                className="w-full pl-10 pr-4 py-2 text-xs font-bold bg-white border-2 border-slate-300 rounded-full focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-slate-900 placeholder-slate-400 shadow-sm"
              />
              <svg
                className="w-4 h-4 absolute left-3.5 top-2.5 text-neutral-500 font-bold"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2 text-xs text-neutral-400 hover:text-neutral-700 font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5">
            {/* Near Me Discovery Button */}
            <button
              onClick={() => {
                if (onToggleNearby) {
                  onToggleNearby();
                } else {
                  window.location.hash = "nearby";
                }
              }}
              suppressHydrationWarning
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black rounded-full transition-all cursor-pointer shadow-sm active:scale-95 ${
                isNearbyActive
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-2 border-indigo-400 shadow-lg shadow-indigo-600/40"
                  : "text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-300/80 hover:border-indigo-500"
              }`}
              title="Find Products Near You"
            >
              <span className="text-sm">📍</span>
              <span className="hidden sm:inline">{isNearbyActive ? "Near Me (Active)" : "Near Me"}</span>
            </button>

            {/* Customer Auth Button */}
            {user ? (
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-2 pl-2 pr-3 py-1 bg-neutral-100 rounded-full border-2 border-neutral-300">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black uppercase shadow-xs">
                    {user.name ? user.name[0] : "U"}
                  </div>
                  <span className="text-xs font-black text-neutral-900 hidden sm:inline max-w-[100px] truncate">
                    {user.name}
                  </span>
                </div>
                <button
                  onClick={logout}
                  title="Sign out"
                  className="p-1.5 text-neutral-500 hover:text-rose-600 hover:bg-neutral-100 rounded-full transition-colors font-bold"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-neutral-800 hover:text-indigo-600 hover:bg-neutral-100 rounded-full transition-colors"
              >
                <svg className="w-4 h-4 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Sign In</span>
              </Link>
            )}

            {/* Customer Orders / Refunds Link */}
            <Link
              href="/orders"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-neutral-800 hover:text-indigo-600 hover:bg-neutral-100 rounded-full transition-colors"
              title="View Orders and Request Refunds"
            >
              <svg className="w-4 h-4 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>My Orders</span>
            </Link>


            {/* Cart Button */}
            <button
              id="cart-trigger-button"
              onClick={openCart}
              suppressHydrationWarning
              className="relative flex items-center gap-2.5 px-4 py-2 bg-neutral-950 hover:bg-neutral-900 text-white rounded-full text-xs font-black shadow-lg shadow-neutral-950/20 border-2 border-neutral-700 hover:border-indigo-400 transition-all active:scale-95 cursor-pointer"
              aria-label="View Cart"
            >
              <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span className="hidden sm:inline uppercase tracking-wider text-[11px]">Cart</span>
              <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 text-xs font-black leading-none text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full shadow-sm border border-indigo-300">
                {cartCount}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile search bar */}
        <div className="pb-3 md:hidden">
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            suppressHydrationWarning
            className="w-full pl-9 pr-4 py-2 text-sm bg-neutral-100 border border-neutral-200 rounded-lg text-neutral-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
    </header>
  );
}
