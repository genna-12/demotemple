# Spec 20 — DNA portato a «completo» (T2/2)

Base: brief 20 (il «già fatto» non si rifà), spec 13, 18 §3-6. Righe = `dna/dna.js` di oggi.

## 1. Scopo e utente

Chi analizza basi e mix riprende da dove era, cerca, filtra per tonalità compatibile, confronta,
esporta. **Fuori:** audio salvato o condiviso, link condivisibili, filtro per fonte (§7), energy,
waveform, trasposizione, algoritmi.

## 2. Vincoli applicati

Zero rete, permessi, librerie. Web Share solo se `navigator.share` esiste: nessun impatto
informative. Prefs `tt.dna.ultimo`, `tt.dna.glossario-visto`: già locali (`portabile()` porta solo
`tt.dna.target`). Record: in più `bpmAlternatives`, `uncertain`, facoltativi (li normalizza già
`migrate`, 648). `VERSION` +1 in `toolbox/sw.js` e `shared/versione.js`.

## 3. Flusso utente

**Router.** `#r=<encodeURIComponent(id)>` = risultato; senza hash = vuoto; `ultimo` = id dell'hash.
- Analisi salvata (file o microfono; la voce resta in elenco con `.is-open`): `pushState` + toast `dna-saved` «Salvato nei Recenti» ·
  «Saved to Recent». Salvataggio fallito: risultato senza hash.
- Voce toccata: push; «Analizza un altro»: push del vuoto. In `working`/`recording`
  l'hashchange si ignora.
- Avvio senza hash, `ultimo` valido: `replaceState` e apre (iPhone standalone riparte da
  `start_url`); orfano: tolto in silenzio.
- Id sconosciuto (anche voce aperta eliminata **altrove**, cioè arrivata dalla sync): toast `dna-gone`
  «Analisi non trovata» · «Analysis not found», `replaceState` al vuoto. Eliminarla da qui torna
  al vuoto senza toast (chi elimina lo sa). Analisi in errore o annullata: hash e `ultimo` puliti.

**Storico anche nel risultato:** `#dna-history-wrap` esce da `#dna-drop`, dopo `#dna-result`,
visibile in `empty` e `result`. Riga: voce, matita, `.dna-history-compare` (solo in `result`, non
sulla voce aperta), elimina; icone con `data-tip` (`dna-rename`, `dna-compare-tip`, `dna-del-one`).

**Compatibili.** `#dna-key-compat` = chip `button.dna-compat-chip[data-dna-camelot][aria-pressed]`:
Camelot della voce, poi `compatibleWith`. Tocco: filtro in memoria, chip `is-active`, storico in
vista; stesso chip o «×» `#dna-filter-clear` lo toglie. Barra `#dna-filter` «Brani in 9A» ·
«9A tracks». Voce aperta esclusa. Vuoto `dna-filter-empty` «Nessun brano in 9A nello storico».
Non persiste.

**Ricerca** `#dna-search` sopra l'elenco, con ≥ 6 voci: sottostringa del nome mostrato, senza
maiuscole né accenti, in AND col filtro.

**Confronto:** foglio `#dna-compare`, `<table id="dna-compare-table">` aperta · scelta · Δ
(scelta − aperta): BPM; Camelot con Δ semitoni −6..+5 dalla Camelot e «compatibile»; LUFS (LU);
dBTP; LRA («—»); durata. Si chiude a ogni hashchange.

**Esporta** `#dna-export` «Esporta .csv» nella testa dello storico:
`dna-storico-AAAA-MM-GG.csv`, tutte le voci, recenti prima, UTF-8 con BOM, CRLF, virgolette RFC
4180. **Formato della lingua:** IT `;` e virgola decimale (Excel italiano lo apre a colonne), EN `,`
e punto. Colonne tradotte: nome, data `AAAA-MM-GG HH:MM`, BPM, tonalità, Camelot, LUFS, dBTP, LRA,
durata (s), fonte. Testo che inizia con `= + - @` → apostrofo davanti (tag altrui). Ripiego iOS
come Penna, senza importare da `penna/`.

**Copia e Condividi:** un testo `testoVoce(r)` sostituisce `summary()` (568, oggi senza durata
e fonte):
```
Nome
BPM 128 · Do maggiore (8B)
-9,3 LUFS · -0,8 dBTP · LRA 6,1 LU
3:42 · File
```
`#dna-share` «Condividi» · «Share» accanto a Copia **solo con `navigator.share`**; `AbortError`
muto, altri errori → copia.

**÷2/×2:** `#dna-fold-hint` sotto il segment, nascosto con lui: «Il BPM sembra sbagliato? ÷2 o
×2» · «BPM looks off? ÷2 or ×2». La scelta va nel record (oggi solo in memoria, 1281).

**Glossario: riga, non foglio automatico.** Il foglio è `aria-modal`: coprirebbe il primo
risultato e ruberebbe il fuoco (18 §6); `#tb-hint` è già del ÷2/×2. Quindi
`<p id="dna-lufs-hint" class="tb-hint">` nella card loudness, «LUFS = volume medio percepito.
Tocca la i.», «×» `#dna-lufs-hint-close`; visibile finché `glossario-visto` è falso, che «×» o la
«i» rendono vero.

## 4. Architettura

- **Nuovo** `toolbox/dna/storico.js`, puro, in precache: `idDaHash`, `hashDiId`,
  `filtra(voci, { camelot, q, esclusa })`, `semitoni`, `confronto`, `csv(voci, { lingua, t })`,
  `testoVoce`.
- `dna.js`: router come `penna.js` 419-457; `setState` (325); `showResult` (500); `renderHistory`
  (728); click voce (764); `saveHistory` (610); `historyRecord` (585); fold (1281); copia (1295);
  «Analizza un altro» (1270); `onArchivio` (1324).
- Chiavi IT/EN: etichette di §3, `dna-compare-*`, `dna-csv-*`, `dna-src-file|mic`.
- `aiuto.js`: «Storico» riscritta, nuova «Compatibili».

## 5. Divisione del lavoro

- **implementer** (Opus): `dna/dna.js`, `dna/storico.js`, `toolbox/sw.js`, `shared/versione.js`,
  `scripts/e2e/tests/dna-completo.spec.mjs`, `dna.spec.mjs` (test 3: dopo il reload, risultato).
- **builder** (Sonnet): `dna/index.html`, `dna/dna.css` (chip, tabella a 390 px), `dna/i18n.js`,
  `dna/aiuto.js`.
Contratto: id, classi, chiavi di §3-4; file disgiunti.

## 6. Criteri di accettazione

`dna-completo.spec.mjs`, mobile e desktop. **A** = `fixtures/prova-120.wav` (120 BPM, 8B).
**S** = 7 voci da `archivio.scrivi`: 8B (128, −9,3), 8B, 9B, 7B (124, −14,1), 8A, 3A, microfono
5A; nomi «Perché», «=SOMMA(1)»; una con alternative.
1. A → «Salvato nei Recenti», `#r=`, una riga; reload → risultato.
2. S: indietro → vuoto, `ultimo` tolto; avanti → risultato; `/dna/` con `ultimo` → risultato.
3. `#r=x` → «Analisi non trovata», vuoto, hash pulito.
4. S, 8B aperta (resta in elenco, `.is-open`, senza Confronta): chip 8B, 7B, 9B, 8A; 9B → una riga; «×» → sette. 3A, chip 3A → stato vuoto;
   reload → niente filtro.
5. S: «perche» trova «Perché»; con cinque voci la ricerca sparisce.
6. S: 8B/7B → −4 BPM, +5 semitoni, compatibile, −4,8 LU; indietro chiude il foglio.
7. S: CSV IT → BOM, 8 righe, `;`, «-9,3», `'=SOMMA(1)`; `?lang=en` → `,`, «-9.3».
8. S: `navigator.share` finto riceve le 4 righe; senza, `#dna-share` nascosto; Copia = stesso testo.
9. S: ×2 → reload → BPM doppio, segment e hint visibili.
10. A: `#dna-lufs-hint` visibile, nessun foglio aperto; «×», reload → nascosto; la «i» lo chiude.
11. S: tocco lungo 500 ms (mobile) / hover (desktop) su matita, confronta, elimina → `.tb-tip`;
    nessuna eliminazione.
12. S, due contesti (schema `penna-completa.spec.mjs`): voce di 1 si apre su 2 con `#r=`;
    eliminata su 2 → su 1 «Analisi non trovata».
13. Niente scroll orizzontale, bersagli ≥ 44 px, `?lang=en` completo; verdi `check.mjs`,
    `dna.spec.mjs`, `eval-dna/run.mjs --limit 60` invariato.
14. **Da provare su iPhone:** condivisione, `.csv` in File/Numbers da standalone, ripresa dopo
    chiusura, tip col dito.

## 7. Rischi e alternative scartate

- CSV IT non «standard»: accettato, il backup è il JSON di Impostazioni. Scartato `sep=;`
  (riga spuria in Sheets).
- Riaprire l'ultimo costa un tocco a chi vuole un file nuovo (solo se si era usciti su un risultato).
- Scartati: glossario automatico; filtro per fonte (la ricerca trova «Registrazione…»); condividi
  nella riga (quarta icona a 390 px); grafici; filtro nell'hash.
- Fixture e banco sono sintetici: nessun brano vero nel repo.
