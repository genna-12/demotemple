/**
 * Banco di valutazione DNA - generatore di brani sintetici.
 *
 * Batteria da rumore filtrato (cassa, rullante, hi-hat, clap, 808), corde
 * Karplus-Strong e pad/stab additivi, basso, melodia. Quattro arrangiamenti
 * (pop/rock 4/4, hip-hop/trap, house 4-on-the-floor, ballata acustica senza
 * batteria), progressioni I-V-vi-IV / ii-V-I / i-VI-III-VII / modali, tutte
 * le 24 tonalita', tempi 60-180, swing, dinamica strofa/ritornello.
 *
 * La verita' e' nota per costruzione: `renderTrack` torna anche `truth`.
 * Tutto dipende solo da `seed`: stesso caso, stesso segnale, sempre.
 */

import { mulberry32, hzOf, biquad, applyBiquad, mixInto, envelope, addSine, noise, normalize } from './dsp.mjs';

export const SAMPLE_RATE = 22050;
export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/* ------------------------------------------------------------------ *
 * Strumenti
 * ------------------------------------------------------------------ */

/** Cassa: seno che scende di intonazione + un click di rumore. */
export function kick(sr, rnd, { decay = 0.24, f0 = 118, f1 = 45, drop = 0.03 } = {}) {
    const n = Math.round(sr * decay * 2.6);
    const b = new Float32Array(n);
    let phase = 0;
    for (let i = 0; i < n; i++) {
        const t = i / sr;
        const f = f1 + (f0 - f1) * Math.exp(-t / drop);
        phase += 2 * Math.PI * f / sr;
        b[i] = Math.sin(phase) * Math.exp(-t / decay);
    }
    const click = noise(Math.round(sr * 0.006), rnd);
    applyBiquad(click, biquad('highpass', sr, 1800));
    envelope(click, sr, 0.0002, 0.002);
    mixInto(b, click, 0, 0.35);
    return b;
}

/** Rullante: rumore a banda larga + due toni di pelle. */
export function snare(sr, rnd, { decay = 0.13 } = {}) {
    const n = Math.round(sr * decay * 3);
    const b = noise(n, rnd);
    applyBiquad(b, biquad('highpass', sr, 700));
    applyBiquad(b, biquad('lowpass', sr, 7000));
    envelope(b, sr, 0.0005, decay);
    for (let i = 0; i < n; i++) {
        const t = i / sr;
        const e = Math.exp(-t / (decay * 0.6));
        b[i] += 0.35 * e * (Math.sin(2 * Math.PI * 185 * t) + 0.7 * Math.sin(2 * Math.PI * 332 * t));
    }
    return b;
}

/** Hi-hat: rumore passa-alto, chiuso o aperto. */
export function hat(sr, rnd, { open = false } = {}) {
    const decay = open ? 0.2 : 0.028;
    const n = Math.round(sr * decay * 3.2);
    const b = noise(n, rnd);
    applyBiquad(b, biquad('highpass', sr, 6200));
    applyBiquad(b, biquad('highpass', sr, 6200));
    return envelope(b, sr, 0.0003, decay);
}

/** Clap: quattro rimbalzi ravvicinati con una coda. */
export function clap(sr, rnd) {
    const n = Math.round(sr * 0.22);
    const b = new Float32Array(n);
    [0, 0.009, 0.018, 0.028].forEach((t, k) => {
        const m = Math.round(sr * 0.02);
        const burst = noise(m, rnd);
        envelope(burst, sr, 0.0003, 0.008);
        mixInto(b, burst, t * sr, k === 3 ? 1 : 0.7);
    });
    const tail = noise(Math.round(sr * 0.16), rnd);
    envelope(tail, sr, 0.001, 0.05);
    mixInto(b, tail, sr * 0.03, 0.35);
    applyBiquad(b, biquad('bandpass', sr, 1300, 0.8));
    return b;
}

/**
 * 808: sub tenuto con una caduta d'intonazione iniziale e un filo di
 * saturazione. Nel trap l'armonia vive quasi solo qui: e' una NOTA, non
 * un transiente, e la tonalita' va letta da questa linea.
 */
export function sub808(sr, hz, seconds) {
    const n = Math.round(sr * seconds);
    const b = new Float32Array(n);
    let phase = 0;
    const tau = Math.max(0.12, seconds * 0.55);
    for (let i = 0; i < n; i++) {
        const t = i / sr;
        const f = hz * (1 + 0.32 * Math.exp(-t / 0.028));
        phase += 2 * Math.PI * f / sr;
        const atk = t < 0.004 ? t / 0.004 : 1;
        const rel = i > n - sr * 0.02 ? Math.max(0, (n - i) / (sr * 0.02)) : 1;
        b[i] = Math.tanh(1.6 * Math.sin(phase)) * Math.exp(-t / tau) * atk * rel;
    }
    return b;
}

/** Corda pizzicata (Karplus-Strong con ritardo frazionario). */
export function karplus(sr, hz, seconds, rnd, { damp = 0.5, bright = 1 } = {}) {
    const n = Math.round(sr * seconds);
    /* il filtro di anello ritarda di circa damp/(1-damp) campioni: senza
       questa correzione la corda suona calante di 15-20 cent sugli acuti e
       il chroma del banco si sporca da solo */
    const delay = Math.max(2, sr / hz - damp / (1 - damp));
    const len = Math.max(2, Math.ceil(delay) + 1);
    const buf = new Float32Array(len);
    for (let i = 0; i < len; i++) buf[i] = (rnd() * 2 - 1) * bright;
    /* eccitazione filtrata: un plettro vero non e' rumore bianco, e il
       rumore bianco riempie tutte le classi di altezza */
    applyBiquad(buf, biquad('lowpass', sr, 2600, 0.7));
    const out = new Float32Array(n);
    let pos = 0;
    let prev = 0;
    for (let i = 0; i < n; i++) {
        /* lettura frazionaria: l'intonazione deve essere giusta al cent */
        const read = pos - delay;
        const r0 = ((Math.floor(read) % len) + len) % len;
        const r1 = (r0 + 1) % len;
        const frac = read - Math.floor(read);
        const v = buf[r0] * (1 - frac) + buf[r1] * frac;
        const filtered = (1 - damp) * v + damp * prev;
        prev = filtered;
        buf[pos % len] = filtered * 0.996;
        out[i] = filtered;
        pos++;
    }
    const rel = Math.round(sr * 0.02);
    for (let i = 0; i < rel && i < n; i++) out[n - 1 - i] *= i / rel;
    return out;
}

/** Pad/stab additivo: parziali con pendenza regolabile. */
export function additive(sr, hz, seconds, { partials = 7, slope = 1.1, attack = 0.012, decay = 1.5, detune = 0 } = {}) {
    const n = Math.round(sr * seconds);
    const b = new Float32Array(n);
    for (let h = 1; h <= partials; h++) {
        const f = hz * h * (1 + detune * (h - 1));
        if (f > sr * 0.45) break;
        addSine(b, 2 * Math.PI * f / sr, 1 / Math.pow(h, slope), n);
    }
    envelope(b, sr, attack, decay);
    const rel = Math.round(sr * 0.03);
    for (let i = 0; i < rel && i < n; i++) b[n - 1 - i] *= i / rel;
    return b;
}

/* ------------------------------------------------------------------ *
 * Armonia
 * ------------------------------------------------------------------ */

const QUALITY = { maj: [0, 4, 7], min: [0, 3, 7], maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10], dom7: [0, 4, 7, 10] };

export const SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    mixolydian: [0, 2, 4, 5, 7, 9, 10]
};

/**
 * Giri armonici. `root` e' in semitoni dalla tonica.
 * Il modo dichiarato e' quello VERO del brano; `parent` e' l'etichetta
 * maggiore/minore piu' vicina, che e' quella che un sistema tonale puo'
 * al massimo azzeccare (serve al punteggio MIREX).
 */
export const PROGRESSIONS = {
    'I-V-vi-IV': { mode: 'major', parent: 'major', chords: [[0, 'maj'], [7, 'maj'], [9, 'min'], [5, 'maj']] },
    'ii-V-I': { mode: 'major', parent: 'major', chords: [[2, 'min7'], [7, 'dom7'], [0, 'maj7'], [0, 'maj7']] },
    'i-VI-III-VII': { mode: 'minor', parent: 'minor', chords: [[0, 'min'], [8, 'maj'], [3, 'maj'], [10, 'maj']] },
    'i-IV-dorico': { mode: 'dorian', parent: 'minor', chords: [[0, 'min7'], [5, 'maj'], [0, 'min7'], [5, 'maj']] },
    'I-bVII-IV-misolidio': { mode: 'mixolydian', parent: 'major', chords: [[0, 'maj'], [10, 'maj'], [5, 'maj'], [0, 'maj']] }
};

/** Voci dell'accordo, tonica in basso. `baseMidi` deve essere un Do. */
function voicing(tonicPc, rootOffset, quality, baseMidi) {
    const root = baseMidi + tonicPc + rootOffset;
    return QUALITY[quality].map((iv) => root + iv);
}

/* ------------------------------------------------------------------ *
 * Arrangiamento
 * ------------------------------------------------------------------ */

/** Istante (in secondi) del sedicesimo `step` dall'inizio, con swing. */
function stepTime(step, beat, swing, unit) {
    const t = step * beat / 4;
    if (!swing) return t;
    if (unit === 16) return step % 2 === 1 ? t + swing * beat / 4 : t;
    return step % 4 === 2 ? t + swing * beat / 2 : t;
}

/**
 * renderTrack(spec) -> { signal, sampleRate, truth }
 * spec: { genre, tonicPc, progression, bpm, swing, seconds, seed }
 */
export function renderTrack(spec) {
    const sr = SAMPLE_RATE;
    const rnd = mulberry32(spec.seed);
    const seconds = spec.seconds || 32;
    const n = Math.round(seconds * sr);
    const mix = new Float32Array(n);
    const beat = 60 / spec.bpm;
    const bar = beat * 4;
    const bars = Math.ceil(seconds / bar);
    const prog = PROGRESSIONS[spec.progression];
    const scale = SCALES[prog.mode];
    const swingUnit = spec.genre === 'trap' ? 16 : 8;
    const swing = spec.swing || 0;

    /* i colpi di batteria non dipendono dall'altezza: si sintetizzano una
       volta sola e si ricopiano (altrimenti il banco non sta nei due minuti) */
    const kickBuf = kick(sr, rnd, spec.genre === 'trap' ? { decay: 0.3, f0: 95, f1: 42 } : {});
    const snareBuf = snare(sr, rnd);
    const hatClosed = hat(sr, rnd, { open: false });
    const hatOpen = hat(sr, rnd, { open: true });
    const clapBuf = clap(sr, rnd);

    const at = (barIdx, step) => (barIdx * bar + stepTime(step, beat, swing, swingUnit)) * sr;
    const hit = (buf, barIdx, step, gain) => mixInto(mix, buf, at(barIdx, step), gain);
    /* il giro si ripete ogni quattro battute: la stessa nota additiva si
       sintetizza una volta e si ricopia (il guadagno lo mette mixInto) */
    const cache = new Map();
    const tone = (hz, dur, opts) => {
        const k = hz.toFixed(2) + '|' + dur.toFixed(3) + '|' + JSON.stringify(opts);
        let v = cache.get(k);
        if (!v) { v = additive(sr, hz, dur, opts); cache.set(k, v); }
        return v;
    };

    for (let b = 0; b < bars; b++) {
        const chordIdx = b % prog.chords.length;
        const [rootOffset, quality] = prog.chords[chordIdx];
        /* dinamica: strofa piu' piano, ritornello pieno, coda piu' morbida */
        const section = b < 4 ? 0.68 : b < 12 ? 1 : 0.85;
        const rootMidi = 36 + spec.tonicPc + rootOffset;

        if (spec.genre === 'pop') {
            hit(kickBuf, b, 0, 0.95 * section);
            hit(kickBuf, b, 8, 0.85 * section);
            if (b % 2 === 1) hit(kickBuf, b, 10, 0.5 * section);
            hit(snareBuf, b, 4, 0.75 * section);
            hit(snareBuf, b, 12, 0.75 * section);
            for (let s = 0; s < 16; s += 2) hit(hatClosed, b, s, (s % 4 === 0 ? 0.3 : 0.2) * section);
            /* basso: fondamentale sugli ottavi forti, quinta ogni tanto */
            [[0, 0], [6, 7], [8, 0], [14, rndPick(rnd, [0, 7, 12])]].forEach(([s, iv]) => {
                mixInto(mix, tone(hzOf(rootMidi + iv), beat * 0.55, { partials: 4, slope: 1.4, decay: beat * 0.35 }), at(b, s), 0.42 * section);
            });
            /* accordo: pad tenuto + stab sul battere */
            voicing(spec.tonicPc, rootOffset, quality, 60).forEach((m) => {
                mixInto(mix, tone(hzOf(m), bar * 0.95, { partials: 6, slope: 1.3, attack: 0.03, decay: bar * 0.6 }), at(b, 0), 0.17 * section);
                mixInto(mix, tone(hzOf(m), beat * 0.5, { partials: 5, slope: 1, decay: beat * 0.25 }), at(b, 8), 0.14 * section);
            });
            melody(mix, sr, rnd, spec, scale, b, bar, beat, section * 0.16, [0, 6, 10], tone);
        } else if (spec.genre === 'trap') {
            hit(kickBuf, b, 0, 0.95 * section);
            hit(kickBuf, b, 11, 0.7 * section);
            if (b % 2 === 1) hit(kickBuf, b, 6, 0.55 * section);
            /* rullante in mezza velocita': e' questo a far percepire 70 e
               non 140 ed e' il caso in cui l'ottava si sbaglia */
            hit(snareBuf, b, 8, 0.8 * section);
            for (let s = 0; s < 16; s++) {
                hit(hatClosed, b, s, (s % 4 === 0 ? 0.26 : 0.18) * section);
                /* roll a terzine su un quarto ogni due battute */
                if (b % 2 === 1 && s === 12) {
                    for (let k = 1; k < 3; k++) mixInto(mix, hatClosed, (b * bar + (s * beat / 4) + k * beat / 12) * sr, 0.16 * section);
                }
            }
            /* 808: la nota lunga che porta l'armonia */
            mixInto(mix, sub808(sr, hzOf(rootMidi - 12), bar * 0.62), at(b, 0), 0.85 * section);
            mixInto(mix, sub808(sr, hzOf(rootMidi - 12), bar * 0.3), at(b, 11), 0.6 * section);
            /* sopra: solo un pad rado e un lead pizzicato (arrangiamento povero) */
            voicing(spec.tonicPc, rootOffset, quality, 60).forEach((m) => {
                mixInto(mix, tone(hzOf(m), bar * 0.5, { partials: 4, slope: 1.6, attack: 0.05, decay: bar * 0.3 }), at(b, 0), 0.08 * section);
            });
            melody(mix, sr, rnd, spec, scale, b, bar, beat, section * 0.1, [2, 10], tone);
        } else if (spec.genre === 'house') {
            for (let s = 0; s < 16; s += 4) hit(kickBuf, b, s, 0.95 * section);
            hit(clapBuf, b, 4, 0.5 * section);
            hit(clapBuf, b, 12, 0.5 * section);
            for (let s = 2; s < 16; s += 4) hit(hatOpen, b, s, 0.22 * section);
            /* basso in levare */
            for (let s = 2; s < 16; s += 4) {
                mixInto(mix, tone(hzOf(rootMidi + (s === 10 ? 12 : 0)), beat * 0.45, { partials: 5, slope: 1.3, decay: beat * 0.2 }), at(b, s), 0.4 * section);
            }
            voicing(spec.tonicPc, rootOffset, quality, 60).forEach((m) => {
                [2, 6, 11].forEach((s) => mixInto(mix, tone(hzOf(m), beat * 0.4, { partials: 6, slope: 0.9, attack: 0.004, decay: beat * 0.18 }), at(b, s), 0.14 * section));
                mixInto(mix, tone(hzOf(m + 12), bar, { partials: 3, slope: 1.5, attack: 0.15, decay: bar }), at(b, 0), 0.07 * section);
            });
        } else { /* ballad: nessuna batteria */
            const voice = voicing(spec.tonicPc, rootOffset, quality, 48);
            /* arpeggio di chitarra in ottavi */
            for (let s = 0; s < 16; s += 2) {
                const m = voice[(s / 2) % voice.length] + (s >= 8 ? 12 : 0);
                mixInto(mix, karplus(sr, hzOf(m), beat * 0.9, rnd, { damp: 0.42 }), at(b, s), (s % 4 === 0 ? 0.5 : 0.34) * section);
            }
            /* pad d'archi e basso tenuto */
            voice.forEach((m) => mixInto(mix, tone(hzOf(m + 12), bar, { partials: 8, slope: 1.2, attack: 0.25, decay: bar }), at(b, 0), 0.07 * section));
            mixInto(mix, tone(hzOf(rootMidi), bar * 0.9, { partials: 4, slope: 1.5, attack: 0.02, decay: bar * 0.7 }), at(b, 0), 0.3 * section);
            melody(mix, sr, rnd, spec, scale, b, bar, beat, section * 0.2, [0, 8], tone);
        }
    }

    /* dissolvenze: nessuna registrazione vera inizia e finisce di netto */
    const fadeIn = Math.round(sr * 0.25);
    const fadeOut = Math.round(sr * 0.8);
    for (let i = 0; i < fadeIn; i++) mix[i] *= i / fadeIn;
    for (let i = 0; i < fadeOut; i++) mix[n - 1 - i] *= i / fadeOut;
    normalize(mix, 0.89);

    return {
        signal: mix,
        sampleRate: sr,
        truth: {
            bpm: spec.bpm,
            tonic: NOTES[spec.tonicPc],
            mode: prog.parent,
            realMode: prog.mode,
            genre: spec.genre,
            progression: spec.progression
        }
    };
}

function rndPick(rnd, list) { return list[Math.floor(rnd() * list.length) % list.length]; }

/* Una melodia vera non pesca gradi a caso: sta soprattutto su tonica,
   quinta e terza. Con i gradi equiprobabili il chroma di un giro minore
   diventa identico a quello della sua relativa maggiore e nessun sistema
   al mondo potrebbe distinguerli: era il banco a essere irreale. */
const DEGREE_WEIGHTS = [0.30, 0.07, 0.16, 0.09, 0.23, 0.08, 0.07];
function pickDegree(rnd) {
    let r = rnd();
    for (let i = 0; i < DEGREE_WEIGHTS.length; i++) {
        r -= DEGREE_WEIGHTS[i];
        if (r <= 0) return i;
    }
    return 0;
}

/** Melodia: gradi della scala sopra l'accordo, un suono per posizione. */
function melody(mix, sr, rnd, spec, scale, barIdx, bar, beat, gain, steps, tone) {
    if (!gain) return;
    steps.forEach((s) => {
        if (rnd() < 0.25) return;
        const deg = pickDegree(rnd);
        const midi = 72 + spec.tonicPc + scale[deg] + (rnd() < 0.2 ? 12 : 0);
        const dur = beat * (rnd() < 0.3 ? 1.4 : 0.7);
        const t = (barIdx * bar + s * beat / 4) * sr;
        mixInto(mix, tone(hzOf(midi), dur, { partials: 5, slope: 1.2, attack: 0.02, decay: dur * 0.5 }), t, gain);
    });
}
