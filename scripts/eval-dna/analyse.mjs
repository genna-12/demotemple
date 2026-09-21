/**
 * Banco di valutazione DNA - la stessa catena del Worker, importabile in Node.
 *
 * `toolbox/dna/dna-worker.js` importa con percorsi assoluti (`/shared/...`),
 * che in Node non si risolvono: qui si rifanno gli stessi passaggi con gli
 * stessi parametri (finestra centrale di 120 s, chroma 4096/2048 da file e
 * 8192/2048 dal microfono con mezzo secondo buttato all'inizio). Se cambia
 * dna-worker.js, va cambiato anche questo: e' l'unico punto di contatto.
 */

import { spectralFlux, whiten, normalizePeak, BANDS } from '../../toolbox/shared/analysis/stft.js';
import { bpmFromEnvelope } from '../../toolbox/shared/analysis/bpm.js';
import { estimateKey, CHROMA_SIZE } from '../../toolbox/shared/analysis/key.js';

const BPM_WINDOW = 120;
const CHROMA_HOP_FAST = 2048;
const MIC_CHROMA_SIZE = 8192;
const MIC_SKIP = 0.5;

function centralWindow(mono, rate, seconds = BPM_WINDOW) {
    const want = Math.round(seconds * rate);
    if (mono.length <= want) return mono;
    const from = Math.floor((mono.length - want) / 2);
    return mono.subarray(from, from + want);
}

/** -> { bpm, key, ms } con gli stessi campi che vedrebbe la pagina. */
export function analyse(signal, sampleRate, { mic = false, a4 = 440 } = {}) {
    const t0 = Date.now();
    let mono = signal;
    if (mic) {
        const skip = Math.min(mono.length, Math.round(MIC_SKIP * sampleRate));
        if (mono.length - skip > sampleRate) mono = mono.subarray(skip);
    }
    const window = normalizePeak(centralWindow(mono, sampleRate));
    const { flux, bands, fps } = spectralFlux(window, { sampleRate, bands: BANDS });
    const env = whiten(flux, fps);
    const bpm = bpmFromEnvelope(env, fps, { bands: bands ? bands.map((b) => whiten(b, fps)) : null });
    const size = mic ? MIC_CHROMA_SIZE : CHROMA_SIZE;
    const hop = mic ? MIC_CHROMA_SIZE / 4 : CHROMA_HOP_FAST;
    const key = estimateKey(window, sampleRate, { a4, size, hop });
    return { bpm, key, ms: Date.now() - t0 };
}
