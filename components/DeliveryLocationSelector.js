"use client";

import { useState, useEffect, useRef } from "react";
import { getDeliveryLocation, saveDeliveryLocation } from "@/lib/cart";
import { isValidCoordinate } from "@/lib/geoUtils";

export default function DeliveryLocationSelector({ isOpen, onClose }) {
  // Current active or selected location
  const [selectedCoords, setSelectedCoords] = useState({
    lat: 30.7102,
    lng: 76.6936,
  });
  const [addressInput, setAddressInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Serviceability status from backend
  const [isCheckingService, setIsCheckingService] = useState(false);
  const [serviceInfo, setServiceInfo] = useState(null);

  // Leaflet map references
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const zonesLayerRef = useRef(null);
  const [isLeafletReady, setIsLeafletReady] = useState(false);

  // Load existing saved location on mount
  useEffect(() => {
    const saved = getDeliveryLocation();
    if (saved && isValidCoordinate(saved.lat, saved.lng)) {
      setSelectedCoords({ lat: Number(saved.lat), lng: Number(saved.lng) });
      setAddressInput(saved.address || "");
      if (saved.serviceInfo) setServiceInfo(saved.serviceInfo);
    }
  }, []);

  // Dynamically load Leaflet script & stylesheet from CDN to avoid Next.js SSR window errors
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    if (!window.L) {
      const script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = () => setIsLeafletReady(true);
      document.body.appendChild(script);
    } else {
      setIsLeafletReady(true);
    }
  }, []);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!isOpen || !isLeafletReady || !mapContainerRef.current) return;
    const L = window.L;
    if (!L) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView(
        [selectedCoords.lat, selectedCoords.lng],
        13
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Marker for customer delivery pin
      const marker = L.marker([selectedCoords.lat, selectedCoords.lng], {
        draggable: true,
      }).addTo(map);

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        handlePositionChange(pos.lat, pos.lng, true);
      });

      // Clicking anywhere on map moves the marker
      map.on("click", (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        handlePositionChange(lat, lng, true);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      // Layer group for rendering existing delivery zone boundaries
      zonesLayerRef.current = L.layerGroup().addTo(map);

      // Fetch all active delivery zones to draw translucent boundary overlays on map
      fetchActiveDeliveryZones(map, zonesLayerRef.current);
    } else {
      mapInstanceRef.current.invalidateSize();
      mapInstanceRef.current.setView([selectedCoords.lat, selectedCoords.lng], 13);
      if (markerRef.current) {
        markerRef.current.setLatLng([selectedCoords.lat, selectedCoords.lng]);
      }
    }
  }, [isOpen, isLeafletReady]);

  // Load and draw delivery zones onto map
  const fetchActiveDeliveryZones = async (map, layerGroup) => {
    try {
      const res = await fetch("/api/delivery-zones?activeOnly=true");
      const data = await res.json();
      if (data.success && Array.isArray(data.zones) && window.L) {
        layerGroup.clearLayers();
        data.zones.forEach((zone) => {
          if (zone.boundary && zone.boundary.coordinates) {
            // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
            const ring = zone.boundary.coordinates[0];
            const leafletCoords = ring.map(([lng, lat]) => [lat, lng]);

            const polygon = window.L.polygon(leafletCoords, {
              color: "#4f46e5",
              fillColor: "#6366f1",
              fillOpacity: 0.18,
              weight: 2,
            });

            polygon.bindTooltip(
              `<strong>${zone.name}</strong><br/>Fee: ₹${zone.deliveryCharge} • Min: ₹${zone.minOrderAmount}`,
              { sticky: true }
            );

            polygon.addTo(layerGroup);
          }
        });
      }
    } catch (err) {
      console.warn("Could not load delivery zones onto map:", err);
    }
  };

  // Check serviceability whenever coordinates change
  const checkServiceability = async (lat, lng) => {
    setIsCheckingService(true);
    try {
      const res = await fetch(
        `/api/delivery-zones/check-serviceability?lat=${lat}&lng=${lng}`
      );
      const data = await res.json();
      setServiceInfo(data);
    } catch (err) {
      console.error("Serviceability check error:", err);
      setServiceInfo({
        success: false,
        serviceable: false,
        message: "Failed to verify location serviceability.",
      });
    } finally {
      setIsCheckingService(false);
    }
  };

  // Reverse geocode to get a readable address
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      if (data && data.display_name) {
        const shortName = data.display_name.split(",").slice(0, 3).join(", ");
        setAddressInput(shortName);
      }
    } catch {
      // Graceful fallback
    }
  };

  const handlePositionChange = (lat, lng, fetchAddress = false) => {
    setSelectedCoords({ lat, lng });
    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      mapInstanceRef.current.panTo([lat, lng]);
    }
    checkServiceability(lat, lng);
    if (fetchAddress) {
      reverseGeocode(lat, lng);
    }
  };

  // Auto-detect GPS Location
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        handlePositionChange(latitude, longitude, true);
      },
      (err) => {
        setIsLocating(false);
        alert("Unable to fetch location: " + err.message);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Location search using Nominatim
  const handleSearchAddress = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=5`
      );
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Address search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Confirm and save location
  const handleConfirmLocation = () => {
    const finalAddress =
      addressInput.trim() ||
      (serviceInfo?.zone?.name ? `${serviceInfo.zone.name} Area` : "Selected Map Location");

    const locationData = {
      address: finalAddress,
      lat: selectedCoords.lat,
      lng: selectedCoords.lng,
      serviceable: serviceInfo?.serviceable ?? false,
      zone: serviceInfo?.zone || null,
      deliveryCharge: serviceInfo?.deliveryCharge ?? 0,
      estimatedDeliveryTime: serviceInfo?.estimatedDeliveryTime ?? "Standard",
      minOrderAmount: serviceInfo?.minOrderAmount ?? 0,
      serviceInfo: serviceInfo,
    };

    saveDeliveryLocation(locationData);
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh] border border-neutral-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/80">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
              <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">📍</span>
              Select Delivery Address
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Pin your location on the map to see available products & delivery charges.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 rounded-xl transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Search bar & GPS button */}
          <div className="flex flex-col sm:flex-row gap-2">
            <form onSubmit={handleSearchAddress} className="flex-1 flex gap-2">
              <input
                type="text"
                placeholder="Search area, landmark, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3.5 py-2.5 text-xs bg-neutral-100 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-2.5 bg-neutral-900 text-white text-xs font-semibold rounded-xl hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                {isSearching ? "Searching..." : "Search"}
              </button>
            </form>

            <button
              type="button"
              onClick={handleDetectGPS}
              disabled={isLocating}
              className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {isLocating ? "Locating..." : "Use My GPS"}
            </button>
          </div>

          {/* Search autocomplete dropdown */}
          {searchResults.length > 0 && (
            <div className="bg-white border border-neutral-200 rounded-xl p-2 shadow-lg max-h-40 overflow-y-auto space-y-1">
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setAddressInput(item.display_name.split(",").slice(0, 3).join(", "));
                    setSearchResults([]);
                    setSearchQuery("");
                    handlePositionChange(parseFloat(item.lat), parseFloat(item.lon), false);
                  }}
                  className="w-full text-left p-2 hover:bg-indigo-50 text-xs text-neutral-800 rounded-lg truncate transition-colors"
                >
                  📍 {item.display_name}
                </button>
              ))}
            </div>
          )}

          {/* Leaflet Map Display */}
          <div className="relative rounded-2xl overflow-hidden border-2 border-neutral-300 bg-neutral-100 h-64 sm:h-72 shadow-inner">
            <div ref={mapContainerRef} className="w-full h-full z-0" />
            <div className="absolute top-2 right-2 z-[400] bg-black/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl text-xs font-black text-white shadow-lg border border-neutral-700 pointer-events-none">
              Drag pin or click map to move
            </div>
          </div>

          {/* Selected Address Input */}
          <div>
            <label className="text-xs font-black text-neutral-900 block mb-1.5">
              Delivery Address / House / Flat / Street:
            </label>
            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="e.g. Flat 402, Green Avenue, Mohali"
              className="w-full px-4 py-2.5 text-xs bg-white text-neutral-900 font-bold border-2 border-neutral-300 rounded-xl focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          {/* Live Serviceability Card with Overpowered High Contrast */}
          <div className="rounded-2xl transition-all">
            {isCheckingService ? (
              <div className="flex items-center gap-3 p-4 bg-neutral-100 rounded-2xl border-2 border-neutral-300 text-neutral-800 text-xs font-bold">
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span>Checking delivery serviceability for this location...</span>
              </div>
            ) : serviceInfo?.serviceable ? (
              <div className="bg-emerald-950 border-2 border-emerald-400 text-emerald-100 rounded-2xl p-4 flex items-start gap-3 shadow-xl">
                <span className="text-2xl">✅</span>
                <div className="flex-1 text-xs">
                  <div className="font-black text-white text-sm">
                    Deliverable in {serviceInfo.zone?.name}!
                  </div>
                  <div className="mt-1.5 text-zinc-100 font-bold flex flex-wrap gap-x-4 gap-y-1">
                    <span>
                      Delivery Charge: <strong className="text-emerald-300">₹{serviceInfo.deliveryCharge}</strong>
                    </span>
                    <span>
                      Est. Time: <strong className="text-cyan-300">{serviceInfo.estimatedDeliveryTime}</strong>
                    </span>
                    {serviceInfo.minOrderAmount > 0 && (
                      <span>
                        Min Order: <strong className="text-amber-300">₹{serviceInfo.minOrderAmount}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-rose-950 border-2 border-rose-400 text-rose-100 rounded-2xl p-4 flex items-start gap-3 shadow-xl">
                <span className="text-2xl">❌</span>
                <div className="text-xs">
                  <div className="font-black text-white text-sm">
                    Outside Service Area
                  </div>
                  <div className="mt-1 text-zinc-100 font-bold">
                    Sorry, we do not deliver to this location yet. Please choose a location within our delivery zones.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t-2 border-neutral-200 bg-neutral-100 flex items-center justify-between gap-3">
          <div className="text-xs text-neutral-800 font-mono font-bold">
            Lat: {selectedCoords.lat.toFixed(4)}, Lng: {selectedCoords.lng.toFixed(4)}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-black text-neutral-700 hover:text-neutral-900 bg-neutral-200 hover:bg-neutral-300 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmLocation}
              disabled={isCheckingService}
              className="px-6 py-2.5 text-xs font-black bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl shadow-lg shadow-indigo-600/40 border-2 border-indigo-400 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
            >
              Confirm Delivery Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
