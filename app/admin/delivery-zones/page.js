"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import DeliveryZoneMapEditor from "@/components/DeliveryZoneMapEditor";
import { isValidCoordinate } from "@/lib/geoUtils";

export default function AdminDeliveryZonesPage() {
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#4f46e5",
    deliveryCharge: 40,
    minOrderAmount: 0,
    estimatedDeliveryTime: "30-45 mins",
    priority: 1,
    isActive: true,
    assignedType: "all",
    assignedCategories: [],
    assignedProducts: [],
    boundaryCoordinates: [],
  });

  // Simulator State
  const [simLat, setSimLat] = useState("30.7102");
  const [simLng, setSimLng] = useState("76.6936");
  const [simTesting, setSimTesting] = useState(false);
  const [simResult, setSimResult] = useState(null);

  const categoryOptions = [
    "Electronics",
    "Clothing",
    "Footwear",
    "Accessories",
    "Home & Kitchen",
    "Beauty",
  ];

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
          loadData();
        } else {
          router.push("/admin/login");
        }
      } catch {
        router.push("/admin/login");
      }
    }
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [zonesRes, productsRes] = await Promise.all([
        fetch("/api/delivery-zones"),
        fetch("/api/products"),
      ]);

      const zonesData = await zonesRes.json();
      const productsData = await productsRes.json();

      if (zonesData.success) {
        setZones(zonesData.zones || []);
      }
      if (productsData.success) {
        setAvailableProducts(productsData.products || []);
      }
    } catch (err) {
      console.error("Failed to load zones data:", err);
      setMessage({ type: "error", text: "Failed to load delivery zones." });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingZoneId(null);
    setFormData({
      name: "",
      description: "",
      color: "#4f46e5",
      deliveryCharge: 40,
      minOrderAmount: 0,
      estimatedDeliveryTime: "30-45 mins",
      priority: 1,
      isActive: true,
      assignedType: "all",
      assignedCategories: [],
      assignedProducts: [],
      boundaryCoordinates: [],
    });
    setShowModal(true);
  };

  const handleOpenEdit = (zone) => {
    setEditingZoneId(zone._id);
    setFormData({
      name: zone.name || "",
      description: zone.description || "",
      color: zone.color || "#4f46e5",
      deliveryCharge: zone.deliveryCharge ?? 40,
      minOrderAmount: zone.minOrderAmount ?? 0,
      estimatedDeliveryTime: zone.estimatedDeliveryTime || "30-45 mins",
      priority: zone.priority ?? 1,
      isActive: zone.isActive ?? true,
      assignedType: zone.assignedType || "all",
      assignedCategories: zone.assignedCategories || [],
      assignedProducts: (zone.assignedProducts || []).map((p) =>
        typeof p === "object" ? p._id : p
      ),
      boundaryCoordinates: zone.boundary?.coordinates || [],
    });
    setShowModal(true);
  };

  const handleToggleCategory = (cat) => {
    setFormData((prev) => {
      const exists = prev.assignedCategories.includes(cat);
      return {
        ...prev,
        assignedCategories: exists
          ? prev.assignedCategories.filter((c) => c !== cat)
          : [...prev.assignedCategories, cat],
      };
    });
  };

  const handleToggleProduct = (prodId) => {
    setFormData((prev) => {
      const exists = prev.assignedProducts.includes(prodId);
      return {
        ...prev,
        assignedProducts: exists
          ? prev.assignedProducts.filter((id) => id !== prodId)
          : [...prev.assignedProducts, prodId],
      };
    });
  };

  const handleSaveZone = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Zone name is required.");
      return;
    }

    if (
      !formData.boundaryCoordinates ||
      formData.boundaryCoordinates.length === 0 ||
      !formData.boundaryCoordinates[0] ||
      formData.boundaryCoordinates[0].length < 4
    ) {
      alert("Please draw at least 3 corner points on the map to form a closed polygon boundary.");
      return;
    }

    setIsSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      const url = editingZoneId
        ? `/api/delivery-zones/${editingZoneId}`
        : "/api/delivery-zones";
      const method = editingZoneId ? "PUT" : "POST";

      const payload = {
        ...formData,
        boundary: {
          type: "Polygon",
          coordinates: formData.boundaryCoordinates,
        },
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({
          type: "success",
          text: editingZoneId
            ? "Delivery zone updated successfully!"
            : "New delivery zone created successfully!",
        });
        setShowModal(false);
        loadData();
      } else {
        alert(data.message || "Failed to save delivery zone.");
      }
    } catch (err) {
      console.error("Save zone error:", err);
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteZone = async (id, name) => {
    if (!confirm(`Are you sure you want to delete delivery zone "${name}"?`)) return;

    try {
      const res = await fetch(`/api/delivery-zones/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: `Zone "${name}" deleted.` });
        loadData();
      } else {
        alert(data.message || "Failed to delete zone.");
      }
    } catch (err) {
      console.error("Delete zone error:", err);
      alert("Error: " + err.message);
    }
  };

  const handleToggleZoneActive = async (zone) => {
    try {
      const res = await fetch(`/api/delivery-zones/${zone._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !zone.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        loadData();
      }
    } catch (err) {
      console.error("Toggle active error:", err);
    }
  };

  const handleCoordinatesChange = useCallback((coords) => {
    setFormData((prev) => {
      if (JSON.stringify(prev.boundaryCoordinates) === JSON.stringify(coords)) {
        return prev;
      }
      return { ...prev, boundaryCoordinates: coords };
    });
  }, []);

  const otherZones = useMemo(
    () => zones.filter((z) => z._id !== editingZoneId),
    [zones, editingZoneId]
  );

  // Run Serviceability Simulation
  const handleRunSimulator = async () => {
    const lat = parseFloat(simLat);
    const lng = parseFloat(simLng);

    if (!isValidCoordinate(lat, lng)) {
      alert("Please enter valid latitude (-90..90) and longitude (-180..180).");
      return;
    }

    setSimTesting(true);
    setSimResult(null);

    try {
      const [serviceRes, prodRes] = await Promise.all([
        fetch(`/api/delivery-zones/check-serviceability?lat=${lat}&lng=${lng}`),
        fetch(`/api/products/serviceable?lat=${lat}&lng=${lng}`),
      ]);

      const serviceData = await serviceRes.json();
      const prodData = await prodRes.json();

      setSimResult({
        serviceInfo: serviceData,
        productsInfo: prodData,
      });
    } catch (err) {
      console.error("Simulation error:", err);
      alert("Simulation failed: " + err.message);
    } finally {
      setSimTesting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Title & Actions - Overpowered Electric Gradient Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-950 p-6 rounded-3xl border-2 border-indigo-400 shadow-2xl shadow-indigo-950/60">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
            <span className="p-2.5 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/50 text-xl">🗺️</span>
            <span>Delivery Zone Management</span>
          </h1>
          <p className="text-sm font-bold text-zinc-100 mt-2">
            Draw geographical delivery boundaries on the map, set fees, delivery times, and assign products.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-6 py-3.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-2xl text-xs font-black shadow-xl shadow-indigo-500/50 border-2 border-indigo-300 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <span className="text-base">➕</span> Create Delivery Zone
        </button>
      </div>

      {/* Beginner Step-by-Step Guide Banner - Ultra High Contrast */}
      <div className="bg-zinc-950 border-2 border-indigo-500/80 rounded-3xl p-6 text-xs shadow-2xl shadow-indigo-950/50">
        <span className="font-black text-amber-300 uppercase tracking-widest text-xs flex items-center gap-2 mb-3">
          <span>💡</span> HOW DELIVERY ZONES WORK:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 mt-2">
          <div className="bg-zinc-900 p-4 rounded-2xl border-2 border-indigo-500/50 shadow-md">
            <strong className="text-indigo-300 block font-black text-sm mb-1">1. Draw Boundaries</strong>
            <p className="text-xs text-zinc-100 font-bold leading-relaxed">
              Click map corners to form a closed polygon boundary stored in MongoDB using GeoJSON.
            </p>
          </div>
          <div className="bg-zinc-900 p-4 rounded-2xl border-2 border-amber-500/50 shadow-md">
            <strong className="text-amber-300 block font-black text-sm mb-1">2. Pricing & SLA</strong>
            <p className="text-xs text-zinc-100 font-bold leading-relaxed">
              Configure zone delivery charges, minimum order amount, and delivery time.
            </p>
          </div>
          <div className="bg-zinc-900 p-4 rounded-2xl border-2 border-cyan-500/50 shadow-md">
            <strong className="text-cyan-300 block font-black text-sm mb-1">3. Product Rules</strong>
            <p className="text-xs text-zinc-100 font-bold leading-relaxed">
              Choose all products, specific categories, or individual items available for this area.
            </p>
          </div>
          <div className="bg-zinc-900 p-4 rounded-2xl border-2 border-emerald-500/50 shadow-md">
            <strong className="text-emerald-300 block font-black text-sm mb-1">4. Geospatial Queries</strong>
            <p className="text-xs text-zinc-100 font-bold leading-relaxed">
              MongoDB <code className="text-emerald-200 bg-emerald-950 px-1.5 py-0.5 rounded-md font-black border border-emerald-400">$geoIntersects</code> detects customer zones during checkout.
            </p>
          </div>
        </div>
      </div>

      {/* Feedback Alert */}
      {message.text && (
        <div
          className={`p-4 rounded-2xl text-xs font-black shadow-xl ${
            message.type === "error"
              ? "bg-rose-950 text-rose-100 border-2 border-rose-400 shadow-rose-950/50"
              : "bg-emerald-950 text-emerald-100 border-2 border-emerald-400 shadow-emerald-950/50"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Active Zones Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <span>⚡</span> Active Delivery Zones ({zones.length})
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-44 bg-zinc-900 rounded-3xl border-2 border-zinc-800 animate-pulse"
              />
            ))}
          </div>
        ) : zones.length === 0 ? (
          <div className="bg-zinc-950 rounded-3xl p-10 text-center border-2 border-zinc-800 space-y-4 shadow-xl">
            <span className="text-4xl block">🗺️</span>
            <h3 className="text-base font-black text-white">
              No delivery zones created yet
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto font-medium">
              Create your first delivery zone to configure where you deliver and set custom delivery charges.
            </p>
            <button
              onClick={handleOpenCreate}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-xs font-black shadow-lg"
            >
              + Create First Delivery Zone
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {zones.map((zone) => {
              const ring = zone.boundary?.coordinates?.[0] || [];
              const vertexCount = Math.max(0, ring.length - 1);

              return (
                <div
                  key={zone._id}
                  className="bg-zinc-950 rounded-3xl p-6 border-2 border-zinc-700 hover:border-indigo-400 shadow-2xl flex flex-col justify-between transition-all relative overflow-hidden"
                >
                  {/* Color Accent Bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-2.5 shadow-md"
                    style={{ backgroundColor: zone.color || "#4f46e5" }}
                  />

                  <div className="space-y-4 pt-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-black text-white text-lg tracking-tight">
                          {zone.name}
                        </h3>
                        {zone.description && (
                          <p className="text-xs text-zinc-100 font-bold mt-1 line-clamp-1">
                            {zone.description}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleToggleZoneActive(zone)}
                        className={`text-xs font-black px-3.5 py-1 rounded-full cursor-pointer transition-colors shadow-md ${
                          zone.isActive
                            ? "bg-emerald-400 text-black border-2 border-emerald-200"
                            : "bg-zinc-800 text-zinc-100 border-2 border-zinc-600"
                        }`}
                        title="Toggle zone activation"
                      >
                        {zone.isActive ? "ACTIVE" : "INACTIVE"}
                      </button>
                    </div>

                    {/* Zone Details Grid with High-Contrast Colors */}
                    <div className="grid grid-cols-2 gap-2.5 text-xs bg-black p-4 rounded-2xl border-2 border-zinc-800">
                      <div>
                        <span className="text-zinc-200 font-black uppercase text-[11px] tracking-wider block">
                          Delivery Charge
                        </span>
                        <span className="font-black text-emerald-300 text-base">
                          {zone.deliveryCharge === 0 ? "FREE" : `₹${zone.deliveryCharge}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-200 font-black uppercase text-[11px] tracking-wider block">
                          Est. Delivery
                        </span>
                        <span className="font-black text-cyan-300 text-base">
                          {zone.estimatedDeliveryTime}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-200 font-black uppercase text-[11px] tracking-wider block">
                          Min Order
                        </span>
                        <span className="font-black text-amber-300 text-base">
                          ₹{zone.minOrderAmount}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-200 font-black uppercase text-[11px] tracking-wider block">
                          Priority (Overlaps)
                        </span>
                        <span className="font-black text-purple-300 text-base">
                          P{zone.priority}
                        </span>
                      </div>
                    </div>

                    {/* Product Assignment Badge */}
                    <div className="text-xs font-black text-zinc-200 flex items-center justify-between pt-1">
                      <span>
                        Scope:{" "}
                        <strong className="text-white capitalize">
                          {zone.assignedType === "all"
                            ? "All Catalog Items"
                            : zone.assignedType === "categories"
                            ? `${zone.assignedCategories?.length || 0} Categories`
                            : `${zone.assignedProducts?.length || 0} Products`}
                        </strong>
                      </span>
                      <span className="bg-zinc-800 px-3 py-1 rounded-lg text-xs font-black text-white border-2 border-zinc-600">
                        {vertexCount} Corners
                      </span>
                    </div>
                  </div>

                  {/* Zone Actions */}
                  <div className="pt-4 border-t-2 border-zinc-800 flex items-center justify-end gap-2.5 mt-4">
                    <button
                      onClick={() => handleOpenEdit(zone)}
                      className="px-4 py-2 text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all cursor-pointer border-2 border-indigo-400 shadow-md"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDeleteZone(zone._id, zone.name)}
                      className="px-4 py-2 text-xs font-black bg-rose-700 hover:bg-rose-600 text-white rounded-xl transition-all cursor-pointer border-2 border-rose-400 shadow-md"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Geospatial Testing & Verification Simulator - Ultra High Contrast */}
      <div className="bg-zinc-950 rounded-3xl p-6 border-2 border-indigo-400 shadow-2xl shadow-indigo-950/60 space-y-4">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <span>🧪</span> Location & Serviceability Verification Simulator
          </h2>
          <p className="text-xs font-bold text-zinc-100 mt-1">
            Input any latitude & longitude to verify which delivery zone is detected and what products are eligible.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <label className="font-black text-cyan-300 uppercase tracking-wider">Lat:</label>
            <input
              type="text"
              value={simLat}
              onChange={(e) => setSimLat(e.target.value)}
              placeholder="30.7102"
              className="w-32 px-4 py-2.5 bg-zinc-900 text-white font-black border-2 border-zinc-600 focus:border-cyan-400 rounded-xl text-xs"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <label className="font-black text-cyan-300 uppercase tracking-wider">Lng:</label>
            <input
              type="text"
              value={simLng}
              onChange={(e) => setSimLng(e.target.value)}
              placeholder="76.6936"
              className="w-32 px-4 py-2.5 bg-zinc-900 text-white font-black border-2 border-zinc-600 focus:border-cyan-400 rounded-xl text-xs"
            />
          </div>

          <button
            onClick={handleRunSimulator}
            disabled={simTesting}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-black font-black rounded-xl text-xs shadow-xl shadow-emerald-400/30 border-2 border-emerald-200 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
          >
            {simTesting ? "Testing..." : "Test Coordinates"}
          </button>
        </div>

        {/* Simulator Results Output */}
        {simResult && (
          <div
            className={`mt-4 p-5 rounded-2xl border-2 text-xs space-y-3 shadow-2xl ${
              simResult.serviceInfo?.serviceable
                ? "bg-emerald-950 border-2 border-emerald-400 text-emerald-100 shadow-emerald-950/60"
                : "bg-rose-950 border-2 border-rose-400 text-rose-100 shadow-rose-950/60"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {simResult.serviceInfo?.serviceable ? "✅" : "❌"}
              </span>
              <div>
                <span className="font-black text-base block text-white">
                  {simResult.serviceInfo?.serviceable
                    ? `Matched Zone: ${simResult.serviceInfo?.zone?.name}`
                    : "No Delivery Zone Covers This Coordinate"}
                </span>
                <span className="text-zinc-100 font-bold mt-0.5 block">
                  {simResult.serviceInfo?.message}
                </span>
              </div>
            </div>

            {simResult.serviceInfo?.serviceable && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t-2 border-emerald-800 text-xs">
                <div>
                  <span className="text-emerald-200 font-black uppercase text-[11px] block">
                    Delivery Charge:
                  </span>
                  <span className="font-black text-white text-base">₹{simResult.serviceInfo.deliveryCharge}</span>
                </div>
                <div>
                  <span className="text-emerald-200 font-black uppercase text-[11px] block">
                    Est. Time:
                  </span>
                  <span className="font-black text-white text-base">{simResult.serviceInfo.estimatedDeliveryTime}</span>
                </div>
                <div>
                  <span className="text-emerald-200 font-black uppercase text-[11px] block">
                    Min Order:
                  </span>
                  <span className="font-black text-white text-base">₹{simResult.serviceInfo.minOrderAmount}</span>
                </div>
                <div>
                  <span className="text-emerald-200 font-black uppercase text-[11px] block">
                    Eligible Products:
                  </span>
                  <span className="font-black text-amber-300 text-base">
                    {simResult.productsInfo?.products?.length || 0} products
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create / Edit Zone Modal - Ultra High Contrast Glass & Vibrant Neon */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 text-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh] border-2 border-indigo-400 shadow-2xl shadow-indigo-600/40">
            {/* Modal Header */}
            <div className="p-6 border-b-2 border-zinc-800 flex items-center justify-between bg-zinc-900">
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                <span className="p-2 bg-indigo-600 text-white rounded-xl shadow-md text-lg">📍</span>
                <span>{editingZoneId ? "Edit Delivery Zone" : "Create New Delivery Zone"}</span>
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-rose-600 text-white font-black flex items-center justify-center transition-all cursor-pointer border-2 border-zinc-600 hover:border-rose-400 shadow-md text-base"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveZone} className="p-6 overflow-y-auto space-y-6">
              {/* Basic Zone Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-cyan-300 uppercase tracking-wider block mb-2">
                    Zone Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Mohali Express Delivery"
                    className="w-full px-4 py-3 text-sm bg-zinc-900 text-white placeholder-zinc-400 font-black border-2 border-zinc-600 focus:border-cyan-400 rounded-xl focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-cyan-300 uppercase tracking-wider block mb-2">
                    Map Polygon Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-14 h-12 p-1 bg-zinc-900 border-2 border-zinc-600 rounded-xl cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="flex-1 px-4 py-3 text-sm bg-zinc-900 text-white font-mono font-black border-2 border-zinc-600 rounded-xl"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-black text-cyan-300 uppercase tracking-wider block mb-2">
                    Description / Notes
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g. Covers Phase 1 to Phase 8 with 30-min express bike delivery"
                    className="w-full px-4 py-3 text-sm bg-zinc-900 text-white placeholder-zinc-400 font-bold border-2 border-zinc-600 rounded-xl"
                  />
                </div>
              </div>

              {/* Delivery Rates & Rules */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-black text-amber-300 uppercase tracking-wider block mb-2">
                    Delivery Charge (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.deliveryCharge}
                    onChange={(e) =>
                      setFormData({ ...formData, deliveryCharge: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2.5 text-sm bg-zinc-900 text-white font-black border-2 border-zinc-600 focus:border-amber-400 rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-amber-300 uppercase tracking-wider block mb-2">
                    Min Order Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.minOrderAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, minOrderAmount: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2.5 text-sm bg-zinc-900 text-white font-black border-2 border-zinc-600 focus:border-amber-400 rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-emerald-300 uppercase tracking-wider block mb-2">
                    Est. Delivery Time
                  </label>
                  <input
                    type="text"
                    value={formData.estimatedDeliveryTime}
                    onChange={(e) =>
                      setFormData({ ...formData, estimatedDeliveryTime: e.target.value })
                    }
                    placeholder="e.g. 25-35 mins"
                    className="w-full px-4 py-2.5 text-sm bg-zinc-900 text-white font-black border-2 border-zinc-600 focus:border-emerald-400 rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-purple-300 uppercase tracking-wider block mb-2">
                    Priority (For Overlaps)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: parseInt(e.target.value, 10) || 1 })
                    }
                    title="Higher priority takes precedence when polygons overlap"
                    className="w-full px-4 py-2.5 text-sm bg-zinc-900 text-white font-black border-2 border-zinc-600 focus:border-purple-400 rounded-xl"
                  />
                </div>
              </div>

              {/* Product / Category Assignment */}
              <div className="space-y-4 p-5 bg-zinc-900 rounded-2xl border-2 border-zinc-700 shadow-xl">
                <label className="text-xs font-black text-amber-300 uppercase tracking-wider block">
                  Assign Products to this Delivery Zone
                </label>
                <div className="flex flex-wrap gap-3 text-xs">
                  <label
                    className={`flex items-center gap-3 cursor-pointer font-black px-4 py-3 rounded-xl transition-all border-2 shadow-md ${
                      formData.assignedType === "all"
                        ? "bg-indigo-600 text-white border-indigo-300 shadow-indigo-600/50"
                        : "bg-zinc-950 text-white border-zinc-600 hover:border-zinc-400"
                    }`}
                  >
                    <input
                      type="radio"
                      name="assignedType"
                      checked={formData.assignedType === "all"}
                      onChange={() => setFormData({ ...formData, assignedType: "all" })}
                      className="accent-white w-4 h-4 cursor-pointer"
                    />
                    <span className="text-white text-xs font-black">All Products in Store</span>
                  </label>
                  <label
                    className={`flex items-center gap-3 cursor-pointer font-black px-4 py-3 rounded-xl transition-all border-2 shadow-md ${
                      formData.assignedType === "categories"
                        ? "bg-indigo-600 text-white border-indigo-300 shadow-indigo-600/50"
                        : "bg-zinc-950 text-white border-zinc-600 hover:border-zinc-400"
                    }`}
                  >
                    <input
                      type="radio"
                      name="assignedType"
                      checked={formData.assignedType === "categories"}
                      onChange={() => setFormData({ ...formData, assignedType: "categories" })}
                      className="accent-white w-4 h-4 cursor-pointer"
                    />
                    <span className="text-white text-xs font-black">Specific Product Categories</span>
                  </label>
                  <label
                    className={`flex items-center gap-3 cursor-pointer font-black px-4 py-3 rounded-xl transition-all border-2 shadow-md ${
                      formData.assignedType === "products"
                        ? "bg-indigo-600 text-white border-indigo-300 shadow-indigo-600/50"
                        : "bg-zinc-950 text-white border-zinc-600 hover:border-zinc-400"
                    }`}
                  >
                    <input
                      type="radio"
                      name="assignedType"
                      checked={formData.assignedType === "products"}
                      onChange={() => setFormData({ ...formData, assignedType: "products" })}
                      className="accent-white w-4 h-4 cursor-pointer"
                    />
                    <span className="text-white text-xs font-black">Selected Products Only</span>
                  </label>
                </div>

                {/* Categories Checkboxes */}
                {formData.assignedType === "categories" && (
                  <div className="pt-2">
                    <span className="text-xs font-black text-amber-300 uppercase tracking-wider block mb-2.5">
                      Select Eligible Categories:
                    </span>
                    <div className="flex flex-wrap gap-2.5">
                      {categoryOptions.map((cat) => {
                        const checked = formData.assignedCategories.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => handleToggleCategory(cat)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer shadow-md ${
                              checked
                                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-indigo-200 shadow-indigo-500/50"
                                : "bg-zinc-950 hover:bg-zinc-800 text-white border-zinc-600 hover:border-zinc-400"
                            }`}
                          >
                            {checked ? "✓ " : "+ "} {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Specific Products Checkboxes */}
                {formData.assignedType === "products" && (
                  <div className="pt-2 space-y-2">
                    <span className="text-xs font-black text-amber-300 uppercase tracking-wider block">
                      Select Eligible Products ({formData.assignedProducts.length} selected):
                    </span>
                    <div className="max-h-48 overflow-y-auto divide-y divide-zinc-700 bg-zinc-950 border-2 border-zinc-600 rounded-2xl p-3 shadow-inner">
                      {availableProducts.map((prod) => {
                        const checked = formData.assignedProducts.includes(prod._id);
                        return (
                          <label
                            key={prod._id}
                            className="flex items-center justify-between p-3 hover:bg-zinc-900 rounded-xl cursor-pointer text-xs transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleToggleProduct(prod._id)}
                                className="accent-indigo-500 w-4 h-4 cursor-pointer"
                              />
                              <span className="font-black text-white text-xs">
                                {prod.title}
                              </span>
                            </div>
                            <span className="text-emerald-300 font-black text-sm">₹{prod.price}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Map Polygon Boundary Drawer */}
              <div className="space-y-2">
                <label className="text-xs font-black text-cyan-300 uppercase tracking-wider block">
                  Draw Zone Boundary on Map *
                </label>
                <DeliveryZoneMapEditor
                  initialCoordinates={formData.boundaryCoordinates}
                  onChangeCoordinates={handleCoordinatesChange}
                  allZones={otherZones}
                  activeColor={formData.color}
                />
              </div>

              {/* Submit Buttons */}
              <div className="p-5 border-t-2 border-zinc-800 flex items-center justify-end gap-3 bg-zinc-900">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 text-xs font-black text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-all cursor-pointer border-2 border-zinc-500 hover:border-zinc-300 shadow-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl text-xs font-black shadow-xl shadow-indigo-500/60 border-2 border-indigo-300 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  {isSubmitting
                    ? "Saving Zone..."
                    : editingZoneId
                    ? "Update Delivery Zone"
                    : "Create Delivery Zone"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

