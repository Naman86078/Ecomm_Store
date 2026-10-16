export const metadata = {
  title: "My Orders & Live Delivery Tracker",
  description:
    "Track your active orders with real-time street GPS telemetry, view receipt details, and monitor live delivery dispatch.",
  alternates: {
    canonical: "/orders",
  },
  openGraph: {
    title: "My Orders & Live Delivery Tracker | NovaStore",
    description:
      "Track your active orders with real-time street GPS telemetry, view receipt details, and monitor live delivery dispatch.",
    url: "/orders",
    type: "website",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "NovaStore Order Tracker",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "My Orders & Live Delivery Tracker | NovaStore",
    description:
      "Track your active orders with real-time street GPS telemetry, view receipt details, and monitor live delivery dispatch.",
    images: ["/og-image.svg"],
  },
};

export default function OrdersLayout({ children }) {
  return children;
}
