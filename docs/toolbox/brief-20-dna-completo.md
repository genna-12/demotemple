# Brief 20 — DNA portato a «completo» (T2/2, orchestratore, 25 settembre 2026)

Fonti: roadmap T2 riga 2; ricerca casi d'uso §4; audit UX (righe su DNA: errore che svuota
la pagina — già corretto in T0; «÷2 / ×2» non spiegati; «Loudness e target» senza glossario
al primo risultato; risultato aperto perso al ricaricamento); spec 13; spec 18 §3-6; spec 19
come modello di spec «completo».

## Cosa c'è già (verificato nel codice, NON rifare)

- Storico nell'archivio (`shared/archivio.js`, collezione `dna`, id = istante, limiti
  `dna: {voci: 2000, byte: 8 KB}` in `limiti.js`), **già sincronizzato** (`SINCRONIZZABILI`
  include `dna`, interruttore in Impostazioni), **già rinominabile** inline (matita,
  Invio/Esc), «elimina» per voce, «Svuota storico» con conferma, normalizzazione delle voci
  vecchie in lettura. `onArchivio` → `renderHistory()` quando arriva dal sync.
- Tonalità compatibili come testo: `compatibleWith(camelot)` in `shared/analysis/key.js`
  (±1 stesso modo + relativo), scritto in `#dna-key-compat` separato da « · ».
- Glossario LUFS/dBTP/target: foglio `#dna-lufs-info` dietro la «i» (`shared/sheet.js`).
- Aiuto «Come funziona» (`dna/aiuto.js`) con 6 voci IT/EN + hint primo avvio.
- Stato errore corretto in T0 (messaggio sopra la zona di rilascio, «Prova un altro file»).
- Banco di prova `scripts/eval-dna/` (`node scripts/eval-dna/run.mjs --limit 60`), e2e
  `scripts/e2e/tests/dna.spec.mjs` con `scripts/e2e/fixtures/dna-60.wav` (o simile: verificare).

## Cosa manca (perimetro della spec 20)

1. **Riapertura del risultato.** Dopo il ricaricamento si torna alla schermata vuota: l'ultimo
   risultato aperto (o l'ultima voce dello storico aperta) deve riaprirsi da solo, come Penna
   riapre l'ultimo testo. Scelta consigliata: pref locale `tt.dna.ultimo` = id della voce;
   hash router `#r=<id>` per il deep-link e il tasto indietro (come Penna `#t=<id>`).
2. **Esporta.** Una voce → «Copia» già c'è (verificare cosa copia); serve **esporta lo storico**
   (`.csv` con intestazione: nome, data, BPM, tonalità, Camelot, LUFS, dBTP, LRA, durata,
   fonte) e **condividi una voce** come testo (Web Share API se c'è, altrimenti copia). Niente
   audio, mai.
3. **Tonalità compatibili cliccabili.** Ogni codice Camelot compatibile diventa un chip: al
   tocco filtra lo storico sulle voci con quel Camelot (e la tonalità esatta della voce
   corrente). Chip attivo evidente, «×» per togliere il filtro, stato vuoto «Nessun brano in
   9A nello storico». Il filtro non sopravvive al ricaricamento.
4. **Ricerca nello storico** per nome (campo sopra l'elenco, come Penna; compare solo con
   ≥ 6 voci), filtro per fonte (file / microfono) opzionale se costa poco.
5. **Confronto di due analisi** (ricerca §4, B): «Confronta» su una voce dello storico →
   tabella a due colonne (voce corrente vs scelta) con le stesse metriche e la differenza
   in LU/BPM/semitoni Camelot. Scope minimo, niente grafici.
6. **Glossario al primo risultato** (audit): al primo risultato mai visto, il foglio LUFS si apre
   da solo una volta (`tt.dna.glossario-visto` pref locale) — oppure, se troppo invadente, una
   riga `.tb-hint` sotto la card loudness: «LUFS = volume medio percepito. Tocca la i».
   L'architetto sceglie e motiva.
7. **«÷2 / ×2» spiegati**: sottotitolo di una riga sotto il segment («Il BPM sembra
   sbagliato? ÷2 o ×2»), e `.tb-tip` (long-press, `shared/aiuto.js`) sulle icone dello
   storico (matita, elimina, confronta, condividi) con `data-tip`.
8. **«Salvato»**: dopo un'analisi la voce va nello storico senza dirlo. Un toast breve
   «Salvato nei Recenti» o una riga di stato (audit §3: «manca dirlo»).
9. **Prova su brani veri**: la validazione deve usare il banco `eval-dna` e la fixture e2e; se
   nel repo non esistono file audio reali di prova adatti, dirlo in Dubbi (Genna può fornirne).

## Vincoli di questo giro

- Zero rete, nessun permesso nuovo, niente librerie. Web Share API è facoltativa (feature
  detection), nessun impatto informative.
- Modifica dello schema del record `dna` solo se indispensabile: se serve un campo nuovo
  (es. `nota` libera), aggiungerlo opzionale e normalizzarlo in lettura, senza migrazione.
- Tutto in `toolbox/dna/` + al massimo `shared/aiuto.js` se serve un'estensione generica
  (`.tb-tip` esiste già). Precache → `VERSION` +1 in `sw.js` e `shared/versione.js`.
- Dimensione: mezzo giro Opus (implementer) + mezzo Sonnet (builder: markup, css, i18n,
  aiuto.js). e2e nuovi in `scripts/e2e/tests/dna-completo.spec.mjs`, mobile + desktop.
- Stile: `tb-` componenti, vetro, IT/EN parità (check.mjs la verifica), niente emoji.
- Scope: strumento utile a qualunque artista (decisione Genna 22/09), niente funzioni
  tagliate sul flusso di Tiny Temple.

Fuori perimetro: energy/danceability, riconoscimento brani, waveform, trasposizione (T3),
qualunque miglioria degli algoritmi di analisi (BPM/tonalità) salvo bug evidenti trovati dal
banco.
