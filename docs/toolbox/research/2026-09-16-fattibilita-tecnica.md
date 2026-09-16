# Ricerca: fattibilità tecnica in-browser a costo zero (16 settembre 2026)

**1. BPM/KEY detection — Fattibile con riserva**

- **realtime-bpm-analyzer** (npm, attivo, ultimo rilascio 2024-2025, MIT) — usa AudioWorklet, funziona sia su file che su stream microfono in realtime, ESM puro, ~30-50KB, nessun WASM. Consigliato per BPM. Precisione buona su musica con beat marcato (kick regolare), peggiora su musica acustica/senza percussioni o su registrazioni da microfono con rumore ambientale/riverbero.
- **web-audio-beat-detector** (chrisguttandin, MIT, mantenuto attivamente) — alternativa/companion allo stesso autore, solo file/buffer, non streaming mic.
- **essentia.js** (MTG/UPF) — libreria più completa (BPM, key/scale via HPCP+chroma, tonal analysis), WASM+JS, ESM disponibile via jsDelivr, licenza AGPL-3.0 (attenzione: copyleft forte, va verificato se compatibile con un sito no-server ma comunque va citata/rispettata), MA **non mantenuta**: ultimo rilascio v0.1.3 è di giugno 2022, 46 issue aperte. Rischio concreto di bug irrisolti e incompatibilità con Safari/iOS moderni non testate dagli autori.
- **aubiojs** (qiuxiang, porting emscripten di aubio) — offre pitch/tempo/onset, ma repo fermo da anni, pacchetto piccolo, nessuna garanzia di manutenzione.
- **Meyda** (github.com/meyda/meyda, MIT, mantenuta) — estrae chroma/MFCC ma non fa key detection diretta: va scritto a mano un classificatore chroma→Krumhansl-Schmuckler, fattibile ma è lavoro custom, non "pronto all'uso".
- Key detection da **microfono** in tempo reale è la parte più fragile: rumore di fondo, riverbero della stanza e distorsione dell'altoparlante abbassano parecchio l'accuratezza rispetto a un file audio pulito; realistico solo come stima approssimativa, non come strumento "professionale".

**2. Riconoscimento brani (Shazam-like) — Non fattibile a costo zero**

- **AcoustID**: serve una API key applicativa; la chiave "demo" per i test scade dopo pochi giorni, per uso reale serve registrare un'app (gratis solo per uso non commerciale) e rispettare 3 req/s max. Nessuna menzione di CORS nella documentazione ufficiale: va verificato ma è comune che le chiamate dal browser funzionino solo se il servizio risponde con header CORS, cosa non garantita per endpoint pensati per client desktop. Il fingerprint Chromaprint è progettato per matchare tracce intere pulite, non clip corte registrate da microfono con rumore/altoparlante: la percentuale di match utile da un mic di iPhone sarebbe bassa.
- **Chromaprint in WASM/JS**: non esiste un port maintained pronto. `bjjb/chromaprint.js` è un porting JS puro (LGPL-3.0, coerente con l'originale), ma manutenzione incerta (repo piccolo, poche stelle, nessuna data di ultimo commit verificabile) — rischio di doverlo debuggare/aggiornare da soli.
- **MusicBrainz WS/2**: rate limit raccomandato ~1 req/s per IP, User-Agent obbligatorio nell'header (impossibile da impostare in modo affidabile da `fetch()` nel browser: molti browser bloccano/normalizzano l'header User-Agent lato client, quindi rischio di violare i ToS senza saperlo). CORS risulta abilitato (ticket storico MBS-2979) ma va testato in produzione.
- **Cover Art Archive**: immagini servite via archive.org, generalmente accessibili cross-origin per il consumo diretto (img/fetch), non richiede chiave.
- **LRCLIB**: gratuito, open, pensato esplicitamente per l'uso client-side, nessuna chiave richiesta — buona scelta per i testi.
- **Accordi**: nessuna API gratuita legittima esiste. Songsterr ha solo endpoint non documentati/non ufficiali (uso a rischio, possono romperli in qualsiasi momento); Ultimate Guitar e Chordify non espongono API pubbliche (solo scraping non autorizzato, violazione ToS). Va comunicata onestamente l'assenza di soluzione gratuita legale.
- **Alternative a pagamento (AudD, ACRCloud, Shazam via RapidAPI)**: tutte richiedono una API key segreta lato server per autenticare le richieste; chiamandole direttamente dal browser la chiave sarebbe visibile nel JS e chiunque potrebbe abusarne fino ad esaurire la quota gratuita (poche centinaia di riconoscimenti/mese in genere) — incompatibile con l'architettura "nessun server, nessuna chiave segreta".

**3. Rilevamento musica IA (Suno/Udio) — Non fattibile nel browser con affidabilità decente**

Verdetto netto: **no**. La ricerca 2025 (Deezer, "The AI Music Arms Race", TISMIR/ISMIR 2025; SONICS/SpecTTTra, ICLR 2025; FakeMusicCaps) mostra che i classificatori attuali funzionano bene solo *in-distribution* (stesso generatore visto in training) ma generalizzano male: nel paper Deezer, un classificatore addestrato su Suno→testato su Udio scende a F1 0.629, e su una piattaforma mai vista (Boomy) rileva solo il 6-24% delle tracce IA. Bastano trasformazioni banali come il resampling a 22kHz per ingannare il sistema commerciale di riferimento (IRCAM Amplify). Nessun checkpoint pubblico pronto per l'inferenza browser: il codice Deezer (github.com/deezer/ismir25-ai-music-detector) è ricerca CC BY-NC-4.0 (non commerciale, non pesi di produzione), SONICS pubblica codice/dataset ma non un modello leggero pronto per ONNX Runtime Web/transformers.js. Non esistono API gratuite senza chiave affidabili. Anche se si trovasse un modello esportabile, l'affidabilità dichiarata dagli stessi autori è insufficiente per un tool "serio" mostrato agli utenti — meglio non implementarlo o presentarlo chiaramente come "indicativo/sperimentale" con forte disclaimer.

**4. Accordatore — Fattibile con riserva**

- **pitchy** (github.com/ianprime0509/pitchy, npm, v4.x, MIT, ~28KB, puro ESM nativo, nessun bundler richiesto, importabile via jsDelivr/esm.sh) — implementa McLeod Pitch Method, leggero, consigliato.
- **AudioWorklet su iOS Safari**: supportato dalla 14.5 in poi, ma con bug intermittenti documentati anche di recente (thread WebKit/Apple su "audioWorklet is not working in iOS 16.2" e "AudioWorklet not playing on iOS 18.01"). Consiglio: feature-detect e fallback su ScriptProcessorNode (deprecato ma ancora funzionante ovunque) per robustezza.
- **getUserMedia in PWA standalone iOS**: storicamente rotto, **risolto da iOS 13.4** (WebKit bug 185448, chiuso come fixed) — funziona in Safari e in app aggiunte alla home, non in WebView di browser terzi (Chrome/Firefox iOS usano WebKit sotto ma con vincoli simili). **Attenzione**: regressione recente riscontrata in iOS 26.1 beta1 (microfono rotto, errore "No AVAudioSessionCaptureDevice device"), corretta in beta2 — segnale che il microfono su iOS resta un'area fragile che si rompe periodicamente tra versioni beta.
- **AudioContext su iOS**: richiede sblocco con gesto utente (resume() dentro un handler click/touchend) per policy autoplay; sample rate hardware forzato (tipicamente 48kHz sui device recenti, ma non garantito su tutti — va letto `audioContext.sampleRate` a runtime, mai assunto fisso). OscillatorNode per toni di riferimento funziona senza problemi dopo lo sblocco.
- **Non verificabile senza iPhone reale**: comportamento esatto di AudioWorklet + getUserMedia insieme in standalone su iOS 17/18/26 stabile (le beta suggeriscono variabilità), latenza percepita reale, e se il microfono resta attivo quando l'app va in background/schermo si spegne.

**5. Altri tool audio — misto**

- **LUFS/true-peak**: `needles` (@domchristie/needles, MIT, conforme BS.1770-4/EBU R128) o implementazione manuale con BiquadFilterNode (K-weighting) + AnalyserNode — **fattibile**, libreria piccola, vendorizzabile.
- **Spectrum analyzer**: nativo con `AnalyserNode`, **fattibile**, zero dipendenze.
- **Stem separation (Demucs)**: esistono solo port comunitari non ufficiali in ONNX (es. `timcsy/demucs-web`, modelli HT-Demucs su Hugging Face `StemSplitio/htdemucs-onnx`), pesanti (decine-centinaia di MB anche quantizzati) e RAM-hungry (separazione 4 stem di un intero brano richiede diversi GB) — **fattibile con riserva forte**, probabilmente troppo pesante per Safari iOS che uccide tab/PWA oltre ~1.5-2GB di memoria; da considerare solo per clip brevi, non brani interi.
- **ffmpeg.wasm**: la build multi-thread richiede `SharedArrayBuffer`, quindi header COOP `same-origin` + COEP `require-corp` (Cloudflare Pages li supporta via file `_headers`) — ma questo **rompe embed cross-origin senza header CORP/CORS**, incluso probabilmente il player embed di Spotify, a meno di usare la modalità COEP `credentialless` (supportata da Safari solo dalle versioni più recenti, da verificare). Alternativa più sicura per un sito con CSP stretta: build single-thread di ffmpeg.wasm (nessun SharedArrayBuffer necessario, ma più lenta), oppure evitare ffmpeg.wasm e usare **lamejs** (github.com/zhuker/lamejs, porting JS di LAME, LGPL, ultimo rilascio 2021 — fermo ma funzionale) per MP3, WAV scritto a mano (banale, PCM+header), e **MediaRecorder** nativo per Ogg/Opus (non su iOS) o **audio/mp4 AAC** (formato supportato da MediaRecorder su iOS Safari dalla 14.3).
- **Metronomo**: schedulazione precisa fattibile con il classico pattern "lookahead scheduler" su Web Audio, nessuna libreria necessaria.
- **Registratore idee**: MediaRecorder + IndexedDB, **fattibile**; su iOS il mimeType disponibile è `audio/mp4` (AAC), non webm/opus.
- **Rimario italiano offline**: `napolux/paroleitaliane` e `nibrica/Super-Rimario-Italiano` su GitHub, liste di parole italiane libere — verificare la licenza specifica di ogni lista prima dell'uso (non tutte dichiarano esplicitamente una licenza open).
- **Diagrammi accordi**: `svguitar` (npm, MIT, TypeScript/ESM, mantenuta) genera diagrammi SVG per chitarra/ukulele con configurazione delle corde — consigliata. Circolo delle quinte: nessuna libreria dedicata diffusa, meglio disegnarlo a mano in SVG (compito semplice, poche decine di righe).

**6. Vincoli PWA — Fattibile con riserva**

- **Due manifest/SW sullo stesso dominio** (`/` e `/toolbox/`): Google (web.dev) sconsiglia esplicitamente path annidati sullo stesso origin: storage (cookie, localStorage, IndexedDB, Cache API) è condiviso tra le due app, disinstallare una PWA può cancellare i dati dell'altra, notifiche possono finire attribuite all'app sbagliata, e il "prompt di installazione" può fallire. Tecnicamente due SW con scope diversi (`/` e `/toolbox/`) possono coesistere, ma serve namespacing rigoroso delle cache e attenzione a non far intercettare al SW di root le richieste sotto `/toolbox/`. **Non verificabile senza device reale**: se iOS crea davvero due icone home-screen distinte leggendo il manifest specifico di ciascun path, o se fa confusione.
- **Quota/eviction IndexedDB iOS**: Safari (ITP) cancella storage script-writable dopo 7 giorni di inattività **della scheda Safari**; per le PWA aggiunte alla home (standalone) Apple ha dichiarato in thread dev.apple.com che dovrebbero essere trattate diversamente/esenti, ma la cosa è stata storicamente controversa e non uniformemente confermata da Apple in modo documentale definitivo — **da non dare per garantito, non verificabile senza test su iPhone reale su più versioni iOS**.
- **Microfono in standalone iOS**: vedi punto 4, funzionante dalla 13.4 ma con regressioni sporadiche nelle beta.
- **Web Share API**: ben supportata su iOS Safari (testo/URL/file) dalla iOS 15 — fattibile per condividere export audio.
- **File System Access API** (picker nativo "Salva come"): **non supportata da Safari/WebKit** (caniuse conferma nessun supporto), solo Chromium. Safari offre invece OPFS (Origin Private File System, storage sandbox interno) utile per I/O temporaneo (es. ffmpeg.wasm) ma non per far scegliere all'utente dove salvare — su iOS l'unica via per "salvare file" resta `<a download>` con blob o Web Share API con allegato file.

Nota metodologica: tutte le verifiche relative a comportamento reale su iPhone fisico (AudioWorklet+mic in standalone, eviction IndexedDB su PWA home-screen, doppia icona con due manifest) restano non testabili da qui e andrebbero confermate con un device reale prima del lancio.

Fonti:
- [essentia.js npm](https://www.npmjs.com/package/essentia.js)
- [essentia.js releases](https://github.com/MTG/essentia.js/releases)
- [aubiojs npm](https://www.npmjs.com/package/aubiojs)
- [qiuxiang/aubiojs](https://github.com/qiuxiang/aubiojs)
- [realtime-bpm-analyzer npm](https://www.npmjs.com/package/realtime-bpm-analyzer)
- [realtime-bpm-analyzer repo](https://github.com/dlepaux/realtime-bpm-analyzer)
- [web-audio-beat-detector](https://github.com/chrisguttandin/web-audio-beat-detector)
- [Meyda](https://github.com/meyda/meyda)
- [AcoustID Web Service](https://acoustid.org/webservice)
- [bjjb/chromaprint.js](https://github.com/bjjb/chromaprint.js)
- [MusicBrainz API Rate Limiting](https://wiki.musicbrainz.org/MusicBrainz_API/Rate_Limiting)
- [MBS-2979 Enable CORS](https://tickets.metabrainz.org/browse/MBS-2979)
- [LRCLIB docs](https://lrclib.net/docs)
- [Cover Art Archive API](https://musicbrainz.org/doc/Cover_Art_Archive/API)
- [AudD.io](https://audd.io/)
- [The AI Music Arms Race (TISMIR)](https://transactions.ismir.net/articles/10.5334/tismir.254)
- [SONICS (ICLR 2025)](https://github.com/awsaf49/sonics)
- [Deezer ISMIR25 detector repo](https://github.com/deezer/ismir25-ai-music-detector)
- [FakeMusicCaps paper](https://arxiv.org/pdf/2409.10684)
- [pitchy npm](https://www.npmjs.com/package/pitchy)
- [WebKit bug 185448 getUserMedia in standalone](https://bugs.webkit.org/show_bug.cgi?id=185448)
- [iOS 26.1 beta audio input broken](https://developer.apple.com/forums/thread/802555)
- [AudioWorklet not playing iOS 18.01](https://developer.apple.com/forums/thread/768347)
- [audioWorklet not working iOS 16.2](https://developer.apple.com/forums/thread/734378)
- [Unlock Web Audio in Safari](https://www.mattmontag.com/web/unlock-web-audio-in-safari-for-ios-and-macos)
- [needles (LUFS)](https://github.com/domchristie/needles)
- [demucs-web](https://github.com/timcsy/demucs-web)
- [demucs-onnx](https://github.com/StemSplit/demucs-onnx)
- [ffmpeg.wasm SharedArrayBuffer discussion](https://github.com/ffmpegwasm/ffmpeg.wasm/discussions/576)
- [Cloudflare Pages SharedArrayBuffer headers](https://community.cloudflare.com/t/how-could-i-make-the-html-support-sharedarraybuffer/581161)
- [lamejs](https://github.com/zhuker/lamejs)
- [paroleitaliane](https://github.com/napolux/paroleitaliane)
- [Super-Rimario-Italiano](https://github.com/nibrica/Super-Rimario-Italiano)
- [svguitar npm](https://www.npmjs.com/package/svguitar)
- [Building multiple PWAs on the same domain (web.dev)](https://web.dev/articles/building-multiple-pwas-on-the-same-domain)
- [Safari iOS PWA Data Persistence Beyond 7 Days](https://developer.apple.com/forums/thread/710157)
- [File System Access API — caniuse](https://caniuse.com/native-filesystem-api)
