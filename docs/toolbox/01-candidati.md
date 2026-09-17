# Toolbox — candidati e verdetti

Sintesi delle due ricerche del 16 settembre 2026 (`research/`), filtrata dai
vincoli del progetto: costo zero, tutto nel browser, niente tracciamento,
niente build step, deve funzionare su iPhone. Le tre idee di partenza sono
valutate per prime, perché la ricerca cambia il loro perimetro.

## 1. Le tre idee di partenza

### DNA — analisi di una traccia
| Parte | Verdetto | Perché |
|---|---|---|
| BPM da file | **Fattibile** | `realtime-bpm-analyzer` (MIT, ~40 KB, AudioWorklet, mantenuta) o `web-audio-beat-detector`. Preciso su musica con beat marcato, meno su acustico. |
| Tonalità da file | **Fattibile con lavoro custom** | Nessuna libreria pronta e mantenuta (essentia.js è AGPL e ferma dal 2022). Si fa a mano: chroma via Web Audio + profili Krumhansl-Schmuckler in un Worker. Buona su brani tonali, incerta su rap/trap con poca armonia. |
| BPM/tonalità dal microfono | **Fattibile come "stima"** | Rumore, riverbero e altoparlante abbassano l'accuratezza: va presentato come indicativo, con la modalità file come quella "seria". |
| Loudness (LUFS / true peak) da file | **Fattibile** | `needles` (MIT, BS.1770-4) o K-weighting a mano. Raro trovarlo senza upload: valore alto. Naturale dentro DNA. |
| Riconoscere un brano noto (titolo) | **Non fattibile a costo zero** | AcoustID richiede una chiave applicativa (solo uso non commerciale), il fingerprint Chromaprint non regge clip da microfono, nessun port WASM mantenuto; AudD/ACRCloud/Shazam vogliono una chiave segreta che nel browser sarebbe pubblica e bruciata in un giorno. |
| Testo del brano | **Fattibile se l'utente scrive titolo e artista** | LRCLIB: gratuita, senza chiave, pensata per client browser (CORS). Chiamata solo su azione esplicita → impatto informative. |
| Accordi del brano | **Non fattibile legalmente** | Nessuna API gratuita: Ultimate Guitar/Chordify vietano lo scraping, Songsterr ha solo endpoint non ufficiali. |
| Crediti | **Fattibile con riserva** | MusicBrainz è gratuita ma vuole 1 req/s e uno User-Agent che il browser non lascia impostare; da valutare solo se DNA diventa "cerca per titolo". |

**Proposta:** DNA = *carica un file (o ascolta dal microfono) → BPM, tonalità,
codice Camelot, loudness, durata, sample rate*. Tutto sul dispositivo.
Il riconoscimento di brani noti esce dal perimetro; "cerca il testo" può
essere uno strumento a sé (vedi §2, "Testi").

### Sentinel — "è fatto da un'IA?"
**Verdetto: non fattibile con affidabilità decente, oggi.** I modelli
pubblicati (Deezer ISMIR 2025, SONICS ICLR 2025) riconoscono bene solo i
generatori visti in training: su un generatore nuovo scendono al 6-24 % di
rilevamento, e un semplice ricampionamento a 22 kHz inganna anche i sistemi
commerciali. Nessun checkpoint pronto per il browser; i pesi Deezer sono
CC BY-NC. Un indicatore "sperimentale" darebbe verdetti sbagliati a persone
che potrebbero prenderli sul serio (accuse a un artista, scelte di
pubblicazione). **Consiglio: rimandare**, tenere il nome per quando esisterà
un modello aperto affidabile, e magari trasformare l'idea in una pagina
informativa ("cosa si sa oggi sul riconoscimento della musica IA").

### Accordatore
**Fattibile.** `pitchy` (MIT, ~28 KB, ESM, algoritmo MPM) su AudioWorklet con
fallback a ScriptProcessor per i bug iOS noti. Due modalità come previsto:
con microfono (feedback in cent) e senza (toni di riferimento con
OscillatorNode). Set iniziale: chitarra standard + drop D, basso 4/5 corde,
ukulele, cromatico. Da provare davvero su iPhone in modalità standalone.

## 2. Altri candidati, per famiglia

Valore = quanto aggiunge rispetto a ciò che esiste gratis (fonti in `research/`).
Sforzo = stima relativa (S/M/L). ★ = proposto per la prima ondata.

### A. Dal vivo (microfono / Web Audio)
| | Strumento | Valore | Sforzo | Note |
|---|---|---|---|---|
| ★ | **Metronomo** con tap tempo, accenti, suddivisioni | alto | S | Scheduler lookahead Web Audio, zero librerie. Le alternative online sono piene di banner. |
| | Registratore di idee (MediaRecorder + IndexedDB, tag BPM/tonalità) | medio | M | Su iPhone i Memo vocali sono già ottimi; ha senso solo se integrato con DNA (tag automatici). Formato iOS: audio/mp4. |
| | Vocal range finder | medio | S (dopo l'accordatore) | Riusa la pitch detection dell'accordatore: nota più bassa e più alta cantate. |
| | Riscaldamento vocale guidato | medio-alto | M | Sequenze con toni generati + timer. Richiede contenuto (esercizi) validato da chi canta. |

### B. Analisi di file audio
| | Strumento | Valore | Sforzo | Note |
|---|---|---|---|---|
| ★ | **DNA** (BPM, tonalità, Camelot, LUFS, true peak, durata) | alto | L | Vedi §1. Il "tutto sul dispositivo" è il vantaggio più citato nelle fonti: oggi la gente carica inediti su siti terzi per sapere il BPM. |
| | Analizzatore di spettro | basso-medio | S | AnalyserNode nativo; carino dentro DNA, poco valore da solo. |
| | Separazione stem / vocal remover | alto ma | L+ | Modelli Demucs ONNX da centinaia di MB e diversi GB di RAM: Safari iOS uccide la pagina. Non in questa fase. |
| | Riconoscimento accordi da audio | alto ma | L+ | Serve un modello ML; rimandare. |

### C. Scrittura (testi)
| | Strumento | Valore | Sforzo | Note |
|---|---|---|---|---|
| ★ | **Rimario italiano** offline (rime, assonanze, per sillabe) | **alto** | M | Gap reale: in italiano non c'è nulla di serio, il target è italiano. Dataset liberi da verificare (paroleitaliane, Super-Rimario-Italiano); si può costruire un indice fonetico compatto. |
| ★ | **Blocco testi** con conteggio sillabe per verso, rime evidenziate, salvataggio locale | **alto** | M | Uso quotidiano per rapper e cantautori; naturale accoppiarlo al rimario in un unico strumento ("Penna"). Dati in IndexedDB, export testo/condivisione. |
| | Testi (LRCLIB per titolo + artista) | medio | S | Unica chiamata esterna della Toolbox; solo su azione esplicita; da citare nelle informative. |

### D. Calcolatori e riferimenti
| | Strumento | Valore | Sforzo | Note |
|---|---|---|---|---|
| ★ | **Calcolatore tempo** (BPM ↔ ms per delay, pre-delay, reverb, LFO, sidechain; note ↔ Hz) | medio-alto | S | Categoria validata da 8+ concorrenti, tutti con pubblicità. Un solo strumento, più schede. |
| | Circolo delle quinte + ruota Camelot interattivi | basso-medio | S | Già ben coperto altrove; utile come pannello dentro DNA (tonalità compatibili). |
| | Chord finder con diagrammi (svguitar, MIT) + trasposizione/capotasto | medio | M | Utile ai cantautori; da valutare in seconda ondata. |
| | Ear training | medio | M | Mercato pieno di freemium; valore solo se senza account e paywall. |

### E. Percorso di lancio (il servizio principale dello studio)
| | Strumento | Valore | Sforzo | Note |
|---|---|---|---|---|
| ★ | **Pianificatore di uscita**: scegli la data, ottieni la timeline a ritroso (distribuzione, pre-save, artwork, pitching, annunci) con spunte salvate in locale | **alto** | M | Molto richiesto; i concorrenti gratuiti spingono servizi a pagamento. Coerente con "artist development". Contenuto da validare con Ponz. |
| ★ | **Split sheet** compilabile → PDF pulito, in italiano | medio-alto | M | Generazione PDF in browser (jsPDF, MIT, ~300 KB vendorizzato, oppure stampa via CSS `@media print`, zero librerie). |
| ★ | **Checklist consegna mix/master + naming degli stem** | medio-alto | S | Nessuno strumento interattivo trovato, solo articoli. Contenuto tecnico che lo studio conosce meglio di chiunque: è anche marketing implicito dei servizi. |
| | SIAE vs Soundreef: guida interattiva | alto | M | Gap reale e italiano, ma è contenuto legale/economico che cambia: va scritto e mantenuto da una persona (Ponz), non da un agente. |
| | ISRC/UPC: spiegazione + validatore di formato | basso-medio | S | Educativo; i codici veri li dà il distributore. |
| | Calcolatore royalty streaming | basso-medio | S | Stime che invecchiano in fretta; rischio di dare numeri sbagliati. |
| | Budget di una release | medio | S | Semplice tabella con totali, salvata in locale. |
| | EPK builder (esporta pagina/PDF) | medio-alto | L | Senza account e senza hosting è raro; ma è un progetto a sé. Seconda ondata. |
| | Bozza accordo featuring/collaborazione | medio | M | Testo legale: serve revisione umana. |

### F. Aggiunto il 17 settembre (proposta di Genna)
| | Strumento | Valore | Sforzo | Note |
|---|---|---|---|---|
| ★ | **Trasposizione** (cambio tonalità di una base senza cambiare il tempo, ± semitoni; anche variazione di tempo senza cambiare la tonalità) | alto | M | Pitch shifting in un Worker su AudioBuffer decodificato, esportazione WAV/MP3. Libreria candidata: SoundTouch JS (LGPL, WSOLA) o phase vocoder proprio; qualità buona entro ±3-4 semitoni su un mix intero, artefatti oltre. Si accoppia con DNA (tonalità rilevata → scegli quella di arrivo). Da collocare dopo DNA nella prima ondata. |

## 3. Proposta per la prima ondata (da confermare con Genna)

Otto strumenti, ordinati per "impari qualcosa che serve al successivo":

1. **Metronomo** — piccolo, stabilisce lo scheletro (pagina, i18n, SW della Toolbox, Web Audio su iOS).
2. **Accordatore** — apre il microfono: consenso, Permissions-Policy, AudioWorklet + fallback, prova su iPhone.
3. **Calcolatore tempo** — zero rischio, riempie subito la Toolbox.
4. **DNA** — riusa mic e Worker; BPM + tonalità + loudness.
5. **Penna** (rimario + blocco testi) — il gap italiano; IndexedDB.
6. **Pianificatore di uscita** — primo strumento "artist development".
7. **Checklist consegna + naming stem** — contenuto dello studio.
8. **Split sheet → PDF**.
9. **Trasposizione** — riusa decodifica e Worker di DNA; chiude la prima ondata.

Rimandati con motivo: Sentinel (affidabilità), riconoscimento brani (costo/legalità), stem separation e riconoscimento accordi (peso), SIAE/Soundreef e contratti (contenuto umano), EPK (progetto a sé).

## 4. Decisioni di architettura da prendere prima del primo strumento

1. **Dove vive la Toolbox.** Due PWA sullo stesso dominio (`/` e `/toolbox/`) sono sconsigliate da web.dev: storage condiviso, disinstallazione che cancella i dati dell'altra, prompt di installazione inaffidabile. Alternativa a costo zero: **sottodominio `toolbox.tinytemplestudio.it`** = secondo progetto Cloudflare Pages dallo stesso repo con root directory `toolbox/` (DNS già su Cloudflare). Origin separato: manifest, service worker, storage e soprattutto `_headers` propri (microfono aperto e `'wasm-unsafe-eval'` solo lì; la vetrina resta com'è). Da confermare.
2. **Un solo permesso microfono** gestito da un modulo comune (pattern di `consent.js`), condiviso da accordatore, DNA, range vocale.
3. **Un solo modulo audio comune** (creazione/ripresa di AudioContext nel gesto utente, sample rate letto a runtime, stop delle tracce) riusato da tutti.
4. **Precache separato** e leggero: la vetrina non paga gli strumenti.
5. **Informative Iubenda**: da aggiornare solo se entra LRCLIB (o altre chiamate esterne); il resto è a impatto zero.
6. **Contenuti umani**: pianificatore, checklist e split sheet hanno testi che devono passare da Ponz prima di andare online.
