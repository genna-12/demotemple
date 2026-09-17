# Spec 02 — Dashboard e shell

Sostituisce la 01 dove diverge (barra, menu, home). Restano validi MPA (00-architettura §2), `shared/tools.js`, focus trap e scroll-lock di `nav.js`.

## 1. Barra `tb-bar`

```
header.tb-bar        fissa, 56px + safe-area in alto, blur leggero, nessun bordo
├ a.tb-logo          img logo-arancione-96.png (36px dentro area 44px) → "/"   [aria-label]
├ h1.tb-bar-title    solo pagine strumento, centrato, troncato
└ button.tb-menu-toggle   due linee → X
```

- Il logo è l'unico marchio (nome in `sr-only`) e riporta alla dashboard: `tb-bar-back` si elimina.
- Logo e hamburger: cerchi glass presi da `.floating-btn` (gradiente 135°, blur 25px saturate 200%, bordo chiaro, ombra), `.is-pressed` al tocco. La barra resta piatta.
- Safe-area: in alto qui, ai lati sul `body`, in basso nel footer.

## 2. Intro `tb-intro`

```
div#tb-intro.tb-intro[hidden]  > img.tb-intro-logo (logo arancione 100px)
```

Come `#intro-layer` della vetrina: fondo pieno, logo al centro con il battito (`heartbeat` 0.8s), poi scivola verso l'angolo in alto a sinistra rimpicciolendo (`--ease-cinematic`) mentre il fondo sfuma. **Totale ≤ 1.2s**, con misure fisse (nessun calcolo a runtime).

Solo sulla dashboard e solo al primo ingresso della sessione (`sessionStorage.tbIntro`); saltata con `prefers-reduced-motion` e senza JS (parte `hidden`); mai nelle pagine strumento e mai bloccante (sotto è già tutto montato). Niente vibrazione.

## 3. Menu compatto

```
div#tb-menu > div.tb-menu-scrim + div.tb-menu-panel
   ├ div.tb-menu-groups        famiglia = eyebrow 0.7rem; voci 1rem, riga 44px
   │    live: a.tb-menu-link (icona 18px + nome) · soon: span.tb-menu-link.is-soon + pill piccola
   └ div.tb-menu-foot
        ├ div.tb-lang-switch IT | EN
        ├ button.tb-menu-install   +  div.tb-menu-ios (3 passi, a fisarmonica, solo su iPhone)
        └ a.tb-menu-ext            "Sito dello studio ↗"
```

- **Da 768px:** pannello sotto l'hamburger, a destra, max 380px, glass; entra con dissolvenza + 8px in 0.25s. Niente colonna a sinistra, niente scrollbar (con 8 strumenti il contenuto sta tutto).
- **Sotto 768px:** foglio pieno, stessa densità.
- Scrim al 55%: chiudono un tocco fuori, Esc, l'hamburger, la scelta di una voce.
- "Dashboard" in cima (`aria-current` in home). Le voci in arrivo non sono link.
- Restano focus trap, `inert`, scroll-lock, chiusura su `pagehide`/`pageshow`.

## 4. Dashboard (home)

```
main.tb-dash
├ div.tb-dash-top    h1.sr-only "Toolbox" · button.tb-edit ("Modifica" ⇄ "Fine")
├ ul.tb-tiles        grid auto-fill minmax(104px, 1fr), gap 14px, max 960px centrati
│   └ li > a.tb-tile | div.tb-tile.is-soon
│         span.tb-tile-icon (SVG 28px, quelle già in index.html) + span.tb-tile-name (0.72rem, 2 righe)
│         in modifica: button.tb-tile-remove "−"
└ button.tb-tile-add "+"  → dialog.tb-picker (strumenti nascosti, per famiglia + "Ripristina ordine")
```

- Tile quadrato, glass sobrio (bordo 1px, blur 20px, niente ombre pesanti), icona arancione se disponibile.
- **In arrivo:** opacità 0.55, icona muted, non apribile, `aria-disabled`, `sr-only` "In arrivo".
- **Niente promozione:** spariscono `tb-hero`, `home-intro`, `tb-next`, numeri di famiglia e descrizioni. Le famiglie restano nel menu e nel picker; la "i" si valuterà dopo.
- **Modifica:** compaiono "−" e il tile "+". Riordino col dito (pointer events) e da tastiera (frecce, Invio/Esc), con annuncio `aria-live`. Nessun tremolio.
- **Persistenza:** `prefs.set('dash','order',[slug…])` e `'hidden'`; gli strumenti nuovi entrano in coda da soli; nel picker "Ripristina ordine".
- **Oltre la griglia: niente, per ora.** Progetti o calendario sarebbero contenitori vuoti: nessuno strumento produce ancora dati. Si prevede lo slot `tb-slot` per "Recenti" quando Penna e DNA salveranno record. L'installazione sta nel menu.

## 5. Desktop e misure

Contenuto centrato, max 1100px (griglia 960px), margine laterale 5%. Target ≥ 44px, hover solo con puntatore fine. Colonne: 3 a 360px, 4–5 su tablet, 8 su desktop.

## 6. Design system riusabile

In `tokens.css` i token del vetro (`--glass-bg`, `--glass-border-top`, `--glass-blur`, `--glass-shadow`), usati da logo, hamburger, pannello e tile. Classi generiche (`tb-bar`, `tb-menu`, `tb-tile`, `tb-dash`): nessun "toolbox" nei nomi, così altri sottodomini riusano i file. `tb-menu-site` → `tb-menu-ext`; logo in `assets/brand/`.

## 7. Testi

| chiave | IT | EN |
|---|---|---|
| bar-logo-aria | Tiny Temple Toolbox — vai alla dashboard | Tiny Temple Toolbox — go to the dashboard |
| menu-all | Dashboard | Dashboard |
| dash-edit / dash-done | Modifica / Fine | Edit / Done |
| dash-add | Aggiungi strumento | Add tool |
| dash-remove-aria · move-aria · moved | Togli {tool} · Sposta {tool} con le frecce · {tool}: posizione {n} | Remove {tool} · Move {tool} with the arrow keys · {tool}: position {n} |
| picker-title · empty · reset | Aggiungi alla dashboard · Sono già tutti qui. · Ripristina ordine | Add to the dashboard · They're all here already. · Reset order |
| pill-soon | In arrivo | Coming soon |
| menu-install · menu-ext | Installa l'app · Sito dello studio | Install the app · Studio website |

Invariati i passi iPhone (`idx-ios-*`) e i nomi degli strumenti.

## 8. Divisione del lavoro

**builder (Sonnet)** — markup, CSS, asset, animazione:
- `shared/tokens.css` (vetro), `base.css` (barra, logo, intro, pannello), `components.css` (tile, picker, pill; via `.tb-family*` e `.tb-tool*`).
- `toolbox/index.html`, `404.html`, `assets/brand/`.
- `toolbox/sw.js`: `VERSION` e precache.
- `shared/i18n-common.js`: chiavi nuove, via `home-intro` e `home-next`.

**implementer (Opus)** — JS non banale:
- Nuovo `shared/dash.js`: modello dati (ordine + nascosti), render, riordino pointer e tastiera, persistenza `storage.prefs`, picker, `aria-live`.
- Nuovo `shared/intro.js`: sessione, reduced-motion, pulizia dell'overlay.
- `shared/nav.js`: logo al posto di `tb-bar-back`, pannello con scrim, passi iPhone nel menu.
- `toolbox/index.js`: montaggio. Vietato toccare la vetrina.

## 9. Criteri di accettazione

1. Il logo appare in alto a sinistra su ogni pagina e riporta alla dashboard con un tocco.
2. L'intro parte una volta per sessione, dura ≤ 1.2s, salta con reduced-motion e nelle pagine strumento, non ritarda i tocchi.
3. Su PC il menu è un pannello ≤ 380px sotto l'hamburger, senza scrollbar né colonna a sinistra; su telefono sta in una schermata.
4. Menu: Esc, scrim, hamburger e scelta di una voce lo chiudono; il focus torna all'hamburger.
5. La dashboard non contiene testi promozionali.
6. Un tile si toglie, si riaggiunge e si sposta con dito e tastiera; l'ordine sopravvive al ricaricamento.
7. Uno strumento nuovo in `tools.js` compare in coda anche su una dashboard già personalizzata.
8. Gli strumenti in arrivo sono attenuati, non apribili e annunciati come "In arrivo".
9. A 360px nessuno scroll orizzontale; in standalone iOS le safe-area sono contate una volta sola.
10. `node scripts/check.mjs` passa (fine riga, chiavi IT/EN, VERSION, precache).
