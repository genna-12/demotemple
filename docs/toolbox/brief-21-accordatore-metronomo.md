# Brief 21 — Accordatore e Metronomo portati a «completo» (T2/3-4, orchestratore, 25/09/2026)

Fonti: roadmap T2 righe 3-4; ricerca casi d'uso §1-2; audit UX (righe su Metronomo e
Accordatore); spec 10, 11, 18 §3-6; spec 19/20 come modello. Una spec sola per due strumenti
piccoli: `docs/toolbox/specs/21-accordatore-metronomo.md`.

## Accordatore — cosa c'è già (verificato, NON rifare)

- Accordature personalizzate **con nome**, nell'archivio (collezione `accordature`, record
  `{name, strings:[{note, oct}]}`, id `c<n>`, limiti `200 × 4 KB`), già **sincronizzate**
  (`SINCRONIZZABILI`), con foglio di modifica, Modifica/Elimina con conferma, migrazione 5
  dalla vecchia pref, `onArchivio` che ridisegna il select quando arrivano dalla sync,
  `inSolaLettura` gestito.
- Modo (Riferimento/Ascolto), strumento e A4 (`tt.shared.a4`) ricordati. Bersagli e label
  del select sistemati in T0. «Come funziona» IT/EN presente.

## Accordatore — perimetro

1. **Ultima corda ricordata** per strumento/accordatura (pref locale, es.
   `tt.accordatore.corda` = `{ [idStrumento]: indice }`): riaprendo la pagina la corda
   selezionata è quella di prima, in Riferimento (senza far partire il suono da solo:
   spec 11, niente audio senza gesto).
2. Microcopy dall'audit: «Ascolto (microfono)» e un'etichetta per l'icona del microfono
   nella barra; «Personalizzata… (scegli tu le corde)»; verificare che le voci del select
   dell'accordatura personalizzata siano leggibili a 390 px.
3. **e2e di completezza** (criterio della roadmap T2): crea un'accordatura con nome →
   ricarica → la ritrova selezionata → sincronizza su un secondo contesto (schema
   `dna-completo.spec.mjs` §6.12 / `penna-completa.spec.mjs`) → la elimina da uno → sparisce
   dall'altro; `?lang=en` completo. Se già coperto in `accordatore.spec.mjs`, integrare lì.
4. Eventuali difetti trovati dal validator nel flusso esistente (foglio di modifica con
   tastiera aperta a 390 px, nomi lunghi, 200 accordature).

## Metronomo — cosa c'è già

- Rotella BPM (drag su tutta la superficie, T0), ±1/±5, Tap, Conta (schermo grande),
  battute, suddivisioni, suoni, volume, pallini; **un solo slot** di prefs (`bpm, meter,
  subdiv, sound, volume` in `prefs` di `metronomo`); wake lock (`shared/ui.js`);
  AudioWorklet/scheduler già a posto (spec 10). Collezione `metronomo-preset` **già
  prevista** in `limiti.js` (`voci`/`byte`: verificare i valori) e in `SINCRONIZZABILI`,
  ma **nessun record viene scritto oggi**: c'è solo il nome.

## Metronomo — perimetro

1. **Preset nominati** nell'archivio (collezione `metronomo-preset`, record
   `{ nome, bpm, meter, subdiv, sound, volume }`, id come `accordature`): «Salva preset»
   dal pannello (nome proposto «96 · 4/4»), elenco dei preset sotto i controlli (chip o
   righe con nome e riassunto «96 BPM · 4/4 · ottavi»), tocco → applica; rinomina inline,
   elimina con Annulla (toast, come dash.js), ordine di creazione, riordino **fuori**.
   Sincronizzati (già in `SINCRONIZZABILI`): `onArchivio` con origine `sync` ridisegna.
   Limite voci dal `limiti.js`; archivio in sola lettura → si dice.
2. **Count-in**: interruttore «Conta prima di partire» (pref locale): all'Avvia, una
   battuta di soli accenti (o 4 click a suono diverso) prima del click vero, con i pallini
   che lo mostrano; niente count-in se già in esecuzione (cambio BPM al volo non lo
   ripete). Rispetta la latenza dello scheduler della spec 10.
3. **Setlist** (scope minimo, roadmap): dentro il pannello preset, «Avanti ▸» che passa al
   preset successivo nell'elenco senza fermare il click (cambio al prossimo battere);
   nessuna struttura dati nuova: la setlist è l'ordine dei preset. Se costa più di mezzo
   giro, l'architetto lo dice e lo lascia a una riga «fuori».
4. Microcopy dall'audit: hint primo avvio «Trascina per cambiare · tocca il numero per
   scriverlo» (verificare se `hint` in `aiuto.js` lo dice già); sottotitoli «Tap: dai tu
   il tempo» / «Conta: ti conto io la battuta».
5. **e2e**: preset creato → ricarica → applicato al tocco → sincronizzato su un secondo
   contesto → eliminato su entrambi; count-in: con l'interruttore acceso il primo click
   «vero» arriva dopo una battuta (misurare via `window.__tempi`/AudioContext finto se
   esiste già negli spec del metronomo: guardare `metronomo.spec.mjs`); `?lang=en`.

## Vincoli

Zero rete, nessun permesso, nessuna libreria; nessun impatto informative (i preset sono
già coperti dal testo «dati della Toolbox»). Solo `toolbox/accordatore/`, `toolbox/metronomo/`,
`scripts/e2e/tests/`, `sw.js` + `versione.js` (+1); `shared/` solo se indispensabile e
motivato. Precache: ogni file nuovo va in `sw.js`. Divisione: implementer (Opus) JS +
e2e; builder (Sonnet) HTML/CSS/i18n/aiuto, file disgiunti. Stile `tb-`, IT/EN parità,
niente emoji. Strumenti utili a qualunque musicista (Genna 22/09).

Fuori perimetro: rhythm trainer, accelerando, poliritmi, vibrazione, libreria accordi,
modifiche al DSP dell'accordatore e allo scheduler del metronomo (salvo bug evidenti).
