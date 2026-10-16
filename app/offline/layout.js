export const metadata = {
  title: "Offline Mode",
  description:
    "You are currently disconnected from the internet. NovaStore saved offline features remain available.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Offline Mode | NovaStore",
    description:
      "You are currently disconnected from the internet. NovaStore saved offline features remain available.",
    url: "/offline",
    type: "website",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "NovaStore Offline",
      },
    ],
  },
};

export default function OfflineLayout({ children }) {
  return children;
}
