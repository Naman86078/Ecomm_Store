import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CartDrawer from "@/components/CartDrawer";
import PWARegistration from "@/components/PWARegistration";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"),
  title: {
    default: "NovaStore | Fast Delivery & Modern E-Commerce",
    template: "%s | NovaStore",
  },
  description:
    "Browse premium products, enjoy instant geospatial delivery serviceability, seamless Stripe payments, and live real-time GPS delivery tracking to your doorstep.",
  applicationName: "NovaStore",
  authors: [{ name: "NovaStore Team" }],
  generator: "Next.js",
  keywords: [
    "NovaStore",
    "Ecommerce",
    "Hyperlocal Delivery",
    "Live GPS Tracking",
    "Delivery Zones",
    "Online Shopping",
    "Stripe Checkout",
    "Fast Grocery & Products",
  ],
  creator: "NovaStore",
  publisher: "NovaStore",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: [
      { url: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "NovaStore",
    title: "NovaStore | Fast Delivery & Modern E-Commerce",
    description:
      "Shop top-tier products with instant geospatial serviceability verification, secure Stripe payments, and live interactive GPS delivery tracking.",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "NovaStore E-Commerce & Live GPS Delivery",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NovaStore | Fast Delivery & Modern E-Commerce",
    description:
      "Shop top-tier products with instant geospatial serviceability verification, secure Stripe payments, and live interactive GPS delivery tracking.",
    creator: "@novastore",
    images: ["/og-image.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <style dangerouslySetInnerHTML={{
          __html: `
            nextjs-portal,
            [data-nextjs-dev-indicator],
            [data-nextjs-toast],
            #nextjs-dev-indicator,
            #__next-build-watcher {
              display: none !important;
              opacity: 0 !important;
              visibility: hidden !important;
              pointer-events: none !important;
              transform: scale(0) !important;
            }
          `
        }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  function killDevIndicator() {
                    const portals = document.querySelectorAll('nextjs-portal');
                    for (let i = 0; i < portals.length; i++) {
                      portals[i].style.setProperty('display', 'none', 'important');
                      portals[i].remove();
                    }
                  }
                  killDevIndicator();
                  setInterval(killDevIndicator, 250);

                  // If on admin routes, actively strip manifest and service worker
                  if (window.location.pathname.startsWith('/admin')) {
                    if ('serviceWorker' in navigator) {
                      navigator.serviceWorker.getRegistrations().then(function(regs) {
                        for (let i = 0; i < regs.length; i++) {
                          regs[i].unregister();
                        }
                      });
                    }
                    const manifests = document.querySelectorAll('link[rel="manifest"]');
                    for (let j = 0; j < manifests.length; j++) {
                      manifests[j].remove();
                    }
                    if ('caches' in window) {
                      caches.keys().then(function(keys) {
                        for (let k = 0; k < keys.length; k++) {
                          caches.delete(keys[k]);
                        }
                      });
                    }
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className="min-h-full flex flex-col bg-neutral-50 text-neutral-900 font-sans selection:bg-indigo-500 selection:text-white"
        suppressHydrationWarning
      >
        <PWARegistration />
        {children}
        <CartDrawer />
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
