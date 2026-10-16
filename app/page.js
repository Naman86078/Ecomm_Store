"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import ProductModal from "@/components/ProductModal";
import DeliveryLocationSelector from "@/components/DeliveryLocationSelector";
import NearbySearchSection from "@/components/NearbySearchSection";
import { getDeliveryLocation } from "@/lib/cart";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Delivery Location State
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [activeZone, setActiveZone] = useState(null);
  const [isServiceable, setIsServiceable] = useState(true);
  const [hasLoadedLocation, setHasLoadedLocation] = useState(false);
  const [showNearby, setShowNearby] = useState(false);

  // Categories list
  const categories = [
    "all",
    "Electronics",
    "Clothing",
    "Footwear",
    "Accessories",
    "Home & Kitchen",
    "Beauty",
  ];

  // 1. Load initial delivery location from localStorage on mount
  useEffect(() => {
    const loc = getDeliveryLocation();
    setDeliveryLocation(loc);
    if (loc) {
      setIsServiceable(Boolean(loc.serviceable));
      setActiveZone(loc.zone || null);
    }
    setHasLoadedLocation(true);

    const handleLocationUpdate = (e) => {
      const updated = e.detail;
      setDeliveryLocation(updated);
      if (updated) {
        setIsServiceable(Boolean(updated.serviceable));
        setActiveZone(updated.zone || null);
      } else {
        setIsServiceable(true);
        setActiveZone(null);
      }
    };

    const handleHash = () => {
      if (window.location.hash === "#nearby") setShowNearby(true);
    };
    if (typeof window !== "undefined" && window.location.hash === "#nearby") {
      setShowNearby(true);
    }
    window.addEventListener("hashchange", handleHash);

    window.addEventListener("delivery-location-updated", handleLocationUpdate);
    return () => {
      window.removeEventListener("delivery-location-updated", handleLocationUpdate);
      window.removeEventListener("hashchange", handleHash);
    };
  }, []);

  // 2. Fetch products dynamically based on location, category, and search query
  useEffect(() => {
    if (!hasLoadedLocation) return;

    let isSubscribed = true;
    setIsLoading(true);

    const fetchProducts = async () => {
      try {
        let url = "";

        if (deliveryLocation?.lat !== undefined && deliveryLocation?.lng !== undefined) {
          // Location-based product filtering route
          const params = new URLSearchParams({
            lat: deliveryLocation.lat.toString(),
            lng: deliveryLocation.lng.toString(),
            category: selectedCategory,
            search: searchQuery,
          });
          url = `/api/products/serviceable?${params.toString()}`;
        } else {
          // Standard catalog route
          const params = new URLSearchParams({
            category: selectedCategory,
            search: searchQuery,
          });
          url = `/api/products?${params.toString()}`;
        }

        const res = await fetch(url);
        const data = await res.json();

        if (isSubscribed) {
          if (data.success) {
            setProducts(data.products || []);
            if (data.serviceable !== undefined) {
              setIsServiceable(Boolean(data.serviceable));
              setActiveZone(data.zone || null);
            }
          } else {
            setProducts([]);
          }
        }
      } catch (err) {
        console.error("Failed to load products:", err);
        if (isSubscribed) setProducts([]);
      } finally {
        if (isSubscribed) setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchProducts, 250);
    return () => {
      isSubscribed = false;
      clearTimeout(debounceTimer);
    };
  }, [deliveryLocation, selectedCategory, searchQuery, hasLoadedLocation]);

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Top Navigation */}
      <Navbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        categories={categories}
        onToggleNearby={() => setShowNearby((prev) => !prev)}
        isNearbyActive={showNearby}
      />

      {/* Location & Serviceability Banner - Overpowered High Contrast */}
      <section className="bg-white border-b-2 border-neutral-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            {/* Location Status Badge */}
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-md ${
                  deliveryLocation
                    ? isServiceable
                      ? "bg-emerald-500 text-black shadow-emerald-500/30"
                      : "bg-rose-600 text-white shadow-rose-600/30"
                    : "bg-indigo-600 text-white shadow-indigo-600/30"
                }`}
              >
                📍
              </div>

              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-black text-neutral-950">
                    {deliveryLocation ? (
                      deliveryLocation.address || "Selected Location"
                    ) : (
                      "No Delivery Location Selected"
                    )}
                  </span>

                  {deliveryLocation && (
                    <span
                      className={`text-[11px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider shadow-xs ${
                        isServiceable
                          ? "bg-emerald-400 text-black border border-emerald-300"
                          : "bg-rose-600 text-white border border-rose-400"
                      }`}
                    >
                      {isServiceable
                        ? activeZone?.name || "Serviceable"
                        : "Out of Service Area"}
                    </span>
                  )}
                </div>

                <div className="text-xs text-neutral-700 font-bold mt-0.5 flex flex-wrap gap-x-3">
                  {deliveryLocation ? (
                    isServiceable ? (
                      <>
                        <span>
                          Delivery:{" "}
                          <strong className="text-emerald-700 font-black">
                            {activeZone?.deliveryCharge === 0
                              ? "FREE"
                              : `₹${activeZone?.deliveryCharge || 0}`}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          Est. Time:{" "}
                          <strong className="text-indigo-700 font-black">
                            {activeZone?.estimatedDeliveryTime || "30-45 mins"}
                          </strong>
                        </span>
                        {activeZone?.minOrderAmount > 0 && (
                          <>
                            <span>•</span>
                            <span>
                              Min Order: <strong className="text-amber-700 font-black">₹{activeZone.minOrderAmount}</strong>
                            </span>
                          </>
                        )}
                      </>
                    ) : (
                      <span className="text-rose-700 font-black">
                        Sorry, we do not deliver to this location yet. Please choose another address.
                      </span>
                    )
                  ) : (
                    <span className="text-neutral-600 font-semibold">
                      Select your location on the map to see products available for delivery.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Location Actions */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(true)}
                suppressHydrationWarning
                className="px-4 py-2 text-xs font-black bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl shadow-lg shadow-indigo-600/30 border-2 border-indigo-400 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {deliveryLocation ? "Change Location" : "Select Location on Map"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Storefront Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Nearby Discovery Section when toggled via 'Near Me' button */}
        {showNearby && (
          <div className="mb-10 p-6 bg-white border-2 border-indigo-200 rounded-3xl shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div className="flex items-center gap-2.5">
                <span className="w-3.5 h-3.5 rounded-full bg-indigo-600 animate-pulse" />
                <h2 className="text-base font-black text-neutral-900 tracking-wide">
                  📍 Nearby Products & Store Map
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowNearby(false)}
                className="px-3.5 py-1.5 text-xs font-bold text-neutral-700 hover:text-black bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-all cursor-pointer"
              >
                ✕ Close Near Me
              </button>
            </div>
            <NearbySearchSection
              onSelectProduct={(p) => setSelectedProduct(p)}
              initialLocation={deliveryLocation}
            />
          </div>
        )}

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              suppressHydrationWarning
              className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                selectedCategory.toLowerCase() === cat.toLowerCase()
                  ? "bg-neutral-900 text-white shadow-sm"
                  : "bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200"
              }`}
            >
              {cat === "all" ? "All Products" : cat}
            </button>
          ))}
        </div>

        {/* Unserviceable Warning Banner */}
        {deliveryLocation && !isServiceable && (
          <div className="mb-8 p-6 bg-rose-50 border border-rose-200 rounded-3xl text-center space-y-3">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto text-xl font-bold">
              🚫
            </div>
            <h2 className="text-lg font-bold text-rose-900">
              Delivery Not Available at This Location
            </h2>
            <p className="text-xs text-rose-700 max-w-md mx-auto">
              Our delivery network does not currently cover <strong>{deliveryLocation.address || "this area"}</strong>.
              Please choose an address inside our active delivery zones to see deliverable products and place orders.
            </p>
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(true)}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
            >
              Choose Serviceable Address on Map
            </button>
          </div>
        )}

        {/* Product Catalog Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 border border-neutral-200 animate-pulse space-y-4"
              >
                <div className="aspect-square bg-neutral-100 rounded-xl" />
                <div className="h-4 bg-neutral-100 rounded w-3/4" />
                <div className="h-4 bg-neutral-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-neutral-200 p-8 space-y-4">
            <div className="w-16 h-16 bg-neutral-100 text-neutral-400 rounded-full flex items-center justify-center mx-auto text-2xl">
              📦
            </div>
            <h3 className="text-base font-bold text-neutral-900">
              {deliveryLocation && !isServiceable
                ? "No products available for delivery to this location"
                : "No products found"}
            </h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              {deliveryLocation && !isServiceable
                ? "Please update your delivery location on the map to see products available for dispatch."
                : "Try adjusting your search query or selecting a different category."}
            </p>
            {deliveryLocation && !isServiceable && (
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Change Delivery Location
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                onQuickView={(p) => setSelectedProduct(p)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Quick View Product Modal */}
      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      {/* Map-based Location Selector Modal */}
      <DeliveryLocationSelector
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />
    </div>
  );
}
