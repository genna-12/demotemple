# Brief tecnico del sito esistente (16 settembre 2026)

Fatti verificati sul codice. Serve agli agenti per non rileggere il sito.

## 1. Struttura di una pagina
- Head: meta charset/viewport, title, icone (`/assets/trasparente.ico`, apple-touch-icon), `theme-color #080808`, meta apple-mobile-web-app-*, `<link rel="manifest" href="/site.webmanifest">`, description/canonical, OG/Twitter, (solo home) JSON-LD LocalBusiness; poi SEMPRE `<script src="/preload.js">` prima del CSS, preload del logo e dei font, infine `<link rel="stylesheet" href="/style.css">`.
- Body: home `class="loading-state"`, sottopagine `class="loading-state subpage"`. Nav `<nav id="navbar">` con `.menu-trigger#menu-toggle` (hamburger a due `.line`); home parte `hidden-nav`, sottopagine `nav-visible`. Logo in `.logo-wrapper.in-nav.static-nav` nelle sottopagine. Menu fullscreen `#fullscreen-menu` → `.menu-bg` + `.menu-content` con `.menu-logo` e `ul.menu-list > li > a.menu-link[data-translate]`.
- Footer identico ovunque: `.footer-address`, `.footer-legal-note[data-translate]`, `.footer-links` (privacy/cookie Iubenda, `/note-legali`, `.consent-revoke-link[hidden]`).
- Bottoni fissi fuori da `<main>`: `#lang-btn.floating-btn.float-left`, `#wa-btn.floating-btn.float-right`.
- Script a fondo body, ordine fisso: `/consent.js` → `/main.js` → script di pagina (`/home.js`, `/page.js`, `/portfolio.js`, `/contact.js`) → `/pwa.js`.
- Traduzioni: in `main.js`, `initTranslationSystem()`, oggetto `dict = {en:{...}, it:{...}}` con chiavi piatte (`"nav-home"`) → HTML (anche con tag). Applicazione: `querySelectorAll('[data-translate]')` → `innerHTML`; anche `data-translate-aria` (aria-label) e `data-translate-done` (`data-done-label`). Lingua: `localStorage.tinyTempleLang`, default `it`; `#lang-btn` fa toggle. 170 chiavi.

## 2. Design system (`style.css`, ~3300 righe, CRLF)
- `:root`: `--bg-color: #080808`, `--text-primary: #e6e6e6`, `--text-muted: #a09085`, `--accent-brown: #4a3b32`, `--accent-orange: #cf5c36`, `--font-title: 'TT Ampersand','Archivo',…`, `--font-text: 'TT Ampersand','Inter',…`, `--ease-cinematic: cubic-bezier(0.65,0,0.35,1)`. Nessuna variabile per radius/spacing/shadow (hardcoded: 28px glass card, 12-14px input e bottoni).
- Naming per prefisso di componente (`mp-*` player portfolio, `spatial-*` componenti "Liquid Glass", `form-*`, `tracklist-*`, `.floating-btn`, `.service-card`), non BEM.
- Componenti riusabili: `.spatial-btn` (+`.btn-glass`, `.btn-glow`), `.spatial-submit-btn` (+`.btn-lens`, `.btn-content`), `.service-card`, `.spatial-glass-card` / `.form-glass-card`, `.spotify-btn`, `.mp-badge-inline`, `.mp-btn`, `.floating-btn`. Feedback touch globale: classe `.is-pressed` via JS.
- Breakpoint: `max-width: 768px` (principale), `900px`; hover solo in `@media (hover: hover) and (pointer: fine)`; `prefers-reduced-motion: reduce` gestito.

## 3. PWA
- `site.webmanifest`: `id "/"`, `name "Tiny Temple Studio"`, `short_name "Tiny Temple"`, `start_url "/"`, `scope "/"`, `display standalone`, colori `#080808`, icone `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`.
- `sw.js`: `const VERSION = 'v13'; const CACHE = 'tiny-temple-' + VERSION;`. Liste `CORE` (pagine senza estensione + CSS/JS/font/icone, installate con `Promise.allSettled` file per file) ed `EXTRA` (immagini, senza await). Fetch: navigazioni → network-first con fallback cache poi `/404`; risorse same-origin → cache-first; cross-origin e non-GET non intercettate. `activate` cancella cache `tiny-temple-*` vecchie. Messaggio `skip-waiting` supportato, non usato.
- `pwa.js`: `navigator.serviceWorker.register('/sw.js', {scope:'/'})` su `load`, nessuna UI.

## 4. `_headers` (righe esatte)
```
/*
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Strict-Transport-Security: max-age=31536000
  Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; script-src 'self' 'unsafe-eval' https://open.spotify.com https://*.spotifycdn.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://api.web3forms.com https://open.spotify.com https://*.spotifycdn.com https://*.spotify.com; form-action 'self' https://api.web3forms.com; frame-src https://open.spotify.com https://*.spotifycdn.com; worker-src 'self'; manifest-src 'self'; frame-ancestors 'self'; upgrade-insecure-requests
```
Cache-Control (una regola per percorso, mai sovrapposte): pagine senza estensione e `/*.css`, `/*.js` → `public, max-age=0, must-revalidate`; `/assets/fonts/*` → `max-age=31536000, immutable`; immagini in `assets/*` → `max-age=86400, stale-while-revalidate=604800`; `/site.webmanifest` → `max-age=3600`.

## 5. `consent.js` — pattern click-to-load
`localStorage.tinyTempleSpotifyConsent = 'granted'`. API globale `window.TinyConsent = { isGranted(), onGrant(cb), grant(), revoke() }` (`onGrant` esegue subito se già concesso, altrimenti accoda). UI: box `.mp-consent-box` prima di caricare qualsiasi script esterno; `#mp-consent-allow` → `grant()`. Revoca da `.consent-revoke-link` nel footer (`updateRevokeLinks()`), che ricarica la pagina se c'è `#mp-carousel`, altrimenti mostra conferma via `data-done-label`. Riusabile 1:1 per il consenso al microfono.

## 6. Nav
`ul.menu-list`: Home `/` (`nav-home`), Servizi `/servizi` (`nav-servizi`), Portfolio `/portfolio` (`nav-portfolio`), Contatti `/contatti` (`nav-contatti`). Link senza estensione. Footer: `/note-legali` (`nav-note-legali`). Nessuna voce Toolbox.

## 7. Hook per la Toolbox
Nessuno: nessun commento, TODO o placeholder. `modifiche/modifiche.md` (fuori repo) è un piano di restyling pre-lancio, non c'entra.

## 8. Fine riga (repo in `HEAD`)
LF: tutti gli HTML, `main.js`, `sw.js`, `pwa.js`, `_headers`, `site.webmanifest`. CRLF: `style.css`, `preload.js`, `page.js`, `consent.js`, `contact.js`, `home.js`, `portfolio.js`. Sul disco di Genna `sw.js` e `pwa.js` possono risultare CRLF (Windows/OneDrive): non è nel perimetro degli agenti.
