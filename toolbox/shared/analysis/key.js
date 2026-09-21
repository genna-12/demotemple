/**
 * Tiny Temple Toolbox - tonalita' e Camelot (spec 13 §4).
 *
 * Modulo puro (nessun DOM). Dopo la ricerca del 19 settembre 2026
 * (docs/toolbox/research/2026-09-19-bpm-tonalita-microfono.md) la catena e'
 * quella dei sistemi che vincono in letteratura, non piu' un chroma a bin
 * fisso:
 *
 *   passa-alto 50 Hz -> STFT -> sbiancamento dello spettro (si divide per
 *   l'inviluppo locale largo 2 ottave e si prende la radice) -> picchi con
 *   interpolazione parabolica a 3 punti -> HPCP (ogni picco contribuisce ai
 *   semitoni entro 0,67 con un kernel a coseno, e si accredita anche la
 *   fondamentale di cui potrebbe essere la 2a, 3a o 4a armonica, peso
 *   0,6^(h-1)) -> normalizzazione per frame -> similarita' coseno con
 *   QUATTRO set di profili che votano -> segmenti di 5 s (hop 2,5 s).
 *
 * Perche': da microfono una risonanza di stanza alza un'intera banda e il
 * vecchio chroma le andava dietro; la cassa del telefono taglia sotto i
 * 300 Hz e delle fondamentali resta poco, ma la pesatura armonica le
 * ricostruisce (e' il caso in cui si guadagna di piu': i giri in Do letti
 * in Sol tornano in Do). Il voto per segmenti protegge dal singolo tratto
 * riverberato o silenzioso.
 *
 * Due scelte prese MISURANDO, diverse da quelle della ricerca:
 *  - i segmenti votano con la MEDIANA dei chroma, non con la moda delle
 *    tonalita': su un giro lento un segmento contiene un accordo solo e la
 *    moda eleggeva l'accordo piu' suonato invece della tonalita';
 *  - lo sbiancamento usa la radice del rapporto e una finestra di 2 ottave:
 *    con log(1+x) su un'ottava le armoniche deboli pesavano quanto le
 *    fondamentali e il risultato slittava di una quinta.
 * La stima dell'accordatura (Lerch) e' stata provata e SCARTATA: sui segnali
 * di prova misurava 3-5 cent inesistenti e faceva perdere due casi su venti.
 *
 * La confidenza resta della stessa scala di prima (margine fra la prima e
 * la seconda ipotesi, tipicamente 0,1-0,3): la pagina la usa cosi'
 * com'e' e non va toccata. Scende quando i profili non sono d'accordo,
 * quando i segmenti non sono d'accordo o quando il chroma e' piatto.
 *
 * Dal 20 settembre 2026, misurato sul banco `scripts/eval-dna`:
 *  - MODI: dorico e misolidio hanno il loro profilo e, quando battono di un
 *    margine il diatonico "piatto" maggiore/minore, la tonica diventa la
 *    loro e il campo nuovo `keyMode` dice quale modo e'. `mode` resta
 *    maggiore/minore (il Camelot non conosce i modi). Sul banco la tonica
 *    dei brani modali passa dal 26% al 35% e il modo viene dichiarato
 *    giusto nel 22% dei casi (prima: mai).
 *  - BASS-CHROMA: c'e' (`hpcpPair` torna anche il chroma sotto i 260 Hz e
 *    quanta energia c'e' sopra i 300), ma `fuseBass` e' DISATTIVATA per
 *    difetto perche' misurata in perdita: vedi il suo commento.
 *  - CONFIDENZA calibrata sul diagramma di affidabilita' del banco
 *    (`calibrateConfidence`): la scala resta quella di prima, ma la soglia
 *    dell'"alta" cade dove l'accuratezza osservata e' davvero del 100%
 *    (prima era il 78,6%).
 *
 * API invariata: chromaOf / keyFromChroma / analyseKey / weightsForChroma
 * ci sono ancora, con gli stessi nomi e gli stessi tipi di ritorno; i campi
 * `keyMode` e `raw` sono in piu'.
 */

import { spectralFlux, whiten, highpass, whitenSpectrum, pickPeaks } from './stft.js';

export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Quattro set di profili. Nessuno e' "il" profilo giusto: K-S viene dagli
 * esperimenti di percezione, Temperley dal corpus classico, Sha'ath dalla
 * pratica dei DJ (KeyFinder), l'ultimo e' un profilo diatonico piatto con
 * tonica e quinta rinforzate, nello spirito di EDMA/EDMM (Faraldo) per la
 * musica elettronica, dove l'armonia e' debole e K-S sbaglia in modo
 * sistematico. Votano: il disaccordo abbassa la confidenza.
 */
export const PROFILES = {
    ks: {
        major: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
        minor: [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
    },
    temperley: {
        major: [0.748, 0.060, 0.488, 0.082, 0.670, 0.460, 0.096, 0.715, 0.104, 0.366, 0.057, 0.400],
        minor: [0.712, 0.084, 0.474, 0.618, 0.049, 0.460, 0.105, 0.747, 0.404, 0.067, 0.133, 0.330]
    },
    shaath: {
        major: [6.6, 2.0, 3.5, 2.3, 4.6, 4.0, 2.5, 5.2, 2.4, 3.7, 2.3, 3.4],
        minor: [6.5, 2.7, 3.5, 5.4, 2.6, 3.5, 2.5, 5.2, 4.0, 2.7, 4.3, 3.2]
    },
    /* diatonico "da ballo": i gradi della scala contano quasi uguale,
       tonica e quinta un po' di piu' (i valori esatti di EDMA non sono
       riproducibili qui: questa e' la stessa idea, non una copia) */
    edm: {
        major: [3.2, 0.6, 2.0, 0.7, 2.0, 2.0, 0.7, 2.8, 0.7, 2.0, 0.8, 2.0],
        minor: [3.2, 0.6, 2.0, 2.0, 0.7, 2.0, 0.7, 2.8, 2.0, 0.8, 2.0, 0.9]
    }
};

const PROFILE_NAMES = Object.keys(PROFILES);

/**
 * Modi che non sono ne' maggiore ne' minore. Buona parte del pop, del rock
 * e del folk ci vive dentro, e i profili tarati sulla musica tonale classica
 * ci sbagliano in modo sistematico (ricerca 2026-09-19, "gestione modale").
 * Stessa forma diatonica piatta del profilo `edm`, con tonica e quinta
 * rinforzate e il grado CARATTERISTICO in evidenza: la sesta maggiore per il
 * dorico, la settima minore per il misolidio.
 * `parent` e' l'etichetta maggiore/minore piu' vicina: serve al Camelot,
 * che non conosce i modi.
 */
export const MODAL_PROFILES = {
    dorian: { parent: 'minor', profile: [3.2, 0.6, 2.0, 2.4, 0.6, 2.0, 0.6, 2.8, 0.6, 2.4, 2.2, 0.6] },
    mixolydian: { parent: 'major', profile: [3.2, 0.6, 2.0, 0.6, 2.4, 2.0, 0.6, 2.8, 0.6, 2.0, 2.4, 0.6] }
};
const MODAL_NAMES = Object.keys(MODAL_PROFILES);
/* quanto un modo deve battere il maggiore/minore "piatto" per essere
   dichiarato: sotto questo stacco si resta sull'etichetta di sempre */
const MODAL_MARGIN = 0.04;

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

/**
 * Similarita' coseno con le medie tolte: Sha'ath la misura migliore della
 * correlazione classica, e togliendo la media il margine resta nella scala
 * di prima (la pagina non cambia soglie).
 */
function similarity(a, b) {
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

/* ------------------------------------------------------------------ *
 * HPCP
 * ------------------------------------------------------------------ */

export const CHROMA_SIZE = 4096;   // a 22050 Hz sono 5,4 Hz per bin
export const CHROMA_HOP = 1024;
export const KEY_MIN_HZ = 55;      // sotto: rumore di maneggiamento e vento
export const KEY_MAX_HZ = 1760;    // sopra: fruscio e colorazione di casse
const HARMONICS = 4;               // quante armoniche si "spiegano"
const HARM_SLOPE = 0.6;            // peso della h-esima: 0,6^(h-1)
const KERNEL_SEMITONES = 0.67;     // mezza larghezza del contributo (semitoni)
const ENVELOPE_OCTAVES = 2;        // finestra dello sbiancamento
/* La confidenza deve restare nella scala di prima (la pagina non si tocca):
   i margini dell'HPCP sono circa la meta' di quelli del vecchio chroma. */
const MARGIN_GAIN = 2;
const FLAT_MIN = 0.02;             // sotto: chroma piatto = rumore
const RELATIVE_PENALTY = 0.5;      // maggiore vs relativa minore: si dubita
const MAX_PEAKS = 96;              // per frame: piu' che sufficienti

/* Vecchi coefficienti fissi: restano solo per chromaOf({ suppress: true }),
   che non e' piu' la strada principale. */
const HARM_FIFTH = 0.45;
const HARM_THIRD = 0.20;

export const BASS_MAX_HZ = 260;    // sopra il Do centrale non e' piu' basso
export const RICH_HZ = 300;        // sopra: l'armonia "suonata" (accordi, voce)

/**
 * hpcpPair: nello STESSO passaggio di STFT escono tre cose.
 *   chroma     HPCP di tutta la banda (quello di sempre)
 *   bass       HPCP dei soli suoni sotto i 260 Hz (basso e 808)
 *   highRatio  quanta energia c'e' sopra i 300 Hz, da 0 a 1
 * Nel trap l'armonia vive quasi solo nella linea di 808 e sopra i 300 Hz
 * non c'e' quasi niente: li' il chroma del basso dice la tonica molto
 * meglio di quello pieno (ricerca 2026-09-19, "bass-chroma per hip-hop/trap").
 * `highRatio` e' il peso con cui fondere i due, e non costa una seconda FFT.
 */
export function hpcpPair(signal, sampleRate, {
    a4 = 440,
    size = CHROMA_SIZE,
    hop = CHROMA_HOP,
    weights = null,
    minHz = KEY_MIN_HZ,
    maxHz = KEY_MAX_HZ,
    harmonics = HARMONICS,
    slope = HARM_SLOPE,
    compress = 'sqrt',
    octaveFrac = ENVELOPE_OCTAVES,
    contrast = 1,
    kernel = KERNEL_SEMITONES
} = {}) {
    const chroma = new Float32Array(12);
    const bass = new Float32Array(12);
    const frame = new Float32Array(12);
    const low = new Float32Array(12);
    const bins = size / 2 + 1;
    const white = new Float32Array(bins);
    const freqs = new Float32Array(MAX_PEAKS);
    const amps = new Float32Array(MAX_PEAKS);
    const richBin = Math.min(bins - 1, Math.round(RICH_HZ * size / sampleRate));
    const topBin = Math.min(bins - 1, Math.round(maxHz * harmonics * size / sampleRate));
    let eAll = 0;
    let eHigh = 0;
    /* peso di ogni armonica, calcolato una volta */
    const hw = new Float32Array(harmonics);
    for (let h = 0; h < harmonics; h++) hw[h] = Math.pow(slope, h);
    spectralFlux(signal, {
        sampleRate,
        size,
        hop,
        onFrame(mag, k) {
            const w = weights ? weights[k] || 0 : 1;
            if (w <= 0) return;
            frame.fill(0);
            low.fill(0);
            /* quanto e' "arrangiato" il frame: energia sopra i 300 Hz */
            for (let i = 1; i <= topBin; i++) {
                const e = mag[i] * mag[i];
                eAll += e;
                if (i > richBin) eHigh += e;
            }
            /* 1. via la colorazione della stanza, 2. i picchi veri */
            whitenSpectrum(mag, white, bins, octaveFrac, compress);
            const count = pickPeaks(white, bins, sampleRate, size, freqs, amps, {
                minHz, maxHz: maxHz * harmonics, floor: 1e-6
            });
            for (let p = 0; p < count; p++) {
                const f = freqs[p];
                const amp = amps[p];
                if (!(amp > 0)) continue;
                /* ogni picco puo' essere la h-esima armonica di qualcosa:
                   si accredita anche la fondamentale che lo spiegherebbe */
                for (let h = 1; h <= harmonics; h++) {
                    const f0 = f / h;
                    if (f0 < minHz || f0 > maxHz) continue;
                    const midi = 69 + 12 * Math.log2(f0 / a4);
                    const pc = ((midi % 12) + 12) % 12;
                    const weight = amp * hw[h - 1];
                    const isBass = f0 <= BASS_MAX_HZ;
                    /* kernel a coseno: il picco contribuisce a tutte le
                       classi entro un semitono, non solo alla piu' vicina */
                    for (let c = 0; c < 12; c++) {
                        let d = Math.abs(pc - c);
                        if (d > 6) d = 12 - d;
                        if (d >= kernel) continue;
                        const g = Math.cos(Math.PI * d / (2 * kernel));
                        const v = weight * g * g;
                        frame[c] += v;
                        if (isBass) low[c] += v;
                    }
                }
            }
            /* Normalizzazione per frame a massimo 1 (come in Essentia): un
               frame forte e uno debole contano uguale, e il fondo di rumore
               dei frame quasi vuoti non annacqua la media. `contrast` alza
               il profilo del frame: senza, l'HPCP resta troppo piatto e il
               margine fra la prima e la seconda ipotesi si schiaccia. */
            accumulate(chroma, frame, w, contrast);
            accumulate(bass, low, w, contrast);
        }
    });
    normalizeChroma(chroma);
    normalizeChroma(bass);
    return { chroma, bass, highRatio: eAll > 0 ? eHigh / eAll : 0 };
}

function accumulate(into, frame, w, contrast) {
    let fmax = 0;
    for (let c = 0; c < 12; c++) if (frame[c] > fmax) fmax = frame[c];
    if (!(fmax > 0)) return;
    for (let c = 0; c < 12; c++) {
        const v = frame[c] / fmax;
        into[c] += (contrast === 1 ? v : Math.pow(v, contrast)) * w;
    }
}

function normalizeChroma(chroma) {
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += chroma[i];
    if (sum > 0) for (let i = 0; i < 12; i++) chroma[i] /= sum;
    return chroma;
}

/**
 * Fonde il chroma pieno con quello del basso, con un peso che sale quando
 * sopra i 300 Hz non c'e' quasi niente (trap, brani poco arrangiati).
 *
 * MISURATO SUL BANCO (scripts/eval-dna), e il risultato e' negativo: la
 * linea di 808 dice i FONDAMENTALI DEGLI ACCORDI, non la tonalita', e su
 * un giro I-V-vi-IV la distribuzione delle fondamentali somiglia alla
 * relativa minore quanto alla maggiore. Con peso 0,35 il MIREX del trap
 * pulito scende da 0,650 a 0,629; con 0,12 resta uguale; sopra peggiora.
 * Resta quindi DISATTIVATA per difetto (`bassWeight: 0`) ed e' un
 * parametro, non una scelta nascosta: su materiale trap vero, dove l'808
 * sta molto piu' sulla tonica che sugli altri gradi, vale la pena
 * rimisurarla.
 */
export function fuseBass(chroma, bass, highRatio, maxWeight = 0) {
    if (!bass || !(maxWeight > 0)) return chroma;
    let energy = 0;
    for (let i = 0; i < 12; i++) energy += bass[i];
    if (!(energy > 0)) return chroma;
    const w = Math.max(0, Math.min(maxWeight, maxWeight * (1 - highRatio / BASS_RICH)));
    if (!(w > 0)) return chroma;
    const out = new Float32Array(12);
    for (let i = 0; i < 12; i++) out[i] = chroma[i] + w * bass[i];
    return normalizeChroma(out);
}

const BASS_RICH = 0.45;    // sopra questa quota di energia acuta: arrangiato

/**
 * HPCP medio del segnale (12 valori, somma 1). E' `hpcpPair` senza il
 * chroma del basso: l'API di prima, invariata.
 * `weights` opzionale pesa i frame (di norma l'inviluppo degli attacchi).
 */
export function hpcpOf(signal, sampleRate, opts = {}) {
    return hpcpPair(signal, sampleRate, opts).chroma;
}


/**
 * Chroma "vecchia maniera" (bin fisso + soppressione delle armoniche).
 * Resta per compatibilita' e per i confronti: la catena buona e' hpcpOf.
 */
export function chromaOf(signal, sampleRate, {
    a4 = 440,
    size = CHROMA_SIZE,
    hop = CHROMA_HOP,
    weights = null,
    minHz = 65,
    maxHz = 2000,
    suppress = true
} = {}) {
    const chroma = new Float32Array(12);
    const bins = size / 2 + 1;
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
        binWeight[i] = Math.exp(-0.5 * Math.pow(dist / 0.25, 2));
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

/** Quanto il chroma e' "in rilievo": 0 = piatto (rumore), 1 = un picco solo. */
export function chromaFlatness(chroma) {
    let max = 0;
    let sum = 0;
    for (let i = 0; i < 12; i++) { sum += chroma[i]; if (chroma[i] > max) max = chroma[i]; }
    if (sum <= 0) return 0;
    const mean = sum / 12;
    return Math.max(0, Math.min(1, (max - mean) / (sum - mean || 1)));
}

/**
 * keyFromChroma(chroma) -> { tonic, mode, camelot, confidence, compatible,
 *                            score, agreement, votes }
 * Ogni set di profili sceglie la sua tonalita' per similarita' coseno; poi
 * si conta chi ha preso piu' voti. La confidenza e' il margine medio dei
 * profili d'accordo, ridotto quando qualcuno dissente o quando il chroma
 * e' piatto (regole §14 della ricerca).
 */
export function keyFromChroma(chroma, { profiles = PROFILE_NAMES } = {}) {
    const empty = { tonic: '', mode: '', camelot: '', confidence: 0, compatible: [], score: 0, agreement: 0, votes: {} };
    let energy = 0;
    for (let i = 0; i < 12; i++) energy += chroma[i];
    if (!(energy > 0)) return empty;

    const rotated = new Float32Array(12);
    /* 24 caselle: 0-11 maggiori, 12-23 minori */
    const combined = new Float64Array(24);
    const votes = {};
    let used = 0;
    profiles.forEach((name) => {
        const set = PROFILES[name];
        if (!set) return;
        used++;
        let bestIdx = -1;
        let bestScore = -Infinity;
        for (let mi = 0; mi < 2; mi++) {
            const profile = mi === 0 ? set.major : set.minor;
            for (let r = 0; r < 12; r++) {
                for (let i = 0; i < 12; i++) rotated[i] = profile[(i - r + 12) % 12];
                const score = similarity(chroma, rotated);
                const idx = mi * 12 + r;
                combined[idx] += score;
                if (score > bestScore) { bestScore = score; bestIdx = idx; }
            }
        }
        if (bestIdx >= 0) {
            const label = NOTES[bestIdx % 12] + '|' + (bestIdx < 12 ? 'major' : 'minor');
            votes[label] = (votes[label] || 0) + 1;
        }
    });
    if (!used) return empty;
    for (let i = 0; i < 24; i++) combined[i] /= used;

    let best = 0;
    let second = -1;
    for (let i = 1; i < 24; i++) if (combined[i] > combined[best]) best = i;
    for (let i = 0; i < 24; i++) if (i !== best && (second < 0 || combined[i] > combined[second])) second = i;
    /* I modi: si confrontano con il profilo diatonico "piatto" (edm), che e'
       fatto nello stesso modo, e non con la media dei quattro (sarebbe un
       confronto fra cose diverse). Solo se un modo stacca di un margine si
       dichiara: altrimenti resta l'etichetta maggiore/minore di sempre. */
    const modal = bestModal(chroma);
    let best_ = best;
    let keyMode = best < 12 ? 'major' : 'minor';
    if (modal && modal.score > modal.tonalScore + MODAL_MARGIN) {
        keyMode = modal.name;
        best_ = modal.index + (MODAL_PROFILES[modal.name].parent === 'minor' ? 12 : 0);
    }
    const tonic = NOTES[best_ % 12];
    const mode = best_ < 12 ? 'major' : 'minor';
    const camelot = camelotOf(tonic, mode);
    const agreement = (votes[tonic + '|' + mode] || 0) / used;
    const margin = second >= 0 ? Math.max(0, combined[best] - combined[second]) : 1;
    const flat = chromaFlatness(chroma);
    /* La relativa (Do maggiore / La minore) ha le stesse note: fra le due
       il margine non vuol dire quasi niente ed e' l'errore piu' comune di
       tutti i sistemi. Quando la seconda ipotesi e' la relativa della
       prima, la confidenza vale meta'. */
    const relative = second >= 0 && isRelative(best, second) ? RELATIVE_PENALTY : 1;
    /* regole §14: margine stretto, profili in disaccordo, chroma piatto
       (rumore o silenzio) -> confidenza giu' */
    /* `agreement` al quadrato: basta un profilo che dissente per far
       scendere la confidenza sotto la soglia di "sicuro". E' cosi' che i
       casi sbagliati restano dichiarati incerti. */
    const confidence = flat < FLAT_MIN ? 0
        : Math.max(0, Math.min(1, MARGIN_GAIN * margin * agreement * agreement * relative));
    return {
        tonic,
        mode,
        keyMode,
        camelot,
        confidence,
        compatible: compatibleWith(camelot),
        score: combined[best],
        margin,
        agreement,
        runnerUp: second >= 0 ? NOTES[second % 12] + '|' + (second < 12 ? 'major' : 'minor') : '',
        votes
    };
}

/**
 * Il modo che spiega meglio il chroma, e il punteggio del maggiore/minore
 * "piatto" con cui va confrontato.
 * -> { name, index (tonica 0-11), score, tonalScore } oppure null
 */
function bestModal(chroma) {
    const rotated = new Float32Array(12);
    const scan = (profile) => {
        let bestScore = -Infinity;
        let bestIdx = 0;
        for (let r = 0; r < 12; r++) {
            for (let i = 0; i < 12; i++) rotated[i] = profile[(i - r + 12) % 12];
            const sc = similarity(chroma, rotated);
            if (sc > bestScore) { bestScore = sc; bestIdx = r; }
        }
        return { score: bestScore, index: bestIdx };
    };
    const flat = PROFILES.edm;
    const tonalScore = Math.max(scan(flat.major).score, scan(flat.minor).score);
    let win = null;
    MODAL_NAMES.forEach((name) => {
        const r = scan(MODAL_PROFILES[name].profile);
        if (!win || r.score > win.score) win = { name, index: r.index, score: r.score };
    });
    return win ? { ...win, tonalScore } : null;
}

/** Maggiore e relativa minore (Do = 0 maggiore, La = 9 minore) e viceversa. */
function isRelative(a, b) {
    const major = a < 12 ? a : b;
    const minor = a < 12 ? b : a;
    if ((a < 12) === (b < 12)) return false;
    return (minor - 12 + 12) % 12 === (major + 9) % 12;
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

/**
 * CALIBRAZIONE DELLA CONFIDENZA (banco scripts/eval-dna, 480 analisi).
 *
 * Il margine grezzo fra la prima e la seconda ipotesi e' un punteggio, non
 * una probabilita': misurato sul banco, i casi dichiarati con margine >= 0,20
 * (la soglia con cui la pagina scrive "alta", perche' dna.js moltiplica per
 * 3) erano giusti solo nel 78,6% dei casi. Questa tabella, letta dal
 * diagramma di affidabilita' del banco, porta la scala in accordo con la
 * realta': la soglia dell'"alta" cade dove l'accuratezza osservata e' 100%
 * (margine grezzo 0,35; sotto, a 0,32, era gia' 92,5%).
 *
 *   grezzo  0,07 -> 0,04   osservato ~40% di casi giusti
 *   grezzo  0,14 -> 0,10   osservato ~73%   (la pagina scrive "media")
 *   grezzo  0,35 -> 0,20   osservato  100%  (la pagina scrive "alta")
 *   grezzo  0,50 -> 0,333  il massimo utile (x3 = 1)
 *
 * La SCALA non cambia (la pagina non si tocca): cambia dove cadono i casi.
 * Va rifatta se cambia la catena di stima: `node scripts/eval-dna/run.mjs`
 * stampa il diagramma da cui si leggono i nuovi punti.
 */
const CONFIDENCE_CURVE = [[0, 0], [0.07, 0.04], [0.14, 0.1], [0.35, 0.2], [0.5, 1 / 3]];

export function calibrateConfidence(raw) {
    if (!(raw > 0)) return 0;
    const c = CONFIDENCE_CURVE;
    if (raw >= c[c.length - 1][0]) return c[c.length - 1][1];
    for (let i = 1; i < c.length; i++) {
        if (raw > c[i][0]) continue;
        const [x0, y0] = c[i - 1];
        const [x1, y1] = c[i];
        return y0 + (y1 - y0) * (raw - x0) / (x1 - x0);
    }
    return c[c.length - 1][1];
}

export const SEGMENT_SECONDS = 5;
export const SEGMENT_HOP = 2.5;

/**
 * La strada buona: passa-alto, HPCP a segmenti di 5 s (hop 2,5 s) e voto
 * pesato per confidenza. Una stima sola su tutto il segnale resta il caso
 * limite (registrazione corta).
 * -> { tonic, mode, camelot, confidence, compatible, segments, agreement }
 */
export function estimateKey(signal, sampleRate, {
    a4 = 440,
    size = CHROMA_SIZE,
    hop = CHROMA_HOP,
    segment = SEGMENT_SECONDS,
    segmentHop = SEGMENT_HOP,
    profiles = PROFILE_NAMES,
    filter = true,
    bassWeight = 0,
    ...rest
} = {}) {
    const clean = filter ? highpass(signal, sampleRate, 50) : signal;
    const segLen = Math.round(segment * sampleRate);
    const stepLen = Math.max(1, Math.round(segmentHop * sampleRate));
    /* il chroma del basso entra qui, pesato per quanto e' pieno lo spettro
       sopra i 300 Hz: nel trap e' quasi tutta l'armonia che c'e' */
    const chromaOfPart = (part) => {
        const pair = hpcpPair(part, sampleRate, { a4, size, hop, ...rest });
        return fuseBass(pair.chroma, pair.bass, pair.highRatio, bassWeight);
    };
    if (clean.length < segLen * 1.5) {
        const single = keyFromChroma(chromaOfPart(clean), { profiles });
        return { ...single, confidence: calibrateConfidence(single.confidence), raw: single.confidence, segments: 1, agreement: single.tonic ? 1 : 0, profileAgreement: single.agreement };
    }
    /* Un segmento di 5 s spesso contiene UN accordo solo: votare la
       tonalita' segmento per segmento, su un giro lento, elegge
       l'accordo piu' suonato invece della tonalita'. Si vota allora sui
       CHROMA, prendendo la mediana per classe: un tratto riverberato,
       silenzioso o sporco resta una voce fra tante e non sposta il
       risultato (ricerca punto 4, adattato). L'accordo fra i segmenti
       resta il segnale di confidenza (§14). */
    const parts = [];
    for (let start = 0; start + segLen <= clean.length; start += stepLen) parts.push(chromaOfPart(clean.subarray(start, start + segLen)));
    if (!parts.length) return keyFromChroma(chromaOfPart(clean), { profiles });
    const median = new Float32Array(12);
    const col = new Float64Array(parts.length);
    for (let c = 0; c < 12; c++) {
        for (let i = 0; i < parts.length; i++) col[i] = parts[i][c];
        const sorted = Array.from(col).sort((x, y) => x - y);
        const mid = sorted.length >> 1;
        median[c] = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }
    let sum = 0;
    for (let c = 0; c < 12; c++) sum += median[c];
    if (sum > 0) for (let c = 0; c < 12; c++) median[c] /= sum;
    const win = keyFromChroma(median, { profiles });
    if (!win.tonic) return { ...win, segments: parts.length, agreement: 0 };
    /* quanti segmenti, da soli, direbbero la stessa cosa */
    let same = 0;
    let weight = 0;
    let total = 0;
    parts.forEach((ch) => {
        const r = keyFromChroma(ch, { profiles });
        const w = Math.max(r.confidence, 1e-4);
        total += w;
        if (r.tonic === win.tonic && r.mode === win.mode) { same++; weight += w; }
    });
    const agreement = total > 0 ? weight / total : 0;
    const share = same / parts.length;
    /* sotto il 60% di accordo la confidenza crolla (regola §14b) */
    const factor = Math.max(0, Math.min(1, (Math.max(agreement, share) - 0.15) / 0.45));
    const raw = Math.max(0, Math.min(1, win.confidence * factor));
    return {
        ...win,
        confidence: calibrateConfidence(raw),
        raw,
        segments: parts.length,
        agreement: share,
        profileAgreement: win.agreement
    };
}

/** Comodo: dal segnale alla tonalita' (usa la catena nuova). */
export function analyseKey(signal, sampleRate, opts = {}) {
    return estimateKey(signal, sampleRate, opts);
}
