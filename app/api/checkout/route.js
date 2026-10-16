import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Order from "@/models/Order";
import DeliveryZone from "@/models/DeliveryZone";
import {
  isValidCoordinate,
  isPointInPolygon,
  pickBestDeliveryZone,
} from "@/lib/geoUtils";

export async function POST(request) {
  try {
    const body = await request.json();
    const { items, customerEmail, customerName, deliveryLocation } = body;

    // 0. Enforce customer sign in / authentication before ordering
    if (!customerEmail || typeof customerEmail !== "string" || !customerEmail.includes("@")) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required. Please sign in or create an account before placing an order.",
        },
        { status: 401 }
      );
    }

    // 1. Validate cart items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "Cart is empty. Please add items to checkout." },
        { status: 400 }
      );
    }

    await connectDB();

    // 2. Validate and check delivery serviceability
    let applicableZone = null;
    let deliveryCharge = 0;

    // Check if any active delivery zones exist in the system
    const activeZoneCount = await DeliveryZone.countDocuments({ isActive: true });

    if (activeZoneCount > 0) {
      if (
        !deliveryLocation ||
        deliveryLocation.lat === undefined ||
        deliveryLocation.lng === undefined
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Delivery location is required. Please select your delivery address on the map before checkout.",
          },
          { status: 400 }
        );
      }

      const lat = parseFloat(deliveryLocation.lat);
      const lng = parseFloat(deliveryLocation.lng);

      if (!isValidCoordinate(lat, lng)) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Invalid delivery coordinates. Please choose a valid location on the map.",
          },
          { status: 400 }
        );
      }

      // Query MongoDB $geoIntersects
      let matchingZones = [];
      try {
        matchingZones = await DeliveryZone.find({
          isActive: true,
          boundary: {
            $geoIntersects: {
              $geometry: {
                type: "Point",
                coordinates: [lng, lat], // GeoJSON order: [lon, lat]
              },
            },
          },
        }).lean();
      } catch (geoErr) {
        console.warn("MongoDB $geoIntersects fallback:", geoErr.message);
      }

      // In-memory fallback if 2dsphere index is indexing
      if (!matchingZones || matchingZones.length === 0) {
        const allActive = await DeliveryZone.find({ isActive: true }).lean();
        matchingZones = allActive.filter((zone) => {
          const ring = zone?.boundary?.coordinates?.[0];
          return ring ? isPointInPolygon([lng, lat], ring) : false;
        });
      }

      if (!matchingZones || matchingZones.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Selected delivery address is outside our serviceable delivery zones.",
          },
          { status: 400 }
        );
      }

      // Pick best matching zone (resolving overlapping zones)
      applicableZone = pickBestDeliveryZone(matchingZones);
      deliveryCharge = Number(applicableZone.deliveryCharge) || 0;
    }

    // 3. Calculate subtotal & check zone minimum order amount
    const subtotal = items.reduce(
      (acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1),
      0
    );

    if (applicableZone && applicableZone.minOrderAmount > 0) {
      if (subtotal < applicableZone.minOrderAmount) {
        return NextResponse.json(
          {
            success: false,
            message: `Minimum order amount for ${applicableZone.name} is ₹${applicableZone.minOrderAmount}. Your current cart subtotal is ₹${subtotal.toFixed(2)}.`,
          },
          { status: 400 }
        );
      }
    }

    const totalAmount = subtotal + deliveryCharge;
    const orderNumber = "ORD-" + Math.floor(100000 + Math.random() * 900000);

    const deliveryAddressSnapshot = {
      address: deliveryLocation?.address || "Selected Map Location",
      coordinates: {
        lat: deliveryLocation?.lat ? Number(deliveryLocation.lat) : undefined,
        lng: deliveryLocation?.lng ? Number(deliveryLocation.lng) : undefined,
      },
    };

    const deliveryZoneSnapshot = applicableZone
      ? {
          zoneId: applicableZone._id ? applicableZone._id.toString() : "",
          name: applicableZone.name,
          deliveryCharge: deliveryCharge,
          estimatedDeliveryTime: applicableZone.estimatedDeliveryTime || "30-45 mins",
          minOrderAmount: Number(applicableZone.minOrderAmount) || 0,
        }
      : {
          zoneId: "",
          name: "Standard Delivery",
          deliveryCharge: 0,
          estimatedDeliveryTime: "Standard",
          minOrderAmount: 0,
        };

    const host = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    // Check if user has configured an active Stripe Secret Key
    const isMockStripe = !stripeSecretKey || stripeSecretKey.includes("placeholder");

    if (isMockStripe) {
      // Demo Mode: Allows immediate testing of checkout success flow without a real Stripe key
      const demoSessionId = "demo_cs_" + Math.random().toString(36).substring(2, 12);

      await Order.create({
        orderNumber,
        customerName: customerName || "Customer",
        customerEmail: customerEmail || "customer@example.com",
        items: items.map((item) => ({
          productId: item._id || "",
          title: item.title || "Product",
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1,
          imageUrl: item.imageUrl || "",
        })),
        subtotal,
        deliveryCharge,
        totalAmount,
        deliveryAddress: deliveryAddressSnapshot,
        deliveryZone: deliveryZoneSnapshot,
        stripeSessionId: demoSessionId,
        status: "paid",
      });

      return NextResponse.json({
        success: true,
        url: `${host}/success?session_id=${demoSessionId}&order_number=${orderNumber}&total=${totalAmount.toFixed(2)}&mock=true`,
        isMock: true,
        message: "Stripe key not configured. Redirecting via Demo Checkout mode.",
      });
    }

    // Format line items for Stripe Checkout
    const line_items = items.map((item) => {
      const unitAmountInCents = Math.round(Number(item.price) * 100);
      return {
        price_data: {
          currency: "inr",
          product_data: {
            name: item.title || "Store Item",
            description: item.description?.substring(0, 200) || undefined,
            images: item.imageUrl && item.imageUrl.startsWith("http") ? [item.imageUrl] : [],
          },
          unit_amount: unitAmountInCents,
        },
        quantity: Math.max(1, parseInt(item.quantity || 1, 10)),
      };
    });

    // Add Delivery Charge as separate line item in Stripe if > 0
    if (deliveryCharge > 0) {
      line_items.push({
        price_data: {
          currency: "inr",
          product_data: {
            name: `Delivery Charge (${applicableZone.name})`,
            description: `Delivery fee for ${applicableZone.name} (Est: ${applicableZone.estimatedDeliveryTime})`,
          },
          unit_amount: Math.round(deliveryCharge * 100),
        },
        quantity: 1,
      });
    }

    // Try using stripe package if installed, otherwise use standard Stripe REST API
    let checkoutUrl = null;

    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeSecretKey);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items,
        success_url: `${host}/success?session_id={CHECKOUT_SESSION_ID}&order_number=${orderNumber}&total=${totalAmount.toFixed(2)}`,
        cancel_url: `${host}/cancel`,
        customer_email: customerEmail || undefined,
        billing_address_collection: "auto",
        shipping_address_collection: {
          allowed_countries: ["US", "CA", "GB", "IN", "AU", "DE", "FR"],
        },
      });

      await Order.create({
        orderNumber,
        customerName: customerName || "Customer",
        customerEmail: customerEmail || "customer@example.com",
        items: items.map((item) => ({
          productId: item._id || "",
          title: item.title || "Product",
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1,
          imageUrl: item.imageUrl || "",
        })),
        subtotal,
        deliveryCharge,
        totalAmount,
        deliveryAddress: deliveryAddressSnapshot,
        deliveryZone: deliveryZoneSnapshot,
        stripeSessionId: session.id,
        stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : "",
        status: "paid",
      });

      checkoutUrl = session.url;
    } catch (sdkError) {
      // Fallback directly to Stripe REST API using native fetch
      const formData = new URLSearchParams();
      formData.append("mode", "payment");
      formData.append("success_url", `${host}/success?session_id={CHECKOUT_SESSION_ID}&order_number=${orderNumber}&total=${totalAmount.toFixed(2)}`);
      formData.append("cancel_url", `${host}/cancel`);
      formData.append("payment_method_types[0]", "card");
      if (customerEmail) {
        formData.append("customer_email", customerEmail);
      }

      line_items.forEach((item, index) => {
        formData.append(`line_items[${index}][price_data][currency]`, "inr");
        formData.append(`line_items[${index}][price_data][unit_amount]`, item.price_data.unit_amount.toString());
        formData.append(`line_items[${index}][price_data][product_data][name]`, item.price_data.product_data.name);
        if (item.price_data.product_data.images && item.price_data.product_data.images[0]) {
          formData.append(`line_items[${index}][price_data][product_data][images][0]`, item.price_data.product_data.images[0]);
        }
        formData.append(`line_items[${index}][quantity]`, item.quantity.toString());
      });

      const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const stripeData = await stripeResponse.json();

      if (!stripeResponse.ok) {
        throw new Error(stripeData.error?.message || "Failed to create Stripe Checkout Session");
      }

      await Order.create({
        orderNumber,
        customerName: customerName || "Customer",
        customerEmail: customerEmail || "customer@example.com",
        items: items.map((item) => ({
          productId: item._id || "",
          title: item.title || "Product",
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1,
          imageUrl: item.imageUrl || "",
        })),
        subtotal,
        deliveryCharge,
        totalAmount,
        deliveryAddress: deliveryAddressSnapshot,
        deliveryZone: deliveryZoneSnapshot,
        stripeSessionId: stripeData.id || "",
        status: "paid",
      });

      checkoutUrl = stripeData.url;
    }

    return NextResponse.json({
      success: true,
      url: checkoutUrl,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "An error occurred during checkout",
      },
      { status: 500 }
    );
  }
}

