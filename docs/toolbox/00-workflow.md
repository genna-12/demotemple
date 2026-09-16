# Toolbox — workflow agentico e assegnazione dei modelli

Aggiornato al 16 settembre 2026. Vale per tutto lo sviluppo della Toolbox.
Principio guida: **i token sono la risorsa più scarsa**. Ogni ruolo usa il
modello più economico che regge quel compito senza far pagare l'errore dopo.

## 1. Ruoli

| Ruolo | Modello | Perché | Volume tipico |
|---|---|---|---|
| **Orchestratore** (la chat principale) | Fable | Decide, assegna, sintetizza per Genna. Non legge mai file interi: riceve report. | basso |
| `scout` | Haiku | Trova dove stanno le cose (grep, elenchi, righe esatte). Compito meccanico, zero giudizio. | medio |
| `researcher` | Sonnet | Ricerca web e sintesi: legge molto, ragiona il giusto. | alto |
| `architect` | Opus | Scrive la specifica di uno strumento: un errore qui costa 10× dopo. Poche righe, alto valore. | basso |
| `implementer` | Opus | Codice "duro": DSP/Web Audio, Worker/WASM, service worker, `_headers`, CSP. Errori difficili da vedere in review. | medio |
| `builder` | Sonnet | Codice "guidato": markup della pagina, CSS sul design system esistente, chiavi di traduzione, modifiche ripetitive da spec chiara. | medio |
| `validator` | Opus | Revisione del diff contro spec + vincoli; produce PASS/FAIL con elenco puntuale. Non corregge. | basso |
| `ui-ux` | Opus | Una passata per strumento: coerenza con il design system, mobile, iOS, accessibilità, microcopy IT/EN. | basso |
| `scripts/check.mjs` | nessuno | Verifiche deterministiche a costo zero: fine riga, chiavi di traduzione, `VERSION`, `_headers`, precache. | — |

Regola di scelta: **Opus dove l'errore si scopre tardi** (architettura, DSP,
sicurezza, review), **Sonnet dove l'errore si vede subito** (markup, CSS,
testi, ricerca), **Haiku dove non c'è giudizio** (cercare, elencare),
**script dove non serve un modello**.

## 2. Pipeline per ogni strumento

```
brief (Genna + orchestratore, 5 righe)
  → scout      : mappa dei file coinvolti (percorsi + righe)
  → architect  : docs/toolbox/specs/<strumento>.md
  → CHECKPOINT Genna approva la spec
  → implementer (core) ‖ builder (pagina, CSS, i18n)   [in parallelo se separabili]
  → node scripts/check.mjs
  → validator  : PASS o FAIL + findings
  → (FAIL) implementer/builder ricevono SOLO i findings, max 2 giri
  → ui-ux      : una passata, findings → builder
  → orchestratore: riassunto a Genna, prova su dispositivo (iPhone incluso), merge
```

Un solo strumento in lavorazione alla volta nel ramo principale; strumenti
indipendenti possono avere spec in parallelo.

## 3. Regole anti-spreco

- **Il contesto viaggia nei file, non nella chat.** Ogni agente riceve: `CLAUDE.md` (automatico), il percorso della spec, la mappa di `scout`. Mai la cronologia della conversazione.
- **Report ≤ 250 parole**, sezioni fisse Fatto / File toccati / Dubbi / Prossimo. Niente codice nei report.
- **Niente doppio lavoro:** un file riassunto nella consegna non si rilegge; una verifica fatta da `check.mjs` non si rifà a mano.
- **Perimetro stretto:** ogni consegna elenca i file che si possono toccare. Fuori perimetro = fermarsi e dirlo.
- **Massimo 2 giri di correzione** per strumento prima di tornare a Genna: se un fix non converge, il problema è nella spec, non nel codice.
- **Screenshot solo se richiesti:** costano molto; `ui-ux` lavora sul markup e sul CSS, gli screenshot li fa Genna sul dispositivo vero.
- **Prima la spec, poi il codice.** Nessun agente scrive codice senza una spec approvata.

## 4. Ambiente di lavoro

- Il repo è pubblico: gli agenti lavorano su un **clone nel container** (`git clone https://github.com/genna-12/demotemple.git`), su un branch `toolbox`. I file modificati vengono poi consegnati nella cartella locale di Genna (che fa commit e push dopo `git status`) oppure, se Genna fornisce un token GitHub a permessi minimi, pushati direttamente sul branch: Cloudflare Pages genera un'anteprima per branch, gratuita, provabile da iPhone.
- Struttura prevista della Toolbox (da confermare nella spec di architettura):
  ```
  toolbox/               pagina indice + uno strumento per sottocartella
  toolbox/vendor/        librerie vendorizzate (ESM/WASM), con LICENSE accanto
  toolbox/manifest.webmanifest, toolbox/sw.js   (app separata dalla vetrina)
  docs/toolbox/          workflow, candidati, specs/, decisioni
  scripts/check.mjs      verifiche deterministiche
  .claude/agents/        definizioni dei ruoli
  ```
- Tutti i file nuovi sono LF. I file esistenti mantengono il loro fine riga.

## 5. Decisioni prese (16 settembre 2026, Genna)

- Nessun build step: ES modules nativi, librerie vendorizzate.
- Definizioni degli agenti versionate in `.claude/agents/`.
- Servizi terzi ammessi solo su azione esplicita dell'utente (pattern consenso), con aggiornamento informative.
- **Prima ondata, in ordine:** Metronomo → Accordatore → Calcolatore tempo → DNA → Penna (rimario + blocco testi) → Pianificatore di uscita → Checklist consegna/naming stem → Split sheet PDF.
- **La Toolbox vive su `toolbox.tinytemplestudio.it`**: secondo progetto Cloudflare Pages dallo stesso repo, root directory `toolbox/`, origin separato con manifest, SW, storage e `_headers` propri. La vetrina non cambia.
- **DNA** = analisi locale (BPM, tonalità, Camelot, loudness) da file o microfono. Niente riconoscimento di brani noti. **Sentinel rimandato** (nessun modello affidabile).
- **Consegna:** gli agenti lavorano su un clone nel container; i file arrivano nella cartella TEMPLE di Genna, che fa commit e push dopo `git status`.

## 6. Stato

- [x] Workflow e ruoli definiti (questo documento)
- [x] Ricerca bisogni + fattibilità → `research/`, sintesi in `01-candidati.md`
- [x] `scripts/check.mjs` scritto e verificato sul repo (passa)
- [x] Selezione degli strumenti con Genna (vedi §5)
- [ ] Spec di architettura della Toolbox → `specs/00-architettura.md` (in corso)
- [ ] Strumenti, uno alla volta
