# Spec 21 — Accordatore e Metronomo portati a «completo» (T2/3-4)

Base: brief 21 (il «già fatto» non si rifà), spec 10, 11, 18 §3-6. Righe = `accordatore.js` e `metronomo.js` di oggi.

## 1. Scopo e utente

Chi accorda ritrova la corda di prima; chi prova salva i tempi dei brani, li scorre in scaletta,
parte dopo una battuta d'attacco. **Fuori:** riordino dei preset, rhythm trainer, accelerando,
poliritmi, vibrazione, DSP, corda ricordata in Cromatica.

## 2. Vincoli applicati

Zero rete, permessi, librerie, impatto informative. Prefs: `tt.accordatore.corda` (locale, fuori
da `PORTABILI`, `archivio.js` 1011), `tt.metronomo.countin` (portabile, §7). `VERSION` +1 in `toolbox/sw.js` e
`shared/versione.js`; `metronomo/preset.js` in precache.

## 3. Flusso utente

**Accordatore — ultima corda.** Tocco in Riferimento (726-734) → `corda[ui.instrument] = i` (anche
`custom:<id>`). Dopo `buildStrings` (azzera `target`, 311)
in `setInstrument` (694) e all'avvio **dopo** la scelta della modalità (1075-1077): se
`ui.mode === 'reference'` e l'indice esiste, `target = i; markStrings(-1)`, **senza**
`playChosen`. In Ascolto il tocco non scrive. Accordatura eliminata (anche via sync): chiave tolta.

**Metronomo — preset.** Righe, non chip: a 390 px nome, riassunto e due icone non stanno in un chip
(schema delle righe DNA). «Salva preset» crea la riga con nome proposto `96 · 4/4` e la
apre in rinomina (input selezionato): si scrive o si lascia. Riga = nome + `96 BPM · 4/4 · ottavi`
(suddivisione omessa se quarti); tocco → applica (fermo: subito; in esecuzione: **al prossimo
battere**, volume subito). `.is-current` sulla riga i cui valori coincidono con lo stato.
Matita → input (24 car., Invio/blur conferma, Esc annulla, vuoto = nome di prima). × → lapide,
toast 8 s con «Annulla» (schema `dash.js` 265-289) che riscrive stesso id e dati. Ordine = id.

**Scaletta: entra** (~0,15 giro: un `pending` nel motore, un bottone, un test).
`#met-preset-next` (≥ 2 preset) applica il successivo all'ultimo applicato (nessuno → il primo);
disabilitato sull'ultimo.

**Battuta d'attacco.** `#met-countin` (`aria-pressed`) → pref. All'Avvia da fermo: una battuta di
**soli accenti** (`pulses` click, niente suddivisioni; nessun timbro nuovo), pallini con
`#met-dots.is-count` (neutri, non arancioni), poi il click vero. Niente attacco per cambi in
corsa; sì a ogni Avvia e al ritorno da scheda nascosta (708).

## 4. Architettura

**Motore** (`createEngine`, 188-283). `start({ countIn })` (266): `conta = countIn ? pulses : 0`.
In `onSchedule` (221): con `conta > 0` suona `voices.play('accent', …)`, `data = { …, kind:
'count', pulse: pulses − conta }`, `conta−−`, flag `ultimoConta`; a fine attacco `pulse = sub = 0`.
`nextInterval` (238), chiamato **dopo** `onSchedule` (`scheduler.js` 56/62): `60 / bpm /
(ultimoConta ? 1 : subdiv)`. BPM cambiato nell'attacco: vale dal click dopo (spec 10 §4), l'attacco
non ricomincia né si accorcia. `setMeter` nell'attacco: `conta = 0`, poi il «1» vero. `stop` azzera. **Pending:** `applicaAlBattere(v)` salva `{bpm, meter,
subdiv, sound}`; in `onSchedule`, se `pulse === 0 && sub === 0` e fuori attacco, `Object.assign
(state, v)` e `data.cambio = true`; un comando manuale lo annulla. Lo scheduler non cambia.

**Per i test:** `ensureEngine` (515) passa `onBeat`, che emette su `#met`
`CustomEvent('met-prenotato', { detail: { time, kind, pulse, bpm } })`. `frame` (414) toglie
`is-count` al primo evento non `count` e rifà i pallini su `cambio`.

**Nuovo `metronomo/preset.js`**, puro: `pulisci`, `ordina` (come `customOrder`, accordatore 167),
`nuovoId(list)` → `p<Date.now()>` unico (come 212-216), `nomeProposto`, `riassunto(p, t)`,
`uguale`, `successivo`. Collezione `metronomo-preset`, `dati = { nome, bpm, meter, subdiv,
sound, volume }`, 200 × 4 KB. `ErroreLimite` → status;
`inSolaLettura()` → bottoni disabilitati e status. `onArchivio` come accordatore 1100-1103.

**Markup** (builder): `#met-countin` (label + `.met-sub`) dopo `#met-toggle`; in `#met-tap` e
`#met-count` il `data-i18n` scende in uno `span` + `span.met-btn-sub`; dopo `.met-hint`
`section#met-presets` > `h2`, `#met-preset-next`, `#met-preset-save`, `ul#met-preset-list` (JS:
`li.met-preset[data-met-preset]` > `button.met-preset-apply` con `.met-preset-name` e
`.met-preset-sum`, `.met-preset-rename`, `.met-preset-del` con `data-tip`), `#met-preset-empty`,
`#met-preset-status.tb-status`. Accordatore: `#tb-mic-live` `tabindex="0"`
`data-tip="acc-mic-live-tip"`; `.tb-select-value` con ellissi.

**Microcopy IT / EN**
- `met-countin` Battuta d'attacco / Count-in · `met-countin-sub` una battuta prima di partire / one bar before the click
- `met-presets` Preset / Presets · `met-preset-save` Salva preset / Save preset
- `met-preset-next` Avanti ▸ / Next ▸ · `-aria` Passa al preset successivo / Go to the next preset
- `met-preset-rename` Rinomina / Rename · `-delete` Elimina / Delete · `-name-aria` Nome del preset / Preset name
- `met-preset-empty` Nessun preset: imposta il tempo e salva. / No presets yet: set the tempo and save.
- `met-preset-deleted` Preset «{nome}» eliminato / Preset “{nome}” deleted · `met-preset-undo` Annulla / Undo
- `met-preset-limit` Hai {max} preset, il massimo: eliminane uno. / You have {max} presets, the maximum: delete one.
- `met-preset-readonly` Archivio in sola lettura: i preset non si salvano. / Storage is read-only: presets can't be saved.
- `met-tap-sub` dai tu il tempo / tap the tempo · `met-count-sub` a tutto schermo / full screen
- hint: Trascina la rotella per cambiare · tocca il numero per scriverlo / Drag the wheel to change · tap the number to type it
- `acc-mode-listen` Ascolto (microfono) / Listen (mic) · `acc-custom-new` Personalizzata… (scegli tu le corde) / Custom… (pick your own strings)
- `acc-mic-live-tip` Microfono acceso: l'audio resta nel dispositivo / Mic on: audio stays on this device
- `aiuto.js`: voci «Preset e scaletta», «Battuta d'attacco»; accordatore: frase sulla corda ricordata.

## 5. Divisione del lavoro

- **implementer** (Opus): `metronomo/metronomo.js`, `metronomo/preset.js`,
  `accordatore/accordatore.js`, `toolbox/sw.js`, `shared/versione.js`,
  `scripts/e2e/tests/{metronomo,accordatore}-completo.spec.mjs`.
- **builder** (Sonnet): `index.html`, `.css`, `i18n.js`, `aiuto.js` delle due cartelle.
File disgiunti; contratto = §3-4.

## 6. Criteri di accettazione

Mobile e desktop. **M** = `metronomo-completo.spec.mjs`, **A** = `accordatore-completo.spec.mjs`.
**L** = `detail` di `met-prenotato` raccolti in pagina: tempi **calcolati**, non misurati, esatti.
1. M: 96, ottavi, «Salva preset» → input «96 · 4/4», «Prove lente» + Invio → «96 BPM · 4/4 ·
   ottavi»; reload → c'è; BPM 140, tocco → 96, ottavi, `.is-current`.
2. M: rinomina → reload → nome nuovo; Esc e vuoto non cambiano.
3. M: × → toast, «Annulla» → stessa posizione; × e attesa → lapide (`elenca conCancellati`).
4. M, due contesti (schema DNA §6.12): preset di 1 compare su 2 **senza reload**; eliminato su
   2 → sparisce da 1.
5. M: 200 preset seminati → «Salva» → «Hai 200 preset…», nessuna riga nuova.
6. M, 120/4/4, ottavi, attacco acceso: L[0..3] `count`, L[4] `accent`, `L[4].time − L[0].time
   = 2,000 ± 1e−6`, nessun `sub` prima di L[4], `L[5].time − L[4].time = 0,25`;
   `#met-dots.is-count` durante, assente dopo.
7. M: `+5` dopo L[1] → esattamente 4 `count`, intervalli ∈ {0,5; 0,48} non crescenti.
8. M: cambi in esecuzione → nessun `count`; stop/avvia → 4; spento → L[0] `accent`; reload lo tiene.
9. M: 3 preset, in esecuzione, «Avanti» → il primo evento col BPM nuovo ha `pulse 0`, `accent`;
   sull'ultimo disabilitato; con 1 preset nascosto.
10. A: corda 3 → reload → `.is-target`, zero chiamate alla spia su
    `AudioScheduledSourceNode.prototype.start`; basso 4 e ritorno → corda 3; in Ascolto non scrive.
11. A: accordatura «Open G» dall'editor → selezionata → reload → selezionata; due contesti: su 2
    c'è; eliminata su 2 → su 1 sparisce, torna Chitarra, chiave tolta da `corda`.
12. A: 200 accordature → limite nell'editor; nome di 24 caratteri a 390 px senza scroll
    orizzontale; a 390×420 (tastiera) `#acc-custom-save` raggiungibile.
13. A+M: `?lang=en` completo; `.tb-tip` su icone preset e `#tb-mic-live`; bersagli ≥ 44 px; a
    390×844 `#met-toggle` sopra la piega; verdi `check.mjs`, `metronomo.spec.mjs`,
    `accordatore.spec.mjs`.
14. **Da provare su iPhone:** primo click dell'attacco non tagliato, rinomina con tastiera, PWA.

## 7. Rischi e alternative scartate

- `tt.metronomo.countin` è portabile per prefisso: accettato (abitudine, non dispositivo); locale
  toccherebbe `LOCALI` in `shared/`. Il volume del preset viaggia, pur locale come pref: dal brief.
- Scartati: chip; foglio di salvataggio; timbro nuovo per l'attacco (livelli da rimisurare, spec
  10 §11.4); scaletta a capo; `window.__tempi`; «Conta: ti conto io la battuta» (Conta è il tap a
  tutto schermo, si confonderebbe con l'attacco).
