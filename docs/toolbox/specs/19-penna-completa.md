# Spec 19 — Penna portata a «completo» (T2/1)

Base: spec 14, 14b, 16, 18 §3-6; ricerca casi d'uso §5, audit UX (rimario 3).

## 1. Scopo e utente

Chi scrive canzoni, a casa, in sala, sul palco: rime a colori **coerenti** su due livelli + lacune
A/B a basso costo. Già presenti (verificato): ricerca nel testo, «Copia invece di inserire», stampa,
ordine, «forza» accento (solo ricerca). **Fuori:** rete, terzi; §7.

## 2. Vincoli applicati

Zero rete e permessi nuovi: wake lock (`shared/ui.js`) già usato dal Metronomo, non limitato da
`Permissions-Policy`. Nessun impatto informative. Preferenze in `prefs`. Precache → `VERSION` +1.

## 3. Flusso utente

**Rime a colori.** Regola esatta (in `shared/testo/schema.js`, pura):
1. Si considera l'**ultima parola** di ogni verso (`ultimaParola` con il `normalizza` della lingua
   del testo). Righe vuote e **marcatori di sezione** (§3 Sezioni) escluse.
2. `k = fonetica.chiavi(parola, { forza })` della lingua del testo; `forza` = la classe vera
   se il rimario la conosce (stessa fonte del gutter), se no `null`.
3. **Famiglia** = `k.vocali + '|' + k.classe` (assonanza dalla tonica, a parità di sillabe dopo
   la tonica: «mai» tronca ≠ «balli» piana). Famiglie con ≥ 2 versi ricevono **lettera**
   (A, B… in ordine di primo verso) e **colore** `indice % 8`.
4. Dentro la famiglia, versi con la stessa `k.rima` (≥ 2) = **rima perfetta**: lettera **piena**
   (pastiglia colorata, testo scuro), barra laterale piena. Il primo gruppo perfetto è «A», il
   secondo «A₂», il terzo «A₃» (ordine di primo verso).
5. Versi della famiglia senza compagno perfetto = **assonanza**: lettera **vuota** (bordo 1,5 px
   nel colore, testo nel colore, senza pedice), barra tratteggiata/opacità 0,5, sfondo più tenue.
6. **Consonanza e multisillabiche: no** nei colori (restano nel rimario). Rime interne: no.
Invariante: stessa famiglia ⇒ stessa lettera, nessun escluso. Pieno/vuoto si legge senza colore.

**Sezioni.** Una riga che è solo `[qualcosa]` (1-40 caratteri, spazi ai lati ammessi) è un
marcatore: niente numero né lettera, non conta nei versi della card, fascia `pen-sezione` nel mirror.

**Modalità prova** (sul palco/in sala). Pulsante `#pen-prova-open` nella barra dell'editor
(IT «Prova» · EN «Stage»; tip «Testo grande, schermo sempre acceso» / «Big text, screen stays
on»). Hash `#t=<id>&prova` («indietro» esce). Vista `data-pen-vista="prova"`: titolo e versi in sola
lettura (`<p>` per verso, marcatore = `<h3>`), senza numeri, lettere, colori, barre. Controlli: `#pen-prova-smaller` «A−»,
`#pen-prova-bigger` «A+» (5 passi 20/24/28/34/40 px, default 28, pref `provaCorpo`), `#pen-prova-exit`
«Fine»/«Done», Esc. Wake lock acceso all'ingresso, riacquisito a `visibilitychange`, rilasciato
all'uscita (se manca, funziona uguale).

**Elenco.**
- Titolo automatico (solo mostrato, mai salvato): senza titolo, card = primo verso come titolo e
  secondo come riga; idem nome `.txt`, condividi, stampa, placeholder di `#pen-title`.
- Ricerca: se il termine non è nel titolo, la card mostra il **primo verso che lo contiene**,
  termine in `<mark>` (se la posizione normalizzata non coincide, senza mark).
- Elimina (card ed editor): toast «Testo eliminato» con azione «Annulla» per 6 s →
  `scrivi(TOOL, id, docPrima)` rianima lo stesso id (`modificato` più recente della lapide, la
  sync lo propaga); toast «Testo ripristinato».
- Sillabe nella card: **no** (vedi §7).

**Foglio impostazioni, sezione Quaderno:** `#pen-duplicate` «Duplica questo testo» (solo in vista
editor; copia titolo + « (copia)»/« (copy)», testo, dialefe, lingua, emuet; nuovo id; apre la
copia; toast «Copia creata»; limiti → `penna-limit` come oggi). `#pen-export-txt` «Esporta
tutto in .txt»: un file `penna-testi-AAAA-MM-GG.txt`, per testo `testoTxt()` separati da
`\n\n— — —\n\n`, stesso ripiego iOS di `esporta`.

**Rimario:** tipo (`rimTipo`), sillabe (`rimSillabe`) e ultima parola (`rimParola`) in `prefs`,
ripristinati al montaggio; la ricerca riparte quando il rimario è pronto (nessun download
nuovo: parte solo se già permesso, come oggi).

## 4. Architettura

- **Nuovo** `toolbox/shared/testo/schema.js` (puro, LF): `isSezione(riga)`;
  `schemaRime(testo, { chiavi, pulisci, classe })` → `[{ riga, famiglia, colore, lettera, indice,
  livello: 'rima'|'assonanza' }]` ordinato per riga (`indice` 0 per l'assonanza, 1..n per i
  gruppi perfetti). `chiavi` di default quella italiana.
- `penna.js`: `gruppiDiRima` resta esportata (e2e) come involucro di `schemaRime`, con in più
  `gruppo`. `renderColori`: span `pen-line pen-rima-N is-rima|is-assonanza`, oppure `pen-line
  pen-sezione`; lettera `<i class="pen-lettera">A<b class="pen-lettera-n">2</b></i>` (il `<b>`
  solo se `indice ≥ 2`). La firma della cache include `classi`/tratti. `renderGutter`: vuoto sui
  marcatori. Prova, duplica, annulla, prefs rimario, titolo mostrato, export `.txt`.
- `elenco.js`: `contaVersi` esclude i marcatori; `titoloMostrato(rec)`; `versoTrovato(testo, q)`
  → `{ verso, da, a } | null`; `idDaHash` accetta `&prova`, nuovo `provaDaHash(hash)`.
- `file.js`: `quadernoTxt(testi)`, `esportaTxt(testi, { ripiego })`.
- `index.html`: controlli di §3, `<section id="pen-prova" hidden>` con `#pen-prova-title`,
  `#pen-prova-body`, i tre pulsanti; simbolo `#tb-icon-prova` nello sprite della pagina.
- `penna.css`: `.pen-lettera` a pastiglia (piena) e `.is-assonanza .pen-lettera` (vuota),
  `.pen-lettera-n` pedice, `.pen-sezione`, vista prova (`--pen-prova-size`), `mark` nelle card,
  `body.pen-prova-attiva` nasconde la barra globale.
- `i18n.js` IT/EN: `penna-prova`, `penna-prova-tip`, `penna-prova-exit`, `penna-prova-bigger`,
  `penna-prova-smaller`, `penna-duplicate`, `penna-duplicated`, `penna-copy-suffix`,
  `penna-export-txt`, `penna-restored`.
- `aiuto.js`: voce lettere riscritta (piena = rima, vuota = assonanza, colore = famiglia), voci
  «Sezioni» e «Prova».
- `sw.js`: `VERSION` +1, `/shared/testo/schema.js` in precache.

## 5. Divisione del lavoro

- **implementer** (Opus): `shared/testo/schema.js`, `penna/penna.js`, `penna/elenco.js`,
  `penna/file.js`, `sw.js`, `scripts/e2e/tests/penna-completa.spec.mjs` (nuovo), adeguamento di
  `penna-stress.spec.mjs` se cambia la forma.
- **builder** (Sonnet): `penna/index.html`, `penna/penna.css`, `penna/i18n.js`, `penna/aiuto.js`.
Contratto: id e classi di §3-4; file disgiunti, in parallelo.

## 6. Criteri di accettazione

Testo: `contenuti/testo-prova-canto.txt` (righe numerate da 1), lingua IT, colori accesi.
1. spiegarmi (1), ascoltarmi (3), **fermarmi (24)**: A **piena**, colore 0 (rima «armi»; fermarmi
   è rima, non assonanza).
2. pensarci (22), stanchi (26): A **vuota**, colore 0.
3. balli (5, 28): A₂ piena; guardarti (21, 42, 55): A₃ piena; tutti colore 0.
4. andare (45), male (48): H **vuota**, colore 1.
5. solo (11, 32): E piena; nuovo (14, 35): E₂ piena; colore 4.
6. mai (43, 46): G piena, colore 0, **non** in famiglia A. però/no/po (2, 4, 6, 23…): B piena
   colore 1; occhi (7), sei (44), lui (47): nessuna lettera.
7. Invariante automatica (Node, `schemaRime`) su tutte le 55 righe: stessa famiglia ⇔ stessa
   lettera; stesso `rima` ⇔ piena e stesso indice.
8. Inserendo `[Ritornello]` prima della riga 9: gutter vuoto su quella riga, nessuna lettera,
   lettere degli altri versi invariate, card «55 versi».
9. Prova: 55 `.pen-prova-verso`, font 28 px, gutter e lettere assenti; A+ → 34 px, dopo reload
   ancora 34; «indietro» ed Esc tornano all'editor; `navigator.wakeLock.request` chiamato
   (stub Playwright).
10. Elimina da card → «Annulla» entro 6 s → card di nuovo presente, stesso id e testo;
    `leggi()` la restituisce; su un secondo contesto sincronizzato resta viva.
11. Duplica: nuovo id, titolo «… (copia)», testo identico, hash `#t=<nuovo>`.
12. Rimario: Assonanze + «2» + «cuore», reload, rimario aperto → stessi filtri e risultati.
13. Testo senza titolo: card titolo «Forse non riesco a spiegarmi», riga «Mai bene però»;
    ricerca «ooo» → riga «Ooo-ooo-ooo» con `<mark>`.
14. Esporta `.txt` con 2 testi: un file con entrambi i titoli e tutti i versi.
15. `check.mjs` e tutti gli e2e verdi.
16. **Da provare su iPhone:** schermo acceso in prova (Safari e standalone), A+ leggibile a un
    braccio, «Annulla» toccabile, download `.txt` in standalone.

## 7. Rischi e alternative scartate

- Le lettere possono cambiare all'arrivo del rimario (classe vera): come il gutter; accettato.
- «io» (8, 29) cade in B (tonica in iato non riconosciuta): fuori perimetro.
- Scartati: una lettera per famiglia (confonde rima e assonanza); lettera per rima e colore per
  famiglia (assonanze senza lettera); sillabe/medie in card e per strofa (senza rimario sono
  stime, «ritrovare un testo» lo risolve la ricerca col verso trovato); dizionario personale
  degli accenti (Worker + metrica: T3); scorrimento automatico; rime interne; link di
  condivisione (privacy); rete o terzi.
