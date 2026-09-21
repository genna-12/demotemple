# Spec 14 — Penna (strumento 5)

19 settembre 2026. Pagina `/penna/`. Template della 10 §1, componenti `tb-` della 03 §2. Fonti,
licenze e algoritmi stanno in `docs/toolbox/research/2026-09-19-rimario-fonti.md`: qui si applicano,
non si ridiscutono. Primo strumento senza audio e primo con un **indice dati scaricato**.

## 1. Scopo e utente

Chi scrive testi (rap, cantautorato) ha in una pagina il **blocco testi** con sillabe per verso e
rime evidenziate, e il **rimario italiano** offline: rime perfette, assonanze, consonanze,
multisillabiche. È il gap della 01 §2C: in italiano non esiste nulla di serio e gratuito.

Fuori perimetro: suggerire parole o versi (nessuna IA, nessuna rete), sinonimi, definizioni, testi
altrui (LRCLIB resta fuori), audio, formattazione ricca, altre lingue.

## 2. Vincoli applicati

Zero rete tranne una: il primo scaricamento dei dati **dall'origine stessa** (`/penna/data/*`).
Nessun terzo, nessuna chiave; `connect-src 'self'` lo consente già, niente WASM né `blob:`.
**`_headers` cambia per una riga**: `/penna/data/*` `immutable`, come `/vendor/*` (i nomi portano il
suffisso di versione). **Impatto informative: nessuno**, i testi restano in IndexedDB.

I dati generati sono opera derivata di Wikizionario e FrequencyWords: **CC BY-SA 4.0**, con
`penna/data/LICENSE.txt`, `ATTRIBUZIONE.md` e un `tb-info` "Da dove vengono le rime". Il codice resta
separato (aggregazione); paroleitaliane (MIT) chiede solo l'avviso di copyright.

**Precache.** I dati **non** entrano in `SHELL`/`TOOLS`: ~800 KB non si fanno pagare a chi installa
la Toolbox per il metronomo. Cache di runtime `toolbox-rimario`, cache-first, non svuotata al cambio
VERSION (come `vendor/`). L'**editor funziona offline da subito**; il rimario alla prima apertura
chiede "Scarica il rimario (≈800 KB, una volta sola)" e poi è offline per sempre.

## 3. Flusso utente

**390×844:** editor a tutta schermata, barra inferiore con titolo, conteggio del verso corrente e
`tb-btn--primary` "Rime" che apre il rimario come `tb-sheet` (03 §2). **Da 900 px:** due colonne,
editor a sinistra, rimario fisso a destra, niente foglio.

**Editor.** Stati **vuoto** ("Nuovo testo"), **scrittura**, **lista documenti**. Titolo in testa,
corpo in una `textarea` con a margine la colonna dei conteggi; salvataggio automatico (debounce
600 ms) e riga "Salvato". `tb-segment` **Metrico / Grammaticale**, `tb-toggle` **Monospazio** e
**Rime a colori**. Menu: Nuovo, Documenti (titolo, prima riga, data; apre o elimina con conferma in
`tb-sheet`), Condividi (Web Share; senza, copia e toast). Doppio tocco su una parola → rimario.

**Conteggio.** In **metrico** si applica la sinalefe e si normalizza a piano (tronca +1, sdrucciola
−1); un legamento segna ogni sinalefe e il numero è toccabile: apre un foglio con le sinalefi del
verso e un `tb-toggle` per ciascuna (dialefe manuale, salvata nel documento). In **grammaticale**
sillabe vere. Le parole con accento **stimato** hanno il numero in muted e `aria-description`.

**Rime a colori.** L'ultima parola di ogni verso entra in una classe di rima; le classi con almeno
due versi prendono uno di sei colori dai token (contrasto ≥ 4.5:1) più una **lettera** a fine riga
per chi non distingue i colori: oltre sei il colore si ricicla, la lettera no.

**Rimario.** Campo parola, `tb-segment--scroll` **Rime · Assonanze · Consonanze · Multisillabiche**,
`tb-select` "Sillabe: tutte / 1 / 2 / 3 / 4+". Risultati come pillole col numero di sillabe,
ordinate per frequenza e, a parità, per lunghezza; toccandone una la parola va al cursore e il
foglio si chiude (con "Annulla" nel toast), su desktop `tb-toggle` "Copia invece di inserire".
Stati: vuoto, caricamento, risultati, nessun risultato, **parola sconosciuta** (`tb-badge` "rima
calcolata dalla forma scritta" più `tb-segment` piana/sdrucciola), offline.

**Chiavi `penna-`, IT · EN:** Penna · Lyric Pad; Nuovo testo · New lyric; Documenti · Documents;
Rime · Rhymes; Assonanze · Assonances; Consonanze · Consonances; Multisillabiche · Multisyllabic;
Sillabe · Syllables; Metrico · Metric; Grammaticale · Grammatical; Rime a colori · Colour the
rhymes; Accento stimato · Estimated stress; Scarica il rimario · Download the rhyme dictionary; Da
dove vengono le rime · Where the rhymes come from; Sinalefe · Elision. Monospazio, Salvato, Elimina,
Condividi, Copia, Cerca e gli stati riusano le chiavi comuni. **In inglese si dichiara che il
rimario è solo italiano** (`penna-it-only`, sotto il campo), e i risultati restano `lang="it"`.

## 4. Architettura

**Nuovi:** `toolbox/penna/{index.html, penna.js, penna.css, i18n.js, rimario-worker.js}`;
`toolbox/shared/testo/{sillabe.js, fonetica.js, metrica.js}`;
`toolbox/penna/data/{parole-v1.txt, chiavi-v1.json, tratti-v1.bin, LICENSE.txt, ATTRIBUZIONE.md}`;
`scripts/build-rimario.mjs`.

**`shared/testo/` — moduli puri, senza DOM, importabili in Node** (è ciò che rende verificabili i
criteri del §6): `sillabe.js` (le sette regole di sillabazione della ricerca §2 e la stima
dell'accento — grafico → tronca, monosillabo, suffissi sdruccioli, default piana — con esito
`esatto | stimato`); `fonetica.js` (chiave di rima dalla vocale tonica, normalizzazioni
ortografia→suono della ricerca §2, doppie conservate, `e/ɛ` e `o/ɔ` accorpate, più scheletro
vocalico e consonantico); `metrica.js` (sillabe del verso, sinalefi con posizione, normalizzazione
a piano).

**Dati.** `parole-v1.txt`: una forma per riga **ordinata per frequenza decrescente**, l'indice di
riga *è* il rango. `chiavi-v1.json`: tre mappe (rima, scheletro vocalico, scheletro delle ultime tre
sillabe) da chiave ad array di indici ordinati. `tratti-v1.bin`: un byte per parola — 5 bit sillabe,
2 bit classe d'accento, 1 bit "stimato". Stima ~800 KB compressi su ~150 000 forme, target ≤ 1,5 MB.
Il suffisso `-v1` cambia a ogni rigenerazione: rende sicuro l'`immutable` senza toccare VERSION.

**`scripts/build-rimario.mjs`** (offline, sorgenti scaricate a mano in `scripts/input/`): legge il
JSONL kaikki di it.wiktionary (`hyphenations.parts` → sillabe e vocale tonica, `sounds.ipa` come
controprova e per gli omografi), aggiunge le forme mancanti di `280000_parole_italiane.txt`
calcolandole con `shared/testo/` e marcandole `stimato`, ordina con `it_50k.txt` (chi manca in coda,
per lunghezza), scarta ciò che non è `^[a-zàèéìíîòóùú']+$`, scrive i tre file più le licenze e
stampa forme, accenti esatti e byte compressi.

**Worker** `penna/rimario-worker.js`, `type: 'module'`: scarica i tre file con progresso, costruisce
`Map` e `TypedArray`, risponde a `{parola, tipo, sillabe}` con gli indici filtrati e ordinati. Se non
si costruisce (Safari vecchio) `penna.js` fa lo stesso sul thread principale, come la 13 §4.

**Salvataggio.** `storage.put('penna', <id>, { titolo, testo, creato, modificato, dialefe })`,
`list`, `del`; **nessun tetto al numero** (sono testi dell'utente, non uno storico come la 13),
`persist()` al primo salvataggio. Prefs `tt.penna.conteggio`, `.mono`, `.colori`, `.ultimo`.

**Prestazioni.** Ricerca: una `Map.get` più un filtro sui tratti, **< 50 ms** su 150 000 parole;
indice caricato in ≈ 300–500 ms, una volta per sessione; conteggio solo dei versi cambiati, su
`input` con `requestIdleCallback`, 100 versi da zero in < 30 ms.

**Modificati:** `shared/tools.js` (`penna` → `'live'`, `next` a `pianificatore-uscita`); `sw.js`
(VERSION `tb-v17` → `tb-v18`; `TOOLS` + i cinque file di `/penna/`, `SHELL` + i tre di
`shared/testo/`; **non** i dati); `toolbox/_headers`; `sitemap.xml` (0.8); `manifest.webmanifest`
(quinto `shortcut`).

## 5. Divisione del lavoro

**builder (Sonnet):** `penna/index.html` (markup dei due pannelli e di tutti gli stati, id fissati
qui: `#pen-editor #pen-title #pen-text #pen-gutter #pen-docs #pen-count-mode #pen-mono #pen-colors
#pen-rhyme #pen-query #pen-type #pen-syl #pen-results #pen-download #pen-status #pen-sheet`),
`penna/penna.css` (due colonne da 900 px, gutter allineato riga per riga, sei classi di rima,
monospazio), `penna/i18n.js`, `shared/tools.js`, `sw.js`, `toolbox/_headers`, `sitemap.xml`,
`manifest.webmanifest`. Nessuna logica JS.

**implementer (Opus):** i tre `shared/testo/*`, `scripts/build-rimario.mjs`, i file generati in
`penna/data/`, `penna/rimario-worker.js`, `penna/penna.js` (editor, gutter, colori, IndexedDB,
condivisione, foglio, prefs, ARIA, ripiego senza Worker). Non tocca HTML/CSS. I due lavorano in
parallelo sugli id qui sopra.

## 6. Criteri di accettazione

Da 1 a 6 in Node, importando `shared/testo/*` senza DOM.

1. `amore` → `a-mó-re`, piana, accento **esatto**; `città` tronca; `àncora` sdrucciola (due letture
   con `ancòra`); `fi-ne-stra`, `ac-qua`, `so-pra`, `al-to`; `figlio` 2 sillabe, `aiuola` 3.
2. `amore` → **rime**: `cuore`, `dolore`, `sapore`, `colore` presenti, `amore` assente;
   **assonanze**: `sole`, `nome` (`o-e`), `cuore` assente perché già rima; **consonanze**: forme in
   `-mVrV`; `notte` non compare fra le rime di `note`.
3. `Nel mezzo del cammin di nostra vita` → **11** in metrico e in grammaticale. `Mi ritrovai per una
   selva oscura` → **11** in metrico, con la sinalefe `selva oscura` segnalata, e **12** in
   grammaticale. `Tant'era pien di sonno a quel punto` → **10** con la nota "dialefe non
   automatica"; attivandola su `sonno a` → **11**.
4. Finale tronca (`…perché`) +1 e sdrucciola (`…sillaba`) −1 rispetto al grammaticale.
5. `tavernello` (fuori lemmario) → rime calcolate, marcate **stimato**, piana per default; il
   `tb-segment` "sdrucciola" ricalcola la chiave.
6. Indice di **100 000 parole**: costruzione < 1 s, **ogni ricerca < 50 ms** (media su 200 query
   casuali), processo sotto i 120 MB.
7. `node scripts/build-rimario.mjs` rigenera i tre file: somma gzip **≤ 1,5 MB**, almeno il **60 %**
   delle forme con accento esatto, licenze che citano Wikizionario e FrequencyWords (CC BY-SA 4.0)
   e paroleitaliane (MIT).
8. Prima apertura online: scarica con barra, poi funziona; ricaricando **non riscarica**; in
   modalità aereo senza dati compare `penna-offline` e l'editor resta usabile.
9. Tre documenti sopravvivono a ricaricamento e chiusura della PWA; elimina chiede conferma;
   Condividi apre il foglio di sistema o copia con toast.
10. 390×844: editor a tutta schermata, barra sopra la safe-area, foglio a due terzi, bersagli
    ≥ 44 px; da 900 px due colonne senza foglio.
11. `textarea` etichettata, gutter `aria-hidden`, conteggio del verso corrente in `aria-live` al
    cambio riga, rime leggibili anche senza colore, reduced-motion rispettato. `?lang=en` traduce
    tutto, mostra l'avviso "Italian only", lascia i risultati in `lang="it"`.
12. Nessuna richiesta fuori dall'origine, nessuna violazione CSP, `immutable` una volta sola su
    `/penna/data/`; `node scripts/check.mjs` passa.
13. *Da provare su iPhone:* module worker vs ripiego, Web Share, `textarea` con la tastiera aperta,
    persistenza dopo giorni in standalone.

## 7. Rischi e alternative scartate

- **Wikizionario invece di espeak** per l'accento: espeak è GPL-3.0 e il suo output porta con sé il
  dizionario di pronuncia. Costo: copertura incompleta, da cui il bit "stimato" visibile all'utente.
- **PAISÀ (CC BY-NC-SA) e CoLFIS (accademico) scartati**: il sito è commerciale. FrequencyWords ha
  il registro del parlato, quello che serve a chi scrive testi.
- **Dati nel precache: scartato**, farebbe pagare 800 KB a ogni installazione della Toolbox.
- **Multisillabiche fra più parole**: costo combinatorio alto, risultati spesso assurdi. V1 lavora
  sulle ultime tre sillabe di una parola sola.
- **Timbro di `e`/`o` accorpato**: `còlto`/`cólto` risultano rima; l'IPA resta nei dati per un
  filtro futuro. **Sineresi, dieresi e dialefe** sono scelte d'autore, non regole: si dichiarano.
- **`contenteditable` scartato** per `textarea` + livello sottostante: evita i bug di selezione e
  IME di iOS.
