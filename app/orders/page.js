"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import LiveOrderTracker from "@/components/LiveOrderTracker";

function OrdersContent() {
  const searchParams = useSearchParams();
  const initialOrderNumber = searchParams.get("orderNumber") || "";

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchOrderNumber, setSearchOrderNumber] = useState(initialOrderNumber);
  const [customerUser, setCustomerUser] = useState(null);
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [trackerDismissed, setTrackerDismissed] = useState(false);

  // Refund Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [refundReason, setRefundReason] = useState("Received wrong product");
  const [refundNotes, setRefundNotes] = useState("");
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const u = JSON.parse(stored);
        setCustomerUser(u);
        const email = u.email || "";
        setSearchEmail(email);
        fetchOrders(email, initialOrderNumber);
        return;
      }
    } catch {}

    setCustomerUser(null);
    setOrders([]);
    setTrackingOrder(null);
    setLoading(false);
  }, [initialOrderNumber]);

  async function fetchOrders(email = "", orderNumber = "") {
    if (!email && !orderNumber) {
      setOrders([]);
      setTrackingOrder(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let url = "/api/orders";
      const params = new URLSearchParams();
      if (orderNumber) params.append("orderNumber", orderNumber);
      else if (email) params.append("email", email);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        const orderList = data.orders || [];
        setOrders(orderList);
        if (orderList.length > 0) {
          if (!trackerDismissed) {
            if (initialOrderNumber) {
              const matched = orderList.find((o) => o.orderNumber === initialOrderNumber);
              setTrackingOrder(matched || orderList[0]);
            } else {
              setTrackingOrder(orderList[0]);
            }
          }
        } else {
          setTrackingOrder(null);
        }
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    fetchOrders(searchEmail, searchOrderNumber);
  }

  function openRefundModal(order) {
    setSelectedOrder(order);
    setRefundReason("Received wrong product");
    setRefundNotes("");
    setMessage({ type: "", text: "" });
  }

  function closeRefundModal() {
    setSelectedOrder(null);
    setRefundNotes("");
    setMessage({ type: "", text: "" });
  }

  async function handleRefundSubmit(e) {
    e.preventDefault();
    if (!selectedOrder) return;

    setSubmittingRefund(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/orders/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrder._id,
          refundReason,
          refundNotes,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: "Refund request submitted! Our admin will review and refund via Stripe.",
        });

        // Update local orders list
        setOrders((prev) =>
          prev.map((o) => (o._id === selectedOrder._id ? data.order : o))
        );

        setTimeout(() => {
          closeRefundModal();
        }, 1800);
      } else {
        setMessage({
          type: "error",
          text: data.message || "Failed to submit request.",
        });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: "Error submitting refund: " + err.message,
      });
    } finally {
      setSubmittingRefund(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <Link href="/" className="text-sm font-semibold text-indigo-600 hover:underline">
                &larr; Back to Store
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mt-1">My Orders & Refunds</h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Check your order history and raise a refund request if a product is not correct.
            </p>
          </div>

          {customerUser ? (
            <div className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-900 px-3 py-2 rounded-xl">
              Signed in as: <strong>{customerUser.email}</strong>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-neutral-100 hover:bg-neutral-200 px-3 py-2 rounded-xl transition"
            >
              Sign In to save orders
            </Link>
          )}
        </div>

        {!customerUser ? (
          /* Sign In Required State: No orders and no tracking visible */
          <div className="bg-white p-10 sm:p-14 rounded-3xl border border-neutral-200 text-center space-y-6 shadow-sm">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-100 to-violet-100 text-indigo-600 flex items-center justify-center text-3xl mx-auto shadow-inner border border-indigo-200">
              🔒
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
                Sign In to View Your Orders & Tracking
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
                You must be logged in to view your order history, delivery updates, refund requests, and real-time GPS delivery tracking.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-xs mx-auto">
              <Link
                href="/login?redirect=/orders"
                className="w-full py-3 px-5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold shadow-md transition text-center cursor-pointer"
              >
                Sign In
              </Link>
              <Link
                href="/login?mode=signup&redirect=/orders"
                className="w-full py-3 px-5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200 transition text-center cursor-pointer"
              >
                Create Account
              </Link>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex items-center justify-center gap-6 text-xs text-neutral-400">
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-500 font-bold">✓</span> Real-Time GPS Tracking
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-500 font-bold">✓</span> Instant Refund Support
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* Live WebSocket Order Tracker (Only shown if an actual order exists and not dismissed) */}
            {!loading && trackingOrder && !trackerDismissed && (
              <LiveOrderTracker
                order={trackingOrder}
                onClose={() => {
                  setTrackingOrder(null);
                  setTrackerDismissed(true);
                }}
              />
            )}

        {/* Search Order bar */}
        <form
          onSubmit={handleSearch}
          className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm flex flex-col sm:flex-row gap-3"
        >
          <input
            type="text"
            placeholder="Search by Order # (e.g. ORD-123456)"
            value={searchOrderNumber}
            onChange={(e) => setSearchOrderNumber(e.target.value)}
            className="flex-1 px-4 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="email"
            placeholder="Or search by email"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="flex-1 px-4 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-sm font-semibold transition"
          >
            Find Orders
          </button>
        </form>

        {/* Orders Listing */}
        {loading ? (
          <div className="bg-white p-12 rounded-2xl border border-neutral-200 text-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-3 text-sm text-neutral-500">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-neutral-200 text-center space-y-3">
            <span className="text-4xl">📦</span>
            <h3 className="text-base font-bold text-neutral-800">No orders found</h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              We couldn&apos;t find any orders matching your search. Place an order or verify your email and Order Number.
            </p>
            <Link
              href="/"
              className="inline-block mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const isPaid = order.status === "paid";
              const isRefundRequested = order.status === "refund_requested";
              const isRefunded = order.status === "refunded";
              const isRejected = order.status === "refund_rejected";

              return (
                <div
                  key={order._id}
                  className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm"
                >
                  {/* Order Top Bar */}
                  <div className="p-4 sm:p-5 bg-neutral-50 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-4">
                      <div>
                        <span className="text-neutral-500 block">Order Number</span>
                        <span className="font-mono font-bold text-neutral-900 text-sm">
                          {order.orderNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block">Date</span>
                        <span className="font-medium text-neutral-800">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block">Total</span>
                        <span className="font-bold text-neutral-900 text-sm">
                          ₹{order.totalAmount?.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge & Track Map Button */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setTrackerDismissed(false);
                          setTrackingOrder(order);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-full text-xs flex items-center gap-1 shadow-xs transition cursor-pointer"
                      >
                        <span>🛵</span> Track on Map
                      </button>
                      {isPaid && (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-semibold rounded-full text-xs flex items-center gap-1">
                          <span>✓</span> Paid
                        </span>
                      )}
                      {isRefundRequested && (
                        <span className="px-3 py-1 bg-amber-100 text-amber-900 font-semibold rounded-full text-xs flex items-center gap-1">
                          <span>⏳</span> Refund Requested (Under Review)
                        </span>
                      )}
                      {isRefunded && (
                        <span className="px-3 py-1 bg-purple-100 text-purple-900 font-semibold rounded-full text-xs flex items-center gap-1">
                          <span>💸</span> Refunded via Stripe
                        </span>
                      )}
                      {isRejected && (
                        <span className="px-3 py-1 bg-rose-100 text-rose-800 font-semibold rounded-full text-xs">
                          Refund Declined
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="p-4 sm:p-5 divide-y divide-neutral-100">
                    {order.items &&
                      order.items.map((item, idx) => (
                        <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.title}
                                className="w-12 h-12 rounded-lg object-cover border border-neutral-200"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center text-xs text-neutral-400">
                                🛍️
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-semibold text-neutral-900">{item.title}</p>
                              <p className="text-xs text-neutral-500">Qty: {item.quantity}</p>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-neutral-800">
                            ₹{((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                          </span>
                        </div>
                      ))}
                  </div>

                  {/* Delivery Location & Pricing Breakdown Snapshot */}
                  <div className="px-4 sm:px-5 py-3 bg-neutral-50/80 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-600">
                    <div className="flex items-center gap-2">
                      <span className="text-indigo-600 font-bold">📍 Delivery:</span>
                      <span>
                        {order.deliveryAddress?.address || "Registered Address"}
                      </span>
                      {order.deliveryZone?.name && (
                        <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-medium text-[11px]">
                          Zone: {order.deliveryZone.name} ({order.deliveryZone.estimatedDeliveryTime || "Standard"})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      {order.subtotal > 0 && (
                        <span>
                          Subtotal: <strong>₹{order.subtotal.toFixed(2)}</strong>
                        </span>
                      )}
                      <span>
                        Delivery Fee:{" "}
                        <strong>
                          {order.deliveryCharge > 0 ? `₹${order.deliveryCharge.toFixed(2)}` : "FREE"}
                        </strong>
                      </span>
                      <span className="font-bold text-neutral-900 text-sm">
                        Total Paid: ₹{order.totalAmount?.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Refund Status Details or Action */}
                  <div className="p-4 sm:p-5 bg-neutral-50/60 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {isPaid && (
                      <>
                        <div className="text-xs text-neutral-600">
                          <span className="font-semibold text-neutral-800">Product not what you expected?</span>
                          <p className="text-neutral-500">
                            If the item is wrong or defective, you can raise a refund request.
                          </p>
                        </div>
                        <button
                          onClick={() => openRefundModal(order)}
                          className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                        >
                          <span>⚠️</span>
                          <span>Product Not Correct? Request Refund</span>
                        </button>
                      </>
                    )}

                    {isRefundRequested && (
                      <div className="w-full text-xs text-amber-900 bg-amber-50 border border-amber-200 p-3 rounded-xl">
                        <div className="flex items-center gap-1 font-semibold mb-1">
                          <span>🔔</span>
                          <span>Refund Request In Progress</span>
                        </div>
                        <p>
                          <strong>Reason:</strong> {order.refundReason}
                        </p>
                        {order.refundNotes && (
                          <p className="mt-0.5 text-neutral-700">
                            <strong>Note:</strong> {order.refundNotes}
                          </p>
                        )}
                        <p className="text-[11px] text-amber-700 mt-1">
                          Admin will review your request and issue the payment refund directly via Stripe.
                        </p>
                      </div>
                    )}

                    {isRefunded && (
                      <div className="w-full text-xs text-purple-900 bg-purple-50 border border-purple-200 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1 font-semibold">
                            <span>✅</span>
                            <span>Payment Refunded via Stripe</span>
                          </div>
                          <p className="text-neutral-600 mt-0.5">
                            Amount: <strong>₹{order.totalAmount?.toFixed(2)}</strong> has been returned to your original payment method.
                          </p>
                        </div>
                        {order.refundStripeId && (
                          <span className="text-[11px] font-mono text-purple-800 bg-purple-100/70 px-2 py-1 rounded">
                            Stripe ID: {order.refundStripeId}
                          </span>
                        )}
                      </div>
                    )}

                    {isRejected && (
                      <div className="w-full text-xs text-neutral-600">
                        Refund request was declined by admin. Please contact support if you need further assistance.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </>
      )}

        {/* Refund Request Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚠️</span>
                  <h3 className="text-lg font-bold text-neutral-900">
                    Request a Refund
                  </h3>
                </div>
                <button
                  onClick={closeRefundModal}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleRefundSubmit} className="mt-4 space-y-4">
                <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100 text-xs">
                  <div className="flex justify-between text-neutral-600">
                    <span>Order:</span>
                    <strong className="text-neutral-900 font-mono">
                      {selectedOrder.orderNumber}
                    </strong>
                  </div>
                  <div className="flex justify-between text-neutral-600 mt-1">
                    <span>Refund Amount:</span>
                    <strong className="text-emerald-600 font-bold">
                      ₹{selectedOrder.totalAmount?.toFixed(2)}
                    </strong>
                  </div>
                </div>

                {/* Reason Selection */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                    What is wrong with the product? *
                  </label>
                  <select
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full p-2.5 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="Received wrong product">Received wrong product or wrong size</option>
                    <option value="Product is defective or damaged">Product is defective / damaged / not working</option>
                    <option value="Product does not match description">Item does not match website pictures or description</option>
                    <option value="Missing items or parts">Missing items or accessories from package</option>
                    <option value="Poor quality / unsatisfactory">Product quality is unsatisfactory</option>
                  </select>
                </div>

                {/* Additional Notes */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                    Describe the issue in detail *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="E.g. I ordered black color, but received white. / Item arrived with cracked screen..."
                    value={refundNotes}
                    onChange={(e) => setRefundNotes(e.target.value)}
                    className="w-full p-2.5 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-neutral-400"
                  />
                </div>

                {/* Status Message */}
                {message.text && (
                  <div
                    className={`p-3 rounded-xl text-xs ${
                      message.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-rose-50 text-rose-800 border border-rose-200"
                    }`}
                  >
                    {message.text}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeRefundModal}
                    className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRefund}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {submittingRefund ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <span>Submit Refund Request</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading orders...</div>}>
      <OrdersContent />
    </Suspense>
  );
}
