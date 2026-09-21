/**
 * Banco di valutazione DNA - metriche.
 *
 * BPM: Accuracy1 (entro il 2%, standard MIREX/Percival-Tzanetakis) e
 * Accuracy2 (che accetta anche meta', doppio, un terzo, due terzi, triplo:
 * l'errore d'ottava, che nel trap e' il problema vero, resta contato a parte).
 * Tonalita': punteggio MIREX (1 esatta, 0,5 quinta, 0,3 relativa, 0,2
 * parallela, 0 il resto).
 * Confidenza: diagramma di affidabilita' a decili piu' il bucket "alta"
 * cosi' come lo mostra la pagina (BPM >= 0,60; tonalita' >= 0,20, perche'
 * dna.js moltiplica per 3 prima di scegliere l'etichetta).
 */

export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Soglie con cui la pagina scrive "alta" (dna.js, confidenceKey). */
export const HIGH_BPM = 0.6;
export const HIGH_KEY = 0.2;

const OCTAVE_FACTORS = [1 / 3, 1 / 2, 2 / 3, 1, 3 / 2, 2, 3];

export const bpmAcc1 = (est, ref) => ref > 0 && est > 0 && Math.abs(est - ref) / ref <= 0.02;
export const bpmAcc2 = (est, ref) => OCTAVE_FACTORS.some((f) => bpmAcc1(est, ref * f));

/** Punteggio MIREX di una tonalita' stimata contro quella vera. */
export function keyScore(estTonic, estMode, refTonic, refMode) {
    const e = NOTES.indexOf(estTonic);
    const r = NOTES.indexOf(refTonic);
    if (e < 0 || r < 0 || !estMode || !refMode) return 0;
    const d = ((e - r) % 12 + 12) % 12;
    if (d === 0 && estMode === refMode) return 1;
    if (estMode === refMode && (d === 7 || d === 5)) return 0.5;
    if (refMode === 'major' && estMode === 'minor' && d === 9) return 0.3;
    if (refMode === 'minor' && estMode === 'major' && d === 3) return 0.3;
    if (d === 0 && estMode !== refMode) return 0.2;
    return 0;
}

/** Raccoglitore: media, percentuali, diagramma di affidabilita'. */
export function summarize(rows) {
    const n = rows.length || 1;
    const sum = (f) => rows.reduce((a, r) => a + (f(r) || 0), 0);
    return {
        n: rows.length,
        acc1: sum((r) => (r.bpmAcc1 ? 1 : 0)) / n,
        acc2: sum((r) => (r.bpmAcc2 ? 1 : 0)) / n,
        mirex: sum((r) => r.keyScore) / n,
        exact: sum((r) => (r.keyScore === 1 ? 1 : 0)) / n,
        bpmConf: sum((r) => r.bpmConfidence) / n,
        keyConf: sum((r) => r.keyConfidence) / n
    };
}

/** Diagramma di affidabilita' a decili: quanti casi e quanti giusti. */
export function reliability(rows, confOf, okOf) {
    const buckets = Array.from({ length: 10 }, () => ({ n: 0, ok: 0, sum: 0 }));
    rows.forEach((r) => {
        const c = Math.max(0, Math.min(0.999, confOf(r)));
        const b = buckets[Math.floor(c * 10)];
        b.n++;
        b.sum += confOf(r);
        if (okOf(r)) b.ok++;
    });
    return buckets;
}

/** Il bucket che la pagina chiama "alta": quanti casi e che accuratezza. */
export function highBucket(rows, confOf, okOf, threshold) {
    const hi = rows.filter((r) => confOf(r) >= threshold);
    return { n: hi.length, share: rows.length ? hi.length / rows.length : 0, acc: hi.length ? hi.filter(okOf).length / hi.length : NaN };
}
