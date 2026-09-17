# Toolbox — architettura comune (spec 00)

16 settembre 2026. Vale per tutti gli strumenti; le decisioni del §5 del workflow sono acquisite.

## 1. Struttura di `toolbox/`

```
toolbox/
  index.html  index.js  404.html  robots.txt  sitemap.xml
  manifest.webmanifest  sw.js  _headers
  shared/   tokens.css  base.css  components.css  audio.js  mic.js  i18n.js  i18n-common.js  storage.js  ui.js  pwa.js
  vendor/<lib>@<versione>/   file ESM/WASM + LICENSE
  assets/fonts/   copia 1:1 di archivo-{400,600,700}-*, inter-{400,500}-*, tiny-ampersand.woff + licenze OFL
  assets/icons/   icon-192.png  icon-512.png  icon-maskable-512.png  apple-touch-icon.png  favicon.ico
  <slug>/   index.html  <slug>.js  <slug>.css  i18n.js   (creata con lo strumento)
```
Slug: `metronomo`, `accordatore`, `calcolatore-tempo`, `dna`, `penna`, `pianificatore-uscita`, `checklist-consegna`, `split-sheet`.

**Asset copiati, non condivisi**: con root `toolbox/` Pages non vede `../assets`. Scartati i font cross-origin dalla vetrina (CORS, deploy legati) e i symlink (incerti su Pages, fragili su OneDrive). Solo i pesi usati, nomi identici; `check.mjs` verifica che le copie siano identiche. Icone nuove dagli originali in `archivio/`.

## 2. Shell: una pagina per strumento

Decisione: **MPA**, URL puliti con slash finale (`/metronomo/`; Pages reindirizza `/metronomo` → `/metronomo/`). Un solo `<script type="module">` per pagina, che importa da `/shared/`.

Motivi: cambiando pagina AudioContext e microfono si chiudono da soli (in una SPA un bug lascia il microfono acceso); deep link nativi; nessun router; precache per strumento; stesso modello della vetrina. iOS standalone: tutto sta nello `scope "/"` e resta nell'app; manca il tasto indietro, quindi l'intestazione ha sempre "← Toolbox".

## 3. Moduli `shared/`

ES modules senza effetti all'import né globali; nessuna dipendenza da `main.js`.

**audio.js**
```
getContext(): AudioContext            // singleton, creato al primo uso
unlock(): Promise<AudioContext>       // DENTRO il gesto: resume + buffer muto (iOS)
sampleRate(): number                  // letto a runtime, mai assunto
needsGesture(): boolean               // state !== 'running' (incl. 'interrupted' iOS)
onStateChange(cb): () => void
addWorklet(url): Promise<boolean>     // false → fallback dello strumento
decode(file: Blob): Promise<AudioBuffer>
```
Al ritorno visibile, se `needsGesture()`: "Tocca per riprendere" (iOS rifiuta il resume automatico). `close()` su `pagehide`.

**mic.js** — stati `unasked | granted | denied | unavailable`. Consenso informativo in `localStorage.tinyTempleMicConsent`, stile `consent.js`: box `.tb-consent`, poi `getUserMedia`.
```
state(): MicState
renderConsent(container, { onAllow }): void
acquire(opts?): Promise<MediaStream>  // stream unico con contatore; elaborazioni vocali spente
release(): void                       // a zero riferimenti ferma tutte le tracce
source(ctx): MediaStreamAudioSourceNode
revoke(): void                        // cancella consenso + release
onStateChange(cb): () => void
```
`unavailable` = niente `mediaDevices`; `denied` = `NotAllowedError`. `release` forzato su `pagehide`.

**i18n.js** — Dizionari come moduli dati puri `export default { it:{}, en:{} }`: `shared/i18n-common.js` + `<slug>/i18n.js` con chiavi prefissate (`met-`, `acc-`…). Attributi **`data-i18n`**, `data-i18n-aria`, `data-i18n-html` (solo stringhe con markup fidato): non `data-translate`, che `check.mjs` confronta con `main.js`. Testo via `textContent`.
```
init(...dicts): void                  // unisce comune + strumento, applica
t(key, vars?): string
lang(): 'it' | 'en'
setLang(l): void                      // salva, riapplica, <html lang>
apply(root = document): void
onChange(cb): () => void
```
Lingua in `localStorage.tinyTempleLang` (origin diverso: valore separato dalla vetrina). `?lang=it|en` all'arrivo vince, si salva e si toglie con `replaceState`; default `it`.

**storage.js** — DB `tiny-temple-toolbox`, un solo object store `records`, keyPath `['tool','id']`, indice `tool` (nessuna migrazione per strumenti nuovi).
```
get(tool, id)  put(tool, id, value)  del(tool, id)  list(tool)  clear(tool)
persist(): Promise<boolean>           // al primo salvataggio
prefs.get(tool, key, fallback)  prefs.set(tool, key, value)   // localStorage 'tt.<tool>.<key>', try/catch
```

**ui.js**
```
mountHeader({ titleKey, back = '/' }): HTMLElement   // ← Toolbox, titolo, pulsante lingua
setStatus(el, { kind: 'idle'|'busy'|'ok'|'error'|'denied', key })
toast(key, { action?, timeout? }): void              // aria-live polite
pressFeedback(root): void                           // .is-pressed come la vetrina
wakeLock(on: boolean): Promise<void>                // no-op se non supportato
```

**pwa.js**
```
initPwa({ installBtn, iosHelp, installSection }): void   // registra /sw.js, gestisce prompt, stato "manual" e aggiornamenti; installSection nascosta in standalone
isStandalone(): boolean                 // display-mode standalone || navigator.standalone
platform(): 'ios' | 'android' | 'desktop'
```

**tokens.css / base.css / components.css** (ordine di caricamento: tokens -> base -> components) — variabili `:root` della vetrina e `@font-face` locali in `tokens.css`; reset, tipografia di pagina, layout condiviso `tb-shell`/`tb-header`/`tb-footer`, safe-area, `100dvh`, `:focus-visible`, reduced-motion in `base.css`; componenti `tb-grid`, `tb-card`, `tb-badge` ("in arrivo"), `tb-btn`/`tb-btn--primary`/`tb-install`, `tb-status`, `tb-toast`, `tb-consent` in `components.css`. Hover solo con puntatore fine. Nessun `style=""` nell'HTML (CSP).

## 4. PWA

```json
{
  "id": "/", "name": "Tiny Temple Toolbox", "short_name": "Toolbox",
  "lang": "it", "start_url": "/", "scope": "/", "display": "standalone",
  "background_color": "#080808", "theme_color": "#080808",
  "icons": [
    { "src": "/assets/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/assets/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/assets/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```
`shortcuts` aggiunti strumento per strumento. Head di ogni pagina: `apple-touch-icon`, `viewport-fit=cover`, `apple-mobile-web-app-*`, `theme-color`.

**sw.js**: `VERSION = 'tb-v1'`, cache `toolbox-<VERSION>`. Liste `SHELL` (indice, 404, `shared/*`, font, icone, manifest) e `TOOLS` (file degli strumenti pubblicati). Precache → **cache-first** (niente mix di versioni); navigazioni non in cache → network-first, poi `/404`. `vendor/` → runtime cache-first in `toolbox-vendor`, **non** svuotata al cambio VERSION. Nuova versione: il SW nuovo resta in attesa, `pwa.js` mostra toast "Nuova versione — Aggiorna" → `skip-waiting` → reload su `controllerchange`. Non silenzioso: mai cambiare codice sotto un metronomo attivo. `registration.update()` a ogni ritorno in primo piano.

**Installazione**: `beforeinstallprompt` → pulsante `tb-install` (Chrome/Edge/Android); iOS → tutorial Condividi → Aggiungi a Home, con avviso "apri in Safari" nei browser in-app; nascosto se `isStandalone()`.

**Caveat iOS**: storage dell'app in Home separato da Safari; eviction possibile → `persist()` + export; AudioContext `interrupted` dopo chiamate; microfono fragile tra versioni.

## 5. `toolbox/_headers`

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Cross-Origin-Opener-Policy: same-origin
  Strict-Transport-Security: max-age=31536000
  Permissions-Policy: camera=(), microphone=(self), geolocation=(), payment=(), usb=()
  Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; frame-src 'none'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests
/vendor/*
  Cache-Control: public, max-age=31536000, immutable
/assets/fonts/*
  Cache-Control: public, max-age=31536000, immutable
/assets/icons/*
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800
/manifest.webmanifest
  Cache-Control: public, max-age=3600
```
HTML/JS/CSS senza regola: vale il default di Pages (`max-age=0, must-revalidate`) ed evita la sovrapposizione `/*.js` ↔ `/vendor/*`. `'wasm-unsafe-eval'` e `blob:` in `worker-src` **esclusi**: li introduce, motivandoli, la spec che ne ha bisogno (probabile DNA).

## 6. Vetrina (minimo)

- **Menu**: dopo la voce `nav-contatti` una `li > a.menu-link[data-translate="nav-toolbox"]` verso `https://toolbox.tinytemplestudio.it/` (stessa scheda) in: `404.html:52`, `andrea-missiroli.html:92`, `artist-development.html:70`, `contatti.html:69`, `francesco-pontillo.html:93`, `index.html:147`, `mixing-mastering.html:70`, `music-production.html:70`, `note-legali.html:70`, `portfolio.html:69`, `servizi.html:70`.
- **Sezione "Scarica l'app"** in `index.html` prima di `#connect` (riga 186), solo componenti esistenti (`.spatial-glass-card`, `.spatial-btn`), `style.css` non toccato. L'installazione è per origin: la sezione spiega i passi iPhone/Android e apre la Toolbox.
- **`main.js`**: chiavi `nav-toolbox`, `home-toolbox-title`, `home-toolbox-text`, `home-toolbox-cta`, `home-toolbox-ios`, `home-toolbox-android` in `en` (dopo riga 262) e `it` (dopo riga 434). Il link della CTA porta `?lang=` corrente: `main.js` aggiorna `href` degli elementi `[data-toolbox-link]` quando applica la lingua.
- **`sw.js`**: `VERSION` `v13` → `v14`.
- **`_redirects`** (nuovo, LF): `/toolbox/* https://toolbox.tinytemplestudio.it/:splat 301`: la vetrina pubblica anche `toolbox/` (microfono bloccato, contenuti duplicati).
- **`sitemap.xml`**: invariata (non può elencare un altro host); la Toolbox ha la sua.

## 7. Cloudflare (Genna)

1. Workers & Pages → Create → Pages → Connect to Git → `genna-12/demotemple`.
2. Nome `tiny-temple-toolbox`, branch `main`, preset None, build command vuoto, **Root directory `toolbox`**, output vuoto.
3. Settings → Builds → Build watch paths: Toolbox include `toolbox/*`; vetrina esclude `toolbox/*` e `docs/*`.
4. Anteprime attive per il branch `toolbox`.
5. Custom domains → `toolbox.tinytemplestudio.it` (il CNAME lo crea Cloudflare) → attendere SSL attivo.
6. Verifica header (criterio 4).

## 8. Divisione del lavoro (strumento zero)

**implementer (Opus)**: `toolbox/sw.js`, `toolbox/_headers`, `shared/audio.js`, `shared/mic.js`, `shared/storage.js`, `shared/pwa.js`; estensione di `scripts/check.mjs` (LF già coperto; aggiungere: parità it/en e chiavi `data-i18n` nei dizionari toolbox, precache di `toolbox/sw.js` esistente, `_headers` toolbox, copie font identiche, root `_redirects`).

**builder (Sonnet)**, in parallelo sulle firme del §3: `toolbox/index.html` + `index.js` (8 card statiche "in arrivo", il link arriva con lo strumento), `404.html`, `robots.txt`, `sitemap.xml`, `manifest.webmanifest`, `shared/theme.css`, `shared/ui.js`, `shared/i18n.js`, `shared/i18n-common.js`, copia di font e icone, tutte le modifiche vetrina del §6.

## 9. Criteri di accettazione

1. `node scripts/check.mjs` passa, con i nuovi controlli attivi.
2. Nessuna richiesta fuori dal sottodominio (tab Network).
3. Nessuna violazione CSP in console.
4. `curl -I` mostra CSP e Permissions-Policy del §5 una sola volta ciascuna; `/vendor/*` immutable.
5. Chrome DevTools: app installabile, manifest senza errori.
6. Offline dopo la prima visita: indice e 404 si caricano con i font.
7. VERSION alzato → toast "Aggiorna"; il tocco carica la versione nuova.
8. Lingua: toggle, reload e `?lang=en` coerenti; URL ripulito.
9. `/toolbox/qualcosa` sulla vetrina → 301 al sottodominio.
10. Menu vetrina con "Toolbox" in 11 pagine, IT/EN.
11. Prova locale non pubblicata: `unlock()` → `running`; `acquire`/`release` spegne l'indicatore microfono.
12. *Da provare su iPhone*: installazione da Safari, icona, standalone senza barra, safe-area, "← Toolbox", avviso nei browser in-app.
13. *Da provare su iPhone*: dopo background o chiamata compare "Tocca per riprendere" e l'audio riparte al tocco.

## 10. Rischi e alternative scartate

- Default Cache-Control di Pages diverso dal previsto → criterio 4, poi regole per cartella.
- `style-src 'self'` può rompere librerie che scrivono `style=""` → deroga motivata nella spec dello strumento.
- Librerie che creano worklet da `blob:` → verificare in fase di vendorizzazione.
- Scartati: SPA a hash, asset condivisi/symlink, aggiornamento silenzioso, un object store per strumento.

## Da confermare con Genna

1. Nome: "Tiny Temple Toolbox" / short "Toolbox" (consigliato).
2. Icona: logo della vetrina su fondo `#cf5c36`, per distinguerla in Home; servono gli originali da `archivio/`.
3. Posizione della sezione "Scarica l'app": home prima di `#connect` (consigliato).
4. Slug del §1.
5. Iubenda: nessun terzo, ma sottodominio e microfono (solo locale) vanno probabilmente citati; footer Toolbox con le stesse informative.
