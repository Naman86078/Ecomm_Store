"use client";

import { useState, useEffect } from "react";
import {
  getCart,
  updateQuantity,
  removeFromCart,
  clearCart,
  closeCart,
  checkout,
  getDeliveryLocation,
} from "@/lib/cart";
import DeliveryLocationSelector from "@/components/DeliveryLocationSelector";

export default function CartDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [customerUser, setCustomerUser] = useState(null);

  useEffect(() => {
    const syncCart = () => setCartItems(getCart());
    const syncLocation = () => setDeliveryLocation(getDeliveryLocation());
    const syncUser = () => {
      try {
        const u = localStorage.getItem("user");
        setCustomerUser(u ? JSON.parse(u) : null);
      } catch {
        setCustomerUser(null);
      }
    };
    const handleToggle = (e) => setIsOpen(Boolean(e.detail));

    syncCart();
    syncLocation();
    syncUser();

    window.addEventListener("cart-updated", syncCart);
    window.addEventListener("cart-toggle", handleToggle);
    window.addEventListener("delivery-location-updated", syncLocation);
    window.addEventListener("storage", () => {
      syncCart();
      syncLocation();
      syncUser();
    });

    return () => {
      window.removeEventListener("cart-updated", syncCart);
      window.removeEventListener("cart-toggle", handleToggle);
      window.removeEventListener("delivery-location-updated", syncLocation);
      window.removeEventListener("storage", syncCart);
    };
  }, []);

  if (!isOpen) return null;

  const cartCount = cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0);
  const cartSubtotal = cartItems.reduce(
    (acc, item) => acc + (item.price || 0) * (item.quantity || 1),
    0
  );

  // Delivery zone calculation
  const hasLocation = Boolean(deliveryLocation && deliveryLocation.lat !== undefined);
  const isServiceable = Boolean(deliveryLocation?.serviceable);
  const deliveryCharge = isServiceable ? Number(deliveryLocation?.deliveryCharge || 0) : 0;
  const minOrderAmount = Number(deliveryLocation?.minOrderAmount || 0);
  const estimatedTime = deliveryLocation?.estimatedDeliveryTime || "30-45 mins";
  const zoneName = deliveryLocation?.zone?.name || "Delivery Zone";

  const isMinOrderMet = minOrderAmount <= 0 || cartSubtotal >= minOrderAmount;
  const minOrderRemaining = Math.max(0, minOrderAmount - cartSubtotal);

  const finalTotal = cartSubtotal + deliveryCharge;

  const handleCheckout = async () => {
    if (!customerUser) {
      alert("Please sign in or create an account to proceed to checkout.");
      closeCart();
      window.location.href = "/login?redirect=/";
      return;
    }
    if (!hasLocation) {
      setIsLocationModalOpen(true);
      return;
    }
    if (!isServiceable) {
      alert("Your selected delivery address is outside our delivery zones. Please choose a serviceable address.");
      return;
    }
    if (!isMinOrderMet) {
      alert(`Minimum order amount for ${zoneName} is ₹${minOrderAmount}. Please add ₹${minOrderRemaining.toFixed(2)} more items.`);
      return;
    }

    setIsCheckingOut(true);
    try {
      await checkout();
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <div
          onClick={closeCart}
          className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm transition-opacity"
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
            {/* Drawer Header */}
            <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-neutral-900">Shopping Cart</h2>
                <span className="text-xs bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded-full">
                  {cartCount} {cartCount === 1 ? "item" : "items"}
                </span>
              </div>
              <button
                onClick={closeCart}
                className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                aria-label="Close cart"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Delivery Location Ribbon - Overpowered High Contrast */}
            <div className="bg-neutral-100 px-4 py-3.5 border-b-2 border-neutral-200 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 truncate">
                <span className="text-lg flex-shrink-0">📍</span>
                <div className="truncate">
                  {hasLocation ? (
                    <>
                      <div className="font-black text-neutral-950 truncate text-xs">
                        {deliveryLocation.address || "Selected Location"}
                      </div>
                      <div className="text-[11px] mt-0.5 flex items-center gap-1.5 font-bold">
                        {isServiceable ? (
                          <span className="text-emerald-700">
                            ● {zoneName} ({estimatedTime})
                          </span>
                        ) : (
                          <span className="text-rose-700">
                            ● Outside Service Area
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <span className="text-amber-800 font-black">
                      Select delivery address on map
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(true)}
                className="px-3 py-1 text-xs font-black bg-neutral-900 hover:bg-indigo-600 text-white rounded-lg border border-neutral-700 transition-colors flex-shrink-0 cursor-pointer shadow-xs"
              >
                {hasLocation ? "Change" : "Select"}
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-5 divide-y divide-neutral-100">
              {cartItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400 mb-4">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-neutral-800 text-base">Your cart is empty</h3>
                  <p className="text-xs text-neutral-500 mt-1 max-w-xs">
                    Looks like you haven&apos;t added any products to your cart yet.
                  </p>
                  <button
                    onClick={closeCart}
                    className="mt-5 px-5 py-2.5 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-sm"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div key={item._id} className="py-4 flex gap-4 items-center">
                    {/* Thumbnail */}
                    <img
                      src={item.imageUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&auto=format&fit=crop&q=60"}
                      alt={item.title}
                      className="w-16 h-16 object-cover rounded-xl border border-neutral-200 bg-neutral-50 flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&auto=format&fit=crop&q=60";
                      }}
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-neutral-900 truncate">
                        {item.title}
                      </h4>
                      <span className="text-xs text-neutral-500 block mt-0.5">
                        ₹{item.price} each
                      </span>

                      {/* Quantity Controls & Remove */}
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center border border-neutral-200 rounded-lg overflow-hidden bg-neutral-50">
                          <button
                            onClick={() => updateQuantity(item._id, (item.quantity || 1) - 1)}
                            className="px-2 py-0.5 text-neutral-600 hover:bg-neutral-200 text-xs font-bold"
                          >
                            -
                          </button>
                          <span className="px-2.5 py-0.5 text-xs font-semibold text-neutral-800">
                            {item.quantity || 1}
                          </span>
                          <button
                            onClick={() => updateQuantity(item._id, (item.quantity || 1) + 1)}
                            className="px-2 py-0.5 text-neutral-600 hover:bg-neutral-200 text-xs font-bold"
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() => removeFromCart(item._id)}
                          className="text-xs text-rose-600 hover:text-rose-700 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* Item Total */}
                    <div className="text-right">
                      <span className="font-bold text-sm text-neutral-900">
                        ₹{((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Drawer Footer with Serviceability Warnings & Checkout */}
            {cartItems.length > 0 && (
              <div className="p-5 border-t border-neutral-200 bg-neutral-50/50 space-y-4">
                {/* Minimum order warning */}
                {hasLocation && isServiceable && !isMinOrderMet && (
                  <div className="p-3.5 bg-amber-950 border-2 border-amber-400 rounded-xl text-xs text-amber-100 flex items-center gap-2.5 shadow-md font-bold">
                    <span className="text-base">⚠️</span>
                    <span>
                      Minimum order for <strong className="text-white underline">{zoneName}</strong> is ₹{minOrderAmount}. Add ₹{minOrderRemaining.toFixed(2)} more.
                    </span>
                  </div>
                )}

                {/* Outside service area alert */}
                {hasLocation && !isServiceable && (
                  <div className="p-3.5 bg-rose-950 border-2 border-rose-400 rounded-xl text-xs text-rose-100 flex items-center gap-2.5 shadow-md font-bold">
                    <span className="text-base">🚫</span>
                    <span>
                      Delivery unavailable for current address. Please choose another location.
                    </span>
                  </div>
                )}

                {/* Pricing breakdown */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-neutral-600">
                    <span>Subtotal</span>
                    <span className="font-semibold text-neutral-900">₹{cartSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600 text-xs">
                    <span>
                      Delivery Charge {isServiceable ? `(${zoneName})` : ""}
                    </span>
                    <span className="font-medium text-neutral-900">
                      {hasLocation
                        ? isServiceable
                          ? deliveryCharge === 0
                            ? "FREE"
                            : `₹${deliveryCharge.toFixed(2)}`
                          : "—"
                        : "Calculated at location"}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-neutral-950 pt-2 border-t border-neutral-200">
                    <span>Total Amount</span>
                    <span className="text-indigo-600">
                      ₹{finalTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Checkout Button - Gated by Login */}
                {!customerUser ? (
                  <div className="space-y-1.5">
                    <button
                      onClick={() => {
                        closeCart();
                        window.location.href = "/login?redirect=/";
                      }}
                      className="w-full py-4 px-5 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-500 hover:from-amber-500 hover:to-orange-500 text-white rounded-2xl text-sm font-black shadow-xl shadow-amber-600/30 border-2 border-amber-400/40 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>🔒</span>
                      <span>Sign In to Place Order (₹{finalTotal.toFixed(2)})</span>
                    </button>
                    <p className="text-[11px] text-amber-700 text-center font-bold">
                      Customer sign in or sign up required to place orders
                    </p>
                  </div>
                ) : (
                  <button
                    disabled={isCheckingOut || (hasLocation && (!isServiceable || !isMinOrderMet))}
                    onClick={handleCheckout}
                    className="w-full py-4 px-5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl text-sm font-black shadow-xl shadow-indigo-600/30 border-2 border-indigo-400/40 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isCheckingOut ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Verifying & Connecting...</span>
                      </>
                    ) : !hasLocation ? (
                      <>
                        <span>📍 Select Location to Checkout</span>
                      </>
                    ) : !isServiceable ? (
                      <>
                        <span>Location Outside Delivery Area</span>
                      </>
                    ) : !isMinOrderMet ? (
                      <>
                        <span>Min Order ₹{minOrderAmount} Not Met</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>Checkout (₹{finalTotal.toFixed(2)})</span>
                      </>
                    )}
                  </button>
                )}

                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <button
                    onClick={clearCart}
                    className="hover:text-rose-600 transition-colors"
                  >
                    Clear Cart
                  </button>
                  <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                    <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                    </svg>
                    <span>Geo-Verified Delivery</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Location Selector Modal */}
      <DeliveryLocationSelector
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />
    </>
  );
}
