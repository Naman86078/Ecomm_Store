export const metadata = {
  title: "Create an Account",
  description:
    "Join NovaStore for hyper-local product delivery, live GPS route tracking, and instant delivery serviceability.",
  alternates: {
    canonical: "/signup",
  },
  openGraph: {
    title: "Create an Account | NovaStore",
    description:
      "Join NovaStore for hyper-local product delivery, live GPS route tracking, and instant delivery serviceability.",
    url: "/signup",
    type: "website",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "NovaStore Sign Up",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Create an Account | NovaStore",
    description:
      "Join NovaStore for hyper-local product delivery, live GPS route tracking, and instant delivery serviceability.",
    images: ["/og-image.svg"],
  },
};

export default function SignupLayout({ children }) {
  return children;
}
