import AdminClientLayout from "@/components/AdminClientLayout";

export const metadata = {
  title: "Admin Command Center",
  description:
    "Executive administrative dashboard for NovaStore product catalog, geospatial delivery zones, customer refunds, and fleet dispatch.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Admin Command Center | NovaStore",
    description:
      "Executive administrative dashboard for NovaStore product catalog, geospatial delivery zones, customer refunds, and fleet dispatch.",
    url: "/admin/dashboard",
    type: "website",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "NovaStore Admin Command Center",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Admin Command Center | NovaStore",
    description:
      "Executive administrative dashboard for NovaStore product catalog, geospatial delivery zones, customer refunds, and fleet dispatch.",
    images: ["/og-image.svg"],
  },
};

export default function AdminLayout({ children }) {
  return <AdminClientLayout>{children}</AdminClientLayout>;
}
