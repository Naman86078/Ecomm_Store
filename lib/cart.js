// Plain localStorage-based Cart & Delivery Location utility (No React Context)

export function getDeliveryLocation() {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem("novastore_delivery_location");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function saveDeliveryLocation(location) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("novastore_delivery_location", JSON.stringify(location));
    window.dispatchEvent(
      new CustomEvent("delivery-location-updated", { detail: location })
    );
  } catch (err) {
    console.error("Failed to save delivery location:", err);
  }
}

export function clearDeliveryLocation() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("novastore_delivery_location");
    window.dispatchEvent(
      new CustomEvent("delivery-location-updated", { detail: null })
    );
  } catch (err) {
    console.error("Failed to clear delivery location:", err);
  }
}

export function getCart() {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem("novastore_cart");
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function saveCart(items) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("novastore_cart", JSON.stringify(items));
    window.dispatchEvent(new Event("cart-updated"));
  } catch (err) {
    console.error("Failed to save cart:", err);
  }
}

export function addToCart(product, quantity = 1) {
  if (product.status === "out_of_stock") {
    alert("Sorry, this item is out of stock!");
    return;
  }

  const items = getCart();
  const existing = items.find((item) => item._id === product._id);
  let updated;

  if (existing) {
    updated = items.map((item) =>
      item._id === product._id ? { ...item, quantity: item.quantity + quantity } : item
    );
  } else {
    updated = [...items, { ...product, quantity }];
  }

  saveCart(updated);
  openCart();
}

export function updateQuantity(productId, newQuantity) {
  if (newQuantity <= 0) {
    removeFromCart(productId);
    return;
  }
  const items = getCart();
  const updated = items.map((item) =>
    item._id === productId ? { ...item, quantity: newQuantity } : item
  );
  saveCart(updated);
}

export function removeFromCart(productId) {
  const items = getCart();
  const updated = items.filter((item) => item._id !== productId);
  saveCart(updated);
}

export function clearCart() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("novastore_cart");
    window.dispatchEvent(new Event("cart-updated"));
  } catch (err) {
    console.error("Failed to clear cart:", err);
  }
}

export function openCart() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cart-toggle", { detail: true }));
  }
}

export function closeCart() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cart-toggle", { detail: false }));
  }
}

export async function checkout(customItems = null) {
  const itemsToPay = customItems || getCart();

  if (!itemsToPay || itemsToPay.length === 0) {
    alert("Your cart is empty. Please add items to checkout.");
    return;
  }

  // Check if customer is signed in / logged in before checkout
  let customerEmail = "";
  let customerName = "";
  try {
    const stored = localStorage.getItem("user");
    if (stored) {
      const u = JSON.parse(stored);
      customerEmail = u.email || "";
      customerName = u.name || "";
    }
  } catch {}

  if (!customerEmail) {
    alert("Please sign in or create an account before placing an order.");
    if (typeof window !== "undefined") {
      window.location.href = "/login?redirect=/";
    }
    return;
  }

  const deliveryLocation = getDeliveryLocation();

  try {

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: itemsToPay,
        customerEmail,
        customerName,
        deliveryLocation,
      }),
    });

    const data = await res.json();
    if (data.success && data.url) {
      window.location.href = data.url;
    } else {
      alert(data.message || "Failed to initiate Stripe Checkout.");
    }
  } catch (err) {
    console.error("Checkout request failed:", err);
    alert("Checkout error: " + err.message);
  }
}

export async function buyNow(product, quantity = 1) {
  if (product.status === "out_of_stock") {
    alert("This item is currently out of stock.");
    return;
  }
  await checkout([{ ...product, quantity }]);
}


