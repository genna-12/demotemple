# Guida rapida per Genna

Le cose da fare a mano, sempre uguali. Aggiornata al 21 settembre 2026.

## 1. Ogni volta che arrivano file nuovi nella cartella

Dal prompt dei comandi, nella cartella `TEMPLE`:

```
git status                 # controlla che i file cambiati siano quelli attesi (trappola OneDrive)
node scripts/check.mjs     # deve finire con "Esito: OK"
git add -A
git commit -m "Toolbox: <cosa è cambiato>"
git push
```

Se `check.mjs` dice FALLITO, non committare: incolla l'output nella chat.
I test veri (quelli che aprono le pagine in un browser finto) **girano da soli
su GitHub a ogni push**: guarda la spunta verde o la croce rossa accanto al
commit. Se proprio vuoi lanciarli anche qui — non serve mai —
`cd scripts/e2e && npm ci && npx playwright test`.
Cloudflare pubblica da solo dopo il push (progetto `tiny-temple-toolbox`,
branch di produzione `toolbox` finché non facciamo il merge su `main`).
Chi ha già la Toolbox aperta vede il toast "Nuova versione — Aggiorna".

## 2. Quando facciamo il merge su `main` (vetrina + Toolbox insieme)

1. Aggiornare le informative Iubenda (microfono usato solo in locale, sottodominio).
2. `git checkout main` → `git merge toolbox` → `git push`.
3. Su Cloudflare, progetto `tiny-temple-toolbox`: Production branch da `toolbox` a `main`.
4. Controllare che `https://tinytemplestudio.it/toolbox/` rimandi al sottodominio.

## 3. Rigenerare il rimario con il Wikizionario (fatto il 21/9; da rifare solo se cambia qualcosa)

Il Wikizionario dà sillabazione e accento tonico veri per circa 81.000
parole italiane. Con quello il rimario è passato dal 7,9 % al 38 % di forme
con accento esatto (dati `v2`), e le chiavi di rima usano le sillabe vere
("pa-u-ra" rima con "cura", non con "laura"). La rete di Claude non può
scaricare il dump, quindi lo fai tu. Passi:

1. Scarica dal browser
   `https://kaikki.org/itwiktionary/raw-wiktextract-data.jsonl.gz`
   (circa 40 MB; è il dump del Wikizionario italiano, licenza CC BY-SA 4.0,
   già citata in `toolbox/penna/data/ATTRIBUZIONE.md`).
2. Mettilo nella cartella `TEMPLE/scripts/input/` (creala se non c'è; è
   ignorata da git, non finisce online).
3. **Alza la versione dei dati** in un posto solo:
   `toolbox/shared/testo/lingue.js`, riga `versione: 'v2'` della voce `it`
   → `'v3'`. Serve perché il browser tiene i dati in una cache a parte per
   nome: con lo stesso nome chi ha già il rimario non vedrebbe mai i nuovi.
   (`VERSION` di `sw.js` non c'entra: i dati non sono nel precache.)
4. Dal prompt, nella cartella `TEMPLE`:
   ```
   node scripts/build-rimario.mjs
   ```
   Ci mette meno di un minuto: legge il dump a flusso, tiene solo l'italiano
   e scrive `toolbox/penna/data/*-v3.*`. Alla fine stampa "accenti esatti".
5. Cancella a mano i vecchi `parole-v2.txt`, `chiavi-v2.json`,
   `tratti-v2.bin`, `manifest-v2.json` in `toolbox/penna/data/`
   (altrimenti vanno online per niente: 3 MB).
6. `node scripts/check.mjs`, poi commit e push come al punto 1.

Lo stesso script accetta `--offline` (usa solo ciò che c'è in `scripts/input/`)
e `--limite N` (numero massimo di forme).

All'avvio Node stampa un avviso `MODULE_TYPELESS_PACKAGE_JSON` ("Reparsing as
ES module"): è innocuo, ignoralo. Non aggiungere un `package.json` nella
cartella del sito per toglierlo: Cloudflare lo userebbe per avviare una build.

### 3b. E le altre lingue?

- **Inglese:** niente da migliorare così. Il pacchetto usa già il dizionario
  di pronuncia CMU (accento e sillabe esatti per ~130.000 parole); il
  Wikizionario non aggiungerebbe nulla.
- **Spagnolo:** non serve. L'accento tonico in spagnolo è deterministico
  dall'ortografia (regole + accento grafico), quindi è già esatto.
- **Francese:** sì, stessa cosa dell'italiano. Scarica
  `https://kaikki.org/frwiktionary/raw-wiktextract-data.jsonl.gz` (dump del
  Wikizionario francese, molto più grande di quello italiano), **rinominalo**
  `fr-raw-wiktextract-data.jsonl.gz`, mettilo in `scripts/input/`, alza
  `versione` della voce `fr` in `lingue.js` (`'v1'` → `'v2'`) e lancia
  `node scripts/build-rimario.mjs --lang fr`. Lo script usa l'IPA del
  Wikizionario per contare le sillabe (e muta compresa), che oggi è stimato
  dalle regole. Scrive `toolbox/penna/data/fr/*-v2.*`: cancella i `-v1`.

## 3c. Attivare la sincronizzazione della Toolbox (una volta, spec 17 e 18)

La Toolbox sincronizza i dati fra PC e telefono con un **codice di sei parole
che vale per tutta la Toolbox**: testi di Penna, piani di uscita, accordature,
storico del DNA e preferenze (spec 18 §4). Il codice si crea e si collega da
**Impostazioni → Sincronizzazione** (`/impostazioni/#imp-sync`); lì c'è anche
un interruttore per ogni tipo di dato. In Penna il foglio ha solo un link a
quella sezione. Chi aveva già attivato il codice in Penna lo ritrova acceso:
si sposta da solo. I dati partono cifrati dal dispositivo e il server (una Pages
Function + un database D1 dello stesso progetto Cloudflare, costo zero) vede
solo un identificatore e blocchi illeggibili. Il codice è già nel repo
(`toolbox/functions/api/quaderno/[[route]].js`) e parte col push; manca solo
il database, che si crea dalla dashboard:

1. Cloudflare → **Storage & Databases → D1 SQL Database → Create database**,
   nome `quaderno`.
2. Nel database, scheda **Console**, incolla ed esegui:
   ```
   CREATE TABLE voci (
     quaderno TEXT NOT NULL, collezione TEXT NOT NULL, doc TEXT NOT NULL,
     aggiornato INTEGER NOT NULL, cancellato INTEGER NOT NULL DEFAULT 0,
     blob TEXT NOT NULL DEFAULT '',
     PRIMARY KEY (quaderno, collezione, doc));
   CREATE TABLE limiti (
     quaderno TEXT PRIMARY KEY, finestra INTEGER NOT NULL, colpi INTEGER NOT NULL);
   ```
   Se avevi già creato `voci` con lo schema vecchio (senza `collezione`):
   prima `DROP TABLE voci;`, poi l'SQL qui sopra.
3. **Workers & Pages → tiny-temple-toolbox → Settings → Bindings → Add → D1
   database**: Variable name `QUADERNO`, database `quaderno`. Salva.
4. **Deployments → Retry deployment** (o un nuovo push): i binding valgono dal
   deploy successivo.
5. Prova: apri `https://toolbox.tinytemplestudio.it/api/quaderno/00000000000000000000000000000000`
   → deve rispondere `{"ora":…,"voci":[]}`. Se risponde 500, il binding non c'è.
6. **Informative Iubenda** (a fine T1, quando ti dico che la sincronizzazione è
   accesa per tutti i dati): in Iubenda, privacy policy, aggiungi una sezione
   personalizzata con questo testo, in italiano e in inglese. Copia-incolla.

   > **Sincronizzazione dei dati della Toolbox (facoltativa).** Se la attivi,
   > i tuoi dati (testi, piani di uscita, analisi, accordature, preferenze)
   > vengono cifrati sul tuo dispositivo con una chiave ricavata dal codice
   > di sei parole, che conosci solo tu, e copiati sui server di Cloudflare
   > Inc. (fornitore di hosting, UE/USA). Di quelle copie conserviamo solo un
   > identificatore casuale, la data dell'ultima modifica e il contenuto
   > cifrato: senza il tuo codice nessuno, noi compresi, può leggerlo. Non
   > usiamo cookie e non registriamo il contenuto. Per cancellare tutto:
   > Impostazioni → Sincronizzazione → Scollega ed elimina dal server; le
   > copie cifrate spariscono subito e i dati restano solo sul tuo
   > dispositivo.

   > **Toolbox data sync (optional).** When you turn it on, your data (lyrics,
   > release plans, analyses, tunings, preferences) is encrypted on your
   > device with a key derived from your six-word code, which only you know,
   > and copied to servers operated by Cloudflare Inc. (hosting provider,
   > EU/USA). Of those copies we keep only a random identifier, the
   > last-modified date and the encrypted content: without your code nobody,
   > including us, can read it. We use no cookies and never record the
   > content. To erase everything: Settings → Sync → Unlink and delete from
   > the server; the encrypted copies are removed
   > immediately and the data stays only on your device.

   Finché gli artisti non la attivano, la Toolbox non fa nessuna richiesta di rete.

Se il database non c'è ancora, la Toolbox funziona lo stesso: chi prova ad
attivare la sincronizzazione vede "Errore del server: riprovo dopo" e
nient'altro.

## 4. Dove stanno le cose

- `docs/toolbox/00-workflow.md` — ruoli, modelli, pipeline, decisioni.
- `docs/toolbox/specs/` — una spec per strumento; è il contratto con gli agenti.
- `docs/toolbox/research/` — le ricerche con fonti.
- `docs/toolbox/contenuti/` — testi da validare con Ponz (tappe del pianificatore).
- `scripts/check.mjs` — controlli deterministici; `scripts/eval-dna/` — banco di prova di DNA
  (`node scripts/eval-dna/run.mjs --limit 60`); `scripts/build-rimario.mjs` — rimario.

## 6. Branch di lavoro, token e limite dei deploy (T0 in poi)

Cloudflare Pages gratuito costruisce al massimo **500 volte al mese**, e i due
progetti (vetrina e Toolbox) leggono lo stesso repo. Per non consumarle:

1. Su Cloudflare, in **entrambi** i progetti Pages: Settings → Builds &
   deployments → **Preview branches → None**. Così si costruisce solo il
   branch di produzione (`main` per la vetrina, `toolbox` per la Toolbox).
2. Gli agenti lavorano sul branch **`dev`**: pushano lì quante volte vogliono,
   Cloudflare non lo vede, GitHub Actions lo prova (gratis, repo pubblico).
   A fine giro `dev` viene unito in `toolbox` (una build sola).
3. Token per far pushare gli agenti: GitHub → foto profilo → Settings →
   Developer settings → Personal access tokens → **Fine-grained tokens →
   Generate new token**: nome `agenti-toolbox`, scadenza 30 giorni, Repository
   access → Only select repositories → `demotemple`, Permissions → Repository
   permissions → **Contents: Read and write** (nient'altro). Genera, copia,
   incolla in chat. Il token resta scritto nella conversazione: se non ti va
   bene, revocalo da quella stessa pagina in qualsiasi momento, e la
   consegna torna a passare dalla cartella come oggi.
4. Il segno verde/rosso accanto a ogni commit su GitHub (scheda Actions) è
   `check.mjs` + i test end-to-end: rosso = non unire.

## 5. Regole per non dover mai mettere il banner dei cookie

- Nessun servizio di terzi caricato dalle pagine (font, script, analytics, embed).
- Solo storage tecnico sul nostro origin (localStorage, IndexedDB, Cache
  Storage) per far funzionare ciò che l'utente ha chiesto: preferenze,
  documenti, storico, pacchetti scaricati. Niente identificatori, niente
  profilazione, niente invio a nessuno.
- Ogni chiamata a un servizio esterno (se un giorno ne entra una, es. testi
  da LRCLIB) parte solo da un'azione esplicita e va citata nelle informative:
  non è un cookie, ma è un trasferimento di dati.
- I pacchetti lingua del rimario si scaricano dal nostro sito e restano nella
  cache del browser: nessuna richiesta finché l'utente non preme "Scarica".
