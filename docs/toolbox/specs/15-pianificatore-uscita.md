# Spec 15 — Pianificatore di uscita (strumento 6)

20 settembre 2026. Pagina `/pianificatore-uscita/`. Template della 10 §1, componenti `tb-` della 03
§2, documenti in IndexedDB come la 14 §4. Anticipi e fonti in
`research/2026-09-20-release-timeline.md`, **testi** in `contenuti/pianificatore-tappe.md` (unica
sorgente: si copia da lì, lo studio corregge lì).

## 1. Scopo e utente

Un artista indipendente sceglie la data di uscita e ottiene la **timeline a ritroso** con le date
vere di ogni tappa — master, deposito, artwork, consegna, pitch, pre-save, press —, le spunta, la
porta nel calendario e la stampa. È il gap della 01 §2E: i generatori esistenti sono gratis solo per
farti comprare un servizio.

Fuori perimetro: account, sincronizzazione, notifiche push, integrazione con distributori o Spotify,
budget, contatti stampa, SIAE contro Soundreef, cifre sui guadagni. Lo strumento **ricorda**, non
promette e non consiglia.

## 2. Vincoli applicati

**Zero rete, zero cookie:** solo aritmetica su date locali. **`_headers` non cambia** e la CSP del
00 §5 basta: l'`.ics` nasce da un `Blob` scaricato con un `<a download>`, non da una navigazione
verso terzi, e la condivisione usa Web Share. **Impatto informative: nessuno.**

**Niente promemoria di sistema:** le notifiche push vogliono un server e un permesso, entrambi
esclusi. Al loro posto un **badge "in scadenza"** calcolato all'apertura (tappe non spunte entro 7
giorni o già passate) e l'**export `.ics`**, che delega il promemoria al calendario dell'utente.
**PDF via stampa CSS**, zero librerie, come la 01 §2E prevede per lo split sheet.

## 3. Flusso utente

**Stati:** vuoto, piano aperto, lista piani, modifica, conferma, errore.

**Vuoto.** `tb-btn--lg` "Nuovo piano". Il modulo chiede **titolo**, **tipo** (`tb-segment`: Singolo ·
EP · Album), **data di uscita** (`input type="date"`: il nativo è l'unico sensato su iPhone),
**profilo** (`tb-segment`: Veloce · Completa), **distributore** (`tb-select` facoltativo: DistroKid,
TuneCore, Amuse, Believe, Altro, Non ancora scelto) e **note**. Il distributore non cambia i calcoli:
compare nella riga della consegna.

**Piano aperto.** In testa titolo, data, conteggio "fatte 4 di 13" in `aria-live`, barra di
avanzamento, `tb-badge` "in scadenza · 2". Poi la **lista verticale** (`<ol>`): per tappa una
`checkbox` etichettata, **data reale** e giorni mancanti in muted, titolo, una riga di testo e un
**`tb-info`** con la spiegazione e il perché dell'anticipo (03 §2). Le passate non spunte sono
marcate **a parole** (`aria-description`), non solo col colore; le spunte si salvano subito.

**Modifica.** Menu per tappa (`tb-btn--icon`): Rinomina, Sposta (cambia la data, la lista si
riordina), Elimina con conferma in `tb-sheet`; in fondo "Aggiungi tappa". Le tappe di serie
modificate restano ripristinabili; "Ricalcola dalla data" avvisa, rigenera quelle di serie non
toccate e lascia stare le personalizzate.

**Uscite.** "Aggiungi al calendario" (`.ics`), "Condividi" (Web Share col file; senza, scarica e
toast), "Stampa o PDF"; **Piani** apre la lista.

**Prossime tappe.** `tb-segment` **Tutte · Prossime**: le tre tappe non spunte più vicine di tutti i
piani, col nome del piano. La calcola una funzione di `timeline.js`, così il futuro slot
Recenti/Dashboard la riusa senza aprire la pagina.

**Chiavi `pia-`, IT · EN:** Pianificatore di uscita · Release Planner; Nuovo piano · New plan; Data
di uscita · Release date; Veloce · Fast; Completa · Full; Non ancora scelto · Not chosen yet; fatte
{n} di {tot} · {n} of {tot} done; in scadenza · due soon; in ritardo · overdue; fra {n} giorni /
{n} giorni fa · in {n} days / {n} days ago; Aggiungi tappa · Add step; Ricalcola dalla data ·
Recalculate from the date; Aggiungi al calendario · Add to calendar; Stampa o PDF · Print or PDF;
Prossime · Upcoming; Nessun piano · No plans yet. Il resto riusa le chiavi comuni; titoli, testi e
fogli "i" vengono dal file dei contenuti, già in IT ed EN.

## 4. Architettura

**Nuovi:** `toolbox/pianificatore-uscita/{index.html, pianificatore.js, pianificatore.css, i18n.js,
tappe.js, timeline.js, ics.js}`. Nessuna libreria, nessun Worker, nessun WASM: il calcolo più pesante
è una sottrazione.

**`tappe.js`** — dati puri, copia del file dei contenuti: i 13 `id` stabili (`data`, `master`,
`split`, `artwork`, `consegna`, `visual`, `pitch`, `presave`, `press`, `social`, `uscita`, `seguito`,
`dati`), gli anticipi per profilo (`null` = tappa assente) e le chiavi i18n di titolo, testo, foglio.

**`timeline.js`** — modulo puro senza DOM, importabile in Node (è ciò che rende verificabile il §6):
genera le tappe da `{ data, tipo, profilo }`, applica le varianti (**EP**: +14 giorni agli anticipi
fino a `consegna` compresa; **album**: +28 e tre tappe `singolo-1/2/3` a T−84/−56/−35), ordina per
data, calcola giorni mancanti, stato (`fatta | in scadenza | in ritardo | futura`) e le "prossime
tappe". **Date come stringhe `YYYY-MM-DD`**, aritmetica a mezzogiorno UTC: nessun fuso, nessun buco
di ora legale.

**`ics.js`** — puro: iCalendar `VERSION:2.0`, `PRODID` proprio, un `VEVENT` per tappa con
`DTSTART;VALUE=DATE` (giornata intera, il fuso non entra), `SUMMARY` piano + tappa, `DESCRIPTION`
col testo, `UID` `<idPiano>-<idTappa>@toolbox.tinytemplestudio.it`, righe piegate a 75 ottetti e
CRLF per la RFC 5545 (**unica eccezione LF**: generato a runtime, `check.mjs` non lo vede).

**Salvataggio.** `storage.put('pianificatore', <id>, { titolo, tipo, data, profilo, distributore,
note, tappe: [{ id, titolo, testo, data, fatta, origine }], creato, modificato })`, più `list` e
`del`; nessun tetto. Prefs `tt.pianificatore.{ultimo, profilo, vista}`.

**Modificati:** `shared/tools.js` (`pianificatore-uscita` → `'live'`, `next` a `checklist-consegna`);
`sw.js` (VERSION `tb-v18` → `tb-v19`, `TOOLS` + i sette file); `sitemap.xml` (0.8);
`manifest.webmanifest` (sesto `shortcut`). **`_headers` invariato.**

**Layout.** Mobile-first: colonna unica, bersagli ≥ 44 px, azioni sopra la safe-area; da 720 px
contenuto centrato e largo 720.

## 5. Divisione del lavoro

**builder (Sonnet):** `index.html` (markup di tutti gli stati, id fissati qui: `#pia-empty #pia-form
#pia-title #pia-type #pia-date #pia-profile #pia-distro #pia-notes #pia-plan #pia-progress #pia-count
#pia-badge #pia-view #pia-list #pia-add #pia-plans #pia-ics #pia-share #pia-print #pia-sheet`),
`pianificatore.css` (lista, stati, max 720, `@media print`), `i18n.js`, `tappe.js`, `shared/tools.js`,
`sw.js`, `sitemap.xml`, `manifest.webmanifest`. Nessuna logica JS.

**implementer (Opus):** `timeline.js`, `ics.js`, `pianificatore.js` (IndexedDB, form, rendering,
spunte, tappe personalizzate, ricalcolo, badge, Web Share, stampa, prefs, ARIA, fogli). Non tocca
HTML/CSS. In parallelo sugli id qui sopra.

## 6. Criteri di accettazione

Da 1 a 5 in Node, importando `timeline.js` e `ics.js` senza DOM.

1. Uscita **2026-12-04**, singolo, **completa** → 13 tappe; `pitch` **2026-11-06**, `consegna`
   **2026-10-23**, `master` **2026-10-09**, `presave` **2026-11-13**, `dati` **2027-01-01**.
2. Stessa data, **veloce** → 11 tappe (senza `visual` e `press`), `consegna` **2026-11-13**, `pitch`
   **2026-11-20**; per ogni data e profilo `pitch` resta ≥ 7 giorni prima dell'uscita.
3. **EP** → `consegna` **2026-10-09**, `pitch` invariato; **album** → tre tappe `singolo-*` e
   `consegna` **2026-09-25**.
4. Uscite il 2026-10-25 e il 2027-03-01 (cambi d'ora): nessuna data sbagliata di un giorno con fuso
   `Europe/Rome`, `UTC`, `Pacific/Auckland`.
5. L'`.ics` di un piano completa ha **13 `VEVENT`**, `BEGIN`/`END` bilanciati, righe CRLF entro 75
   ottetti, `UID` unici, `DTSTART;VALUE=DATE:20261106` per il pitch; si importa senza errori in
   Google Calendar e in Calendario di macOS.
6. Spunta una tappa e ricarica: resta spunta. Tre piani sopravvivono alla chiusura della PWA;
   elimina chiede conferma.
7. Aggiungi, rinomina, sposta ed elimina una tappa: la lista si riordina, il conteggio si aggiorna,
   "Ricalcola dalla data" avvisa e **non** cancella le personalizzate.
8. Una tappa non spunta entro 7 giorni accende "in scadenza", una passata dice "in ritardo" anche a
   parole; "Prossime" mostra tre tappe di piani diversi in ordine di data.
9. Stampa: una pagina A4 con titolo, data, tappe e caselle, senza bottoni né sfondi. 390×844:
   colonna unica, bersagli ≥ 44 px, barra sopra la safe-area.
10. Tastiera: caselle raggiungibili, `tb-info` chiude con Esc restituendo il fuoco, reduced-motion
    rispettato; `?lang=en` traduce tutto, tappe comprese. Nessuna richiesta fuori dall'origine,
    nessuna violazione CSP, `_headers` intatto, `check.mjs` passa.
11. *Da provare su iPhone:* `.ics` scaricato in standalone e aperto in Calendario, Web Share col
    file, `input type="date"`, stampa da Safari, persistenza dopo giorni.

## 7. Rischi e alternative scartate

- **Notifiche push scartate**: server e permesso, contro il vincolo 1 di CLAUDE.md. L'`.ics` sposta
  il promemoria dove l'utente già lo guarda.
- **Rischio iOS**: in standalone il download di un `Blob` è capriccioso. Ripiego a cascata: Web Share
  col file → download → foglio col testo dell'`.ics` e "Copia".
- **`Date` locali scartate**: mezzanotte locale sbaglia di un giorno al cambio d'ora. **jsPDF
  scartato**: ~300 KB per un foglio che `@media print` fa gratis. **Anticipi regolabili a mano
  scartati** in v1: bastano due profili più lo spostamento della singola tappa.
- **Contenuto che invecchia**: i tempi dei distributori cambiano, ma tappe, testi e fonti stanno in
  file di dati. Finché Ponz non valida, valgono i numeri della ricerca.

