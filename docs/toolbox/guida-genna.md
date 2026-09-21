# Guida rapida per Genna

Le cose da fare a mano, sempre uguali. Aggiornata al 20 settembre 2026.

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

## 4. Dove stanno le cose

- `docs/toolbox/00-workflow.md` — ruoli, modelli, pipeline, decisioni.
- `docs/toolbox/specs/` — una spec per strumento; è il contratto con gli agenti.
- `docs/toolbox/research/` — le ricerche con fonti.
- `docs/toolbox/contenuti/` — testi da validare con Ponz (tappe del pianificatore).
- `scripts/check.mjs` — controlli deterministici; `scripts/eval-dna/` — banco di prova di DNA
  (`node scripts/eval-dna/run.mjs --limit 60`); `scripts/build-rimario.mjs` — rimario.

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
