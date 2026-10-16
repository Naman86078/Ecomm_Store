export const metadata = {
  title: "Rider Fleet & Dispatch Console",
  description:
    "Dedicated delivery partner console for real-time route navigation, live customer order pickup, and telemetry broadcast.",
  alternates: {
    canonical: "/rider/login",
  },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Rider Fleet & Dispatch Console | NovaStore",
    description:
      "Dedicated delivery partner console for real-time route navigation, live customer order pickup, and telemetry broadcast.",
    url: "/rider/login",
    type: "website",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "NovaStore Rider Fleet",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rider Fleet & Dispatch Console | NovaStore",
    description:
      "Dedicated delivery partner console for real-time route navigation, live customer order pickup, and telemetry broadcast.",
    images: ["/og-image.svg"],
  },
};

export default function RiderLayout({ children }) {
  return children;
}
