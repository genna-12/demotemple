# Spec 03 — Componenti e rifiniture

Vale per tutti gli strumenti; integra la 02, corregge 10/11 dove diverge.

## 1. Token nuovi (`tokens.css`)

`--r-pill/lg/md/sm` (999/22/16/12px), `--sp-1…5` (4/8/12/16/24px), `--tap: 44px`, `--grad-accent` (135°, #e07048 → #cf5c36 → #b64d2c), `--shadow-btn` e `--shadow-pop`, `--surface-1` e `--track`, `--dur-fast: .18s` e `--dur-med: .3s`. I componenti usano solo token: nessun colore a mano.

## 2. Set componenti (`components.css`, prefisso `tb-`)

Regole comuni: altezza ≥ 44px; hover solo con puntatore fine; `:active`/`.is-pressed` scala 0.97; `:focus-visible` arancione; disabilitato a opacità 0.45 senza cambi di colore; transizioni `--dur-fast`, azzerate con reduced-motion.

- **`.tb-btn`** (base glass scuro = secondario), varianti `--primary` (`--grad-accent`, bordo chiaro in alto, `--shadow-btn`: arancione ma con vetro, non piatto), `--ghost` (solo testo), `--icon` (tondo 44px), `--lg` (azione principale, 56px, min 200px, maiuscolo). Un solo `--primary` per schermata.
- **`.tb-segment`** (`role="radiogroup"`) > `.tb-segment-btn` a pillola 40px, selezione con `aria-checked` e `--grad-accent` tenue; variante `--scroll` (scorrimento orizzontale con snap, sfumature ai bordi, scrollbar nascosta). Sostituisce le file di bottoni fatte a mano.
- **`.tb-select`**: pillola glass (etichetta, valore, chevron) che apre `.tb-select-panel` (`role="listbox"`, glass, `--shadow-pop`) con `.tb-select-option` (`role="option"`, `aria-selected`, spunta SVG). Mai una tendina nativa a video: nel markup resta un `<select class="tb-select-native">` (valore anche senza JS) che il JS nasconde. Apre con click, Invio, Spazio o frecce; frecce, Home, End e lettere scorrono; Esc, tocco fuori o scelta chiudono e riportano il focus. Pannello sotto (sopra se manca spazio), `.tb-sheet` sotto 480px.
- **`.tb-range`**: contenitore alto 44px, traccia 4px, riempimento arancione via `--tb-fill`, thumb tondo 26px glass, `.tb-range-value` a cifre tabellari.
- **`.tb-toggle`**: `button` con `role="switch"`, pista 52×32, pallino glass, pista arancione quando attivo.
- **`.tb-number`**: campo inline (cifre tabellari, `inputmode="numeric"`); Invio o uscita confermano, Esc annulla, i valori fuori scala rientrano nei limiti.
- **`.tb-info`**: bottone tondo 28px (area 44px) con la "i", `aria-haspopup="dialog"`, apre **`.tb-sheet`** (`.tb-sheet-head` con titolo e chiusura, `.tb-sheet-body`): foglio dal basso con scrim, uguale su telefono e PC (decisione: un solo componente, niente popover separato da 768px), chiusura con X, scrim o Esc e focus trap come nel menu.
- **`.tb-status` e `.tb-toast`** restano: colori dai token, azione del toast a 44px.

## 3. Menu

Ordine: **Dashboard**, intestazione **Strumenti** (`.tb-menu-title`) con le famiglie compatte, riga **Installa l'app** (passi iPhone nel `<details>`), in fondo lingua IT/EN e **Sito dello studio**.

**Zero simboli decorativi.** `tb-back` → icona freccia più "Toolbox"; `bar-logo-aria` → "Toolbox, vai alla dashboard"; il "↗" della 02 non si introduce; il segnaposto della nota diventa una casella vuota con etichetta "nessuna nota"; il meno del tile e il più del picker diventano icone dello sprite. Restano i `−5/+5` del metronomo: sono valori.

## 4. Footer

Una riga su ogni pagina, testo piccolo e muted, link alti 44px: `Tiny Temple Studio · Privacy · Designed by Genna`. "Privacy" porta a Iubenda, "Designed by Genna" è testo. Il link resta perché la Toolbox è un dominio a sé e l'informativa va raggiunta da ogni pagina; cookie policy e note legali restano sulla vetrina (qui niente cookie né terze parti).

## 5. Dashboard: riordino con maniglia

In Modifica ogni tile mostra `.tb-tile-grip` (44px in alto a sinistra, icona a sei punti, `aria-hidden`; il focus resta sul tile). Il trascinamento parte **solo** dal grip (`touch-action: none` lì); il `<li>` torna a `pan-y`, così la pagina scorre col dito sul resto. Da tastiera nulla cambia.

## 6. Accordatore

- Strumento: `tb-select` al posto del `<select>`.
- Riga A4: `tb-range`, valore, `tb-info` (foglio: a cosa serve il riferimento 440 Hz e perché non si tocca a caso) e `tb-btn--ghost` "Reimposta 440", disabilitato quando è già 440.
- **Revoca microfono:** `tb-btn--ghost` "Disattiva microfono" accanto allo stato, in Ascolto e solo con permesso attivo. **Solo nello strumento:** il menu è navigazione, il comando serve dove il microfono è in uso.
- **Cromatica:** in Ascolto solo nota, ottava e cent; in Riferimento una tastiera di 12 note (`.acc-keys`, tasti ≥ 44px) con `tb-segment` per l'ottava 2–5.
- **Loop:** "Ripeti" diventa "Suona in loop" (secondario con `aria-pressed`), spento finché non si sceglie una nota, con la riga "Scegli prima una nota".

## 7. Applicazione retroattiva

- **Metronomo:** `.met-step`/`.met-tap` → `tb-btn--icon`/`--secondary`; `.met-choices` → `tb-segment`/`--scroll`; volume → `tb-range`; `#met-toggle` → `tb-btn--lg`; `.met-bpm-input` → `tb-number`; il contatore → `tb-sheet`. La rotella BPM resta com'è.
- **Accordatore:** `.acc-mode` → `tb-segment`; `.acc-select` → `tb-select`; `.acc-a4` → `tb-range`; `#acc-loop` → secondario con `aria-pressed`; consenso microfono con `tb-btn--primary`.
- Le classi proprie restano dove il disegno è unico.

## 8. Testi

| chiave | IT | EN |
|---|---|---|
| menu-tools · footer-designed | Strumenti · Designed by Genna | Tools · Designed by Genna |
| sheet-close · info-aria · acc-a4-reset | Chiudi · Che cos'è · Reimposta 440 | Close · What is this · Reset to 440 |
| acc-a4-info-title / -text | Riferimento A4 / Gli strumenti si accordano su un La di riferimento: 440 Hz è lo standard. Cambialo solo se suoni con chi ne usa un altro. | A4 reference / Instruments tune to a reference A: 440 Hz is the standard. Change it only if you play with someone using another one. |
| acc-mic-off · acc-octave · acc-note-empty | Disattiva microfono · Ottava · nessuna nota | Turn the microphone off · Octave · no note |
| acc-loop · acc-loop-hint | Suona in loop · Scegli prima una nota | Play in a loop · Pick a note first |

## 9. Divisione del lavoro

**builder (Sonnet):** `tokens.css`; `components.css` (§2, più status e toast); `base.css` (§3, §4); markup di `index.html`, `404.html`, `metronomo/index.html`, `accordatore/index.html` e sprite; `i18n-common.js` e i due `i18n.js`; `sw.js` (VERSION, precache).

**implementer (Opus):** `shared/select.js` (tastiera, posizionamento), `shared/sheet.js` (`tb-sheet` e `tb-info`, focus trap condiviso con `nav.js`), `shared/dash.js` (maniglia, `touch-action`), `accordatore/accordatore.js` (revoca, cromatica, loop, montaggio). Niente audio: consegna a parte.

## 10. Criteri di accettazione

1. Nessuna tendina nativa: il selettore è il pannello glass, usabile con tastiera ed Esc.
2. Una schermata ha un solo pulsante `--primary`.
3. Battuta, suddivisione, suono, modalità e ottava usano `tb-segment`.
4. Volume e A4 usano `tb-range`: traccia sottile, riempimento arancione, area di tocco 44px.
5. Il foglio info è lo stesso su telefono e PC (decisione: un solo componente), chiudibile con X, scrim ed Esc.
6. In Modifica la pagina scorre col dito sulla tile; si trascina solo dal grip.
7. Il footer è una riga uguale ovunque, con "Privacy" cliccabile.
8. Menu: Dashboard, Strumenti, Installa, lingua, sito.
9. Nessun emoji o simbolo decorativo in testi e template; le frecce sono icone SVG.
10. Nell'accordatore il microfono si disattiva, la cromatica non mostra corde in Ascolto, il loop resta spento senza nota scelta.
11. `check.mjs` passa; con reduced-motion nessun componente nuovo si anima.
