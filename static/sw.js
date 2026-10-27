/**
 * World of Trade - Sovereign PWA Service Worker (v14-apeda-suite)
 * Offline Mandi Packhouse Mode & Runtime Cache with Complete Dossier Offline Pre-Caching
 * 100% Native Web Standards (Zero External Libraries)
 */

const CACHE_NAME = 'world-of-trade-v27-compact-live-wire';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/practice-lab',
  '/practice-lab.html',
  '/app.js',
  '/manifest.json',
  '/tailwind.min.css',
  '/chart.min.js',
  '/marked.min.js',
  '/sw.js',
  '/data/morning_mandi_rates.json',
  '/career-pathway-a.pdf',
  '/career-pathway-b.pdf',
  '/career-pathway-c.pdf',
  '/ev-assembly-dossier.pdf',
  '/executive-outreach-toolkit.pdf',
  '/mandi-strategy-1.pdf',
  '/mandi-strategy-2.pdf',
  '/mandi-strategy-3.pdf',
  '/sector-rotation-playbook.pdf',
  '/strategy-a.pdf',
  '/strategy-b.pdf',
  '/strategy-c.pdf'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Pre-caching partial failure', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Interactive Message Handler for On-Demand Caching with Progress
self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'CACHE_ALL_DOSSIERS') {
    const pdfUrls = [
      '/career-pathway-a.pdf',
      '/career-pathway-b.pdf',
      '/career-pathway-c.pdf',
      '/ev-assembly-dossier.pdf',
      '/executive-outreach-toolkit.pdf',
      '/mandi-strategy-1.pdf',
      '/mandi-strategy-2.pdf',
      '/mandi-strategy-3.pdf',
      '/sector-rotation-playbook.pdf',
      '/strategy-a.pdf',
      '/strategy-b.pdf',
      '/strategy-c.pdf',
      '/data/morning_mandi_rates.json'
    ];
    
    try {
      const cache = await caches.open(CACHE_NAME);
      let count = 0;
      for (const url of pdfUrls) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            await cache.put(url, res);
            count++;
            if (event.source) {
              event.source.postMessage({
                type: 'CACHE_PROGRESS',
                current: count,
                total: pdfUrls.length,
                url: url
              });
            }
          }
        } catch (fetchErr) {
          console.warn('[SW] Error caching item:', url, fetchErr);
        }
      }
      if (event.source) {
        event.source.postMessage({
          type: 'CACHE_COMPLETE',
          total: count
        });
      }
    } catch (err) {
      if (event.source) {
        event.source.postMessage({
          type: 'CACHE_ERROR',
          error: err.message
        });
      }
    }
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignore non-GET requests
  if (req.method !== 'GET') {
    return;
  }

  // Handle API queries with Network-First, Cache-Fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // NETWORK-FIRST FOR HTML PAGES & NAVIGATION (Guarantees user always sees latest version)
  const isHtml = req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html') || url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname === '/practice-lab';
  if (isHtml) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkRes;
        })
        .catch(() => {
          return caches.match(req).then((cached) => cached || caches.match('/'));
        })
    );
    return;
  }

  // Handle Static Assets & PDFs with Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        fetch(req).then((networkRes) => {
          if (networkRes.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, networkRes));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(req).then((networkRes) => {
        if (networkRes.status === 200) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return networkRes;
      });
    })
  );
});
