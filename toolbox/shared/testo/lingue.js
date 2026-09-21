/**
 * Tiny Temple Toolbox - registro delle lingue del rimario (spec 14b §4).
 *
 * Un solo posto dove sta scritto quali lingue esistono e dove sono le loro
 * regole. I moduli si caricano con import() DINAMICO: chi scrive in
 * italiano non paga i byte del francese, e il Worker tiene in memoria una
 * lingua alla volta.
 *
 * Ogni lingua espone gli stessi due moduli con le stesse firme:
 *   sillabe.js   -> sillabe(parola, opts), accento(parola, opts), analizza,
 *                   CLASSI, normalizza
 *   fonetica.js  -> chiavi(parola, opts) = { parola, sillabe, classe, esito,
 *                   tonica, rima, vocali, consonanti, multi }
 * cosi' il Worker e la pagina non sanno in che lingua stanno lavorando.
 */

export const LINGUE = {
    it: {
        codice: 'it',
        nome: 'Italiano',
        etichetta: 'IT',
        versione: 'v3',             // suffisso dei file in /penna/data/ (alzare quando cambiano i dati)
        base: null,                 // i dati italiani stanno in /penna/data/
        sillabe: '/shared/testo/sillabe.js',
        fonetica: '/shared/testo/fonetica.js',
        sinalefe: true,             // il verso unisce vocale finale + iniziale
        emuet: false,
        derivate: false             // chiavi e tratti arrivano col pacchetto
    },
    en: {
        codice: 'en',
        versione: 'v1',
        nome: 'English',
        etichetta: 'EN',
        base: 'en',
        sillabe: '/shared/testo/en/sillabe.js',
        fonetica: '/shared/testo/en/fonetica.js',
        sinalefe: false,
        emuet: false,
        derivate: false,
        analogia: true              // parola sconosciuta: chiave per analogia
    },
    fr: {
        codice: 'fr',
        versione: 'v2',
        nome: 'Français',
        etichetta: 'FR',
        base: 'fr',
        sillabe: '/shared/testo/fr/sillabe.js',
        fonetica: '/shared/testo/fr/fonetica.js',
        sinalefe: false,
        emuet: true,                // "e muta: non conta / conta" nel verso
        derivate: false,
        analogia: true
    },
    es: {
        codice: 'es',
        versione: 'v1',
        nome: 'Español',
        etichetta: 'ES',
        base: 'es',
        sillabe: '/shared/testo/es/sillabe.js',
        fonetica: '/shared/testo/es/fonetica.js',
        sinalefe: true,             // sinalefa, e normalizzazione a piano
        emuet: false,
        derivate: true              // chiavi e tratti si ricalcolano: 0,45 MB
    }
};

export const CODICI = Object.keys(LINGUE);
/** Nomi dei file dati di una lingua, con il suffisso di versione. */
export function fileDati(codice) {
    const v = LINGUE[normalizzaCodice(codice)].versione;
    return { parole: 'parole-' + v + '.txt', chiavi: 'chiavi-' + v + '.json', tratti: 'tratti-' + v + '.bin', manifest: 'manifest-' + v + '.json' };
}
export const esiste = (codice) => Object.prototype.hasOwnProperty.call(LINGUE, codice);
export const normalizzaCodice = (codice) => (esiste(String(codice || '').slice(0, 2)) ? String(codice).slice(0, 2) : 'it');

const cache = new Map();

/**
 * Carica (una volta) i moduli di una lingua. In Node i percorsi assoluti
 * non si risolvono: chi importa da fuori browser passa `radice`.
 */
export async function moduli(codice, { radice = '' } = {}) {
    const lingua = LINGUE[normalizzaCodice(codice)];
    const chiave = lingua.codice + '|' + radice;
    if (cache.has(chiave)) return cache.get(chiave);
    const attesa = Promise.all([
        import(radice + lingua.sillabe),
        import(radice + lingua.fonetica)
    ]).then(([sillabe, fonetica]) => ({ lingua, sillabe, fonetica }));
    cache.set(chiave, attesa);
    attesa.catch(() => cache.delete(chiave));
    return attesa;
}

/** Dove stanno i dati di una lingua: /penna/data/ oppure /penna/data/<lang>/ */
export function cartella(codice, base = '/penna/data/') {
    const lingua = LINGUE[normalizzaCodice(codice)];
    return lingua.base ? base + lingua.base + '/' : base;
}
