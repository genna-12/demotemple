/**
 * Banco di valutazione DNA - mattoni DSP comuni (Node puro, nessuna dipendenza).
 *
 * Questa cartella NON fa parte del sito: non e' pubblicata, non entra nel
 * service worker, non viene importata da nulla sotto toolbox/. Serve solo a
 * misurare l'algoritmo di analisi con brani sintetici di cui si conosce la
 * verita' per costruzione (ricerca 2026-09-19, "valutazione e miglioramenti",
 * Obiettivo 1).
 */

/** Generatore pseudocasuale riproducibile: stesso seed, stesso brano. */
export function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Frequenza di una nota MIDI. */
export const hzOf = (midi, a4 = 440) => a4 * Math.pow(2, (midi - 69) / 12);

/**
 * Coefficienti biquad (Audio EQ Cookbook). `type`:
 * lowpass | highpass | bandpass | peaking | lowshelf.
 */
export function biquad(type, sampleRate, f0, Q = 0.7071, gainDb = 0) {
    const w0 = 2 * Math.PI * Math.min(f0, sampleRate * 0.49) / sampleRate;
    const cw = Math.cos(w0);
    const sw = Math.sin(w0);
    const alpha = sw / (2 * Q);
    const A = Math.pow(10, gainDb / 40);
    let b0, b1, b2, a0, a1, a2;
    if (type === 'lowpass') {
        b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0;
        a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
    } else if (type === 'highpass') {
        b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0;
        a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
    } else if (type === 'bandpass') {
        b0 = alpha; b1 = 0; b2 = -alpha;
        a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
    } else if (type === 'peaking') {
        b0 = 1 + alpha * A; b1 = -2 * cw; b2 = 1 - alpha * A;
        a0 = 1 + alpha / A; a1 = -2 * cw; a2 = 1 - alpha / A;
    } else { // lowshelf
        const s = 2 * Math.sqrt(A) * alpha;
        b0 = A * ((A + 1) - (A - 1) * cw + s);
        b1 = 2 * A * ((A - 1) - (A + 1) * cw);
        b2 = A * ((A + 1) - (A - 1) * cw - s);
        a0 = (A + 1) + (A - 1) * cw + s;
        a1 = -2 * ((A - 1) + (A + 1) * cw);
        a2 = (A + 1) + (A - 1) * cw - s;
    }
    return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

/** Applica un biquad sul posto (forma diretta II trasposta). */
export function applyBiquad(data, c, from = 0, to = data.length) {
    let z1 = 0;
    let z2 = 0;
    for (let i = from; i < to; i++) {
        const x = data[i];
        const y = c.b0 * x + z1;
        z1 = c.b1 * x - c.a1 * y + z2;
        z2 = c.b2 * x - c.a2 * y;
        if (z1 < 1e-25 && z1 > -1e-25) z1 = 0;
        if (z2 < 1e-25 && z2 > -1e-25) z2 = 0;
        data[i] = y;
    }
    return data;
}

/** Somma `src` dentro `dst` a partire dal campione `at`, con guadagno. */
export function mixInto(dst, src, at, gain = 1) {
    const start = Math.max(0, Math.round(at));
    const n = Math.min(src.length, dst.length - start);
    for (let i = 0; i < n; i++) dst[start + i] += src[i] * gain;
}

/**
 * Inviluppo esponenziale con attacco lineare, sul posto. Il decadimento va
 * per ricorrenza (un moltiplicatore per campione) invece di un Math.exp a
 * campione: il banco genera 240 brani e la sintesi non deve costare piu'
 * dell'analisi.
 */
export function envelope(buf, sampleRate, attack, decay) {
    const a = Math.max(1, Math.round(attack * sampleRate));
    const tau = Math.max(1e-4, decay) * sampleRate;
    const step = Math.exp(-1 / tau);
    let g = 1;
    for (let i = 0; i < buf.length; i++) {
        buf[i] *= (i < a ? i / a : 1) * g;
        g *= step;
    }
    return buf;
}

/**
 * Seno per ricorrenza: y[n] = 2cos(w)y[n-1] - y[n-2]. Somma in `dst` senza
 * chiamare Math.sin a ogni campione (e' il collo di bottiglia della sintesi
 * additiva).
 */
export function addSine(dst, w, amp, n) {
    const c = 2 * Math.cos(w);
    let y1 = Math.sin(w);
    let y2 = 0;
    for (let i = 0; i < n; i++) {
        dst[i] += y2 * amp;
        const y = c * y1 - y2;
        y2 = y1;
        y1 = y;
    }
    return dst;
}

/** Rumore bianco riproducibile. */
export function noise(n, rnd) {
    const b = new Float32Array(n);
    for (let i = 0; i < n; i++) b[i] = rnd() * 2 - 1;
    return b;
}

/** Rumore rosa (filtro di Paul Kellett): il fondo di una stanza vera. */
export function pinkNoise(n, rnd) {
    const b = new Float32Array(n);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < n; i++) {
        const w = rnd() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.96900 * b2 + w * 0.1538520;
        b3 = 0.86650 * b3 + w * 0.3104856;
        b4 = 0.55000 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.0168980;
        b[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
    }
    return b;
}

/** Valore quadratico medio. */
export function rms(buf) {
    let s = 0;
    for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    return Math.sqrt(s / (buf.length || 1));
}

/** Normalizza al picco indicato (sul posto). */
export function normalize(buf, peak = 0.89) {
    let max = 0;
    for (let i = 0; i < buf.length; i++) { const v = Math.abs(buf[i]); if (v > max) max = v; }
    if (!(max > 0)) return buf;
    const g = peak / max;
    for (let i = 0; i < buf.length; i++) buf[i] *= g;
    return buf;
}
