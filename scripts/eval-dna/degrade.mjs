/**
 * Banco di valutazione DNA - degradazione "microfono".
 *
 * Simula la catena vera del caso d'uso: musica dalla cassa di un telefono,
 * ripresa dal microfono di un altro telefono dall'altra parte della stanza.
 *   1. cassa del telefono: passa-alto 250 Hz ripido + due risonanze + taglio
 *      sopra gli 8 kHz;
 *   2. stanza: riverbero a pettini e passa-tutto (Schroeder), RT60 regolabile;
 *   3. rumore rosa di fondo a SNR dato;
 *   4. AGC del telefono: compressore con attacco/rilascio e guadagno di
 *      recupero (i livelli assoluti non vogliono dire piu' niente);
 *   5. clipping: l'AGC spinge e l'ultimo stadio taglia.
 */

import { mulberry32, biquad, applyBiquad, pinkNoise, rms, normalize } from './dsp.mjs';

/** Risposta di un altoparlantino: niente sotto i 250 Hz, due bozzi in mezzo. */
export function phoneSpeaker(buf, sr) {
    applyBiquad(buf, biquad('highpass', sr, 250, 0.9));
    applyBiquad(buf, biquad('highpass', sr, 250, 0.9));
    applyBiquad(buf, biquad('peaking', sr, 850, 2.2, 6));
    applyBiquad(buf, biquad('peaking', sr, 2600, 3.0, 7.5));
    applyBiquad(buf, biquad('peaking', sr, 1500, 4.0, -4));
    applyBiquad(buf, biquad('lowpass', sr, 8000, 0.8));
    return buf;
}

/** Riverbero di Schroeder: quattro pettini in parallelo, due passa-tutto. */
export function room(buf, sr, { rt60 = 0.45, wet = 0.3 } = {}) {
    const combs = [0.0297, 0.0371, 0.0411, 0.0437];
    const allpass = [0.005, 0.0017];
    const out = new Float32Array(buf.length);
    combs.forEach((d) => {
        const len = Math.max(1, Math.round(d * sr));
        const g = Math.pow(10, -3 * d / rt60);
        const line = new Float32Array(len);
        let p = 0;
        let lp = 0;
        for (let i = 0; i < buf.length; i++) {
            const y = line[p];
            lp = 0.75 * lp + 0.25 * y;     // le pareti assorbono gli acuti
            line[p] = buf[i] + lp * g;
            p = p + 1 === len ? 0 : p + 1;
            out[i] += y * 0.25;
        }
    });
    allpass.forEach((d) => {
        const len = Math.max(1, Math.round(d * sr));
        const g = 0.7;
        const line = new Float32Array(len);
        let p = 0;
        for (let i = 0; i < out.length; i++) {
            const y = line[p];
            const x = out[i];
            line[p] = x + y * g;
            out[i] = y - g * line[p];
            p = p + 1 === len ? 0 : p + 1;
        }
    });
    for (let i = 0; i < buf.length; i++) buf[i] = buf[i] * (1 - wet) + out[i] * wet;
    return buf;
}

/** Rumore rosa additivo al rapporto segnale/rumore richiesto. */
export function addNoise(buf, rnd, snrDb = 18) {
    const sig = rms(buf);
    if (!(sig > 0)) return buf;
    const target = sig / Math.pow(10, snrDb / 20);
    const nz = pinkNoise(buf.length, rnd);
    const g = target / (rms(nz) || 1);
    for (let i = 0; i < buf.length; i++) buf[i] += nz[i] * g;
    return buf;
}

/**
 * AGC del telefono: guadagno che insegue il livello con attacco veloce e
 * rilascio lento. Schiaccia la dinamica strofa/ritornello, che e' proprio
 * quello che rende i livelli assoluti inutilizzabili (ricerca, punto 11).
 */
export function agc(buf, sr, { target = 0.2, attack = 0.01, release = 0.5, maxGain = 8 } = {}) {
    const aA = Math.exp(-1 / (attack * sr));
    const aR = Math.exp(-1 / (release * sr));
    let env = 0;
    let gain = 1;
    for (let i = 0; i < buf.length; i++) {
        const x = Math.abs(buf[i]);
        env = x > env ? aA * env + (1 - aA) * x : aR * env + (1 - aR) * x;
        const want = env > 1e-5 ? Math.min(maxGain, target / env) : maxGain;
        gain = want < gain ? aA * gain + (1 - aA) * want : aR * gain + (1 - aR) * want;
        buf[i] *= gain;
    }
    return buf;
}

/** Clipping duro dell'ultimo stadio. */
export function clip(buf, level = 0.92) {
    for (let i = 0; i < buf.length; i++) {
        if (buf[i] > level) buf[i] = level;
        else if (buf[i] < -level) buf[i] = -level;
    }
    return buf;
}

/**
 * La catena completa. `strength` 0-1 sceglie quanto e' brutta la ripresa
 * (0 = stanza piccola e silenziosa, 1 = stanza vuota e telefono lontano).
 */
export function micify(signal, sr, { seed = 1, strength = 0.6 } = {}) {
    const rnd = mulberry32(seed ^ 0x9e3779b9);
    const buf = Float32Array.from(signal);
    phoneSpeaker(buf, sr);
    room(buf, sr, { rt60: 0.3 + 0.5 * strength, wet: 0.18 + 0.22 * strength });
    addNoise(buf, rnd, 26 - 12 * strength);
    agc(buf, sr, { target: 0.22, attack: 0.008, release: 0.35 + 0.3 * strength });
    clip(buf, 0.95 - 0.08 * strength);
    return normalize(buf, 0.89);
}
