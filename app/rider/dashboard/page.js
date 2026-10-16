"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RiderDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rider, setRider] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [isAdminView, setIsAdminView] = useState(false);
  const [allFleetRiders, setAllFleetRiders] = useState([]);
  const [dutyStatus, setDutyStatus] = useState("available");
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [otpInput, setOtpInput] = useState("");
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [wsStatus, setWsStatus] = useState("Connecting...");
  const [progressRatio, setProgressRatio] = useState(0);
  const [simulatingDrive, setSimulatingDrive] = useState(false);

  const socketRef = useRef(null);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const driveIntervalRef = useRef(null);

  // 1. Initial Authentication & Load Rider Profile
  const loadRiderData = useCallback(async (targetRiderId = null) => {
    try {
      const riderToken = localStorage.getItem("rider_token");
      const adminToken = localStorage.getItem("token");

      if (!riderToken && !adminToken) {
        router.push("/rider/login");
        return;
      }

      let queryParam = "";
      if (adminToken) {
        setIsAdminView(true);
        // Load fleet list for admin switching
        fetch("/api/admin/riders")
          .then((r) => r.json())
          .then((d) => {
            if (d.success && d.riders) setAllFleetRiders(d.riders);
          })
          .catch(() => {});
      }

      const activeId = targetRiderId || (localStorage.getItem("rider_info") ? JSON.parse(localStorage.getItem("rider_info"))?.riderId : "RIDER-001");
      if (activeId) {
        queryParam = `?riderId=${activeId}`;
      }

      const headers = {};
      if (riderToken) headers["Authorization"] = `Bearer ${riderToken}`;

      const res = await fetch(`/api/rider/me${queryParam}`, { headers });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (!adminToken) {
          router.push("/rider/login");
          return;
        }
      }

      if (data.rider) {
        setRider(data.rider);
        setDutyStatus(data.rider.status || "available");
        setActiveOrder(data.activeOrder);
      }

      // Fetch pending orders and assigned orders
      if (data.rider?.riderId) {
        const ordersRes = await fetch(`/api/rider/orders?riderId=${data.rider.riderId}`);
        const ordersData = await ordersRes.json();
        if (ordersData.success) {
          setAvailableOrders(ordersData.availableOrders || []);
          if (ordersData.myActiveOrder) {
            setActiveOrder(ordersData.myActiveOrder);
          }
        }
      }
    } catch (err) {
      console.error("Error loading rider dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadRiderData();
  }, [loadRiderData]);

  // 2. WebSocket Connection for live broadcast
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "wss://echo.websocket.org";
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => setWsStatus("Connected");
    socket.onclose = () => setWsStatus("Disconnected");
    socket.onerror = () => setWsStatus("Error");

    return () => {
      socket.close();
      if (driveIntervalRef.current) clearInterval(driveIntervalRef.current);
    };
  }, []);

  // 3. Leaflet Map setup for active order delivery
  useEffect(() => {
    if (!activeOrder || !mapContainerRef.current) return;

    const destLat = Number(activeOrder?.deliveryAddress?.coordinates?.lat) || 30.7046;
    const destLng = Number(activeOrder?.deliveryAddress?.coordinates?.lng) || 76.7179;
    const storeLat = destLat + 0.012;
    const storeLng = destLng - 0.014;

    const loadLeaflet = () => {
      if (!window.L) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);

        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = () => initMap(storeLat, storeLng, destLat, destLng);
        document.head.appendChild(script);
      } else {
        initMap(storeLat, storeLng, destLat, destLng);
      }
    };

    const initMap = (sLat, sLng, dLat, dLng) => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      const map = window.L.map(mapContainerRef.current).setView([sLat, sLng], 14);
      mapInstanceRef.current = map;

      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Store Marker
      const storeIcon = window.L.divIcon({
        className: "custom-store-pin",
        html: `<div style="background:#4f46e5;color:white;width:34px;height:34px;border-radius:12px;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 16px rgba(79,70,229,0.5);border:2px solid white;font-size:16px;">🏬</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      window.L.marker([sLat, sLng], { icon: storeIcon }).addTo(map).bindPopup("<b>NovaStore Hub</b><br/>Pickup Origin");

      // Customer Marker
      const customerIcon = window.L.divIcon({
        className: "custom-customer-pin",
        html: `<div style="background:#10b981;color:white;width:34px;height:34px;border-radius:12px;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 16px rgba(16,185,129,0.5);border:2px solid white;font-size:16px;">📍</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      window.L.marker([dLat, dLng], { icon: customerIcon }).addTo(map).bindPopup(`<b>Destination</b><br/>${activeOrder?.deliveryAddress?.address || "Customer Location"}`);

      // Rider Marker
      const riderIcon = window.L.divIcon({
        className: "custom-rider-pin",
        html: `<div style="background:#f59e0b;color:white;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(245,158,11,0.6);border:3px solid white;font-size:18px;">🛵</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      mapInstanceRef.current._riderMarker = window.L.marker([sLat, sLng], { icon: riderIcon }).addTo(map);

      // Route polyline
      const routePoints = [
        [sLat, sLng],
        [sLat - 0.003, sLng + 0.004],
        [sLat - 0.007, sLng + 0.009],
        [sLat - 0.010, sLng + 0.012],
        [dLat, dLng],
      ];
      window.L.polyline(routePoints, { color: "#4f46e5", weight: 5, opacity: 0.8, dashArray: "8, 8" }).addTo(map);
      mapInstanceRef.current._routePoints = routePoints;

      map.fitBounds(window.L.latLngBounds(routePoints), { padding: [40, 40] });
    };

    loadLeaflet();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [activeOrder]);

  // 4. Toggle Duty Status (Available / Offline)
  const toggleDuty = async () => {
    if (!rider) return;
    const nextStatus = dutyStatus === "offline" ? "available" : "offline";
    try {
      const res = await fetch("/api/rider/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riderId: rider.riderId, status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setDutyStatus(nextStatus);
        setRider({ ...rider, status: nextStatus });
        setMessage({ type: "success", text: `Duty status updated: ${nextStatus.toUpperCase()}` });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to update duty status" });
    }
  };

  // 5. Accept an available order
  const handleAcceptOrder = async (orderNumber) => {
    if (!rider) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/rider/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          riderId: rider.riderId,
          orderNumber,
          action: "accept",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveOrder(data.order);
        setDutyStatus("busy");
        setMessage({ type: "success", text: data.message });
        loadRiderData(rider.riderId);

        // Broadcast to customer & admin via WebSocket
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(
            JSON.stringify({
              type: "TELEMETRY_UPDATE",
              orderNumber,
              step: 2,
              progress: 0,
              eta: 15,
            })
          );
        }
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (e) {
      setMessage({ type: "error", text: e.message || "Failed to accept order" });
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Pickup order from store
  const handlePickupOrder = async () => {
    if (!activeOrder || !rider) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/rider/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          riderId: rider.riderId,
          orderNumber: activeOrder.orderNumber,
          action: "pickup",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveOrder(data.order);
        setMessage({ type: "success", text: data.message });

        // Broadcast Step 3 (Out for Delivery) via WebSocket
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(
            JSON.stringify({
              type: "TELEMETRY_UPDATE",
              orderNumber: activeOrder.orderNumber,
              step: 3,
              progress: 0.1,
              eta: 12,
            })
          );
        }
      }
    } catch (e) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setActionLoading(false);
    }
  };

  // 7. Simulate Live Street Route GPS Drive (Live WebSocket Telemetry)
  const toggleLiveDriveSimulation = () => {
    if (simulatingDrive) {
      if (driveIntervalRef.current) clearInterval(driveIntervalRef.current);
      setSimulatingDrive(false);
      return;
    }

    if (!activeOrder) return;
    setSimulatingDrive(true);
    let ratio = progressRatio;

    driveIntervalRef.current = setInterval(() => {
      ratio = Math.min(1.0, ratio + 0.05);
      setProgressRatio(Number(ratio.toFixed(2)));

      const route = mapInstanceRef.current?._routePoints;
      if (route && mapInstanceRef.current?._riderMarker && window.L) {
        const idx = Math.min(route.length - 1, Math.floor(ratio * (route.length - 1)));
        const coords = route[idx];
        mapInstanceRef.current._riderMarker.setLatLng(coords);
      }

      const eta = Math.max(1, Math.round((1 - ratio) * 12));

      // Live WebSocket telemetry broadcast
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: "TELEMETRY_UPDATE",
            orderNumber: activeOrder.orderNumber,
            step: ratio >= 0.95 ? 4 : 3,
            progress: Number(ratio.toFixed(2)),
            eta: ratio >= 0.95 ? 0 : eta,
          })
        );
      }

      if (ratio >= 1.0) {
        clearInterval(driveIntervalRef.current);
        setSimulatingDrive(false);
        setShowOtpModal(true);
      }
    }, 1500);
  };

  // 8. Deliver order with Customer OTP Verification
  const handleVerifyAndDeliver = async () => {
    if (!activeOrder || !rider) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/rider/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          riderId: rider.riderId,
          orderNumber: activeOrder.orderNumber,
          action: "deliver",
          otp: otpInput,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message });
        setShowOtpModal(false);
        setOtpInput("");
        setActiveOrder(null);
        setProgressRatio(0);
        setDutyStatus("available");

        // Broadcast permanent Delivery Complete frame
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(
            JSON.stringify({
              type: "TELEMETRY_UPDATE",
              orderNumber: activeOrder.orderNumber,
              step: 4,
              progress: 1.0,
              eta: 0,
            })
          );
        }

        loadRiderData(rider.riderId);
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (e) {
      setMessage({ type: "error", text: e.message || "Failed to complete delivery" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("rider_token");
    localStorage.removeItem("rider_info");
    router.push("/rider/login");
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="text-center space-y-3">
          <div className="inline-block h-9 w-9 animate-spin rounded-full border-4 border-emerald-500 border-r-transparent"></div>
          <p className="text-xs text-zinc-400 font-mono tracking-wider uppercase">Connecting to Fleet GPS...</p>
        </div>
      </div>
    );
  }

  const orderPhase =
    activeOrder?.deliveryStatus === "delivered"
      ? 4
      : activeOrder?.deliveryStatus === "out_for_delivery"
      ? 3
      : activeOrder?.deliveryStatus === "assigned"
      ? 2
      : 1;

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-emerald-500 selection:text-black pb-16">
      {/* Top Banner / Admin Impersonation Bar */}
      {isAdminView && (
        <div className="bg-gradient-to-r from-indigo-950 via-purple-950 to-indigo-950 border-b border-indigo-700/60 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-indigo-200 gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-indigo-500 text-white font-bold text-[10px] uppercase tracking-wider">
              Admin Mode
            </span>
            <span>You have full administrative access to this Rider Panel.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-400">Switch Rider:</span>
            <select
              value={rider?.riderId || ""}
              onChange={(e) => loadRiderData(e.target.value)}
              className="bg-zinc-900 border border-indigo-500/60 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
            >
              {allFleetRiders.map((r) => (
                <option key={r.riderId} value={r.riderId}>
                  {r.riderId} • {r.name} ({r.status})
                </option>
              ))}
            </select>
            <Link
              href="/admin/riders"
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition"
            >
              Back to Fleet &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Main Top Navigation Header */}
      <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b-2 border-zinc-800/80 px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-emerald-500/25 border border-emerald-400/40">
            🛵
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-white tracking-tight">{rider?.name}</h1>
              <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-emerald-400 text-[10px] font-mono font-bold border border-zinc-700">
                {rider?.riderId}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 truncate max-w-xs">{rider?.vehicle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Duty Status Switch */}
          <button
            onClick={toggleDuty}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer border ${
              dutyStatus === "available"
                ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/60 hover:bg-emerald-900"
                : dutyStatus === "busy"
                ? "bg-amber-950/80 text-amber-300 border-amber-500/60"
                : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:bg-zinc-800"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                dutyStatus === "available"
                  ? "bg-emerald-400 animate-pulse"
                  : dutyStatus === "busy"
                  ? "bg-amber-400 animate-ping"
                  : "bg-zinc-500"
              }`}
            />
            <span className="uppercase tracking-wider">{dutyStatus}</span>
          </button>

          {/* WebSocket Live Indicator */}
          <span className="hidden sm:inline-flex text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-zinc-900 text-zinc-400 border border-zinc-800 items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${wsStatus === "Connected" ? "bg-emerald-400" : "bg-rose-500"}`} />
            WS: {wsStatus}
          </span>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 cursor-pointer text-sm"
          >
            🚪
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Alerts / Feedback Message */}
        {message && (
          <div
            className={`p-3.5 rounded-2xl text-xs flex items-center justify-between border ${
              message.type === "success"
                ? "bg-emerald-950/80 border-emerald-500/60 text-emerald-200"
                : "bg-rose-950/80 border-rose-500/60 text-rose-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{message.type === "success" ? "✓" : "⚠️"}</span>
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="text-zinc-400 hover:text-white cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* Top Fleet Performance Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Today's Earnings</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">₹{rider?.todayEarnings || 0}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">+₹35 / delivery bonus</p>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Completed Trips</p>
            <p className="text-2xl font-black text-white mt-1">{rider?.totalTrips || 0}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Lifetime Fleet Runs</p>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Customer Rating</p>
            <p className="text-2xl font-black text-amber-400 mt-1 flex items-center gap-1">
              <span>⭐</span> {rider?.rating || 4.9}
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Top Tier Fleet</p>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Assigned Vehicle</p>
            <p className="text-sm font-black text-white mt-1.5 truncate">{rider?.vehicleType || "EV Scooter"}</p>
            <p className="text-[10px] text-zinc-400 truncate mt-0.5">{rider?.vehicle}</p>
          </div>
        </div>

        {/* ACTIVE ORDER DELIVERY DISPATCH CARD */}
        {activeOrder ? (
          <div className="bg-zinc-900/95 border-2 border-emerald-500/50 rounded-3xl overflow-hidden shadow-2xl p-5 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-800 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-950 text-emerald-400 border border-emerald-500/50 uppercase tracking-wider animate-pulse">
                    ● Active Live Delivery
                  </span>
                  <span className="font-mono text-xs text-zinc-400 font-bold">#{activeOrder.orderNumber}</span>
                </div>
                <h2 className="text-lg font-black text-white mt-1.5">
                  Delivering to: {activeOrder.customerName || "Customer"}
                </h2>
                <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                  <span>📍</span> {activeOrder.deliveryAddress?.address || "Address on File"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`tel:${activeOrder.customerPhone || "9876543210"}`}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center gap-1.5 border border-zinc-700 transition"
                >
                  <span>📞</span> Call Customer
                </a>
                <span className="px-3.5 py-2 rounded-xl bg-emerald-950/80 text-emerald-300 font-black text-xs border border-emerald-500/40">
                  ₹{activeOrder.totalAmount?.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Interactive 4-Phase Stepper */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Order Delivery Lifecycle:
              </p>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className={`p-2.5 rounded-xl border ${orderPhase >= 1 ? "bg-emerald-950/80 border-emerald-500 text-white font-black" : "bg-zinc-950 border-zinc-800 text-zinc-500"}`}>
                  1. Assigned
                </div>
                <div className={`p-2.5 rounded-xl border ${orderPhase >= 2 ? "bg-emerald-950/80 border-emerald-500 text-white font-black" : "bg-zinc-950 border-zinc-800 text-zinc-500"}`}>
                  2. Hub Pickup
                </div>
                <div className={`p-2.5 rounded-xl border ${orderPhase >= 3 ? "bg-amber-950/80 border-amber-500 text-amber-300 font-black" : "bg-zinc-950 border-zinc-800 text-zinc-500"}`}>
                  3. Out for Delivery
                </div>
                <div className={`p-2.5 rounded-xl border ${orderPhase >= 4 ? "bg-emerald-950/80 border-emerald-500 text-emerald-300 font-black" : "bg-zinc-950 border-zinc-800 text-zinc-500"}`}>
                  4. Delivered
                </div>
              </div>
            </div>

            {/* Live Leaflet Map Component */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Interactive Live Route & Telemetry:</span>
                <span className="text-emerald-400 font-mono font-bold">
                  {Math.round(progressRatio * 100)}% route completed
                </span>
              </div>
              <div
                ref={mapContainerRef}
                className="w-full h-72 sm:h-80 rounded-2xl overflow-hidden border-2 border-zinc-700 shadow-inner z-10"
              />
            </div>

            {/* Rider Action Controls */}
            <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-zinc-300 space-y-1">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <span>⚡</span> Dispatch Controls
                </p>
                <p className="text-[11px] text-zinc-400">
                  Broadcast live telemetry to customer & admin portals via WebSocket.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                {orderPhase < 3 && (
                  <button
                    onClick={handlePickupOrder}
                    disabled={actionLoading}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-black text-xs text-zinc-950 bg-amber-400 hover:bg-amber-300 shadow-lg shadow-amber-400/20 transition active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    📦 Pick up from Store Hub
                  </button>
                )}

                {orderPhase >= 3 && (
                  <button
                    onClick={toggleLiveDriveSimulation}
                    className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-black text-xs transition active:scale-95 cursor-pointer border ${
                      simulatingDrive
                        ? "bg-rose-950 text-rose-300 border-rose-500 animate-pulse"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400"
                    }`}
                  >
                    {simulatingDrive ? "⏸ Pause GPS Sim" : "🛵 Transmit Live Route GPS"}
                  </button>
                )}

                <button
                  onClick={() => setShowOtpModal(true)}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-black text-xs text-zinc-950 bg-emerald-400 hover:bg-emerald-300 shadow-lg shadow-emerald-400/25 transition active:scale-95 cursor-pointer"
                >
                  ✓ Complete & Verify OTP
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-8 sm:p-12 text-center space-y-3">
            <span className="text-5xl">🛵</span>
            <h3 className="text-lg font-black text-white">No Active Deliveries In Progress</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              You are currently ready for orders. Review the available dispatch queue below to accept incoming orders.
            </p>
          </div>
        )}

        {/* AVAILABLE ORDERS FOR PICKUP QUEUE */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>📦</span> Available Store Orders
              </h3>
              <p className="text-xs text-zinc-400">
                Incoming orders awaiting driver assignment in your delivery zone.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
              {availableOrders.length} Available
            </span>
          </div>

          {availableOrders.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">
              No pending orders in the queue right now. All orders dispatched!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableOrders.map((o) => (
                <div
                  key={o._id}
                  className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 flex flex-col justify-between space-y-3 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">#{o.orderNumber}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950 text-indigo-400 border border-indigo-500/40">
                          {o.deliveryZone?.name || "Standard Zone"}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 font-semibold mt-1">
                        {o.customerName || o.customerEmail}
                      </p>
                      <p className="text-[11px] text-zinc-500 truncate max-w-[280px]">
                        {o.deliveryAddress?.address || "Address on File"}
                      </p>
                    </div>
                    <span className="text-sm font-black text-emerald-400">
                      ₹{o.totalAmount?.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-900">
                    <span className="text-[11px] text-zinc-400">
                      Items: {o.items?.length || 1} • Bonus: ₹35
                    </span>
                    <button
                      onClick={() => handleAcceptOrder(o.orderNumber)}
                      disabled={actionLoading || !!activeOrder}
                      className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition active:scale-95 cursor-pointer disabled:opacity-40"
                    >
                      {activeOrder ? "Finish Active First" : "Accept Delivery →"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* OTP VERIFICATION MODAL */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border-2 border-emerald-500/60 rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-5 shadow-2xl">
            <div className="text-center space-y-1">
              <span className="text-4xl">🔐</span>
              <h3 className="text-lg font-black text-white">Customer Delivery OTP</h3>
              <p className="text-xs text-zinc-400">
                Ask the customer for the 4-digit code displayed on their Live Order Tracker.
              </p>
            </div>

            <div>
              <input
                type="text"
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                placeholder="Enter 4-digit OTP"
                className="w-full text-center tracking-widest text-2xl font-mono font-black py-3 bg-zinc-950 border-2 border-zinc-700 rounded-2xl text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyAndDeliver}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition"
              >
                {actionLoading ? "Verifying..." : "Verify & Handover"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
