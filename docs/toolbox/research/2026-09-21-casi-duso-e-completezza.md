# Toolbox — casi d'uso e completezza per strumento (21 settembre 2026)

Risposta al giudizio di Genna ("sembra una demo"): per ognuno dei 9 strumenti, chi lo
usa e quando, cosa serve per essere completo rispetto alle migliori app di categoria,
priorità A/B/C di ciò che manca, cosa persiste e si sincronizza.

## 1. Metronomo

**Casi d'uso:** sala prove/palco, click veloce; "voglio richiamare BPM+battuta di ieri
senza reimpostarli"; "conto alla rovescia prima che parta"; "salvo 'ritornello brano X
= 96 4/4' e lo ritrovo dopo"; "silenzia un battito a caso per allenare il tempo".

**Riferimenti:** Pro Metronome ha playlist salvate con sync iCloud, rhythm trainer che
silenzia battiti a caso, accelerando/decelerando programmato, flash/vibrazione
([Pro Metronome](https://apps.apple.com/us/app/pro-metronome-tempo-tuner/id477960671)).
Soundbrenner ha contapassaggi a fine brano, cronometro di pratica, muted-beats trainer
([Soundbrenner](https://www.soundbrenner.com/blogs/articles/exciting-android-updates-metronome-app-soundbrenner)).

**Manca:**
- A — **preset nominati multipli** (oggi un solo slot di prefs, non una lista). S.
- A — **count-in** prima dell'avvio, assente dalla spec. S.
- B — rhythm/silent-beat trainer. S/M. B — accelerando/decelerando programmato. M.
- C — polyritmi (nicchia). M. C — vibrazione (Android; iOS Safari non la espone). S.

**Persistenza/sync:** preset nominati (bpm, battuta, suddivisione, suono, volume) come
lista, non uno slot. Candidato a un futuro "quaderno" sync oltre Penna: dati piccoli,
non sensibili.

## 2. Accordatore

**Casi d'uso:** prima di registrare o accordare in studio/casa/palco; "voglio la mia
accordatura personalizzata salvata con un nome"; "voglio accordare ad orecchio in un
locale rumoroso"; "voglio l'A4 che uso sempre (es. 432) già impostato".

**Riferimenti:** GuitarTuna copre più strumenti con accordature multiple
([guitartuna.com](https://guitartuna.com/)). Tunable unisce accordatore, metronomo e
generatore accordi con impostazioni di accordatura persistenti
([Tunable — tuner settings](https://userguide.tunableapp.com/documentation/tuner/tuner-settings)).

**Manca:**
- A — **accordature personalizzate con nome**: la spec 11 §1 le esclude esplicitamente
  ("fuori perimetro"); senza, chi accorda diverso dai 9 preset non è servito. M.
- B — ultima corda/modalità per sessione ricordata. S.
- C — libreria accordi/diagrammi: fuori perimetro per scelta, coerente col rimando a
  un chord-finder futuro (01-candidati §D).

**Persistenza/sync:** A4 condiviso (`tt.shared.a4`); **accordature personalizzate con
nome** (nuova) sono l'unico dato che vale una sincronizzazione — lavoro dell'utente,
non solo preferenza.

## 3. Calcolatore tempo

**Casi d'uso:** al mixer, impostare delay/riverbero da un BPM; convertire nota↔Hz per
l'EQ; "voglio copiare il ms diretto in appunti"; "voglio l'unità che uso sempre già
impostata".

**Riferimenti:** categoria affollata di siti pubblicitari senza dati persistenti
(vedi ricerca 16/09 interna); qui il benchmark è l'assenza di pubblicità e la copia
diretta, non funzioni aggiuntive — nessuna app "premium" da eguagliare.

**Manca:**
- C — preset per plugin comuni (rischio di invecchiare). C — cronologia BPM recenti. S.
- C — condivisione di un risultato oltre la copia negli appunti. S.

Nessuna lacuna A: la spec 12 §1 esclude apposta preset/export — è già lo strumento più
completo.

**Persistenza/sync:** solo prefs locali (bpm, scheda, unità, direzione); nessun dato
da sincronizzare — è un calcolatore, non un archivio.

## 4. DNA

**Casi d'uso:** arriva una base/mix da un producer, serve BPM/tonalità/loudness in
10 secondi; "voglio ritrovare l'analisi di un file caricato la settimana scorsa senza
ricaricarlo"; "voglio confrontare due mix per il target LUFS"; "voglio le tonalità
compatibili per mixare due tracce".

**Riferimenti:** Mixed In Key restituisce chiave Camelot, BPM, energy e cue point,
usati per trovare brani compatibili sulla Camelot Wheel
([Mixed In Key](https://mixedinkey.com/workflows/how-to-mix-in-key/)). Tunebat rileva
key e BPM gratis nel browser, energy/danceability dietro abbonamento
([Tunebat Analyzer](https://tunebat.com/Analyzer)).

**Manca:**
- A — **storico persistente delle analisi** (nome file, BPM, tonalità, Camelot, LUFS,
  data): la spec 13 §3 lo nomina ma senza schema dati; senza, ogni analisi è
  usa-e-getta come un sito concorrente. M.
- B — confronto fianco a fianco di due analisi. M. B — "tonalità compatibili" cliccabile
  per filtrare lo storico. S.
- C — energy/danceability in stile Tunebat: fuori scopo dichiarato ("non è un parere
  artistico", spec 13 §1) — da non aggiungere.

**Persistenza/sync:** storico DNA (nome file troncato, mai il file audio — BPM,
tonalità, Camelot, LUFS, dBTP, durata, data, fonte). Primo candidato forte a sync dopo
Penna: piccolo, utile su più dispositivi.

## 5. Penna

**Casi d'uso:** scrivo a casa, aggiusto in studio, appunto un'idea mobile; "voglio lo
stesso testo su telefono e PC"; "voglio una rima senza uscire dall'editor"; "voglio
vedere subito un verso con una sillaba di troppo"; "voglio ritrovare un testo di mesi
fa senza cercarlo a memoria".

**Riferimenti:** RhymeZone è il rimario online di riferimento (ricerca per rima, suono,
metro) ([rhymezone.com](https://www.rhymezone.com/help/)). RapPad/RhymeFlux e Lyrcs
integrano evidenziazione rime a colori e conteggio sillabe **nell'editor stesso**, non
in una finestra separata
([RhymeFlux vs RapPad](https://rhymeflux.com/compare/rhymeflux-vs-rappad/), [lyrcs.app](https://lyrcs.app/)).

**Manca:**
- A — la **sync (spec 17) è specificata ma non costruita**: senza, fallisce il caso
  d'uso più citato ("scrivo sul telefono, rifinisco al PC"). L; impatto informative sì
  (spec 17 §2), costo zero entro i limiti D1/Pages già verificati.
- B — ricerca full-text fra documenti salvati (oggi solo titolo/prima riga/data). S/M.
- B — conteggio sillabe visibile nella lista documenti, non solo nell'editor aperto. S.
- C — export con metadati BPM/tonalità da un'analisi DNA collegata: fuori perimetro
  dichiarato di Penna (spec 14 §1).

**Persistenza/sync:** già disegnato in spec 17 — codice a sei parole, cifratura
client-side, D1 come blob cifrato; da costruire. Dato: titolo, corpo, data, `sid`,
sinalefi manuali. Nessuna cronologia versioni (esclusa, spec 17 §1).

## 6. Pianificatore di uscita

**Casi d'uso:** a tavolino prima dell'uscita, poi consultato ogni giorno; "voglio
sapere entro quando consegnare il master"; "voglio vedere le tappe in ritardo appena
apro"; "voglio spostare la data e vedere tutto ricalcolato"; "voglio il promemoria nel
mio calendario, non un'altra notifica push".

**Riferimenti:** DistroKid raccomanda **almeno quattro settimane** di anticipo per
garantire l'uscita alla data scelta ovunque
([DistroKid — custom release date](https://support.distrokid.com/hc/en-us/articles/360013534454-If-I-Specify-a-Custom-Release-Date-When-Will-My-Album-Appear-in-Streaming-Services)),
coerente col profilo "Veloce" già in ricerca interna. Le guide pre-save insistono su
annunci scaglionati e pitching editoriale senza promettere risultati
([Sonikit — pre-save 2026](https://www.sonikit.com/blog/articles/the-complete-guide-to-spotify-pre-saves-2026-edition-strategy-data--release-infrastructure)),
coerente con "lo strumento ricorda, non promette" (spec 15 §1).

**Manca:** nessuna lacuna A strutturale — la priorità A è **eseguire la spec**, oggi
solo scritta. B — collegamento a Split sheet/Checklist dalla stessa tappa. M. B — vista
"tutti i piani" con tappe in scadenza per piano. S. C — .ics ricorrente (basso valore).

**Persistenza/sync:** IndexedDB come Penna (spec 15). Dato per piano: titolo, tipo,
data, profilo, distributore, note, stato tappe. Nessuna sync prevista oggi — da
valutare col meccanismo di Penna una volta esistente: "vedo il piano fuori casa" è un
caso reale quanto quello di Penna.

## 7. Checklist consegna/naming stem (previsto)

**Casi d'uso:** prima di consegnare un mix/master; "voglio sapere se ho esportato gli
stem alla stessa lunghezza/sample rate"; "voglio un nome file coerente senza
inventarmelo ogni volta"; "voglio una checklist spuntabile riusabile per progetto".

**Riferimenti:** nessuno strumento interattivo esistente (confermato dalla ricerca
16/09); solo articoli statici: Venia Mastering su prep stem
([veniamastering.studio](https://veniamastering.studio/blog/how-to-prep-stems-for-mastering/)),
Mixvisor su best practice di consegna
([mixvisor.com](https://mixvisor.com/guides/stem-delivery-best-practices/)), discussione
naming su Gearspace ([gearspace.com](https://gearspace.com/board/post-production-forum/1014111-printmaster-stems-naming-convention.html)).
La Toolbox può essere il **primo strumento interattivo** della categoria.

**Manca (tutto A/B, non esiste ancora nulla):**
- A — checklist spuntabile riusabile (stato salvato per item, come il Pianificatore). M.
- A — generatore di nome file da campi (progetto, traccia, versione, BPM/tonalità
  opzionali) con anteprima e copia. M.
- B — preset diversi per mix/master/stem. S una volta fatto il primo. B — contenuto
  tecnico validato dallo studio (formati, headroom, silenzio in coda) — da scrivere con
  Ponz, non da un agente.
- C — export della checklist compilata in PDF/testo. S.

**Persistenza/sync:** preset di naming per progetto e stato checklist corrente; utile
sincronizzare se si passa da studio a casa a metà preparazione, stesso meccanismo di
Penna/DNA.

## 8. Split sheet PDF (previsto)

**Casi d'uso:** a fine sessione con più autori, prima di dimenticare chi ha fatto
cosa; "voglio compilare percentuali senza aprire Word"; "voglio un PDF pulito da
firmare subito"; "voglio riusare lo stesso modello al prossimo featuring".

**Riferimenti:** i modelli standard convergono su titolo, nome legale di ogni autore,
percentuale, contatti, firma datata (spesso con testimone), eventuale quota
editore/etichetta ([Songtrust](https://www.songtrust.com/en/split-sheet-download),
[LANDR](https://blog.landr.com/split-sheet/)). Nessuno è compilabile interattivamente
con PDF generato al volo: sono documenti statici da scaricare e riempire a mano.

**Manca:**
- A — **somma percentuali = 100** con avviso se non torna: l'errore più comune coi
  moduli statici. S.
- A — campi minimi: titolo, per autore (nome, ruolo, percentuale, PRO se nota,
  contatto), data, spazio firma (stampa, non firma digitale — fuori scopo per
  costo/complessità legale). M.
- B — rubrica locale minima di collaboratori ricorrenti (nome, ruolo, PRO). S.
  B — precompilazione da una tappa del Pianificatore. S una volta esistenti entrambi.

**Persistenza/sync:** split sheet compilati per brano e la rubrica collaboratori
ricorrenti — quest'ultima ha più valore da sincronizzare, si riusa a ogni featuring.

## 9. Trasposizione (previsto)

**Casi d'uso:** prima di una sessione vocale, portare una base nella propria
tonalità; "voglio alzare 2 semitoni senza cambiare il tempo"; "voglio provare più
tonalità sulla stessa base"; "voglio partire dalla tonalità che DNA ha già rilevato".

**Riferimenti:** Moises offre pitch changer indipendente dal tempo (un semitono alla
volta) con rilevamento chiave che aggiorna gli accordi mostrati, export MP3/WAV o per
traccia ([moises.ai/features/pitch-changer-shifter](https://moises.ai/features/pitch-changer-shifter/)).
Benchmark diretto per qualità percepita, ma con account e piano free limitato — la
Toolbox compete sulla gratuità totale, non necessariamente sulla qualità
dell'algoritmo (01-candidati §F segnala già artefatti oltre ±3–4 semitoni).

**Manca (nessuna spec dedicata oggi, tutto A/B):**
- A — spec dedicata (oggi una riga in 01-candidati §F): scope preciso (semitoni
  interi, range consigliato, formati). M di specifica prima del codice.
- A — collegamento con DNA: tonalità rilevata come punto di partenza, già previsto. M.
- B — avviso di qualità oltre ±4 semitoni, coerente col tono "misure, non pareri". S.
  B — variazione di tempo senza cambiare tonalità (seconda modalità). M.
- C — anteprima A/B prima di esportare. S.

**Persistenza/sync:** nessun file audio sincronizzato (troppo pesante, coerente col
resto); solo preferenze (ultimo numero di semitoni, formato export). Il file resta
locale, come in DNA.

## Trasversale

**Onboarding/aiuto in-app:** nessuno strumento ha un primo-avvio guidato; serve almeno
un `tb-info` per strumento che spieghi in una frase cosa fa (pattern già in
Pianificatore, spec 15 §3) — non un tour, solo testo scopribile.

**Pagina impostazioni unica:** oggi ogni strumento gestisce le proprie prefs (A4
condiviso è l'unica eccezione); manca un punto per vedere/cancellare tutti i dati
salvati e gestire lingua e sync una sola volta — oggi la sync esiste solo dentro Penna.
Priorità B, M: serve dopo che 2-3 strumenti hanno dati da gestire, non prima.

**Calendario delle uscite:** "prossime tappe" del Pianificatore è già riusabile da una
futura Dashboard (`timeline.js`), ma manca una vista che le raccolga insieme alle
scadenze di Checklist/Split sheet. B, M.

**Esportazioni:** pattern coerente (Blob + `<a download>`, Web Share, stampa CSS) già
in Pianificatore e Calcolatore; da riusare identico in Checklist e Split sheet, non
reinventare.

**Offline:** i sei strumenti esistenti sono offline dal primo caricamento, tranne il
download dati di Penna (~800 KB) e la sync (rete solo su azione). Da mantenere identico
per i tre nuovi: zero rete per Checklist e Split sheet, calcolo locale per Trasposizione.

**Accessibilità:** pattern già solido per strumento (colore + lettera/testo,
`aria-live`, target 44 px, contrasto ≥4.5:1); l'unico rischio nei tre nuovi è
Trasposizione con controlli audio — riusare i pattern di DNA/Accordatore invece di
inventarne di nuovi.
