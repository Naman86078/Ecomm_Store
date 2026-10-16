export const metadata = {
  title: "Customer Sign In",
  description:
    "Log in to your NovaStore customer account to access order tracking, saved addresses, and express delivery checkout.",
  alternates: {
    canonical: "/login",
  },
  openGraph: {
    title: "Customer Sign In | NovaStore",
    description:
      "Log in to your NovaStore customer account to access order tracking, saved addresses, and express delivery checkout.",
    url: "/login",
    type: "website",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "NovaStore Sign In",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Customer Sign In | NovaStore",
    description:
      "Log in to your NovaStore customer account to access order tracking, saved addresses, and express delivery checkout.",
    images: ["/og-image.svg"],
  },
};

export default function LoginLayout({ children }) {
  return children;
}
