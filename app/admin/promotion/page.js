"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PromotionPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // Form states
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState(
    `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
  <h1 style="color: #4f46e5; text-align: center; margin-bottom: 8px;">Exclusive Offer for You! 🎉</h1>
  <p style="color: #374151; font-size: 16px; line-height: 1.5;">
    Dear Customer,
  </p>
  <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
    We are excited to share a special <strong>20% discount</strong> on our entire collection this week! Use promo code <strong>SAVE20</strong> at checkout.
  </p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="http://localhost:3000" style="background-color: #4f46e5; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">
      Shop the Sale Now
    </a>
  </div>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
    Thank you for being our valued customer.
  </p>
</div>`
  );
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });

  // 1. Auth Guard
  useEffect(() => {
    const encryptedToken = localStorage.getItem("token");
    if (!encryptedToken) {
      router.push("/admin/login");
    } else {
      try {
        const token = atob(encryptedToken);
        if (token) {
          setAuthLoading(false);
          fetchCustomers();
        } else {
          router.push("/admin/login");
        }
      } catch (e) {
        router.push("/admin/login");
      }
    }
  }, [router]);

  // 2. Fetch Customers
  async function fetchCustomers() {
    setLoadingCustomers(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setCustomers(data.users);
      }
    } catch (err) {
      console.error("Error fetching customers:", err);
    } finally {
      setLoadingCustomers(false);
    }
  }

  // 3. Filtered Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.email?.toLowerCase().includes(customerSearch.toLowerCase())
    );
  }, [customers, customerSearch]);

  // 4. Select All Toggle
  const isAllSelected =
    filteredCustomers.length > 0 &&
    filteredCustomers.every((c) => selectedEmails.includes(c.email));

  function handleSelectAll() {
    if (isAllSelected) {
      // Deselect filtered customers
      const filteredEmails = filteredCustomers.map((c) => c.email);
      setSelectedEmails((prev) => prev.filter((e) => !filteredEmails.includes(e)));
    } else {
      // Select all filtered customers
      const newEmails = Array.from(
        new Set([...selectedEmails, ...filteredCustomers.map((c) => c.email)])
      );
      setSelectedEmails(newEmails);
    }
  }

  function handleToggleCustomer(email) {
    if (selectedEmails.includes(email)) {
      setSelectedEmails(selectedEmails.filter((e) => e !== email));
    } else {
      setSelectedEmails([...selectedEmails, email]);
    }
  }

  // 5. Submit & Send Promotion
  async function handleSendPromotion(e) {
    e.preventDefault();
    setStatusMessage({ text: "", type: "" });

    if (!subject.trim()) {
      setStatusMessage({ text: "Please enter an email subject", type: "error" });
      return;
    }

    if (!htmlContent.trim()) {
      setStatusMessage({ text: "Please enter HTML email content", type: "error" });
      return;
    }

    if (selectedEmails.length === 0) {
      setStatusMessage({
        text: "Please select at least one customer to receive the promotion",
        type: "error",
      });
      return;
    }

    setSending(true);

    try {
      const res = await fetch("/api/admin/promotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          htmlContent,
          recipients: selectedEmails,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatusMessage({ text: data.message, type: "success" });
      } else {
        setStatusMessage({
          text: data.message || "Failed to send promotional emails",
          type: "error",
        });
      }
    } catch (err) {
      setStatusMessage({
        text: "Network error while sending emails. Please check server logs.",
        type: "error",
      });
    } finally {
      setSending(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    router.push("/admin/login");
  }

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-zinc-950">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="mt-3 text-sm text-gray-500 dark:text-zinc-400">Verifying Admin Access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Promotional Email Campaign ✉️
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
            Compose your custom HTML marketing template and send it directly to selected customers.
          </p>
        </div>

        {/* Status Alerts */}
        {statusMessage.text && (
          <div
            className={`mb-6 p-4 rounded-xl text-sm font-medium border flex items-center justify-between ${
              statusMessage.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                : "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
            }`}
          >
            <span>{statusMessage.text}</span>
            <button
              onClick={() => setStatusMessage({ text: "", type: "" })}
              className="text-xs underline ml-4 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Email Composer (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-xs p-6">
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">
                1. Email Content
              </h2>

              <div className="space-y-4">
                {/* Subject Input */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                    Subject Line *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Special Weekend Sale: 20% Off!"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* HTML Editor / Preview Toggle */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                      HTML Body *
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewMode(false)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                          !previewMode
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300"
                        }`}
                      >
                        HTML Code
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewMode(true)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                          previewMode
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300"
                        }`}
                      >
                        Live Preview
                      </button>
                    </div>
                  </div>

                  {!previewMode ? (
                    <textarea
                      rows={14}
                      value={htmlContent}
                      onChange={(e) => setHtmlContent(e.target.value)}
                      placeholder="Type or paste raw HTML here..."
                      className="w-full p-3 font-mono text-xs rounded-xl border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    ></textarea>
                  ) : (
                    <div className="w-full h-[320px] overflow-y-auto p-4 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950">
                      <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
                    </div>
                  )}
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-zinc-500">
                    Tip: You can use standard HTML markup and inline styles (e.g. &lt;h1&gt;, &lt;p&gt;, &lt;a&gt;, &lt;img&gt;).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Customer Selection & Send (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-xs p-6 flex flex-col h-[560px]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  2. Select Recipients
                </h2>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  {selectedEmails.length} selected
                </span>
              </div>

              {/* Search & Select All Toolbar */}
              <div className="space-y-3 mb-3">
                <input
                  type="text"
                  placeholder="Filter customers by name/email..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-zinc-800 text-xs">
                  <label className="flex items-center gap-2 font-medium cursor-pointer text-gray-700 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      disabled={filteredCustomers.length === 0}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span>Select All Filtered ({filteredCustomers.length})</span>
                  </label>

                  {selectedEmails.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedEmails([])}
                      className="text-xs text-gray-400 hover:text-red-500 transition"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
              </div>

              {/* Customers List Box */}
              <div className="flex-1 overflow-y-auto space-y-2 border border-gray-100 dark:border-zinc-800 rounded-xl p-2 bg-gray-50/50 dark:bg-zinc-950/40">
                {loadingCustomers ? (
                  <div className="text-center py-12 text-xs text-gray-400">Loading customers...</div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="text-center py-12 text-xs text-gray-400">No customers found.</div>
                ) : (
                  filteredCustomers.map((cust) => {
                    const isSelected = selectedEmails.includes(cust.email);
                    return (
                      <div
                        key={cust._id || cust.email}
                        onClick={() => handleToggleCustomer(cust.email)}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition ${
                          isSelected
                            ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800"
                            : "bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // Handled by container click
                          className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 pointer-events-none"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                            {cust.name}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-zinc-400 truncate">
                            {cust.email}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                            cust.status === "active"
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                              : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {cust.status || "active"}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Send Promotion Button */}
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={handleSendPromotion}
                  disabled={sending || selectedEmails.length === 0}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {sending ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent"></div>
                      <span>Sending to {selectedEmails.length} Customer(s)...</span>
                    </>
                  ) : (
                    <span>
                      🚀 Send Promotion ({selectedEmails.length} Recipients)
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
