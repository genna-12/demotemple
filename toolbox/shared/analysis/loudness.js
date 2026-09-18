/**
 * Tiny Temple Toolbox - loudness ITU-R BS.1770-4 (spec 13 §4).
 *
 * Modulo puro (nessun DOM). Si misura alla frequenza del file, canale per
 * canale: BS.1770 somma le medie quadratiche pesate per canale, quindi un
 * downmix leggerebbe basso.
 *
 * K-weighting = shelving alto (+3,999 dB a 1681,97 Hz, Q 0,7071) in
 * cascata col passa-alto RLB (38,135 Hz, Q 0,5). I coefficienti si
 * ricalcolano per la frequenza del file (formule RBJ, che pre-distorcono
 * la frequenza): a 48 kHz coincidono con la tabella dello standard.
 *
 * Blocchi da 400 ms con passo 100 ms, gate assoluto -70 LUFS e gate
 * relativo -10 LU. LRA (blocchi 3 s, passo 1 s, gate -20 LU, percentili
 * 10-95) solo oltre i 30 s. True peak: sovracampionamento 4x con FIR
 * polifase, applicato solo attorno ai massimi entro 6 dB dal picco.
 */

const SHELF = { gainDb: 3.999843853973347, f0: 1681.974450955533, q: 0.7071752369554196 };
const RLB = { f0: 38.13547087602444, q: 0.5003270373238773 };
const BLOCK_MS = 400;
const STEP_MS = 100;
const ABS_GATE = -70;
const REL_GATE = 10;
const SILENCE = -Infinity;

/** Shelving alto (formule RBJ). */
function highShelf(fs) {
    const A = Math.pow(10, SHELF.gainDb / 40);
    const w0 = 2 * Math.PI * SHELF.f0 / fs;
    const cw = Math.cos(w0);
    const alpha = Math.sin(w0) / 2 * Math.sqrt((A + 1 / A) * (1 / SHELF.q - 1) + 2);
    const sa = 2 * Math.sqrt(A) * alpha;
    const a0 = (A + 1) - (A - 1) * cw + sa;
    return {
        b0: (A * ((A + 1) + (A - 1) * cw + sa)) / a0,
        b1: (-2 * A * ((A - 1) + (A + 1) * cw)) / a0,
        b2: (A * ((A + 1) + (A - 1) * cw - sa)) / a0,
        a1: (2 * ((A - 1) - (A + 1) * cw)) / a0,
        a2: ((A + 1) - (A - 1) * cw - sa) / a0
    };
}

/** Passa-alto RLB (formule RBJ). */
function highPass(fs) {
    const w0 = 2 * Math.PI * RLB.f0 / fs;
    const cw = Math.cos(w0);
    const alpha = Math.sin(w0) / (2 * RLB.q);
    const a0 = 1 + alpha;
    return {
        b0: ((1 + cw) / 2) / a0,
        b1: (-(1 + cw)) / a0,
        b2: ((1 + cw) / 2) / a0,
        a1: (-2 * cw) / a0,
        a2: (1 - alpha) / a0
    };
}

/* Sotto questa soglia i numeri diventano "denormali": l'aritmetica in
   virgola mobile ci va in crisi e il filtro rallenta di dieci volte (si
   vede su qualunque coda che si spegne). Si azzera e non si sente. */
const DENORMAL = 1e-25;

/** Biquad diretta II trasposta, in place. */
function biquad(data, c) {
    let z1 = 0;
    let z2 = 0;
    const { b0, b1, b2, a1, a2 } = c;
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

/** Applica il K-weighting a una copia del canale. */
export function kWeight(channel, sampleRate) {
    /* .slice() copia i byte; Float32Array.from() itera elemento per
       elemento ed e' un ordine di grandezza piu' lento su milioni di
       campioni (misurato: 900 ms contro 40 su 4 minuti). */
    const out = channel.slice();
    biquad(out, highShelf(sampleRate));
    biquad(out, highPass(sampleRate));
    return out;
}

/* Peso dei canali: 1,0 per L/R/C, 1,41 per i surround (qui mai). */
const channelWeight = (i, count) => (count > 3 && i >= 3 ? 1.41 : 1.0);

/** Medie quadratiche dei blocchi (una serie per l'intera traccia). */
function blockLoudness(channels, sampleRate, blockMs, stepMs, pre = null) {
    const weighted = pre || channels.map((ch) => kWeight(ch, sampleRate));
    const block = Math.round(sampleRate * blockMs / 1000);
    const step = Math.round(sampleRate * stepMs / 1000);
    const n = weighted[0] ? weighted[0].length : 0;
    const out = [];
    if (n < block) return out;
    /* somme scorrevoli dei quadrati: un passaggio solo per canale */
    const sums = weighted.map((ch) => {
        let s = 0;
        for (let i = 0; i < block; i++) s += ch[i] * ch[i];
        return s;
    });
    for (let start = 0; start + block <= n; start += step) {
        if (start > 0) {
            for (let c = 0; c < weighted.length; c++) {
                const ch = weighted[c];
                let s = sums[c];
                for (let i = start - step; i < start; i++) s -= ch[i] * ch[i];
                for (let i = start + block - step; i < start + block; i++) s += ch[i] * ch[i];
                sums[c] = s;
            }
        }
        let sum = 0;
        for (let c = 0; c < weighted.length; c++) {
            sum += channelWeight(c, weighted.length) * (sums[c] / block);
        }
        out.push(sum > 0 ? -0.691 + 10 * Math.log10(sum) : SILENCE);
    }
    return out;
}

/** Loudness integrata con i due gate dello standard. */
export function integrated(channels, sampleRate, pre = null) {
    const blocks = blockLoudness(channels, sampleRate, BLOCK_MS, STEP_MS, pre);
    const above = blocks.filter((l) => l > ABS_GATE);
    if (!above.length) return { lufs: SILENCE, blocks };
    const meanPower = (list) => list.reduce((a, l) => a + Math.pow(10, (l + 0.691) / 10), 0) / list.length;
    const relative = -0.691 + 10 * Math.log10(meanPower(above)) - REL_GATE;
    const kept = above.filter((l) => l > relative);
    if (!kept.length) return { lufs: SILENCE, blocks };
    return { lufs: -0.691 + 10 * Math.log10(meanPower(kept)), blocks };
}

/** Escursione (LRA): quanto respira il brano. Solo oltre i 30 s. */
export function loudnessRange(channels, sampleRate, pre = null) {
    const n = channels[0] ? channels[0].length : 0;
    if (n / sampleRate < 30) return null;
    const blocks = blockLoudness(channels, sampleRate, 3000, 1000, pre).filter((l) => l > ABS_GATE);
    if (blocks.length < 5) return null;
    const meanPower = blocks.reduce((a, l) => a + Math.pow(10, (l + 0.691) / 10), 0) / blocks.length;
    const gate = -0.691 + 10 * Math.log10(meanPower) - 20;
    const kept = blocks.filter((l) => l > gate).sort((a, b) => a - b);
    if (kept.length < 2) return null;
    const at = (p) => kept[Math.min(kept.length - 1, Math.max(0, Math.round((kept.length - 1) * p)))];
    return at(0.95) - at(0.10);
}

/* FIR passa-basso a fase lineare per il sovracampionamento 4x (finestra
   di Blackman, 48 prese): abbastanza per il true peak di BS.1770. */
const TAPS = 48;
const PHASES = 4;
let polyphase = null;
function filterBank() {
    if (polyphase) return polyphase;
    const h = new Float32Array(TAPS * PHASES);
    const center = (TAPS * PHASES - 1) / 2;
    for (let i = 0; i < h.length; i++) {
        const x = i - center;
        const sinc = x === 0 ? 1 : Math.sin(Math.PI * x / PHASES) / (Math.PI * x / PHASES);
        const w = 0.42 - 0.5 * Math.cos(2 * Math.PI * i / (h.length - 1))
            + 0.08 * Math.cos(4 * Math.PI * i / (h.length - 1));
        h[i] = sinc * w;
    }
    polyphase = [];
    for (let p = 0; p < PHASES; p++) {
        const sub = new Float32Array(TAPS);
        let sum = 0;
        for (let i = 0; i < TAPS; i++) {
            sub[i] = h[i * PHASES + p];
            sum += sub[i];
        }
        /* normalizzazione: a guadagno unitario un continuo resta com'e' */
        if (sum !== 0) for (let i = 0; i < TAPS; i++) sub[i] /= sum;
        polyphase.push(sub);
    }
    return polyphase;
}

/**
 * True peak in dBTP: si guarda solo attorno ai massimi entro 6 dB dal
 * picco campione, dove il picco vero puo' nascondersi fra due campioni.
 */
export function truePeak(channels) {
    const bank = filterBank();
    let samplePeak = 0;
    channels.forEach((ch) => {
        for (let i = 0; i < ch.length; i++) {
            const a = Math.abs(ch[i]);
            if (a > samplePeak) samplePeak = a;
        }
    });
    if (samplePeak === 0) return { truePeak: SILENCE, samplePeak: SILENCE };
    const threshold = samplePeak * Math.pow(10, -6 / 20);
    let peak = samplePeak;
    const half = TAPS >> 1;
    channels.forEach((ch) => {
        for (let i = 1; i < ch.length - 1; i++) {
            const a = Math.abs(ch[i]);
            if (a < threshold) continue;
            /* solo i massimi locali: fra due campioni in salita il picco
               vero non puo' nascondersi */
            if (a < Math.abs(ch[i - 1]) || a < Math.abs(ch[i + 1])) continue;
            for (let p = 0; p < PHASES; p++) {
                const taps = bank[p];
                let acc = 0;
                for (let k = 0; k < TAPS; k++) {
                    const idx = i - half + k;
                    if (idx < 0 || idx >= ch.length) continue;
                    acc += ch[idx] * taps[k];
                }
                const a = Math.abs(acc);
                if (a > peak) peak = a;
            }
        }
    });
    return {
        truePeak: 20 * Math.log10(peak),
        samplePeak: 20 * Math.log10(samplePeak)
    };
}

/**
 * analyseLoudness([Float32Array...], sampleRate)
 *   -> { lufs, truePeak, samplePeak, lra, seconds, channels }
 */
export function analyseLoudness(channels, sampleRate) {
    const list = channels.filter(Boolean);
    const n = list[0] ? list[0].length : 0;
    /* il K-weighting si calcola una volta sola e lo usano sia l'integrata
       sia l'escursione: prima erano due filtraggi interi del brano */
    const pre = list.map((ch) => kWeight(ch, sampleRate));
    const { lufs } = integrated(list, sampleRate, pre);
    const tp = truePeak(list);
    return {
        lufs,
        truePeak: tp.truePeak,
        samplePeak: tp.samplePeak,
        lra: loudnessRange(list, sampleRate, pre),
        seconds: n / sampleRate,
        channels: list.length
    };
}

/** Target delle piattaforme (spec 13 §3) e consiglio in dB. */
export const TARGETS = {
    spotify: { lufs: -14, tp: -1 },
    apple: { lufs: -16, tp: -1 },
    youtube: { lufs: -14, tp: -1 },
    tidal: { lufs: -14, tp: -1 }
};

/** Quanto alzare o abbassare per stare nel target (0,5 LU di tolleranza). */
export function gainToTarget(lufs, target = 'spotify') {
    const t = TARGETS[target] || TARGETS.spotify;
    const diff = t.lufs - lufs;
    return {
        target: t.lufs,
        diff: Math.round(diff * 10) / 10,
        onTarget: Math.abs(diff) <= 0.5,
        direction: diff > 0 ? 'up' : 'down'
    };
}
