"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function AdminClientLayout({ children }) {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Set dedicated Admin favicon and title
      document.title = "Admin Portal | NovaStore";
      let favicon = document.querySelector("link[rel*='icon']");
      if (favicon) {
        favicon.href =
          "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛡️</text></svg>";
      }

      // Purge any registered service workers on admin pages
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const reg of registrations) {
            reg.unregister();
          }
        });
      }

      // Remove any lingering manifest link or mobile web app meta tags
      const manifestLink = document.querySelector('link[rel="manifest"]');
      if (manifestLink) manifestLink.remove();
      const pwaMetas = document.querySelectorAll(
        'meta[name="mobile-web-app-capable"], meta[name="apple-mobile-web-app-capable"]'
      );
      pwaMetas.forEach((m) => m.remove());

      // Kill Next.js dev indicator portal on admin screens
      const killPortals = () => {
        document.querySelectorAll("nextjs-portal").forEach((p) => {
          p.style.setProperty("display", "none", "important");
          p.remove();
        });
      };
      killPortals();
      const interval = setInterval(killPortals, 200);
      return () => clearInterval(interval);
    }
  }, []);

  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) {
    return (
      <div className="dark admin-root min-h-screen bg-zinc-950 text-white">
        {children}
      </div>
    );
  }

  return (
    <div className="dark admin-root min-h-screen bg-zinc-950 text-white">
      <Sidebar />
      <div className="flex-1 min-w-0 md:pl-64">{children}</div>
    </div>
  );
}
