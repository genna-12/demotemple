# Spec 11 — Accordatore (strumento 2)

17 settembre 2026. Pagina `/accordatore/`. **Primo strumento con microfono**:
fissa il flusso di consenso per gli strumenti futuri.

## 1. Scopo e perimetro

Accordare chitarra, basso, ukulele, violino dal microfono (**Ascolto**) o a
orecchio (**Riferimento**). Fuori perimetro: accordature personalizzate,
polifonia, registrazione.

## 2. Vincoli applicati

Tutto locale, offline, nessuna rete. `toolbox/_headers` ha già
`microphone=(self)` e CSP `script-src`/`worker-src 'self'`: **nessuna
modifica**, nessun `'wasm-unsafe-eval'` — pitchy è JS puro (solo `.js`/`.d.ts`
nel pacchetto). **Impatto informative:** citare in Iubenda che la Toolbox può
chiedere il microfono e che l'audio resta nel browser (`mic-consent-text`).

## 3. Consenso al microfono e fallback

Stato iniziale **Riferimento**, sempre disponibile. La scheda Ascolto mostra
`mic.renderConsent(#acc-consent, { onAllow })`; `onAllow` gira **dentro il
gesto**: `audio.unlock()`, poi `mic.acquire()`. Mai `getUserMedia` al
caricamento. Stati in `#acc-status` (`ui.setStatus`):

- `unasked` → box informativo + "Attiva il microfono"; `granted` → ascolto;
- `denied` → `mic-denied` + `mic-retry`; Riferimento resta usabile;
- `unavailable` → `mic-unavailable`, più `acc-inapp` nei browser in-app
  (niente `mediaDevices`, UA Instagram/Facebook/TikTok);
- `suspended`/`lost`/`ended` (da `mic.onStateChange`) → pausa, neutro,
  `acc-mic-lost`; `resumed` → nodo ricreato con `mic.source(ctx)`;
- `audio.needsGesture()` (iOS `interrupted`) → `audio-resume-msg`.

`mic.release()` all'uscita dalla scheda; pagina nascosta e `pagehide` li
gestisce già `mic.js`: non duplicare i listener.

## 4. Modalità A — Ascolto

Catena: `mic.source(ctx)` → highpass 60 Hz (Q 0,707) → analizzatore. Finestra
**2048**, hop 1024, `audio.sampleRate()` **letto a runtime** (44,1 o 48 kHz,
mai assunto). Calcolo in `shared/pitch-worklet.js` via `audio.addWorklet()`; se
torna `false` (bug AudioWorklet iOS) fallback a `ScriptProcessorNode` 2048,
stesso messaggio. pitchy (`PitchDetector.forFloat32Array`) dà
`[hz, clarity]`; scarto se `clarity < 0,90`, `hz` fuori 28–1400 Hz o RMS sotto
−55 dBFS. **Mediana su 5 frame**; meno di 3 frame validi in 400 ms → neutro.
MIDI = `69 + 12·log2(hz/A4)`; **cent = 100·(MIDI − intero)**, in −50..+50.
Corda evidenziata: la più vicina entro ±150 cent; in **cromatica** solo nota e
ottava. UI: nota grande, ottava piccola, ago in `rAF` (molla critica, 60 ms),
verde in **±5 cent** più un cambio di forma per chi non distingue i colori.
`aria-live="polite"` su nota + "giusta/calante/crescente", throttle 700 ms.

## 5. Modalità B — Riferimento

Tocco su una corda → `OscillatorNode` ~2 s, o in loop con `#acc-loop`:
fondamentale sine + 2ª armonica −10 dB + 3ª −16 dB, attacco 8 ms, decadimento
esponenziale a 1,8 s, `GainNode` per voce liberato da `onended`. Una nota per
volta, la precedente rilasciata in 30 ms. **A4 415–466 Hz** (passo 1, default
440) in `storage.prefs('accordatore','a4')`, per entrambe le modalità.

**Accordature** (`#acc-instrument`, in prefs): chitarra E2 A2 D3 G3 B3 E4 ·
drop D D2 A2 D3 G3 B3 E4 · DADGAD D2 A2 D3 G3 A3 D4 · mezzo tono giù E♭2 A♭2
D♭3 G♭3 B♭3 E♭4 · basso 4 E1 A1 D2 G2 · basso 5 B0 E1 A1 D2 G2 · ukulele G4 C4
E4 A4 (rientrante) · violino G3 D4 A4 E5 · cromatico.

## 6. Markup (id fissati qui)

`#acc-mode` radiogroup con `button[data-acc-mode="listen|reference"]` ·
`#acc-consent` · `#acc-instrument` (`select`) · `#acc-strings` (vuoto: il JS vi
crea `button.acc-string`, `.is-target`, `.is-near`) · `#acc-note`
(`aria-live="polite" aria-atomic`) · `#acc-octave` · `#acc-cents` ·
`#acc-gauge` (`role="img"`, `aria-label` `acc-gauge-aria`) con `.acc-needle` ·
`#acc-a4` (`range` 415–466) + `#acc-a4-value` · `#acc-loop` (`aria-pressed`) ·
`#acc-status` (`.tb-status`). Nessun `style=""`. Resto come il template §1 della
spec 10: barra con solo logo e hamburger, `h1[data-i18n="acc-title"]` visibile,
safe-area, ≥ 44 px, una schermata a 390×844, desktop 560 px.

## 7. File e librerie

Nuovi: `toolbox/accordatore/{index.html,accordatore.js,accordatore.css,i18n.js}`,
`toolbox/shared/pitch.js` (riusabile per vocal range e DNA) e
`toolbox/shared/pitch-worklet.js`.
**Vendor** `toolbox/vendor/pitchy@4.1.0/` (~32 KB, nessuna dipendenza residua):
`pitchy.js` (l'`index.js` del pacchetto, 18,4 KB, unica modifica
`import FFT from "fft.js"` → `"./fft.js"`), `fft.js` (**4.0.4**, MIT, 13,1 KB:
`module.exports = FFT` → `export default FFT`), `LICENSE` (pitchy, MIT) e
`LICENSE-fft.js` (testo MIT dal README: fft.js non spedisce una licenza). Il
worklet importa con percorso assoluto `/vendor/pitchy@4.1.0/…`.
Modifiche: `sw.js` → `VERSION = 'tb-v8'`, `TOOLS` + i 4 file di
`/accordatore/`, `SHELL` + `pitch.js`, `pitch-worklet.js` **e** i due file di
`/vendor/pitchy@4.1.0/` (`pitchy.js`, `fft.js`): eccezione al principio
generale "vendor non va in SHELL, ha la sua cache runtime
`toolbox-vendor`", voluta perché l'installazione tutto-o-niente li scarichi
subito e l'accordatore funzioni offline dal primo uso, senza aspettare che
`toolbox-vendor` si popoli da sé; `vendor()` in sw.js li trova comunque
anche lì come ripiego prima della rete. `shared/tools.js` → accordatore
`'live'` senza `next`, `next: true` a `dna`; `sitemap.xml` (priorità 0.8);
`manifest.webmanifest` shortcut. `_headers` e vetrina invariati.

## 8. i18n (`accordatore/i18n.js`, prefisso `acc-`, IT / EN)

`acc-title` Accordatore / Tuner · `acc-mode-listen` Ascolto / Listen ·
`acc-mode-reference` Riferimento / Reference · `acc-instrument` Strumento /
Instrument · `acc-inst-guitar|drop-d|dadgad|half-step|bass4|bass5|ukulele|violin|chromatic`
= i nove nomi del §5 (Mezzo tono giù / Half step down, Basso 4 corde /
4-string bass, Cromatica / Chromatic; gli altri identici) · `acc-a4`
Riferimento A4 / A4 reference · `acc-loop` Ripeti / Loop · `acc-in-tune`
Giusta / In tune ·
`acc-flat` Calante / Flat · `acc-sharp` Crescente / Sharp · `acc-listening`
In ascolto… / Listening… · `acc-no-signal` Suona una corda / Play a string ·
`acc-mic-lost` Microfono interrotto / Mic interrupted · `acc-inapp` Apri in
Safari per il microfono / Open in Safari · `acc-gauge-aria` Scostamento in
cent / Deviation in cents.

## 9. Divisione del lavoro

**builder (Sonnet)**, nessuna logica JS: `index.html` (markup §6, testi IT
statici), `accordatore.css` (comprese `.acc-string.is-target/.is-near` e
`.acc-needle`), `accordatore/i18n.js`, `shared/tools.js`,
`sw.js`, `sitemap.xml`, `manifest.webmanifest`, **copia del vendor** (due
sostituzioni, due LICENSE).

**implementer (Opus)**, tutto il JS: `shared/pitch.js` (analizzatore, mediana,
Hz→nota/cent, scelta corda, worklet + fallback, buffer riusati: **nessuna
allocazione per frame**), `shared/pitch-worklet.js`, `accordatore.js` (consenso,
schede, oscillatori, A4, prefs, `rAF`, ARIA, visibilità). Non tocca HTML/CSS.

## 10. Criteri di accettazione

Segnali sintetici al posto del microfono.

1. Seno 440 Hz → **A4, 0 ± 2 cent entro 200 ms**; con A4 = 432 → **+32 ± 3**.
2. Seno 82,41 Hz, chitarra → **E2**, corda 6 `.is-near` (rilevata in ascolto;
   `.is-target` è solo la corda scelta a mano, non quella rilevata), 0 ± 3 cent.
3. Silenzio (−80 dBFS), rumore bianco e ronzio 50 Hz (−20 dBFS) → **nessuna
   nota**, ago neutro, `acc-no-signal`.
4. Seno 439 Hz → **verde**, 437 Hz no; glissando 440→466 Hz in 2 s: ago in
   salita, nessun salto d'ottava.
5. Riferimento: tocco su una corda → nota udibile ~2 s; `#acc-loop` la ripete;
   un secondo tocco ferma la prima senza click.
6. A4 e strumento sopravvivono al ricaricamento; A4 fuori 415–466 è clampato.
7. `getUserMedia` **non** parte prima del tocco su "Attiva il microfono";
   negato → `mic-denied`, Riferimento funzionante.
8. Scheda nascosta → tracce ferme; al ritorno `resumed` ricrea il nodo, o
   compare `audio-resume-msg`.
9. 5 minuti di ascolto: CPU stabile, heap piatto, un solo `AudioContext`.
10. `addWorklet()` a `false` → il fallback dà gli esiti dei criteri 1–4.
11. A 390×844 nessuno scroll; a 360 px nessuno scroll orizzontale; ≥ 44 px;
    reduced-motion → ago senza transizione.
12. Nessuna violazione CSP né richiesta esterna; offline la pagina si apre,
    ascolta e suona; `node scripts/check.mjs` passa; la dashboard mostra
    accordatore attivo, DNA prossimo.
13. **Da provare su iPhone**: microfono in PWA standalone, AudioWorklet vs
    fallback, `interrupted` dopo una chiamata, microfono a schermo spento.

## 11. Rischi e alternative scartate

- **fft.js è CommonJS**: senza riscrittura a ESM il vendor non carica.
  Scartato `esm.sh`/jsDelivr: viola costo zero, offline e CSP.
- **AudioWorklet iOS** instabile: da qui il doppio percorso.
- **Autocorrelazione a mano**: scartata, MPM è più robusto sulle ottave.
- B0 (30,87 Hz) con finestra 2048 a 48 kHz è al limite: se il basso 5 risulta
  instabile si valuta 4096 per i gravi.
