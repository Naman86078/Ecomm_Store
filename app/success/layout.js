export const metadata = {
  title: "Order Confirmed & Placed",
  description:
    "Thank you for your order! Your payment was successful and your delivery is being prepared with live GPS tracking.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Order Confirmed & Placed | NovaStore",
    description:
      "Thank you for your order! Your payment was successful and your delivery is being prepared with live GPS tracking.",
    url: "/success",
    type: "website",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "NovaStore Order Confirmed",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Order Confirmed & Placed | NovaStore",
    description:
      "Thank you for your order! Your payment was successful and your delivery is being prepared with live GPS tracking.",
    images: ["/og-image.svg"],
  },
};

export default function SuccessLayout({ children }) {
  return children;
}
