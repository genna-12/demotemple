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
 * sampleRate)` fa tutto da se'.
 */

import { spectralFlux, whiten } from './stft.js';

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
    const size = Math.max(2, Math.round(lag));
    const folded = new Float64Array(size);
    let total = 0;
    for (let i = 0; i < n; i++) {
        folded[i % size] += env[i];
        total += env[i];
    }
    if (total <= 0) return 0;
    const tol = Math.max(1, Math.round(fps * 0.06)); // +-60 ms attorno al battito
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

    /* raffinamento: parabola sui tre ritardi attorno al vincitore */
    const i = scores.indexOf(best);
    let bpm = best.bpm;
    if (i > 0 && i < scores.length - 1) {
        const a = scores[i - 1].score;
        const b = best.score;
        const c = scores[i + 1].score;
        const den = a - 2 * b + c;
        if (den !== 0) {
            const shift = 0.5 * (a - c) / den;
            if (Math.abs(shift) <= 1) bpm = fps * 60 / (best.lag + shift);
        }
    }

    /* scelta dell'ottava fra meta', uguale e doppio: qui decide quanta
       energia sta sui battiti e quanti battiti restano vuoti */
    const family = [bpm / 2, bpm, bpm * 2]
        .filter((v) => v >= min && v <= max)
        .map((v) => {
            const lag = fps * 60 / v;
            return { bpm: v, value: salience(env, lag, fps) * prior(v) };
        })
        .sort((a, b) => b.value - a.value);
    const winner = family[0] || { bpm, value: 1 };
    const rival = family[1] || null;
    const confidence = rival && winner.value > 0
        ? Math.max(0, Math.min(1, 1 - rival.value / winner.value))
        : 1;

    const alternatives = [];
    if (confidence < 0.6 && rival) alternatives.push(Math.round(rival.bpm));
    return {
        bpm: Math.round(winner.bpm * 10) / 10,
        confidence,
        alternatives,
        scores
    };
}

/** Comodo: dal segnale al BPM, calcolando l'inviluppo per conto proprio. */
export function analyseBpm(signal, sampleRate, opts = {}) {
    const { flux, fps } = spectralFlux(signal, { sampleRate, ...opts });
    return bpmFromEnvelope(whiten(flux, fps), fps, opts);
}

/** Raddoppia o dimezza restando dentro i limiti utili. */
export function fold(bpm, factor) {
    const v = bpm * factor;
    if (v < BPM_MIN || v > BPM_MAX * 1.5) return bpm;
    return Math.round(v * 10) / 10;
}
