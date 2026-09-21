/**
 * Banco di valutazione DNA - il corpus.
 *
 * 240 brani: 4 generi x 12 toniche x 2 modi x 2 tempi (192) piu' 48 casi
 * modali (dorico e misolidio su tutte le toniche, pop e ballata). Ogni
 * brano e' analizzato due volte: pulito e "da microfono". Tutto e'
 * deterministico: l'indice del caso decide il seed.
 */

export const GENRES = ['pop', 'trap', 'house', 'ballad'];

/* Due tempi per genere, dentro 60-180, scelti dove i generi vivono davvero.
   Il trap a 140 e 160 con rullante in mezza velocita' e' il caso 70/140:
   sono i tempi con cui il genere si scrive davvero nel sequencer (un trap
   "a 76" e' lo stesso audio scritto a 152, non un caso diverso). */
const TEMPOS = {
    pop: [92, 128],
    trap: [140, 160],
    house: [118, 128],
    ballad: [62, 80]
};

const MAJOR_PROGS = ['I-V-vi-IV', 'ii-V-I'];
const MINOR_PROGS = ['i-VI-III-VII'];
const MODAL = [
    { progression: 'i-IV-dorico', genre: 'pop', bpm: 104 },
    { progression: 'i-IV-dorico', genre: 'ballad', bpm: 72 },
    { progression: 'I-bVII-IV-misolidio', genre: 'pop', bpm: 116 },
    { progression: 'I-bVII-IV-misolidio', genre: 'ballad', bpm: 68 }
];

const SWINGS = [0, 0, 0.08, 0.16, 0.33];

/** -> [{ id, genre, tonicPc, progression, bpm, swing, seconds, seed }] */
export function buildCorpus() {
    const cases = [];
    let i = 0;
    const push = (spec) => {
        const seed = 1000 + i * 7919;
        cases.push({
            id: cases.length,
            seconds: i % 3 === 0 ? 36 : 30,
            swing: SWINGS[(i * 3) % SWINGS.length],
            seed,
            ...spec
        });
        i++;
    };
    GENRES.forEach((genre) => {
        TEMPOS[genre].forEach((bpm, ti) => {
            for (let pc = 0; pc < 12; pc++) {
                push({ genre, tonicPc: pc, bpm, progression: MAJOR_PROGS[(pc + ti) % MAJOR_PROGS.length] });
                push({ genre, tonicPc: pc, bpm, progression: MINOR_PROGS[0] });
            }
        });
    });
    MODAL.forEach((m) => {
        for (let pc = 0; pc < 12; pc++) push({ genre: m.genre, tonicPc: pc, bpm: m.bpm, progression: m.progression });
    });
    return cases;
}

export const CONDITIONS = ['pulito', 'microfono'];
