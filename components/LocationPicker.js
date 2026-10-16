"use client";

import { useEffect, useRef, useState } from "react";
import { POPULAR_LOCATIONS, isValidCoordinate } from "@/lib/geoUtils";

export default function LocationPicker({
  latitude,
  longitude,
  address = "",
  onChange,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [geolocating, setGeolocating] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [statusNote, setStatusNote] = useState("");

  const hasCoordinates =
    latitude !== "" &&
    longitude !== "" &&
    latitude !== null &&
    longitude !== null &&
    latitude !== undefined &&
    longitude !== undefined &&
    !isNaN(Number(latitude)) &&
    !isNaN(Number(longitude));

  const currentLat = hasCoordinates ? Number(latitude) : 30.710210638829736;
  const currentLng = hasCoordinates ? Number(longitude) : 76.69360137728076;

  // 1. Dynamically load Leaflet assets
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
      script.onload = () => {
        setLeafletLoaded(true);
      };
      document.body.appendChild(script);
    }
  }, []);

  // 2. Initialize Leaflet Map
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return;
    const L = window.L;
    if (!L) return;

    // If map already initialized, clean it up before re-creating
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [currentLat, currentLng],
      zoom: hasCoordinates ? 14 : 11,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Custom modern pin icon
    const pinIcon = L.divIcon({
      className: "admin-picker-pin",
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:36px;height:36px;background:linear-gradient(135deg, #4f46e5, #7c3aed);color:white;border-radius:50%;box-shadow:0 6px 16px rgba(79,70,229,0.45);border:3px solid white;transform:translate(-50%,-100%);cursor:grab;">
          <span style="font-size:16px;">📍</span>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });

    // Add marker if coordinates exist
    if (hasCoordinates) {
      const marker = L.marker([currentLat, currentLng], {
        icon: pinIcon,
        draggable: true,
      }).addTo(map);

      marker.on("dragend", async (e) => {
        const { lat, lng } = e.target.getLatLng();
        handleUpdateCoords(lat, lng);
      });

      markerRef.current = marker;
    }

    // Map click: move or create marker
    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const marker = L.marker([lat, lng], {
          icon: pinIcon,
          draggable: true,
        }).addTo(map);

        marker.on("dragend", (ev) => {
          const pos = ev.target.getLatLng();
          handleUpdateCoords(pos.lat, pos.lng);
        });

        markerRef.current = marker;
      }
      handleUpdateCoords(lat, lng);
    });

    // Invalidate size in case rendered inside a modal
    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [leafletLoaded]);

  // Reverse geocoding helper (OpenStreetMap Nominatim)
  async function fetchAddressFromCoords(lat, lng) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            "Accept-Language": "en",
          },
        }
      );
      if (!res.ok) return "";
      const data = await res.json();
      return data.display_name || "";
    } catch {
      return "";
    }
  }

  // Update coordinates handler
  async function handleUpdateCoords(lat, lng, forcedAddress = null) {
    const roundedLat = Math.round(lat * 1000000) / 1000000;
    const roundedLng = Math.round(lng * 1000000) / 1000000;

    let newAddress = forcedAddress ?? address;
    if (forcedAddress === null) {
      setStatusNote("Fetching address name...");
      const reverseName = await fetchAddressFromCoords(roundedLat, roundedLng);
      if (reverseName) {
        // Shorten long address for input field
        const parts = reverseName.split(",");
        newAddress = parts.slice(0, 3).join(",").trim();
      }
      setStatusNote("");
    }

    onChange({
      latitude: roundedLat,
      longitude: roundedLng,
      address: newAddress,
    });
  }

  // Handle Search using Nominatim API
  async function handleSearch(e) {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setStatusNote("Searching place...");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery.trim()
        )}&limit=1`,
        {
          headers: { "Accept-Language": "en" },
        }
      );
      const results = await res.json();
      if (results && results.length > 0) {
        const item = results[0];
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 15);
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else if (window.L) {
            const L = window.L;
            const pinIcon = L.divIcon({
              className: "admin-picker-pin",
              html: `
                <div style="position:relative;display:flex;align-items:center;justify-content:center;width:36px;height:36px;background:linear-gradient(135deg, #4f46e5, #7c3aed);color:white;border-radius:50%;box-shadow:0 6px 16px rgba(79,70,229,0.45);border:3px solid white;transform:translate(-50%,-100%);cursor:grab;">
                  <span style="font-size:16px;">📍</span>
                </div>
              `,
              iconSize: [36, 36],
              iconAnchor: [18, 36],
            });
            const marker = L.marker([lat, lng], {
              icon: pinIcon,
              draggable: true,
            }).addTo(mapInstanceRef.current);
            marker.on("dragend", (ev) => {
              const pos = ev.target.getLatLng();
              handleUpdateCoords(pos.lat, pos.lng);
            });
            markerRef.current = marker;
          }
        }

        const parts = item.display_name.split(",");
        const shortName = parts.slice(0, 3).join(",").trim();
        handleUpdateCoords(lat, lng, shortName);
        setStatusNote(`Selected: ${shortName}`);
      } else {
        setStatusNote("No locations found for this query.");
      }
    } catch {
      setStatusNote("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  // Handle Geolocation (Current Device Location)
  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setGeolocating(true);
    setStatusNote("Locating device...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGeolocating(false);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 15);
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else if (window.L) {
            const L = window.L;
            const pinIcon = L.divIcon({
              className: "admin-picker-pin",
              html: `
                <div style="position:relative;display:flex;align-items:center;justify-content:center;width:36px;height:36px;background:linear-gradient(135deg, #4f46e5, #7c3aed);color:white;border-radius:50%;box-shadow:0 6px 16px rgba(79,70,229,0.45);border:3px solid white;transform:translate(-50%,-100%);cursor:grab;">
                  <span style="font-size:16px;">📍</span>
                </div>
              `,
              iconSize: [36, 36],
              iconAnchor: [18, 36],
            });
            const marker = L.marker([lat, lng], {
              icon: pinIcon,
              draggable: true,
            }).addTo(mapInstanceRef.current);
            marker.on("dragend", (ev) => {
              const p = ev.target.getLatLng();
              handleUpdateCoords(p.lat, p.lng);
            });
            markerRef.current = marker;
          }
        }
        await handleUpdateCoords(lat, lng, "Current Admin Location");
        setStatusNote("Location set to current position.");
      },
      (err) => {
        setGeolocating(false);
        setStatusNote("Could not detect location: " + err.message);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  // Select Preset location
  function handleSelectPreset(preset) {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([preset.lat, preset.lng], 14);
      if (markerRef.current) {
        markerRef.current.setLatLng([preset.lat, preset.lng]);
      } else if (window.L) {
        const L = window.L;
        const pinIcon = L.divIcon({
          className: "admin-picker-pin",
          html: `
            <div style="position:relative;display:flex;align-items:center;justify-content:center;width:36px;height:36px;background:linear-gradient(135deg, #4f46e5, #7c3aed);color:white;border-radius:50%;box-shadow:0 6px 16px rgba(79,70,229,0.45);border:3px solid white;transform:translate(-50%,-100%);cursor:grab;">
              <span style="font-size:16px;">📍</span>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 36],
        });
        const marker = L.marker([preset.lat, preset.lng], {
          icon: pinIcon,
          draggable: true,
        }).addTo(mapInstanceRef.current);
        marker.on("dragend", (ev) => {
          const p = ev.target.getLatLng();
          handleUpdateCoords(p.lat, p.lng);
        });
        markerRef.current = marker;
      }
    }
    handleUpdateCoords(preset.lat, preset.lng, preset.name);
  }

  // Clear location
  function handleClearLocation() {
    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    onChange({
      latitude: "",
      longitude: "",
      address: "",
      removeLocation: true,
    });
    setStatusNote("Location cleared.");
  }

  return (
    <div className="space-y-3 bg-slate-50 dark:bg-zinc-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-700">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200 flex items-center gap-1.5">
          <span>🗺️ Product Geographical Location</span>
          {hasCoordinates ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-300/40">
              Assigned
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-semibold border border-amber-300/40">
              Optional / Online only
            </span>
          )}
        </label>
        {hasCoordinates && (
          <button
            type="button"
            onClick={handleClearLocation}
            className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 font-medium cursor-pointer"
          >
            Remove Location
          </button>
        )}
      </div>

      <p className="text-[11px] text-slate-500 dark:text-zinc-400">
        Click anywhere on the map or drag the pin to set the store or warehouse coordinates. Customers can discover this product using radius searches.
      </p>

      {/* Place search & Use GPS button */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex gap-1">
          <input
            type="text"
            placeholder="Search address, landmark, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
            className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {searching ? "..." : "Search"}
          </button>
        </div>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={geolocating}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-medium text-slate-700 dark:text-zinc-200 shadow-xs cursor-pointer"
        >
          <span>🎯</span>
          <span>{geolocating ? "Locating..." : "Use My GPS"}</span>
        </button>
      </div>

      {/* Preset suggestions */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
        <span className="text-slate-400 shrink-0 font-medium">Quick presets:</span>
        {POPULAR_LOCATIONS.slice(0, 4).map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => handleSelectPreset(p)}
            className="px-2 py-0.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-700 dark:text-zinc-300 hover:border-indigo-400 shrink-0 cursor-pointer"
          >
            {p.name.split(",")[0]}
          </button>
        ))}
      </div>

      {/* Interactive Leaflet Map Container */}
      <div className="relative w-full h-52 sm:h-60 rounded-xl overflow-hidden border border-slate-300 dark:border-zinc-700 shadow-inner">
        {!leafletLoaded && (
          <div className="absolute inset-0 bg-slate-100 dark:bg-zinc-900 flex items-center justify-center text-xs text-slate-500 z-10">
            Loading OpenStreetMap engine...
          </div>
        )}
        <div ref={mapContainerRef} className="w-full h-full z-0" />
      </div>

      {/* Status / Feedback note */}
      {statusNote && (
        <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
          {statusNote}
        </div>
      )}

      {/* Coordinates and Location Name Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-0.5">
            Latitude
          </label>
          <input
            type="number"
            step="any"
            placeholder="e.g. 30.7102"
            value={latitude ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              onChange({
                latitude: val,
                longitude,
                address,
              });
              if (
                val &&
                longitude &&
                isValidCoordinate(val, longitude) &&
                mapInstanceRef.current
              ) {
                mapInstanceRef.current.panTo([Number(val), Number(longitude)]);
                if (markerRef.current) {
                  markerRef.current.setLatLng([Number(val), Number(longitude)]);
                }
              }
            }}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-0.5">
            Longitude
          </label>
          <input
            type="number"
            step="any"
            placeholder="e.g. 76.6936"
            value={longitude ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              onChange({
                latitude,
                longitude: val,
                address,
              });
              if (
                latitude &&
                val &&
                isValidCoordinate(latitude, val) &&
                mapInstanceRef.current
              ) {
                mapInstanceRef.current.panTo([Number(latitude), Number(val)]);
                if (markerRef.current) {
                  markerRef.current.setLatLng([Number(latitude), Number(val)]);
                }
              }
            }}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-0.5">
            Store / Address Name
          </label>
          <input
            type="text"
            placeholder="e.g. Sector 70, Mohali"
            value={address ?? ""}
            onChange={(e) => {
              onChange({
                latitude,
                longitude,
                address: e.target.value,
              });
            }}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
          />
        </div>
      </div>
    </div>
  );
}
