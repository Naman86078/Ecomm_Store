"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { formatDistance } from "@/lib/geoUtils";
import { addToCart, buyNow } from "@/lib/cart";

const RADIUS_OPTIONS = [5, 10, 25, 50];

export default function NearbySearchSection({ onSelectProduct, initialLocation }) {
  // Center location state (Default: initialLocation or Mohali / Chandigarh Tricity)
  const [customerLocation, setCustomerLocation] = useState(() => ({
    lat: initialLocation?.lat ? Number(initialLocation.lat) : 30.710210638829736,
    lng: initialLocation?.lng ? Number(initialLocation.lng) : 76.69360137728076,
    name: initialLocation?.address || "Sector 70, Mohali",
  }));

  const [radius, setRadius] = useState(10); // in kilometers
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [searchLocationQuery, setSearchLocationQuery] = useState("");
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [buyingId, setBuyingId] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const userMarkerRef = useRef(null);
  const radiusCircleRef = useRef(null);
  const productMarkersRef = useRef([]);

  // 1. Dynamically load Leaflet script & CSS
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.L) {
      setLeafletLoaded(true);
      return;
    }

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    if (!document.getElementById("leaflet-js")) {
      const script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = () => setLeafletLoaded(true);
      document.body.appendChild(script);
    }
  }, []);

  // 2. Fetch nearby products from backend API (MongoDB $geoNear)
  const fetchNearbyProducts = useCallback(async (lat, lng, rad) => {
    setLoading(true);
    setStatusMessage("");
    try {
      const res = await fetch(
        `/api/products/nearby?lat=${lat}&lng=${lng}&radius=${rad}`
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        setProducts(data.products);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error("Failed to fetch nearby products:", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when location or radius changes
  useEffect(() => {
    fetchNearbyProducts(customerLocation.lat, customerLocation.lng, radius);
  }, [customerLocation.lat, customerLocation.lng, radius, fetchNearbyProducts]);

  // Sync if initialLocation changes
  useEffect(() => {
    if (initialLocation?.lat && initialLocation?.lng) {
      setCustomerLocation({
        lat: Number(initialLocation.lat),
        lng: Number(initialLocation.lng),
        name: initialLocation.address || "Selected Location",
      });
    }
  }, [initialLocation]);

  // Reverse geocoding helper (OpenStreetMap Nominatim)
  async function reverseGeocode(lat, lng) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (data && data.display_name) {
        const parts = data.display_name.split(",");
        return parts.slice(0, 3).join(",").trim();
      }
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }

  // 3. Initialize & manage Leaflet Map
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return;
    const L = window.L;
    if (!L) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [customerLocation.lat, customerLocation.lng],
        zoom: radius <= 5 ? 13 : radius <= 10 ? 12 : radius <= 25 ? 11 : 10,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Click on map to set new customer location
      map.on("click", async (e) => {
        const { lat, lng } = e.latlng;
        setStatusMessage("Setting location to clicked spot...");
        const name = await reverseGeocode(lat, lng);
        setCustomerLocation({ lat, lng, name });
        setStatusMessage(`Selected: ${name}`);
      });

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // A. Update or create Customer Location Marker (Radar Pulse Icon)
    const userBeaconIcon = L.divIcon({
      className: "user-beacon-pin",
      html: `
        <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;transform:translate(-50%,-50%);">
          <div style="position:absolute;width:36px;height:36px;border-radius:50%;background:rgba(79, 70, 229, 0.25);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="position:absolute;width:24px;height:24px;border-radius:50%;background:#4f46e5;border:3px solid white;box-shadow:0 0 12px rgba(79,70,229,0.7);display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:bold;">
            👤
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([
        customerLocation.lat,
        customerLocation.lng,
      ]);
    } else {
      userMarkerRef.current = L.marker(
        [customerLocation.lat, customerLocation.lng],
        { icon: userBeaconIcon, zIndexOffset: 1000 }
      )
        .addTo(map)
        .bindTooltip("Your Search Center", { permanent: false, direction: "top" });
    }

    // B. Update or create Radius Circle overlay
    const radiusMeters = radius * 1000;
    if (radiusCircleRef.current) {
      radiusCircleRef.current.setLatLng([
        customerLocation.lat,
        customerLocation.lng,
      ]);
      radiusCircleRef.current.setRadius(radiusMeters);
    } else {
      radiusCircleRef.current = L.circle(
        [customerLocation.lat, customerLocation.lng],
        {
          radius: radiusMeters,
          color: "#4f46e5",
          weight: 2,
          opacity: 0.8,
          dashArray: "6, 8",
          fillColor: "#6366f1",
          fillOpacity: 0.12,
        }
      ).addTo(map);
    }

    // Smoothly fit map to show the radius circle
    try {
      const bounds = radiusCircleRef.current.getBounds();
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
    } catch {
      map.panTo([customerLocation.lat, customerLocation.lng]);
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [leafletLoaded, customerLocation, radius]);

  // 4. Update Product Markers on the map whenever products change
  useEffect(() => {
    if (!leafletLoaded || !mapInstanceRef.current) return;
    const L = window.L;
    if (!L) return;
    const map = mapInstanceRef.current;

    // Clear old product markers
    productMarkersRef.current.forEach((m) => m.remove());
    productMarkersRef.current = [];

    // Add markers for products with coordinates
    products.forEach((prod) => {
      if (
        !prod.location ||
        !Array.isArray(prod.location.coordinates) ||
        prod.location.coordinates.length < 2
      ) {
        return;
      }

      const [pLng, pLat] = prod.location.coordinates;
      const isSelected = activeProduct?._id === prod._id;

      // Custom sleek product pin
      const prodIcon = L.divIcon({
        className: "product-map-pin",
        html: `
          <div style="position:relative;display:flex;align-items:center;justify-content:center;background:${
            isSelected ? "#10b981" : "#4338ca"
          };color:white;padding:4px 8px;border-radius:18px;border:2px solid white;box-shadow:0 4px 14px rgba(0,0,0,0.35);font-size:11px;font-weight:700;white-space:nowrap;transform:translate(-50%,-100%);cursor:pointer;transition:transform 0.2s;">
            <span style="margin-right:3px;">📦</span> ₹${Math.round(prod.price)}
          </div>
        `,
        iconSize: [60, 28],
        iconAnchor: [30, 28],
      });

      const marker = L.marker([pLat, pLng], { icon: prodIcon }).addTo(map);

      // Popup with product preview & purchase action
      const popupHtml = `
        <div style="width:200px;font-family:inherit;padding:2px;">
          ${
            prod.imageUrl
              ? `<img src="${prod.imageUrl}" alt="${prod.title}" style="width:100%;height:100px;object-fit:cover;border-radius:8px;margin-bottom:6px;" />`
              : ""
          }
          <div style="font-weight:bold;font-size:13px;line-height:1.2;color:#0f172a;margin-bottom:4px;">
            ${prod.title}
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
            <span style="font-weight:800;color:#4338ca;font-size:14px;">₹${Number(
              prod.price
            ).toFixed(2)}</span>
            <span style="font-size:10px;padding:2px 6px;border-radius:10px;background:#e0e7ff;color:#3730a3;font-weight:600;">
              ${prod.category || "General"}
            </span>
          </div>
          <div style="font-size:11px;color:#059669;font-weight:600;margin-bottom:6px;">
            📍 ${formatDistance(prod.distanceKm)}
          </div>
          ${
            prod.location?.address
              ? `<div style="font-size:10px;color:#64748b;margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                  ${prod.location.address}
                </div>`
              : ""
          }
          <button id="view-prod-btn-${prod._id}" style="width:100%;padding:6px;background:#4f46e5;color:white;border:none;border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;">
            View Details & Buy
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 220 });

      marker.on("popupopen", () => {
        setActiveProduct(prod);
        setTimeout(() => {
          const btn = document.getElementById(`view-prod-btn-${prod._id}`);
          if (btn) {
            btn.onclick = () => {
              if (onSelectProduct) onSelectProduct(prod);
            };
          }
        }, 50);
      });

      marker.on("click", () => {
        setActiveProduct(prod);
      });

      productMarkersRef.current.push(marker);
    });
  }, [leafletLoaded, products, activeProduct, onSelectProduct]);

  // Handle HTML5 Geolocation (Detect Current Location)
  function handleDetectCurrentLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setDetectingLocation(true);
    setStatusMessage("Detecting your location with GPS...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setDetectingLocation(false);
        const name = await reverseGeocode(lat, lng);
        setCustomerLocation({ lat, lng, name });
        setStatusMessage(`Located near ${name}`);
      },
      (err) => {
        setDetectingLocation(false);
        setStatusMessage("Could not retrieve GPS location: " + err.message);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  // Handle Manual Place Search via Nominatim
  async function handleSearchLocation(e) {
    if (e) e.preventDefault();
    if (!searchLocationQuery.trim()) return;

    setSearchingLocation(true);
    setStatusMessage("Searching address...");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchLocationQuery.trim()
        )}&limit=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const results = await res.json();
      if (results && results.length > 0) {
        const item = results[0];
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        const parts = item.display_name.split(",");
        const shortName = parts.slice(0, 3).join(",").trim();

        setCustomerLocation({
          lat,
          lng,
          name: shortName,
        });
        setStatusMessage(`Search center updated: ${shortName}`);
        setSearchLocationQuery("");
      } else {
        setStatusMessage("Place not found. Try a different city or landmark.");
      }
    } catch {
      setStatusMessage("Search failed. Please check network connection.");
    } finally {
      setSearchingLocation(false);
    }
  }

  // Handle Buy Now
  async function handleBuyNow(e, product) {
    e.stopPropagation();
    try {
      const stored = localStorage.getItem("user");
      if (!stored) {
        alert("Please sign in or create an account before placing an order.");
        window.location.href = "/login?redirect=/";
        return;
      }
    } catch {}

    setBuyingId(product._id);
    try {
      await buyNow(product, 1);
    } finally {
      setBuyingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Search & Location Control Card */}
      <div className="glass-card rounded-3xl p-5 sm:p-7 shadow-lg border border-slate-200/80">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Active location summary */}
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white text-xl shadow-md shadow-indigo-500/30 shrink-0">
              📍
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/60">
                Customer Location Discovery
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                Products Near{" "}
                <span className="text-indigo-600 underline decoration-indigo-300 decoration-wavy">
                  {customerLocation.name.split(",")[0]}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {customerLocation.name} &bull; Coordinates:{" "}
                {customerLocation.lat.toFixed(3)}, {customerLocation.lng.toFixed(3)}
              </p>
            </div>
          </div>

          {/* Action buttons: GPS Detect & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <button
              onClick={handleDetectCurrentLocation}
              disabled={detectingLocation}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-500/25 transition cursor-pointer disabled:opacity-50"
            >
              <span className="text-sm">🎯</span>
              <span>{detectingLocation ? "Detecting GPS..." : "Near My Location"}</span>
            </button>

            <form onSubmit={handleSearchLocation} className="flex gap-1.5">
              <input
                type="text"
                placeholder="Search city or area..."
                value={searchLocationQuery}
                onChange={(e) => setSearchLocationQuery(e.target.value)}
                className="px-3.5 py-2 text-xs rounded-xl bg-slate-100 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 placeholder-slate-400 w-44 sm:w-52"
              />
              <button
                type="submit"
                disabled={searchingLocation}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {searchingLocation ? "..." : "Search"}
              </button>
            </form>
          </div>
        </div>

        {/* Distance Radius Filter and Presets */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Distance Filter Pills */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 shrink-0">
              Filter by Radius:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRadius(r)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    radius === r
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-105"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  Within {r} km
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Status message */}
        {statusMessage && (
          <div className="mt-3 text-xs text-indigo-700 font-semibold flex items-center gap-1.5">
            <span>ℹ️</span>
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Main Interactive Split Layout: Map & Products */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Interactive Leaflet Map (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-lg flex flex-col">
          <div className="p-3.5 sm:p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Interactive Geospatial Discovery Map</span>
            </div>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Click anywhere on map to set new search location
            </span>
          </div>

          {/* Map Canvas */}
          <div className="relative w-full h-[360px] sm:h-[480px] bg-slate-100">
            {!leafletLoaded && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50/90 gap-2">
                <div className="w-8 h-8 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin"></div>
                <span className="text-xs font-medium text-slate-600">
                  Initializing OpenStreetMap tiles...
                </span>
              </div>
            )}
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Map Legend Overlay */}
            <div className="absolute bottom-3 left-3 z-10 bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 shadow-md text-[11px] flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-indigo-600 border-2 border-white inline-block"></span>
                <span className="font-semibold text-slate-700">You</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white inline-block"></span>
                <span className="font-semibold text-slate-700">Store / Product</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500">
                <span>Circle:</span>
                <span className="font-bold text-indigo-600">{radius} km</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Product List within Selected Radius (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Nearby Products</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                {products.length} found
              </span>
            </h3>
            <span className="text-xs text-slate-500">
              Sorted by nearest distance
            </span>
          </div>

          {/* Loading state */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse flex gap-4"
                >
                  <div className="w-20 h-20 bg-slate-200 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                    <div className="h-4 bg-slate-200 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center text-2xl mx-auto shadow-inner">
                🔍
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-800">
                  No products found within {radius} km
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                  There are no verified stores or products within {radius} km of{" "}
                  <strong>{customerLocation.name.split(",")[0]}</strong>. Try
                  expanding your radius or changing your location.
                </p>
              </div>

              {/* Expansion shortcuts */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {radius < 25 && (
                  <button
                    onClick={() => setRadius(25)}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    Expand to 25 km
                  </button>
                )}
                {radius < 50 && (
                  <button
                    onClick={() => setRadius(50)}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    Expand to 50 km
                  </button>
                )}
                <button
                  onClick={() =>
                    setCustomerLocation({
                      lat: 30.710210638829736,
                      lng: 76.69360137728076,
                      name: "Sector 70, Mohali",
                    })
                  }
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Reset to Sector 70, Mohali
                </button>
              </div>
            </div>
          ) : (
            /* Product List Cards */
            <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
              {products.map((prod) => {
                const isSelected = activeProduct?._id === prod._id;
                const isOutOfStock =
                  prod.status === "out_of_stock" ||
                  (prod.quantity !== undefined && prod.quantity <= 0);

                return (
                  <div
                    key={prod._id}
                    onClick={() => {
                      setActiveProduct(prod);
                      if (onSelectProduct) onSelectProduct(prod);
                    }}
                    className={`group bg-white rounded-2xl p-4 border transition-all cursor-pointer flex gap-4 ${
                      isSelected
                        ? "border-indigo-600 ring-2 ring-indigo-500/20 shadow-md"
                        : "border-slate-200/90 hover:border-indigo-300 hover:shadow-md"
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="relative w-24 h-24 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                      <img
                        src={
                          prod.imageUrl ||
                          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&auto=format&fit=crop&q=60"
                        }
                        alt={prod.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&auto=format&fit=crop&q=60";
                        }}
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        {/* Badges: Distance & Category */}
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/50">
                            <span>📍</span>
                            <span>{formatDistance(prod.distanceKm)}</span>
                          </span>

                          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {prod.category || "General"}
                          </span>

                          {isOutOfStock ? (
                            <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                              Out of stock
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              In stock
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-1 group-hover:text-indigo-600 transition-colors">
                          {prod.title}
                        </h4>

                        {/* Location address */}
                        {prod.location?.address && (
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {prod.location.address}
                          </p>
                        )}
                      </div>

                      {/* Price and Action Buttons */}
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-base font-extrabold text-slate-950">
                          ₹{Number(prod.price).toFixed(2)}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(prod, 1);
                            }}
                            disabled={isOutOfStock}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold disabled:opacity-40 transition cursor-pointer"
                          >
                            + Cart
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleBuyNow(e, prod)}
                            disabled={isOutOfStock || buyingId === prod._id}
                            className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs disabled:opacity-40 transition cursor-pointer"
                          >
                            {buyingId === prod._id ? "..." : "Buy Now"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
