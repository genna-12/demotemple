/**
 * Tiny Temple Toolbox - DNA: l'analisi fuori dal thread della pagina.
 *
 * Module worker (`type: 'module'`): importa i quattro moduli di
 * shared/analysis e risponde con avanzamento e risultato. Se il browser
 * non regge i module worker (Safari vecchi), dna.js importa gli stessi
 * moduli e chiama `runAnalysis` sul thread principale: stesso codice,
 * stesso risultato, solo piu' lento.
 *
 * Messaggi in ingresso (uno solo per analisi, tutto trasferito):
 *   { type: 'analyse', channels: [ArrayBuffer...], sampleRate, a4 }
 * In uscita:
 *   { type: 'phase', phase, pct }   { type: 'result', result }   { type: 'error', message }
 *
 * Il downmix e la decimazione stanno qui: la pagina non rifa' un secondo
 * render con OfflineAudioContext (costava piu' dell'analisi). Si filtra
 * sopra la nuova Nyquist e si tiene un campione ogni due: 44,1 kHz ->
 * 22,05; 48 -> 24; sotto i 40 kHz si lascia com'e'. I conti usano la
 * frequenza vera, non un 22050 dato per buono.
 */

import { spectralFlux, whiten } from '/shared/analysis/stft.js';
import { bpmFromEnvelope } from '/shared/analysis/bpm.js';
import { chromaOf, keyFromChroma, CHROMA_SIZE } from '/shared/analysis/key.js';
import { analyseLoudness } from '/shared/analysis/loudness.js';

const BPM_WINDOW = 120;   // s al centro del brano: bastano per il ritmo
const CHROMA_HOP_FAST = 2048;
const DENORMAL = 1e-25;

/** Passa-basso a due poli (Butterworth), in place, con guardia denormali. */
function lowpass(data, sampleRate, cutoff) {
    const w0 = 2 * Math.PI * cutoff / sampleRate;
    const alpha = Math.sin(w0) / (2 * 0.7071);
    const cw = Math.cos(w0);
    const a0 = 1 + alpha;
    const b0 = ((1 - cw) / 2) / a0;
    const b1 = (1 - cw) / a0;
    const b2 = b0;
    const a1 = (-2 * cw) / a0;
    const a2 = (1 - alpha) / a0;
    for (let pass = 0; pass < 2; pass++) {
        let z1 = 0;
        let z2 = 0;
        for (let i = 0; i < data.length; i++) {
            const x = data[i];
            const y = b0 * x + z1;
            z1 = b1 * x - a1 * y + z2;
            z2 = b2 * x - a2 * y;
            if (z1 < DENORMAL && z1 > -DENORMAL) z1 = 0;
            if (z2 < DENORMAL && z2 > -DENORMAL) z2 = 0;
            data[i] = y;
        }
    }
}

/**
 * Downmix a un canale e decimazione intera.
 * -> { mono: Float32Array, rate }
 */
export function downmixDecimate(channels, sampleRate) {
    const n = channels[0] ? channels[0].length : 0;
    const count = channels.length || 1;
    const mixed = new Float32Array(n);
    for (let c = 0; c < count; c++) {
        const ch = channels[c];
        for (let i = 0; i < n; i++) mixed[i] += ch[i];
    }
    if (count > 1) for (let i = 0; i < n; i++) mixed[i] /= count;
    const factor = sampleRate >= 40000 ? 2 : 1;
    if (factor === 1) return { mono: mixed, rate: sampleRate };
    const rate = sampleRate / factor;
    lowpass(mixed, sampleRate, rate * 0.45); // sotto la nuova Nyquist
    const out = new Float32Array(Math.floor(n / factor));
    for (let i = 0; i < out.length; i++) out[i] = mixed[i * factor];
    return { mono: out, rate };
}

/** I 120 s centrali: il ritmo non cambia, il conto si dimezza. */
export function centralWindow(mono, rate, seconds = BPM_WINDOW) {
    const want = Math.round(seconds * rate);
    if (mono.length <= want) return mono;
    const from = Math.floor((mono.length - want) / 2);
    return mono.subarray(from, from + want);
}

/** Ritmo e tonalita' dal mono: un solo STFT per l'inviluppo. */
export function runRhythmAndKey(mono, sampleRate, { a4 = 440, onPhase = null } = {}) {
    const say = (phase, pct) => { if (onPhase) onPhase(phase, pct); };
    say('rhythm', 0);
    /* il ritmo si misura sui 120 s centrali, con l'hop fitto che serve a
       distinguere 174 da 175; la tonalita' sull'intero brano ma con una
       finestra lunga e passo largo, dove conta la frequenza non il tempo */
    const window = centralWindow(mono, sampleRate);
    const { flux, fps } = spectralFlux(window, { sampleRate });
    const env = whiten(flux, fps);
    say('rhythm', 50);
    const bpm = bpmFromEnvelope(env, fps);
    say('key', 60);
    const frames = mono.length >= CHROMA_SIZE
        ? 1 + Math.floor((mono.length - CHROMA_SIZE) / CHROMA_HOP_FAST)
        : 0;
    const weights = new Float32Array(frames).fill(1);
    const key = keyFromChroma(chromaOf(mono, sampleRate, { a4, hop: CHROMA_HOP_FAST, weights }));
    say('key', 100);
    return { bpm, key };
}

/** Tutto in una volta: e' il messaggio che manda la pagina. */
export function runAnalysis(channels, sampleRate, { a4 = 440, onPhase = null } = {}) {
    const say = (phase, pct) => { if (onPhase) onPhase(phase, pct); };
    say('loudness', 0);
    const loudness = analyseLoudness(channels, sampleRate);
    say('loudness', 100);
    say('rhythm', 0);
    const { mono, rate } = downmixDecimate(channels, sampleRate);
    channels.length = 0; // i canali nativi non servono piu'
    const { bpm, key } = runRhythmAndKey(mono, rate, { a4, onPhase });
    return { loudness, bpm, key, monoRate: rate };
}

/** Loudness e true peak sui canali nativi (mai sul downmix). */
export function runLoudness(channels, sampleRate, { onPhase = null } = {}) {
    if (onPhase) onPhase('loudness', 0);
    const out = analyseLoudness(channels, sampleRate);
    if (onPhase) onPhase('loudness', 100);
    return out;
}

/* Nel Worker: ascolta i messaggi. Importato dalla pagina (ripiego): niente. */
if (typeof self !== 'undefined' && typeof window === 'undefined' && typeof self.postMessage === 'function') {
    const phase = (name, pct) => self.postMessage({ type: 'phase', phase: name, pct });
    self.onmessage = (e) => {
        const msg = e.data || {};
        try {
            if (msg.type === 'analyse') {
                const channels = msg.channels.map((c) => new Float32Array(c));
                self.postMessage({
                    type: 'result',
                    result: runAnalysis(channels, msg.sampleRate, { a4: msg.a4, onPhase: phase })
                });
                return;
            }
            self.postMessage({ type: 'error', message: 'messaggio sconosciuto' });
        } catch (err) {
            self.postMessage({ type: 'error', message: String(err && err.message ? err.message : err) });
        }
    };
}
