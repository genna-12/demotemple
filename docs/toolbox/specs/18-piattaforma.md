# Spec 18 — Piattaforma comune (archivio, sincronizzazione, impostazioni, aiuto, automazione)

21 settembre 2026. Generalizza la 17. Vincoli invariati: costo zero, niente terzi, niente
account, niente cookie, ESM vanilla, iOS/PWA.

## 1. Scopo

Da sei strumenti che si assomigliano a **un'app sola**: stessi dati, una sincronizzazione, una
pagina impostazioni, un aiuto. Lo strumento resta il protagonista, la piattaforma è lo scheletro.
Fuori perimetro: account, condivisione fra persone, fusione automatica, cronologia versioni, audio
sincronizzato.

## 2. Vincoli applicati

Nessuna rotta nuova: solo `/api/quaderno/*` della 17, stesso origin, `connect-src 'self'` già a
posto. `_headers` cambia in un punto: `Referrer-Policy: no-referrer` (rischio della 17 §7).
**Impatto informative: sì** — il testo Iubenda della 17 §4 va esteso da «i tuoi testi» a «i dati
della Toolbox». La sincronizzazione resta spenta finché non si crea o collega un codice.

## 3. Archivio unico — `shared/archivio.js`

Modulo **sopra** `storage.js`, che non cambia (`records`, chiave `[tool, id]`). Il campo `tool`
diventa la **collezione**: `penna`, `dna`, `accordature`, `metronomo-preset`, `uscite`,
`impostazioni`.

**Record uniforme** (il `value` di storage.js): `{ v:1, sid, modificato, cancellato, dati }`.
`sid` = 16 hex casuali assegnati **alla prima scrittura**, non alla prima sincronizzazione (serve
anche a esporta/importa); `modificato` epoch ms; `dati` il payload dello strumento. La **lapide**
è il record stesso con `cancellato:1`, `dati:null`: sparisce la collezione separata `penna-tomb`
della 17. Potate dopo 90 giorni, solo se già sincronizzate.

```
pronto()                          migrazioni + apertura, idempotente
leggi(coll,id)   scrivi(coll,id|null,dati)   elenca(coll,{conCancellati})
elimina(coll,id) // lapide        svuota(coll)      onChange(coll,cb) // BroadcastChannel
esportaTutto()   importaTutto(json,{strategia:'unisci'|'sostituisci'})
```

**Versione dello schema** in `impostazioni/schema`, dentro IndexedDB e non in localStorage (se
l'utente lo svuota le migrazioni non devono ripartire). Migrazioni numerate, idempotenti, una
transazione per passo, da `pronto()` prima di ogni lettura:

1. `penna`: il vecchio `value` diventa `dati`, `sid` dal record se c'è (la 17 lo scrive già),
   `modificato` = `updated`.
2. `penna-tomb`: ogni voce diventa una lapide in `penna` col suo `sid`; le chiavi vecchie si
   cancellano solo a migrazione riuscita.
3. `dna`: stesso involucro, id = timestamp. 4. `pianificatore-uscita` → `uscite`.
5. `tt.accordatore.custom` (già con `name` e `strings`) → un record per accordatura in
   `accordature`; la preferenza resta scritta una versione ancora.
6. Preferenze **portabili** (`tinyTempleLang`, `tt.shared.a4`, `tt.dna.target`,
   `tt.penna.*`, `tt.metronomo.*`, `tt.calcolatore-tempo.*`) → un record per chiave in
   `impostazioni`; localStorage resta la copia veloce per il boot sincrono (`lang-boot.js`),
   l'archivio è la verità. **Locali e mai sincronizzati**: consenso al microfono, chiave e
   codice, pacchetti lingua installati, e dal giro 3 di T1 la dashboard (`tt.dash.*`) e il
   volume del metronomo (`tt.metronomo.volume`), che dipendono dal dispositivo.

Si scrive sempre prima di cancellare, ed `esportaTutto()` funziona anche prima di migrare.

**Limiti per collezione** (client e server, costante unica in `shared/limiti.js`): penna
1000/256 KB, uscite 500/64 KB, dna 2000/8 KB, accordature 200/4 KB, metronomo-preset 200/4 KB,
impostazioni 50/16 KB. Oltre: messaggio, mai errore silenzioso.

## 4. Sincronizzazione generalizzata — `shared/sync.js`

`penna/sync.js` diventa `shared/sync.js`. Derivazione identica alla 17 §4 (PBKDF2-SHA256 200 000,
salt `tt-quaderno-v1`, HKDF `quaderno-chiave` e `quaderno-id`). Cambia solo: il codice è **della
Toolbox**, uno per tutto, in Impostazioni; **AAD = `<id>|<collezione>|<sid>`**; il giro copre ogni
collezione sincronizzabile.

**Schema D1 definitivo.** Genna sta creando il database ora: **conviene creare direttamente
questo**, non la tabella della 17 — una riga di SQL in più oggi, zero migrazioni dopo.

```sql
CREATE TABLE voci (
  quaderno TEXT NOT NULL, collezione TEXT NOT NULL, doc TEXT NOT NULL,
  aggiornato INTEGER NOT NULL, cancellato INTEGER NOT NULL DEFAULT 0,
  blob TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (quaderno, collezione, doc));
CREATE TABLE limiti (
  quaderno TEXT PRIMARY KEY, finestra INTEGER NOT NULL, colpi INTEGER NOT NULL);
```

Se `voci` della 17 esiste già (sarà vuota: la 17 non è mai stata su `main`): `DROP TABLE voci;`,
poi l'SQL sopra. Con dei dati dentro: `voci2` con questo schema, `INSERT INTO voci2 SELECT
quaderno,'penna',doc,aggiornato,cancellato,blob FROM voci;`, drop e `RENAME`.

**Rotte** (`functions/api/quaderno/[[route]].js`):

| metodo | percorso | note |
|---|---|---|
| GET | `/api/quaderno/<id>` | manifest di tutte le collezioni, **una query** |
| GET | `…/<id>/<coll>/<doc>` | blob |
| PUT | `…/<id>/<coll>` | **lotto** ≤ 20 voci → un solo `env.QUADERNO.batch()` |
| PUT | `…/<id>/<coll>/<doc>` | singolo, per compatibilità |
| DELETE | `…/<id>/<coll>/<doc>` | lapide |
| DELETE | `…/<id>` | cancella tutto |

Il lotto è la via normale (D1: 50 query per invocazione, 100 000 scritture al giorno — due ordini
di grandezza sotto). Controlli invariati dalla 17 §4, più `collezione` `^[a-z][a-z0-9-]{1,31}$` e la
tabella dei limiti; rate limit 60 colpi/60 s; risposte `no-store`, nessun cookie, nessun blob nei log.

**Giro:** manifest → per collezione confronto `modificato`/`aggiornato` per `sid` → PUT in lotti,
GET dei più recenti, la lapide vince. Priorità `impostazioni`, `penna`, `uscite`, `accordature`,
`metronomo-preset`, `dna`; ≤ 60 documenti per giro. Quando: all'apertura, 3 s dopo l'ultimo
salvataggio, a mano.

## 5. Pagina Impostazioni — `/impostazioni/`

Pagina vera (`impostazioni/index.html|.js|.css|i18n.js|aiuto.js`), **non** una tile: sta nel menu
e in fondo al foglio di ogni strumento come riga «Impostazioni della Toolbox →». L'ingranaggio di
uno strumento apre ancora **il suo** foglio, che tiene solo ciò che è suo e non duplica più
lingua, microfono, pacchetti, dati.

Sezioni: **Lingua** · **Aspetto** (animazioni ridotte, salta l'intro) · **Microfono** (stato,
«Revoca il permesso» → `mic.revoke()`) · **Sincronizzazione** (codice della Toolbox: crea,
collega, sincronizza ora, mostra, scollega, scollega ed elimina; interruttore per collezione) ·
**Pacchetti lingua** · **Dati** (esporta in `.json`, importa unisci/sostituisci, «Cancella tutto»
con conferma digitata) · **Informative** · **Versione dell'app**.

Esportazione: `{ app, schema, esportato, collezioni:{<coll>:[record…]}, preferenze:{} }`;
l'importazione unisce per `sid`, vince l'ultimo.

## 6. Aiuto in-app uniforme

`<slug>/aiuto.js` esporta `{ it:[{t,d}…], en:[…] }` (titolo + due righe per voce).
`shared/aiuto.js` monta un `tb-sheet` «Come funziona» costruito al volo con `openSheet`
(`sheet.js` lo fa già), aperto da un `.tb-help` nella barra **con etichetta visibile**. Primo
avvio: una riga `.tb-hint` non bloccante, con «×», ricordata in `tt.<slug>.hint`. Nessun tour,
nessun overlay che copra i tocchi. Regola: **ogni pulsante icona ha etichetta visibile o
`tb-tip`** (popover toccabile: `title` al dito non esiste, audit §4).

## 7. Rifiniture trasversali (bloccanti dell'audit)

1. `shared/base.css:351-365`, `shared/intro.js:97-105` — `pointer-events:none` su `.tb-intro`
   sempre; `.tb-logo` non cliccabile finché non ha finito `in-nav`.
2. `shared/dash.js:192-204` — `endDrag()` all'inizio di `setEditing()`.
3. `shared/dash.js:425` — `pointerup`/`pointercancel`/`lostpointercapture` su `window`.
4. `shared/dash.js:221-223` — barra fissa «Stai riordinando · Fine», toast al tocco di una tile,
   uscita toccando il fondo vuoto.
5. `shared/dash.js:208-219` — toast «Tolto {strumento} · Annulla».
6. `shared/bpm-control.js:164-168` + `metronomo/index.html:207-208` — via i due `<button>` bordo,
   zone gestite da `bpm-control.js` (tap ±1, trascinamento rotella), trascinamento anche dal
   valore, editor numerico solo su tap fermo.
7. `dna/dna.js:317,337-340` — l'errore lascia visibili `#dna-drop` e «Recenti», messaggio sopra.
8. `pianificatore-uscita/i18n.js:56-57,183-185` — singolare `pia-in-day`/`pia-day-ago`.
9. `shared/components.css:665` — `.tb-segment-btn` e `.calc-cell` a 44 px.
10. `accordatore/index.html` — `aria-label` su `#acc-instrument`.
11. `toolbox/index.html:208` — sottotitolo sotto l'`h1`;
    `shared/pwa.js:66-75` — «×» sul toast «Nuova versione»;
    `toolbox/_headers` — `Referrer-Policy: no-referrer`.

## 8. Automazione — `scripts/e2e/` e `.github/workflows/verifica.yml`

Playwright + Chromium **fuori dal perimetro pubblicato**: `scripts/e2e/package.json` — non alla
radice, così Pages non vede mai un package.json da «costruire» — e `scripts/e2e/node_modules/` in
`.gitignore`. Nel container `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`; su GitHub
`npx playwright install --with-deps chromium`.

`serve.mjs`: server statico con `toolbox/_headers` e clean URL (lo stesso dell'audit), porta 4321.
**Niente rete**: `page.route('**/*')` lascia passare solo `http://127.0.0.1:4321/**` e **fa fallire
il test** su qualunque altro host; `/api/quaderno/*` è servita da uno stub in memoria che
implementa il contratto del §4, così la sincronizzazione si prova senza D1.

Copertura, per ogni pagina a **390×844 con tocco reale** e a **1366×768**: nessun errore in
console, nessuno scroll orizzontale, bersagli ≥ 44 px, focus visibile,
imposta→ricarica→persistenza, `prefers-reduced-motion`, offline dopo il primo caricamento.
Flussi: tile toccata entro 300 ms dall'apertura, Modifica con uscita, rotella BPM dal 5 % e dal
95 %, file non audio in DNA, testo di Penna che sopravvive, sincronizzazione fra due contesti,
esporta→cancella→importa. Traccia e screenshot solo sui fallimenti.


`verifica.yml`: a ogni push e pull request — Node 22, `check.mjs`, `npm ci`, `playwright install`,
test, artefatti; `concurrency` che annulla i giri superati. ~5 minuti, minuti gratuiti perché il
repo è pubblico. **Genna non fa nulla**: vede verde o rosso accanto al commit su GitHub e lo stato
del deploy su Cloudflare.

## 9. Divisione del lavoro

**implementer (Opus):** `shared/archivio.js` e migrazioni, `shared/sync.js`,
`functions/api/quaderno/[[route]].js` e l'SQL, `shared/limiti.js`, `dash.js`, `bpm-control.js`,
`intro.js`, `pwa.js`, `sw.js`, `_headers`, `scripts/e2e/`, `verifica.yml`, `check.mjs`.

**builder (Sonnet):** `impostazioni/*`, `shared/aiuto.js` e gli `aiuto.js` dei sei strumenti,
`.tb-hint`/`.tb-tip`/`.tb-help` in `components.css`, la voce di menu, i punti 8-13 del §7, i
testi IT/EN. Nessun file in comune.

## 10. Criteri di accettazione

1. `pronto()` su un profilo con testi, lapidi, analisi, piani e accordature migra tutto senza
   perdere un record; rilanciato non cambia nulla; `esportaTutto()` dà gli stessi `sid` prima e dopo.
2. Due browser con lo stesso codice allineano **tutte** le collezioni; un'accordatura creata
   sull'uno compare sull'altro col suo nome; una eliminata sparisce su entrambi.
3. Un giro da 60 documenti costa ≤ 6 richieste, < 10 ms di CPU ciascuna; manifest di 2000 voci
   in una query, < 200 ms.
4. Senza codice attivo, nessuna richiesta verso `/api/` da nessuna pagina.
5. `/impostazioni/` cambia lingua, revoca il microfono, esporta un `.json` che reimportato
   ricostruisce lo stato identico; «Cancella tutto» svuota IndexedDB, localStorage e cache.
6. Ogni strumento ha «Come funziona» IT/EN; nessun pulsante icona senza etichetta o `tb-tip`.
7. Ogni punto del §7 ha un test e2e che fallisce prima della correzione e passa dopo.
8. `verifica.yml` verde su un push pulito, rosso su una regressione introdotta apposta;
   `check.mjs` passa; file nuovi LF.
9. *Da provare su iPhone:* migrazione di un profilo vecchio, sincronizzazione in standalone dopo
   giorni, esporta/importa da Condividi.

## 11. Rischi e alternative scartate

- **Un object store per collezione: scartato** — `storage.js` resta com'è, zero migrazioni IDB.
- **CRDT / fusione: scartata** di nuovo (17 §7). **Impostazioni come tile: scartata.**
- **package.json alla radice: scartato** — Cloudflare tenterebbe una build sulla vetrina.
- PBKDF2 200 000 su iPhone vecchi (17 §6.9): oltre 2 s si scende a 150 000 e **si scrive qui**.
