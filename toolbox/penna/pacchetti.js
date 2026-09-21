/**
 * Tiny Temple Toolbox - Penna: catalogo dei pacchetti lingua (spec 14b §4/§5).
 *
 * Modulo dati puro, PRECACHEATO (sw.js, TOOLS): nessun effetto all'import,
 * cosi' aprendo Penna e toccando #pen-lang non parte nessuna richiesta di
 * rete (spec 14b §2). penna.js lo importa con un `import()` dinamico e usa
 * `PACCHETTI`; se il file manca o l'import fallisce resta il catalogo
 * minimo scritto in penna.js (CATALOGO_BASE), che ha la stessa forma.
 *
 * Ogni voce: codice, nome (mostrato nel foglio), versione (il suffisso dei
 * file in penna/data/<codice>/), gzip (byte, per il testo "0,9 MB..."),
 * file (oltre al manifest, che penna.js aggiunge da solo) e fonti (una riga
 * per licenza nel foglio, spec 14b §2: CC BY-SA 4.0 su ogni pacchetto, piu'
 * l'avviso BSD di CMU per l'inglese e le liste MIT).
 *
 * Le cifre sono quelle attese dalla spec (§6.5: ≈0,7/0,8/0,45 MB per
 * en/fr/es una volta compressi) finche' `scripts/build-rimario.mjs` non ha
 * generato i pacchetti veri: l'implementer aggiorna `gzip`/`versione` senza
 * toccare la forma di questo file quando i dati esistono davvero.
 */
import { LINGUE } from '/shared/testo/lingue.js';

/* il suffisso di versione sta in UN posto: LINGUE[codice].versione (lingue.js) */
const v = (c) => LINGUE[c].versione;
const tre = (c) => ['parole-' + v(c) + '.txt', 'chiavi-' + v(c) + '.json', 'tratti-' + v(c) + '.bin'];

export const PACCHETTI = {
    it: {
        codice: 'it',
        nome: 'Italiano',
        versione: v('it'),
        gzip: 1257000,
        file: tre('it'),
        fonti: [
            { nome: 'Wikizionario', licenza: 'CC BY-SA 4.0' },
            { nome: 'FrequencyWords', licenza: 'CC BY-SA 4.0' },
            { nome: 'paroleitaliane', licenza: 'MIT' }
        ]
    },
    en: {
        codice: 'en',
        nome: 'English',
        versione: v('en'),
        gzip: 1612000,
        file: tre('en'),
        fonti: [
            { nome: 'CMU Pronouncing Dictionary', licenza: 'BSD' },
            { nome: 'FrequencyWords (en)', licenza: 'CC BY-SA 4.0' }
        ]
    },
    fr: {
        codice: 'fr',
        nome: 'Français',
        versione: v('fr'),
        gzip: 1047000,
        file: tre('fr'),
        fonti: [
            { nome: 'Wikizionario (fr)', licenza: 'CC BY-SA 4.0' },
            { nome: 'FrequencyWords (fr)', licenza: 'CC BY-SA 4.0' }
        ]
    },
    es: {
        codice: 'es',
        nome: 'Español',
        versione: v('es'),
        gzip: 452000,
        /* chiavi/tratti sono "derivate" (spec 14b §4): le regole RAE le
           ricostruiscono al caricamento, niente da scaricare in piu'. */
        file: ['parole-' + v('es') + '.txt'],
        fonti: [
            { nome: 'Wikizionario (es)', licenza: 'CC BY-SA 4.0' },
            { nome: 'FrequencyWords (es)', licenza: 'CC BY-SA 4.0' }
        ]
    }
};
