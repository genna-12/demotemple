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
 * l'id del quaderno, la COLLEZIONE, un id di documento casuale (`sid`), la
 * data e un blocco base64 illeggibile. La collezione (schema definitivo,
 * spec 18 §4) separa dentro lo stesso quaderno cifrato i testi di Penna dalle
 * uscite, dalle impostazioni e da quello che verra': qui si usa solo `penna`
 * e il manifest, che le porta tutte, si filtra su quella. Il confronto e' per documento e vince **l'ultimo
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
 *   onStato(cb)             notifica a ogni cambio di stato
 *   normalizzaCodice / codiceValido / paroleCodice
 */

/*
 * ARCHIVIO (spec 18 §3). I testi sono record dell'archivio unico, collezione
 * `penna`: `{ sid, modificato, cancellato, dati }`. Il `sid` lo assegna
 * l'archivio alla prima scrittura, `modificato` (epoch ms) e' l'orologio che
 * si confronta con `aggiornato` del server, e la LAPIDE e' il record stesso
 * con `cancellato:1` (addio collezione `penna-tomb`). Dopo ogni scambio
 * riuscito il record si segna `sincronizzato`: e' cio' che permette di
 * potare le lapidi dopo 90 giorni. Lo stato della sincronizzazione (codice,
 * id, ultima) resta in `penna-sync` via storage.js: e' locale, non si
 * esporta e non si sincronizza mai.
 * Il giro generalizzato a tutte le collezioni e' `shared/sync.js` (giro 3).
 */
import { get, put, del } from '/shared/storage.js';
import { elenca, scrivi, elimina, segnaSincronizzato, ripara } from '/shared/archivio.js';

const TOOL = 'penna';
const SYNC = 'penna-sync';
const BASE = '/api/quaderno/';
const COLLEZIONE = 'penna';     // la nostra fetta del quaderno (spec 18 §4)

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

/* i campi che viaggiano: collezione e `sid` no, sono gia' nell'AAD */
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

/**
 * AAD = `<id>|<collezione>|<sid>` (spec 17 §4, forma della 18 §4): il blocco
 * cifrato e' legato al quaderno, alla collezione E al documento, quindi una
 * riga spostata fra collezioni o fra documenti non si decifra piu'.
 */
export async function cifra(k, id, coll, sid, doc) {
    const iv = casuali(12);
    const aad = enc.encode(id + '|' + coll + '|' + sid);
    const ct = await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: aad }, k,
        enc.encode(JSON.stringify(corpoDi(doc))));
    const tutto = new Uint8Array(12 + ct.byteLength);
    tutto.set(iv, 0);
    tutto.set(new Uint8Array(ct), 12);
    return b64(tutto);
}

/** Butta (throw) se blob, id, collezione o sid non sono quelli di prima: AAD + tag GCM. */
export async function decifra(k, id, coll, sid, blob) {
    const tutto = daB64(String(blob || ''));
    if (tutto.length <= 12) throw new Error('blob troppo corto');
    const aad = enc.encode(id + '|' + coll + '|' + sid);
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
    /* le lapidi restano nell'archivio: servono anche a esporta/importa, e
       quelle gia' sincronizzate le pota l'archivio dopo 90 giorni */
    annuncia();
    return stato();
}

/* La lapide la scrive l'archivio (`elimina`), nel record stesso: stesso
   `sid`, `modificato` almeno +1 sulla versione che si aveva sotto gli occhi,
   cosi' batte anche con l'orologio indietro (il server clampa il resto). */

/* ---------------- il giro ---------------- */

const SID_RE = /^[0-9a-f]{16}$/;
const nuovoIdLocale = () => new Date().toISOString() + '-' + Math.random().toString(36).slice(2, 7);

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

    /* --- quel che c'e' in casa: record vivi e lapidi dell'archivio ---
       prima si avvolge quel che una scheda col codice di prima puo' aver
       scritto nudo nel frattempo (record senza `v`, `penna-tomb`) */
    try { await ripara(); } catch (e) { /* in sola lettura: si confronta quel che c'e' */ }
    let locali = [];
    try { locali = await elenca(TOOL, { conCancellati: true }); } catch (e) { locali = []; }
    const perSid = new Map();      // sid -> { id, doc, mod }
    const perTomba = new Map();    // sid -> { id, morto, sinc }
    for (const rec of locali) {
        if (!SID_RE.test(rec.sid)) continue;       // non ancora migrato: al giro dopo
        if (rec.cancellato) perTomba.set(rec.sid, { id: rec.id, morto: rec.modificato, sinc: rec.sincronizzato });
        else perSid.set(rec.sid, { id: rec.id, doc: rec.dati || {}, mod: rec.modificato });
    }

    /* --- quel che c'e' sul server --- */
    const remoti = new Map();
    for (const v of (manifest && manifest.voci) || []) {
        /* il manifest porta tutte le collezioni del quaderno: qui interessa
           solo la nostra, le altre sono di strumenti diversi (spec 18 §4) */
        if (!v || typeof v.doc !== 'string' || v.collezione !== COLLEZIONE) continue;
        remoti.set(v.doc, { aggiornato: Number(v.aggiornato) || 0, cancellato: !!v.cancellato });
    }

    /* --- che cosa fare, in ordine di urgenza --- */
    const lavori = [];
    const confermate = [];
    /* 1. le lapidi da propagare (il `sid` c'e' sempre: lo da' l'archivio) */
    for (const [sid, tomba] of perTomba) {
        const r = remoti.get(sid);
        if (!r) continue;
        if (r.cancellato) {
            /* il server lo sa gia': la lapide e' sincronizzata, si potra' potare */
            if (!(tomba.sinc >= tomba.morto)) confermate.push(tomba);
            continue;
        }
        if (r.aggiornato > tomba.morto) lavori.push({ tipo: 'scarica', sid, remoto: r, tomba });
        else lavori.push({ tipo: 'cancella', sid, tomba });
    }
    /* 2. il confronto documento per documento */
    for (const [sid, l] of perSid) {
        if (perTomba.has(sid)) continue;
        const r = remoti.get(sid);
        const mio = l.mod;
        if (!r) { lavori.push({ tipo: 'invia', sid, locale: l }); continue; }
        if (r.cancellato) {
            if (r.aggiornato >= mio) lavori.push({ tipo: 'sparito', sid, locale: l, remoto: r });
            else lavori.push({ tipo: 'invia', sid, locale: l });
            continue;
        }
        if (mio > r.aggiornato) lavori.push({ tipo: 'invia', sid, locale: l });
        else if (r.aggiornato > mio) lavori.push({ tipo: 'scarica', sid, remoto: r, locale: l });
    }
    /* 3. i testi che qui non ci sono ancora */
    for (const [sid, r] of remoti) {
        if (r.cancellato || perSid.has(sid) || perTomba.has(sid)) continue;
        lavori.push({ tipo: 'scarica', sid, remoto: r });
    }

    for (const t of confermate) {
        try { await segnaSincronizzato(TOOL, t.id, t.morto); } catch (e) { /* al giro dopo */ }
    }

    esito.restano = Math.max(0, lavori.length - MAX_GIRO);
    const daFare = lavori.slice(0, MAX_GIRO);

    for (const lavoro of daFare) {
        try {
            await esegui(lavoro, k, id, esito);
        } catch (e) {
            /* 'limite' = quaderno locale pieno (ErroreLimite dell'archivio) */
            if (e && e.codice === 'limite') return { ...esito, esito: 'pieno' };
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
    if (lavoro.tipo === 'invia') {
        await invia(k, id, lavoro.sid, lavoro.locale.id, lavoro.locale.doc, lavoro.locale.mod);
        esito.inviati++;
        return;
    }
    if (lavoro.tipo === 'cancella') {
        await chiedi(id + '/' + COLLEZIONE + '/' + lavoro.sid, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ aggiornato: lavoro.tomba.morto })
        });
        try { await segnaSincronizzato(TOOL, lavoro.tomba.id, lavoro.tomba.morto); } catch (e) { /* al giro dopo */ }
        esito.eliminati++;
        return;
    }
    if (lavoro.tipo === 'sparito') {
        /* eliminato su un altro dispositivo: sparisce anche qui, e la lapide
           porta la data del server (gia' sincronizzata) */
        const quandoRemoto = lavoro.remoto.aggiornato;
        await elimina(TOOL, lavoro.locale.id, { modificato: quandoRemoto, sincronizzato: quandoRemoto });
        if (typeof ganci.rimuoviDoc === 'function') ganci.rimuoviDoc(lavoro.locale.id);
        esito.eliminati++;
        return;
    }
    if (lavoro.tipo === 'scarica') {
        const voce = await chiedi(id + '/' + COLLEZIONE + '/' + lavoro.sid);
        if (!voce || voce.cancellato || !voce.blob) return;
        let doc;
        try {
            doc = await decifra(k, id, COLLEZIONE, lavoro.sid, voce.blob);
        } catch (e) {
            /* codice sbagliato o riga corrotta: si lascia stare quel documento */
            return;
        }
        /* il record prende sid e data del server; una lapide piu' vecchia
           della copia remota torna viva nello stesso record */
        const idLocale = lavoro.locale ? lavoro.locale.id : (lavoro.tomba ? lavoro.tomba.id : nuovoIdLocale());
        const quandoRemoto = Number(voce.aggiornato) || lavoro.remoto.aggiornato;
        await scrivi(TOOL, idLocale, doc, { sid: lavoro.sid, modificato: quandoRemoto, sincronizzato: quandoRemoto });
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
async function invia(k, id, sid, idLocale, doc, mod) {
    const blob = await cifra(k, id, COLLEZIONE, sid, doc);
    if (blob.length > MAX_BLOB) { const e = new Error('grande'); e.codice = 'grande'; throw e; }
    const adesso = Date.now();
    const aggiornato = Math.min(mod || adesso, adesso + AVANTI);
    const r = await chiedi(id + '/' + COLLEZIONE + '/' + sid, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aggiornato, blob })
    });
    const scritto = Number(r && r.aggiornato);
    if (!idLocale || !Number.isFinite(scritto)) return;
    if (scritto === mod) {
        try { await segnaSincronizzato(TOOL, idLocale, mod); } catch (e) { /* niente di grave */ }
        return;
    }
    /* il server ha clampato (o il nostro orologio era avanti): ci si allinea,
       record e data nel documento */
    const allineato = { ...doc, modificato: new Date(scritto).toISOString() };
    try {
        await scrivi(TOOL, idLocale, allineato, { sid, modificato: scritto, sincronizzato: scritto });
    } catch (e) { /* si riproverra' al giro dopo */ }
    if (typeof ganci.applicaDoc === 'function') ganci.applicaDoc(idLocale, allineato);
}
