# Ricerca: BPM e tonalità da microfono (19 settembre 2026)

Ricerca completata. Ho letto bpm.js/key.js/stft.js (STFT 1024/hop512 per il flusso, chroma 4096/hop1024 con sqrt-compression e soppressione fissa 0.45/0.20 delle armoniche, K-S Pearson, autocorrelazione+comb con prior log-gaussiano σ=0.9 ottave centrato a 120 BPM) e verificato le tecniche via letteratura primaria. Sotto il report richiesto (≤1500 parole, IT).

## Tonalità

**1. HPCP con peak-picking invece di chroma a bin fisso — priorità ALTA**
Cosa cambia: invece di sommare direttamente `sqrt(mag[bin])` nel bin più vicino, si trovano prima i picchi locali dello spettro (interpolazione parabolica a 3 punti per la frequenza esatta), poi ogni picco contribuisce a TUTTI i 12 semitoni con un kernel a coseno/gaussiana largo ~1 semitono (non solo al più vicino). Essentia usa pcpSize=36 (3 bin/semitono), banda 20–3500 Hz (Gómez originale 100–5000 Hz), pesatura armonica esponenziale `slope=0.6` su `numHarmonics=4` (contro i due coefficienti fissi 0.45/0.20 attuali, che funzionano solo per triadi pulite). Guadagno: è la base di tutti i sistemi che battono K-S puro nei benchmark MIREX (vedi Sha'ath sotto); non ho trovato un numero isolato solo-per-HPCP, ma è il salto architetturale più citato in letteratura. Costo: medio (peak-picking + interpolazione per frame, ancora O(bin) per frame, no FFT aggiuntive).

**2. Restringere la banda a 55–1760 Hz + high-pass pre-FFT — priorità ALTA**
Cosa cambia: la banda attuale (65–2000 Hz) va stretta verso il basso (togliere il rumore/handling <55 Hz del microfono del telefono) e verso l'alto (togliere il fruscio/aliasing oltre 1760 Hz, spesso enfatizzato dalla risposta in frequenza di casse/microfono economici). Sha'ath usa 6 ottave C1–B6 (32,7–1975 Hz) su registrazioni studio; per il microfono conviene la banda più stretta indicata nel brief. Costo: nullo (solo cambio di due costanti + un biquad high-pass 2° ordine ~50 Hz prima della FFT).

**3. Whitening/log-compression dello spettro prima del chroma — priorità ALTA**
Cosa cambia: normalizzare ogni frame per il proprio inviluppo spettrale locale (media mobile ~1 ottava) o applicare `log(1+mag/eps)` prima di mappare sui bin, così la colorazione timbrica di stanza/altoparlante (una risonanza che alza un'intera banda) non fa vincere sistematicamente il semitono che ci cade sopra. È la causa più plausibile dell'errore di 3 semitoni da microfono: una risonanza di stanza o del piccolo speaker del telefono altera l'ampiezza relativa delle classi di altezza in modo non uniforme, e la sola sqrt-compression attuale non la compensa. Costo: basso (una convoluzione 1D per frame sullo spettro).

**4. Voto/mediana su segmenti temporali (4–6 s) invece di chroma media globale — priorità ALTA**
Cosa cambia: calcolare HPCP+key per finestre di 4–6 s con hop 2–3 s, poi prendere la moda (o il centroide pesato per confidenza di segmento) invece di mediare tutto il segnale in un unico chroma. Protegge da un singolo tratto riverberato/silenzioso che sbilancia l'intera stima globale — esattamente lo scenario "casse del telefono in una stanza" del brief. Costo: basso, si riusa la pipeline esistente più volte su una finestra di 10–25 s.

**5. Stima del tuning prima di quantizzare — priorità MEDIA (evidenza mista)**
Cosa cambia: istogramma delle deviazioni in cent dei picchi spettrali dal semitono più vicino (pesato per magnitudine), poi si sposta il riferimento A4 di conseguenza prima di costruire il chroma. Guadagno: Lerch (2006) riporta +6 punti su classificazione accordi jazz (70,8%→76,9%, dataset piccolo, non significativo statisticamente); Sha'ath riporta invece che i suoi due algoritmi di tuning (Harte quadratic-interp e "bin-adaptive") **non hanno migliorato** l'accuratezza nel suo dataset. Conclusione onesta: tecnica a basso rischio/basso costo ma guadagno non garantito — da provare ma non da considerare risolutiva.

**6. Metrica di confronto e profili multipli — priorità MEDIA**
Cosa cambia: (a) Sha'ath riporta che la **cosine similarity** batte la correlazione di Pearson classica (nel suo dataset primario: Sha'ath+cosine ≈75 punti MIREX-weighted vs Krumhansl+Pearson ≈65, Temperley ≈60 — per confronto, KeyFinder finale 68,6 vs Mixed In Key 62,1 vs Rapid Evolution 50,9 sullo stesso benchmark); (b) offrire più set di profili (K-S, Temperley, Sha'ath, e per musica elettronica EDMA/EDMM di Faraldo — pensati apposta per tracce con armonia debole/drone, dove K-S classico fallisce sistematicamente) e far votare la maggioranza, usando il disaccordo fra profili come ulteriore segnale di confidenza. Costo: trascurabile (sono solo tabelle di 12 numeri diverse, correlazione già calcolata).

## BPM

**7. Prior log-gaussiano centrato a 120 BPM — GIÀ CORRETTO, solo conferma**
Il codice attuale (`PRIOR_CENTER=120`, `PRIOR_SIGMA=0.9` ottave) coincide con la formula di Ellis (2007): `W(τ)=exp(-0.5·(log2(τ/τ0)/στ)²)`, τ0=0,5s (120 BPM). Ellis usa σ=1,4 ottave nella versione originale, ridotto a 0,9 nella versione raffinata — esattamente il valore già in uso. Nessuna azione necessaria qui.

**8. Beat-tracking a programmazione dinamica per fase/consistenza — priorità ALTA**
Cosa cambia: dopo aver stimato il periodo globale τ, usare DP (O(n), con backtrace) per piazzare gli istanti di battito che massimizzano `Σ O(beat_i) + Σ transition(Δt, τ)` (transition anch'essa log-gaussiana attorno a τ). Il punteggio medio di allineamento locale della griglia ottenuta è un segnale di confidenza molto più diretto della sola autocorrelazione, perché verifica "esiste davvero un attacco a ogni battito previsto" — risponde esattamente alla richiesta "verifica di fase/consistenza" e aiuta la disambiguazione d'ottava meglio della sola `salience()` attuale. Costo: basso, un solo passaggio DP in più sull'inviluppo già calcolato.

**9. Onset/flux multibanda con log-compression — priorità MEDIA (non ALTA)**
Nota importante: Dixon (2006, "Onset Detection Revisited") trova che nei suoi test **la magnitudine lineare con norma L1 batte quella logaritmica**, e non raccomanda esplicitamente il multibanda per onset percussivi puliti (F-measure 0,984 su percussione, 0,964 su piano complesso). Per il caso specifico "microfono di telefono" però la banda bassa (cassa/basso) è quella più degradata dagli altoparlanti dei telefoni (roll-off tipico sotto 150–300 Hz) mentre la banda media sopravvive meglio: separare 2–3 bande e pesare per SNR stimato per banda resta utile in questo scenario anche se la letteratura "clean signal" non lo richiede. Costo: medio (richiede 2-3 flussi paralleli).

**10. Finestra minima consigliata — CONFERMA, priorità ALTA**
Per un'autocorrelazione stabile servono almeno ~8 periodi del beat più lento in banda: a 60 BPM (periodo 1s) servono >8s, idealmente 10–15s+; la finestra 10–25s già scelta nel brief è coerente con le pratiche standard (i beat-tracker di riferimento lavorano tipicamente sull'intero brano o su estratti ≥10-15s). Nessuna modifica richiesta, solo verificare che sotto ~8s la confidenza venga automaticamente abbassata.

## Qualità del segnale dal microfono

**11. getUserMedia — priorità MEDIA**
`echoCancellation:false, noiseSuppression:false, autoGainControl:false` vanno richiesti ma **non è garantito che il browser li rispetti**: ci sono bug aperti su Chromium/WebKit dove questi flag restano parzialmente attivi lato hardware/OS soprattutto su mobile (fonte: Chromium issue tracker). Implicazione pratica: non affidarsi al flag come "segnale pulito garantito"; trattare comunque il segnale come se AGC/NS fossero parzialmente attivi (compressione dinamica imprevedibile → non fidarsi troppo dei livelli assoluti, normalizzare sempre per RMS/picco prima dell'analisi).

**12. High-pass 40–60 Hz + normalizzazione di picco — priorità MEDIA**
Biquad 2° ordine ~50 Hz per rimuovere rumore di maneggiamento/DC offset; normalizzazione a target di picco (es. -1 dBFS) prima dell'STFT, per stabilità numerica su registrazioni telefono silenziose.

**13. Realismo vs Tunebat/KeyFinder/MIK**
Questi operano su file studio puliti, spesso su un estratto di 20–30s vicino all'inizio o al ritornello, e votano su più estratti dello stesso file — stesso principio del punto 4, applicabile anche da microfono, ma il tetto di accuratezza resterà comunque più basso: la trasparenza sulla confidenza (punto 14) è più importante che inseguire l'accuratezza dei tool da file.

## Criteri di confidenza onesti

**14. Priorità ALTA, nessun costo aggiuntivo (riusa dati già calcolati)**
- Tonalità: bassa confidenza se (a) margine top1–top2 sotto soglia, (b) disaccordo fra segmenti temporali (voto di maggioranza <60%), (c) energia totale del chroma troppo bassa (silenzio/rumore).
- BPM: bassa confidenza se (a) score DP di allineamento della griglia sotto soglia, (b) densità di onset troppo bassa per la finestra osservata, (c) durata registrata sotto la finestra minima raccomandata per il BPM stimato (periodo×8).
- In entrambi i casi: mostrare esplicitamente "stima non affidabile, riprova più vicino alla sorgente / registrazione più lunga" sotto una soglia (es. confidence<0.4) invece di dare comunque un numero secco — coerente con l'obiettivo del brief.

## Fonti:
- [HPCP / Key tutorial — Essentia (UPF)](https://essentia.upf.edu/tutorial_tonal_hpcpkeyscale.html)
- [Algorithm reference: Key — Essentia](https://essentia.upf.edu/reference/std_Key.html)
- [Estimation of key in digital music recordings — Ibrahim Sha'ath (KeyFinder)](https://www.ibrahimshaath.co.uk/keyfinder/KeyFinder.pdf)
- [Lerch (2006), On the Requirement of Automatic Tuning Frequency Estimation](http://www2.users.ak.tu-berlin.de/akgroup/ak_pub/2006/Lerch_2006_On_the_Requirement_of_Automatic_Tuning_Frequency_Estimation.pdf)
- [Faraldo, Gómez et al., Key Estimation in Electronic Dance Music (EDMA/EDMM)](https://www.researchgate.net/publication/309018542_Key_Estimation_in_Electronic_Dance_Music) / [repo edmkey](https://github.com/anxefaraldo/edmkey)
- [Ellis (2007), Beat Tracking by Dynamic Programming](https://www.ee.columbia.edu/~dpwe/pubs/Ellis07-beattrack.pdf)
- [Dixon (2006), Onset Detection Revisited](https://www.ofai.at/papers/oefai-tr-2006-12.pdf)
- [Beat detection and BPM tempo estimation — Essentia tutorial](https://essentia.upf.edu/tutorial_rhythm_beatdetection.html)
- [MDN — Media Capture and Streams API: Constraints](https://developer.mozilla.org/en-US/docs/Web/API/Media_Capture_and_Streams_API/Constraints)
- [Chromium issue 327472528 — echoCancellation/noiseSuppression non disattivabili via constraints](https://issues.chromium.org/issues/327472528)

Nota per l'implementatore: i file esaminati sono `toolbox/shared/analysis/{bpm.js,key.js,stft.js}`. Il punto 7 (prior BPM) è già allineato alla letteratura; i guadagni più probabili e a basso costo sono i punti 1, 3, 4, 8 (HPCP+peak-picking, whitening spettrale, voto per segmenti, beat-tracking DP con verifica di fase).
