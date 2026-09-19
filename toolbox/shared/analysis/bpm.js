/**
 * Tiny Temple Toolbox - stima del BPM (spec 13 §4).
 *
 * Modulo puro (nessun DOM): inviluppo degli attacchi dal flusso spettrale,
 * autocorrelazione sui ritardi che stanno fra 60 e 200 BPM, punteggio a
 * pettine (si sommano i primi quattro multipli del ritardo) per non
 * premiare i sottomultipli, poi una preferenza log-normale centrata su
 * 120 BPM per scegliere fra T, T/2 e 2T.
 *
 * `bpmFromEnvelope(env, fps)` lavora su un inviluppo gia' pronto (il
 * Worker lo calcola una volta sola insieme al chroma); `analyseBpm(signal,
 * sampleRate)` fa tutto da se' (normalizzando prima il picco).
 *
 * Dalla ricerca del 19 settembre 2026 c'e' anche il beat tracking a
 * programmazione dinamica di Ellis (2007): si piazzano i battiti che
 * massimizzano l'energia raccolta meno la penalita' per gli intervalli
 * irregolari, e si guarda quanta di quell'energia e' finita davvero sui
 * battiti. E' una verifica di FASE, non di forma: serve a scegliere
 * l'ottava e, soprattutto, a dire quanto crederci. La confidenza mette
 * insieme quattro cose (§14 della ricerca): stacco fra le ottave, qualita'
 * della griglia, quanti battiti si sono visti (sotto 8 si scende) e quanti
 * attacchi ci sono al secondo.
 */

import { spectralFlux, whiten, normalizePeak } from './stft.js';

export const BPM_MIN = 60;
export const BPM_MAX = 200;
const COMB = 4;            // quanti multipli del ritardo si sommano
const PRIOR_CENTER = 120;  // BPM preferito a parita' di punteggio
const PRIOR_SIGMA = 0.9;   // in ottave

const prior = (bpm) => Math.exp(-0.5 * Math.pow(Math.log2(bpm / PRIOR_CENTER) / PRIOR_SIGMA, 2));

/**
 * Quanto bene una griglia di battiti lunga `lag` spiega l'inviluppo.
 * Si ripiega l'inviluppo modulo il ritardo (una passata sola), si cerca
 * la fase migliore e si guarda:
 *   coverage = quanta energia degli attacchi cade sui battiti
 *   perBeat  = quanta energia c'e' in media su OGNI battito
 * Il prodotto boccia sia le griglie troppo lente (si perdono colpi) sia
 * quelle troppo veloci (meta' battiti vuoti): e' il modo per scegliere
 * l'ottava giusta.
 */
function salience(env, lag, fps) {
    const n = env.length;
    if (!(lag >= 2)) return 0;
    /* Si ripiega sulla FASE (i/lag), non sul resto della divisione intera:
       con un periodo di 40,37 frame un fold da 40 slitta di 24 frame in
       un minuto e spalma tutto. Era questo a far vincere ogni tanto la
       meta' del BPM giusto. */
    const size = Math.max(8, Math.min(256, Math.round(lag)));
    const folded = new Float64Array(size);
    let total = 0;
    for (let i = 0; i < n; i++) {
        const phase = (i / lag) % 1;
        let b = Math.floor(phase * size);
        if (b >= size) b = size - 1;
        folded[b] += env[i];
        total += env[i];
    }
    if (total <= 0) return 0;
    /* +-60 ms attorno al battito, misurati in bin di fase */
    const tol = Math.max(1, Math.round(size * (fps * 0.06) / lag));
    let best = 0;
    for (let p = 0; p < size; p++) {
        let sum = 0;
        for (let d = -tol; d <= tol; d++) sum += folded[((p + d) % size + size) % size];
        if (sum > best) best = sum;
    }
    const beats = Math.max(1, n / lag);
    return (best / total) * (best / beats);
}

/** Autocorrelazione normalizzata per un solo ritardo. */
function autocorr(env, lag) {
    let sum = 0;
    for (let i = lag; i < env.length; i++) sum += env[i] * env[i - lag];
    return sum / (env.length - lag);
}

const TIGHTNESS = 100;     // quanto la griglia deve restare regolare (Ellis)
const MIN_BEATS = 8;       // sotto: registrazione troppo corta per crederci
const MIN_ONSETS = 0.8;    // attacchi al secondo sotto i quali non si stima

/**
 * Beat tracking a programmazione dinamica (Ellis 2007), sull'inviluppo gia'
 * calcolato. Massimizza `somma(env sui battiti) - tightness * log(dt/periodo)^2`
 * e poi ripercorre la griglia migliore.
 * -> { beats: Int32Array (indici di frame), score: 0-1 }
 * Lo `score` dice quanta energia degli attacchi cade DAVVERO sui battiti
 * previsti: e' una verifica di fase, non una somiglianza di forma, ed e'
 * il segnale di confidenza piu' diretto che abbiamo (ricerca, punto 8).
 */
export function beatTrack(env, fps, bpm) {
    const empty = { beats: [], score: 0 };
    const n = env.length;
    if (!n || !(bpm > 0)) return empty;
    const period = fps * 60 / bpm;
    if (!(period >= 2) || n < period * 3) return empty;
    let mean = 0;
    for (let i = 0; i < n; i++) mean += env[i];
    mean /= n;
    if (!(mean > 0)) return empty;

    const score = new Float64Array(n);
    const back = new Int32Array(n).fill(-1);
    const from = Math.max(1, Math.round(period / 2));
    const to = Math.max(from + 1, Math.round(period * 2));
    /* penalita' di transizione: log-gaussiana attorno al periodo */
    const pen = new Float64Array(to - from + 1);
    for (let d = from; d <= to; d++) {
        const l = Math.log(d / period);
        pen[d - from] = -TIGHTNESS * l * l;
    }
    for (let i = 0; i < n; i++) {
        let bestScore = 0;
        let bestJ = -1;
        const lo = Math.max(0, i - to);
        const hi = i - from;
        for (let j = lo; j <= hi; j++) {
            const s = score[j] + pen[i - j - from];
            if (bestJ < 0 || s > bestScore) { bestScore = s; bestJ = j; }
        }
        score[i] = env[i] / mean + (bestJ >= 0 ? bestScore : 0);
        back[i] = bestJ;
    }
    /* si parte dall'ultimo frame buono e si torna indietro */
    let end = -1;
    for (let i = Math.max(0, n - Math.round(period)); i < n; i++) if (end < 0 || score[i] > score[end]) end = i;
    if (end < 0) return empty;
    const beats = [];
    for (let i = end; i >= 0; i = back[i]) {
        beats.push(i);
        if (back[i] < 0) break;
    }
    beats.reverse();
    if (beats.length < 2) return empty;
    /* Quanto vale la griglia: l'energia che ci cade sopra, confrontata con
       la migliore possibile (gli N attacchi piu' forti, con N = numero di
       battiti). 1 = la griglia ha preso proprio i colpi piu' forti, 0 =
       cade nel vuoto. E' una misura limitata fra 0 e 1, quindi utile come
       confidenza (una media sul valore medio saturava subito). */
    let onBeat = 0;
    beats.forEach((i) => { onBeat += env[i]; });
    const sorted = Array.from(env).sort((a, b) => b - a);
    let top = 0;
    for (let i = 0; i < beats.length && i < sorted.length; i++) top += sorted[i];
    const align = top > 0 ? onBeat / top : 0;
    return { beats, score: Math.max(0, Math.min(1, align)), align, period };
}

/**
 * Periodo affinato sui battiti trovati dal DP: la media dei loro intervalli
 * (scartati gli sbandamenti oltre il 15%) ha una precisione sotto il frame,
 * mentre la griglia dei ritardi interi vale 3 BPM a 120 (lag 43 = 120,2,
 * lag 42 = 123,1). Si accetta solo se resta nella stessa ottava: il DP non
 * deve poter cambiare la scelta fatta prima.
 * -> { bpm, align, beats }
 */
export function refineWithBeats(env, fps, bpm) {
    const track = beatTrack(env, fps, bpm);
    const beats = track.beats;
    if (!beats || beats.length < 6) return { bpm, align: track.score, beats: beats || [] };
    const gaps = [];
    for (let i = 1; i < beats.length; i++) gaps.push(beats[i] - beats[i - 1]);
    const sorted = gaps.slice().sort((a, b) => a - b);
    const med = sorted[sorted.length >> 1];
    if (!(med > 0)) return { bpm, align: track.score, beats };
    let sum = 0;
    let n = 0;
    gaps.forEach((g) => { if (Math.abs(g - med) / med < 0.15) { sum += g; n++; } });
    if (n < 4) return { bpm, align: track.score, beats };
    const refined = fps * 60 / (sum / n);
    if (!(refined > 0) || Math.abs(Math.log2(refined / bpm)) > 0.3) return { bpm, align: track.score, beats };
    return { bpm: refined, align: track.score, beats };
}

/** Attacchi al secondo: sotto una certa densita' non c'e' ritmo da stimare. */
export function onsetRate(env, fps) {
    const n = env.length;
    if (!n) return 0;
    let mean = 0;
    for (let i = 0; i < n; i++) mean += env[i];
    mean /= n;
    if (!(mean > 0)) return 0;
    let count = 0;
    for (let i = 1; i < n - 1; i++) {
        if (env[i] > mean && env[i] >= env[i - 1] && env[i] > env[i + 1]) count++;
    }
    return count / (n / fps);
}

/**
 * bpmFromEnvelope(env, fps, { min, max }) ->
 *   { bpm, confidence, alternatives: [bpm...], scores }
 * confidence = quanto il vincitore stacca la migliore ipotesi di un'altra
 * ottava (0-1): sotto 0,6 la pagina mostra l'alternativa col x2 / :2.
 */
export function bpmFromEnvelope(env, fps, { min = BPM_MIN, max = BPM_MAX } = {}) {
    const empty = { bpm: 0, confidence: 0, alternatives: [], scores: [] };
    if (!env || env.length < fps * 2) return empty;
    const lagMin = Math.max(2, Math.floor(fps * 60 / max));
    const lagMax = Math.min(env.length - 2, Math.ceil(fps * 60 / min));
    if (lagMax <= lagMin) return empty;

    const scores = [];
    let best = null;
    for (let lag = lagMin; lag <= lagMax; lag++) {
        /* pettine: il vero periodo risuona anche sui suoi multipli, un
           sottomultiplo no (gli mancano meta' dei colpi) */
        let score = 0;
        let used = 0;
        for (let m = 1; m <= COMB; m++) {
            const l = lag * m;
            if (l >= env.length - 1) break;
            score += autocorr(env, l) / m;
            used += 1 / m;
        }
        if (!used) continue;
        score /= used;
        const bpm = fps * 60 / lag;
        const weighted = score * prior(bpm);
        scores.push({ bpm, lag, score, weighted });
        if (!best || weighted > best.weighted) best = scores[scores.length - 1];
    }
    if (!best) return empty;

    /* Raffinamento parabolico del picco: la griglia dei ritardi interi e'
       grossolana (a 120 BPM un lag vale 3 BPM), quindi si interpola la
       parabola sui tre punti attorno al vincitore. Si usa la sola
       autocorrelazione al ritardo, non il punteggio a pettine: il pettine
       somma anche i multipli e sposta il vertice. */
    let bpm = best.bpm;
    const peak = autocorr(env, best.lag);
    const left = best.lag - 1 >= 2 ? autocorr(env, best.lag - 1) : peak;
    const right = best.lag + 1 < env.length - 1 ? autocorr(env, best.lag + 1) : peak;
    const den = left - 2 * peak + right;
    if (den !== 0) {
        const shift = 0.5 * (left - right) / den;
        if (Math.abs(shift) <= 1) bpm = fps * 60 / (best.lag + shift);
    }

    /* scelta dell'ottava fra meta', uguale e doppio: qui decide quanta
       energia sta sui battiti e quanti battiti restano vuoti */
    const family = [bpm / 2, bpm, bpm * 2]
        .filter((v) => v >= min && v <= max)
        .map((v) => {
            const lag = fps * 60 / v;
            /* alla copertura degli attacchi si aggiunge la verifica di fase:
               una griglia a 64 BPM "copre" tutto ma meta' dei battiti non ha
               nessun attacco sotto, e il DP se ne accorge */
            const track = beatTrack(env, fps, v);
            return { bpm: v, align: track.score, value: salience(env, lag, fps) * prior(v) * (0.4 + 0.6 * track.score) };
        })
        .sort((a, b) => b.value - a.value);
    const winnerRaw = family[0] || { bpm, value: 1, align: 0 };
    /* ultimo controllo: i battiti veri trovati dal DP danno il periodo con
       una precisione che la griglia dei ritardi non ha */
    const refined = refineWithBeats(env, fps, winnerRaw.bpm);
    const winner = { bpm: refined.bpm, value: winnerRaw.value, align: refined.align };
    const rival = family[1] || null;
    const octave = rival && winner.value > 0
        ? Math.max(0, Math.min(1, 1 - rival.value / winner.value))
        : 1;

    /* Confidenza onesta (§14 della ricerca): quanto si stacca l'ottava
       giusta, quanto la griglia sta davvero sugli attacchi, quanti battiti
       si sono potuti osservare e quanti attacchi ci sono per secondo. */
    const seconds = env.length / fps;
    const beats = seconds / (60 / winner.bpm);
    const lengthFactor = Math.max(0, Math.min(1, beats / MIN_BEATS));
    const density = onsetRate(env, fps);
    const densityFactor = Math.max(0, Math.min(1, density / MIN_ONSETS));
    const alignFactor = Math.max(0, Math.min(1, 0.3 + 0.7 * winner.align));
    const confidence = Math.max(0, Math.min(1, octave * alignFactor * lengthFactor * densityFactor));

    const alternatives = [];
    if (confidence < 0.6 && rival) alternatives.push(Math.round(rival.bpm));
    return {
        bpm: Math.round(winner.bpm * 10) / 10,
        confidence,
        alternatives,
        octave,
        align: winner.align,
        beats,
        density,
        scores
    };
}

/**
 * Comodo: dal segnale al BPM. Il picco viene normalizzato prima di tutto
 * (ricerca, punti 11-12: dal microfono i livelli assoluti non dicono
 * nulla e le soglie sugli attacchi cambierebbero a ogni registrazione).
 */
export function analyseBpm(signal, sampleRate, opts = {}) {
    const { flux, fps } = spectralFlux(normalizePeak(signal), { sampleRate, ...opts });
    return bpmFromEnvelope(whiten(flux, fps), fps, opts);
}

/** Raddoppia o dimezza restando dentro i limiti utili. */
export function fold(bpm, factor) {
    const v = bpm * factor;
    if (v < BPM_MIN || v > BPM_MAX * 1.5) return bpm;
    return Math.round(v * 10) / 10;
}
