/**
 * Tiny Temple - Service Worker
 *
 * Rende il sito installabile come app e disponibile offline: alla prima
 * visita mette da parte una copia di tutto il sito, poi lo serve dalla copia
 * locale. Nessuna interfaccia, nessun avviso: e' tutto silenzioso.
 *
 * ============================================================
 *  IMPORTANTE - A OGNI PUBBLICAZIONE ALZA IL NUMERO DI VERSIONE
 * ============================================================
 * La copia locale ha il numero di versione nel nome. Se non lo si alza, chi
 * ha gia' visitato il sito continua a vedere la versione vecchia di CSS e
 * immagini anche dopo il deploy. Cambiare la riga qui sotto e' l'unica cosa
 * da ricordarsi: il browser se ne accorge da solo, riscarica tutto in
 * sottofondo e alla visita successiva l'utente ha la versione nuova.
 *
 * Cosa NON viene mai toccato da questo file:
 *  - qualunque richiesta verso domini esterni (Spotify su tutti): passa
 *    diretta alla rete, cosi' l'architettura del consenso resta intatta
 *  - l'invio del modulo contatti (e' una POST, e le POST non si intercettano)
 */

const VERSION = 'v1';
const CACHE = 'tiny-temple-' + VERSION;

/* Il guscio dell'app: scaricato subito, serve a far funzionare tutto offline. */
const CORE = [
    './',
    'index.html',
    'servizi.html',
    'music-production.html',
    'artist-development.html',
    'mixing-mastering.html',
    'portfolio.html',
    'contatti.html',
    'francesco-pontillo.html',
    'andrea-missiroli.html',
    'note-legali.html',
    '404.html',

    'style.css',
    'preload.js',
    'consent.js',
    'main.js',
    'page.js',
    'home.js',
    'contact.js',
    'portfolio.js',
    'pwa.js',
    'site.webmanifest',

    'assets/trasparente.png',
    'assets/trasparente.ico',
    'assets/apple-touch-icon.png',
    'assets/icon-192.png',
    'assets/icon-512.png',

    'assets/home_main/desktop_3.jpg',
    'assets/home_main/mobile_1.jpg',
    'assets/team/ponz.jpg',
    'assets/team/andrea.jpg',
    'assets/icons/artist-development.png',
    'assets/icons/music-production.png',
    'assets/icons/mixing-mastering.png',

    'assets/fonts/archivo-400-latin.woff2',
    'assets/fonts/archivo-400-latin-ext.woff2',
    'assets/fonts/archivo-500-latin.woff2',
    'assets/fonts/archivo-500-latin-ext.woff2',
    'assets/fonts/archivo-600-latin.woff2',
    'assets/fonts/archivo-600-latin-ext.woff2',
    'assets/fonts/archivo-700-latin.woff2',
    'assets/fonts/archivo-700-latin-ext.woff2',
    'assets/fonts/inter-300-latin.woff2',
    'assets/fonts/inter-300-latin-ext.woff2',
    'assets/fonts/inter-400-latin.woff2',
    'assets/fonts/inter-400-latin-ext.woff2',
    'assets/fonts/inter-500-latin.woff2',
    'assets/fonts/inter-500-latin-ext.woff2'
];

/* Il resto: scaricato subito dopo, senza far aspettare nessuno. */
const EXTRA = [
    'assets/og-image.jpg'
].concat([
    'assets/portfolio_covers/cover_1.webp',
    'assets/portfolio_covers/cover_2.webp',
    'assets/portfolio_covers/cover_3.webp',
    'assets/portfolio_covers/cover_4.webp',
    'assets/portfolio_covers/cover_5.webp',
    'assets/portfolio_covers/cover_6.webp',
    'assets/portfolio_covers/cover_7.webp',
    'assets/portfolio_covers/cover_8.webp',
    'assets/portfolio_covers/cover_9.webp',
    'assets/portfolio_covers/cover_10.webp',
    'assets/portfolio_covers/cover_11.webp',
    'assets/portfolio_covers/cover_12.webp',
    'assets/portfolio_covers/cover_13.webp',
    'assets/portfolio_covers/cover_14.webp',
    'assets/portfolio_covers/cover_15.webp',
    'assets/portfolio_covers/thumbs/cover_1.webp',
    'assets/portfolio_covers/thumbs/cover_2.webp',
    'assets/portfolio_covers/thumbs/cover_3.webp',
    'assets/portfolio_covers/thumbs/cover_4.webp',
    'assets/portfolio_covers/thumbs/cover_5.webp',
    'assets/portfolio_covers/thumbs/cover_6.webp',
    'assets/portfolio_covers/thumbs/cover_7.webp',
    'assets/portfolio_covers/thumbs/cover_8.webp',
    'assets/portfolio_covers/thumbs/cover_9.webp',
    'assets/portfolio_covers/thumbs/cover_10.webp',
    'assets/portfolio_covers/thumbs/cover_11.webp',
    'assets/portfolio_covers/thumbs/cover_12.webp',
    'assets/portfolio_covers/thumbs/cover_13.webp',
    'assets/portfolio_covers/thumbs/cover_14.webp',
    'assets/portfolio_covers/thumbs/cover_15.webp'
]);

/* Scarica e mette in cache un elenco di file, uno per uno: se un file manca
   o da' errore, gli altri vengono salvati lo stesso (con addAll basterebbe
   un singolo 404 per far fallire tutta l'installazione). */
async function cacheAll(cache, urls) {
    const results = await Promise.allSettled(urls.map(async (url) => {
        const res = await fetch(new Request(url, { cache: 'reload' }));
        if (!res || !res.ok) throw new Error('HTTP ' + (res && res.status) + ' su ' + url);
        return cache.put(url, res);
    }));
    const falliti = results.filter((r) => r.status === 'rejected');
    if (falliti.length) {
        console.warn('[sw] file non messi in cache:', falliti.length, falliti[0].reason);
    }
}

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE);
        await cacheAll(cache, CORE);
        /* volutamente senza await: l'installazione non aspetta le immagini */
        cacheAll(cache, EXTRA);
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const nomi = await caches.keys();
        await Promise.all(
            nomi.filter((n) => n.startsWith('tiny-temple-') && n !== CACHE)
                .map((n) => caches.delete(n))
        );
        if (self.registration.navigationPreload) {
            try { await self.registration.navigationPreload.enable(); } catch (e) {}
        }
        await self.clients.claim();
    })());
});

/* Pagine: prima la rete (cosi' una modifica pubblicata si vede subito),
   la copia locale come rete di scorta quando la connessione non c'e'. */
async function pagina(event) {
    const req = event.request;
    try {
        const preload = event.preloadResponse ? await event.preloadResponse : null;
        const res = preload || await fetch(req);
        /* si tiene da parte solo una risposta buona: un 404 del server non
           deve prendere il posto della copia salvata */
        if (res && res.ok) {
            const cache = await caches.open(CACHE);
            cache.put(req, res.clone());
        }
        return res;
    } catch (e) {
        const cache = await caches.open(CACHE);
        const salvata = await cache.match(req, { ignoreSearch: true });
        if (salvata) return salvata;
        const fallback = await cache.match('404.html');
        if (fallback) return fallback;
        return new Response('Offline', { status: 503, statusText: 'Offline' });
    }
}

/* Tutto il resto (CSS, JS, font, immagini): prima la copia locale.
   E' sicuro perche' a ogni nuova VERSION la copia viene rifatta da zero. */
async function risorsa(req) {
    const cache = await caches.open(CACHE);
    const salvata = await cache.match(req, { ignoreSearch: true });
    if (salvata) return salvata;
    const res = await fetch(req);
    if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
    return res;
}

self.addEventListener('fetch', (event) => {
    const req = event.request;

    /* Le POST (invio del modulo) non si toccano. */
    if (req.method !== 'GET') return;

    let url;
    try { url = new URL(req.url); } catch (e) { return; }

    /* Domini esterni - Spotify compreso - vanno diretti in rete, sempre. */
    if (url.origin !== self.location.origin) return;

    if (req.mode === 'navigate') {
        event.respondWith(pagina(event));
        return;
    }
    event.respondWith(risorsa(req).catch(() => caches.match(req, { ignoreSearch: true })));
});

/* Permette a una pagina di chiedere l'aggiornamento immediato, se un giorno
   servira' un pulsante "ricarica per aggiornare". Oggi non lo usa nessuno. */
self.addEventListener('message', (event) => {
    if (event.data === 'skip-waiting') self.skipWaiting();
});
