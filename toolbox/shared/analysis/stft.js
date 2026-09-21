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
 * Bande dell'inviluppo multibanda: cassa/808, corpo (rullante, basso,
 * accordi), hi-hat e percussioni. Dal microfono di un telefono la banda
 * bassa e' quella che si perde per prima e la banda alta quella che
 * sopravvive: tenerle separate permette di pesarle per quanto sono
 * davvero ritmiche (ricerca 2026-09-19, punto 9 e "multi-band onset").
 */
export const BANDS = [[30, 200], [200, 2000], [4000, 11000]];

/**
 * Flusso spettrale (differenza positiva fra magnitudini consecutive, fino
 * a `maxHz`) e, insieme, il chroma grezzo se `chroma` e' una funzione:
 * un solo passaggio di STFT per le due analisi.
 *
 * Con `bands` si ottengono nello STESSO passaggio anche i flussi delle
 * singole bande: costano tre accumulatori invece di uno, non una FFT in
 * piu'.
 *
 * -> { flux: Float32Array, bands: [Float32Array...]|null, frames, fps }
 */
export function spectralFlux(signal, {
    sampleRate,
    size = DEFAULT_SIZE,
    hop = DEFAULT_HOP,
    maxHz = 8000,
    bands = null,
    onFrame = null
} = {}) {
    const fft = createFft(size);
    const bins = size / 2 + 1;
    const top = Math.min(bins - 1, Math.floor(maxHz * size / sampleRate));
    const prev = new Float32Array(bins);
    const frames = frameCount(signal.length, size, hop);
    const flux = new Float32Array(frames);
    const ranges = bands ? bands.map(([lo, hi]) => [
        Math.max(1, Math.floor(lo * size / sampleRate)),
        Math.min(bins - 1, Math.ceil(hi * size / sampleRate))
    ]) : null;
    const out = ranges ? ranges.map(() => new Float32Array(frames)) : null;
    /* `prev` va aggiornato fin dove qualcuno guarda: se si ferma a `top` la
       banda alta confronta con degli zeri e il flusso diventa la magnitudine */
    const keep = ranges ? ranges.reduce((m, [, hi]) => Math.max(m, hi), top) : top;
    forEachFrame(signal, { size, hop, fft }, (mag, k) => {
        let sum = 0;
        for (let i = 0; i <= top; i++) {
            const d = mag[i] - prev[i];
            if (d > 0) sum += d;
        }
        if (ranges) {
            for (let b = 0; b < ranges.length; b++) {
                const [lo, hi] = ranges[b];
                let s = 0;
                for (let i = lo; i <= hi; i++) {
                    const d = mag[i] - prev[i];
                    if (d > 0) s += d;
                }
                out[b][k] = k === 0 ? 0 : s;
            }
        }
        for (let i = 0; i <= keep; i++) prev[i] = mag[i];
        flux[k] = k === 0 ? 0 : sum; // il primo frame non ha un "prima"
        if (onFrame) onFrame(mag, k);
    });
    return { flux, bands: out, frames: flux.length, fps: framesPerSecond(sampleRate, hop) };
}

/**
 * Passa-alto biquad (Butterworth, 2 poli) fuori posto: toglie il rumore di
 * maneggiamento e l'offset continuo del microfono del telefono prima della
 * FFT (ricerca 2026-09-19, punti 2 e 12). Torna un array NUOVO: il segnale
 * originale serve ancora al loudness e al ritmo.
 */
export function highpass(signal, sampleRate, hz = 50) {
    const out = new Float32Array(signal.length);
    const w0 = 2 * Math.PI * hz / sampleRate;
    const alpha = Math.sin(w0) / (2 * 0.7071);
    const cw = Math.cos(w0);
    const a0 = 1 + alpha;
    const b0 = ((1 + cw) / 2) / a0;
    const b1 = -(1 + cw) / a0;
    const b2 = b0;
    const a1 = (-2 * cw) / a0;
    const a2 = (1 - alpha) / a0;
    let z1 = 0;
    let z2 = 0;
    for (let i = 0; i < signal.length; i++) {
        const x = signal[i];
        const y = b0 * x + z1;
        z1 = b1 * x - a1 * y + z2;
        z2 = b2 * x - a2 * y;
        if (z1 < 1e-25 && z1 > -1e-25) z1 = 0;
        if (z2 < 1e-25 && z2 > -1e-25) z2 = 0;
        out[i] = y;
    }
    return out;
}

/**
 * Normalizza il picco a -1 dBFS (fuori posto). Il microfono del telefono
 * registra piano e con l'AGC di mezzo: i livelli assoluti non dicono nulla,
 * e senza questa normalizzazione le soglie sugli attacchi cambiano da una
 * registrazione all'altra (ricerca, punti 11 e 12).
 */
export function normalizePeak(signal, target = 0.891) {
    let peak = 0;
    for (let i = 0; i < signal.length; i++) { const v = Math.abs(signal[i]); if (v > peak) peak = v; }
    if (!(peak > 0)) return signal;
    const g = target / peak;
    if (g > 0.99 && g < 1.01) return signal;
    const out = new Float32Array(signal.length);
    for (let i = 0; i < signal.length; i++) out[i] = signal[i] * g;
    return out;
}

/**
 * Sbianca UN frame di magnitudini: divide per l'inviluppo locale (media
 * mobile larga circa un'ottava in scala logaritmica) e comprime con
 * log(1+x). Una risonanza di stanza alza un'intera banda e, senza questo,
 * fa vincere sistematicamente il semitono che ci cade sopra: e' la causa
 * piu' probabile dell'errore di tre semitoni da microfono (ricerca, punto 3).
 * Scrive in `out` (stessa lunghezza di `mag`) e non alloca nulla.
 */
export function whitenSpectrum(mag, out, bins, octaveFrac = 1, mode = 'ratio') {
    /* la larghezza della media cresce col bin: un'ottava sopra il bin i
       finisce al bin 2i, quindi il raggio e' proporzionale a i */
    const k = (Math.pow(2, octaveFrac / 2) - 1);
    let sum = 0;
    let from = 0;
    let to = -1;
    for (let i = 0; i < bins; i++) {
        const radius = Math.max(1, Math.round(i * k));
        const lo = Math.max(0, i - radius);
        const hi = Math.min(bins - 1, i + radius);
        /* finestra scorrevole: gli estremi si muovono sempre in avanti */
        while (to < hi) { to++; sum += mag[to]; }
        while (from < lo) { sum -= mag[from]; from++; }
        const mean = sum / (to - from + 1);
        if (!(mean > 1e-12)) { out[i] = 0; continue; }
        const r = mag[i] / mean;
        /* 'ratio' tiene la gerarchia fra parziali dentro l'ottava (serve:
           senza, un'armonica debole pesa quanto la fondamentale), 'log'
           schiaccia tutto ed e' utile solo per confronti */
        out[i] = mode === 'none' ? Math.sqrt(mag[i]) : mode === 'log' ? Math.log(1 + r) : mode === 'sqrt' ? Math.sqrt(r) : r;
    }
    return out;
}

/**
 * Picchi locali di un frame con interpolazione parabolica a 3 punti:
 * -> quanti ne ha trovati; `freqs[j]` e `amps[j]` (array forniti da chi
 * chiama, riusati a ogni frame) contengono frequenza esatta e ampiezza.
 */
export function pickPeaks(mag, bins, sampleRate, size, freqs, amps, { minHz = 0, maxHz = Infinity, floor = 0 } = {}) {
    const binHz = sampleRate / size;
    const lo = Math.max(1, Math.floor(minHz / binHz));
    const hi = Math.min(bins - 2, Math.ceil(maxHz / binHz));
    let count = 0;
    for (let i = lo; i <= hi && count < freqs.length; i++) {
        const b = mag[i];
        if (b <= floor || b < mag[i - 1] || b < mag[i + 1]) continue;
        const a = mag[i - 1];
        const c = mag[i + 1];
        const den = a - 2 * b + c;
        const shift = den !== 0 ? 0.5 * (a - c) / den : 0;
        const delta = Math.abs(shift) <= 1 ? shift : 0;
        freqs[count] = (i + delta) * binHz;
        amps[count] = b - 0.25 * (a - c) * delta;   // vertice della parabola
        count++;
    }
    return count;
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
