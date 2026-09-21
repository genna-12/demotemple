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
 * Il risultato porta sempre `rms` (dBFS) e `silent`: sotto -60 dBFS di RMS
 * o -50 LUFS non si calcolano ne' BPM ne' tonalita' (sarebbero inventati)
 * e la pagina mostra "Nessun suono rilevato".
 *
 * Dal 19 settembre 2026 la tonalita' non esce piu' da un chroma globale ma
 * da estimateKey(): HPCP con picchi interpolati, sbiancamento dello spettro
 * e segmenti di 5 s che votano (shared/analysis/key.js). Il BPM ha in piu'
 * la verifica di fase con il beat tracking DP. Il segnale entra sempre
 * normalizzato di picco: dal microfono i livelli assoluti non dicono nulla.
 *
 * Il downmix e la decimazione stanno qui: la pagina non rifa' un secondo
 * render con OfflineAudioContext (costava piu' dell'analisi). Si filtra
 * sopra la nuova Nyquist e si tiene un campione ogni due: 44,1 kHz ->
 * 22,05; 48 -> 24; sotto i 40 kHz si lascia com'e'. I conti usano la
 * frequenza vera, non un 22050 dato per buono.
 */

import { spectralFlux, whiten, normalizePeak, BANDS } from '/shared/analysis/stft.js';
import { bpmFromEnvelope } from '/shared/analysis/bpm.js';
import { estimateKey, CHROMA_SIZE } from '/shared/analysis/key.js';
import { analyseLoudness } from '/shared/analysis/loudness.js';

const BPM_WINDOW = 120;   // s al centro del brano: bastano per il ritmo
const CHROMA_HOP_FAST = 2048;
const MIC_CHROMA_SIZE = 8192;  // dal microfono serve piu' risoluzione
const MIC_SKIP = 0.5;          // s: i primi mezzo secondo sono sempre sporchi
const DENORMAL = 1e-25;
/* Sotto queste soglie non c'e' musica, c'e' il fruscio del convertitore:
   analizzarlo darebbe un BPM e una tonalita' inventati (feedback Genna,
   rumore a -90 dBFS che tornava "128 BPM / Do maggiore"). */
const SILENT_DBFS = -60;
const SILENT_LUFS = -50;
const EMPTY_BPM = { bpm: 0, confidence: 0, alternatives: [] };
const EMPTY_KEY = { tonic: '', mode: 'major', camelot: '', confidence: 0 };

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

/** RMS integrato di tutti i canali, in dBFS (-Infinity sul silenzio vero). */
export function rmsDbfs(channels) {
    let sum = 0;
    let n = 0;
    for (let c = 0; c < channels.length; c++) {
        const ch = channels[c];
        for (let i = 0; i < ch.length; i++) sum += ch[i] * ch[i];
        n += ch.length;
    }
    if (!n) return -Infinity;
    const rms = Math.sqrt(sum / n);
    return rms > 0 ? 20 * Math.log10(rms) : -Infinity;
}

/** Livello troppo basso per dire qualcosa: la forma `!(a > b)` copre NaN. */
export function isSilent(rms, lufs) {
    return !(rms > SILENT_DBFS) || !(lufs > SILENT_LUFS);
}

/** I 120 s centrali: il ritmo non cambia, il conto si dimezza. */
export function centralWindow(mono, rate, seconds = BPM_WINDOW) {
    const want = Math.round(seconds * rate);
    if (mono.length <= want) return mono;
    const from = Math.floor((mono.length - want) / 2);
    return mono.subarray(from, from + want);
}

/** Ritmo e tonalita' dal mono: un solo STFT per l'inviluppo. */
export function runRhythmAndKey(mono, sampleRate, { a4 = 440, onPhase = null, mic = false } = {}) {
    const say = (phase, pct) => { if (onPhase) onPhase(phase, pct); };
    say('rhythm', 0);
    if (mic) {
        /* il microfono parte con un colpo di gain e col rumore della stanza:
           mezzo secondo si butta, e il chroma vuole una finestra piu' lunga */
        const skip = Math.min(mono.length, Math.round(MIC_SKIP * sampleRate));
        if (mono.length - skip > sampleRate) mono = mono.subarray(skip);
    }
    /* il ritmo si misura sui 120 s centrali, con l'hop fitto che serve a
       distinguere 174 da 175; la tonalita' sulla stessa finestra, a
       segmenti di 5 s che votano (ricerca 2026-09-19, punto 4): su un
       brano intero costerebbe il doppio senza dire nulla di piu'.
       Il picco viene normalizzato: dal microfono i livelli assoluti non
       dicono niente (punti 11-12). */
    const window = normalizePeak(centralWindow(mono, sampleRate));
    /* le bande (cassa, corpo, hi-hat) escono dallo STESSO passaggio di STFT:
       servono a pesare per quanto ogni banda e' ritmica e a leggere la
       suddivisione, cioe' a non leggere un trap a 140 come 70 */
    const { flux, bands, fps } = spectralFlux(window, { sampleRate, bands: BANDS });
    const env = whiten(flux, fps);
    say('rhythm', 50);
    const bpm = bpmFromEnvelope(env, fps, { bands: bands ? bands.map((b) => whiten(b, fps)) : null });
    say('key', 60);
    const size = mic ? MIC_CHROMA_SIZE : CHROMA_SIZE;
    const hop = mic ? MIC_CHROMA_SIZE / 4 : CHROMA_HOP_FAST;
    const key = estimateKey(window, sampleRate, { a4, size, hop });
    say('key', 100);
    return { bpm, key };
}

/** Tutto in una volta: e' il messaggio che manda la pagina. */
export function runAnalysis(channels, sampleRate, { a4 = 440, onPhase = null, mic = false } = {}) {
    const say = (phase, pct) => { if (onPhase) onPhase(phase, pct); };
    say('loudness', 0);
    const loudness = analyseLoudness(channels, sampleRate);
    const rms = rmsDbfs(channels);
    say('loudness', 100);
    /* niente segnale: si dice, non si inventa un BPM */
    if (isSilent(rms, loudness.lufs)) {
        channels.length = 0;
        say('key', 100);
        return { loudness, rms, silent: true, bpm: EMPTY_BPM, key: EMPTY_KEY, monoRate: sampleRate };
    }
    say('rhythm', 0);
    const { mono, rate } = downmixDecimate(channels, sampleRate);
    channels.length = 0; // i canali nativi non servono piu'
    const { bpm, key } = runRhythmAndKey(mono, rate, { a4, onPhase, mic });
    return { loudness, rms, silent: false, bpm, key, monoRate: rate };
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
                    result: runAnalysis(channels, msg.sampleRate, { a4: msg.a4, mic: !!msg.mic, onPhase: phase })
                });
                return;
            }
            self.postMessage({ type: 'error', message: 'messaggio sconosciuto' });
        } catch (err) {
            self.postMessage({ type: 'error', message: String(err && err.message ? err.message : err) });
        }
    };
}
