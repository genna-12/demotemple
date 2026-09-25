# Spec 22 — Pianificatore (affidabilità) e Calcolatore (rifiniture) (T2/5-6)

25 settembre 2026, orchestratore (spec breve: due strumenti già completi, solo lacune dell'audit UX
e della ricerca §3 e §6). Base: spec 12, 15, 18 §3-6; roadmap T2 righe 5-6. Righe = file di oggi.

## 1. Scopo e utente

Pianificatore: chi compila «Nuovo piano» e viene interrotto ritrova il modulo com'era; chi ha più
uscite vede subito quali tappe scadono, per ogni piano; «Veloce / Completa» dice cosa cambia.
Calcolatore: chi è al mixer copia un valore con un tocco e sa a cosa serve la scheda aperta.
**Fuori:** calendario mensile (Genna 22/09: bassa priorità), preset per plugin, cronologia BPM,
condivisione, modifiche ai calcoli e alle tappe, sync (le uscite lo sono già: collezione `uscite`).

## 2. Vincoli applicati

Zero rete, permessi, librerie, impatto informative. Bozza del modulo in **pref locale**
`tt.pianificatore-uscita.bozza` (verificare che `PORTABILI` in `shared/archivio.js` ~1011 non la
catturi: il regex copre `tt.(penna|metronomo|calcolatore-tempo).*`, quindi è locale; se non lo
fosse, dirlo nel report, non toccare `shared/`). `VERSION` +1 in `toolbox/sw.js` e
`shared/versione.js`. Nessun file nuovo in precache salvo necessità motivata.

## 3. Flusso utente

**Pianificatore — bozza che sopravvive** (audit §3: «il modulo Nuovo piano non ancora confermato:
tutto perso»). Ogni `input` sul modulo `#pia-form` (titolo, tipo, data, profilo, distributore,
note) scrive la bozza `{ titolo, tipo, data, profilo, distributore, note, modifica: <id|null>,
quando: <ms> }` con debounce ≤ 300 ms. All'apertura della pagina (rivisto dopo il validator):
- bozza di una **modifica** (`modifica: id`) di un piano che esiste → si riprende sempre (il
  modulo di modifica su quel piano); di un piano che non esiste più → si scarta;
- bozza di un **piano nuovo** → il modulo si riapre se la bozza ha meno di 2 ore (`quando`) o se
  non c'è un `ultimo` valido; altrimenti si apre `ultimo` e in testa al piano compare una riga
  `.tb-status` `#pia-draft-resume` «Hai una bozza di un nuovo piano» · «You have a draft of a new
  plan» con il bottone `#pia-draft-open` (`tb-btn tb-btn--ghost`) «Riprendi» · «Resume», che
  riapre il modulo con la bozza (la riga resta finché la bozza c'è).
Un modulo ripreso mostra una riga `.tb-status` `#pia-draft` «Bozza ripresa» · «Draft restored»
sopra i campi (le due righe le crea il JS se il markup non le ha). **Salva** e **Annulla**
cancellano la bozza del modulo aperto. Una bozza vuota (tutti i campi al valore di partenza) non
si scrive e, se c'era, si cancella.

**Pianificatore — «Veloce / Completa»** (audit §4): sotto il `tb-segment` del profilo una riga
`#pia-profile-hint` (`.pia-field-hint`) che cambia con la scelta: «Veloce: {n} tappe, per chi
ha meno di 4 settimane» · «Completa: {n} tappe, l'anticipo consigliato dai distributori»; `{n}`
= lunghezza reale di `VARIANTI`/`TAPPE` per il profilo e il tipo (album compreso), calcolata da
`tappe.js`, mai scritta a mano.

**Pianificatore — più uscite in parallelo** (ricerca §6 B «vista tutti i piani con tappe in
scadenza per piano»): nella lista piani (`renderPiani`, 483) ogni riga mostra, oltre a titolo e
data, un **badge** con le tappe in scadenza o in ritardo di quel piano (stessa regola del badge
esistente: non spunte entro 7 giorni o passate), «2 in scadenza» · «2 due soon», «1 in ritardo» ·
«1 overdue», niente badge se zero; ordine della lista in quattro gruppi: 1 piani con tappe in
ritardo, 2 con tappe in scadenza, 3 futuri senza scadenze, 4 già usciti; dentro ogni gruppo per
data di uscita crescente. Le righe restano bersagli ≥ 44 px.

**Calcolatore — celle copiabili** (audit §4): ogni `.calc-cell` (tabella, riverbero, sidechain)
mostra un'icona di copia persistente a destra (`<svg><use href="#tb-icon-copy">` se esiste in
`shared` — Grep `tb-icon-copy`; se no, aggiungere il simbolo allo sprite della pagina
`calcolatore-tempo/index.html`, non a `shared/`), a 0,6 di opacità, che al tocco/copia diventa
piena per 800 ms con il toast già esistente. Niente `title=` come unico segnale.

**Calcolatore — a cosa serve la scheda** (audit §4): **una riga sola**. Ogni pannello ha già la
sua `.calc-intro` (`calc-intro-delay|note|sidechain`), visibile solo con la sua scheda: è lei che
lo dice, e cambia al cambio scheda. Niente `#calc-tab-hint` in più sotto `#calc-tabs` (rivisto dopo
il validator: duplicava l'intro).

## 4. Architettura

- `pianificatore-uscita/pianificatore.js`: bozza (lettura all'avvio con la regola di §3, scrittura su
  `input`/`change` del modulo, cancellazione in `salvaForm` e `pia-cancel`), `#pia-profile-hint`
  (aggiornato in `setProfilo`/al cambio tipo), badge e ordine in `renderPiani` (riusare la
  funzione che oggi calcola il badge del piano aperto: Grep `scadenza|badge|prossime`).
  `tappe.js`: se manca, esportare `conta(profilo, tipo)` pura.
- `calcolatore-tempo/calcolatore-tempo.js`: stato `is-copied` sulla cella per 800 ms dopo la
  copia; la cella diventa `span.calc-cell-value` + `svg.calc-copy-icon` (aria-hidden).
- Markup/CSS/i18n: `index.html`, `.css`, `i18n.js`, `aiuto.js` (una frase sulla bozza e sui badge
  nel Pianificatore; una sul copia nel Calcolatore) delle due cartelle.
- Chiavi IT/EN: `pia-draft-restored`, `pia-profile-hint-fast`/`-full` (`{n}`), `pia-due-soon`
  (`{n}`), `pia-overdue` (`{n}`), `pia-draft-pending`, `pia-draft-open`.

## 5. Divisione del lavoro

- **implementer** (Opus): `pianificatore.js`, `tappe.js` (solo `conta`), `calcolatore-tempo.js`,
  `sw.js`, `shared/versione.js`, `scripts/e2e/tests/pianificatore-completo.spec.mjs`,
  `calcolatore-completo.spec.mjs`.
- **builder** (Sonnet): `index.html`, `.css`, `i18n.js`, `aiuto.js` delle due cartelle.
File disgiunti; contratto = id, classi e chiavi di §3-4.

## 6. Criteri di accettazione

Mobile 390×844 e desktop. **P** = `pianificatore-completo.spec.mjs`, **C** =
`calcolatore-completo.spec.mjs`.
1. P: «Nuovo piano», titolo «Prova», tipo EP, data +40 giorni, note → reload → modulo aperto con
   gli stessi valori e «Bozza ripresa»; Salva → piano creato, reload → nessuna bozza (si apre il
   piano). Annulla → reload → stato vuoto/lista, nessuna bozza.
2. P: modifica di un piano, cambio titolo, reload → modulo di modifica ripreso su quel piano;
   piano eliminato da un altro contesto (sync) → bozza scartata, nessun errore.
3. P: `#pia-profile-hint` con Veloce e Completa, singolo e album: `{n}` = numero di tappe che il
   piano poi mostra davvero (conteggio delle righe).
4. P: piani con tappa in ritardo, con 2 (e 1) in scadenza, futuro senza scadenze, uscito: badge
   giusti, ordine ritardo → scadenza → futuro → uscito (per data dentro il gruppo); nessun badge
   sul piano senza scadenze; `?lang=en`. Bozza di piano nuovo di 3 h con `ultimo` → piano aperto
   + «Riprendi» → modulo con i valori.
5. C: ogni `.calc-cell` ha l'icona; tocco → appunti (stub `navigator.clipboard`) con il valore, cella
   `is-copied` per < 1 s, toast; bersagli ≥ 44 px; nessuno scroll orizzontale a 390 px.
6. C: cambio scheda → la `.calc-intro` visibile (una sola) cambia testo (IT ed EN); nessun
   `#calc-tab-hint`.
7. P+C: `check.mjs`, `pianificatore.spec.mjs`, `calcolatore.spec.mjs`, `aiuto.spec.mjs` verdi;
   tip/hint leggibili; «Come funziona» aggiornato in IT ed EN.
8. **Da provare su iPhone:** bozza dopo chiusura dell'app, icona di copia col dito.

## 7. Rischi e alternative scartate

- Bozza in `uscite` come record «bozza»: scartata, sincronizzerebbe un modulo a metà.
- Calendario mensile: fuori (priorità bassa, Genna 22/09); la lista con badge copre il bisogno
  «vedo cosa scade» senza una vista nuova.
- Icona di copia dentro le celle a 390 px: la cella resta un bottone unico, l'icona è decorativa
  (`aria-hidden`), l'`aria-label` già dice «copia».
