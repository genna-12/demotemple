# Toolbox — roadmap da «demo» ad app completa

21 settembre 2026. Base: ricerca casi d'uso e audit UX del 21/09, spec 18 (piattaforma).
Ogni tappa si chiude con una validazione automatica: nessuna tappa «finita» senza verde.
Un **giro** = scout → architect (se serve una spec) → implementer ‖ builder → `check.mjs` →
validator → ui-ux. Nota dell'orchestratore: la Toolbox è **già online** su
`toolbox.tinytemplestudio.it` (il progetto Pages pubblica dal branch `toolbox`); il merge su
`main` serve solo a unire vetrina e Toolbox nello stesso deploy. I bloccanti di T0 sono quindi
già davanti agli utenti: T0 parte subito.

## Correzioni all'ordine proposto

L'ordine T0…T4 regge. Quattro correzioni, con le ragioni:

1. **Dentro T0, prima i test, poi le correzioni.** Si scrivono per primi gli e2e che
   *falliscono* sui quattro bloccanti. Un'imbracatura scritta dopo nasce già verde e non
   dimostra niente; scritta prima, ogni correzione ha la sua prova.
2. **Il merge su `main` resta a T4** (decisione di Genna, 21/09): la vetrina non deve linkare
   la Toolbox finché non è finita. La Toolbox è già pubblicata dal branch `toolbox` sul
   sottodominio, raggiungibile solo da chi ha il link: ogni tappa si prova lì, da iPhone, lo
   stesso giorno. La sezione sincronizzazione resta nascosta finché le informative non sono
   pubblicate (fine T1).
3. **Dentro T2, il Pianificatore prima della Penna.** Genna ha chiesto per nome il calendario
   delle uscite; la Penna in T1 riceve già il pezzo che le mancava davvero (la sincronizzazione)
   e quel che resta è piccolo; il Pianificatore è lo strumento col punteggio più alto
   dell'audit, quindi costa meno portarlo a «completo».
4. **Il Calcolatore non merita una tappa.** La ricerca non gli trova lacune A: le sue
   correzioni (bersagli, celle copiabili, eyebrow sulle schede) stanno in T0/T1 e in mezzo giro
   dentro T3. Una tappa in meno.

---

## T0 — Bloccanti e verifica automatica · 2 giri

**Obiettivo:** che nei primi dieci secondi su un telefono non succeda niente di sbagliato, e
che da qui in poi lo dimostri una macchina.

**Cosa entra:** `scripts/e2e/` con Playwright e `.github/workflows/verifica.yml` (spec 18 §8);
i 13 punti della spec 18 §7 (intro che mangia i tocchi, Modifica senza uscita, trascinamento
mai azzerato, rotella BPM al dito, errore DNA che svuota la pagina, «fra 1 giorni», bersagli a
44 px, `#acc-instrument`, sottotitolo della dashboard, «×» sul toast, `Referrer-Policy`).
**Branch di lavoro `dev`** per gli agenti (Cloudflare non lo costruisce: guida §6), merge su
`toolbox` a fine giro.

**Come si valida:** ogni punto ha un e2e che fallisce prima e passa dopo; `check.mjs` verde;
`verifica.yml` verde sul push e rosso su una regressione introdotta apposta; punteggio
euristico di dashboard e metronomo da 2 a ≥ 4 in una ripetizione dell'audit.

**Genna:** commit e push (o, col token, solo la prova); su Cloudflare disattivare i deploy di
anteprima nei due progetti Pages (guida §6); provare l'app su iPhone dopo il deploy.

## T1 — Piattaforma · 4 giri

**Obiettivo:** un solo archivio, una sola sincronizzazione, una sola pagina impostazioni, un
aiuto uguale ovunque (spec 18).

**Cosa entra, in quest'ordine:** `shared/archivio.js` con migrazioni (giro 1) → `/impostazioni/`
senza la sezione sincronizzazione (giro 2) → `shared/sync.js` + Pages Function e D1 col nuovo
schema, che riempie quella sezione (giro 3) → `shared/aiuto.js`, i sei `aiuto.js`, `.tb-hint`,
`.tb-tip` (giro 4).

**Come si valida:** criteri 1-6 della spec 18 §10; e2e di migrazione su profili finti
(Penna con lapidi, DNA, piani, accordature), di sincronizzazione fra due contesti con lo stub,
di esporta→cancella tutto→importa; nessuna richiesta a `/api/` senza codice attivo.

**Genna:** creare il database D1 con l'SQL della spec 18 §4 e il binding `QUADERNO`;
pubblicare il testo Iubenda esteso; poi la sezione sincronizzazione si scopre.

## T2 — Gli strumenti esistenti portati a «completo» · 4,5 giri

**Obiettivo:** chiudere tutte le lacune **A** della ricerca casi d'uso, più le **B** che costano
poco una volta che la piattaforma c'è. Principio (Genna, 22/09): gli strumenti devono servire a
qualunque artista, non solo a chi lavora con Tiny Temple.

| ordine | strumento | cosa entra | giri |
|---|---|---|---|
| 1 | Penna | **fatto 25/09 (spec 19)** — rime piene/assonanze vuote per famiglia, [Strofa], Prova, Annulla, Duplica, filtri ricordati, esporta tutto; resta la prova su iPhone | 1 |
| 2 | DNA | **fatto 25/09 (spec 20)** — riapertura, Recenti con ricerca, chip Camelot, confronto, esporta `.csv`, condividi, glossario; restano la prova su iPhone e la prova su brani veri (nel repo solo audio sintetico: servono file da Genna) | 1 |
| 3 | Accordatore | **fatto 25/09 (spec 21)** — accordature con nome già nell'archivio da T1; ultima corda ricordata, microcopy, e2e a due contesti | 0,75 |
| 4 | Metronomo | **fatto 25/09 (spec 21)** — preset nominati sincronizzati, battuta d'attacco, «Avanti» in scaletta | 0,75 |
| 5 | Pianificatore | **fatto 25/09 (spec 22)** — bozza che sopravvive, badge scadenze per piano nella lista, Veloce/Completa spiegati; calendario mensile lasciato fuori | 0,5 |
| 6 | Calcolatore | **fatto 25/09 (spec 22)** — icona di copia in ogni cella (l'intro per scheda c'era già) | 0,5 |

**Come si valida:** per ogni strumento un e2e che crea il dato, ricarica, lo ritrova, lo
sincronizza su un secondo contesto e lo elimina su entrambi; «Come funziona» in IT ed EN;
audit ripetuto con punteggio ≥ 4 su ogni pagina.

**Genna:** commit e push; una prova su iPhone per strumento.

## T3 — Trasposizione · 1,5 giri (solo se la qualità regge)

**Decisione (Genna, 22/09):** Checklist consegna e Split sheet **non si fanno**: erano tagliati
sul flusso di lavoro di Tiny Temple e gli strumenti devono servire a tutti. Resta la
Trasposizione (cambio tonalità di una base), utile a chiunque: **prima una spec dedicata**
(oggi è una riga in `01-candidati` §F), poi mezzo giro di implementazione con avviso di
qualità oltre ±4 semitoni e tonalità di partenza presa da DNA; **go/no-go sulla qualità
percepita** prima di pubblicarla: se la resa non è da app seria, non entra.

**Come si valida:** trasposizione di ±2 semitoni su un file di prova senza artefatti udibili
nel banco `scripts/eval-dna/`; stessi criteri di T2.

## T4 — Lancio · 1 giro

**Obiettivo:** annunciarla.

**Cosa entra:** informative Iubenda finali, sezione «Scarica l'app» sulla vetrina, `sitemap` e
manifest rivisti, un'ultima passata `ui-ux` su tutte le pagine, prova completa su iPhone
(`guida-genna.md` §2), nota di versione.

**Come si valida:** `verifica.yml` verde, audit ripetuto con media ≥ 4,3, installazione da
Safari e da Chrome, offline dopo la prima visita, nessuna violazione CSP.

**Genna:** Iubenda, custom domain già attivo, un giro completo su iPhone, l'annuncio.

---

## Decisioni che servono da Genna

1. **Creare subito lo schema D1 nuovo** (spec 18 §4) invece della tabella `voci` della 17.
   *Raccomandazione: sì* — costa una riga di SQL oggi e zero migrazioni dopo.
2. ~~Merge su `main` a fine T0~~ → **deciso: a T4** (la vetrina non linka la Toolbox prima).
3. **Un solo codice per tutta la Toolbox**, non uno per strumento. *Raccomandazione: sì* — sei
   codici da scrivere su un foglietto sono sei modi di perderli.
4. **Testo Iubenda esteso** da «i tuoi testi» a «i dati della Toolbox», pubblicato a fine T1.
   *Raccomandazione: sì*, riusando il testo della 17 §4 con quella sola sostituzione.
5. **GitHub Actions attivo sul repo** e **token a permessi minimi** per gli agenti → **deciso:
   sì a entrambi** (21/09), con il branch `dev` escluso dai deploy Cloudflare per non consumare
   le 500 build mensili del piano gratuito (guida §6).
6. ~~Mezz'ora con Ponz~~ → **non serve più**: Checklist e Split sheet sono fuori (22/09).

## Cosa NON faremo

Account, login, email, recupero del codice perduto. Condivisione di un quaderno fra persone
diverse. Fusione automatica dei testi (CRDT) e cronologia delle versioni. Sincronizzazione di
file audio. Riconoscimento di brani noti, energy/danceability, pareri artistici. Notifiche
push (il Pianificatore esporta `.ics` e basta). Libreria di accordi e diagrammi. Checklist
consegna e Split sheet (tagliati sul flusso di uno studio, non utili a tutti). App nativa o store. Analytics, cookie,
servizi di terzi. Build step, framework, backend proprio, qualunque cosa che si paghi a
consumo. Sentinel, già rimandato. Polyritmi e vibrazione nel metronomo, preset per plugin nel
calcolatore: nicchie che invecchiano.
