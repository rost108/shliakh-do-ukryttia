// Шлях до укриття — офлайн-кеш застосунку. Версія змінюється з кожною збіркою.
const VERSION = 'hh-6af09cf8a7';
const SHELL = ['./', 'index.html', '2d.html', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];
const EXTERNAL = ["https://cdnjs.cloudflare.com/ajax/libs/three.js/0.159.0/three.min.js"];   // 3D-рушій з cdnjs
const FONT_CSS = ["https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&family=Oswald:wght@500;600;700&display=swap"];      // шрифти Google: CSS + файли, щоб перший же офлайн-запуск мав усе

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(SHELL);
    for (const u of EXTERNAL){ try { await c.put(u, await fetch(u, { mode: 'no-cors' })); } catch (_) {} }
    for (const u of FONT_CSS){
      try {
        const r = await fetch(u, { mode: 'cors' }), css = await r.clone().text();
        await c.put(u, r);
        const files = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/g)].map(m => m[1]);
        await Promise.all(files.map(async f => { try { await c.put(f, await fetch(f, { mode: 'cors' })); } catch (_) {} }));
      } catch (_) {}
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate'){            // сторінки: спершу мережа (свіжа версія), без мережі — кеш
    e.respondWith((async () => {
      try {
        const r = await fetch(req);
        if (r.ok){ const c = await caches.open(VERSION); await c.put(req, r.clone()); }
        return r;
      } catch (_) {
        return (await caches.match(req, { ignoreSearch: true, ignoreVary: true })) || (await caches.match('index.html')) || Response.error();
      }
    })());
    return;
  }
  e.respondWith((async () => {             // решта: з кешу одразу, у фоні оновлюємо
    const hit = await caches.match(req, { ignoreVary: true });
    const net = fetch(req).then(async r => {
      if (r && (r.ok || r.type === 'opaque')){ const c = await caches.open(VERSION); await c.put(req, r.clone()); }
      return r;
    }).catch(() => null);
    if (hit){ e.waitUntil(net); return hit; }
    return (await net) || Response.error();
  })());
});
