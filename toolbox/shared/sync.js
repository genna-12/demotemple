/**
 * Tiny Temple Toolbox - sincronizzazione fra dispositivi (spec 18 §4, erede
 * della spec 17 §4 che valeva per la sola Penna).
 *
 * Nessun account, nessun cookie, nessun terzo: un **codice della Toolbox** di
 * sei parole e' insieme la password e il nome del quaderno. Uno solo per
 * tutta la Toolbox, si crea e si collega da Impostazioni. Da quel codice
 * nascono, sul dispositivo, due cose diverse e separate:
 *   - la CHIAVE AES-GCM 256, non estraibile, che cifra ogni documento;
 *   - l'ID del quaderno, 32 cifre esadecimali, l'unica cosa che il server vede.
 * PBKDF2-SHA256 a 200 000 iterazioni con sale fisso di dominio, poi HKDF-SHA256
 * con due `info` diverse: chi conosce l'id non ha nessun pezzo della chiave.
 *
 * Il server (`functions/api/quaderno/[[route]].js`) conserva per ogni riga
 * l'id del quaderno, la COLLEZIONE, il `sid` del record, la data e un blocco
 * base64 illeggibile. AAD = `<id>|<collezione>|<sid>`: una riga spostata di
 * quaderno, di collezione o di documento non si decifra piu'. Il confronto e'
 * per documento e vince **l'ultimo salvataggio**; la LAPIDE vince su una copia
 * piu' vecchia. Nessuna fusione, mai (spec 17 §7).
 *
 * =====================================================================
 * REGOLA DI CONSENSO (spec 17 §2, spec 18 §10.4)
 * =====================================================================
 * Finche' `attivo` e' falso questo modulo NON tocca la rete: nessuna fetch
 * parte da nessuna funzione se non dopo un Attiva o un Collega dell'utente.
 * `avvia()` legge solo IndexedDB; `caricaParole()` e' un import dinamico di
 * un modulo precacheato, non una richiesta a `/api/`.
 *
 * =====================================================================
 * IL GIRO
 * =====================================================================
 * manifest (UNA richiesta, tutte le collezioni) -> per ogni collezione
 * sincronizzabile e accesa, in ordine di priorita' (`SINCRONIZZABILI` di
 * limiti.js: impostazioni, penna, uscite, accordature, metronomo-preset,
 * dna), confronto `modificato` locale / `aggiornato` remoto per `sid` ->
 * al massimo MAX_GIRO documenti: invii e lapidi in LOTTI da <= 20
 * (`PUT /api/quaderno/<id>/<coll>`, un solo `batch()` sul server), poi i
 * documenti piu' recenti a gruppi da <= 20 (`GET <id>/<coll>?doc=a,b,...`).
 * Il resto al giro dopo, che parte da solo. Una collezione piena o un
 * documento troppo grande non fermano le altre collezioni ne' la
 * ricezione; un 429 si aspetta (Retry-After) e si riprova. Offline non
 * parte nessuna richiesta: si riprende all'evento `online`. Un quaderno
 * trovato VUOTO dopo che aveva delle voci (svuotato da un altro
 * dispositivo) non si ricarica da solo: esito `vuoto-remoto`, e reinvia
 * solo `sincronizza({ forza: true })` (spec 17 §6.7).
 *
 * Quando: all'apertura di ogni pagina che ha dati (`avviaPagina()`: elenco
 * di Penna, DNA, Pianificatore, Accordatore, Metronomo, Impostazioni; non
 * la dashboard), 3 s dopo l'ultimo salvataggio (onChange dell'archivio con
 * `locali`, le scritture della sincronizzazione stessa escluse) e a mano.
 * Un giro per volta anche fra schede (Web Locks, dove ci sono).
 *
 * Le IMPOSTAZIONI hanno per id la chiave della preferenza, uguale su ogni
 * dispositivo: il loro `sid` qui si ricava dalla chiave (SHA-256 di
 * `impostazioni|<chiave>`), cosi' due telefoni che hanno scelto la lingua
 * ognuno per conto suo parlano dello STESSO documento invece di farne due.
 *
 * Stato locale (store `records` di storage.js, tool `sync`; mai esportato,
 * mai sincronizzato): `quaderno` {codice, id}, `ultima` {quando},
 * `collezioni` {<coll>: false} gli interruttori spenti, `remoto` {id, visto}
 * (il server ha gia' avuto voci di questo quaderno). Il codice salvato
 * dalla Penna di prima (`penna-sync`) si sposta qui al primo avvio.
 *
 * API
 *   avvia()                    legge lo stato salvato (e migra `penna-sync`)
 *   avviaPagina()              avvia + giro d'apertura + giro 3 s dopo i salvataggi
 *   stato()                    { attivo, codice, id, ultima, inCorso, esito, collezioni }
 *   onStato(cb)                a ogni cambio di stato (inizio/fine giro, collega...)
 *   creaCodice()               sei parole nuove (sorteggio locale), non attiva
 *   collega(codice)            valida, deriva, salva: da qui in poi c'e' rete
 *   scollega({ elimina })      toglie chiave e codice; con elimina svuota il server
 *   sincronizza({ forza })     un giro -> { esito, inviati, ricevuti, eliminati, restano, richieste, perCollezione }
 *   pianifica()                un giro fra 3 s (si rimanda a ogni chiamata)
 *   collezioni()               [{ coll, nome, attiva }]
 *   impostaCollezione(coll, on)
 *   normalizzaCodice / codiceValido / paroleCodice / deriva / cifra / decifra
 */

import { get, put, del } from '/shared/storage.js';
import {
    elenca, scrivi, elimina, segnaSincronizzato, ripara, onChange, applicaPreferenze, portabile
} from '/shared/archivio.js';
import { SINCRONIZZABILI, MAX_BLOB, MAX_CORPO as MAX_CORPO_SERVER } from '/shared/limiti.js';

const STATO = 'sync';
const VECCHIO = 'penna-sync';   // la Penna della spec 17
const BASE = '/api/quaderno/';

const SALE = 'tt-quaderno-v1';
const ITERAZIONI = 200000;
const PAROLE_CODICE = 6;
const MAX_GIRO = 60;            // documenti per giro (spec 18 §4)
const MAX_LOTTO = 20;           // voci per PUT a lotti (spec 18 §4)
const MAX_CORPO = MAX_CORPO_SERVER - 16 * 1024;   // un lotto sta sotto il tetto del server
const MAX_ATTESA = 60;          // s: il piu' lungo Retry-After che si aspetta
const TENTATIVI_429 = 3;        // quante volte si riprova dopo un 429
const AVANTI = 60 * 1000;       // quanto il server lascia correre l'orologio del client
const DOPO = 3000;              // ms di quiete dopo l'ultimo salvataggio

const enc = new TextEncoder();
const dec = new TextDecoder();
const SID_RE = /^[0-9a-f]{16}$/;
const ID_RE = /^[0-9a-f]{32}$/;
const PER_COLL = new Map(SINCRONIZZABILI.map((c) => [c.coll, c]));

/* ---------------- stato in memoria ---------------- */

const stt = { attivo: false, codice: '', id: '', ultima: 0, inCorso: false, esito: '', spente: {}, visto: false };
let chiave = null;              // CryptoKey AES-GCM, non estraibile
let derivazione = null;         // Promise della derivazione in corso
let parole = null;              // la lista delle 2048, caricata a richiesta
let caricamentoParole = null;
let giro = null;                // Promise del giro in corso
let avvio = null;               // Promise di avvia()
let timer = null;
let paginaAvviata = false;
/* "Scollega ed elimina" alza la generazione: il giro in corso non manda
   piu' niente (chiedi() controlla prima di ogni richiesta) e le attese
   dopo un 429 e le letture in volo si annullano (AbortController) */
let generazione = 0;
let controllo = null;
const ascolto = new Set();

function subtle() {
    const c = typeof globalThis !== 'undefined' ? globalThis.crypto : null;
    if (!c || !c.subtle) throw new Error('crypto non disponibile');
    return c.subtle;
}

function casuali(n) {
    return globalThis.crypto.getRandomValues(new Uint8Array(n));
}

export function collezioni() {
    return SINCRONIZZABILI.map((c) => ({ coll: c.coll, nome: c.nome, attiva: stt.spente[c.coll] !== true }));
}

export function stato() {
    const accese = {};
    SINCRONIZZABILI.forEach((c) => { accese[c.coll] = stt.spente[c.coll] !== true; });
    return {
        attivo: stt.attivo, codice: stt.codice, id: stt.id, ultima: stt.ultima,
        inCorso: stt.inCorso, esito: stt.esito, collezioni: accese
    };
}

export function onStato(cb) {
    if (typeof cb === 'function') ascolto.add(cb);
    return () => ascolto.delete(cb);
}

function annuncia() {
    const s = stato();
    ascolto.forEach((cb) => { try { cb(s); } catch (e) { /* un ascoltatore rotto non ferma gli altri */ } });
}

/* ---------------- il codice ---------------- */

/** Le 2048 parole: modulo precacheato, si carica solo quando serve. */
async function caricaParole() {
    if (parole) return parole;
    if (!caricamentoParole) {
        caricamentoParole = import('/penna/parole-codice.js')
            .then((m) => { parole = (m && (m.PAROLE || m.default)) || null; return parole; })
            .catch(() => { caricamentoParole = null; return null; });
    }
    return caricamentoParole;
}

/**
 * Minuscole, NFKD senza segni, separatori (spazi, trattini, a capo, punti)
 * ridotti a una spaziatura sola. E' la forma su cui gira PBKDF2: due
 * dispositivi che scrivono il codice in modi diversi devono derivare uguale.
 */
export function normalizzaCodice(codice) {
    return String(codice == null ? '' : codice)
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z]+/g, ' ')
        .trim();
}

export function paroleCodice(codice) {
    const n = normalizzaCodice(codice);
    return n ? n.split(' ') : [];
}

/** Vero solo con sei parole tutte nella lista: si risponde senza toccare la rete. */
export async function codiceValido(codice) {
    const p = paroleCodice(codice);
    if (p.length !== PAROLE_CODICE) return false;
    const lista = await caricaParole();
    if (!lista) return false;
    const dentro = new Set(lista);
    return p.every((w) => dentro.has(w));
}

/** Indice uniforme in [0, n): si rifiuta la coda che falserebbe il modulo. */
function indice(n) {
    const limite = Math.floor(0x100000000 / n) * n;
    const buf = new Uint32Array(1);
    let v;
    do {
        globalThis.crypto.getRandomValues(buf);
        v = buf[0];
    } while (v >= limite);
    return v % n;
}

/** Sei parole nuove (2048^6 = 66 bit). Non attiva niente e non tocca la rete. */
export async function creaCodice() {
    const lista = await caricaParole();
    if (!lista || lista.length !== 2048) throw new Error('lista delle parole non disponibile');
    const out = [];
    for (let i = 0; i < PAROLE_CODICE; i++) out.push(lista[indice(lista.length)]);
    return out.join(' ');
}

/* ---------------- derivazione ---------------- */

const esa = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

/**
 * PBKDF2(200k, sale di dominio) -> 256 bit; poi HKDF con due `info`:
 * "quaderno-chiave" da' l'AES-GCM non estraibile, "quaderno-id" i 16 byte
 * dell'identificatore. Gira una volta per sessione: e' il pezzo lento.
 */
export async function deriva(codice) {
    const passphrase = normalizzaCodice(codice);
    const s = subtle();
    const seme = await s.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveBits']);
    const bits = await s.deriveBits(
        { name: 'PBKDF2', salt: enc.encode(SALE), iterations: ITERAZIONI, hash: 'SHA-256' }, seme, 256);
    const hk = await s.importKey('raw', bits, 'HKDF', false, ['deriveKey', 'deriveBits']);
    const k = await s.deriveKey(
        { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: enc.encode('quaderno-chiave') },
        hk, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    const idBits = await s.deriveBits(
        { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: enc.encode('quaderno-id') }, hk, 128);
    return { chiave: k, id: esa(idBits) };
}

/** La derivazione della sessione: una sola, riusata. */
function chiavi() {
    if (chiave && stt.id) return Promise.resolve({ chiave, id: stt.id });
    if (!derivazione) {
        derivazione = deriva(stt.codice).then((d) => {
            chiave = d.chiave;
            if (!stt.id) stt.id = d.id;
            derivazione = null;
            return d;
        }, (e) => { derivazione = null; throw e; });
    }
    return derivazione;
}

/** Il `sid` di un record "di chiave" (le impostazioni): uguale ovunque. */
export async function sidDiChiave(coll, id) {
    const h = await subtle().digest('SHA-256', enc.encode(coll + '|' + String(id)));
    return esa(h).slice(0, 16);
}

/* ---------------- cifratura per documento ---------------- */

function b64(bytes) {
    let s = '';
    const passo = 0x8000;
    for (let i = 0; i < bytes.length; i += passo) s += String.fromCharCode.apply(null, bytes.subarray(i, i + passo));
    return btoa(s);
}

function daB64(testo) {
    const bin = atob(testo);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}

/* Un testo di Penna: solo i campi che servono, nella forma giusta. */
function corpoPenna(doc) {
    const d = doc || {};
    return {
        titolo: typeof d.titolo === 'string' ? d.titolo : '',
        testo: typeof d.testo === 'string' ? d.testo : '',
        creato: d.creato || '',
        modificato: d.modificato || '',
        lingua: d.lingua || 'it',
        emuet: !!d.emuet,
        dialefe: d.dialefe && typeof d.dialefe === 'object' ? d.dialefe : {}
    };
}

/**
 * Cifra `{ id, dati }`: l'id locale viaggia (dentro il blocco cifrato) perche'
 * per alcune collezioni ha un senso anche altrove (la chiave di una
 * preferenza); collezione e `sid` stanno gia' nell'AAD.
 */
export async function cifra(k, id, coll, sid, contenuto) {
    const iv = casuali(12);
    const aad = enc.encode(id + '|' + coll + '|' + sid);
    const ct = await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: aad }, k,
        enc.encode(JSON.stringify(contenuto)));
    const tutto = new Uint8Array(12 + ct.byteLength);
    tutto.set(iv, 0);
    tutto.set(new Uint8Array(ct), 12);
    return b64(tutto);
}

/**
 * -> { id, dati }. Butta (throw) se blob, id, collezione o sid non sono
 * quelli di prima (AAD + tag GCM). Un blocco della Penna della spec 17 (il
 * documento nudo, senza involucro) torna come `{ id: null, dati }`.
 */
export async function decifra(k, id, coll, sid, blob) {
    const tutto = daB64(String(blob || ''));
    if (tutto.length <= 12) throw new Error('blob troppo corto');
    const aad = enc.encode(id + '|' + coll + '|' + sid);
    const chiaro = await subtle().decrypt(
        { name: 'AES-GCM', iv: tutto.subarray(0, 12), additionalData: aad }, k, tutto.subarray(12));
    const x = JSON.parse(dec.decode(chiaro));
    const involucro = x && typeof x === 'object' && !Array.isArray(x) && Object.prototype.hasOwnProperty.call(x, 'dati');
    const idLocale = involucro && (typeof x.id === 'string' || (typeof x.id === 'number' && Number.isFinite(x.id))) ? x.id : null;
    let dati = involucro ? x.dati : x;
    if (coll === 'penna') dati = corpoPenna(dati);
    return { id: idLocale, dati };
}

/* ---------------- stato a riposo ---------------- */

async function salvaStato() {
    try { await put(STATO, 'quaderno', { codice: stt.codice, id: stt.id }); } catch (e) { /* senza IndexedDB niente sync */ }
}

async function salvaUltima(quando) {
    stt.ultima = quando;
    try { await put(STATO, 'ultima', { quando }); } catch (e) { /* solo l'etichetta "Ultima sincronizzazione" */ }
}

/**
 * Il codice attivato dalla Penna di prima (`penna-sync`) passa a `sync`: chi
 * aveva gia' acceso la sincronizzazione dei testi non deve rifare niente.
 * Si scrive prima di cancellare.
 */
async function migraVecchio() {
    let rec = null;
    try { rec = await get(VECCHIO, 'quaderno'); } catch (e) { return null; }
    if (!rec) return null;
    if (rec.codice && ID_RE.test(String(rec.id || ''))) {
        let ult = null;
        try { ult = await get(VECCHIO, 'ultima'); } catch (e) { ult = null; }
        await put(STATO, 'quaderno', { codice: String(rec.codice), id: String(rec.id) });
        if (ult && Number(ult.quando)) await put(STATO, 'ultima', { quando: Number(ult.quando) });
    }
    try { await del(VECCHIO, 'quaderno'); } catch (e) { /* si riprova al prossimo avvio */ }
    try { await del(VECCHIO, 'ultima'); } catch (e) { /* idem */ }
    try { return await get(STATO, 'quaderno'); } catch (e) { return null; }
}

/**
 * Legge lo stato salvato. Nessuna rete: `attivo` dice solo che c'e' un
 * codice salvato. Idempotente.
 */
export function avvia() {
    if (!avvio) {
        avvio = (async () => {
            let rec = null;
            let ult = null;
            let spente = null;
            try { rec = await get(STATO, 'quaderno'); } catch (e) { rec = null; }
            if (!rec) { try { rec = await migraVecchio(); } catch (e) { rec = null; } }
            try { ult = await get(STATO, 'ultima'); } catch (e) { ult = null; }
            try { spente = await get(STATO, 'collezioni'); } catch (e) { spente = null; }
            let remoto = null;
            try { remoto = await get(STATO, 'remoto'); } catch (e) { remoto = null; }
            stt.spente = {};
            if (spente && typeof spente === 'object') {
                for (const c of SINCRONIZZABILI) if (spente[c.coll] === false) stt.spente[c.coll] = true;
            }
            if (rec && rec.codice && ID_RE.test(String(rec.id || ''))) {
                stt.codice = String(rec.codice);
                stt.id = String(rec.id);
                stt.attivo = true;
                stt.ultima = (ult && Number(ult.quando)) || 0;
                stt.visto = !!(remoto && remoto.id === stt.id && remoto.visto);
                /* il pezzo lento si prepara quando il dispositivo e' libero */
                const pigro = globalThis.requestIdleCallback || ((f) => setTimeout(f, 1200));
                pigro(() => { if (stt.attivo) chiavi().catch(() => { /* si riprovera' al primo giro */ }); });
            }
            annuncia();
            return stato();
        })();
    }
    return avvio;
}

/** Valida, deriva, salva. Da qui in poi i giri di sincronizzazione sono leciti. */
export async function collega(codice) {
    await avvia();
    if (!await codiceValido(codice)) throw new Error('codice');
    const pulito = normalizzaCodice(codice);
    const d = await deriva(pulito);
    chiave = d.chiave;
    stt.codice = pulito;
    stt.id = d.id;
    stt.attivo = true;
    stt.ultima = 0;
    stt.esito = '';
    stt.visto = false;
    await salvaStato();
    try { await del(STATO, 'ultima'); } catch (e) { /* niente da fare */ }
    try { await del(STATO, 'remoto'); } catch (e) { /* niente da fare */ }
    annuncia();
    return stato();
}

/**
 * Toglie chiave e codice locali: i dati restano dove sono (spec 17 §6.7).
 * Con `elimina` si svuota prima il quaderno sul server; se la rete non c'e'
 * NON si scollega, altrimenti le copie cifrate resterebbero la' senza
 * nessuno che possa piu' cancellarle.
 */
export async function scollega({ elimina: eliminaDalServer = false } = {}) {
    await avvia();
    if (timer) { clearTimeout(timer); timer = null; }
    /* il giro in corso si ferma: nessuna richiesta nuova, le letture e le
       attese si annullano, le scritture gia' partite si ASPETTANO (cosi'
       arrivano al server prima del DELETE, non dopo) */
    generazione++;
    if (controllo) { try { controllo.abort(); } catch (e) { /* niente */ } }
    if (giro) { try { await giro; } catch (e) { /* finito comunque */ } }
    if (eliminaDalServer) {
        if (!stt.attivo) return stato();
        const { id } = await chiavi();
        let r;
        try {
            r = await fetch(BASE + id, { method: 'DELETE', cache: 'no-store', credentials: 'omit' });
        } catch (e) {
            throw new Error('offline');
        }
        if (!r.ok) throw new Error('server');
    }
    if (timer) { clearTimeout(timer); timer = null; }
    stt.attivo = false;
    stt.codice = '';
    stt.id = '';
    stt.ultima = 0;
    stt.esito = '';
    chiave = null;
    derivazione = null;
    stt.visto = false;
    try { await del(STATO, 'quaderno'); } catch (e) { /* niente da fare */ }
    try { await del(STATO, 'ultima'); } catch (e) { /* niente da fare */ }
    try { await del(STATO, 'remoto'); } catch (e) { /* niente da fare */ }
    /* le lapidi restano nell'archivio: servono anche a esporta/importa, e
       quelle gia' sincronizzate le pota l'archivio dopo 90 giorni */
    annuncia();
    return stato();
}

/** Accende o spegne una collezione (interruttore locale, mai sincronizzato). */
export async function impostaCollezione(coll, on) {
    await avvia();
    if (!PER_COLL.has(coll)) return stato();
    if (on) delete stt.spente[coll];
    else stt.spente[coll] = true;
    const salvate = {};
    Object.keys(stt.spente).forEach((c) => { salvate[c] = false; });
    try { await put(STATO, 'collezioni', salvate); } catch (e) { /* resta per questa sessione */ }
    annuncia();
    /* riaccesa: quel che e' rimasto indietro parte al prossimo giro */
    if (on) pianifica();
    return stato();
}

/* ---------------- quando ---------------- */

const offline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

/** Un giro fra 3 s di quiete; ogni chiamata lo rimanda. Spenta: niente. */
export function pianifica(ms = DOPO) {
    if (!stt.attivo) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
        timer = null;
        if (giro) { pianifica(ms); return; }
        sincronizza().catch(() => { /* lo stato lo dice gia' */ });
    }, ms);
}

/**
 * Le pagine che hanno dati la chiamano all'avvio: stato salvato, un giro
 * subito se c'e' un codice (e la rete), e da li' un giro 3 s dopo ogni
 * salvataggio di questa scheda e uno quando torna la rete. Le scritture
 * della sincronizzazione stessa (`origine: 'sync'`) non ne fanno partire un
 * altro.
 */
export async function avviaPagina({ subito = true } = {}) {
    if (!paginaAvviata) {
        paginaAvviata = true;
        onChange('*', (m) => {
            if (!m || !m.locale || m.origine === 'sync') return;
            if (!PER_COLL.has(m.coll)) return;
            pianifica();
        }, { locali: true });
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => { if (stt.attivo) pianifica(500); });
        }
    }
    await avvia();
    if (subito && stt.attivo && !offline()) {
        sincronizza().catch(() => { /* lo stato lo dice gia' */ });
    }
    return stato();
}

/* ---------------- rete ---------------- */

function errore(codice, msg) {
    const e = new Error(msg || codice);
    e.codice = codice;
    return e;
}

/** Aspetta `ms`, ma si interrompe se il giro viene fermato. */
function aspetta(ms, conto) {
    return new Promise((ok, ko) => {
        const t = setTimeout(() => { pulisci(); ok(); }, ms);
        const via = () => { clearTimeout(t); pulisci(); ko(errore('fermo')); };
        const segnale = conto && conto.segnale;
        function pulisci() { if (segnale) segnale.removeEventListener('abort', via); }
        if (segnale) {
            if (segnale.aborted) { via(); return; }
            segnale.addEventListener('abort', via);
        }
    });
}

/**
 * Una richiesta a /api/quaderno/. Prima di partire controlla che il giro
 * non sia stato fermato (Scollega ed elimina) e che ci sia la rete. Un 429
 * non ferma la catena: si aspetta il Retry-After (al massimo 60 s) e si
 * riprova, fino a tre volte. Le LETTURE si possono annullare; le scritture
 * no: una volta partite si aspetta la risposta, cosi' l'ordine sul server e'
 * quello che si vede qui.
 */
async function chiedi(percorso, opzioni, conto) {
    for (let tentativo = 0; ; tentativo++) {
        if (conto && conto.gen !== generazione) throw errore('fermo');
        if (offline()) throw errore('offline');
        if (conto) conto.richieste++;
        const lettura = !opzioni || !opzioni.method || opzioni.method === 'GET';
        let r;
        try {
            r = await fetch(BASE + percorso, {
                cache: 'no-store',
                credentials: 'omit',
                ...opzioni,
                ...(lettura && conto && conto.segnale ? { signal: conto.segnale } : {})
            });
        } catch (x) {
            if (conto && conto.gen !== generazione) throw errore('fermo');
            throw errore('offline', 'rete');
        }
        if (r.status === 429) {
            if (tentativo >= TENTATIVI_429) throw errore('troppi');
            const dopo = Math.min(MAX_ATTESA, Math.max(1, Number(r.headers.get('Retry-After')) || 5));
            await aspetta(dopo * 1000, conto);
            continue;
        }
        if (r.status === 413) {
            let codice = 'grande';
            try { codice = (await r.json()).errore || 'grande'; } catch (x) { /* corpo non JSON */ }
            throw errore(codice === 'pieno' ? 'pieno' : 'grande');
        }
        if (!r.ok) throw errore('server', 'http ' + r.status);
        try {
            return await r.json();
        } catch (x) {
            throw errore('server', 'json');
        }
    }
}

/* ---------------- il giro ---------------- */

/* dal meno al piu' grave: l'esito del giro e' il peggiore visto */
const GRAVITA = ['ok', 'grande', 'pieno'];
function peggiora(esito, codice) {
    if (GRAVITA.indexOf(codice) > GRAVITA.indexOf(esito.esito)) esito.esito = codice;
}

/**
 * Un giro, uno per volta (anche fra schede, con Web Locks dove ci sono).
 * `{ forza: true }` reinvia anche su un server trovato vuoto (vedi sotto).
 * -> { esito, inviati, ricevuti, eliminati, restano, richieste, perCollezione }
 * con `esito` in ok|spento|offline|server|pieno|grande|vuoto-remoto|fermo.
 * Offline non parte nessuna richiesta (e quindi nessun errore in console):
 * si riprova quando torna la rete.
 */
export function sincronizza({ forza = false } = {}) {
    if (!stt.attivo) return Promise.resolve({ esito: 'spento' });
    if (giro) return giro;
    if (offline()) {
        if (stt.esito !== 'offline') { stt.esito = 'offline'; annuncia(); }
        return Promise.resolve({ esito: 'offline', inviati: 0, ricevuti: 0, eliminati: 0, restano: 0, richieste: 0, perCollezione: {} });
    }
    stt.inCorso = true;
    annuncia();
    controllo = typeof AbortController === 'function' ? new AbortController() : null;
    const conto = { gen: generazione, segnale: controllo ? controllo.signal : null, forza };
    const blocchi = typeof navigator !== 'undefined' && navigator.locks && typeof navigator.locks.request === 'function'
        ? navigator.locks : null;
    const corsa = blocchi ? blocchi.request('tt-sync', () => giroVero(conto)) : giroVero(conto);
    giro = Promise.resolve(corsa).catch(() => ({ esito: 'server' })).then(async (esito) => {
        if (conto.gen !== generazione) return { ...esito, esito: 'fermo' };
        stt.esito = esito.esito;
        if (['ok', 'pieno', 'grande'].includes(esito.esito)) await salvaUltima(Date.now());
        return esito;
    }).finally(() => {
        giro = null;
        controllo = null;
        stt.inCorso = false;
        annuncia();
    });
    /* oltre i 60 documenti il resto va al giro dopo, da solo */
    giro.then((e) => { if (e && e.esito === 'ok' && e.restano > 0) pianifica(); });
    return giro;
}

const nuovoIdPenna = () => new Date().toISOString() + '-' + Math.random().toString(36).slice(2, 7);

function contatori(esito, coll) {
    if (!esito.perCollezione[coll]) esito.perCollezione[coll] = { inviati: 0, ricevuti: 0, eliminati: 0, esito: 'ok' };
    return esito.perCollezione[coll];
}

/** Le impostazioni col sid a caso (nate prima del codice) prendono quello di chiave. */
async function sidDiChiavi(coll, locali) {
    const out = [];
    for (const rec of locali) {
        let giusto;
        try { giusto = await sidDiChiave(coll, rec.id); } catch (e) { out.push(rec); continue; }
        if (rec.sid === giusto) { out.push(rec); continue; }
        try {
            if (rec.cancellato) {
                await elimina(coll, rec.id, { sid: giusto, modificato: rec.modificato, origine: 'sync' });
            } else {
                await scrivi(coll, rec.id, rec.dati, { sid: giusto, modificato: rec.modificato, origine: 'sync' });
            }
            out.push({ ...rec, sid: giusto, sincronizzato: undefined });
        } catch (e) {
            out.push(rec);
        }
    }
    return out;
}

/** Il lavoro di una collezione, in ordine di urgenza. */
async function lavoriDi(coll, remoti, esito) {
    const reg = PER_COLL.get(coll);
    let locali = [];
    try { locali = await elenca(coll, { conCancellati: true }); } catch (e) { locali = []; }
    if (reg.chiave) locali = await sidDiChiavi(coll, locali.filter((r) => portabile(String(r.id))));
    const ids = new Set(locali.map((r) => String(r.id)));
    const perSid = new Map();      // sid -> { id, dati, mod }
    const perTomba = new Map();    // sid -> { id, morto, sinc }
    for (const rec of locali) {
        if (!SID_RE.test(rec.sid)) continue;       // non ancora migrato: al giro dopo
        if (rec.cancellato) perTomba.set(rec.sid, { id: rec.id, morto: rec.modificato, sinc: rec.sincronizzato });
        else perSid.set(rec.sid, { id: rec.id, dati: rec.dati, mod: rec.modificato });
    }

    const lavori = [];
    /* 1. le lapidi da propagare: la lapide vince su una copia piu' vecchia */
    for (const [sid, tomba] of perTomba) {
        const r = remoti.get(sid);
        if (!r || r.cancellato) {
            /* il server non l'ha (niente da cancellare) o lo sa gia': la
               lapide e' sincronizzata, si potra' potare */
            if (!(tomba.sinc >= tomba.morto)) {
                try { await segnaSincronizzato(coll, tomba.id, tomba.morto); } catch (e) { /* al giro dopo */ }
            }
            continue;
        }
        if (r.aggiornato > tomba.morto) lavori.push({ coll, tipo: 'scarica', sid, remoto: r, tomba });
        else lavori.push({ coll, tipo: 'cancella', sid, tomba });
    }
    /* 2. il confronto documento per documento */
    for (const [sid, l] of perSid) {
        if (perTomba.has(sid)) continue;
        const r = remoti.get(sid);
        if (!r) { lavori.push({ coll, tipo: 'invia', sid, locale: l }); continue; }
        if (r.cancellato) {
            if (r.aggiornato >= l.mod) lavori.push({ coll, tipo: 'sparito', sid, locale: l, remoto: r });
            else lavori.push({ coll, tipo: 'invia', sid, locale: l });
            continue;
        }
        if (l.mod > r.aggiornato) lavori.push({ coll, tipo: 'invia', sid, locale: l });
        else if (r.aggiornato > l.mod) lavori.push({ coll, tipo: 'scarica', sid, remoto: r, locale: l });
    }
    /* 3. i documenti che qui non ci sono ancora */
    for (const [sid, r] of remoti) {
        if (r.cancellato || perSid.has(sid) || perTomba.has(sid)) continue;
        lavori.push({ coll, tipo: 'scarica', sid, remoto: r });
    }
    contatori(esito, coll);
    return { lavori, ids };
}

/* Un errore che ferma tutto il giro (rete, server, fermato); gli altri
   ('pieno', 'grande', 'limite') riguardano una collezione sola. */
const fatale = (e) => !!e && ['offline', 'server', 'troppi', 'fermo'].includes(e.codice);
const esitoDi = (e) => (e.codice === 'troppi' ? 'server' : e.codice);

async function giroVero(conto) {
    const esito = { esito: 'ok', inviati: 0, ricevuti: 0, eliminati: 0, restano: 0, richieste: 0, perCollezione: {} };
    conto.richieste = 0;
    const tieni = () => { esito.richieste = conto.richieste; return esito; };
    if (!stt.attivo) return { ...esito, esito: 'spento' };
    let k;
    let id;
    try {
        const d = await chiavi();
        k = d.chiave;
        id = d.id;
    } catch (e) {
        return { ...esito, esito: 'server' };
    }

    let manifest;
    try {
        manifest = await chiedi(id, undefined, conto);
    } catch (e) {
        return { ...tieni(), esito: fatale(e) ? esitoDi(e) : 'server' };
    }
    const vociRemote = (manifest && Array.isArray(manifest.voci)) ? manifest.voci : [];

    /* SERVER VUOTO (spec 17 §6.7): questo quaderno aveva delle voci e ora
       non ne ha nessuna. Qualcuno ha fatto "Scollega ed elimina" da un altro
       dispositivo: i dati di qui restano, ma NON si ricaricano da soli sul
       server. Lo decide l'utente ("Reinvia i dati", sincronizza({forza})). */
    if (!vociRemote.length && stt.visto && !conto.forza) {
        return { ...tieni(), esito: 'vuoto-remoto' };
    }

    /* prima si avvolge quel che una scheda col codice di prima puo' aver
       scritto nudo nel frattempo (record senza `v`, `penna-tomb`) */
    try { await ripara(); } catch (e) { /* in sola lettura: si confronta quel che c'e' */ }

    /* il manifest porta tutte le collezioni del quaderno, in una volta */
    const remotiPer = new Map();
    for (const v of vociRemote) {
        if (!v || typeof v.doc !== 'string' || typeof v.collezione !== 'string') continue;
        if (!remotiPer.has(v.collezione)) remotiPer.set(v.collezione, new Map());
        remotiPer.get(v.collezione).set(v.doc, { aggiornato: Number(v.aggiornato) || 0, cancellato: !!v.cancellato });
    }

    /* il lavoro di tutte le collezioni accese, in ordine di priorita' */
    const tutti = [];
    const idsPer = new Map();
    for (const reg of SINCRONIZZABILI) {
        if (stt.spente[reg.coll]) continue;
        const { lavori, ids } = await lavoriDi(reg.coll, remotiPer.get(reg.coll) || new Map(), esito);
        idsPer.set(reg.coll, ids);
        tutti.push(...lavori);
    }
    esito.restano = Math.max(0, tutti.length - MAX_GIRO);
    const daFare = tutti.slice(0, MAX_GIRO);
    let ricevutoImpostazioni = false;

    try {
        /* --- invii e lapidi: a lotti, collezione per collezione. Una
               collezione piena o un documento troppo grande non fermano
               le altre, ne' la ricezione --- */
        for (const reg of SINCRONIZZABILI) {
            const miei = daFare.filter((l) => l.coll === reg.coll && (l.tipo === 'invia' || l.tipo === 'cancella'));
            if (!miei.length) continue;
            try {
                await inviaLotti(reg.coll, miei, k, id, esito, conto);
            } catch (e) {
                if (fatale(e)) throw e;
                contatori(esito, reg.coll).esito = e.codice === 'pieno' ? 'pieno' : 'grande';
                peggiora(esito, e.codice === 'pieno' ? 'pieno' : 'grande');
            }
        }

        /* --- i documenti spariti altrove, poi quelli da scaricare, a
               gruppi di 20 per collezione (una richiesta per gruppo) --- */
        for (const reg of SINCRONIZZABILI) {
            const cont = contatori(esito, reg.coll);
            for (const l of daFare) {
                if (l.coll !== reg.coll || l.tipo !== 'sparito') continue;
                try {
                    const quando = l.remoto.aggiornato;
                    await elimina(reg.coll, l.locale.id, { modificato: quando, sincronizzato: quando, origine: 'sync' });
                    cont.eliminati++;
                    esito.eliminati++;
                    if (reg.coll === 'impostazioni') ricevutoImpostazioni = true;
                } catch (e) { /* al giro dopo */ }
            }
            const scarica = daFare.filter((l) => l.coll === reg.coll && l.tipo === 'scarica');
            try {
                for (let i = 0; i < scarica.length; i += MAX_LOTTO) {
                    const n = await ricevi(reg.coll, scarica.slice(i, i + MAX_LOTTO), k, id, esito, idsPer.get(reg.coll), conto);
                    if (n && reg.coll === 'impostazioni') ricevutoImpostazioni = true;
                }
            } catch (e) {
                if (fatale(e)) throw e;
                /* archivio locale pieno per questa collezione: si passa alla prossima */
                cont.esito = 'pieno';
                peggiora(esito, 'pieno');
            }
        }
    } catch (e) {
        if (ricevutoImpostazioni) { try { await applicaPreferenze(); } catch (x) { /* al prossimo avvio */ } }
        return { ...tieni(), esito: esitoDi(e) };
    }
    /* le preferenze arrivate vanno anche nella copia veloce (localStorage) */
    if (ricevutoImpostazioni) { try { await applicaPreferenze(); } catch (e) { /* al prossimo avvio */ } }

    /* il server ha delle voci di questo quaderno: da qui in poi un manifest
       vuoto vuol dire "svuotato", non "nuovo" */
    if (!stt.visto && (vociRemote.length || esito.inviati)) {
        stt.visto = true;
        try { await put(STATO, 'remoto', { id, visto: true }); } catch (e) { /* si riscrive al giro dopo */ }
    }
    return tieni();
}

/**
 * Invii e lapidi di una collezione: lotti da <= 20 voci e sotto il tetto
 * del corpo, un PUT ciascuno. Il server clampa `aggiornato` a
 * `min(client, adesso+60 s)`: si clampa gia' qui con lo stesso criterio e
 * la data tornata si riscrive nel record, altrimenti un orologio avanti
 * rifarebbe lo stesso PUT all'infinito. Una voce si segna sincronizzata
 * solo se il server l'ha APPLICATA, o se il server ne ha una piu' recente
 * (che il giro dopo scarichera').
 * Butta 'pieno' (voci rifiutate) o 'grande' dopo aver mandato tutto il resto.
 */
async function inviaLotti(coll, lavori, k, id, esito, conto) {
    const cont = contatori(esito, coll);
    const voci = [];
    let grande = false;
    for (const l of lavori) {
        const adesso = Date.now();
        if (l.tipo === 'cancella') {
            voci.push({ lavoro: l, voce: { doc: l.sid, aggiornato: Math.min(l.tomba.morto, adesso + AVANTI), cancellato: 1 } });
            continue;
        }
        const blob = await cifra(k, id, coll, l.sid, { id: l.locale.id, dati: l.locale.dati });
        if (blob.length > MAX_BLOB) { grande = true; continue; }
        voci.push({ lavoro: l, voce: { doc: l.sid, aggiornato: Math.min(l.locale.mod || adesso, adesso + AVANTI), blob } });
    }
    /* i lotti */
    const lotti = [];
    let corrente = [];
    let peso = 20;
    for (const v of voci) {
        const p = JSON.stringify(v.voce).length + 1;
        if (corrente.length && (corrente.length >= MAX_LOTTO || peso + p > MAX_CORPO)) {
            lotti.push(corrente);
            corrente = [];
            peso = 20;
        }
        corrente.push(v);
        peso += p;
    }
    if (corrente.length) lotti.push(corrente);

    let pieno = false;
    for (const lotto of lotti) {
        let r;
        try {
            r = await chiedi(id + '/' + coll, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ voci: lotto.map((v) => v.voce) })
            }, conto);
        } catch (e) {
            if (e && e.codice === 'grande') { grande = true; continue; }
            if (e && e.codice === 'pieno') { pieno = true; continue; }
            throw e;
        }
        const risposte = new Map(((r && r.voci) || []).map((x) => [x && x.doc, x]));
        for (const { lavoro, voce } of lotto) {
            const x = risposte.get(voce.doc);
            if (!x) continue;
            if (x.errore) { if (x.errore === 'pieno') pieno = true; continue; }
            const scritto = Number(x.aggiornato);
            if (lavoro.tipo === 'cancella') {
                const morto = lavoro.tomba.morto;
                /* applicata; o il server non aveva il documento (0); o ne ha
                   uno piu' recente, che il giro dopo scarichera' */
                if (x.applicato || scritto === 0 || scritto > morto) {
                    try { await segnaSincronizzato(coll, lavoro.tomba.id, morto); } catch (e) { /* al giro dopo */ }
                }
                if (x.applicato) { cont.eliminati++; esito.eliminati++; }
                continue;
            }
            const l = lavoro.locale;
            if (!x.applicato) {
                if (Number.isFinite(scritto) && scritto > l.mod) {
                    try { await segnaSincronizzato(coll, l.id, l.mod); } catch (e) { /* niente di grave */ }
                }
                continue;
            }
            cont.inviati++;
            esito.inviati++;
            if (!Number.isFinite(scritto)) continue;
            if (scritto === l.mod) {
                try { await segnaSincronizzato(coll, l.id, l.mod); } catch (e) { /* niente di grave */ }
                continue;
            }
            /* il server ha clampato: ci si allinea (e in Penna anche la data del documento) */
            const allineato = coll === 'penna' && l.dati && typeof l.dati === 'object'
                ? { ...l.dati, modificato: new Date(scritto).toISOString() } : l.dati;
            try {
                await scrivi(coll, l.id, allineato, { sid: lavoro.sid, modificato: scritto, sincronizzato: scritto, origine: 'sync' });
            } catch (e) { /* si riproverra' al giro dopo */ }
        }
    }
    if (pieno) throw errore('pieno');
    if (grande) throw errore('grande');
}

/**
 * Fino a 20 documenti di una collezione in UNA richiesta
 * (`GET <id>/<coll>?doc=a,b,...`). -> quanti ne sono entrati.
 * Archivio locale pieno: butta 'limite' (la collezione si salta); un
 * documento troppo grande qui si salta e basta.
 */
async function ricevi(coll, lavori, k, id, esito, ids, conto) {
    const cont = contatori(esito, coll);
    const r = await chiedi(id + '/' + coll + '?doc=' + lavori.map((l) => l.sid).join(','), undefined, conto);
    const perDoc = new Map(((r && r.voci) || []).map((v) => [v && v.doc, v]));
    const reg = PER_COLL.get(coll);
    let entrati = 0;
    for (const lavoro of lavori) {
        if (conto.gen !== generazione) throw errore('fermo');
        const voce = perDoc.get(lavoro.sid);
        if (!voce || voce.cancellato || !voce.blob) continue;
        let arrivo;
        try {
            arrivo = await decifra(k, id, coll, lavoro.sid, voce.blob);
        } catch (e) {
            /* codice sbagliato o riga corrotta: si lascia stare quel documento */
            continue;
        }
        /* l'id locale: quello del record che c'era (vivo o lapide); se no
           quello che viaggia nel blocco, se qui e' libero; se no il sid */
        let idLocale = lavoro.locale ? lavoro.locale.id : (lavoro.tomba ? lavoro.tomba.id : null);
        if (idLocale === null) {
            if (reg.chiave) {
                if (arrivo.id === null || !portabile(String(arrivo.id))) continue;
                idLocale = arrivo.id;
            } else if (arrivo.id !== null && !ids.has(String(arrivo.id))) {
                idLocale = arrivo.id;
            } else {
                idLocale = arrivo.id === null && coll === 'penna' ? nuovoIdPenna() : lavoro.sid;
            }
        }
        const quando = Number(voce.aggiornato) || lavoro.remoto.aggiornato;
        try {
            await scrivi(coll, idLocale, arrivo.dati, { sid: lavoro.sid, modificato: quando, sincronizzato: quando, origine: 'sync' });
        } catch (e) {
            if (e && e.codice === 'grande') { cont.esito = 'grande'; peggiora(esito, 'grande'); continue; }
            if (e && e.codice === 'limite') throw errore('limite');
            continue;
        }
        ids.add(String(idLocale));
        cont.ricevuti++;
        esito.ricevuti++;
        entrati++;
    }
    return entrati;
}
