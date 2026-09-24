/**
 * Tiny Temple Toolbox - limiti per collezione (spec 18 §3).
 *
 * Costante unica, letta dal client (`shared/archivio.js`, `shared/sync.js`)
 * e, COPIATA come `LIMITI_SERVER`, dal server (`functions/api/quaderno`:
 * il tetto di documenti per collezione; check.mjs verifica che
 * coincidano). Modulo puro: niente DOM, niente IndexedDB, si importa anche
 * in Node.
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

/**
 * Il blocco cifrato sul server (spec 17 §4, riallineato al giro 3 di T1):
 * base64 di IV + JSON {id, dati} + tag GCM, quindi ~4/3 del record piu'
 * qualche decina di byte. 384 KB di base64 tengono il record piu' grande
 * ammesso qui sopra (Penna, 256 KB: ~342 KB di base64); il corpo di una
 * richiesta (un PUT singolo o un lotto) sta sotto MAX_CORPO. La Function ne
 * tiene una COPIA (`LIMITI_SERVER`, `MAX_BLOB`, `MAX_CORPO`): check.mjs
 * verifica che coincidano e che ogni `byte` qui sopra ci stia dentro.
 */
export const MAX_BLOB = 384 * KB;
export const MAX_CORPO = 400 * KB;

/** Le collezioni dell'archivio, nell'ordine di priorita' della sincronizzazione (§4). */
export const COLLEZIONI = Object.freeze(['impostazioni', 'penna', 'uscite', 'accordature', 'metronomo-preset', 'dna']);

/**
 * Le collezioni SINCRONIZZABILI (spec 18 §4), in un posto solo: stesso ordine
 * di priorita' di COLLEZIONI (quello del giro: prima le impostazioni, per
 * ultimo lo storico del DNA). `nome` e' la chiave i18n dell'interruttore in
 * Impostazioni (`imp-sync-coll-<coll>`); `chiave` = l'id del record e' un
 * nome che vale su ogni dispositivo (le preferenze: `tinyTempleLang`...), e
 * quindi anche il `sid` si ricava da li' invece di nascere a caso.
 */
export const SINCRONIZZABILI = Object.freeze([
    Object.freeze({ coll: 'impostazioni', nome: 'sync-coll-impostazioni', chiave: true }),
    Object.freeze({ coll: 'penna', nome: 'sync-coll-penna', chiave: false }),
    Object.freeze({ coll: 'uscite', nome: 'sync-coll-uscite', chiave: false }),
    Object.freeze({ coll: 'accordature', nome: 'sync-coll-accordature', chiave: false }),
    Object.freeze({ coll: 'metronomo-preset', nome: 'sync-coll-metronomo-preset', chiave: false }),
    Object.freeze({ coll: 'dna', nome: 'sync-coll-dna', chiave: false })
]);

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
