"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function PWAInstallPrompt() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Strictly disable on all admin routes
    if (pathname?.startsWith("/admin")) {
      setShowPrompt(false);
      return;
    }

    // Check if dismissed in this session
    const dismissed = sessionStorage.getItem("pwa_install_dismissed");
    if (dismissed) return;

    // Check if already in standalone PWA mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    if (isStandalone) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    if (isIosDevice) {
      setIsIOS(true);
      const timer = setTimeout(() => setShowPrompt(true), 4000);
      return () => clearTimeout(timer);
    }

    // Android / Chrome / Edge beforeinstallprompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, [pathname]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem("pwa_install_dismissed", "true");
  };

  // Do not render on admin panel or if prompt is not triggered
  if (pathname?.startsWith("/admin") || !showPrompt) {
    return null;
  }

  return (
    <aside
      aria-label="Install NovaStore App"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-neutral-900/95 backdrop-blur-md text-white border-2 border-emerald-500/50 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center text-2xl shadow-md border border-emerald-300/30 shrink-0">
          🛍️
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-black text-white flex items-center gap-1.5">
            Install NovaStore App
            <span className="text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.2 rounded-full">
              PWA
            </span>
          </h4>
          <p className="text-xs text-neutral-300 truncate">
            {isIOS
              ? "Tap Share ⎋ then 'Add to Home Screen' 📲"
              : "Install for fast access & live GPS dispatch"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!isIOS && deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
          >
            Install
          </button>
        )}
        <button
          onClick={handleDismiss}
          className="p-1.5 text-neutral-400 hover:text-white rounded-lg text-xs transition cursor-pointer"
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </aside>
  );
}
