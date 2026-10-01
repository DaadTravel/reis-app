// Service worker: installeerbaar en onderweg zonder bereik te gebruiken.
// Verhoog CACHE bij elke wijziging aan de app (CLAUDE.md), anders blijft
// de oude versie in gebruik.
const CACHE = 'reis-app-v9';
// De app heeft een eigen domein (daadtravel.github.io), maar voor de
// zekerheid ruimt hij alleen caches met dit voorvoegsel op.
const VOORVOEGSEL = 'reis-app-';
// Data en foto's blijven bewaard bij een nieuwe versie; app.js wist ze bij
// uitloggen (zelfde namen als DATA_CACHES daar).
const DATA = 'reis-app-data';
const FOTOS = 'reis-app-fotos';
const FOTO_PAD = '/storage/v1/object/sign/reis-fotos/';
// Zo lang wachten op het netwerk voordat de bewaarde data getoond wordt.
const TRAAG_MS = 6000;

const SCHIL = [
  './', 'index.html', 'app.js', 'opmaak.js', 'schermen.js', 'thema.css', 'app.css',
  'ds/bundle.js', 'ds/bundle.css', 'manifest.json',
  'iconen/icoon-192.png', 'iconen/icoon-512.png', 'iconen/icoon-maskable-512.png', 'iconen/apple-touch-icon.png',
  'fonts/lettertypes.css',
  'fonts/figtree-latin.woff2', 'fonts/instrument-latin.woff2', 'fonts/instrument-cursief-latin.woff2', 'fonts/caveat-latin.woff2',
  'fonts/figtree-latin-ext.woff2', 'fonts/instrument-latin-ext.woff2', 'fonts/instrument-cursief-latin-ext.woff2', 'fonts/caveat-latin-ext.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js',
];

// Uitloggen (bericht van app.js): data- en fotocache weg, en verzoeken die
// daarvoor al liepen mogen niets meer terugzetten.
let gewistOp = 0;
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'wis-data') {
    gewistOp = Date.now();
    e.waitUntil(Promise.all([caches.delete(DATA), caches.delete(FOTOS)]));
  }
});
function bewaar(naam, sleutel, r, gestart) {
  if (gestart < gewistOp) return Promise.resolve();
  return caches.open(naam).then(c => c.put(sleutel, r)).catch(() => { /* bijv. opslag vol: dan niet bewaren */ });
}

self.addEventListener('install', e => {
  // cache: 'reload' = langs de HTTP-cache heen, anders kan een nieuwe versie
  // met oude bestanden gevuld worden (GitHub Pages: max-age 10 min).
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(SCHIL.map(u => new Request(u, { mode: 'cors', credentials: 'omit', cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  const houden = [CACHE, DATA, FOTOS];
  e.waitUntil(caches.keys()
    .then(namen => Promise.all(namen
      .filter(n => n.indexOf(VOORVOEGSEL) === 0 && houden.indexOf(n) < 0)
      .map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (url.hostname.endsWith('.supabase.co')) {
    if (req.method === 'GET' && url.pathname.indexOf('/rest/v1/') === 0) e.respondWith(dataNetwerkEerst(e, req));
    else if (req.method === 'GET' && url.pathname.indexOf(FOTO_PAD) === 0) e.respondWith(foto(e, req, url));
    else if (req.method === 'POST' && url.pathname + '/' === FOTO_PAD) e.respondWith(tekenOfUitCache(req, url));
    // Inloggen en schrijven: altijd rechtstreeks, nooit uit de cache.
    return;
  }
  // Alleen de eigen app-bestanden en de CDN-scripts; testpagina's niet.
  if (req.method !== 'GET' || url.pathname.indexOf('/tests/') > -1) return;
  if (url.origin !== self.location.origin && url.hostname !== 'cdnjs.cloudflare.com') return;
  e.respondWith(uitSchil(e, req));
});

// App-bestanden: eerst de cache. Paginabezoek (ook ?reis=…) = de bewaarde pagina.
async function uitSchil(e, req) {
  const cache = await caches.open(CACHE);
  const bewaard = await cache.match(req, { ignoreSearch: req.mode === 'navigate', ignoreVary: true });
  if (bewaard) return bewaard;
  const r = await fetch(req);
  if (r.ok && (r.type === 'basic' || r.type === 'cors')) e.waitUntil(cache.put(req, r.clone()).catch(() => {}));
  return r;
}

// Reisdata: eerst het netwerk (altijd de nieuwste stand), bij geen, een
// trage of een haperende (5xx) verbinding de laatst opgehaalde versie.
// Bewaard onder de kale URL: zonder de Authorization-header van het verzoek.
async function dataNetwerkEerst(e, req) {
  const gestart = Date.now();
  const netwerk = fetch(req).then(r => {
    if (r.ok) return bewaar(DATA, req.url, r.clone(), gestart).then(() => r);
    return r;
  });
  e.waitUntil(netwerk.catch(() => {}));
  const bewaard = await caches.match(req.url, { cacheName: DATA });
  if (!bewaard) return netwerk;
  const traag = new Promise(res => setTimeout(() => res(bewaard), TRAAG_MS));
  const vanNetwerk = netwerk.then(r => (r.status >= 500 ? bewaard : r), () => bewaard);
  return Promise.race([vanNetwerk, traag]);
}

// Foto's: bewaard op opslagpad, want de ondertekende URL (token) is bij
// elke keer laden anders. Een vervangen foto krijgt dus een nieuw pad.
function fotoSleutel(url) { return url.origin + url.pathname; }
async function foto(e, req, url) {
  const sleutel = fotoSleutel(url), gestart = Date.now();
  const bewaard = await caches.match(sleutel, { cacheName: FOTOS });
  if (bewaard) return bewaard;
  const r = await fetch(req.url, { mode: 'cors', credentials: 'omit' });
  if (r.ok) e.waitUntil(bewaar(FOTOS, sleutel, r.clone(), gestart));
  return r;
}

// Ondertekenen kan alleen online. Offline: de foto's die al bewaard zijn
// krijgen een URL zonder token (foto() serveert ze uit de cache); de rest
// een fout, zodat de app meldt dat er foto's ontbreken.
async function tekenOfUitCache(req, url) {
  const vraag = await req.clone().json().catch(() => ({}));
  try {
    return await fetch(req);
  } catch (err) {
    const lijst = await Promise.all((vraag.paths || []).map(async p => {
      const u = new URL(FOTO_PAD + p, url.origin);
      return (await caches.match(fotoSleutel(u), { cacheName: FOTOS }))
        ? { path: p, signedURL: u.pathname.slice('/storage/v1'.length), error: null }
        : { path: p, signedURL: null, error: 'offline' };
    }));
    return new Response(JSON.stringify(lijst), { headers: { 'Content-Type': 'application/json' } });
  }
}
