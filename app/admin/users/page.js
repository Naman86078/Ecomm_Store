"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function UsersPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "customer",
    status: "active",
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

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
          fetchUsers();
        } else {
          router.push("/admin/login");
        }
      } catch (e) {
        router.push("/admin/login");
      }
    }
  }, [router]);

  // 2. Fetch Users
  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      showNotification("Failed to load customers list", "error");
    } finally {
      setLoading(false);
    }
  }

  // 3. Notification Helper
  function showNotification(text, type = "success") {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage({ text: "", type: "" });
    }, 4000);
  }

  // 4. Logout
  function handleLogout() {
    localStorage.removeItem("token");
    router.push("/admin/login");
  }

  // 5. Add User
  async function handleAddUser(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification("Customer added successfully!");
        setFormData({ name: "", email: "", phone: "", role: "customer", status: "active" });
        setShowAddModal(false);
        fetchUsers();
      } else {
        showNotification(data.message || "Failed to add customer", "error");
      }
    } catch (err) {
      showNotification("An error occurred while adding customer", "error");
    } finally {
      setSubmitting(false);
    }
  }

  // 6. Delete User
  async function handleDeleteUser(id, name) {
    if (!confirm(`Are you sure you want to remove ${name}?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification("Customer removed successfully!");
        setUsers((prev) => prev.filter((u) => u._id !== id));
      } else {
        showNotification(data.message || "Failed to delete customer", "error");
      }
    } catch (err) {
      showNotification("Error deleting customer", "error");
    }
  }

  // 7. Toggle Status
  async function handleToggleStatus(user) {
    const nextStatus = user.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`/api/admin/users/${user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(`Status updated to ${nextStatus}!`);
        setUsers((prev) =>
          prev.map((u) => (u._id === user._id ? { ...u, status: nextStatus } : u))
        );
      }
    } catch (err) {
      showNotification("Failed to update status", "error");
    }
  }

  // 8. Quick Sample Data Creator
  async function handleSeedSampleUsers() {
    setLoading(true);
    const sampleUsers = [
      { name: "Rahul Sharma", email: "rahul.sharma@example.com", phone: "+91 98765 43210", role: "customer", status: "active" },
      { name: "Priya Patel", email: "priya.patel@example.com", phone: "+91 98234 56789", role: "customer", status: "active" },
      { name: "Amit Verma", email: "amit.verma@example.com", phone: "+91 97123 45678", role: "customer", status: "inactive" },
      { name: "Sneha Gupta", email: "sneha.gupta@example.com", phone: "+91 99001 23456", role: "customer", status: "active" },
      { name: "Vikram Singh", email: "vikram.singh@example.com", phone: "+91 96543 21098", role: "customer", status: "active" },
    ];

    for (const sample of sampleUsers) {
      try {
        await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sample),
        });
      } catch (e) {
        // ignore duplicate errors during seed
      }
    }
    showNotification("Sample customers loaded successfully!");
    fetchUsers();
  }

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phone?.includes(searchTerm);
      const matchesStatus =
        statusFilter === "all" ? true : u.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [users, searchTerm, statusFilter]);

  // Statistics
  const totalCount = users.length;
  const activeCount = users.filter((u) => u.status === "active").length;
  const inactiveCount = users.filter((u) => u.status !== "active").length;

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
      {/* Toast Notification */}
      {message.text && (
        <div
          className={`fixed top-5 right-5 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            message.type === "error"
              ? "bg-red-600 text-white"
              : "bg-emerald-600 text-white"
          }`}
        >
          {message.text}
        </div>
      )}
        {/* Page Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Registered Customers
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
              Manage and view all customer accounts registered in the database.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchUsers}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800 shadow-xs transition"
            >
              🔄 Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 shadow-xs transition"
            >
              + Add Customer
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
          <div className="p-5 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500 dark:text-zinc-400">Total Customers</span>
              <span className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-bold">
                👥
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              {totalCount}
            </p>
          </div>

          <div className="p-5 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500 dark:text-zinc-400">Active Accounts</span>
              <span className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-bold">
                ✓
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {activeCount}
            </p>
          </div>

          <div className="p-5 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500 dark:text-zinc-400">Inactive / Suspended</span>
              <span className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm font-bold">
                !
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {inactiveCount}
            </p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-4 mb-6 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="w-full sm:w-80">
            <input
              type="text"
              placeholder="Search by name, email or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
              Status:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>

        {/* Users Table / List */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-16 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
              <p className="mt-3 text-sm text-gray-500 dark:text-zinc-400">Loading registered customers...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800 text-2xl">
                👥
              </div>
              <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">
                {users.length === 0 ? "No customers found in database" : "No customers match your search"}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400 max-w-md mx-auto">
                {users.length === 0
                  ? "Get started by adding your first registered customer or seed sample customer data."
                  : "Try clearing your search query or status filter to see all results."}
              </p>
              {users.length === 0 && (
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button
                    onClick={handleSeedSampleUsers}
                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 shadow-xs transition"
                  >
                    🌱 Load Sample Customers
                  </button>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 shadow-xs transition"
                  >
                    + Add New Customer
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-zinc-800 bg-gray-50/75 dark:bg-zinc-950/50 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                    <th className="py-3.5 px-4 sm:px-6">Customer</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Registered Date</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-zinc-800 text-sm">
                  {filteredUsers.map((user) => {
                    const initials = user.name
                      ? user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .substring(0, 2)
                          .toUpperCase()
                      : "U";

                    const formattedDate = user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "N/A";

                    return (
                      <tr
                        key={user._id}
                        className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        {/* Name & Avatar */}
                        <td className="py-4 px-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                              {initials}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white">
                                {user.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-zinc-400">
                                ID: {user._id?.substring(user._id.length - 6)}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Email & Phone */}
                        <td className="py-4 px-4">
                          <div className="text-gray-900 dark:text-white font-medium">{user.email}</div>
                          {user.phone && (
                            <div className="text-xs text-gray-500 dark:text-zinc-400">{user.phone}</div>
                          )}
                        </td>

                        {/* Role */}
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-300 capitalize">
                            {user.role || "Customer"}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4">
                          <button
                            onClick={() => handleToggleStatus(user)}
                            title="Click to toggle status"
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition ${
                              user.status === "active"
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
                                : user.status === "blocked"
                                ? "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 hover:bg-red-100"
                                : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                user.status === "active"
                                  ? "bg-emerald-500"
                                  : user.status === "blocked"
                                  ? "bg-red-500"
                                  : "bg-amber-500"
                              }`}
                            ></span>
                            <span className="capitalize">{user.status || "active"}</span>
                          </button>
                        </td>

                        {/* Registered Date */}
                        <td className="py-4 px-4 text-gray-500 dark:text-zinc-400 text-xs">
                          {formattedDate}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 sm:px-6 text-right">
                          <button
                            onClick={() => handleDeleteUser(user._id, user.name)}
                            className="text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                            title="Delete customer"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-zinc-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Register New Customer
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddUser} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. +91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="customer">Customer</option>
                    <option value="user">User</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 shadow-xs transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
