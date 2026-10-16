"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import LocationPicker from "@/components/LocationPicker";

/**
 * ====================================================================
 * PRODUCTS MANAGEMENT PAGE
 * ====================================================================
 * Allows the admin to:
 * 1. View all products with real-time search & stock status filter.
 * 2. Add new products with image upload (Multer).
 * 3. Edit product details & replace photo.
 * 4. Delete products.
 */
export default function ProductsPage() {
  const router = useRouter();

  // Authentication & Data loading
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Notification message
  const [message, setMessage] = useState({ text: "", type: "" });

  // Add Product Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    title: "",
    price: "",
    quantity: "",
    category: "",
    description: "",
    imageUrl: "",
    latitude: "",
    longitude: "",
    address: "",
  });
  const [addFile, setAddFile] = useState(null);
  const [addFilePreview, setAddFilePreview] = useState("");
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Edit Product Form State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    price: "",
    quantity: "",
    category: "",
    description: "",
    status: "in_stock",
    imageUrl: "",
    latitude: "",
    longitude: "",
    address: "",
    removeLocation: false,
  });
  const [editFile, setEditFile] = useState(null);
  const [editFilePreview, setEditFilePreview] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Delete Confirmation State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ------------------------------------------------------------------
  // 1. AUTHENTICATION GUARD
  // ------------------------------------------------------------------
  useEffect(() => {
    const encryptedToken = localStorage.getItem("token");
    if (!encryptedToken) {
      router.push("/admin/login");
    } else {
      try {
        const token = atob(encryptedToken);
        if (token) {
          setAuthLoading(false);
          fetchProducts();
        } else {
          router.push("/admin/login");
        }
      } catch {
        router.push("/admin/login");
      }
    }
  }, [router]);

  // ------------------------------------------------------------------
  // 2. FETCH ALL PRODUCTS
  // ------------------------------------------------------------------
  async function fetchProducts() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products");
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
      } else {
        showToast(data.message || "Failed to load products", "error");
      }
    } catch (err) {
      console.error("Error loading products:", err);
      showToast("Server error while fetching products", "error");
    } finally {
      setLoading(false);
    }
  }

  // Toast Notification helper
  function showToast(text, type = "success") {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 4000);
  }

  // ------------------------------------------------------------------
  // 3. HANDLE PHOTO SELECTION (FOR ADD MODAL)
  // ------------------------------------------------------------------
  function handleAddFileChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      setAddFile(file);
      // Create local URL for live preview
      setAddFilePreview(URL.createObjectURL(file));
    }
  }

  // ------------------------------------------------------------------
  // 4. SUBMIT NEW PRODUCT (POST /api/admin/products)
  // ------------------------------------------------------------------
  async function handleAddSubmit(e) {
    e.preventDefault();

    if (!addForm.title || !addForm.price || addForm.quantity === "") {
      showToast("Please fill in Title, Price, and Quantity", "error");
      return;
    }

    setSubmittingAdd(true);
    try {
      // Use FormData so Multer can handle the uploaded file
      const formData = new FormData();
      formData.append("title", addForm.title);
      formData.append("price", addForm.price);
      formData.append("quantity", addForm.quantity);
      formData.append("category", addForm.category || "General");
      formData.append("description", addForm.description);

      // Attach file if selected
      if (addFile) {
        formData.append("image", addFile);
      } else if (addForm.imageUrl) {
        formData.append("imageUrl", addForm.imageUrl);
      }

      // Attach location if specified
      if (addForm.latitude !== "" && addForm.longitude !== "") {
        formData.append("latitude", addForm.latitude);
        formData.append("longitude", addForm.longitude);
        formData.append("address", addForm.address || "");
      }

      const res = await fetch("/api/admin/products", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        showToast("Product added successfully!");
        setShowAddModal(false);
        // Reset form
        setAddForm({
          title: "",
          price: "",
          quantity: "",
          category: "",
          description: "",
          imageUrl: "",
          latitude: "",
          longitude: "",
          address: "",
        });
        setAddFile(null);
        setAddFilePreview("");
        fetchProducts(); // Refresh list
      } else {
        showToast(data.message || "Failed to add product", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to upload product", "error");
    } finally {
      setSubmittingAdd(false);
    }
  }

  // ------------------------------------------------------------------
  // 5. OPEN EDIT MODAL
  // ------------------------------------------------------------------
  function openEditModal(prod) {
    setEditingProduct(prod);
    const hasLocation =
      prod.location &&
      Array.isArray(prod.location.coordinates) &&
      prod.location.coordinates.length === 2;

    setEditForm({
      title: prod.title || "",
      price: prod.price ?? "",
      quantity: prod.quantity ?? "",
      category: prod.category || "General",
      description: prod.description || "",
      status: prod.status || "in_stock",
      imageUrl: prod.imageUrl || "",
      latitude: hasLocation ? prod.location.coordinates[1] : "", // [lng, lat]
      longitude: hasLocation ? prod.location.coordinates[0] : "",
      address: prod.location?.address || "",
      removeLocation: false,
    });
    setEditFile(null);
    setEditFilePreview(prod.imageUrl || "");
    setShowEditModal(true);
  }

  // Handle Photo selection for Edit
  function handleEditFileChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      setEditFile(file);
      setEditFilePreview(URL.createObjectURL(file));
    }
  }

  // ------------------------------------------------------------------
  // 6. UPDATE PRODUCT (PATCH /api/admin/products/[id])
  // ------------------------------------------------------------------
  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!editingProduct) return;

    setSubmittingEdit(true);
    try {
      const formData = new FormData();
      formData.append("title", editForm.title);
      formData.append("price", editForm.price);
      formData.append("quantity", editForm.quantity);
      formData.append("category", editForm.category);
      formData.append("description", editForm.description);
      formData.append("status", editForm.status);

      // Attach new photo if changed
      if (editFile) {
        formData.append("image", editFile);
      } else if (editForm.imageUrl) {
        formData.append("imageUrl", editForm.imageUrl);
      }

      // Attach location or removal
      if (editForm.removeLocation) {
        formData.append("removeLocation", "true");
      } else if (editForm.latitude !== "" && editForm.longitude !== "") {
        formData.append("latitude", editForm.latitude);
        formData.append("longitude", editForm.longitude);
        formData.append("address", editForm.address || "");
      }

      const res = await fetch(`/api/admin/products/${editingProduct._id}`, {
        method: "PATCH",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        showToast("Product updated successfully!");
        setShowEditModal(false);
        setEditingProduct(null);
        fetchProducts(); // Refresh list
      } else {
        showToast(data.message || "Failed to update product", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to update product", "error");
    } finally {
      setSubmittingEdit(false);
    }
  }

  // ------------------------------------------------------------------
  // 7. DELETE PRODUCT (DELETE /api/admin/products/[id])
  // ------------------------------------------------------------------
  async function handleDeleteConfirm() {
    if (!deletingProduct) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${deletingProduct._id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        showToast("Product deleted successfully");
        setShowDeleteModal(false);
        setDeletingProduct(null);
        fetchProducts(); // Refresh list
      } else {
        showToast(data.message || "Failed to delete product", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Server error deleting product", "error");
    } finally {
      setDeleting(false);
    }
  }

  // ------------------------------------------------------------------
  // 8. FILTER & KPI CALCULATIONS
  // ------------------------------------------------------------------
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [products, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = products.length;
    const inStock = products.filter((p) => p.status === "in_stock" && p.quantity > 0).length;
    const outOfStock = products.filter((p) => p.quantity === 0 || p.status === "out_of_stock").length;
    const totalValue = products.reduce((acc, p) => acc + (p.price || 0) * (p.quantity || 0), 0);
    return { total, inStock, outOfStock, totalValue };
  }, [products]);

  // Loading spinner during auth check
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Toast Alert Banner */}
      {message.text && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center justify-between text-sm shadow-sm transition-all ${
            message.type === "error"
              ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900"
              : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
          }`}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage({ text: "", type: "" })}
            className="font-bold opacity-70 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header: Title and Add Product Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 bg-zinc-950/90 p-6 rounded-3xl border-2 border-indigo-500/40 shadow-2xl shadow-indigo-950/40">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>📦</span> Inventory Command Center
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            Products Management
          </h1>
          <p className="mt-1 text-sm text-zinc-300 font-medium">
            Create, edit, delete products, track inventory stock, and manage photos uploaded with Multer.
          </p>
        </div>
        <button
          onClick={() => {
            setAddFile(null);
            setAddFilePreview("");
            setShowAddModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black text-sm shadow-xl shadow-indigo-500/40 border-2 border-indigo-400/50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
        >
          <span className="text-base">➕</span> Add New Product
        </button>
      </div>

      {/* KPI Stats Cards - Overpowered Glowing Glass Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-5 bg-gradient-to-br from-zinc-900/90 to-zinc-950 rounded-2xl border-2 border-indigo-500/40 shadow-lg shadow-indigo-950/40 hover:border-indigo-400 hover:shadow-indigo-500/20 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Total Products</span>
            <span className="text-sm">📦</span>
          </div>
          <p className="text-3xl font-black text-white mt-2 tracking-tight">{stats.total}</p>
        </div>
        <div className="p-5 bg-gradient-to-br from-emerald-950/40 to-zinc-950 rounded-2xl border-2 border-emerald-500/40 shadow-lg shadow-emerald-950/40 hover:border-emerald-400 hover:shadow-emerald-500/20 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">In Stock</span>
            <span className="text-sm">✅</span>
          </div>
          <p className="text-3xl font-black text-emerald-400 mt-2 tracking-tight">{stats.inStock}</p>
        </div>
        <div className="p-5 bg-gradient-to-br from-rose-950/40 to-zinc-950 rounded-2xl border-2 border-rose-500/40 shadow-lg shadow-rose-950/40 hover:border-rose-400 hover:shadow-rose-500/20 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Out of Stock</span>
            <span className="text-sm">⚠️</span>
          </div>
          <p className="text-3xl font-black text-rose-400 mt-2 tracking-tight">{stats.outOfStock}</p>
        </div>
        <div className="p-5 bg-gradient-to-br from-amber-950/40 to-zinc-950 rounded-2xl border-2 border-amber-500/40 shadow-lg shadow-amber-950/40 hover:border-amber-400 hover:shadow-amber-500/20 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Inventory Value</span>
            <span className="text-sm">💰</span>
          </div>
          <p className="text-3xl font-black text-amber-400 mt-2 tracking-tight">
            ₹{stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 bg-zinc-950/80 p-3 rounded-2xl border-2 border-zinc-800 shadow-xl">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search products by title or category..."
            className="w-full px-4 py-3 rounded-xl border-2 border-zinc-700/80 bg-zinc-900/90 text-white placeholder-zinc-400 text-sm font-medium focus:outline-hidden focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-3 rounded-xl border-2 border-zinc-700/80 bg-zinc-900/90 text-white font-semibold text-sm focus:outline-hidden focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 cursor-pointer transition-all"
        >
          <option value="all">All Statuses</option>
          <option value="in_stock">In Stock Only</option>
          <option value="out_of_stock">Out of Stock Only</option>
        </select>
      </div>

      {/* Products Table - High Contrast Obsidian Glass */}
      <div className="bg-zinc-950/90 rounded-3xl border-2 border-zinc-800/90 overflow-hidden shadow-2xl shadow-black/80">
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-indigo-500 border-r-transparent"></div>
            <p className="mt-4 text-sm font-bold text-zinc-300">Loading catalog...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-24 text-center">
            <span className="text-5xl block">🛍️</span>
            <p className="mt-4 text-lg font-black text-white">No products found</p>
            <p className="text-sm font-medium text-zinc-400 mt-1 max-w-sm mx-auto">
              {products.length === 0 ? "You haven't added any products to the database yet." : "No products match your search query."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-zinc-800 bg-zinc-900/90 text-xs font-black text-zinc-300 uppercase tracking-wider">
                  <th className="py-4 px-5">Photo</th>
                  <th className="py-4 px-5">Product Details</th>
                  <th className="py-4 px-5">Category</th>
                  <th className="py-4 px-5">Location</th>
                  <th className="py-4 px-5">Price</th>
                  <th className="py-4 px-5">Quantity</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70">
                {filteredProducts.map((p) => (
                  <tr key={p._id} className="hover:bg-zinc-900/60 transition-colors">
                    <td className="py-4 px-5">
                      <div className="h-14 w-14 rounded-2xl bg-zinc-900 overflow-hidden flex items-center justify-center border-2 border-zinc-700/80 shadow-md">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.title}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <span className="text-xl opacity-40">📦</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="font-black text-white text-base leading-tight">{p.title}</div>
                      {p.description && (
                        <div className="text-xs text-zinc-400 line-clamp-1 max-w-xs mt-1 font-medium">
                          {p.description}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-5">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-zinc-800/90 text-zinc-200 border border-zinc-700">
                        {p.category || "General"}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      {p.location && Array.isArray(p.location.coordinates) && p.location.coordinates.length === 2 ? (
                        <div className="flex flex-col">
                          <span className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-300 max-w-[150px] truncate" title={p.location.address || ""}>
                            <span>📍</span> {p.location.address || "Assigned"}
                          </span>
                          <span className="text-[11px] text-zinc-400 font-mono mt-0.5">
                            {Number(p.location.coordinates[1]).toFixed(3)}, {Number(p.location.coordinates[0]).toFixed(3)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-500 font-bold italic">No location</span>
                      )}
                    </td>
                    <td className="py-4 px-5">
                      <span className="text-base font-black text-white tracking-tight">
                        ₹{p.price.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`text-sm font-black ${
                          p.quantity === 0
                            ? "text-rose-400"
                            : p.quantity <= 5
                            ? "text-amber-400"
                            : "text-zinc-200"
                        }`}
                      >
                        {p.quantity} {p.quantity <= 5 && p.quantity > 0 ? "(Low)" : ""}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      {p.quantity > 0 && p.status === "in_stock" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-950/80 text-emerald-300 border-2 border-emerald-500/60 shadow-sm shadow-emerald-950/60">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span> In Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-950/80 text-rose-300 border-2 border-rose-500/60 shadow-sm shadow-rose-950/60">
                          <span className="h-2 w-2 rounded-full bg-rose-400"></span> Out of Stock
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          onClick={() => openEditModal(p)}
                          className="px-3.5 py-1.5 text-xs font-black rounded-xl text-indigo-300 bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-400/50 shadow-sm transition-all cursor-pointer active:scale-95"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setDeletingProduct(p);
                            setShowDeleteModal(true);
                          }}
                          className="px-3.5 py-1.5 text-xs font-black rounded-xl text-rose-300 bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/50 shadow-sm transition-all cursor-pointer active:scale-95"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- MODAL 1: ADD PRODUCT --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full p-6 border border-gray-200 dark:border-zinc-800 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add New Product</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                  Product Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bluetooth Wireless Earbuds"
                  value={addForm.title}
                  onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="49.99"
                    value={addForm.price}
                    onChange={(e) => setAddForm({ ...addForm, price: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="25"
                    value={addForm.quantity}
                    onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  placeholder="e.g. Audio, Electronics, Apparel"
                  value={addForm.category}
                  onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Photo Upload via Multer */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                  Product Photo (Upload with Multer)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAddFileChange}
                    className="text-xs text-gray-500 dark:text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 dark:file:bg-indigo-950/60 dark:file:text-indigo-300 hover:file:bg-indigo-100 cursor-pointer"
                  />
                  {addFilePreview && (
                    <div className="h-12 w-12 rounded-lg border border-gray-300 dark:border-zinc-700 overflow-hidden shrink-0">
                      <img src={addFilePreview} alt="Preview" className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Product features, dimensions, etc..."
                  value={addForm.description}
                  onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                ></textarea>
              </div>

              {/* Location Picker */}
              <LocationPicker
                latitude={addForm.latitude}
                longitude={addForm.longitude}
                address={addForm.address}
                onChange={({ latitude, longitude, address }) => {
                  setAddForm((prev) => ({
                    ...prev,
                    latitude,
                    longitude,
                    address,
                  }));
                }}
              />

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="px-5 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition cursor-pointer"
                >
                  {submittingAdd ? "Saving..." : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: EDIT PRODUCT --- */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full p-6 border border-gray-200 dark:border-zinc-800 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit Product</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                  Product Title *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editForm.quantity}
                    onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="in_stock">In Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                  Change Photo (Multer Upload)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEditFileChange}
                    className="text-xs text-gray-500 dark:text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 dark:file:bg-indigo-950/60 dark:file:text-indigo-300 hover:file:bg-indigo-100 cursor-pointer"
                  />
                  {editFilePreview && (
                    <div className="h-12 w-12 rounded-lg border border-gray-300 dark:border-zinc-700 overflow-hidden shrink-0">
                      <img src={editFilePreview} alt="Preview" className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                ></textarea>
              </div>

              {/* Location Picker */}
              <LocationPicker
                latitude={editForm.latitude}
                longitude={editForm.longitude}
                address={editForm.address}
                onChange={({ latitude, longitude, address, removeLocation }) => {
                  setEditForm((prev) => ({
                    ...prev,
                    latitude: removeLocation ? "" : latitude,
                    longitude: removeLocation ? "" : longitude,
                    address: removeLocation ? "" : address,
                    removeLocation: Boolean(removeLocation),
                  }));
                }}
              />

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-5 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition cursor-pointer"
                >
                  {submittingEdit ? "Updating..." : "Update Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: DELETE CONFIRMATION --- */}
      {showDeleteModal && deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-sm w-full p-6 border border-gray-200 dark:border-zinc-800 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Product</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
              Are you sure you want to delete{" "}
              <strong className="text-gray-900 dark:text-white font-semibold">
                "{deletingProduct.title}"
              </strong>
              ? This action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition cursor-pointer"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
