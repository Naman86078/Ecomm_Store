"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import LiveOrderTracker from "@/components/LiveOrderTracker";

export default function AdminLiveOrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [riders, setRiders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      const encryptedToken = localStorage.getItem("token");
      if (!encryptedToken) {
        router.push("/admin/login");
        return;
      }

      // Fetch all store orders for Admin Dispatch
      const res = await fetch("/api/orders?admin=true");
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
        setSelectedOrder((prev) => {
          if (!prev && data.orders.length > 0) return data.orders[0];
          if (prev) {
            const updated = data.orders.find((o) => o.orderNumber === prev.orderNumber);
            return updated || prev;
          }
          return null;
        });
      }

      // Fetch fleet riders for assignment
      const ridersRes = await fetch("/api/admin/riders");
      const ridersData = await ridersRes.json();
      if (ridersData.success && ridersData.riders) {
        setRiders(ridersData.riders);
      }
    } catch (err) {
      console.error("Error loading admin orders:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleOrderUpdated = (updatedOrder) => {
    setOrders((prev) =>
      prev.map((o) => (o.orderNumber === updatedOrder.orderNumber ? { ...o, ...updatedOrder } : o))
    );
    if (selectedOrder?.orderNumber === updatedOrder.orderNumber) {
      setSelectedOrder((prev) => ({ ...prev, ...updatedOrder }));
    }
  };

  const handleQuickAssignRider = async (orderNumber, riderId) => {
    if (!riderId) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/riders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign_order", riderId, orderNumber }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message });
        handleOrderUpdated(data.order);
        fetchOrders();
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickMarkDelivered = async (orderNumber) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/riders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_delivered", orderNumber }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message });
        handleOrderUpdated(data.order);
        fetchOrders();
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Filter orders by search & deliveryStatus
  const filteredOrders = orders.filter((o) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      o.orderNumber?.toLowerCase().includes(query) ||
      o.customerEmail?.toLowerCase().includes(query) ||
      o.customerName?.toLowerCase().includes(query) ||
      o.riderName?.toLowerCase().includes(query) ||
      o.riderCode?.toLowerCase().includes(query) ||
      o.deliveryAddress?.address?.toLowerCase().includes(query);

    const status = o.deliveryStatus || "pending";
    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "delivered"
        ? status === "delivered"
        : statusFilter === "out_for_delivery"
        ? status === "out_for_delivery"
        : statusFilter === "assigned"
        ? status === "assigned"
        : statusFilter === "pending"
        ? status === "pending"
        : true;

    return matchesSearch && matchesStatus;
  });

  const counts = {
    all: orders.length,
    out_for_delivery: orders.filter((o) => o.deliveryStatus === "out_for_delivery").length,
    assigned: orders.filter((o) => o.deliveryStatus === "assigned").length,
    delivered: orders.filter((o) => o.deliveryStatus === "delivered").length,
    pending: orders.filter((o) => !o.deliveryStatus || o.deliveryStatus === "pending").length,
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-zinc-950">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="mt-3 text-sm text-gray-500 dark:text-zinc-400">Loading Dispatch Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2.5">
            <span>🛵</span>
            <span>Live Dispatch & GPS Fleet Control</span>
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
            Monitor real-time rider coordinates, control delivery phases, and sync delivery status directly with the database.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Admin Dispatch Online
          </span>
        </div>
      </div>

      {/* Alerts */}
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

      {/* Selected Order Live Tracker */}
      {selectedOrder ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
            <span>
              Currently Dispatching: <strong className="text-white">#{selectedOrder.orderNumber}</strong> ({selectedOrder.customerName || selectedOrder.customerEmail})
              {selectedOrder.riderName && (
                <span className="ml-2 text-emerald-400 font-semibold">
                  • Assigned to: {selectedOrder.riderName} ({selectedOrder.riderCode})
                </span>
              )}
            </span>
            <span className="text-neutral-500">
              Delivery Status: <strong className="text-white uppercase">{selectedOrder.deliveryStatus || "pending"}</strong>
            </span>
          </div>

          <LiveOrderTracker order={selectedOrder} onOrderUpdate={handleOrderUpdated} />
        </div>
      ) : (
        <div className="bg-zinc-900 border-2 border-zinc-800 rounded-3xl p-12 text-center text-zinc-400 space-y-3">
          <span className="text-4xl">📦</span>
          <h3 className="text-base font-bold text-white">No Customer Orders Available</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Once customer orders are placed, you can monitor their live delivery progress and control rider dispatch here.
          </p>
        </div>
      )}

      {/* Orders Dispatch Queue Table & Shared Fleet Status */}
      {orders.length > 0 && (
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-white">Orders Delivery & Fleet Queue</h3>
              <p className="text-xs text-zinc-400">
                Shared order and delivery status records synchronized with Rider fleet and database.
              </p>
            </div>

            <input
              type="text"
              placeholder="Search by order #, email, rider..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 max-w-xs"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-b border-zinc-800 pb-3">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                statusFilter === "all"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800"
              }`}
            >
              All Orders ({counts.all})
            </button>
            <button
              onClick={() => setStatusFilter("out_for_delivery")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                statusFilter === "out_for_delivery"
                  ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                  : "bg-zinc-950 text-amber-400/80 hover:text-amber-300 border border-zinc-800"
              }`}
            >
              <span>🛵 Out for Delivery</span>
              <span className="px-1.5 py-0.2 bg-amber-950 text-amber-300 rounded-full text-[10px]">
                {counts.out_for_delivery}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter("assigned")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                statusFilter === "assigned"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "bg-zinc-950 text-blue-400/80 hover:text-blue-300 border border-zinc-800"
              }`}
            >
              <span>📋 Assigned</span>
              <span className="px-1.5 py-0.2 bg-blue-950 text-blue-300 rounded-full text-[10px]">
                {counts.assigned}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter("delivered")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                statusFilter === "delivered"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                  : "bg-zinc-950 text-emerald-400/80 hover:text-emerald-300 border border-zinc-800"
              }`}
            >
              <span>✅ Delivered</span>
              <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-300 rounded-full text-[10px]">
                {counts.delivered}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                statusFilter === "pending"
                  ? "bg-zinc-700 text-white shadow-md"
                  : "bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800"
              }`}
            >
              <span>⏳ Pending</span>
              <span className="px-1.5 py-0.2 bg-zinc-800 text-zinc-300 rounded-full text-[10px]">
                {counts.pending}
              </span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="text-[11px] uppercase tracking-wider text-zinc-400 bg-zinc-950/60 border-b border-zinc-800">
                <tr>
                  <th className="p-3.5">Order Number</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Delivery Status</th>
                  <th className="p-3.5">Assigned Rider</th>
                  <th className="p-3.5">Delivery Address</th>
                  <th className="p-3.5">Total Amount</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {filteredOrders.map((o) => {
                  const isSelected = selectedOrder?._id === o._id;
                  const delStatus = o.deliveryStatus || "pending";
                  const isDelivered = delStatus === "delivered";
                  const isOut = delStatus === "out_for_delivery";
                  const isAssigned = delStatus === "assigned";

                  return (
                    <tr
                      key={o._id}
                      className={`transition ${
                        isSelected
                          ? "bg-indigo-950/40 border-l-4 border-indigo-500"
                          : "hover:bg-zinc-800/50"
                      }`}
                    >
                      <td className="p-3.5 font-mono font-bold text-white">
                        <div>#{o.orderNumber}</div>
                        {o.deliveredAt && (
                          <div className="text-[10px] text-emerald-400 font-sans">
                            Delivered: {new Date(o.deliveredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5">
                        <div className="font-semibold text-white truncate max-w-[150px]">
                          {o.customerName || "Customer"}
                        </div>
                        <div className="text-[11px] text-zinc-500 truncate max-w-[150px]">
                          {o.customerEmail}
                        </div>
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
                              onChange={(e) => handleQuickAssignRider(o.orderNumber, e.target.value)}
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

                      <td className="p-3.5 truncate max-w-[180px] text-zinc-400">
                        {o.deliveryAddress?.address || "Address on File"}
                      </td>

                      <td className="p-3.5 font-bold text-white">
                        ₹{o.totalAmount?.toFixed(2)}
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isDelivered && (
                            <button
                              onClick={() => handleQuickMarkDelivered(o.orderNumber)}
                              disabled={actionLoading}
                              className="px-2 py-1 rounded-lg font-bold text-[11px] bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 transition"
                              title="Mark Delivered in MongoDB"
                            >
                              ✓ Deliver
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedOrder(o);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                              isSelected
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/40"
                                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
                            }`}
                          >
                            {isSelected ? "● Dispatching" : "Dispatch & GPS →"}
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
      )}
    </div>
  );
}
