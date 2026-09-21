# Spec 16 — Penna v2: il quaderno

21 settembre 2026. Estende la 14 e la 14b: conteggio, rimario, pacchetti lingua e sinalefi
restano come sono (brief 16). Qui cambiano l'ingresso allo strumento, i file del quaderno e le
misure della pagina. La sincronizzazione è la 17.

## 1. Scopo e utente

Chi scrive ha un **quaderno**: entrando vede l'elenco dei suoi testi (ricerca, ordinamento,
nuovo, elimina), non un editor vuoto; da lì apre un testo, lo condivide come `.txt`, lo stampa,
esporta o importa tutto in `.json`. Fuori perimetro: accordi, registrazione, cartelle o
etichette, collaborazione, rete (è la 17).

## 2. Vincoli applicati

**Nessuna richiesta di rete nuova**: elenco, file e stampa sono locali. Il download usa
`URL.createObjectURL` + `<a download>`, già usato da `pianificatore.js` sotto questa CSP, con lo
stesso ripiego (foglio col testo e "Copia") quando iOS in standalone lo rifiuta. Si importa da
un `<input type="file">`: nessun permesso nuovo. `_headers` non cambia. **Impatto informative:
nessuno**, i testi non lasciano il dispositivo. **Precache:** `sw.js` VERSION `tb-v22` →
`tb-v23`, `TOOLS` + `penna/elenco.js` e `penna/file.js`.

## 3. Flusso utente

**Vista elenco** (ingresso, `/penna/` senza hash). Testata: campo **Cerca**, `tb-select`
**Ordina** (Ultima modifica · Titolo), `tb-btn--primary` **Nuovo testo**, `tb-btn--icon`
**Impostazioni**. Sotto, card (`auto-fill minmax(240px,1fr)`, una colonna sotto 560px): titolo,
primo verso troncato, `tb-pill` della lingua, data breve, "{n} versi"; il tocco apre, il cestino
chiede conferma inline (stesso blocco della 14). Stati: **vuoto** (card tratteggiata a tutta
larghezza: titolo, una riga, "Nuovo testo"), **nessun risultato**, **elenco**.

**Vista editor** (`/penna/#t=<id>`): quella della 14, ma in `.pen-editor-bar` **Indietro**
(freccia + "Tutti i testi") prende il posto di "Documenti"; restano titolo editabile,
`.pen-status` "Salvato", Condividi, Elimina. L'hash è l'unica fonte della vista: il link
riapre quel testo, un id sconosciuto torna all'elenco con un toast. Indietro del browser e
chiusura salvano prima di uscire (`pagehide` c'è già).

**Foglio impostazioni** `#pen-settings` (`tb-sheet`, spec 03 §2): conteggio, Monospazio, Rime a
colori, Lingua del testo, E muta; poi **Quaderno**: Esporta tutto, Importa, Stampa. Le righe
`pen-menu-doc` escono dal menu di `nav.js` ed entrano qui **con gli stessi id**
(`#pen-doc-lang`, `#pen-emuet`): il contratto di `penna.js` non cambia.

**File.** Esporta → `quaderno-AAAA-MM-GG.json`. Importa → unione per `id`: id nuovo entra, id
già presente vince chi ha `modificato` più recente, mai duplicati; toast "{n} nuovi, {m}
aggiornati". Condividi → `navigator.canShare({files})` con un `File` `<titolo>.txt`; senza,
download; senza ancora, copia. Stampa → `window.print()`: solo titolo e versi.

**Chiavi nuove, IT · EN:** `penna-list-title` I tuoi testi · Your lyrics; `penna-back` Tutti i
testi · All lyrics; `penna-search` Cerca · Search; `penna-sort` Ordina · Sort; `penna-sort-mod`
Ultima modifica · Last edited; `penna-sort-title` Titolo · Title; `penna-verses` {n} versi ·
{n} lines; `penna-empty-title` Il quaderno è vuoto · Your notebook is empty; `penna-empty-text`
Il primo verso inizia qui. · Your first line starts here.; `penna-no-match` Nessun testo con
questa ricerca · Nothing matches that search; `penna-settings` Impostazioni · Settings;
`penna-export` Esporta tutto · Export all; `penna-import` Importa · Import; `penna-imported`
{n} nuovi, {m} aggiornati · {n} new, {m} updated; `penna-import-fail` File non riconosciuto ·
File not recognised; `penna-txt` Scarica .txt · Download .txt; `penna-print` Stampa · Print;
`penna-gone` Testo non trovato · Lyric not found.

## 4. Architettura

**Nuovi:** `penna/elenco.js` (modello dell'elenco, ricerca, ordinamento, router dell'hash) e
`penna/file.js` (esporta, importa, `.txt`, Web Share, stampa). `elenco.js` esporta
`filtra(record, q, ordine)` e `fondi(locali, importati)`, verificabili in Node senza DOM.

**Stati nel markup.** `#penna` guadagna `data-pen-vista="elenco|editor"`; `data-pen-state`,
`.pen-empty`, `#pen-docs-toggle` e `.pen-docs-screen` **spariscono**. Id nuovi, fissati qui:
`#pen-list #pen-list-grid #pen-search #pen-sort #pen-back #pen-settings #pen-export #pen-import
#pen-import-input #pen-print #pen-list-empty #pen-list-none`.

**Dati.** Il record della 14 non cambia. L'elenco legge `list('penna')` e tiene in memoria
`{id, titolo, prima, versi, lingua, modificato}` (`versi` = righe non vuote). Pref nuova
`tt.penna.ordine` (`mod|titolo`); la ricerca non si salva.

**Regole CSS che cambiano** (`penna/penna.css` salvo dove detto):

1. `.pen-body`: `overflow: hidden` → `overflow-y: auto; overflow-x: hidden`; aggiunge
   `width:100%; max-width: calc(72ch + 4.5em); margin-inline: auto`. **È il solo contenitore che
   scorre**: oggi scorre `.pen-text-wrap` mentre il gutter (`overflow:hidden`) resta fermo, e i
   numeri si sfasano appena il testo supera il riquadro.
2. `.pen-text-wrap`: via `overflow: auto` (→ `visible`); restano `display:grid`, `min-width:0`.
3. `.pen-gutter, .pen-text, .pen-lines`: `white-space: pre` → `pre-wrap`; `.pen-text` e
   `.pen-lines` prendono `overflow-wrap: anywhere`, `.pen-gutter` `white-space: nowrap`.
4. `.pen-text`: `overflow-y: hidden` (cresce in altezza; l'altezza la scrive `penna.js`).
5. `.pen-gutter`: `overflow: hidden` → `visible`.
6. `.pen-n`: `min-height: calc(1.6em)` → `height: var(--pen-h, 1.6em)`; `.pen-line` tiene
   `min-height: 1.6em`. **Allineamento:** non si sceglie `pre` con scorrimento orizzontale (è
   l'overflow che il brief chiede di togliere): i versi vanno a capo e `penna.js` misura il
   mirror `#pen-lines`, già sovrapposto alla textarea, riga per riga (`offsetHeight`) e scrive
   `--pen-h` su ogni `.pen-n`.
7. `#pen-lines` si disegna **sempre**, anche a colori spenti (è il righello): li toglie il CSS —
   `#penna:not(.is-colori) .pen-line{background:none;box-shadow:none}` e `… .pen-lettera{display:none}`.
8. `.pen-editor-bar`: `flex-wrap: wrap` sempre; `.pen-title` `flex: 1 1 12ch`. Il blocco
   `@media (max-width:360px)` sparisce.
9. Rimario: `#pen-rhyme{min-width:0}`, `.pen-rhyme-body{overflow-x:hidden}`,
   `.pen-results{min-width:0}`, `.pen-hit{max-width:100%;overflow-wrap:anywhere}`.
10. Riga pacchetti, menu condiviso → **`shared/base.css`**: `.tb-packs-row{min-width:0}`,
    `.tb-pack{flex-wrap:wrap}`.
11. Nuovi: `.pen-list`, `.pen-card*`, `.pen-list-empty`, e un `@media print` (come
    `pianificatore.css`): resta solo `.pen-write`, via gutter, controlli, barre, footer; testo a
    colore pieno, interlinea 1.5, titolo stampato da `#pen-title`.

**Misura in JS** (`penna.js`): `misuraRighe()` legge tutte le `.pen-line` in un giro e scrive in
un giro (`--pen-h`, altezza della textarea), dentro `requestAnimationFrame` dopo
`renderColori()` e su `ResizeObserver` di `.pen-text-wrap` (debounce 100 ms). Mai una lettura
dopo una scrittura: un solo reflow.

## 5. Divisione del lavoro

**implementer (Opus):** `penna/elenco.js`, `penna/file.js`, `penna/penna.js` (viste e router
dell'hash, `misuraRighe()`, ritiro di `data-pen-state`, foglio impostazioni,
esporta/importa/condividi/stampa, ARIA). **Non tocca HTML, CSS, i18n.**

**builder (Sonnet):** `penna/index.html` (vista elenco, barra editor, `#pen-settings`, rimozione
di `.pen-empty`/`.pen-docs-screen`/`pen-menu-doc` dal menu, id del §4), `penna/penna.css` (punti
1–11), `shared/base.css` (punto 10), `penna/i18n.js`, `sw.js` (VERSION e TOOLS). **Nessuna
logica JS.** Nessun file in comune fra i due.

## 6. Criteri di accettazione

Sempre col testo di prova `docs/toolbox/contenuti/testo-prova-canto.txt` (55 versi).

1. In Node: la ricerca trova "Ooo-ooo-ooo" ignorando maiuscole e accenti; `fondi` su due
   esportazioni con lo stesso id tiene il `modificato` più recente e non duplica.
2. `/penna/` apre l'**elenco**, mai l'editor. Zero testi → stato vuoto con "Nuovo testo"; ricerca
   a vuoto → `penna-no-match`, e svuotando il campo l'elenco torna intero.
3. `/penna/#t=<id>` riapre quel testo dopo un ricaricamento e da un link incollato; id
   inesistente → elenco più toast `penna-gone`; Indietro del browser torna all'elenco senza
   perdere modifiche.
4. **Gutter:** a 390×844 e 1366×768, per ognuno dei 55 versi il `top` di `.pen-n[data-riga=i]` e
   quello della `.pen-line` i-esima distano **≤ 2 px**, anche dopo aver incollato un verso lungo
   il doppio della colonna e dopo aver scorso in fondo.
5. **Niente overflow:** a 1366×768 e 390×844, in tutti gli stati (elenco, editor, rimario aperto,
   `#pen-settings` aperto, menu aperto con la riga pacchetti), `documentElement.scrollWidth ≤
   clientWidth + 1` e nessun elemento con `getBoundingClientRect().right > innerWidth + 1` o
   `.left < -1`; nessun contenitore con `scrollWidth > clientWidth` a parte `.tb-segment--scroll`.
6. Da 900 px la colonna di scrittura è centrata e non supera 72ch; il rimario resta 360 px.
7. Esporta scrive il `.json` di tutti i testi; reimportandolo su un quaderno vuoto tornano
   identici (titolo, testo, date, lingua, dialefe); sullo stesso quaderno dà "0 nuovi, 0
   aggiornati"; un file non valido dà `penna-import-fail` e non tocca nulla.
8. Condividi propone il `.txt` dove `canShare({files})` è vero, altrimenti scarica, altrimenti
   copia; il file contiene titolo, riga vuota, 55 versi, fine riga `\n`.
9. Stampa: titolo e 55 versi, senza barra, menu, rimario, numeri, controlli, footer.
10. Elimina chiede conferma e toglie la card senza ricaricare; se il testo era aperto, si torna
    all'elenco.
11. `?lang=en` traduce elenco, card, impostazioni e messaggi; bersagli ≥ 44 px a 390 px;
    `#pen-search` etichettato; il cambio vista annuncia il titolo in `aria-live`; reduced-motion
    rispettato; `node scripts/check.mjs` passa.
12. `misuraRighe()` su 55 versi **< 16 ms**, un solo reflow per giro; digitando i numeri non
    saltano.
13. *Da provare su iPhone:* download del `.json` in standalone (ripiego col foglio),
    `canShare({files})`, textarea che cresce con la tastiera aperta, stampa da Safari.

## 7. Rischi e alternative scartate

- **`white-space: pre` + scorrimento orizzontale: scartato.** Allineerebbe i numeri senza
  misurare, ma è proprio l'overflow da togliere e su telefono costringe a scorrere per leggere.
- **`contenteditable`: scartato** già nella 14 (selezione e IME su iOS). Il mirror `#pen-lines`
  c'era: ora serve a due cose.
- **Cartelle, etichette, preferiti: scartati** in v1; ricerca e ordinamento bastano finché i
  testi sono decine.
- **Tutto dentro `penna.js`: scartato**, sfiorerebbe 1500 righe; due moduli piccoli si provano
  in Node.
- **Elenco come foglio sopra l'editor (la "Documenti" della 14): scartato**, è il contrario del
  brief: il quaderno è la casa, l'editor è la stanza.
