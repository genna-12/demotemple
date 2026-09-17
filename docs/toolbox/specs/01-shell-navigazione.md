# Spec 01 — Shell e navigazione

Proposta ui-ux da confermare con Genna. Vale 00-architettura §2.

## 1. Barra `tb-bar` (tutte le pagine)

```
header.tb-bar   sticky, 56px + safe-area in alto, vetro scuro
├ home:      a.tb-bar-brand "TINY TEMPLE" + "TOOLBOX" arancione → /
├ strumento: a.tb-bar-back freccia + "Toolbox" → /   ·   h1.tb-bar-title
└ button.tb-menu-toggle   due linee come .menu-trigger, diventano X
```

- Lingua e installazione vanno nel menu (il fondo schermo resta agli strumenti). Si eliminano `tb-lang-btn` e `tb-header-lang`.
- Safe-area in alto solo nella barra, in basso solo nel footer.

## 2. Menu fullscreen `tb-menu`

```
div#tb-menu  role=dialog, aria-modal, aria-label "Menu"
├ a.tb-menu-home "Tutti gli strumenti"
├ section.tb-menu-group ×5
│  ├ span.tb-menu-eyebrow   famiglia (arancione, maiuscolo)
│  └ li: a.tb-menu-link (live) | span.tb-menu-link.is-soon + tb-pill
└ div.tb-menu-foot: tb-lang-switch (IT|EN, aria-pressed) · button.tb-menu-install · a.tb-menu-site ↗
```

- **Famiglie:** Dal vivo (Metronomo, Accordatore) · Analisi (DNA) · Scrittura (Penna) · Calcolo (Calcolatore tempo) · Lancio (Pianificatore, Checklist, Split sheet).
- **Voci:** stile `.menu-link`, 1.6rem su mobile e 2.2rem su desktop. Le voci in arrivo non sono link ma restano leggibili (`--text-muted` pieno). La pagina corrente ha `aria-current` e un punto arancione.
- **Sfondo e scroll:** sfondo come il body; il menu scorre da solo e il padding include le safe-area.
- **Dati:** il menu nasce da `shared/tools.js` (slug, famiglia, chiave, `live`/`soon`, `next`).

**Comportamento**
- Apertura: `aria-expanded`, `inert` sul resto, scroll bloccato (anche iOS), focus sulla prima voce; il Tab resta nel menu.
- Chiusura: Esc, toggle o tocco su una voce; il focus torna al toggle. Si chiude anche su `pagehide`/`pageshow`.
- Install: prompt nativo se disponibile, altrimenti `/#installa`; nascosto se installata.

## 3. Home

```
main.tb-home
├ header.tb-hero: eyebrow "Tiny Temple Studio" · h1 "Toolbox" · intro · p.tb-next "Il prossimo: …"
├ section.tb-family ×5: numero "01" · h2 · una riga
│  └ ul.tb-tools > li > a.tb-tool | div.tb-tool.is-soon
│      icona (cerchio vetro 44px, SVG 24px monocromatico, aria-hidden) · nome + descrizione · chevron | pill
└ section#installa   come oggi; nascosta se installata; senza prompt: "menu del browser → Installa"
```

- **Layout:** le card sono righe (altezza minima 76px), non tessere: una colonna su mobile, due da 768px.
- **Live:** icona arancione, riga intera cliccabile, `.is-pressed` al tocco.
- **Soon:** bordo tratteggiato, icona muted, pill "In arrivo"; lo strumento `next` ha la pill arancione "Prossimo" (un percorso, non un vuoto).
- **Icone:** metronomo, arco con lancetta, onda, pennino, cronometro, calendario, spunta, torta.

## 4. Movimento e accessibilità

- **Menu:** sale con `translateY` in 0.6s `--ease-cinematic`; le voci entrano in cascata ogni 40ms (opacità + 12px). Toggle → X in 0.3s.
- **Reduced motion:** solo dissolvenza di 150ms. Nessuna animazione allo scroll.
- Hover solo con puntatore fine, target ≥ 44px.

## 5. Pagine strumento

`mountBar({ titleKey, current })` sostituisce `mountHeader` e monta barra e menu; poi `main.tb-tool-main` e `footer.tb-footer` (link alti 44px).

## 6. Testi (`i18n-common.js`)

| chiave | IT | EN |
|---|---|---|
| bar-menu-open/close | Apri il menu / Chiudi il menu | Open menu / Close menu |
| bar-back-aria | Torna alla Toolbox | Back to the Toolbox |
| menu-all · install · site | Tutti gli strumenti · Installa l'app · Sito dello studio | All tools · Install the app · Studio website |
| pill-soon · pill-next | In arrivo · Prossimo | Coming soon · Up next |
| home-intro | Gli strumenti dello studio, in tasca. Gratis, senza account, uno nuovo alla volta. | The studio's tools in your pocket. Free, no account, one new tool at a time. |
| home-next | Il prossimo: {tool} | Up next: {tool} |
| fam-live · analysis · writing · calc · release | Dal vivo · Analisi · Scrittura · Calcolo · Lancio | Live · Analysis · Writing · Calculators · Release |
| Penna | Rimario e blocco testi. | Lyric Pad · Rhymes and a notebook for lyrics. |
| Checklist | Cosa preparare e come chiamare le tracce. | What to prepare and how to name your stems. |
| Split sheet | Dividi le quote e scarica il PDF da firmare. | Split the shares, download a PDF to sign. |

## 7. Divisione del lavoro

- **builder (Sonnet):**
  - `theme.css`: nuove classi; via `tb-grid`, `tb-card`, `tb-lang-btn`; safe-area.
  - `index.html`, `404.html`, icone, `shared/tools.js`, chiavi i18n.
  - `sw.js`: alzare `VERSION` e aggiungere `tools.js` al precache.
- **Opus:** `mountBar` (focus trap, `inert`, blocco scroll iOS, bfcache) e l'installazione dal menu in `pwa.js`.
- **Verifica:** `node scripts/check.mjs`, poi revisione ui-ux su iPhone standalone.
