# Ricerca: bisogni di artisti e produttori (16 settembre 2026)

## Tiny Temple Toolbox — Candidati di ricerca (evidenze web + reddit + community)

Nota di metodo: le ricerche dirette su reddit.com sono state bloccate dal fetcher (SITE_BLOCKED sia su reddit.com che old.reddit.com); l'evidenza "reddit" sotto è quindi ricostruita da fonti secondarie che citano/aggregano quei thread (alternativeto.net, blog di producer, substack), dal volume di alternative concorrenti trovate per ogni categoria (segnale indiretto di domanda alta) e dalla presenza massiccia di app store listing per le categorie "quotidiane". Dove la fonte è debole lo segnalo esplicitamente.

| # | Strumento | Cosa fa | Per chi | Frequenza (fonte) | Alternative gratuite esistenti → valore aggiunto | Offline browser |
|---|---|---|---|---|---|---|
| 1 | Accordatore (tuner) | Rileva intonazione via microfono | musicisti/tutti | quotidiana — decine di app tuner con centinaia di recensioni (alternativeto: "Guitar Tuner App", "Tuneo") | Tantissime app mobile gratuite ma con ads o richiedono install; **alto** valore: nessun download, nessuna pubblicità, funziona anche in sala prove senza dati | sì |
| 2 | Metronomo | Click configurabile, accenti, subdivisioni | musicisti/tutti | quotidiana (stesso segnale: molte app "Metronome" con migliaia di download, Soundbrenner ecc.) | Tool online esistono (es. Online Metronome) ma spesso con banner ads; **medio-alto**: nessuna pubblicità, integrabile con tap-tempo | sì |
| 3 | BPM tap tempo | Batti il tempo col mouse/touch → BPM | tutti | quotidiana/settimanale (decine di app "Tap Tempo/BPM Counter" su App Store) | Esistono molte app dedicate gratuite ma isolate; **medio**: utile se integrato con delay/reverb calculator | sì |
| 4 | BPM & Key finder da file audio | Analizza un file e stima tempo/tonalità | producer/DJ | quotidiana per chi fa DJing/remix — Tunebat è tra i risultati Google top per "song key finder", con almeno 6-7 tool concorrenti diretti (coolo.ai, beyondverbal, voice.ai) | Tunebat/vocalremover.org sono gratis ma **caricano il file su server esterno** (privacy) e hanno accuratezza discussa (benchmark di terzi: errore medio 52-90 BPM su tracce >150 BPM); **alto**: se fatto client-side risolve upload e privacy | parziale (analisi pesante, va in Web Worker/WASM) |
| 5 | Vocal remover / stem split (voce-strumentale) | Separa voce da base | tutti | quotidiana per chi fa cover/karaoke — vocalremover.org ha almeno 6 "alternative" dirette recensite, segno di uso diffuso | vocalremover.org: gratuito ma con ads, upload obbligatorio, "quota limitata per sessione browser"; recensioni terze lo definiscono "funzionale ma datato"; **alto** se fatto in-browser: zero upload, privacy piena — ma richiede modello ML pesante (rischio conflitto col vincolo "costo zero/leggero") | parziale (serve WASM/modello ML, non banale) |
| 6 | Generatore di toni/oscillatore | Nota di riferimento, drone, rumore bianco/rosa | producer/musicisti | occasionale | Esistono tool online semplici, spesso datati; **basso-medio** | sì |
| 7 | Circolo delle quinte interattivo | Mostra tonalità, relative, accordi | musicisti/producer | settimanale — almeno 8 tool dedicati trovati (chordchord, tonegym, fifths.io, muted.io), segno di domanda costante in didattica musicale | Diversi tool gratuiti già ben fatti (fifths.io, muted.io); **basso-medio**: differenziarsi serve UI in italiano o integrazione con altri strumenti | sì |
| 8 | Camelot wheel / harmonic mixing | Mappa tonalità→codice Camelot per mixare in tonalità compatibili | DJ/producer | settimanale per chi fa DJing (mixedinkey.com è riferimento di settore, più 5+ implementazioni web gratuite trovate) | Tool consolidati e gratuiti esistono già (camelotwheel.org); **basso**: nicchia già ben coperta | sì |
| 9 | Chord finder (nome accordo → diteggiatura chitarra/piano) | Mostra come suonare un accordo | musicisti/cantautori | quotidiana per chi scrive canzoni | Moltissimi tool e app esistenti, alcuni con ads; **medio**: utile se integrato col resto della toolbox italiana | sì |
| 10 | Generatore progressioni di accordi | Suggerisce sequenze di accordi per tonalità/mood | cantautori/producer | settimanale | Tool tipo ChordChord già maturi e gratuiti; **basso-medio** | sì |
| 11 | Ear training (intervalli, accordi, scale) | Esercizi di riconoscimento uditivo | musicisti | settimanale — mercato affollato (10+ app dedicate trovate: OpenEar, Interval Ear Training, ecc.; SoundGym è riferimento per audio engineer) | Molte app mobile gratuite ma spesso freemium con paywall dopo pochi livelli; **medio**: versione web senza account né paywall ha valore | sì |
| 12 | Dizionario delle rime (italiano) | Cerca rime per una parola | rapper/trapper/cantautori | quotidiana per chi scrive testi — in inglese esistono 8+ tool/app (RhymeZone, AZRhymes, Rhyme Genie) | **In italiano l'offerta è scarsa/nessuna app dedicata seria** trovata nelle ricerche; **alto**: gap linguistico reale, target primario è l'Italia | sì (serve solo un dizionario/dataset locale) |
| 13 | Blocco note testi con contatore sillabe/metrica | Editor lyrics con conteggio sillabe per verso, utile per flow rap | rapper/cantautori | quotidiana | App come Lyricistant, Lazyjot, LyraPad esistono ma in inglese, alcune a pagamento; **alto**: nessuna versione italiana, editor semplice risolve un bisogno quotidiano di chi scrive | sì (localStorage/IndexedDB) |
| 14 | Registratore di idee (voice memo con tag/BPM) | Registra a mano libera un'idea musicale, la tagga | tutti | quotidiana — Voice Memos di iPhone è lo standard de facto citato in più guide songwriting, più app dedicate (Dubnote, Tape It) | Apple Voice Memos è già ottimo e gratis; **basso** salvo differenziarsi con tag automatici BPM/tonalità | parziale (registrazione sì, riconoscimento BPM no) |
| 15 | Calcolatore delay/reverb (ms ↔ BPM) | Converte BPM in tempi di delay/pre-delay per subdivisioni | producer | settimanale — almeno 8 calcolatori dedicati trovati (omnicalculator, anotherproducer, nickfever, meshplugins, producersociety, forproducer, wavmonopoly), segno di bisogno ricorrente e ben validato | Categoria molto affollata ma quasi tutti pieni di banner ads o legati a un plugin da vendere; **medio-alto**: versione pulita senza pubblicità ha comunque senso, differenziazione debole sul "cosa fa" | sì |
| 16 | Note-to-frequency calculator | Converte nota musicale ↔ Hz | producer/mix engineer | occasionale/settimanale in fase di mix EQ — almeno 9 tool dedicati trovati | Categoria satura di micro-siti SEO quasi identici; **basso**: bisogno reale ma già coperto ovunque | sì |
| 17 | Cheat sheet LUFS per piattaforma + meter di loudness | Mostra target di loudness (Spotify/YouTube/Tidal/Amazon −14 LUFS, Apple Music −16 LUFS, true peak −1 dBTP) e misura il file caricato | producer | settimanale in fase di mastering — decine di articoli 2026 dedicati (forasoft, veniamastering, antiaimaster, trackgleam) confermano che è un dubbio ricorrente tra producer indipendenti | La *tabella* di riferimento è ovunque gratis; il *misuratore* LUFS in-browser (upload zero) è raro — la maggior parte richiede plugin DAW o software da installare; **alto** per il meter, **basso** per la sola tabella | sì (Web Audio API supporta calcolo LUFS, fattibile) |
| 18 | Checklist consegna stems/mix per mastering | Lista di controllo (sample rate, bit depth, naming, niente limiter sul master bus, ecc.) | producer | occasionale ma critica — più guide dedicate trovate (veniamastering, mixvisor, mikesmixmaster, blakmarigold) confermano che è un errore comune tra chi manda stems disordinati | Esistono solo come articoli di blog, non come checklist interattiva/scaricabile gratuita; **medio-alto**: nessun tool interattivo trovato, solo prosa | sì (contenuto statico/interattivo, no audio) |
| 19 | Convenzione naming file/stems (generatore automatico) | Genera nomi file coerenti (Artista_Titolo_BPM_Key_Stem) | producer | occasionale | Non risultano tool dedicati, solo guide testuali (gearspace, slideshare); **medio**: piccolo gap reale | sì |
| 20 | Checklist/pianificatore di release | Timeline a ritroso dalla data d'uscita (annuncio, pre-save, artwork, distribuzione, playlist pitching) | artista/tutti | per-progetto (ogni singolo/EP) — almeno 8 versioni concorrenti trovate (Groover, Otherrecordlabels, D4 Music Marketing, Boost Collective), segno di bisogno molto sentito nel percorso di lancio | Diversi generatori gratuiti già online, spesso legati a un servizio a pagamento (Groover) che spinge upsell; **alto** se resta 100% gratuito senza upsell e in italiano | sì |
| 21 | Generatore split sheet (compilabile, esporta PDF) | Documento che registra le quote di scrittura tra collaboratori | cantautori/producer/feat | per-progetto ma essenziale — almeno 8 template concorrenti trovati (Songtrust, Ditto, Symphonic, LANDR, Omari MC), tema ricorrente in guide su publishing | Template PDF statici scaricabili gratis abbondano; **medio-alto**: un generatore compilabile che produce subito un PDF pulito, in italiano, è raro | sì |
| 22 | EPK / press kit builder | Pagina o PDF con bio, foto, link, contatti per etichette/organizzatori | artista in lancio | per-progetto — almeno 8 builder concorrenti trovati (Bandzoogle, Tunepact, epkbuilder.com, Home Run) | La maggior parte dei builder gratuiti richiede account/hosting a pagamento oltre una soglia; **medio-alto**: builder 100% locale/esportabile senza account è raro | sì (con export come pagina statica/PDF) |
| 23 | Calcolatore royalty streaming | Stima guadagno per N stream su Spotify/Apple/YouTube | artista | occasionale ma molto cercato — almeno 9 calcolatori concorrenti trovati (LANDR, Music Gateway, soundcamps, billboard), tema molto discusso perché le stime cambiano di continuo | Categoria satura, cifre spesso disallineate tra loro; **basso-medio**: valore sta solo nel tenerlo aggiornato e onesto sulle stime | sì (calcolo semplice, dati da aggiornare a mano periodicamente) |
| 24 | Spiegazione/calcolatore ISRC-UPC | Spiega a cosa servono i codici e come si struttura un ISRC/UPC valido | artista/producer | per-progetto — diversi articoli italiani dedicati trovati (Fimi, Liberty Music, CorriereNerd), segno che è un dubbio ricorrente per chi si autodistribuisce in Italia | I codici veri li assegna solo il distributore/IFPI; un tool può solo *validare il formato* o spiegare; **basso-medio**: utile come contenuto educativo, non come generatore di codici reali | sì |
| 25 | Comparatore SIAE vs Soundreef (contenuto interattivo) | Aiuta a capire differenze/costi/quando conviene iscriversi | artista in lancio (Italia) | per-decisione, una tantum ma cruciale — molti articoli italiani 2026 dedicati (Onda Musicale, Dandi Media, BlogSicilia, SIAE stessa), tema molto sentito tra indipendenti italiani | Solo articoli/blog, nessun tool interattivo di confronto trovato; **alto**: gap reale e molto specifico per il pubblico italiano target di Tiny Temple | sì |
| 26 | Template contratto feat/collaborazione | Bozza semplice di accordo per featuring/produzione | artista/producer | occasionale | Simile ai split sheet, alcuni template gratis in inglese; **medio**: versione italiana con linguaggio semplice ha valore | sì |
| 27 | Budget planner per una release | Stima costi (missaggio, mastering, distribuzione, artwork, promo) | artista in lancio | per-progetto | Non risultano tool dedicati gratuiti, solo articoli generici; **medio**: gap moderato | sì |
| 28 | Timer di pratica ("pomodoro" da studio) | Sessioni cronometrate con pause per esercitarsi | musicisti | quotidiana per chi pratica con costanza | Esistono app pomodoro generiche non musicali; **basso-medio**: differenziazione debole se non integrato con metronomo/riscaldamento | sì |
| 29 | Riscaldamento vocale guidato + timer | Sequenza audio guidata (scale, lip trill, ecc.) con timer | cantanti | quotidiana/settimanale — almeno 6 app dedicate trovate (7 Minute Vocal Warm Up, Vocalizzo, sing·scale), segno di bisogno concreto e ricorrente | App mobile gratuite esistenti ma spesso a pagamento oltre le funzioni base; **medio-alto** se fatto bene senza paywall | sì |
| 30 | Vocal range finder | Trova l'estensione vocale cantando | cantanti | occasionale — presente come feature in almeno un'app dedicata | Poche versioni web gratuite trovate, per lo più app mobile; **medio** | sì |
| 31 | Tabelle scale/modi musicali | Reference visiva di scale maggiori/minori/modi | musicisti/producer | occasionale/didattico | Tool tipo tonegym/fifths.io già coprono bene l'argomento; **basso** | sì |
| 32 | Trascrizione accordi da audio (chord recognition) | Riconosce la sequenza di accordi da una registrazione | musicisti/producer | occasionale, molto richiesto ma tecnicamente avanzato (il documento di roadmap del progetto lo classifica già come "difficoltà alta") | Esistono tool ma quasi tutti richiedono upload su server o abbonamento; **alto** in teoria, ma complessità di sviluppo molto alta — da valutare per ultimo | parziale (serve modello ML pesante) |
| 33 | Convertitore ms↔BPM generico (LFO rate, sidechain, subdivisioni) | Estende il calcolatore delay ad altri usi (sidechain ducking, LFO) | producer elettronici | settimanale per chi fa EDM/trap con sidechain pompato | Stessa categoria affollata del delay calculator, spesso nello stesso sito; **basso-medio** | sì |
| 34 | Transpositore/capotasto per chitarra | Calcola posizione capotasto per cambiare tonalità mantenendo le forme degli accordi | chitarristi/cantautori | occasionale/settimanale | Diversi tool gratuiti esistono, alcuni con ads; **basso-medio** | sì |
| 35 | Generatore checklist pre-consegna beat (per producer che vendono beat) | Lista di controllo prima di mandare un beat a un artista (tag, stems, contratto) | producer/beatmaker | occasionale | Non risultano tool dedicati, solo guide sparse; **medio**: piccolo gap specifico per la community trap/hip-hop | sì |

---

### (1) I 10 candidati con miglior rapporto valore/complessità

1. **Dizionario delle rime in italiano** — gap linguistico reale, nessuna concorrenza seria trovata, complessità bassa (dataset + ricerca fonetica).
2. **Blocco note testi con contatore sillabe/metrica** — stesso gap linguistico, uso quotidiano, complessità bassa (editor + IndexedDB).
3. **Comparatore SIAE vs Soundreef** — bisogno molto sentito e specifico per l'Italia, nessun tool interattivo esistente, solo contenuto/logica, zero audio.
4. **Accordatore** — uso quotidiano confermato, tecnicamente il più semplice (già indicato "bassa difficoltà" nella roadmap interna del progetto), differenziazione forte (zero ads, zero download).
5. **Metronomo** — stesso discorso, complessità bassa, uso quotidiano.
6. **Checklist consegna stems/mix** — nessun tool interattivo trovato in tutta la ricerca (solo blog), complessità nulla (contenuto statico/checklist), rilevante per i producer.
7. **Split sheet generator con export PDF** — bisogno molto citato nelle guide, poca offerta di generatori compilabili gratuiti in italiano.
8. **Pianificatore di release (checklist a ritroso dalla data d'uscita)** — molto richiesto nel percorso "artist development", generabile senza audio, differenziazione forte se resta gratis senza upsell.
9. **Cheat sheet + calcolatore LUFS per piattaforma** — tema caldissimo nel 2026 secondo le fonti, la tabella è semplice da fare subito, il meter vero e proprio è un secondo step fattibile con Web Audio.
10. **Calcolatore delay/reverb ms↔BPM** — categoria molto validata (8+ concorrenti), complessità bassa, utile aggiungere una versione pulita senza pubblicità.

### (2) Insight ricorrenti nelle fonti

- **Upload obbligatorio su server esterno** è il difetto più citato per i tool di analisi audio (vocal remover, BPM/key finder): gli utenti finiscono per caricare la propria musica inedita su siti terzi solo per sapere BPM o tonalità — esattamente il problema che un tool "tutto nel browser" risolve alla radice.
- **Pubblicità invasiva** ricorre su quasi tutte le categorie di micro-tool gratuiti online (metronomi, calcolatori delay, note-to-frequency): sono siti SEO monetizzati con banner, non prodotti curati.
- **Modelli "gratis oggi, limiti domani"**: più fonti (es. il confronto su vocalremover.org) segnalano esplicitamente il rischio che un servizio gratuito introduca quote, watermark o abbonamento nel tempo — cosa che un tool locale, senza backend, non può fare.
- **Vuoto di contenuti in lingua italiana** per gli strumenti "creativi" (rime, metrica, lyric pad) e per i temi legali/burocratici italiani (SIAE/Soundreef, ISRC/UPC): l'offerta reperibile è quasi tutta in inglese o, per i temi italiani, solo sotto forma di articoli lunghi non di strumenti pratici.
- **Frammentazione**: per compiere un solo compito (es. calcolare un tempo di delay, o trovare BPM e tonalità) un utente deve visitare siti diversi e spesso datati/poco curati nell'interfaccia — un'opportunità per una toolbox coerente in un unico posto.

Fonti:
- [Song Key & BPM Finder | Tunebat](https://tunebat.com/Analyzer)
- [Free BPM Finder and Song Key Finder - EaseUS](https://vocalremover.easeus.com/bpm-key-finder/)
- [Song Key and BPM Finder — vocalremover.org](https://vocalremover.org/key-bpm-finder)
- [Best 6 Song Key Finders for Web & Mobile 2026 - Coolo](https://coolo.ai/blog/song-key-finder/)
- [Best Tunebat BPM Alternative 2026 - benchmark accuratezza](https://bpm-finder.net/posts/tunebat-bpm-alternative)
- [VocalRemover.org Alternative, No Ads - RemoveVocals](https://removevocals.ai/vocalremover-org-alternative)
- [VocalRemover.org Alternatives - AlternativeTo](https://alternativeto.net/software/vocalremover-org/)
- [LUFS targets per platform 2026 - Forasoft](https://www.forasoft.com/learn/audio-for-video/articles-audio/lufs-targets-per-platform-2026)
- [Mastering for Streaming: LUFS Targets - Venia Mastering](https://veniamastering.studio/blog/technical-mastering-guide-for-spotify-and-streaming/)
- [LUFS Loudness Targets 2026 - AntiAI Master](https://antiaimaster.com/blog/lufs-loudness-targets-streaming-2026)
- [Delay & Reverb Time Calculator - Omnicalculator](https://www.omnicalculator.com/other/delay-reverb-times)
- [Delay & Reverb Time Calculator - Another Producer](https://anotherproducer.com/online-tools-for-musicians/delay-reverb-time-calculator/)
- [Delay & Reverb Calculator - Nick Fever](https://nickfever.com/music/delay-calculator)
- [Note to Frequency Chart & Converter - freebeat.ai](https://freebeat.ai/tools/note-frequency-chart)
- [Free Songwriter Split Sheet Template - Songtrust](https://www.songtrust.com/en/split-sheet-download)
- [Free Music Split Sheet Template - Ditto Music](https://dittomusic.com/en/blog/download-free-music-split-sheet-template-and-guide)
- [10 Best Free Music Split Sheet Generators - Omari MC](https://www.omarimc.com/10-best-split-sheet-templates/)
- [How to Make a Free EPK - GetResponse](https://www.getresponse.com/blog/epk-template)
- [Free EPK Builder - Tunepact](https://www.tunepact.com/epk)
- [FREE EPK Builder - epkbuilder.com](https://epkbuilder.com/)
- [Free Music Release Checklist & Timeline - Groover](https://groover.co/en/lp/free-tools/music-release-planner/)
- [Preparing a Release: 10-Step Checklist - Other Record Labels](https://www.otherrecordlabels.com/release)
- [Music Release Checklist Tool - Boost Collective](https://www.boost-collective.com/blog/music-release-checklist-tool-free)
- [Spotify Royalties Calculator 2026 - Artist Tools](https://www.artist.tools/spotify-royalties-calculator)
- [Royalty Calculator - Music Gateway](https://www.musicgateway.com/royalties-calculator)
- [Spotify Royalty Calculator - LANDR](https://www.landr.com/royalty-calculator)
- [Codici ISRC e UPC spiegati - LabelGrid](https://help.labelgrid.com/it/aiuto/isrc-upc-spiegati/)
- [ISRC - Fimi](https://www.fimi.it/isrc/)
- [Soundreef o SIAE: 15 domande - Onda Musicale](https://www.ondamusicale.it/musica/138908-soundreef-o-siae-15-domande-e-risposte-che-tutti-fanno-a-chatgpt/)
- [Siae o Soundreef? Le alternative alla Siae - Dandi Media](https://www.dandi.media/alternative-siae-concorrente-soundreef/)
- [Soundreef o SIAE? dati AGCOM 2026 - BlogSicilia](https://www.blogsicilia.it/oltrelostretto/soundreef-o-siae-cosa-emerge-davvero-dal-confronto-nel-2026-dati-agcom/1292440/)
- [Circle of Fifths - ChordChord](https://chordchord.com/circle-of-fifths)
- [Circle of fifths interactive - Tonegym](https://www.tonegym.co/tool/item?id=circle-of-fifths)
- [Free music theory tools - Fifths.io](https://fifths.io/tools/)
- [Camelot Wheel for DJs - DJ.Studio](https://dj.studio/blog/camelot-wheel)
- [Camelot Wheel - Mixed In Key](https://mixedinkey.com/camelot-wheel/)
- [How to Prep Stems for Mastering - Venia Mastering](https://veniamastering.studio/blog/how-to-prep-stems-for-mastering/)
- [Stem Delivery Best Practices - Mixvisor](https://mixvisor.com/guides/stem-delivery-best-practices/)
- [Printmaster/Stems naming convention - Gearspace](https://gearspace.com/board/post-production-forum/1014111-printmaster-stems-naming-convention.html)
- [7 Minute Vocal Warm Up - Google Play](https://play.google.com/store/apps/details?id=com.indraaziz.sevenminutevocalwarmuppro)
- [sing·scale — Vocal Scales & Warm-up App](https://singscale.com/)
- [Rhyme Zone Alternatives - AlternativeTo](https://alternativeto.net/software/rhyme-zone/)
- [Lazyjot Alternatives - AlternativeTo](https://alternativeto.net/software/lazyjot)
- [Lyricistant Alternatives - AlternativeTo](https://alternativeto.net/software/lyricistant)
- [🎵 Music Production: Best Resources and Tools - MProducer](https://musicproducer.substack.com/p/music-production-best-resources-guide)
- [How to Create a Spotify Pre-Save Link for Free - Ditto Music](https://dittomusic.com/en/tools/pre-save-links)
- [Free Pre-Save Link Maker - Sonikit](https://www.sonikit.com/free-presave-link-maker)

---
Nota per il team: le ricerche mirate su reddit.com (r/WeAreTheMusicMakers, r/edmproduction, r/trapproduction, r/Songwriting, r/Guitar) sono state bloccate dal tool di fetch ("Access to this website has been blocked", sia su reddit.com che old.reddit.com); la componente "thread reddit" richiesta nel brief non ha quindi potuto essere verificata con citazioni dirette di singoli commenti — l'evidenza sopra la sostituisce con fonti secondarie e segnali indiretti di domanda (numero di concorrenti/alternative trovati per ciascuna categoria). Se serve l'evidenza reddit diretta, va raccolta con un altro metodo (browser autenticato o API Reddit) in un secondo passaggio.
