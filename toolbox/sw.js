/**
 * Tiny Temple Toolbox - Service Worker
 *
 * Rende la Toolbox installabile e utilizzabile offline.
 *
 * ============================================================
 *  A OGNI MODIFICA DI UN FILE ELENCATO QUI SOTTO ALZA VERSION
 * ============================================================
 * I file in SHELL e TOOLS sono serviti dalla copia locale (cache-first),
 * quindi senza una VERSION nuova chi ha gia' la Toolbox non vede la modifica.
 * Con una VERSION nuova il browser scarica tutto in sottofondo; il SW nuovo
 * resta IN ATTESA finche' l'utente non tocca "Aggiorna" (pwa.js): mai
 * cambiare codice sotto un metronomo che sta suonando.
 * `node scripts/check.mjs` segnala le VERSION dimenticate.
 *
 * Cosa NON passa di qui: richieste verso altri domini e richieste non GET.
 * `/vendor/*` ha una cache a parte (`toolbox-vendor`) che sopravvive ai
 * cambi di VERSION: i percorsi contengono gia' la versione della libreria.
 */

const VERSION = 'tb-v3';
const CACHE = 'toolbox-' + VERSION;
const VENDOR_CACHE = 'toolbox-vendor';

/* Guscio comune: indice, 404, moduli condivisi, font, icone, manifest. */
const SHELL = [
    '/',
    '/404',
    '/index.js',
    '/404.js',
    '/manifest.webmanifest',

    '/shared/tokens.css',
    '/shared/base.css',
    '/shared/components.css',
    '/shared/audio.js',
    '/shared/mic.js',
    '/shared/lang-boot.js',
    '/shared/i18n.js',
    '/shared/i18n-common.js',
    '/shared/storage.js',
    '/shared/ui.js',
    '/shared/pwa.js',
    '/shared/nav.js',
    '/shared/tools.js',

    '/assets/fonts/archivo-400-latin.woff2',
    '/assets/fonts/archivo-400-latin-ext.woff2',
    '/assets/fonts/archivo-600-latin.woff2',
    '/assets/fonts/archivo-600-latin-ext.woff2',
    '/assets/fonts/archivo-700-latin.woff2',
    '/assets/fonts/archivo-700-latin-ext.woff2',
    '/assets/fonts/inter-400-latin.woff2',
    '/assets/fonts/inter-400-latin-ext.woff2',
    '/assets/fonts/inter-500-latin.woff2',
    '/assets/fonts/inter-500-latin-ext.woff2',
    '/assets/fonts/tiny-ampersand.woff',

    '/assets/icons/icon-192.png',
    '/assets/icons/icon-512.png',
    '/assets/icons/icon-maskable-512.png',
    '/assets/icons/apple-touch-icon.png',
    '/assets/icons/favicon.ico'
];

/* File degli strumenti pubblicati, aggiunti strumento per strumento:
   '/<slug>/', '/<slug>/<slug>.js', '/<slug>/<slug>.css', '/<slug>/i18n.js'.
   Le librerie in /vendor/ NON vanno qui: hanno la loro cache runtime. */
const TOOLS = [
];

const PRECACHE = SHELL.concat(TOOLS);

/* Una risposta arrivata dopo un redirect non puo' servire una navigazione:
   la si riconfeziona identica ma senza il marchio "redirected". */
function clean(res) {
    if (!res.redirected) return res;
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

/* Installazione tutto-o-niente: se anche un solo file manca, la cache nuova
   viene buttata e resta attiva la versione precedente (niente mix). */
self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const responses = await Promise.all(PRECACHE.map(async (url) => {
            const res = await fetch(new Request(url, { cache: 'reload' }));
            if (!res.ok) throw new Error('HTTP ' + res.status + ' su ' + url);
            return [url, clean(res)];
        }));
        const cache = await caches.open(CACHE);
        await Promise.all(responses.map(([url, res]) => cache.put(url, res)));
        /* niente skipWaiting qui: lo chiede pwa.js quando l'utente tocca "Aggiorna" */
    })().catch(async (e) => {
        await caches.delete(CACHE);
        throw e;
    }));
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names
            .filter((n) => n.startsWith('toolbox-') && n !== CACHE && n !== VENDOR_CACHE)
            .map((n) => caches.delete(n)));
        await self.clients.claim();
    })());
});

/* Librerie: prima la copia locale, altrimenti rete e si mette da parte. */
async function vendor(req) {
    const cache = await caches.open(VENDOR_CACHE);
    const hit = await cache.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok && res.type === 'basic') await cache.put(req, res.clone());
    return res;
}

/* Pagine: dalla precache se ci sono (anche con ?lang=), altrimenti rete;
   offline e fuori precache -> /404. '/slug' senza slash finale, offline,
   viene rimandato a '/slug/' se quello e' in precache. */
async function navigation(req, url) {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
        return await fetch(req);
    } catch (e) {
        if (!url.pathname.endsWith('/') && !/\.[a-z0-9]+$/i.test(url.pathname)) {
            const slashed = url.pathname + '/';
            if (await cache.match(slashed)) return Response.redirect(slashed + url.search, 301);
        }
        const fallback = await cache.match('/404');
        if (fallback) return fallback;
        return new Response('Offline', { status: 503, statusText: 'Offline', headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
}

/* Risorse: precache cache-first, il resto passa alla rete senza essere salvato. */
async function asset(req) {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    return hit || fetch(req);
}

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    let url;
    try { url = new URL(req.url); } catch (e) { return; }
    if (url.origin !== self.location.origin) return;

    if (url.pathname.startsWith('/vendor/')) {
        event.respondWith(vendor(req));
    } else if (req.mode === 'navigate') {
        event.respondWith(navigation(req, url));
    } else {
        event.respondWith(asset(req));
    }
});

/* pwa.js lo manda quando l'utente tocca "Aggiorna". */
self.addEventListener('message', (event) => {
    if (event.data === 'skip-waiting') self.skipWaiting();
});
