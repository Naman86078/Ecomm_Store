export const metadata = {
  title: "Checkout Cancelled",
  description:
    "Your payment was cancelled. Your selected cart items have been preserved for when you return.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Checkout Cancelled | NovaStore",
    description:
      "Your payment was cancelled. Your selected cart items have been preserved for when you return.",
    url: "/cancel",
    type: "website",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "NovaStore Checkout Cancelled",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Checkout Cancelled | NovaStore",
    description:
      "Your payment was cancelled. Your selected cart items have been preserved for when you return.",
    images: ["/og-image.svg"],
  },
};

export default function CancelLayout({ children }) {
  return children;
}
