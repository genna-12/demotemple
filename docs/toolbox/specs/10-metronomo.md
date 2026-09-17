# Spec 10 — Metronomo (strumento 1)

17 settembre 2026. Primo strumento pubblicato: **fissa il template di ogni pagina
strumento**, che i successivi ricopiano.

## 1. Template della pagina strumento

`toolbox/metronomo/` → `index.html`, `metronomo.js`, `metronomo.css`, `i18n.js`;
URL `/metronomo/`.

Testa come `404.html` (viewport-fit, apple-\*, theme-color, manifest,
`lang-boot.js`, `tokens.css` → `base.css` → `components.css`) più `metronomo.css`
e il `canonical`; titolo e descrizione indicizzabili, in italiano. Corpo:
`header.tb-bar` con `a.tb-logo.in-nav` e `button.tb-menu-toggle.is-visible`
(**nessuna intro** nelle pagine strumento), lo sprite coi soli `symbol` usati, il
`div#tb-menu` completo, poi `div.tb-shell` = `header.tb-page-header` con solo
`h1[data-i18n="met-title"]` (niente eyebrow né intro testuale), `main#met.met`,
`footer.tb-footer` identico a `404.html`.

Unico script in fondo, `<script type="module" src="/metronomo/metronomo.js">`:
`init(commonDict, toolDict)`, `pressFeedback(document)`,
`mountBar({ page: 'tool', titleKey: 'met-title', current: 'metronomo' })`,
`initPwa({...})`, poi il montaggio dello strumento.

## 2. Contratto del markup (id fissati qui)

```
#met-bpm             numero grande, aria-live="polite" aria-atomic
#met-bpm-control     role="slider" tabindex="0" aria-valuemin="30" aria-valuemax="300"
button[data-met-step="-5|-1|+1|+5"]
#met-tap
#met-meters   > button[data-met-meter="2/4 … 12/8"]          role="radiogroup"
#met-subs     > button[data-met-sub="1|2|3|4"]               role="radiogroup"
#met-sounds   > button[data-met-sound="legno|beep|rimshot"]  role="radiogroup"
#met-dots            vuoto: l'implementer crea span.met-dot con .is-on e .is-accent
#met-volume          input[type=range] min=0 max=100
#met-toggle          aria-pressed, contiene #met-toggle-label
#met-status          .tb-status
```

`aria-checked` sui bottoni dei gruppi. Nessun `style=""` (CSP).

## 3. Funzioni

- **BPM 30–300** intero: `±1`, `±5`, trascinamento verticale o rotella sul numero
  (1 BPM ogni 6 px o notch), senza selezione del testo.
- **Tap tempo**: media degli ultimi 4–6 intervalli, scartati quelli oltre ±40 %
  dalla mediana, **reset dopo 2 s**; non avvia il suono.
- **Battute** 2/4, 3/4, 4/4, 5/4, 6/8, 7/8, 12/8: il BPM è il numero di **impulsi
  contati al minuto** (quarti nelle x/4, ottavi nelle x/8); accento sul primo,
  secondari in 6/8 (4), 12/8 (4, 7, 10), 7/8 (4).
- **Suddivisioni** quarti, ottavi, terzine, sedicesimi: click intermedi più acuti,
  a metà volume, senza pallino.
- **Indicatore**: un pallino per impulso, acceso all'istante udibile per ≥ 90 ms,
  accento arancione (`--accent-orange`). **Volume** 0–100 (curva quadratica) su un
  `GainNode` unico.
- **Tre suoni sintetizzati**, nessun file: *legno* (rumore in bandpass, inviluppo
  20 ms), *beep* (sine 1000 Hz accento / 800 Hz battito), *rimshot* (rumore +
  triangolare, decadimento 60 ms); voci monouso, liberate da `onended`.
- **Avvio/stop** con `#met-toggle` e **barra spaziatrice** (su `document`,
  `preventDefault`, ignorata nei campi di testo); l'avvio chiama `unlock()` nel gesto.
- **Preset** in `storage.prefs` (tool `metronomo`): `bpm`, `meter`, `subdiv`,
  `sound`, `volume`; scrittura ritardata 400 ms, lettura al montaggio.
- **Wake lock** `ui.wakeLock(true)` all'avvio, `false` a stop, `pagehide`, pagina
  nascosta.

## 4. Precisione

Scheduler lookahead classico: timer **25 ms**, orizzonte **100 ms**, tempi
calcolati solo su `AudioContext.currentTime` accumulando
`prossimo += 60 / bpm / suddivisione`. Mai `setTimeout` per l'audio, mai
`Date.now()`. Un cambio di BPM o battuta vale **dal battito successivo**: niente
ricalcolo del passato, niente salto di fase. Il visivo è un
`requestAnimationFrame` che legge la coda schedulata e accende il pallino quando
`currentTime` supera il suo tempo: nessun timer visivo, nessuna deriva.

Nuovo modulo riusabile `shared/scheduler.js`, che ignora la musica; sotto, le
firme interne di `metronomo.js`:

```
createScheduler({ ctx, interval = 25, lookahead = 0.1, onSchedule(time, i), nextInterval(i) })
  -> { start(), stop(), running(), queue(): Array<{ time, i, data }>, reset() }
createEngine({ ctx, onBeat }) -> setBpm setMeter setSubdiv setSound setVolume start stop isRunning state
createVoices(ctx, dest) -> play(kind: 'accent'|'beat'|'sub', time)
createTapTempo({ max = 6, resetMs = 2000 }) -> tap(): number|null, reset()
```

## 5. iOS e background (limite accettato)

Su iOS l'`AudioContext` è sospeso appena la pagina va in secondo piano o lo
schermo si spegne: **il metronomo a schermo spento non è ottenibile** senza un
elemento multimediale in riproduzione (scartato). Scelta: il wake lock tiene lo
schermo acceso mentre suona; su `visibilitychange` a `hidden` il metronomo **si
ferma** e ricorda lo stato; al ritorno riparte dal battito 1 o, se
`needsGesture()`, mostra in `#met-status` il comune `audio-resume-msg`.

## 6. Accessibilità e layout

`#met-bpm` è `aria-live="polite"`: annuncia il valore, mai i battiti.
`#met-bpm-control`: frecce ±1, PagSu/PagGiù ±5, Home/Fine 30/300,
`aria-valuenow`/`aria-valuetext` aggiornati. Target ≥ 44 px, `#met-toggle`
≥ 72 px; con `prefers-reduced-motion` i pallini cambiano colore senza
transizione. A **390×844 i controlli stanno in una schermata senza scroll**
(footer sotto la piega); desktop centrato **max 560 px**; a 360 px niente scroll
orizzontale.

## 7. Chiavi i18n (`metronomo/i18n.js`)

Formato `chiave` IT / EN; le battute non si traducono, `met-title` serve anche a
`mountBar`.

- `met-title` Metronomo / Metronome
- `met-bpm-aria` Tempo in battiti al minuto / Tempo in beats per minute
- `met-step-minus1|plus1|minus5|plus5` Meno 1, Più 1, Meno 5, Più 5 / Minus 1, Plus 1, Minus 5, Plus 5
- `met-tap` Tap / Tap — `met-tap-aria` Tocca a tempo per impostare il BPM / Tap in time to set the BPM
- `met-meter` Battuta / Time signature — `met-subdiv` Suddivisione / Subdivision
- `met-sub-1|2|3|4` Quarti, Ottavi, Terzine, Sedicesimi / Quarters, Eighths, Triplets, Sixteenths
- `met-sound` Suono / Sound — `met-volume` Volume / Volume
- `met-sound-legno|beep|rimshot` Legno, Beep, Rimshot / Wood, Beep, Rimshot
- `met-start` Avvia / Start — `met-stop` Ferma / Stop
- `met-toggle-aria` Avvia o ferma (barra spaziatrice) / Start or stop (spacebar)
- `met-hint` Barra spaziatrice per avviare / Spacebar to start

## 8. Aggiornamenti fuori dalla cartella

- `shared/tools.js`: metronomo `status: 'live'` senza `next`; `next: true`
  all'accordatore.
- `toolbox/sw.js`: `VERSION = 'tb-v6'`; in `TOOLS` `/metronomo/` e i suoi tre
  file; `/shared/scheduler.js` in `SHELL`.
- `sitemap.xml`: `<url>` di `/metronomo/`, priorità 0.8, `lastmod` di oggi.
- `manifest.webmanifest`: `shortcuts` con `{ name: "Metronomo", short_name:
  "Metronomo", url: "/metronomo/", icons: [icon-192] }`.
- Vetrina, `_headers` e CSP invariati.

## 9. Divisione del lavoro

**builder (Sonnet)**, nessuna riga di JS: `index.html` (markup dei §1–§2, testi IT
statici come default), `metronomo.css` (comprese `.met-dot`, `.is-on`,
`.is-accent`, create a runtime), `metronomo/i18n.js`, `shared/tools.js`, `sw.js`,
`sitemap.xml`, `manifest.webmanifest`.

**implementer (Opus)**, tutto il JS: `shared/scheduler.js` e `metronomo.js`
(motore, suoni, tap tempo, wake lock, visibilità, preferenze, tastiera,
trascinamento, `requestAnimationFrame`, binding del DOM). Non tocca HTML né CSS:
se manca un aggancio lo segnala invece di aggiungerlo.

## 10. Criteri di accettazione

1. 1000 battiti a 120 BPM: `|t[999] − t[0] − 499,5 s| < 5 ms` con
   `AudioContext.currentTime`.
2. 4 tap a 500 ms → **120 ± 1**; un tap dopo 2 s apre una serie nuova.
3. `+5` a 298 dà 300, `−5` a 32 dà 30: mai fuori da 30–300.
4. A 120 BPM in 4/4 il pallino 1 è arancione e si accende entro **50 ms**
   dall'accento udibile (log rAF/audio).
5. Terzine a 60 BPM: 3 click per impulso, intermedi più deboli, un pallino solo;
   le 7 battute danno gli accenti del §3 (6/8 → 6 click, accenti su 1 e 4).
6. La barra spaziatrice avvia e ferma anche col fuoco su un bottone battuta;
   frecce ±1, PagSu/PagGiù ±5, Home/Fine ai limiti.
7. Dopo il ricaricamento i cinque preset sono invariati.
8. Wake lock: su Android/Chrome lo schermo resta acceso mentre suona e si rilascia
   a stop e in uscita; su iOS nessun errore in console.
9. Scheda nascosta mentre suona → si ferma; al ritorno riparte dal battito 1 o
   mostra "Tocca per riprendere".
10. A 390×844 ogni controllo raggiungibile senza scroll; a 360 px nessuno scroll
    orizzontale; target ≥ 44 px.
11. 20 cicli avvio/stop: un solo `AudioContext`, `running() === false`, coda vuota,
    nessun timer o nodo residuo.
12. Nessuna violazione CSP né richiesta esterna; offline `/metronomo/` si apre e
    suona; `node scripts/check.mjs` passa (LF, IT/EN, `VERSION` tb-v6, precache);
    la dashboard mostra metronomo attivo, accordatore prossimo.
