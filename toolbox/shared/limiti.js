/**
 * Tiny Temple Toolbox - limiti per collezione (spec 18 §3).
 *
 * Costante unica, letta dal client (`shared/archivio.js`) e, dal giro 3, dal
 * server (`functions/api/quaderno`). Modulo puro: niente DOM, niente
 * IndexedDB, si importa anche in Node.
 *
 *   voci  quanti record VIVI (le lapidi non contano) puo' tenere la collezione
 *   byte  peso massimo di un record: `dati` serializzato in JSON, in UTF-8
 *
 * Oltre il limite l'archivio rifiuta la scrittura con un `ErroreLimite` e
 * chi chiama mostra un messaggio: mai un errore silenzioso.
 */

const KB = 1024;

export const LIMITI = Object.freeze({
    penna: Object.freeze({ voci: 1000, byte: 256 * KB }),
    uscite: Object.freeze({ voci: 500, byte: 64 * KB }),
    dna: Object.freeze({ voci: 2000, byte: 8 * KB }),
    accordature: Object.freeze({ voci: 200, byte: 4 * KB }),
    'metronomo-preset': Object.freeze({ voci: 200, byte: 4 * KB }),
    impostazioni: Object.freeze({ voci: 50, byte: 16 * KB })
});

/** Le collezioni dell'archivio, nell'ordine di priorita' della sincronizzazione (§4). */
export const COLLEZIONI = Object.freeze(['impostazioni', 'penna', 'uscite', 'accordature', 'metronomo-preset', 'dna']);

/** Il limite di una collezione, o null se non e' una collezione dell'archivio. */
export function limiteDi(coll) {
    return Object.prototype.hasOwnProperty.call(LIMITI, coll) ? LIMITI[coll] : null;
}

/** Peso in byte di un valore serializzato come lo salva l'archivio. */
export function pesoByte(dati) {
    const json = JSON.stringify(dati === undefined ? null : dati);
    if (typeof TextEncoder === 'function') return new TextEncoder().encode(json).length;
    return unescape(encodeURIComponent(json)).length;
}
