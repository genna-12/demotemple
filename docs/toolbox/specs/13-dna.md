# Spec 13 — DNA (strumento 4)

18 settembre 2026. Pagina `/dna/`. Template pagina strumento della 10 §1, componenti della 03 §2.
Primo strumento che analizza un file: fissa il percorso decodifica → Worker → risultato.

## 1. Scopo e utente

Chi porta una base o un mix sa in dieci secondi **BPM, tonalità con Camelot e loudness** senza
caricare niente su un sito. Due ingressi: **File** (attendibile) e **Microfono** 10–20 s (marcato
"stima"). Fuori perimetro: riconoscere il brano, testi, accordi, crediti, waveform, export audio,
stem, trasposizione (strumento a sé, 01 §F). Non è un parere artistico: misure, con la confidenza
dichiarata.

## 2. Vincoli applicati

Zero rete: nessun upload, nessuna libreria, nessun WASM. **`_headers` non si tocca**: `worker-src
'self'` c'è già e il Worker è un file dell'origine, non un `blob:`; la deroga
`'wasm-unsafe-eval'`/`blob:` che la 00 §5 lasciava aperta "probabile DNA" **non serve e resta
esclusa**. Il microfono riusa consenso e stream di `mic.js` (11 §3): nessun permesso nuovo. **Impatto
informative:** nessuno oltre al microfono già citato; vale aggiungere in Iubenda "i file scelti non
lasciano il dispositivo". Offline dal primo caricamento, nessuno `style=""`.

## 3. Flusso utente

Stati, uno per schermata a 390×844: **vuoto** → **registrazione** (solo mic) → **analisi** →
**risultato** → **errore** / **permesso negato**.

**Vuoto:** zona di rilascio con `tb-btn--primary` "Scegli file" (label di `<input type="file"
accept="audio/*">`, fuori schermo ma focusabile) e `tb-btn` "Registra"; drag&drop solo con
`(hover: hover) and (pointer: fine)`; riga "MP3, WAV, M4A, AAC, OGG, FLAC — fino a 15 minuti"; sotto
lo **storico**.

**Registrazione:** `mic.renderConsent`, `onAllow` dentro il gesto (`audio.unlock()` →
`mic.acquire()`); conto alla rovescia grande, barra di livello (RMS in rAF), "Ferma" dopo 10 s, stop
automatico a 20 s, `mic.release()`, poi la stessa analisi.

**Analisi:** nome del file troncato, `role="progressbar"`, "Annulla" (`worker.terminate()`); fasi
annunciate: decodifica → loudness → ritmo e tonalità.

**Risultato:** card di numeri grandi. **BPM** con `tb-segment` ×2 / ÷2 quando l'ottava è ambigua e la
confidenza in parole; **Tonalità** + Camelot + riga "compatibili"; **LUFS** e **dBTP** con barre verso
il target della piattaforma (`tb-select`: Spotify −14, Apple Music −16, YouTube −14, Tidal −14; true
peak −1) e la frase "alza/abbassa di X dB"; poi durata, sample rate, canali, LRA se calcolata;
`tb-badge` "stima" se la sorgente è il microfono; in fondo "Copia" (riepilogo testuale, come la 12 §2)
e "Analizza un altro".

Chiavi `dna-`, IT · EN: DNA della traccia · Track DNA; Scegli file · Choose a file; Trascina qui un
brano · Drop a track here; Registra · Record; Analisi in corso · Analysing; Stima dal microfono ·
Microphone estimate; Tonalità · Key; maggiore/minore · major/minor; Compatibili · Compatible;
Piattaforma · Platform; Alza/Abbassa di · Turn up/down by; In target · On target; Picco reale · True
peak; Escursione · Loudness range; Confidenza alta/media/bassa · High/medium/low confidence; Analizza
un altro · Analyse another; Recenti · Recent; Formato non letto · Could not read this file; File
troppo grande · File too large.

## 4. Architettura

**Nuovi:** `toolbox/dna/{index.html, dna.js, dna.css, i18n.js, dna-worker.js}` e
`toolbox/shared/analysis/{stft.js, bpm.js, key.js, loudness.js}`.

**Catena (`dna.js`).** `audio.decode(file)` → `AudioBuffer`. Poi, in quest'ordine per la memoria:
(a) i canali nativi copiati **a blocchi di 30 s** e spediti al Worker come Transferable, uno alla
volta — loudness e true peak sono streaming, ogni blocco si libera subito; (b) un
`OfflineAudioContext(1, ceil(durata·22050), 22050)` produce il **mono a 22050** con downmix e
ricampionatore nativi; (c) si perde il riferimento all'`AudioBuffer` **prima** di trasferire il mono,
unico dato residuo. Picco ≈ decodificato + 30 s.

**Worker** `dna/dna-worker.js`, `type: 'module'`, importa i quattro moduli. Se la costruzione fallisce
(Safari senza module worker) `dna.js` li importa e li esegue a fette sul thread principale: stessa
barra, stesso risultato, più lento. Messaggi `{phase, pct}` e `{result}`.

**`stft.js`** — puro, senza DOM: FFT reale in place (radix-2, tabelle precalcolate una volta), Hann
1024, hop 256 (86,13 frame/s a 22050), buffer riusati, nessuna allocazione per frame. Espone anche
`spectralFlux`: differenza positiva rettificata fra magnitudini consecutive, somma fino a 8 kHz.

**`bpm.js`** — onset envelope dal flusso spettrale, sbiancata (media mobile su 0,5 s sottratta, poi
rettifica); autocorrelazione sui ritardi di **60–200 BPM** e punteggio a comb-filter (somma dei primi
4 multipli del ritardo) per non premiare i submultipli; preferenza log-normale centrata su 120 BPM
(σ ≈ 0,9 ottava) fra T, T/2 e 2T. Uscita `{bpm, confidence, alternatives}`: confidenza = rapporto fra
il picco migliore e il migliore di un'altra ottava, in 0–1; sotto 0,6 la UI mostra l'alternativa e
lascia scegliere col ×2/÷2.

**`key.js`** — chroma a 12 bin dallo stesso STFT: bin fra 65 e 2000 Hz, magnitudine compressa (radice
quadrata), ripiegatura per ottava con peso gaussiano attorno a ogni semitono, mappatura su
**`prefs.get('shared','a4', 440)`** (stessa chiave della 12 §4), frame pesati dall'envelope di onset.
Correlazione di Pearson con i profili **Krumhansl-Schmuckler** maggiore e minore su 24 rotazioni;
confidenza = scarto fra prima e seconda ipotesi. Camelot: maggiore = B, minore = A, numero dal
circolo delle quinte (Do maggiore 8B, La minore 8A); compatibili = stesso numero ±1 stessa lettera,
più la relativa.

**`loudness.js`** — ITU-R BS.1770-4 **alla frequenza nativa**, canale per canale: K-weighting =
high-shelf (+3,999 dB, 1681,97 Hz, Q 0,7071) in cascata col passa-alto RLB (38,135 Hz, Q 0,5),
coefficienti ricalcolati per la frequenza del file con bilineare pre-distorta (a 48 kHz coincidono
con la tabella dello standard entro 1e-6). Blocchi 400 ms passo 100 ms (overlap 75 %), blocco =
−0,691 + 10·log10(Σ pesi · medie quadratiche), pesi 1,0 per L/R/C; **gate assoluto −70 LUFS**, poi
**relativo −10 LU** sotto la media dei sopravvissuti. LRA facoltativa (blocchi 3 s, passo 1 s, gate
−20 LU, percentili 10–95) solo oltre i 30 s. **True peak**: sovracampionamento 4× con FIR polifase a
fase lineare applicato **solo** attorno ai massimi locali entro 6 dB dal picco campione — due ordini
di grandezza in meno, stesso risultato.

**Storico.** `storage.put('dna', <ISO timestamp>, {...})`; dopo ogni scrittura `list('dna')` e `del`
oltre i 10. Record: nome, sorgente, durata, sampleRate, canali, bpm, confidenza, tonica, modo,
camelot, lufs, tp, lra. Lista compatta (nome · BPM · key · LUFS) nello stato vuoto: primo dato che
potrà alimentare i "Recenti" della dashboard. Prefs `tt.dna.target`.

**Prestazioni.** Brano di 4 minuti, telefono medio: decodifica ≈ 1,5 s, render 22050 ≈ 0,5 s,
loudness + TP ≈ 1,5 s, STFT + flusso + chroma ≈ 1,5 s, BPM ≈ 0,2 s → **≤ 6 s**. Dove tagliare, in
ordine: hop 512 (dimezza lo STFT, 23 ms bastano per 60–200 BPM); oltre 6 minuti ritmo e tonalità sui
**120 s centrali** (la loudness resta integrale); LRA spenta.

**iOS.** `decodeAudioData` su file lunghi può fallire o esaurire la memoria: `catch` dedicato con
"File troppo grande per questo telefono — prova un estratto" e avviso preventivo oltre gli 8 minuti.

**Modificati:** `shared/tools.js` (`dna` → `'live'`, `next` allo strumento successivo); `sw.js`
(VERSION alla prossima disponibile; `TOOLS` + i cinque file di `/dna/`, `SHELL` + i quattro moduli di
`shared/analysis/`); `sitemap.xml` (priorità 0.8); `manifest.webmanifest` (quarto `shortcut`);
`shared/i18n-common.js` solo se manca `tool-dna`.

## 5. Divisione del lavoro

**builder (Sonnet):** `dna/index.html` (markup dei cinque stati, id fissati qui: `#dna-drop
#dna-file #dna-record #dna-progress #dna-result #dna-bpm #dna-key #dna-lufs #dna-tp #dna-target
#dna-history #dna-status`), `dna/dna.css`, `dna/i18n.js`, `shared/tools.js`, `sw.js`, `sitemap.xml`,
`manifest.webmanifest`. Nessuna logica JS.

**implementer (Opus):** i quattro `shared/analysis/*`, `dna/dna-worker.js`, `dna/dna.js` (decodifica,
blocchi, Worker e ripiego, registrazione, progress, copia, storico IndexedDB, prefs, ARIA). Non tocca
HTML/CSS.

## 6. Criteri di accettazione

Segnali sintetici in Node: i moduli di `shared/analysis/` si importano senza DOM, prendono
`Float32Array`, restituiscono numeri.

1. Click a 128 BPM (60 s, 22050) → **128 ± 1**, confidenza > 0,6, nessuna alternativa. Click a 174 e
   a 62 → ±1.
2. Click a 90 con colpi intermedi deboli → mostra **90**, alternativa **180**, confidenza < 0,6; il
   ×2 porta a 180.
3. Triadi C-F-G (4 s ciascuna, 5 armoniche) → **Do maggiore, 8B**, compatibili 7B, 9B, 8A; trasposte
   di 3 semitoni → Mi♭ maggiore, 5B. Con `tt.shared.a4 = 432` e segnali a 432 la tonalità non cambia.
4. Seno 997 Hz a −20 dBFS **mono** → **−23,0 LUFS ± 0,1**; lo stesso su L e R → **−20,0 ± 0,1** (il
   termine −0,691 e il guadagno del K-weighting a 1 kHz si compensano). 10 s di silenzio davanti non
   spostano l'integrata oltre 0,1 LU.
5. Impulso a 0 dBFS → **true peak 0,0 dBTP ± 0,2**; campioni alternati ±0,99 → TP sopra il picco
   campione.
6. −9,3 LUFS con target Spotify → "abbassa di 4,7 dB"; −14,1 → "in target".
7. File di 4 minuti su telefono medio: **≤ 6 s**, barra sempre in avanzamento, "Annulla" ferma il
   Worker in meno di 300 ms, il heap torna al livello di partenza entro 2 s.
8. Registrazione: 10 s minimi, stop a 20 s, badge "stima", microfono spento a fine cattura; permesso
   negato → `mic-denied` e il percorso file resta usabile.
9. Testo rinominato `.mp3` → "Formato non letto" e ritorno allo stato vuoto. Undici analisi → ne
   restano 10, la più vecchia sparisce; sopravvivono al ricaricamento.
10. Nessuna richiesta di rete, nessuna violazione CSP, `_headers` invariato.
11. 390×844: ogni stato in una schermata, bersagli ≥ 44 px, progress annunciata ogni 10 %,
    reduced-motion senza transizioni; `?lang=en` traduce tutto.
12. `node scripts/check.mjs` passa (LF, parità IT/EN, precache, VERSION alzata).
13. *Da provare su iPhone:* file da 10 minuti, module worker vs ripiego, scelta file e microfono in
    PWA standalone.

## 7. Rischi e alternative scartate

- **`web-audio-beat-detector` e `realtime-bpm-analyzer`: scartate.** Danno un numero senza confidenza
  né gestione dell'ottava (le due cose che qui servono), portano un albero di dipendenze
  (`standardized-audio-context`) da vendorizzare a mano senza build step, e aggiungono una seconda
  FFT al precache mentre lo STFT serve comunque per la tonalità. Farlo da sé costa ~200 righe ed è
  testabile in Node.
- **essentia.js:** AGPL, ferma dal 2022, WASM e deroga CSP.
- **Tonalità** debole su rap/trap poco armonici e su brani che modulano: da qui la confidenza in
  parole, mai un verdetto secco.
- **Loudness alla frequenza nativa** invece di un secondo render a 48 kHz: risparmia una copia intera
  del brano, i coefficienti li verifica il criterio 4. **Downmix per la loudness** scartato: BS.1770
  somma le medie quadratiche pesate per canale, un mix largo leggerebbe basso.
- **Memoria:** il picco è la decodifica, non l'analisi; oltre i 10 minuti su iPhone il rischio resta.
