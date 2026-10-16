"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";

export default function AdminRefundsPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState("refund_requested"); // "all" | "refund_requested" | "refunded"
  const [searchTerm, setSearchTerm] = useState("");
  const [processingOrderId, setProcessingOrderId] = useState(null);
  const [notification, setNotification] = useState({ text: "", type: "" });

  // 1. Auth Guard (Verify admin token)
  useEffect(() => {
    const encryptedToken = localStorage.getItem("token");
    if (!encryptedToken) {
      router.push("/admin/login");
    } else {
      try {
        const token = atob(encryptedToken);
        if (token) {
          setAuthLoading(false);
          fetchRefundOrders();
        } else {
          router.push("/admin/login");
        }
      } catch {
        router.push("/admin/login");
      }
    }
  }, [router]);

  // 2. Fetch all orders and refund status
  async function fetchRefundOrders() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/refunds");
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
        // If there are no pending requests, default tab to "all"
        const pendingCount = (data.orders || []).filter(
          (o) => o.status === "refund_requested"
        ).length;
        if (pendingCount === 0) {
          setFilterTab("all");
        }
      }
    } catch (err) {
      console.error("Error fetching refund orders:", err);
      showNotification("Failed to load orders", "error");
    } finally {
      setLoading(false);
    }
  }

  function showNotification(text, type = "success") {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification({ text: "", type: "" });
    }, 4000);
  }

  // 3. Process Stripe Refund
  async function handleRefundPayment(orderId, action = "approve") {
    const isApprove = action === "approve";
    const confirmPrompt = isApprove
      ? "Are you sure you want to refund this order payment via Stripe?"
      : "Are you sure you want to decline this refund request?";

    if (!window.confirm(confirmPrompt)) return;

    setProcessingOrderId(orderId);

    try {
      const res = await fetch("/api/admin/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action }),
      });

      const data = await res.json();

      if (data.success) {
        showNotification(data.message, "success");
        // Update local order state
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? data.order : o))
        );
      } else {
        showNotification(data.message || "Failed to process refund", "error");
      }
    } catch (err) {
      showNotification("Error: " + err.message, "error");
    } finally {
      setProcessingOrderId(null);
    }
  }

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesTab =
        filterTab === "all" ? true : order.status === filterTab;

      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        order.orderNumber?.toLowerCase().includes(q) ||
        order.customerEmail?.toLowerCase().includes(q) ||
        order.customerName?.toLowerCase().includes(q) ||
        order.refundReason?.toLowerCase().includes(q);

      return matchesTab && matchesSearch;
    });
  }, [orders, filterTab, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === "refund_requested").length;
    const refunded = orders.filter((o) => o.status === "refunded").length;
    return { total, pending, refunded };
  }, [orders]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-zinc-950">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Toast Notification */}
      {notification.text && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all ${
            notification.type === "success"
              ? "bg-emerald-500 text-white border-emerald-600"
              : "bg-rose-500 text-white border-rose-600"
          }`}
        >
          {notification.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <span>💸</span> Customer Refund Requests & Stripe Refunds
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
            Review customer complaints about incorrect products and issue refunds directly through Stripe.
          </p>
        </div>

        <button
          onClick={fetchRefundOrders}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-xs font-semibold text-gray-700 dark:text-zinc-200 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition"
        >
          <span>🔄</span> Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-xs">
          <span className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
            Pending Refund Requests
          </span>
          <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">
            {stats.pending}
          </p>
          <span className="text-xs text-gray-400 mt-1 block">Awaiting admin review</span>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-xs">
          <span className="text-xs text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider">
            Refunded via Stripe
          </span>
          <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">
            {stats.refunded}
          </p>
          <span className="text-xs text-gray-400 mt-1 block">Successfully returned</span>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-xs">
          <span className="text-xs text-gray-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
            Total Orders
          </span>
          <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">
            {stats.total}
          </p>
          <span className="text-xs text-gray-400 mt-1 block">All registered purchases</span>
        </div>
      </div>

      {/* Filter Tabs and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-gray-200 dark:border-zinc-800">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setFilterTab("refund_requested")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              filterTab === "refund_requested"
                ? "bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300"
                : "text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
            }`}
          >
            <span>⏳</span>
            <span>Pending Requests</span>
            {stats.pending > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                {stats.pending}
              </span>
            )}
          </button>

          <button
            onClick={() => setFilterTab("refunded")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              filterTab === "refunded"
                ? "bg-purple-100 text-purple-900 dark:bg-purple-950/70 dark:text-purple-300"
                : "text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
            }`}
          >
            <span>💸</span>
            <span>Refunded</span>
          </button>

          <button
            onClick={() => setFilterTab("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              filterTab === "all"
                ? "bg-indigo-100 text-indigo-900 dark:bg-indigo-950/70 dark:text-indigo-300"
                : "text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
            }`}
          >
            All Orders
          </button>
        </div>

        <input
          type="text"
          placeholder="Search by order #, email, or reason..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-72 px-3 py-1.5 text-xs bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-3 text-xs text-gray-400">Loading orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 space-y-2">
          <span className="text-3xl">🎉</span>
          <p className="text-sm font-semibold text-gray-800 dark:text-zinc-200">
            No orders match the current filter
          </p>
          <p className="text-xs text-gray-400">
            {filterTab === "refund_requested"
              ? "There are no pending refund requests from customers!"
              : "Try switching tabs or adjusting search filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isProcessing = processingOrderId === order._id;
            const isRefundRequested = order.status === "refund_requested";
            const isRefunded = order.status === "refunded";

            return (
              <div
                key={order._id}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-xs"
              >
                {/* Order Top Bar */}
                <div className="p-4 sm:p-5 bg-gray-50/70 dark:bg-zinc-800/40 border-b border-gray-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <span className="text-gray-400 dark:text-zinc-500 block">Order</span>
                      <span className="font-mono font-bold text-gray-900 dark:text-white text-sm">
                        {order.orderNumber}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 dark:text-zinc-500 block">Customer</span>
                      <span className="font-semibold text-gray-800 dark:text-zinc-200">
                        {order.customerName} ({order.customerEmail})
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 dark:text-zinc-500 block">Amount</span>
                      <span className="font-bold text-gray-900 dark:text-white text-sm">
                        ₹{order.totalAmount?.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 dark:text-zinc-500 block">Date</span>
                      <span className="text-gray-600 dark:text-zinc-400">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {order.status === "paid" && (
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 font-semibold rounded-full text-xs">
                        Paid
                      </span>
                    )}
                    {isRefundRequested && (
                      <span className="px-3 py-1 bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-400 font-bold rounded-full text-xs flex items-center gap-1 animate-pulse">
                        <span>⚠️</span> Action Required: Refund Requested
                      </span>
                    )}
                    {isRefunded && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-900 dark:bg-purple-950/60 dark:text-purple-300 font-bold rounded-full text-xs flex items-center gap-1">
                        <span>✓</span> Refunded via Stripe
                      </span>
                    )}
                    {order.status === "refund_rejected" && (
                      <span className="px-3 py-1 bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 font-medium rounded-full text-xs">
                        Refund Request Declined
                      </span>
                    )}
                  </div>
                </div>

                {/* Items & Customer Refund Reason */}
                <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Order Products */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-2">
                      Purchased Items
                    </h4>
                    <div className="space-y-2">
                      {order.items &&
                        order.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs py-1 border-b border-gray-100 dark:border-zinc-800/60 last:border-0"
                          >
                            <span className="text-gray-800 dark:text-zinc-300 font-medium">
                              {item.title} &times; {item.quantity}
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              ₹{((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Customer Reason / Stripe Info */}
                  <div className="bg-gray-50 dark:bg-zinc-800/40 p-3.5 rounded-xl border border-gray-100 dark:border-zinc-800 text-xs space-y-2">
                    {isRefundRequested || isRefunded || order.refundReason ? (
                      <>
                        <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-1 text-xs">
                          <span>📝</span> Customer Complaint / Refund Reason:
                        </h4>
                        <div className="text-amber-800 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200 dark:border-amber-900/40">
                          {order.refundReason || "Product is not correct"}
                        </div>
                        {order.refundNotes && (
                          <p className="text-gray-600 dark:text-zinc-400 italic">
                            &quot;{order.refundNotes}&quot;
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-400 dark:text-zinc-500">
                        No customer refund complaint filed for this order.
                      </p>
                    )}

                    {order.refundStripeId && (
                      <div className="pt-2 border-t border-gray-200 dark:border-zinc-700 text-purple-700 dark:text-purple-400 font-mono text-[11px]">
                        Stripe Refund ID: <strong>{order.refundStripeId}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Footer for Admin */}
                {isRefundRequested && (
                  <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border-t border-amber-200 dark:border-amber-900/40 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs text-amber-900 dark:text-amber-300">
                      <strong>Customer is requesting a refund:</strong> Approve to return ₹
                      {order.totalAmount?.toFixed(2)} directly through Stripe.
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        disabled={isProcessing}
                        onClick={() => handleRefundPayment(order._id, "reject")}
                        className="px-3.5 py-2 text-xs font-semibold text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-xl transition cursor-pointer disabled:opacity-50"
                      >
                        Decline
                      </button>

                      <button
                        disabled={isProcessing}
                        onClick={() => handleRefundPayment(order._id, "approve")}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Processing Stripe Refund...</span>
                          </>
                        ) : (
                          <>
                            <span>💳</span>
                            <span>Approve & Refund via Stripe (₹{order.totalAmount?.toFixed(2)})</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
