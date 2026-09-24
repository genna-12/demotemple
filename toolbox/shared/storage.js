/**
 * Tiny Temple Toolbox - salvataggi locali.
 *
 * IndexedDB `tiny-temple-toolbox`, un solo object store `records` con chiave
 * [tool, id] e indice `tool`: uno strumento nuovo non richiede migrazioni.
 * Ogni record: { tool, id, value, updated }. Nulla lascia il dispositivo.
 *
 * Preferenze leggere (lingua dello strumento, ultimo BPM...) in localStorage
 * con chiave 'tt.<tool>.<key>', sempre protette da try/catch.
 */

const DB_NAME = 'tiny-temple-toolbox';
const DB_VERSION = 1;
const STORE = 'records';

let dbPromise = null;
let persistAsked = false;

function req2promise(r) {
    return new Promise((resolve, reject) => {
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
    });
}

function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB non disponibile')); return; }
        const r = indexedDB.open(DB_NAME, DB_VERSION);
        r.onupgradeneeded = () => {
            const db = r.result;
            if (!db.objectStoreNames.contains(STORE)) {
                const store = db.createObjectStore(STORE, { keyPath: ['tool', 'id'] });
                store.createIndex('tool', 'tool');
            }
        };
        r.onsuccess = () => {
            const db = r.result;
            /* un'altra scheda aggiorna lo schema: si chiude e si riapre al prossimo uso */
            db.onversionchange = () => { db.close(); dbPromise = null; };
            db.onclose = () => { dbPromise = null; };
            resolve(db);
        };
        r.onerror = () => reject(r.error);
        r.onblocked = () => console.warn('[storage] apertura bloccata da un\'altra scheda');
    });
    dbPromise.catch(() => { dbPromise = null; });
    return dbPromise;
}

async function run(mode, fn) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        let result;
        Promise.resolve(fn(tx.objectStore(STORE))).then((v) => { result = v; }, reject);
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('transazione annullata'));
    });
}

/* Una transazione sola sullo store `records`, per chi deve fare piu' passi
   atomici (le migrazioni di shared/archivio.js, spec 18 §3). `fn(store)`
   usa le callback delle richieste, non await: una transazione IndexedDB si
   chiude da sola appena resta senza richieste in corso. */
export function transazione(mode, fn) {
    return run(mode, fn);
}

/* tutte le chiavi [tool, *]: un array piu' lungo e' sempre maggiore del prefisso,
   e un array vuoto e' maggiore di qualunque id numero/data/stringa */
const toolRange = (tool) => IDBKeyRange.bound([tool], [tool, []]);

export function get(tool, id) {
    return run('readonly', (s) => req2promise(s.get([tool, id]))).then((rec) => (rec ? rec.value : undefined));
}

export function put(tool, id, value) {
    if (!persistAsked) { persistAsked = true; persist().catch(() => {}); }
    return run('readwrite', (s) => req2promise(s.put({ tool, id, value, updated: Date.now() }))).then(() => undefined);
}

export function del(tool, id) {
    return run('readwrite', (s) => req2promise(s.delete([tool, id]))).then(() => undefined);
}

/* -> [{ id, value, updated }] in ordine di id */
export function list(tool) {
    return run('readonly', (s) => req2promise(s.index('tool').getAll(tool)))
        .then((recs) => recs.map(({ id, value, updated }) => ({ id, value, updated })));
}

export function clear(tool) {
    return run('readwrite', (s) => req2promise(s.delete(toolRange(tool)))).then(() => undefined);
}

/* Chiede al browser di non cancellare i dati sotto pressione di spazio
   (su iOS l'eviction e' reale). true se i dati sono gia' o ora persistenti. */
export async function persist() {
    const sm = typeof navigator !== 'undefined' ? navigator.storage : undefined;
    if (!sm || typeof sm.persist !== 'function') return false;
    try {
        if (typeof sm.persisted === 'function' && await sm.persisted()) return true;
        return await sm.persist();
    } catch (e) {
        return false;
    }
}

const prefKey = (tool, key) => 'tt.' + tool + '.' + key;

export const prefs = {
    get(tool, key, fallback) {
        try {
            const raw = window.localStorage.getItem(prefKey(tool, key));
            return raw === null ? fallback : JSON.parse(raw);
        } catch (e) {
            return fallback;
        }
    },
    set(tool, key, value) {
        try {
            if (value === undefined) window.localStorage.removeItem(prefKey(tool, key));
            else window.localStorage.setItem(prefKey(tool, key), JSON.stringify(value));
        } catch (e) { /* storage pieno o bloccato: la preferenza non si salva */ }
    }
};
