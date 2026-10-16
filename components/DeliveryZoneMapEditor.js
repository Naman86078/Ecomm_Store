"use client";

import { useEffect, useRef, useState } from "react";
import {
  validateGeoJSONPolygon,
  calculatePolygonCenter,
  POPULAR_LOCATIONS,
} from "@/lib/geoUtils";

export default function DeliveryZoneMapEditor({
  initialCoordinates = [],
  onChangeCoordinates,
  allZones = [],
  activeColor = "#4f46e5",
  center = { lat: 30.7102, lng: 76.6936 },
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const currentPolygonLayerRef = useRef(null);
  const markersGroupRef = useRef(null);
  const allZonesGroupRef = useRef(null);
  const testMarkerRef = useRef(null);

  const [points, setPoints] = useState([]); // array of [lat, lng]
  const [isLeafletReady, setIsLeafletReady] = useState(false);
  const [testPinResult, setTestPinResult] = useState(null);

  // Search Bar State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [searchStatus, setSearchStatus] = useState("");

  // Refs to prevent circular update loop between parent formData and internal points state
  const lastReportedCoordsRef = useRef("");
  const prevInitialCoordsStrRef = useRef("");
  const prevAllZonesStrRef = useRef("");

  // 1. Load Leaflet CDN script & styles safely
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

  // 2. Parse initial coordinates if editing an existing zone
  useEffect(() => {
    const coordsStr = JSON.stringify(initialCoordinates || []);
    // Prevent re-parsing if this coordinate update was emitted by this component itself
    if (
      coordsStr === prevInitialCoordsStrRef.current ||
      coordsStr === lastReportedCoordsRef.current
    ) {
      return;
    }
    prevInitialCoordsStrRef.current = coordsStr;

    if (
      initialCoordinates &&
      Array.isArray(initialCoordinates) &&
      initialCoordinates.length > 0 &&
      Array.isArray(initialCoordinates[0])
    ) {
      // GeoJSON is [lng, lat], convert to Leaflet [lat, lng]
      const ring = initialCoordinates[0];
      const leafletPoints = ring.map(([lng, lat]) => [lat, lng]);
      // Remove trailing closure point for UI editing points array
      if (
        leafletPoints.length > 3 &&
        leafletPoints[0][0] === leafletPoints[leafletPoints.length - 1][0] &&
        leafletPoints[0][1] === leafletPoints[leafletPoints.length - 1][1]
      ) {
        setPoints(leafletPoints.slice(0, -1));
      } else {
        setPoints(leafletPoints);
      }
    } else {
      setPoints([]);
    }
  }, [initialCoordinates]);

  // 3. Initialize Leaflet map
  useEffect(() => {
    if (!isLeafletReady || !mapContainerRef.current) return;
    const L = window.L;
    if (!L) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([center.lat, center.lng], 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      allZonesGroupRef.current = L.layerGroup().addTo(map);
      currentPolygonLayerRef.current = L.layerGroup().addTo(map);
      markersGroupRef.current = L.layerGroup().addTo(map);

      // Map click handler to add new polygon boundary vertex
      map.on("click", (e) => {
        const { lat, lng } = e.latlng;
        setPoints((prev) => [...prev, [lat, lng]]);
      });

      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.invalidateSize();
    }
  }, [isLeafletReady]);

  // 4. Render all other existing delivery zones as background reference polygons
  useEffect(() => {
    if (!mapInstanceRef.current || !allZonesGroupRef.current || !window.L) return;
    const L = window.L;

    const allZonesFingerprint = JSON.stringify(
      (allZones || []).map((z) => ({
        id: z._id,
        color: z.color,
        coords: z.boundary?.coordinates,
      }))
    );

    if (allZonesFingerprint === prevAllZonesStrRef.current) return;
    prevAllZonesStrRef.current = allZonesFingerprint;

    allZonesGroupRef.current.clearLayers();

    allZones.forEach((zone) => {
      if (zone.boundary?.coordinates?.[0]) {
        const ring = zone.boundary.coordinates[0];
        const leafletCoords = ring.map(([lng, lat]) => [lat, lng]);

        const poly = L.polygon(leafletCoords, {
          color: zone.color || "#6b7280",
          fillColor: zone.color || "#6b7280",
          fillOpacity: 0.12,
          weight: 1.5,
          dashArray: "4, 4",
        });

        poly.bindTooltip(
          `<strong>${zone.name}</strong><br/>Fee: ₹${zone.deliveryCharge} • Est: ${zone.estimatedDeliveryTime}`,
          { sticky: true }
        );

        poly.addTo(allZonesGroupRef.current);
      }
    });
  }, [allZones, isLeafletReady]);

  // 5. Render current editable polygon & draggable vertices
  useEffect(() => {
    if (
      !mapInstanceRef.current ||
      !currentPolygonLayerRef.current ||
      !markersGroupRef.current ||
      !window.L
    )
      return;

    const L = window.L;
    currentPolygonLayerRef.current.clearLayers();
    markersGroupRef.current.clearLayers();

    if (points.length >= 3) {
      // Draw closed polygon shape with overpowered vibrant styling
      const poly = L.polygon(points, {
        color: activeColor,
        fillColor: activeColor,
        fillOpacity: 0.38,
        weight: 4,
      });
      poly.addTo(currentPolygonLayerRef.current);
    } else if (points.length === 2) {
      // Draw connecting line while drawing
      const line = L.polyline(points, {
        color: activeColor,
        weight: 4,
        dashArray: "6, 6",
      });
      line.addTo(currentPolygonLayerRef.current);
    }

    // Add high-visibility draggable vertex markers for fine-tuning corners
    points.forEach((pt, index) => {
      const marker = L.circleMarker(pt, {
        radius: 8,
        color: "#ffffff",
        fillColor: activeColor,
        fillOpacity: 1,
        weight: 3,
      }).addTo(markersGroupRef.current);

      marker.bindTooltip(`Corner #${index + 1}`, { permanent: false, direction: "top" });
    });

    // Notify parent ONLY when coordinates have actually changed
    let newGeoJSON = [];
    if (points.length >= 3) {
      // GeoJSON requires [lng, lat] and must close by repeating first point
      const geoJsonRing = points.map(([lat, lng]) => [lng, lat]);
      // Append the first point at end to complete ring
      geoJsonRing.push([points[0][1], points[0][0]]);
      newGeoJSON = [geoJsonRing];
    }

    const newGeoJSONStr = JSON.stringify(newGeoJSON);
    if (newGeoJSONStr !== lastReportedCoordsRef.current) {
      lastReportedCoordsRef.current = newGeoJSONStr;
      if (onChangeCoordinates) {
        onChangeCoordinates(newGeoJSON);
      }
    }
  }, [points, activeColor]);


  // Action helpers
  const handleUndoPoint = () => {
    setPoints((prev) => prev.slice(0, -1));
  };

  const handleClearPoints = () => {
    setPoints([]);
  };

  // Quick preset helper to generate a regular polygon around current map center
  const handleCreatePresetBox = (radiusKm = 2) => {
    if (!mapInstanceRef.current) return;
    const center = mapInstanceRef.current.getCenter();
    const lat = center.lat;
    const lng = center.lng;

    // Approximate offset: 1 deg lat ≈ 111 km, 1 deg lng ≈ 111 * cos(lat) km
    const dLat = radiusKm / 111;
    const dLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

    // 4-corner bounding box
    const box = [
      [lat + dLat, lng - dLng], // NW
      [lat + dLat, lng + dLng], // NE
      [lat - dLat, lng + dLng], // SE
      [lat - dLat, lng - dLng], // SW
    ];
    setPoints(box);
  };

  const handleFlyToLocation = (loc) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([loc.lat, loc.lng], 13);
  };

  // Search Address / Landmark via OpenStreetMap Nominatim
  const handleSearchPlace = async (e) => {
    if (e) {
      if (typeof e.preventDefault === "function") e.preventDefault();
      if (typeof e.stopPropagation === "function") e.stopPropagation();
    }
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setSearchStatus("Searching location...");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=5`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setSearchResults(data);
        setSearchStatus(`Found ${data.length} match(es). Select one or hit enter.`);
        // Pan to top match automatically
        const top = data[0];
        const lat = parseFloat(top.lat);
        const lng = parseFloat(top.lon);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 14);
        }
      } else {
        setSearchResults([]);
        setSearchStatus("No matching places found. Try another term.");
      }
    } catch (err) {
      console.error("Search failed:", err);
      setSearchStatus("Search failed. Check your network connection.");
    } finally {
      setIsSearching(false);
    }
  };

  // Select a search autocomplete result
  const handleSelectPlace = (item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 14);
    }
    const shortName = item.display_name.split(",").slice(0, 3).join(", ");
    setSearchQuery(shortName);
    setSearchResults([]);
    setSearchStatus(`Centered map on: ${shortName}`);
  };

  // Center map on user's current GPS location
  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) {
      setSearchStatus("Geolocation not supported by this browser.");
      return;
    }

    setIsLocating(true);
    setSearchStatus("Detecting GPS coordinates...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 14);
        }
        setSearchStatus("Centered on your current GPS location.");
      },
      (err) => {
        setIsLocating(false);
        console.warn("GPS error:", err);
        setSearchStatus("Unable to retrieve GPS coordinates.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Live Serviceability Test Pin dropped on map
  const handleDropTestPin = () => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const center = mapInstanceRef.current.getCenter();

    if (testMarkerRef.current) {
      testMarkerRef.current.remove();
    }

    const testMarker = L.marker([center.lat, center.lng], {
      draggable: true,
      title: "Drag to test serviceability",
    }).addTo(mapInstanceRef.current);

    const testLocation = async (lat, lng) => {
      try {
        const res = await fetch(
          `/api/delivery-zones/check-serviceability?lat=${lat}&lng=${lng}`
        );
        const data = await res.json();
        setTestPinResult(data);
        testMarker
          .bindPopup(
            data.serviceable
              ? `<strong>✅ Deliverable!</strong><br/>Zone: ${data.zone?.name}<br/>Fee: ₹${data.deliveryCharge}`
              : `<strong>❌ Not Serviceable</strong><br/>No delivery zone covers this point.`
          )
          .openPopup();
      } catch (err) {
        console.error("Test pin check failed:", err);
      }
    };

    testMarker.on("dragend", () => {
      const pos = testMarker.getLatLng();
      testLocation(pos.lat, pos.lng);
    });

    testMarkerRef.current = testMarker;
    testLocation(center.lat, center.lng);
  };

  const validationResult =
    points.length >= 3
      ? validateGeoJSONPolygon([
          [...points.map(([lat, lng]) => [lng, lat]), [points[0][1], points[0][0]]],
        ])
      : { valid: false, message: `Need at least ${3 - points.length} more corner point(s).` };

  return (
    <div className="space-y-3">
      {/* Top Map Toolbar - Overpowered Vivid High Contrast */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-zinc-950 rounded-2xl border-2 border-indigo-400 shadow-2xl shadow-indigo-950/60 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-900 px-3.5 py-2 rounded-xl border-2 border-zinc-600 shadow-sm">
            <span className="font-black text-white uppercase tracking-wider text-xs">
              Vertices:
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-indigo-600 text-white font-black text-xs border border-indigo-300 shadow-md">
              {points.length}
            </span>
          </div>

          <span
            className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg ${
              validationResult.valid
                ? "bg-emerald-400 text-black border-2 border-emerald-200 shadow-emerald-400/40"
                : "bg-amber-400 text-black border-2 border-amber-200 shadow-amber-400/40"
            }`}
          >
            {validationResult.valid ? "✓ Valid Closed Polygon" : `⚠️ ${validationResult.message}`}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleUndoPoint}
            disabled={points.length === 0}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-black border-2 border-zinc-500 hover:border-zinc-300 rounded-xl transition-all disabled:opacity-40 shadow-md cursor-pointer active:scale-95"
          >
            ↩ Undo Point
          </button>
          <button
            type="button"
            onClick={handleClearPoints}
            disabled={points.length === 0}
            className="px-4 py-2 bg-rose-700 hover:bg-rose-600 text-white font-black border-2 border-rose-400 rounded-xl transition-all disabled:opacity-40 shadow-md shadow-rose-900/50 cursor-pointer active:scale-95"
          >
            ✕ Clear
          </button>
          <button
            type="button"
            onClick={() => handleCreatePresetBox(3)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black border-2 border-indigo-300 rounded-xl shadow-xl shadow-indigo-600/50 transition-all cursor-pointer active:scale-95"
          >
            ✨ Auto 3km Box
          </button>
          <button
            type="button"
            onClick={handleDropTestPin}
            className="px-4 py-2 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black font-black border-2 border-amber-200 rounded-xl shadow-xl shadow-amber-400/50 transition-all cursor-pointer active:scale-95"
          >
            📍 Test Pin
          </button>
        </div>
      </div>

      {/* Preset Location Centering - Overpowered High-Contrast Neon Badges */}
      <div className="flex items-center gap-2 overflow-x-auto p-3 bg-zinc-950 rounded-2xl border-2 border-indigo-500/60 text-xs shadow-lg">
        <span className="font-black text-amber-300 uppercase tracking-wider text-xs whitespace-nowrap pl-1">
          ⚡ Fly To City:
        </span>
        {POPULAR_LOCATIONS.slice(0, 6).map((loc, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleFlyToLocation(loc)}
            className="whitespace-nowrap px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-indigo-600 text-white font-black border-2 border-zinc-500 hover:border-indigo-300 shadow-md transition-all cursor-pointer text-xs active:scale-95"
          >
            {loc.name.split(",")[0]}
          </button>
        ))}
      </div>

      {/* Location Search Bar to Pan/Center Map for Drawing Boundaries */}
      <div className="relative bg-zinc-950 p-3 sm:p-4 rounded-2xl border-2 border-indigo-400 shadow-xl shadow-indigo-950/50">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
          <div className="flex-1 flex items-center gap-2 relative">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-400 pointer-events-none">
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSearchPlace(e);
                  }
                }}
                placeholder="Search area, landmark, sector, or city to pan map..."
                className="w-full pl-10 pr-9 py-2.5 text-xs font-bold bg-zinc-900 text-white placeholder-zinc-400 rounded-xl border-2 border-zinc-700 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 focus:outline-hidden transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSearchQuery("");
                    setSearchResults([]);
                    setSearchStatus("");
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleSearchPlace}
              disabled={isSearching}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/40 border-2 border-indigo-300 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isSearching ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <span>Search</span>
                </>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleUseCurrentGps();
            }}
            disabled={isLocating}
            className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-indigo-300 font-black text-xs rounded-xl border-2 border-indigo-500/50 hover:border-indigo-400 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <span className="text-sm">📍</span>
            <span>{isLocating ? "Locating..." : "My GPS"}</span>
          </button>
        </div>

        {/* Autocomplete Suggestions Dropdown */}
        {searchResults.length > 0 && (
          <div className="mt-2.5 bg-zinc-900 border-2 border-indigo-500 rounded-xl p-1.5 shadow-2xl max-h-48 overflow-y-auto space-y-1">
            {searchResults.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectPlace(item);
                }}
                className="w-full text-left p-2.5 hover:bg-indigo-600/30 text-xs font-bold text-zinc-100 rounded-lg truncate transition-colors flex items-center gap-2 border border-transparent hover:border-indigo-400/50 cursor-pointer"
              >
                <span className="text-indigo-400 shrink-0">📍</span>
                <span className="truncate">{item.display_name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Status Notification */}
        {searchStatus && (
          <div className="mt-2 text-[11px] font-bold text-indigo-300 flex items-center gap-1.5 pl-1">
            <span>ℹ️</span>
            <span>{searchStatus}</span>
          </div>
        )}
      </div>

      {/* Leaflet Map Display with High-Visibility Overlay */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-zinc-600 bg-zinc-900 h-80 sm:h-96 shadow-2xl">
        <div ref={mapContainerRef} className="w-full h-full z-0" />
        <div className="absolute bottom-3 left-3 z-[400] bg-black/95 px-4 py-2.5 rounded-xl text-xs font-black text-white border-2 border-indigo-400 shadow-2xl pointer-events-none flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-md shadow-emerald-400 animate-pulse" />
          <span className="text-white drop-shadow-md">Click map to add boundary corners. 3+ points form closed delivery polygon.</span>
        </div>
      </div>

      {/* Test Pin Status Output with Overpowered Contrast */}
      {testPinResult && (
        <div
          className={`p-4 rounded-2xl border-2 text-xs flex items-center justify-between shadow-2xl ${
            testPinResult.serviceable
              ? "bg-emerald-950 border-2 border-emerald-400 text-emerald-100 shadow-emerald-950/60"
              : "bg-rose-950 border-2 border-rose-400 text-rose-100 shadow-rose-950/60"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{testPinResult.serviceable ? "✅" : "❌"}</span>
            <div>
              <span className="font-black text-sm block text-white">
                {testPinResult.serviceable
                  ? `Covered by: ${testPinResult.zone?.name}`
                  : "Outside All Delivery Zones"}
              </span>
              <span className="font-bold text-xs text-zinc-100 mt-0.5 block">
                {testPinResult.serviceable
                  ? `Delivery fee: ₹${testPinResult.deliveryCharge} • SLA: ${testPinResult.estimatedDeliveryTime}`
                  : "No active delivery zone encompasses this coordinate."}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTestPinResult(null)}
            className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-black border-2 border-zinc-500 rounded-xl text-xs cursor-pointer shadow-md"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

