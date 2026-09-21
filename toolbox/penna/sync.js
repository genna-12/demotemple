/**
 * Tiny Temple Toolbox - Penna: sincronizzazione fra dispositivi (spec 17).
 *
 * Nessun account, nessun cookie, nessun terzo: un **codice del quaderno** di
 * sei parole e' insieme la password e il nome del quaderno. Da quel codice
 * nascono, sul dispositivo, due cose diverse e separate (spec 17 §4):
 *   - la CHIAVE AES-GCM 256, non estraibile, che cifra ogni testo;
 *   - l'ID del quaderno, 32 cifre esadecimali, l'unica cosa che il server vede.
 * PBKDF2-SHA256 a 200 000 iterazioni con sale fisso di dominio, poi HKDF-SHA256
 * con due `info` diverse: chi conosce l'id non ha nessun pezzo della chiave.
 *
 * Il server (`functions/api/quaderno/[[route]].js`) conserva per ogni riga
 * l'id del quaderno, un id di documento casuale (`sid`), la data e un blocco
 * base64 illeggibile. Il confronto e' per documento e vince **l'ultimo
 * salvataggio**: nessuna fusione di testo, mai (spec 17 §7).
 *
 * =====================================================================
 * REGOLA DI CONSENSO (spec 17 §2, stesso patto dei pacchetti lingua)
 * =====================================================================
 * Finche' `attivo` e' falso questo modulo NON tocca la rete: nessuna fetch
 * parte da nessuna funzione se non dopo un Attiva o un Collega dell'utente.
 * `caricaParole()` e' un import dinamico di un modulo precacheato, non una
 * richiesta a `/api/`.
 *
 * API pubblica (la usa penna.js, non il markup):
 *   avvia(ganci)            legge lo stato salvato, -> stato()
 *   stato()                 { attivo, codice, id, ultima, inCorso }
 *   creaCodice()            sei parole nuove (sorteggio locale), non attiva
 *   collega(codice)         valida, deriva, salva: da qui in poi c'e' rete
 *   scollega({ elimina })   toglie chiave e codice; con elimina svuota il server
 *   sincronizza()           un giro (max 20 documenti)
 *   segnaEliminato(id)      la lapide locale, da chiamare PRIMA di del()
 *   onStato(cb)             notifica a ogni cambio di stato
 *   normalizzaCodice / codiceValido / paroleCodice
 */

import { get, put, del, list } from '/shared/storage.js';

const TOOL = 'penna';
const TOMBE = 'penna-tomb';
const SYNC = 'penna-sync';
const BASE = '/api/quaderno/';

const SALE = 'tt-quaderno-v1';
const ITERAZIONI = 200000;
const PAROLE_CODICE = 6;
const MAX_GIRO = 20;            // documenti per giro (spec 17 §4)
const MAX_BLOB = 262144;        // caratteri base64 (spec 17 §4)
const AVANTI = 60 * 1000;       // quanto il server lascia correre l'orologio del client

const enc = new TextEncoder();
const dec = new TextDecoder();

/* ---------------- stato in memoria ---------------- */

const stt = { attivo: false, codice: '', id: '', ultima: 0, inCorso: false };
let chiave = null;              // CryptoKey AES-GCM, non estraibile
let derivazione = null;         // Promise della derivazione in corso
let parole = null;              // la lista delle 2048, caricata a richiesta
let caricamentoParole = null;
let giro = null;                // Promise del giro in corso
let ganci = {};
const ascolto = new Set();

function subtle() {
    const c = typeof globalThis !== 'undefined' ? globalThis.crypto : null;
    if (!c || !c.subtle) throw new Error('crypto non disponibile');
    return c.subtle;
}

function casuali(n) {
    return globalThis.crypto.getRandomValues(new Uint8Array(n));
}

export function stato() {
    return { attivo: stt.attivo, codice: stt.codice, id: stt.id, ultima: stt.ultima, inCorso: stt.inCorso };
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

/* i campi che viaggiano: il `sid` no, e' gia' nell'AAD */
function corpoDi(doc) {
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

export async function cifra(k, id, sid, doc) {
    const iv = casuali(12);
    const aad = enc.encode(id + '|' + sid);
    const ct = await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: aad }, k,
        enc.encode(JSON.stringify(corpoDi(doc))));
    const tutto = new Uint8Array(12 + ct.byteLength);
    tutto.set(iv, 0);
    tutto.set(new Uint8Array(ct), 12);
    return b64(tutto);
}

/** Butta (throw) se il blob, l'id o il sid non sono quelli di prima: AAD + tag GCM. */
export async function decifra(k, id, sid, blob) {
    const tutto = daB64(String(blob || ''));
    if (tutto.length <= 12) throw new Error('blob troppo corto');
    const aad = enc.encode(id + '|' + sid);
    const chiaro = await subtle().decrypt(
        { name: 'AES-GCM', iv: tutto.subarray(0, 12), additionalData: aad }, k, tutto.subarray(12));
    return corpoDi(JSON.parse(dec.decode(chiaro)));
}

/* ---------------- stato a riposo ---------------- */

async function salvaStato() {
    try { await put(SYNC, 'quaderno', { codice: stt.codice, id: stt.id }); } catch (e) { /* senza IndexedDB niente sync */ }
}

async function salvaUltima(quando) {
    stt.ultima = quando;
    try { await put(SYNC, 'ultima', { quando }); } catch (e) { /* solo l'etichetta "Ultima sincronizzazione" */ }
}

/**
 * Legge lo stato salvato e collega i ganci verso penna.js:
 *   applicaDoc(id, doc)  un testo arrivato dal server e' gia' in IndexedDB
 *   rimuoviDoc(id)       un testo eliminato altrove e' gia' sparito da IndexedDB
 *   apertoId()           l'id del testo aperto nell'editor, o null
 * Nessuna rete: `attivo` dice solo che c'e' un codice salvato.
 */
export async function avvia(g) {
    ganci = g || {};
    let rec = null;
    let ult = null;
    try { rec = await get(SYNC, 'quaderno'); } catch (e) { rec = null; }
    try { ult = await get(SYNC, 'ultima'); } catch (e) { ult = null; }
    if (rec && rec.codice && /^[0-9a-f]{32}$/.test(String(rec.id || ''))) {
        stt.codice = String(rec.codice);
        stt.id = String(rec.id);
        stt.attivo = true;
        stt.ultima = (ult && Number(ult.quando)) || 0;
        /* il pezzo lento si prepara quando il dispositivo e' libero */
        const pigro = globalThis.requestIdleCallback || ((f) => setTimeout(f, 1200));
        pigro(() => { chiavi().catch(() => { /* si riprovera' al primo giro */ }); });
    }
    annuncia();
    return stato();
}

/** Valida, deriva, salva. Da qui in poi i giri di sincronizzazione sono leciti. */
export async function collega(codice) {
    if (!await codiceValido(codice)) throw new Error('codice');
    const pulito = normalizzaCodice(codice);
    const d = await deriva(pulito);
    chiave = d.chiave;
    stt.codice = pulito;
    stt.id = d.id;
    stt.attivo = true;
    stt.ultima = 0;
    await salvaStato();
    annuncia();
    return stato();
}

/**
 * Toglie chiave e codice locali: i testi restano dove sono (spec 17 §6.7).
 * Con `elimina` si svuota prima il quaderno sul server; se la rete non c'e'
 * NON si scollega, altrimenti le copie cifrate resterebbero la' senza
 * nessuno che possa piu' cancellarle.
 */
export async function scollega({ elimina = false } = {}) {
    if (elimina) {
        if (!stt.attivo) return stato();
        const { id } = await chiavi();
        const r = await fetch(BASE + id, { method: 'DELETE', cache: 'no-store', credentials: 'omit' });
        if (!r.ok) throw new Error('server');
    }
    stt.attivo = false;
    stt.codice = '';
    stt.id = '';
    stt.ultima = 0;
    chiave = null;
    derivazione = null;
    try { await del(SYNC, 'quaderno'); } catch (e) { /* niente da fare */ }
    try { await del(SYNC, 'ultima'); } catch (e) { /* niente da fare */ }
    /* le lapidi non servono piu' a nessuno: senza codice non si sincronizza */
    try {
        const tombe = await list(TOMBE);
        for (const t of tombe) await del(TOMBE, t.id);
    } catch (e) { /* restano: non danno fastidio */ }
    annuncia();
    return stato();
}

/**
 * La lapide di un testo che sta per essere eliminato (spec 17 §4): va
 * chiamata PRIMA di del('penna', id), perche' il `sid` vive nel documento.
 * Un testo mai sincronizzato non ha `sid` e non lascia nessuna lapide.
 */
export async function segnaEliminato(id, doc) {
    try {
        const d = doc || await get(TOOL, id);
        const sid = d && d.sid;
        if (!sid || !/^[0-9a-f]{16}$/.test(String(sid))) return false;
        /* la lapide deve battere la versione che si aveva sotto gli occhi:
           con l'orologio indietro `Date.now()` da solo non basterebbe e
           l'eliminazione non si propagherebbe mai (il server clampa il resto) */
        await put(TOMBE, String(sid), { aggiornato: Math.max(Date.now(), quando(d) + 1) });
        return true;
    } catch (e) {
        return false;
    }
}

/* ---------------- il giro ---------------- */

const nuovoSid = () => esa(casuali(8));
const nuovoIdLocale = () => new Date().toISOString() + '-' + Math.random().toString(36).slice(2, 7);
const quando = (doc) => {
    const v = Date.parse((doc && doc.modificato) || '');
    return Number.isNaN(v) ? 0 : v;
};

async function chiedi(percorso, opzioni) {
    const r = await fetch(BASE + percorso, {
        cache: 'no-store',
        credentials: 'omit',
        ...opzioni
    });
    if (r.status === 429) { const e = new Error('troppi'); e.codice = 'troppi'; throw e; }
    if (r.status === 413) {
        let errore = 'grande';
        try { errore = (await r.json()).errore || 'grande'; } catch (x) { /* corpo non JSON */ }
        const e = new Error(errore); e.codice = errore === 'pieno' ? 'pieno' : 'grande'; throw e;
    }
    if (!r.ok) { const e = new Error('http ' + r.status); e.codice = 'server'; throw e; }
    return r.json();
}

/**
 * Un giro: manifest, confronto per `sid`, al massimo MAX_GIRO documenti,
 * sequenziali (il resto al giro dopo). -> { esito, inviati, ricevuti,
 * eliminati, restano } con `esito` in ok|spento|offline|server|pieno|grande.
 */
export function sincronizza() {
    if (!stt.attivo) return Promise.resolve({ esito: 'spento' });
    if (giro) return giro;
    stt.inCorso = true;
    annuncia();
    giro = giroVero().finally(() => {
        giro = null;
        stt.inCorso = false;
        annuncia();
    });
    return giro;
}

async function giroVero() {
    const esito = { esito: 'ok', inviati: 0, ricevuti: 0, eliminati: 0, restano: 0 };
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
        manifest = await chiedi(id);
    } catch (e) {
        return { ...esito, esito: e.codice === 'server' ? 'server' : (e.codice || 'offline') };
    }

    /* --- quel che c'e' in casa --- */
    let locali = [];
    try { locali = await list(TOOL); } catch (e) { locali = []; }
    const perSid = new Map();
    const senzaSid = [];
    for (const rec of locali) {
        const doc = rec.value || {};
        const sid = typeof doc.sid === 'string' && /^[0-9a-f]{16}$/.test(doc.sid) ? doc.sid : null;
        if (sid) perSid.set(sid, { id: rec.id, doc });
        else senzaSid.push({ id: rec.id, doc });
    }
    let tombe = [];
    try { tombe = await list(TOMBE); } catch (e) { tombe = []; }
    const perTomba = new Map(tombe.map((t) => [String(t.id), Number((t.value && t.value.aggiornato) || 0)]));

    /* --- quel che c'e' sul server --- */
    const remoti = new Map();
    for (const v of (manifest && manifest.voci) || []) {
        if (v && typeof v.doc === 'string') remoti.set(v.doc, { aggiornato: Number(v.aggiornato) || 0, cancellato: !!v.cancellato });
    }

    /* --- che cosa fare, in ordine di urgenza --- */
    const lavori = [];
    /* 1. i testi che non sono mai partiti: il `sid` nasce adesso */
    for (const l of senzaSid) lavori.push({ tipo: 'nuovo', locale: l });
    /* 2. le lapidi da propagare */
    for (const [sid, morto] of perTomba) {
        const r = remoti.get(sid);
        if (!r) continue;
        if (r.cancellato) continue;
        if (r.aggiornato > morto) lavori.push({ tipo: 'scarica', sid, remoto: r, risorto: true });
        else lavori.push({ tipo: 'cancella', sid, morto });
    }
    /* 3. il confronto documento per documento */
    for (const [sid, l] of perSid) {
        if (perTomba.has(sid)) continue;
        const r = remoti.get(sid);
        const mio = quando(l.doc);
        if (!r) { lavori.push({ tipo: 'invia', sid, locale: l }); continue; }
        if (r.cancellato) {
            if (r.aggiornato >= mio) lavori.push({ tipo: 'sparito', sid, locale: l, remoto: r });
            else lavori.push({ tipo: 'invia', sid, locale: l });
            continue;
        }
        if (mio > r.aggiornato) lavori.push({ tipo: 'invia', sid, locale: l });
        else if (r.aggiornato > mio) lavori.push({ tipo: 'scarica', sid, remoto: r, locale: l });
    }
    /* 4. i testi che qui non ci sono ancora */
    for (const [sid, r] of remoti) {
        if (r.cancellato || perSid.has(sid) || perTomba.has(sid)) continue;
        lavori.push({ tipo: 'scarica', sid, remoto: r });
    }

    esito.restano = Math.max(0, lavori.length - MAX_GIRO);
    const daFare = lavori.slice(0, MAX_GIRO);

    for (const lavoro of daFare) {
        try {
            await esegui(lavoro, k, id, esito);
        } catch (e) {
            if (e && (e.codice === 'pieno' || e.codice === 'troppi')) return { ...esito, esito: e.codice === 'pieno' ? 'pieno' : 'server' };
            if (e && e.codice === 'grande') { esito.esito = 'grande'; continue; }
            if (e && e.codice === 'server') return { ...esito, esito: 'server' };
            return { ...esito, esito: 'offline' };
        }
    }

    await salvaUltima(Date.now());
    return esito;
}

async function esegui(lavoro, k, id, esito) {
    if (lavoro.tipo === 'nuovo') {
        const sid = nuovoSid();
        const doc = { ...lavoro.locale.doc, sid };
        await put(TOOL, lavoro.locale.id, doc);
        if (typeof ganci.applicaDoc === 'function') ganci.applicaDoc(lavoro.locale.id, doc);
        await invia(k, id, sid, lavoro.locale.id, doc);
        esito.inviati++;
        return;
    }
    if (lavoro.tipo === 'invia') {
        await invia(k, id, lavoro.sid, lavoro.locale.id, lavoro.locale.doc);
        esito.inviati++;
        return;
    }
    if (lavoro.tipo === 'cancella') {
        await chiedi(id + '/' + lavoro.sid, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ aggiornato: lavoro.morto })
        });
        esito.eliminati++;
        return;
    }
    if (lavoro.tipo === 'sparito') {
        /* eliminato su un altro dispositivo: sparisce anche qui, con lapide */
        await put(TOMBE, lavoro.sid, { aggiornato: lavoro.remoto.aggiornato });
        try { await del(TOOL, lavoro.locale.id); } catch (e) { /* gia' sparito */ }
        if (typeof ganci.rimuoviDoc === 'function') ganci.rimuoviDoc(lavoro.locale.id);
        esito.eliminati++;
        return;
    }
    if (lavoro.tipo === 'scarica') {
        const voce = await chiedi(id + '/' + lavoro.sid);
        if (!voce || voce.cancellato || !voce.blob) return;
        let doc;
        try {
            doc = await decifra(k, id, lavoro.sid, voce.blob);
        } catch (e) {
            /* codice sbagliato o riga corrotta: si lascia stare quel documento */
            return;
        }
        doc.sid = lavoro.sid;
        const idLocale = lavoro.locale ? lavoro.locale.id : nuovoIdLocale();
        await put(TOOL, idLocale, doc);
        if (lavoro.risorto) { try { await del(TOMBE, lavoro.sid); } catch (e) { /* niente */ } }
        if (typeof ganci.applicaDoc === 'function') ganci.applicaDoc(idLocale, doc);
        esito.ricevuti++;
    }
}

/**
 * Un PUT, e poi la data che il server ha davvero scritto.
 *
 * Il server clampa `aggiornato` a `min(client, adesso+60 s)` perche' un
 * orologio avanti non vinca per sempre. Se il dispositivo e' avanti di piu'
 * di un minuto, il record locale resterebbe piu' "nuovo" della copia remota
 * e il giro dopo rifarebbe lo stesso PUT, **all'infinito**. Quindi: si clampa
 * gia' qui con lo stesso criterio, e la data tornata dal server si riscrive
 * nel record locale. Cosi' il giro successivo non trova piu' niente da fare.
 */
async function invia(k, id, sid, idLocale, doc) {
    const blob = await cifra(k, id, sid, doc);
    if (blob.length > MAX_BLOB) { const e = new Error('grande'); e.codice = 'grande'; throw e; }
    const adesso = Date.now();
    const aggiornato = Math.min(quando(doc) || adesso, adesso + AVANTI);
    const r = await chiedi(id + '/' + sid, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aggiornato, blob })
    });
    const scritto = Number(r && r.aggiornato);
    if (!idLocale || !Number.isFinite(scritto) || scritto === quando(doc)) return;
    /* il server ha clampato (o il nostro orologio era avanti): ci si allinea */
    const allineato = { ...doc, modificato: new Date(scritto).toISOString() };
    try { await put(TOOL, idLocale, allineato); } catch (e) { /* si riproverra' al giro dopo */ }
    if (typeof ganci.applicaDoc === 'function') ganci.applicaDoc(idLocale, allineato);
}
