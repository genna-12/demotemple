# Spec 12 — Calcolatore tempo (strumento 3)

Pagina `/calcolatore-tempo/`. Template pagina strumento della 10 §1, componenti della 03 §2.

## 1. Scopo e utente

Chi mixa o produce ricava dal BPM i tempi di delay e riverbero, le frequenze di un LFO e la
corrispondenza nota/Hz per l'EQ, senza siti pieni di pubblicità. Uno strumento, tre schede
(`tb-segment` sotto l'h1): **Delay & Reverb**, **Nota ↔ Hz**, **Sidechain**. Fuori perimetro: audio
(nessun suono, nessun `AudioContext`), microfono, preset, export. Le regole mostrate sono convenzioni
documentate, non verità.

## 2. Vincoli applicati

Aritmetica pura: nessuna libreria, nessuna rete, nessun permesso nuovo, `_headers` **non** si tocca.
Nessun tracciamento, **impatto informative: nessuno**. La copia usa `navigator.clipboard.writeText`
(locale, nessun permesso su HTTPS), con ripiego `<textarea>` fuori schermo + `execCommand('copy')`
nei browser in-app; se fallisce, il valore resta selezionato col toast "Copia a mano". Offline dal
primo caricamento, nessuno `style=""`.

## 3. Flusso utente

Stati: **pronto** (BPM dalle prefs, altrimenti 120) → **risultato**, sempre presente → **copiato**
(toast). Niente vuoto, errore o permesso negato: un valore fuori scala rientra nei limiti.

Scheda 1: rotella + numero BPM in alto, `tb-segment` unità **ms / Hz**, tabella 7 righe (1/1 … 1/64)
× 3 colonne (Normale / Puntata / Terzina); sotto il blocco Riverbero (pre-delay 1/64 e 1/128; decay
1, 2 e 4 battute in 4/4). Tap su una cella → appunti + toast.
Scheda 2: `tb-segment` direzione **Nota → Hz / Hz → Nota**; nota con `tb-segment--scroll`, ottava con
`tb-select` (0–8), A4 con `tb-range` 415–466 e `tb-info`; risultato in Hz con lunghezza d'onda
(343 m/s) e periodo; in inverso un `tb-number` Hz dà nota, ottava e cent.
Scheda 3: stessa riga BPM, rate LFO in Hz (1/1 … 1/16), attacco e rilascio consigliati.

Etichette (IT · EN), chiavi `calc-` in entrambe le lingue: Calcolatore tempo · Tempo calculator;
Delay e riverbero · Delay & reverb; Nota e frequenza · Note & frequency; Suddivisione · Division;
Normale · Straight; Puntata · Dotted; Terzina · Triplet; Coda · Decay; 1 battuta · 1 bar; Lunghezza
d'onda · Wavelength; Periodo · Period; Copiato · Copied; Attacco · Attack; Rilascio · Release.

## 4. Architettura

**Nuovi:** `toolbox/calcolatore-tempo/{index.html, calcolatore-tempo.js, calcolatore-tempo.css,
i18n.js}`; `toolbox/shared/tempo-math.js`; `toolbox/shared/bpm-control.js`.

**`shared/tempo-math.js`** — pure, senza DOM né import: `msPerBeat(bpm)`, `divisionMs(bpm, den,
mod)` con `mod` ∈ `straight|dotted|triplet` (×1, ×1,5, ×2/3), `tempoTable(bpm)` (7 × 3),
`hzFromMs(ms)` = `1000/ms`, `reverb(bpm)` (pre-delay 1/64 e 1/128; decay 1, 2, 4 battute = 4, 8, 16
movimenti in 4/4), `sidechain(bpm)` (rate 1/1…1/16; attacco 0,5–5 ms; rilascio 0,60 × intervallo
"morbido" e 0,35 × "deciso"), `wavelength(hz, c = 343)`, `periodMs(hz)`. Nota↔Hz riusa
`shared/pitch.js` (`noteToHz`, `noteInfo`, `midiToHz`). I moduli restituiscono numeri, la UI formatta
con `Intl.NumberFormat(lang)`.

**`shared/bpm-control.js`** — estrazione **a parametri, non a rinomina**: da `metronomo.js` si
spostano clamp, valore continuo, posa delle tacche, drag con pointer capture, inerzia, snap, rotella
del mouse, bordi ±1, tasti e l'editor del numero, in `createBpmControl({ wheel, drum, readout, input,
min, max, value, ticks, classes: { tick, major, dragging }, onChange })`. Id, classi e CSS del
metronomo restano identici: passa i propri elementi e `met-tick`/`is-major`/`is-dragging`, perde ~180
righe, markup e `metronomo.css` intatti. Motivo: la rotella 3D è il pezzo più collaudato del
progetto, rifarla semplificata significa mantenerne due e rinominare le classi tocca file su cui
lavorano altri agenti. Costo: `components.css` ospita un blocco `.tb-wheel*` (~40 righe) parallelo a
quello del metronomo, da unificare alla prossima revisione.

**A4 condiviso.** `prefs` compone `tt.<tool>.<key>`: `tt.a4` non è esprimibile, la chiave comune è
**`tt.shared.a4`** (`prefs.get('shared','a4')`). Migrazione senza toccare l'accordatore: si legge
`shared.a4`, in mancanza `accordatore.a4`, e si scrive in **entrambe**; l'accordatore passerà a
`shared` alla sua prossima revisione.

**Prefs** (`tt.calcolatore-tempo.*`): `bpm`, `tab`, `unit`, `dir`.

**Modificati:** `shared/tools.js` (`calcolatore-tempo` → `status: 'live'`; `next: true` resta su
`dna`); `sw.js` (VERSION = **la prossima disponibile**, la assegna il builder; in `TOOLS` i quattro
file della cartella, in `SHELL` i due moduli nuovi); `sitemap.xml` (nuova `<url>`, priorità 0.8);
`manifest.webmanifest` (terzo `shortcut`); `shared/i18n-common.js` solo se manca
`tool-calcolatore-tempo`.

**Layout.** Una schermata per scheda a 390×844 senza scroll; `.tb-shell` max 640 px su desktop.
Tabella compatta, `tabular-nums`, righe 34 px con area di tocco 44 px, `<caption>` e `<th
scope="col">`/`scope="row"`, celle `<button>` con `aria-label` esteso ("1/8 puntata, 375
millisecondi, copia"). Scheda 2 in `aria-live="polite"`, toast da `ui.js`, h1 visibile, footer
comune, barra senza titolo.

## 5. Divisione del lavoro

**builder (Sonnet):** `calcolatore-tempo/index.html` (template 10 §1; tabelle che il JS riempie),
`calcolatore-tempo.css`, blocco `.tb-wheel*` in `components.css`, `calcolatore-tempo/i18n.js`,
`shared/tools.js`, `sw.js`, `sitemap.xml`, `manifest.webmanifest`.

**implementer (Opus):** `shared/tempo-math.js`, `shared/bpm-control.js` e l'adeguamento di
`metronomo.js` (sola sostituzione del blocco rotella/editor, comportamento invariato),
`calcolatore-tempo/calcolatore-tempo.js` (schede, copia, prefs, A4 condiviso).

## 6. Criteri di accettazione

1. 120 BPM: 1/4 = 500,00 ms; 1/8 puntato = 375,00; 1/8 terzina = 166,67; 1/1 = 2000,00; 1/64 = 31,25.
2. 90 BPM: 1/4 = 666,67; 1/16 = 166,67; 1/2 puntata = 2000,00. In Hz a 120: 1/4 = 2,000; 1/1 = 0,500.
3. Riverbero a 120: pre-delay 31,25 e 15,63 ms; decay 2000, 4000, 8000 ms.
4. Sidechain a 120: rate 1/4 = 2 Hz; rilascio 300 ms morbido, 175 deciso; attacco 0,5–5 ms.
5. A4 440: A4 → 440,00 Hz, 0 cent; 455 Hz → A#4, −42 cent; 440 Hz → 0,78 m e 2,27 ms.
6. A4 a 432: A4 → 432,00 Hz; dopo un ricarico il valore compare nell'accordatore e viceversa.
7. Tap su "1/4" a 120: gli appunti contengono `500` e compare "Copiato"; senza clipboard copia il
   ripiego, altrimenti "Copia a mano".
8. `tempo-math.js` importato in Node (senza DOM) dà i valori dei criteri 1–4.
9. 390×844: ogni scheda in una schermata senza scroll; bersagli ≥ 44 px; cifre stabili al cambio BPM.
10. Il metronomo dopo l'estrazione supera invariati i criteri 13–17 della 10 (80 px = 10 BPM,
    inerzia < 1 s, ±1 con rotella e bordi, `250`+Invio → 250, `999` → 300, Esc annulla).
11. Tabella navigabile da tastiera, intestazioni di riga e colonna lette, scheda 2 annunciata una
    volta per cambiamento.
12. BPM e scheda tornano come erano dopo un ricarico; `?lang=en` traduce tutto.
13. `node scripts/check.mjs` passa (LF, parità IT/EN, precache, VERSION alzata).
14. *Da provare su iPhone:* copia in standalone; rotella senza scroll di pagina; nessun zoom sul
    campo numerico (font ≥ 16 px).

## 7. Rischi e alternative scartate

- **Estrazione della rotella:** rischio di regressione sul metronomo, contenuto tenendo id, classi e
  CSS invariati, verificato dal criterio 10. Scartata la versione senza 3D: due rotelle diverse nella
  stessa Toolbox si notano.
- **Decay in battute** fissato a 4/4 e dichiarato nell'interfaccia (in 3/4 si legge 1/1 e si
  moltiplica); **343 m/s** fisso, la temperatura è irrilevante per un'EQ: detto nel `tb-info`.
- Scartati il tap tempo (è nel metronomo) e una quarta scheda di analisi (appartiene a DNA).
