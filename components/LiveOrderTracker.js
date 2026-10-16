"use client";

import { useState, useEffect, useRef, useMemo } from "react";

export default function LiveOrderTracker({ order, onClose, onOrderUpdate }) {
  if (!order || !order?.orderNumber) {
    return null;
  }

  return <OrderTrackerView order={order} onClose={onClose} onOrderUpdate={onOrderUpdate} />;
}

function OrderTrackerView({ order, onClose, onOrderUpdate }) {
  const orderNumber = order.orderNumber;
  const customerAddress =
    order?.deliveryAddress?.address || "Phase 7, Sector 61, Mohali, Punjab";
  const destLat = Number(order?.deliveryAddress?.coordinates?.lat) || 30.7046;
  const destLng = Number(order?.deliveryAddress?.coordinates?.lng) || 76.7179;

  // Generate deterministic rider, vehicle, and hub location specific to this order
  const orderMeta = useMemo(() => {
    const seed = orderNumber.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const riders = [
      { name: "Aman Verma", rating: "4.9", trips: "1,420", phone: "+91 98721 04921", vehicle: "Hero Electric Optima • PB65-AK-9201" },
      { name: "Vikram Rathore", rating: "4.8", trips: "890", phone: "+91 98144 55219", vehicle: "Honda Activa 6G • CH01-BX-4482" },
      { name: "Deepak Saini", rating: "4.9", trips: "2,150", phone: "+91 99882 19203", vehicle: "TVS iQube Electric • PB65-ET-1109" },
      { name: "Harpreet Singh", rating: "4.7", trips: "640", phone: "+91 97800 32189", vehicle: "Ather 450X • CH01-EM-8821" },
    ];
    let rider = riders[seed % riders.length];
    if (order?.riderName) {
      rider = {
        name: order.riderName,
        rating: "4.9",
        trips: "1,200+",
        phone: order.riderPhone || rider.phone,
        vehicle: order.riderVehicle || rider.vehicle,
      };
    }

    // Compute hub coords ~2 km from customer (distinct per order)
    const storeLat = destLat + (0.012 + (seed % 4) * 0.002);
    const storeLng = destLng - (0.014 + (seed % 5) * 0.002);

    // Multi-turn realistic street waypoints from Store to Destination
    const waypoints = [
      [storeLat, storeLng],
      [storeLat - 0.002, storeLng + 0.003],
      [storeLat - 0.005, storeLng + 0.004],
      [storeLat - 0.007, storeLng + 0.008],
      [storeLat - 0.008, storeLng + 0.011],
      [storeLat - 0.010, storeLng + 0.013],
      [storeLat - 0.011, storeLng + 0.016],
      [destLat, destLng],
    ];

    return {
      rider,
      storeLat,
      storeLng,
      waypoints,
    };
  }, [orderNumber, destLat, destLng]);

  // Persistent storage key per specific order
  const storageKey = `novastore_tracking_${orderNumber}`;

  // Initial state derived from order deliveryStatus
  const getInitialStep = () => {
    if (order?.deliveryStatus === "delivered") return 4;
    if (order?.deliveryStatus === "out_for_delivery") return 3;
    if (order?.deliveryStatus === "assigned") return 2;
    return 1;
  };

  const [currentStep, setCurrentStep] = useState(getInitialStep);
  const [progressRatio, setProgressRatio] = useState(order?.deliveryStatus === "delivered" ? 1.0 : 0);
  const [etaMinutes, setEtaMinutes] = useState(order?.deliveryStatus === "delivered" ? 0 : 18);
  const [wsStatus, setWsStatus] = useState("Connecting...");
  const [lastTelemetryTime, setLastTelemetryTime] = useState("");
  const [riderCoords, setRiderCoords] = useState(
    order?.deliveryStatus === "delivered"
      ? orderMeta.waypoints[orderMeta.waypoints.length - 1]
      : orderMeta.waypoints[0]
  );

  useEffect(() => {
    const step = getInitialStep();
    setCurrentStep(step);
    if (step === 4) {
      setProgressRatio(1.0);
      setEtaMinutes(0);
      setRiderCoords(orderMeta.waypoints[orderMeta.waypoints.length - 1]);
    } else if (step === 3) {
      setProgressRatio(0.2);
      setEtaMinutes(10);
      setRiderCoords(getCoordinatesAtRatio(0.2, orderMeta.waypoints));
    } else {
      setProgressRatio(0);
      setEtaMinutes(18);
      setRiderCoords(orderMeta.waypoints[0]);
    }
  }, [order?.deliveryStatus, order?.orderNumber]);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [activeCallModal, setActiveCallModal] = useState(false);

  // Dynamic Delivery OTP (SSR-safe initialization to prevent hydration mismatch)
  const [deliveryOtp, setDeliveryOtp] = useState("----");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`novastore_otp_${orderNumber}`);
      if (saved) {
        setDeliveryOtp(saved);
        return;
      }
      const initialOtp = String(Math.floor(1000 + Math.random() * 9000));
      localStorage.setItem(`novastore_otp_${orderNumber}`, initialOtp);
      setDeliveryOtp(initialOtp);
    } catch {
      setDeliveryOtp("8492");
    }
  }, [orderNumber]);

  const regenerateOtp = () => {
    const freshOtp = String(Math.floor(1000 + Math.random() * 9000));
    setDeliveryOtp(freshOtp);
    try {
      localStorage.setItem(`novastore_otp_${orderNumber}`, freshOtp);
    } catch {}

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "OTP_UPDATE",
          orderNumber,
          otp: freshOtp,
        })
      );
    }
  };

  // References
  const socketRef = useRef(null);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const riderMarkerRef = useRef(null);
  const routePolylineRef = useRef(null);
  const stepTicksRef = useRef(0);

  // Delivery Stages (Zomato / Rapido style)
  const steps = [
    {
      id: 1,
      title: "Order Placed",
      statusText: "Store is confirming your items",
      icon: "🧾",
    },
    {
      id: 2,
      title: "Preparing at Store",
      statusText: `${orderMeta.rider.name} is waiting at the store hub`,
      icon: "🍳",
    },
    {
      id: 3,
      title: "Out for Delivery",
      statusText: `${orderMeta.rider.name} is on the way to your address`,
      icon: "🛵",
    },
    {
      id: 4,
      title: "Delivered",
      statusText: "Order handed over successfully",
      icon: "🏡",
    },
  ];

  // Helper: interpolate GPS coordinates along waypoints
  const getCoordinatesAtRatio = (ratio, points) => {
    if (ratio <= 0) return points[0];
    if (ratio >= 1) return points[points.length - 1];

    const totalSegments = points.length - 1;
    const segmentFloat = ratio * totalSegments;
    const segmentIndex = Math.min(Math.floor(segmentFloat), totalSegments - 1);
    const segmentFraction = segmentFloat - segmentIndex;

    const p1 = points[segmentIndex];
    const p2 = points[segmentIndex + 1];

    const lat = p1[0] + (p2[0] - p1[0]) * segmentFraction;
    const lng = p1[1] + (p2[1] - p1[1]) * segmentFraction;
    return [lat, lng];
  };

  // 1. Initialize State per Specific Order (from order.deliveryStatus or localStorage)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const step = parsed.step || 1;
        setCurrentStep(step);
        // During Step 1 & 2 (Preparing), rider is parked at store hub
        if (step <= 2) {
          setProgressRatio(0);
          setEtaMinutes(step === 1 ? 18 : 15);
          setRiderCoords(orderMeta.waypoints[0]);
        } else {
          setProgressRatio(parsed.progress || 0);
          setEtaMinutes(parsed.eta ?? 12);
          if (parsed.coords) {
            setRiderCoords(parsed.coords);
          }
        }
        return;
      }
    } catch {}

    // Fallback: If order has explicit delivered status in DB
    if (order?.deliveryStatus === "delivered" || order?.status === "refunded") {
      setCurrentStep(4);
      setProgressRatio(1);
      setEtaMinutes(0);
      setRiderCoords(orderMeta.waypoints[orderMeta.waypoints.length - 1]);
    } else {
      // Fresh new order in transit
      setCurrentStep(1);
      setProgressRatio(0);
      setEtaMinutes(18);
      setRiderCoords(orderMeta.waypoints[0]);
    }
  }, [storageKey, order?.deliveryStatus, order?.status, orderMeta.waypoints]);

  // 2. Load Leaflet CDN Assets
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
    } else {
      setLeafletLoaded(true);
    }
  }, []);

  // 3. Mount Leaflet Map
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current || !window.L) return;

    if (!mapInstanceRef.current) {
      const map = window.L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
      }).setView([destLat, destLng], 14);

      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      // Store Marker
      const storeIcon = window.L.divIcon({
        className: "custom-store-pin",
        html: `<div style="background:#0f172a;color:#fff;border-radius:12px;padding:4px 8px;display:flex;align-items:center;gap:4px;box-shadow:0 4px 12px rgba(0,0,0,0.3);border:2px solid #fff;font-size:12px;font-weight:bold;white-space:nowrap;">🏪 Store Hub</div>`,
        iconSize: [95, 30],
        iconAnchor: [47, 15],
      });
      window.L.marker([orderMeta.storeLat, orderMeta.storeLng], { icon: storeIcon })
        .addTo(map)
        .bindPopup("<b>NovaStore Fulfillment Hub</b><br/>Order Packed & Dispatched here");

      // Customer Destination Marker
      const destIcon = window.L.divIcon({
        className: "custom-dest-pin",
        html: `<div style="background:#e11d48;color:#fff;border-radius:12px;padding:4px 8px;display:flex;align-items:center;gap:4px;box-shadow:0 4px 12px rgba(225,29,72,0.4);border:2px solid #fff;font-size:12px;font-weight:bold;white-space:nowrap;">📍 Your Address</div>`,
        iconSize: [110, 30],
        iconAnchor: [55, 15],
      });
      window.L.marker([destLat, destLng], { icon: destIcon })
        .addTo(map)
        .bindPopup(`<b>Delivery Address</b><br/>${customerAddress}`);

      // Rider Marker with Pulsating Radar Ring
      const riderIcon = window.L.divIcon({
        className: "custom-rider-pin",
        html: `
          <div style="position:relative;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;width:44px;height:44px;border-radius:50%;background:rgba(16,185,129,0.35);animation:ping 1.8s cubic-bezier(0,0,0.2,1) infinite;"></div>
            <div style="background:#059669;color:#fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(5,150,105,0.6);border:2px solid #fff;font-size:18px;z-index:10;">🛵</div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });
      const initialRider = riderCoords || orderMeta.waypoints[0];
      const riderMarker = window.L.marker(initialRider, { icon: riderIcon })
        .addTo(map)
        .bindPopup(`<b>${orderMeta.rider.name}</b><br/>${orderMeta.rider.vehicle}`);
      riderMarkerRef.current = riderMarker;

      // Planned Road Polyline
      const routePolyline = window.L.polyline(orderMeta.waypoints, {
        color: "#059669",
        weight: 5,
        opacity: 0.8,
        dashArray: "8, 8",
      }).addTo(map);
      routePolylineRef.current = routePolyline;

      map.fitBounds(routePolyline.getBounds(), { padding: [50, 50] });
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [leafletLoaded, destLat, destLng, orderMeta, customerAddress]);

  // Update Rider Position on the Leaflet Map
  useEffect(() => {
    if (riderMarkerRef.current && window.L && riderCoords) {
      riderMarkerRef.current.setLatLng(riderCoords);
    }
  }, [riderCoords]);

  // 4. WebSocket Client Connection
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "wss://echo.websocket.org";
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setWsStatus("Connected");
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.orderNumber === orderNumber) {
          if (payload.type === "OTP_UPDATE" && payload.otp) {
            setDeliveryOtp(payload.otp);
          }
          if (payload.type === "TELEMETRY_UPDATE") {
            setCurrentStep(payload.step);
            if (payload.step <= 2) {
              // During step 1 & 2 (Preparing), rider is stationary at store hub
              setProgressRatio(0);
              setRiderCoords(orderMeta.waypoints[0]);
            } else {
              setProgressRatio(payload.progress);
              if (payload.coords) {
                setRiderCoords(payload.coords);
              }
            }
            setEtaMinutes(payload.eta);
            if (payload.otp) setDeliveryOtp(payload.otp);
            setLastTelemetryTime(new Date().toLocaleTimeString());

            // Persist progress specifically for this order
            try {
              localStorage.setItem(
                storageKey,
                JSON.stringify({
                  step: payload.step,
                  progress: payload.step <= 2 ? 0 : payload.progress,
                  eta: payload.eta,
                  coords: payload.step <= 2 ? orderMeta.waypoints[0] : payload.coords,
                })
              );
            } catch {}
          }
        }
      } catch {
        setLastTelemetryTime(new Date().toLocaleTimeString());
      }
    };

    socket.onclose = () => setWsStatus("Disconnected");
    socket.onerror = () => setWsStatus("Error");

    return () => {
      socket.close();
    };
  }, [orderNumber, storageKey, orderMeta.waypoints]);

  // 5. Realistic, Gradual Telemetry Progression
  // Rider stays stationary at store hub in steps 1 & 2 (Preparing)
  // Rider MOVES ONLY in step 3 (Out for Delivery)
  useEffect(() => {
    // If already delivered, stay delivered permanently
    if (currentStep === 4) return;

    const tickMs = 3000; // Telemetry frame every 3s
    const timer = setInterval(() => {
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;

      let nextStep = currentStep;
      let nextRatio = progressRatio;
      let nextEta = etaMinutes;
      let currentCoords = orderMeta.waypoints[0];

      // Realistic increment speed
      const increment = 0.015;

      if (currentStep === 1) {
        // Step 1: Order Placed - Rider is at Store Hub, stationary
        nextRatio = 0;
        currentCoords = orderMeta.waypoints[0];
        stepTicksRef.current += 1;
        if (stepTicksRef.current >= 4) {
          nextStep = 2;
          nextEta = 15;
          stepTicksRef.current = 0;
        }
      } else if (currentStep === 2) {
        // Step 2: Preparing at Store - Rider is WAITING at Store Hub, DOES NOT MOVE
        nextRatio = 0;
        currentCoords = orderMeta.waypoints[0];
        stepTicksRef.current += 1;
        if (stepTicksRef.current >= 6) {
          nextStep = 3;
          nextEta = 12;
          stepTicksRef.current = 0;
        }
      } else if (currentStep === 3) {
        // Step 3: Out for Delivery - RIDER MOVES ALONG STREET WAYPOINTS
        nextRatio = Math.min(1.0, nextRatio + increment);
        currentCoords = getCoordinatesAtRatio(nextRatio, orderMeta.waypoints);
        const remainingFraction = 1.0 - nextRatio;
        nextEta = Math.max(1, Math.round(remainingFraction * 12));

        if (nextRatio >= 0.99) {
          nextStep = 4;
          nextEta = 0;
          nextRatio = 1.0;
          currentCoords = orderMeta.waypoints[orderMeta.waypoints.length - 1];
        }
      } else if (currentStep === 4) {
        nextRatio = 1.0;
        nextEta = 0;
        currentCoords = orderMeta.waypoints[orderMeta.waypoints.length - 1];
      }

      const payload = {
        type: "TELEMETRY_UPDATE",
        orderNumber,
        step: nextStep,
        progress: Number(nextRatio.toFixed(3)),
        eta: nextEta,
        coords: currentCoords,
      };

      // Broadcast through WebSocket (echo server delivers frame to socket.onmessage)
      socketRef.current.send(JSON.stringify(payload));
    }, tickMs);

    return () => clearInterval(timer);
  }, [currentStep, progressRatio, etaMinutes, orderNumber, orderMeta.waypoints]);


  // Overall display progress for top progress bar (Zomato/Swiggy style)
  const overallProgress = useMemo(() => {
    if (currentStep === 1) return 15;
    if (currentStep === 2) return 35;
    if (currentStep === 3) return Math.min(95, 35 + Math.round(progressRatio * 60));
    return 100;
  }, [currentStep, progressRatio]);

  return (
    <div className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-xl space-y-0">
      {/* 1. Zomato/Rapido Style Hero Status Bar */}
      <div className="p-6 bg-gradient-to-r from-emerald-950 via-neutral-900 to-emerald-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold bg-white/10 px-2.5 py-0.5 rounded-full border border-white/20">
              #{orderNumber}
            </span>
            <span className="text-xs text-emerald-300 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Delivery GPS
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black mt-1.5 tracking-tight flex items-center gap-3">
            {currentStep === 4 ? (
              <span className="text-emerald-400 flex items-center gap-2">
                Order Delivered! 🏡
              </span>
            ) : (
              <span>
                Arriving in{" "}
                <span className="text-emerald-400 underline decoration-emerald-500/50">
                  {etaMinutes} mins
                </span>
              </span>
            )}
          </h2>

          <p className="text-xs text-neutral-300 mt-1 max-w-md">
            {steps.find((s) => s.id === currentStep)?.statusText}
          </p>
        </div>

        {/* Real-Time Controls & Telemetry Badge */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-rose-600/90 hover:bg-rose-600 text-white font-bold rounded-xl border border-rose-400/50 shadow-md transition flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
              title="Close Live Tracking"
            >
              <span className="font-mono text-sm">✕</span> Close Tracking
            </button>
          )}

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold border ${
              wsStatus === "Connected"
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : "bg-amber-500/20 text-amber-300 border-amber-500/40"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                wsStatus === "Connected" ? "bg-emerald-400 animate-ping" : "bg-amber-400"
              }`}
            />
            Socket: {wsStatus}
          </span>

          <span className="text-[11px] text-emerald-300/80 font-medium bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
            ● Live Tracking Active
          </span>
        </div>
      </div>

      {/* 2. Zomato-Style Progress Bar */}
      <div className="w-full bg-neutral-100 h-2">
        <div
          className="bg-emerald-500 h-full transition-all duration-1000 ease-out"
          style={{ width: `${overallProgress}%` }}
        />
      </div>

      {/* 3. Interactive Leaflet Map View */}
      <div className="relative w-full h-80 sm:h-96 bg-neutral-100">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Floating Rider Contact Card (Rapido / Zomato style) */}
        <div className="absolute top-4 left-4 z-[400] max-w-xs bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-neutral-200 text-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center text-2xl shadow-inner">
                🛵
              </div>
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-neutral-900 truncate">
                  {orderMeta.rider.name}
                </span>
                <span className="bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded text-[10px]">
                  ★ {orderMeta.rider.rating}
                </span>
              </div>
              <div className="text-[11px] text-neutral-500 truncate mt-0.5">
                {orderMeta.rider.vehicle}
              </div>
              <div className="text-[10px] text-neutral-400">
                {orderMeta.rider.trips} verified deliveries
              </div>
            </div>
          </div>

          {/* Action Buttons: Call & OTP */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-100">
            <button
              onClick={() => setActiveCallModal(true)}
              className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-center transition flex items-center justify-center gap-1"
            >
              <span>📞</span> Call Rider
            </button>
            <div className="bg-neutral-100 px-3 py-1.5 rounded-xl text-neutral-800 font-mono font-bold text-center flex flex-col items-center justify-center">
              <span className="text-[9px] text-neutral-400 block font-sans uppercase leading-none mb-0.5">
                Delivery OTP
              </span>
              <div className="flex items-center gap-1.5">
                <span suppressHydrationWarning className="tracking-wider text-xs font-black text-neutral-900">
                  {currentStep === 4 ? "VERIFIED ✓" : deliveryOtp}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Delivery Stepper Timeline */}
      <div className="p-6 bg-white space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {steps.map((st) => {
            const isCompleted = currentStep > st.id;
            const isCurrent = currentStep === st.id;

            return (
              <div
                key={st.id}
                className={`p-3.5 rounded-2xl border text-center transition relative ${
                  isCurrent
                    ? "bg-emerald-50 border-emerald-400 shadow-sm"
                    : isCompleted
                    ? "bg-neutral-50 border-emerald-200 text-neutral-800"
                    : "bg-neutral-50/60 border-neutral-200 text-neutral-400 opacity-70"
                }`}
              >
                <div className="text-2xl mb-1.5">{st.icon}</div>
                <div
                  className={`text-xs font-bold ${
                    isCurrent
                      ? "text-emerald-900"
                      : isCompleted
                      ? "text-neutral-900"
                      : "text-neutral-400"
                  }`}
                >
                  {st.title}
                </div>
                <div className="text-[10px] mt-1 line-clamp-2 text-neutral-500">
                  {st.statusText}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Status Telemetry & Destination bar */}
        <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-600">
          <div className="flex items-center gap-2">
            <span className="text-rose-600 font-bold">📍 Destination:</span>
            <span className="font-semibold text-neutral-900">{customerAddress}</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-neutral-500 font-mono">
            {lastTelemetryTime && (
              <span>Last WS Ping: {lastTelemetryTime}</span>
            )}
            <span>GPS Lat: {riderCoords?.[0]?.toFixed(4)}, Lng: {riderCoords?.[1]?.toFixed(4)}</span>
          </div>
        </div>
      </div>

      {/* Call Rider Simulated Modal */}
      {activeCallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center text-3xl">
              📞
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-900">
                Calling {orderMeta.rider.name}
              </h3>
              <p className="text-xs text-neutral-500 mt-1 font-mono">
                {orderMeta.rider.phone}
              </p>
              <p className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100 mt-3">
                &quot;Namaste! I am on my way with your NovaStore package. Arriving in approximately {etaMinutes} minutes. Please keep OTP {deliveryOtp} ready.&quot;
              </p>
            </div>
            <button
              onClick={() => setActiveCallModal(false)}
              className="w-full py-2.5 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition"
            >
              End Call
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
