"use client";

import { useState } from "react";
import { addToCart, buyNow } from "@/lib/cart";

export default function ProductCard({ product, onQuickView }) {
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [isBuyingSingle, setIsBuyingSingle] = useState(false);

  const isOutOfStock = product.status === "out_of_stock" || (product.quantity !== undefined && product.quantity <= 0);

  const handleDecrement = (e) => {
    e.stopPropagation();
    if (selectedQuantity > 1) {
      setSelectedQuantity((prev) => prev - 1);
    }
  };

  const handleIncrement = (e) => {
    e.stopPropagation();
    const maxQty = product.quantity && product.quantity > 0 ? product.quantity : 99;
    if (selectedQuantity < maxQty) {
      setSelectedQuantity((prev) => prev + 1);
    }
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    addToCart(product, selectedQuantity);
  };

  const handleBuyNow = async (e) => {
    e.stopPropagation();
    try {
      const stored = localStorage.getItem("user");
      if (!stored) {
        alert("Please sign in or create an account before placing an order.");
        window.location.href = "/login?redirect=/";
        return;
      }
    } catch {}

    setIsBuyingSingle(true);
    try {
      await buyNow(product, selectedQuantity);
    } finally {
      setIsBuyingSingle(false);
    }
  };

  // Image fallback
  const fallbackImg = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=60";
  const displayImage = product.imageUrl || fallbackImg;

  return (
    <div
      onClick={() => onQuickView && onQuickView(product)}
      className="group glass-card rounded-3xl flex flex-col overflow-hidden cursor-pointer border-2 border-slate-200/90 hover:border-indigo-500 shadow-md hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-300 hover:-translate-y-1.5 bg-white"
    >
      {/* Product Image Area */}
      <div className="relative aspect-square w-full bg-slate-100 overflow-hidden border-b-2 border-slate-100">
        <img
          src={displayImage}
          alt={product.title}
          className="w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-700 ease-out"
          onError={(e) => {
            e.currentTarget.src = fallbackImg;
          }}
        />

        {/* Category Pill */}
        <span className="absolute top-3 left-3 bg-black/85 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-full shadow-md uppercase tracking-wider border border-white/20">
          {product.category || "General"}
        </span>

        {/* Stock Badge */}
        <span
          className={`absolute top-3 right-3 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md backdrop-blur-md border ${
            isOutOfStock
              ? "bg-rose-600 text-white border-rose-400"
              : "bg-emerald-400 text-black border-emerald-300 shadow-emerald-400/20"
          }`}
        >
          {isOutOfStock ? "Out of Stock" : "In Stock"}
        </span>

        {/* Distance Badge if location search active */}
        {product.distanceKm !== undefined && product.distanceKm !== null && (
          <span className="absolute bottom-3 left-3 bg-gradient-to-r from-indigo-600 to-purple-600 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg border border-indigo-300/60 flex items-center gap-1.5 uppercase tracking-wider">
            <span>📍</span>
            <span>
              {product.distanceKm < 1
                ? `${Math.round(product.distanceKm * 1000)} m away`
                : `${product.distanceKm.toFixed(1)} km away`}
            </span>
          </span>
        )}
      </div>

      {/* Product Info */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-black text-slate-950 text-base leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors">
            {product.title}
          </h3>

          {product.location?.address && (
            <div className="mt-1 text-[11px] text-slate-600 flex items-center gap-1 font-bold truncate">
              <span className="text-indigo-600">📍</span>
              <span className="truncate">{product.location.address}</span>
            </div>
          )}

          {product.description && (
            <p className="mt-1.5 text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        {/* Price and Quantity Selector */}
        <div className="mt-4 pt-3.5 border-t-2 border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Price</span>
              <span className="text-2xl font-black text-slate-950 tracking-tight">
                ₹{Number(product.price).toFixed(2)}
              </span>
            </div>

            {/* Quantity Stepper */}
            {!isOutOfStock && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center border-2 border-slate-300 rounded-xl overflow-hidden bg-slate-50 shadow-xs"
              >
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={selectedQuantity <= 1}
                  className="w-8 h-8 flex items-center justify-center text-slate-800 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent transition-colors text-sm font-black"
                >
                  -
                </button>
                <span className="w-8 text-center text-xs font-black text-slate-950">
                  {selectedQuantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  className="w-8 h-8 flex items-center justify-center text-slate-800 hover:bg-slate-200 transition-colors text-sm font-black"
                >
                  +
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons: Add to Cart and Buy Now */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="mt-4 grid grid-cols-2 gap-2"
          >
            {/* Add to Cart Button */}
            <button
              type="button"
              disabled={isOutOfStock}
              onClick={handleAddToCart}
              className="btn-premium w-full py-2.5 px-3 rounded-xl border-2 border-slate-300 hover:border-slate-950 bg-white hover:bg-slate-950 text-slate-900 hover:text-white text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 text-slate-600 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Add {selectedQuantity > 1 ? `(${selectedQuantity})` : "to Cart"}</span>
            </button>

            {/* Buy Now (Stripe direct checkout) Button */}
            <button
              type="button"
              disabled={isOutOfStock || isBuyingSingle}
              onClick={handleBuyNow}
              className="btn-premium w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-500 hover:to-violet-600 text-white text-xs font-black shadow-lg shadow-indigo-600/30 border-2 border-indigo-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              {isBuyingSingle ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
              <span>Buy Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
