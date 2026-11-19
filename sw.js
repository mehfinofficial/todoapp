// Mint service worker: precache the app shell, then stale-while-revalidate for everything else.
// Bump VERSION when you want to force-refresh the shell.
const VERSION = 'mint-v6';
const SHELL = [
  './', 'index.html', 'style.css', 'finance.css', 'pages.css',
  'main.js', 'finance.js', 'ledger.js', 'notes.js', 'hero.js', 'sounds.js',
  'fonts/plus-jakarta-sans-latin-wght-normal.woff2',
  'fonts/plus-jakarta-sans-latin-ext-wght-normal.woff2',
  'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // Range requests (audio/video) can't be served from the cache reliably
  if (req.headers.has('range')) return;

  e.respondWith(
    caches.open(VERSION).then(async cache => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req).then(res => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => null);
      if (cached) { e.waitUntil(network); return cached; }
      const res = await network;
      if (res) return res;
      if (req.mode === 'navigate') return cache.match('index.html');
      return new Response('', { status: 504, statusText: 'Offline' });
    })
  );
});