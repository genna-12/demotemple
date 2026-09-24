/**
 * Tiny Temple Toolbox - pacchetti lingua del rimario (spec 14b §2/§4,
 * spec 18 §5). Condiviso da Penna (il foglio del pacchetto nel rimario) e da
 * Impostazioni (la sezione "Pacchetti lingua"): la stessa logica di scarica
 * e rimuovi, un posto solo.
 *
 * ES module puro: nessun effetto all'import, nessuna rete finche' non si
 * chiama `scaricaFile()`. Il catalogo vero sta in `penna/pacchetti.js`
 * (precacheato): `caricaCatalogo()` lo importa al bisogno; se manca resta
 * `CATALOGO_BASE`, stessa forma.
 *
 * Dove vivono i dati: Cache Storage `toolbox-rimario` (la stessa che
 * sw.js serve cache-first per `/penna/data/*`), file per file, dal NOSTRO
 * origine. Quali lingue sono installate: preferenza LOCALE
 * `tt.penna.pacchetti` (mai nell'archivio: i byte non viaggiano), piu'
 * `tt.penna.lingua`, la lingua del rimario di Penna.
 *
 * API
 *   CACHE_PACCHETTI, DATA_BASE, PACCHETTI_URL, CATALOGO_BASE
 *   caricaCatalogo()                  -> Promise<catalogo>
 *   pacchetto(codice, catalogo?)      -> voce del catalogo | undefined
 *   fileDelPacchetto(codice, catalogo?) -> [url assoluti] (manifest compreso)
 *   installati()                      -> codici in `tt.penna.pacchetti`
 *   presente(codice, catalogo?)       -> Promise<bool>: il manifest e' in cache
 *   scaricaFile(codice, { catalogo, signal, onAvanti(fatti, totale) })
 *                                     scarica e mette in cache; lancia se
 *                                     un file non arriva o se annullato
 *   togliDallaCache(codice, catalogo?)
 *   segnaInstallato(codice)           -> nuova lista
 *   segnaRimosso(codice)              -> nuova lista (e sposta `tt.penna.lingua`
 *                                        se era quella tolta)
 *   pesoLeggibile(byte)               "1.5 MB" / "440 KB"
 */

import { LINGUE, CODICI, normalizzaCodice, cartella } from './testo/lingue.js';
import { prefs } from './archivio.js';

export const CACHE_PACCHETTI = 'toolbox-rimario';
export const DATA_BASE = '/penna/data/';
export const PACCHETTI_URL = '/penna/pacchetti.js';
const TOOL = 'penna';

/* catalogo minimo: vale finche' penna/pacchetti.js non si e' caricato */
export const CATALOGO_BASE = Object.freeze(Object.fromEntries(CODICI.map((c) => {
    const v = LINGUE[c].versione;
    const gzip = { it: 1257000, en: 1612000, fr: 1047000, es: 452000 }[c];
    const file = LINGUE[c].derivate ? ['parole-' + v + '.txt'] : ['parole-' + v + '.txt', 'chiavi-' + v + '.json', 'tratti-' + v + '.bin'];
    return [c, { codice: c, nome: LINGUE[c].nome, versione: v, gzip, file }];
})));

let catalogoP = null;

/** Il catalogo di `penna/pacchetti.js`, o quello minimo se non si carica. */
export function caricaCatalogo() {
    if (!catalogoP) {
        catalogoP = import(PACCHETTI_URL).then(
            (m) => (m && m.PACCHETTI ? m.PACCHETTI : CATALOGO_BASE),
            () => CATALOGO_BASE
        );
    }
    return catalogoP;
}

export function pacchetto(codice, catalogo = CATALOGO_BASE) {
    const c = normalizzaCodice(codice);
    return (catalogo && catalogo[c]) || CATALOGO_BASE[c];
}

/** Gli URL da scaricare (e da togliere): il manifest piu' i file del pacchetto. */
export function fileDelPacchetto(codice, catalogo = CATALOGO_BASE) {
    const c = normalizzaCodice(codice);
    const pack = pacchetto(c, catalogo);
    if (!pack) return [];
    const dir = cartella(c, DATA_BASE);
    return ['manifest-' + pack.versione + '.json', ...(pack.file || [])].map((f) => dir + f);
}

/** Le lingue che Penna considera installate (preferenza locale). */
export function installati() {
    const v = prefs.get(TOOL, 'pacchetti', ['it']);
    return Array.isArray(v) ? v.filter((c) => CODICI.includes(c)) : ['it'];
}

/** Il pacchetto e' davvero in cache? (senza Cache Storage: la preferenza) */
export async function presente(codice, catalogo = CATALOGO_BASE) {
    const c = normalizzaCodice(codice);
    if (typeof caches === 'undefined') return installati().includes(c);
    try {
        const cache = await caches.open(CACHE_PACCHETTI);
        const [manifest] = fileDelPacchetto(c, catalogo);
        return !!(manifest && await cache.match(manifest));
    } catch (e) {
        return installati().includes(c);
    }
}

/**
 * Scarica i file del pacchetto dal NOSTRO origine e li mette in
 * `toolbox-rimario` (spec 14b §2: nessun terzo, nessun identificatore).
 * `onAvanti(fatti, totale)` a ogni file (anche 0 all'inizio). Lancia se un
 * file non arriva o se `signal` annulla: quel che era gia' in cache resta,
 * ma la lingua non si segna installata (lo fa chi chiama, dopo).
 */
export async function scaricaFile(codice, { catalogo = CATALOGO_BASE, signal, onAvanti } = {}) {
    const url = fileDelPacchetto(codice, catalogo);
    if (!url.length) throw new Error('pacchetto sconosciuto: ' + codice);
    const avanti = (n) => { if (typeof onAvanti === 'function') onAvanti(n, url.length); };
    avanti(0);
    const cache = typeof caches !== 'undefined' ? await caches.open(CACHE_PACCHETTI) : null;
    /* `signal` puo' essere un semplice { aborted } dove AbortController non
       c'e': allora si controlla fra un file e l'altro e basta */
    const vero = typeof AbortSignal !== 'undefined' && signal instanceof AbortSignal;
    for (let i = 0; i < url.length; i++) {
        if (signal && signal.aborted) throw new Error('annullato');
        const risposta = await fetch(url[i], vero ? { signal } : undefined);
        if (!risposta.ok) throw new Error(url[i] + ': HTTP ' + risposta.status);
        if (cache) await cache.put(url[i], risposta.clone());
        avanti(i + 1);
    }
    return true;
}

/** Via i file del pacchetto da Cache Storage (le preferenze le tocca `segnaRimosso`). */
export async function togliDallaCache(codice, catalogo = CATALOGO_BASE) {
    try {
        if (typeof caches === 'undefined') return;
        const cache = await caches.open(CACHE_PACCHETTI);
        await Promise.all(fileDelPacchetto(codice, catalogo).map((u) => cache.delete(u)));
    } catch (e) { /* cache non disponibile: restano solo le prefs */ }
}

export function segnaInstallato(codice) {
    const c = normalizzaCodice(codice);
    const lista = installati();
    const nuova = lista.includes(c) ? lista : [...lista, c];
    prefs.set(TOOL, 'pacchetti', nuova);
    return nuova;
}

export function segnaRimosso(codice) {
    const c = normalizzaCodice(codice);
    const resta = installati().filter((x) => x !== c);
    prefs.set(TOOL, 'pacchetti', resta);
    if (normalizzaCodice(prefs.get(TOOL, 'lingua', 'it')) === c) prefs.set(TOOL, 'lingua', resta[0] || 'it');
    return resta;
}

export function pesoLeggibile(byte) {
    const mb = byte / 1048576;
    return (mb >= 1 ? mb.toFixed(1) : (byte / 1024).toFixed(0)) + (mb >= 1 ? ' MB' : ' KB');
}
