/**
 * Tiny Temple Toolbox - STFT e flusso spettrale (spec 13 §4).
 *
 * Modulo puro: nessun DOM, nessun import, nessuna allocazione per frame.
 * Prende Float32Array e restituisce numeri: si importa anche in Node e in
 * un Worker.
 *
 * FFT reale radix-2 in place con tabelle precalcolate una volta sola,
 * finestra di Hann, dimensione 1024 e hop 256 (86,13 frame al secondo a
 * 22050 Hz). Da qui escono sia il flusso spettrale (per il BPM) sia le
 * magnitudini (per il chroma della tonalita'): si calcola una volta e la
 * si usa due volte.
 */

export const DEFAULT_SIZE = 1024;
export const DEFAULT_HOP = 256;

/** Tabelle di una FFT di dimensione n: si creano una volta per dimensione. */
export function createFft(n) {
    const levels = Math.log2(n);
    if (!Number.isInteger(levels)) throw new Error('createFft: n deve essere una potenza di 2');
    const cos = new Float32Array(n / 2);
    const sin = new Float32Array(n / 2);
    for (let i = 0; i < n / 2; i++) {
        cos[i] = Math.cos(2 * Math.PI * i / n);
        sin[i] = Math.sin(2 * Math.PI * i / n);
    }
    const rev = new Uint32Array(n);
    for (let i = 0; i < n; i++) {
        let x = i;
        let r = 0;
        for (let b = 0; b < levels; b++) { r = (r << 1) | (x & 1); x >>= 1; }
        rev[i] = r;
    }
    return {
        n,
        /** FFT complessa in place (re/im lunghi n). */
        run(re, im) {
            for (let i = 0; i < n; i++) {
                const j = rev[i];
                if (j > i) {
                    let tmp = re[i]; re[i] = re[j]; re[j] = tmp;
                    tmp = im[i]; im[i] = im[j]; im[j] = tmp;
                }
            }
            for (let size = 2; size <= n; size <<= 1) {
                const half = size >> 1;
                const step = n / size;
                for (let i = 0; i < n; i += size) {
                    for (let j = i, k = 0; j < i + half; j++, k += step) {
                        const l = j + half;
                        const tre = re[l] * cos[k] + im[l] * sin[k];
                        const tim = -re[l] * sin[k] + im[l] * cos[k];
                        re[l] = re[j] - tre;
                        im[l] = im[j] - tim;
                        re[j] += tre;
                        im[j] += tim;
                    }
                }
            }
        }
    };
}

/** Finestra di Hann (periodica), calcolata una volta. */
export function hann(n) {
    const w = new Float32Array(n);
    for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / n);
    return w;
}

/**
 * Scorre il segnale finestra per finestra e chiama `onFrame(mag, index)`
 * con le magnitudini (size/2+1 bin). `mag` e' SEMPRE lo stesso array: chi
 * serve se lo copia, qui non si alloca niente per frame.
 */
export function forEachFrame(signal, { size = DEFAULT_SIZE, hop = DEFAULT_HOP, fft = null } = {}, onFrame) {
    const f = fft || createFft(size);
    const win = hann(size);
    const re = new Float32Array(size);
    const im = new Float32Array(size);
    const mag = new Float32Array(size / 2 + 1);
    const frames = signal.length >= size ? 1 + Math.floor((signal.length - size) / hop) : 0;
    for (let k = 0; k < frames; k++) {
        const off = k * hop;
        for (let i = 0; i < size; i++) {
            re[i] = signal[off + i] * win[i];
            im[i] = 0;
        }
        f.run(re, im);
        for (let i = 0; i <= size / 2; i++) mag[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
        onFrame(mag, k);
    }
    return frames;
}

/** Quanti frame produce un segnale con questi parametri. */
export function frameCount(length, size = DEFAULT_SIZE, hop = DEFAULT_HOP) {
    return length >= size ? 1 + Math.floor((length - size) / hop) : 0;
}

/** Frame al secondo: serve a leggere in BPM i ritardi dell'autocorrelazione. */
export const framesPerSecond = (sampleRate, hop = DEFAULT_HOP) => sampleRate / hop;

/**
 * Flusso spettrale (differenza positiva fra magnitudini consecutive, fino
 * a `maxHz`) e, insieme, il chroma grezzo se `chroma` e' una funzione:
 * un solo passaggio di STFT per le due analisi.
 *
 * -> { flux: Float32Array, frames, fps }
 */
export function spectralFlux(signal, {
    sampleRate,
    size = DEFAULT_SIZE,
    hop = DEFAULT_HOP,
    maxHz = 8000,
    onFrame = null
} = {}) {
    const fft = createFft(size);
    const bins = size / 2 + 1;
    const top = Math.min(bins - 1, Math.floor(maxHz * size / sampleRate));
    const prev = new Float32Array(bins);
    const flux = new Float32Array(frameCount(signal.length, size, hop));
    forEachFrame(signal, { size, hop, fft }, (mag, k) => {
        let sum = 0;
        for (let i = 0; i <= top; i++) {
            const d = mag[i] - prev[i];
            if (d > 0) sum += d;
            prev[i] = mag[i];
        }
        flux[k] = k === 0 ? 0 : sum; // il primo frame non ha un "prima"
        if (onFrame) onFrame(mag, k);
    });
    return { flux, frames: flux.length, fps: framesPerSecond(sampleRate, hop) };
}

/**
 * Sbianca l'inviluppo: toglie la media mobile (0,5 s) e rettifica, cosi'
 * conta il profilo degli attacchi e non il volume del pezzo.
 */
export function whiten(env, fps, seconds = 0.5) {
    const n = env.length;
    const out = new Float32Array(n);
    const half = Math.max(1, Math.round(fps * seconds / 2));
    let sum = 0;
    let count = 0;
    /* media mobile con somma scorrevole: O(n) */
    for (let i = 0; i < Math.min(n, half + 1); i++) { sum += env[i]; count++; }
    for (let i = 0; i < n; i++) {
        const mean = count ? sum / count : 0;
        const v = env[i] - mean;
        out[i] = v > 0 ? v : 0;
        const add = i + half + 1;
        const drop = i - half;
        if (add < n) { sum += env[add]; count++; }
        if (drop >= 0) { sum -= env[drop]; count--; }
    }
    return out;
}
