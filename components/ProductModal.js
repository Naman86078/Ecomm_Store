"use client";

import { useState } from "react";
import { addToCart, buyNow } from "@/lib/cart";

export default function ProductModal({ product, onClose }) {
  const [quantity, setQuantity] = useState(1);
  const [isBuying, setIsBuying] = useState(false);

  if (!product) return null;

  const isOutOfStock = product.status === "out_of_stock" || (product.quantity !== undefined && product.quantity <= 0);
  const fallbackImg = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80";

  const handleAddToCart = () => {
    addToCart(product, quantity);
    onClose();
  };

  const handleBuyNow = async () => {
    try {
      const stored = localStorage.getItem("user");
      if (!stored) {
        alert("Please sign in or create an account before placing an order.");
        onClose();
        window.location.href = "/login?redirect=/";
        return;
      }
    } catch {}

    setIsBuying(true);
    try {
      await buyNow(product, quantity);
    } finally {
      setIsBuying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm transition-opacity"
      />

      <div className="min-h-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-neutral-200">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-white/80 hover:bg-white text-neutral-500 hover:text-neutral-800 rounded-full shadow-md transition-all"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Image */}
            <div className="relative bg-neutral-100 aspect-square md:aspect-auto">
              <img
                src={product.imageUrl || fallbackImg}
                alt={product.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = fallbackImg;
                }}
              />
              <span className="absolute top-4 left-4 bg-white/90 backdrop-blur-md text-neutral-800 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                {product.category || "General"}
              </span>
            </div>

            {/* Content */}
            <div className="p-6 md:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                      isOutOfStock
                        ? "bg-rose-100 text-rose-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {isOutOfStock ? "Out of Stock" : "In Stock"}
                  </span>
                  {product.quantity > 0 && (
                    <span className="text-xs text-neutral-500">
                      {product.quantity} units available
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-bold text-neutral-900 leading-snug">
                  {product.title}
                </h2>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-neutral-950">
                    ₹{Number(product.price).toFixed(2)}
                  </span>
                </div>

                {/* Location & Distance Info */}
                {(product.location?.address || product.distanceKm !== undefined) && (
                  <div className="mt-2.5 inline-flex flex-wrap items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-medium">
                    <span>📍</span>
                    <span>{product.location?.address || "Store Location"}</span>
                    {product.distanceKm !== undefined && product.distanceKm !== null && (
                      <span className="font-bold text-indigo-950 bg-indigo-200/60 px-1.5 py-0.5 rounded-md">
                        {product.distanceKm < 1
                          ? `${Math.round(product.distanceKm * 1000)} m away`
                          : `${product.distanceKm.toFixed(1)} km away`}
                      </span>
                    )}
                  </div>
                )}

                <p className="mt-4 text-xs md:text-sm text-neutral-600 leading-relaxed">
                  {product.description || "No extended description provided for this product."}
                </p>
              </div>

              {/* Controls */}
              <div className="mt-6 pt-6 border-t border-neutral-100 space-y-4">
                {/* Quantity selection */}
                {!isOutOfStock && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-700">Quantity</span>
                    <div className="flex items-center border border-neutral-300 rounded-lg overflow-hidden bg-neutral-50">
                      <button
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        className="w-8 h-8 flex items-center justify-center text-sm font-semibold text-neutral-700 hover:bg-neutral-200 disabled:opacity-40"
                      >
                        -
                      </button>
                      <span className="w-10 text-center text-sm font-bold text-neutral-900">
                        {quantity}
                      </span>
                      <button
                        onClick={() =>
                          setQuantity((q) =>
                            product.quantity ? Math.min(product.quantity, q + 1) : q + 1
                          )
                        }
                        className="w-8 h-8 flex items-center justify-center text-sm font-semibold text-neutral-700 hover:bg-neutral-200"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {/* Total Preview */}
                <div className="flex justify-between text-xs text-neutral-500">
                  <span>Selected Total:</span>
                  <span className="font-bold text-neutral-900">
                    ₹{(Number(product.price) * quantity).toFixed(2)}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    disabled={isOutOfStock}
                    onClick={handleAddToCart}
                    className="py-3 px-4 rounded-xl border border-neutral-300 hover:border-neutral-400 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
                  >
                    Add {quantity > 1 ? `(${quantity})` : ""} to Cart
                  </button>

                  <button
                    disabled={isOutOfStock || isBuying}
                    onClick={handleBuyNow}
                    className="py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
                  >
                    {isBuying ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )}
                    <span>Buy Now</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
