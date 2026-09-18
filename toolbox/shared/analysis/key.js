/**
 * Tiny Temple Toolbox - tonalita' e Camelot (spec 13 §4).
 *
 * Modulo puro (nessun DOM). Chroma a 12 bin dallo STFT: si prendono i bin
 * fra 65 e 2000 Hz, si comprime la magnitudine con la radice quadrata, si
 * ripiega per ottava con un peso gaussiano attorno a ogni semitono e si
 * pesano i frame con l'inviluppo degli attacchi (dove c'e' un attacco
 * l'armonia e' piu' chiara). Il riferimento e' A4, letto dalle preferenze
 * condivise: cambiarlo non cambia la tonalita', sposta solo la griglia.
 *
 * Poi correlazione di Pearson con i profili Krumhansl-Schmuckler su 24
 * rotazioni (12 maggiori + 12 minori). La confidenza e' lo scarto fra la
 * prima e la seconda ipotesi.
 */

import { spectralFlux, whiten } from './stft.js';

export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/* Profili Krumhansl-Kessler: quanto "pesa" ogni grado in una tonalita'. */
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

/* Camelot: il numero viene dal circolo delle quinte, la lettera dal modo.
   Do maggiore 8B, La minore 8A. */
const CAMELOT_MAJOR = { C: 8, 'C#': 3, D: 10, 'D#': 5, E: 12, F: 7, 'F#': 2, G: 9, 'G#': 4, A: 11, 'A#': 6, B: 1 };
const CAMELOT_MINOR = { A: 8, 'A#': 3, B: 10, C: 5, 'C#': 12, D: 7, 'D#': 2, E: 9, F: 4, 'F#': 11, G: 6, 'G#': 1 };

export function camelotOf(tonic, mode) {
    const n = mode === 'minor' ? CAMELOT_MINOR[tonic] : CAMELOT_MAJOR[tonic];
    if (!n) return '';
    return n + (mode === 'minor' ? 'A' : 'B');
}

/** Le tonalita' che si mixano bene: stesso numero +-1 e la relativa. */
export function compatibleWith(camelot) {
    const m = /^(\d{1,2})([AB])$/.exec(String(camelot || ''));
    if (!m) return [];
    const n = Number(m[1]);
    const letter = m[2];
    const wrap = (x) => ((x - 1 + 12) % 12) + 1;
    return [wrap(n - 1) + letter, wrap(n + 1) + letter, n + (letter === 'A' ? 'B' : 'A')];
}

function pearson(a, b) {
    const n = a.length;
    let ma = 0;
    let mb = 0;
    for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
    ma /= n; mb /= n;
    let num = 0;
    let da = 0;
    let db = 0;
    for (let i = 0; i < n; i++) {
        const x = a[i] - ma;
        const y = b[i] - mb;
        num += x * y;
        da += x * x;
        db += y * y;
    }
    const den = Math.sqrt(da * db);
    return den ? num / den : 0;
}

/**
 * Chroma medio del segnale (12 valori, somma 1). `weights` opzionale pesa
 * i frame (di norma l'inviluppo degli attacchi, ricampionato sui frame
 * del chroma). La finestra qui e' piu' lunga di quella del flusso: serve
 * risoluzione in frequenza, non nel tempo.
 */
const HARM_FIFTH = 0.45;   // 3a armonica: quinta sopra
const HARM_THIRD = 0.20;   // 5a armonica: terza maggiore sopra

export const CHROMA_SIZE = 4096;   // a 22050 Hz sono 5,4 Hz per bin
export const CHROMA_HOP = 1024;

export function chromaOf(signal, sampleRate, {
    a4 = 440,
    size = CHROMA_SIZE,   // finestra lunga: sotto i 200 Hz un bin da 21 Hz
    hop = CHROMA_HOP,     // vale due semitoni e la fondamentale si perde
    weights = null,
    minHz = 65,
    maxHz = 2000,
    suppress = true       // toglie l'eco delle armoniche (vedi sotto)
} = {}) {
    const chroma = new Float32Array(12);
    const bins = size / 2 + 1;
    /* per ogni bin: a quale classe di altezza appartiene e quanto pesa */
    const binNote = new Int8Array(bins).fill(-1);
    const binWeight = new Float32Array(bins);
    for (let i = 1; i < bins; i++) {
        const hz = i * sampleRate / size;
        if (hz < minHz || hz > maxHz) continue;
        const midi = 69 + 12 * Math.log2(hz / a4);
        const nearest = Math.round(midi);
        const dist = Math.abs(midi - nearest);
        if (dist > 0.5) continue;
        binNote[i] = ((nearest % 12) + 12) % 12;
        binWeight[i] = Math.exp(-0.5 * Math.pow(dist / 0.25, 2)); // gaussiana sul semitono
    }
    spectralFlux(signal, {
        sampleRate,
        size,
        hop,
        onFrame(mag, k) {
            const w = weights ? weights[k] || 0 : 1;
            if (w <= 0) return;
            for (let i = 1; i < bins; i++) {
                const note = binNote[i];
                if (note < 0) continue;
                chroma[note] += Math.sqrt(mag[i]) * binWeight[i] * w;
            }
        }
    });
    /* Ogni nota suona anche le sue armoniche: la terza cade sulla quinta
       sopra, la quinta sulla terza maggiore sopra. Senza toglierle, una
       progressione in Mi bemolle si legge in Si bemolle. Si sottrae una
       quota fissa (misurata su triadi sintetiche: 0,45 e 0,20). */
    const out = suppress ? new Float32Array(12) : chroma;
    if (suppress) {
        for (let c = 0; c < 12; c++) out[c] = chroma[c];
        for (let c = 0; c < 12; c++) {
            out[(c + 7) % 12] -= HARM_FIFTH * chroma[c];
            out[(c + 4) % 12] -= HARM_THIRD * chroma[c];
        }
        for (let c = 0; c < 12; c++) if (out[c] < 0) out[c] = 0;
    }
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += out[i];
    if (sum > 0) for (let i = 0; i < 12; i++) out[i] /= sum;
    return out;
}

/**
 * keyFromChroma(chroma) -> { tonic, mode, camelot, confidence, compatible }
 * Confronta le 24 rotazioni dei profili e misura di quanto vince.
 */
export function keyFromChroma(chroma) {
    const rotated = new Float32Array(12);
    let best = null;
    let second = null;
    ['major', 'minor'].forEach((mode) => {
        const profile = mode === 'major' ? MAJOR : MINOR;
        for (let r = 0; r < 12; r++) {
            for (let i = 0; i < 12; i++) rotated[i] = profile[(i - r + 12) % 12];
            const score = pearson(chroma, rotated);
            const candidate = { tonic: NOTES[r], mode, score };
            if (!best || score > best.score) { second = best; best = candidate; }
            else if (!second || score > second.score) second = candidate;
        }
    });
    if (!best) return { tonic: '', mode: '', camelot: '', confidence: 0, compatible: [] };
    const camelot = camelotOf(best.tonic, best.mode);
    const confidence = second ? Math.max(0, Math.min(1, best.score - second.score)) : 1;
    return {
        tonic: best.tonic,
        mode: best.mode,
        camelot,
        confidence,
        compatible: compatibleWith(camelot),
        score: best.score
    };
}

/**
 * Porta un inviluppo calcolato con un altro hop sui frame del chroma:
 * un valore per frame, con un fondo di 1 (anche senza attacchi l'armonia
 * conta, ma dove c'e' un attacco conta di piu').
 */
export function weightsForChroma(env, envHop, chromaHop, frames) {
    const out = new Float32Array(frames);
    let max = 0;
    for (let i = 0; i < env.length; i++) if (env[i] > max) max = env[i];
    const ratio = chromaHop / envHop;
    for (let k = 0; k < frames; k++) {
        const from = Math.floor(k * ratio);
        const to = Math.min(env.length, Math.floor((k + 1) * ratio));
        let sum = 0;
        let n = 0;
        for (let i = from; i < to; i++) { sum += env[i]; n++; }
        const mean = n ? sum / n : 0;
        out[k] = max > 0 ? 1 + mean / max : 1;
    }
    return out;
}

/** Comodo: dal segnale alla tonalita'. */
export function analyseKey(signal, sampleRate, opts = {}) {
    const size = opts.size || CHROMA_SIZE;
    const hop = opts.hop || CHROMA_HOP;
    let weights = opts.weights || null;
    if (!weights) {
        const { flux } = spectralFlux(signal, { sampleRate, size: 1024, hop: 256 });
        const env = whiten(flux, sampleRate / 256);
        const frames = signal.length >= size ? 1 + Math.floor((signal.length - size) / hop) : 0;
        weights = weightsForChroma(env, 256, hop, frames);
    }
    return keyFromChroma(chromaOf(signal, sampleRate, { ...opts, size, hop, weights }));
}
