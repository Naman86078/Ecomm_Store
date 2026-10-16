const CACHE_NAME = "novastore-customer-pwa-v1";

const PRECACHE_URLS = [
  "/",
  "/offline",
  "/icon.svg",
  "/icon-192.svg",
  "/icon-512.svg",
];

// Install: precache customer storefront assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn("PWA pre-cache error:", err))
  );
});

// Activate: clean up older caches and purge any admin data
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        )
      )
      .then(() =>
        caches.open(CACHE_NAME).then((cache) =>
          cache.keys().then((requests) =>
            Promise.all(
              requests
                .filter((req) => req.url.includes("/admin"))
                .map((req) => cache.delete(req))
            )
          )
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: Handle only customer storefront requests; HARD-BYPASS all admin routes
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Only handle same-origin GET requests
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // 2. ABSOLUTE BYPASS FOR ADMIN PANEL & API ENDPOINTS
  if (
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/api/admin") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/ws")
  ) {
    return;
  }

  // 3. Customer Navigation requests (HTML pages)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          const offlinePage = await caches.match("/offline");
          if (offlinePage) return offlinePage;
          return new Response("You are currently offline.", {
            headers: { "Content-Type": "text/plain" },
          });
        })
    );
    return;
  }

  // 4. Static assets (images, styles, scripts, fonts)
  if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "image" ||
    request.destination === "font"
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
  }
});
