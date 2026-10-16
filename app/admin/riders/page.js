"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminRidersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [riders, setRiders] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    busy: 0,
    offline: 0,
    totalTrips: 0,
    todayEarnings: 0,
    totalOrders: 0,
    deliveredOrdersCount: 0,
    activeDeliveriesCount: 0,
    pendingOrdersCount: 0,
  });
  const [unassignedOrders, setUnassignedOrders] = useState([]);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [riderFilter, setRiderFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchRiderData = useCallback(async () => {
    try {
      const encryptedToken = localStorage.getItem("token");
      if (!encryptedToken) {
        router.push("/admin/login");
        return;
      }

      const res = await fetch("/api/admin/riders");
      const data = await res.json();

      if (data.success) {
        setRiders(data.riders || []);
        setOrders(data.orders || []);
        setStats(data.stats || {});
        setUnassignedOrders(data.unassignedOrders || []);
        if (data.unassignedOrders?.length > 0 && !selectedOrderNumber) {
          setSelectedOrderNumber(data.unassignedOrders[0].orderNumber);
        }
      }
    } catch (err) {
      console.error("Error loading riders & orders:", err);
    } finally {
      setLoading(false);
    }
  }, [router, selectedOrderNumber]);

  useEffect(() => {
    fetchRiderData();
  }, [fetchRiderData]);

  // Open Rider Panel as Admin for a specific rider
  const handleOpenRiderPanel = async (riderId) => {
    try {
      const res = await fetch("/api/admin/riders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "impersonate", riderId }),
      });
      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem("rider_token", data.token);
        localStorage.setItem("rider_info", JSON.stringify(data.rider));
        window.open("/rider/dashboard", "_blank");
      }
    } catch {
      window.open(`/rider/dashboard?riderId=${riderId}`, "_blank");
    }
  };

  // Toggle rider status (Available / Offline)
  const handleToggleStatus = async (riderId, currentStatus) => {
    setActionLoading(true);
    try {
      const newStatus = currentStatus === "offline" ? "available" : "offline";
      const res = await fetch("/api/admin/riders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_status", riderId, newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message });
        fetchRiderData();
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Dispatch order to rider
  const handleDispatchOrder = async (targetRiderId, orderNum) => {
    const targetOrder = orderNum || selectedOrderNumber;
    if (!targetOrder) {
      setMessage({ type: "error", text: "Please select an order to dispatch" });
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/riders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign_order",
          riderId: targetRiderId,
          orderNumber: targetOrder,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message });
        fetchRiderData();
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Mark an order as delivered in MongoDB
  const handleMarkDelivered = async (orderNumber) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/riders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_delivered",
          orderNumber,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message });
        fetchRiderData();
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Filter orders for the Master Fleet Orders Table
  const filteredOrders = orders.filter((o) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      o.orderNumber?.toLowerCase().includes(query) ||
      o.customerEmail?.toLowerCase().includes(query) ||
      o.customerName?.toLowerCase().includes(query) ||
      o.riderName?.toLowerCase().includes(query) ||
      o.riderCode?.toLowerCase().includes(query);

    const delStatus = o.deliveryStatus || "pending";
    const matchesStatus =
      orderStatusFilter === "all"
        ? true
        : orderStatusFilter === "delivered"
        ? delStatus === "delivered"
        : orderStatusFilter === "out_for_delivery"
        ? delStatus === "out_for_delivery"
        : orderStatusFilter === "assigned"
        ? delStatus === "assigned"
        : orderStatusFilter === "pending"
        ? delStatus === "pending"
        : true;

    const matchesRider =
      riderFilter === "all" ? true : o.riderCode?.toUpperCase() === riderFilter.toUpperCase();

    return matchesSearch && matchesStatus && matchesRider;
  });

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="text-center space-y-3">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-r-transparent"></div>
          <p className="text-xs text-zinc-400">Loading Fleet Telemetry & Order Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <span>🏍️</span>
            <span>Delivery Fleet & Shared Orders Ledger</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Real-time fleet telemetry, delivery status synchronization, and shared order dispatch records.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/live-orders"
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-bold text-xs flex items-center gap-2 transition"
          >
            <span>🛵 Live Dispatch Center</span>
          </Link>
          <Link
            href="/rider/login"
            target="_blank"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition"
          >
            <span>Open Rider Login Portal &rarr;</span>
          </Link>
        </div>
      </div>

      {/* Feedback Message */}
      {message && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center justify-between border ${
            message.type === "success"
              ? "bg-emerald-950/80 border-emerald-500/60 text-emerald-200"
              : "bg-rose-950/80 border-rose-500/60 text-rose-200"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-zinc-400 hover:text-white cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Fleet & Orders Combined Metrics Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Fleet Riders</p>
          <p className="text-2xl font-black text-white mt-1">{stats.total}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">{stats.available} online / ready</p>
        </div>

        <div className="bg-zinc-900/90 border border-emerald-500/30 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Delivered Orders</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">{stats.deliveredOrdersCount || 0}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Completed & verified</p>
        </div>

        <div className="bg-zinc-900/90 border border-amber-500/30 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">In Transit</p>
          <p className="text-2xl font-black text-amber-400 mt-1">{stats.activeDeliveriesCount || 0}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Active on route</p>
        </div>

        <div className="bg-zinc-900/90 border border-blue-500/30 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Pending Orders</p>
          <p className="text-2xl font-black text-blue-400 mt-1">{stats.pendingOrdersCount || 0}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Awaiting rider</p>
        </div>

        <div className="bg-zinc-900/90 border border-indigo-500/30 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Total Orders</p>
          <p className="text-2xl font-black text-indigo-400 mt-1">{stats.totalOrders || orders.length}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">MongoDB records</p>
        </div>

        <div className="bg-zinc-900/90 border border-teal-500/30 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">Fleet Payouts</p>
          <p className="text-2xl font-black text-teal-400 mt-1">₹{stats.todayEarnings}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Today's earnings</p>
        </div>
      </div>

      {/* Seeded Riders Master Fleet Directory Table */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-white">Active Delivery Fleet Directory</h3>
            <p className="text-xs text-zinc-400">
              Riders with authentication credentials, real-time duty status, and admin direct dashboard access.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="text-[11px] uppercase tracking-wider text-zinc-400 bg-zinc-950/60 border-b border-zinc-800">
              <tr>
                <th className="p-3.5">Rider ID & Name</th>
                <th className="p-3.5">Contact</th>
                <th className="p-3.5">Assigned Vehicle</th>
                <th className="p-3.5">Duty Status</th>
                <th className="p-3.5">Active Order</th>
                <th className="p-3.5">Rating & Trips</th>
                <th className="p-3.5 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {riders.map((r) => {
                const isOnline = r.status === "available";
                const isBusy = r.status === "busy";

                return (
                  <tr key={r.riderId} className="hover:bg-zinc-800/40 transition">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm font-bold text-white">
                          🛵
                        </span>
                        <div>
                          <div className="font-bold text-white text-sm">{r.name}</div>
                          <div className="font-mono text-[11px] text-emerald-400 font-semibold">{r.riderId}</div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="text-zinc-200 font-mono">{r.phone}</div>
                      <div className="text-[10px] text-zinc-500">{r.email || "No email"}</div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-semibold text-white">{r.vehicleType || "Scooter"}</div>
                      <div className="text-[11px] text-zinc-400 truncate max-w-[180px]">{r.vehicle}</div>
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          isOnline
                            ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/50"
                            : isBusy
                            ? "bg-amber-950/80 text-amber-300 border-amber-500/50"
                            : "bg-zinc-950 text-zinc-400 border-zinc-800"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isOnline ? "bg-emerald-400 animate-pulse" : isBusy ? "bg-amber-400 animate-ping" : "bg-zinc-600"
                          }`}
                        />
                        {r.status}
                      </span>
                    </td>

                    <td className="p-3.5">
                      {r.activeOrderNumber ? (
                        <div className="font-mono font-bold text-amber-400 bg-amber-950/50 border border-amber-500/40 px-2 py-0.5 rounded-lg inline-block">
                          #{r.activeOrderNumber}
                        </div>
                      ) : (
                        <span className="text-zinc-500 text-[11px]">None (Idle)</span>
                      )}
                    </td>

                    <td className="p-3.5">
                      <div className="font-bold text-amber-400 flex items-center gap-1">
                        <span>⭐</span> {r.rating || 4.9}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {r.totalTrips || 0} trips • ₹{r.todayEarnings || 0} today
                      </div>
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenRiderPanel(r.riderId)}
                          className="px-3 py-1.5 rounded-xl font-bold text-xs bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-500/50 transition cursor-pointer flex items-center gap-1"
                          title="Open this rider's dashboard as Admin"
                        >
                          <span>Open Panel</span>
                          <span>&rarr;</span>
                        </button>

                        <button
                          onClick={() => handleToggleStatus(r.riderId, r.status)}
                          disabled={actionLoading}
                          className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition cursor-pointer"
                          title={r.status === "offline" ? "Set Available" : "Set Offline"}
                        >
                          {r.status === "offline" ? "🟢" : "⚪"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SHARED ORDERS & DELIVERED ORDERS LEDGER */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <span>📋</span> Fleet Orders & Delivered Orders Ledger
            </h3>
            <p className="text-xs text-zinc-400">
              Unified real-time order delivery status shared with Live Dispatch and Rider Panels.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={riderFilter}
              onChange={(e) => setRiderFilter(e.target.value)}
              className="px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-white focus:outline-none"
            >
              <option value="all">All Fleet Riders</option>
              {riders.map((r) => (
                <option key={r.riderId} value={r.riderId}>
                  {r.name} ({r.riderId})
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Search by #, email, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 max-w-xs"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-b border-zinc-800 pb-3">
          <button
            onClick={() => setOrderStatusFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              orderStatusFilter === "all"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800"
            }`}
          >
            All Orders ({orders.length})
          </button>
          <button
            onClick={() => setOrderStatusFilter("delivered")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              orderStatusFilter === "delivered"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                : "bg-zinc-950 text-emerald-400/80 hover:text-emerald-300 border border-zinc-800"
            }`}
          >
            <span>✅ Delivered Orders</span>
            <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-300 rounded-full text-[10px]">
              {orders.filter((o) => o.deliveryStatus === "delivered").length}
            </span>
          </button>
          <button
            onClick={() => setOrderStatusFilter("out_for_delivery")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              orderStatusFilter === "out_for_delivery"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                : "bg-zinc-950 text-amber-400/80 hover:text-amber-300 border border-zinc-800"
            }`}
          >
            <span>🛵 Out for Delivery</span>
            <span className="px-1.5 py-0.2 bg-amber-950 text-amber-300 rounded-full text-[10px]">
              {orders.filter((o) => o.deliveryStatus === "out_for_delivery").length}
            </span>
          </button>
          <button
            onClick={() => setOrderStatusFilter("assigned")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              orderStatusFilter === "assigned"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "bg-zinc-950 text-blue-400/80 hover:text-blue-300 border border-zinc-800"
            }`}
          >
            <span>📋 Assigned</span>
            <span className="px-1.5 py-0.2 bg-blue-950 text-blue-300 rounded-full text-[10px]">
              {orders.filter((o) => o.deliveryStatus === "assigned").length}
            </span>
          </button>
          <button
            onClick={() => setOrderStatusFilter("pending")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              orderStatusFilter === "pending"
                ? "bg-zinc-700 text-white shadow-md"
                : "bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800"
            }`}
          >
            <span>⏳ Pending Dispatch</span>
            <span className="px-1.5 py-0.2 bg-zinc-800 text-zinc-300 rounded-full text-[10px]">
              {orders.filter((o) => !o.deliveryStatus || o.deliveryStatus === "pending").length}
            </span>
          </button>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="text-[11px] uppercase tracking-wider text-zinc-400 bg-zinc-950/60 border-b border-zinc-800">
              <tr>
                <th className="p-3.5">Order Number</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Assigned Rider</th>
                <th className="p-3.5">Delivery Status</th>
                <th className="p-3.5">Delivery Address</th>
                <th className="p-3.5">Amount</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500">
                    No orders match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const delStatus = o.deliveryStatus || "pending";
                  const isDelivered = delStatus === "delivered";
                  const isOut = delStatus === "out_for_delivery";
                  const isAssigned = delStatus === "assigned";

                  return (
                    <tr key={o._id} className="hover:bg-zinc-800/40 transition">
                      <td className="p-3.5 font-mono font-bold text-white">
                        <div>#{o.orderNumber}</div>
                        {o.deliveredAt && (
                          <div className="text-[10px] text-emerald-400 font-sans">
                            Delivered: {new Date(o.deliveredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5">
                        <div className="font-semibold text-white">{o.customerName || "Customer"}</div>
                        <div className="text-[11px] text-zinc-500">{o.customerEmail}</div>
                      </td>

                      <td className="p-3.5">
                        {o.riderName ? (
                          <div>
                            <span className="font-bold text-white">{o.riderName}</span>
                            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-emerald-400 border border-zinc-700">
                              {o.riderCode}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-zinc-500 text-[11px]">Unassigned</span>
                            <select
                              onChange={(e) => handleDispatchOrder(e.target.value, o.orderNumber)}
                              defaultValue=""
                              className="bg-zinc-950 border border-zinc-700 text-zinc-300 rounded px-1.5 py-0.5 text-[10px] focus:outline-none"
                            >
                              <option value="" disabled>
                                Assign...
                              </option>
                              {riders.map((r) => (
                                <option key={r.riderId} value={r.riderId}>
                                  {r.name} ({r.riderId})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            isDelivered
                              ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/50"
                              : isOut
                              ? "bg-amber-950/80 text-amber-300 border-amber-500/50 animate-pulse"
                              : isAssigned
                              ? "bg-blue-950/80 text-blue-300 border-blue-500/50"
                              : "bg-zinc-950 text-zinc-400 border-zinc-800"
                          }`}
                        >
                          {isDelivered && "✓ "}
                          {isOut && "🛵 "}
                          {isAssigned && "📋 "}
                          {delStatus.replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="p-3.5 truncate max-w-[200px] text-zinc-400">
                        {o.deliveryAddress?.address || "Address on File"}
                      </td>

                      <td className="p-3.5 font-bold text-white">
                        ₹{o.totalAmount?.toFixed(2)}
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isDelivered && (
                            <button
                              onClick={() => handleMarkDelivered(o.orderNumber)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 rounded-lg font-bold text-[11px] bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 transition cursor-pointer"
                              title="Update delivery status to delivered in MongoDB"
                            >
                              ✓ Mark Delivered
                            </button>
                          )}
                          <Link
                            href="/admin/live-orders"
                            className="px-2.5 py-1 rounded-lg font-bold text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
                          >
                            Live Map &rarr;
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
