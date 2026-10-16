"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function PWARegistration() {
  const pathname = usePathname();

  useEffect(() => {
    // 1. HARD BLOCK ON ADMIN PANEL: Strip manifest & do not touch service worker
    if (pathname?.startsWith("/admin")) {
      if (typeof document !== "undefined") {
        const manifests = document.querySelectorAll('link[rel="manifest"]');
        manifests.forEach((m) => m.remove());
        const pwaMetas = document.querySelectorAll(
          'meta[name="mobile-web-app-capable"], meta[name="apple-mobile-web-app-capable"]'
        );
        pwaMetas.forEach((m) => m.remove());
      }
      return;
    }

    // 2. ATTACH PWA ONLY ON CUSTOMER STOREFRONT
    if (typeof document !== "undefined") {
      let manifestLink = document.querySelector('link[rel="manifest"]');
      if (!manifestLink) {
        manifestLink = document.createElement("link");
        manifestLink.rel = "manifest";
        manifestLink.href = "/manifest.json";
        document.head.appendChild(manifestLink);
      }
    }

    // 3. Register Service Worker on customer side
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      window.location.protocol.startsWith("http")
    ) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          registration.onupdatefound = () => {
            const installing = registration.installing;
            if (installing) {
              installing.onstatechange = () => {
                if (
                  installing.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  console.log("NovaStore PWA updated.");
                }
              };
            }
          };
        })
        .catch(() => {});
    }
  }, [pathname]);

  return null;
}
