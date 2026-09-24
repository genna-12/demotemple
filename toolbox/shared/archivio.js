/**
 * Tiny Temple Toolbox - archivio unico (spec 18 §3).
 *
 * Sta SOPRA `storage.js` (IndexedDB `records`, chiave [tool, id]): lo store
 * non cambia, il campo `tool` diventa la COLLEZIONE (`penna`, `dna`,
 * `accordature`, `metronomo-preset`, `uscite`, `impostazioni`). Il `value`
 * di storage.js e' sempre un record uniforme:
 *
 *   { v:1, sid, modificato, cancellato, dati, sincronizzato? }
 *
 *   sid            16 hex casuali, assegnati alla PRIMA SCRITTURA (servono
 *                  alla sincronizzazione e a esporta/importa, che uniscono
 *                  per `sid`, non per id locale)
 *   modificato     epoch ms; ogni scrittura lo porta ad almeno +1 sul
 *                  precedente, cosi' l'ultima vince anche con l'orologio indietro
 *   cancellato     0 | 1. La LAPIDE e' il record stesso con cancellato:1 e
 *                  dati:null: niente piu' collezione separata `penna-tomb`
 *   dati           il payload dello strumento, com'era prima
 *   sincronizzato  (solo sul dispositivo, mai esportato) il `modificato` che
 *                  il server ha confermato. Un record e' "gia' sincronizzato"
 *                  quando sincronizzato >= modificato. Lo scrive solo la
 *                  sincronizzazione con `segnaSincronizzato` (o le opzioni di
 *                  scrivi/elimina); serve a potare le lapidi.
 *
 * POTATURA: una lapide sparisce davvero dopo 90 giorni SOLO se gia'
 * sincronizzata (spec 18 §3). Una lapide mai sincronizzata resta (poche
 * decine di byte): un altro dispositivo, o un file esportato prima, potrebbe
 * ancora avere il record vivo. La potatura gira da `pronto()` al massimo una volta al giorno
 * (`tt.archivio.potatura` in localStorage, locale e mai sincronizzata).
 *
 * CANCELLAZIONE DURA: `elimina(coll, id, { lapide: false })` toglie il record
 * senza lapide. Solo per le potature locali automatiche (es. lo storico del
 * DNA oltre le 200 voci), mai per un'eliminazione chiesta dall'utente: quella
 * deve arrivare agli altri dispositivi.
 *
 * VERSIONE DELLO SCHEMA in `impostazioni/schema` (dentro IndexedDB, non in
 * localStorage: se l'utente svuota quello, le migrazioni non ripartono).
 * Migrazioni numerate, idempotenti, UNA transazione per passo (i dati e la
 * versione nuova si scrivono insieme o per niente), da `pronto()`, che ogni
 * funzione qui sotto chiama prima di leggere o scrivere:
 *   1 `penna`: il vecchio value diventa `dati`; `sid` dal documento se c'e'
 *     (la 17 lo scriveva), `modificato` = il `modificato` del documento, che
 *     e' l'orologio usato dalla sincronizzazione 17 (cosi' niente re-invio
 *     di tutti i testi al primo giro), e `updated` di storage.js se manca.
 *   2 `penna-tomb` -> lapidi in `penna` (id = sid); le chiavi vecchie si
 *     cancellano nella stessa transazione, dopo le scritture.
 *   3 `dna`: stesso involucro, id = timestamp dell'analisi (come prima).
 *   4 `pianificatore` (e `pianificatore-uscita`, per sicurezza) -> `uscite`.
 *   5 `tt.accordatore.custom` -> un record per accordatura in `accordature`
 *     (id = quello di prima, `c1`, `c2`...). La preferenza NON si cancella:
 *     accordatore.js la scrive ancora per una versione.
 *   6 preferenze portabili di localStorage -> un record per chiave in
 *     `impostazioni` (id = chiave di localStorage).
 * Si scrive sempre prima di cancellare. Due record con lo stesso sid nella
 * stessa collezione non restano mai: il secondo (in ordine di id) prende un
 * sid nuovo. Un piano con un id gia' presente in `uscite` e dati diversi
 * arriva con un id nuovo: si tengono entrambi.
 *
 * RIPARAZIONE (`ripara()`): i passi 1-4 si rifanno a OGNI avvio anche a
 * schema 6, in una transazione: una scheda rimasta aperta col codice di
 * prima puo' ancora scrivere record nudi o `penna-tomb`, e qui vengono
 * avvolti e assorbiti. La chiama anche la sincronizzazione prima di un giro.
 *
 * SOLA LETTURA: se la migrazione fallisce (disco pieno, IndexedDB rotto) la
 * sessione non si svuota: leggi/elenca mostrano i dati com'erano, scrivi ed
 * elimina rifiutano con codice 'migrazione', `onAvviso` lo dice
 * all'interfaccia, e la migrazione si riprova al prossimo avvio.
 *
 * PREFERENZE. localStorage resta la copia veloce (lang-boot.js e' sincrono
 * e la legge da li'), l'archivio e' la verita'. Il modo meno invasivo: qui
 * c'e' un `prefs` con la STESSA forma di quello di storage.js; gli strumenti
 * cambiano solo da dove lo importano. `prefs.set` scrive localStorage subito
 * e, se la chiave e' portabile, il record in `impostazioni` in coda. Per le
 * chiavi intere (es. `tinyTempleLang`) ci sono `pref()` e `impostaPref()`.
 * Locali e mai nell'archivio: consenso al microfono, codice della
 * sincronizzazione, pacchetti lingua installati (`tt.penna.pacchetti`,
 * `tt.penna.rimario`) e `tt.penna.ultimo` (e' un id locale, altrove non
 * vuol dire niente).
 *
 * API
 *   pronto()                              migrazioni + potatura, idempotente
 *   leggi(coll, id)                       -> dati | undefined (lapide = undefined)
 *   leggiRecord(coll, id)                 -> { id, sid, modificato, cancellato, dati } | undefined
 *   scrivi(coll, id|null, dati, opz)      -> id   (opz: sid, modificato, sincronizzato)
 *   elenca(coll, { conCancellati })       -> [{ id, sid, modificato, cancellato, dati }] per id
 *   elimina(coll, id, opz)                lapide; -> true se c'era un record vivo
 *                                         (opz.lapide:false = cancellazione dura)
 *   svuota(coll?)                         cancella DAVVERO (niente lapidi): serve a
 *                                         "Cancella tutto" e a importa/sostituisci
 *   onChange(coll|'*', cb)                cambi fatti da ALTRE schede (BroadcastChannel)
 *   esportaTutto()                        -> { app, schema, esportato, collezioni, preferenze }
 *   importaTutto(json, { strategia })     'unisci' (per sid, vince il `modificato`
 *                                         piu' recente) | 'sostituisci' (quel che
 *                                         non e' nel file diventa lapide)
 *   ripara(), inSolaLettura(), onAvviso(cb)
 *   segnaSincronizzato(coll, id, modificato)
 *   prefs.get/set, pref, impostaPref, portabile, applicaPreferenze
 * Oltre i limiti di `limiti.js`: `ErroreLimite` (codice 'limite' | 'grande').
 */

import { get as sGet, put as sPut, del as sDel, list as sList, transazione, prefs as sPrefs } from './storage.js';
import { COLLEZIONI, limiteDi, pesoByte } from './limiti.js';

export { LIMITI, COLLEZIONI } from './limiti.js';

export const APP = 'tiny-temple-toolbox';
export const VERSIONE_SCHEMA = 6;
const IMPOSTAZIONI = 'impostazioni';
const SCHEMA_ID = 'schema';
const CANALE = 'tt-archivio';
const GIORNO = 24 * 60 * 60 * 1000;
const VITA_LAPIDE = 90 * GIORNO;
const CHIAVE_POTATURA = 'tt.archivio.potatura';
const SID_RE = /^[0-9a-f]{16}$/;
const COLL_RE = /^[a-z][a-z0-9-]{1,31}$/;

/* ---------------- errori ---------------- */

export class ErroreLimite extends Error {
    constructor(coll, tipo, max) {
        super(tipo === 'byte'
            ? 'record troppo grande per ' + coll + ' (massimo ' + max + ' byte)'
            : 'troppi record in ' + coll + ' (massimo ' + max + ')');
        this.name = 'ErroreLimite';
        this.codice = tipo === 'byte' ? 'grande' : 'limite';
        this.coll = coll;
        this.max = max;
    }
}

/* ---------------- record ---------------- */

function nuovoSid() {
    const b = new Uint8Array(8);
    const c = typeof globalThis !== 'undefined' ? globalThis.crypto : null;
    if (c && typeof c.getRandomValues === 'function') c.getRandomValues(b);
    else for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256);
    return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

const sidValido = (s) => typeof s === 'string' && SID_RE.test(s);
const numero = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : NaN);
const quandoIso = (v) => {
    const t = typeof v === 'string' ? Date.parse(v) : NaN;
    return Number.isNaN(t) ? 0 : t;
};

function eRecord(v) {
    return !!v && typeof v === 'object' && v.v === 1 && typeof v.sid === 'string'
        && typeof v.modificato === 'number' && Object.prototype.hasOwnProperty.call(v, 'dati');
}

function avvolgi(dati, { sid, modificato, cancellato = 0, sincronizzato } = {}) {
    const r = {
        v: 1,
        sid: sidValido(sid) ? sid : nuovoSid(),
        modificato: Number.isFinite(modificato) ? modificato : Date.now(),
        cancellato: cancellato ? 1 : 0,
        dati: cancellato || dati === undefined ? null : dati
    };
    if (Number.isFinite(sincronizzato)) r.sincronizzato = sincronizzato;
    return r;
}

/* un value letto prima della migrazione (o se la migrazione non e' potuta
   partire): stessa forma, sid vuoto. Non si perde niente a video. */
function comeRecord(value, updated) {
    if (eRecord(value)) return value;
    return { v: 1, sid: '', modificato: Number(updated) || 0, cancellato: 0, dati: value === undefined ? null : value };
}

function aVista(id, rec) {
    const o = {
        id,
        sid: rec.sid,
        modificato: rec.modificato,
        cancellato: rec.cancellato ? 1 : 0,
        dati: rec.cancellato ? null : rec.dati
    };
    if (Number.isFinite(rec.sincronizzato)) o.sincronizzato = rec.sincronizzato;
    return o;
}

function controlla(coll) {
    if (typeof coll !== 'string' || !COLL_RE.test(coll)) throw new Error('collezione non valida: ' + coll);
}

/* ---------------- migrazioni ---------------- */

function versioneDi(value) {
    const d = value && value.dati;
    const n = d && Number(d.versione);
    return Number.isFinite(n) ? n : 0;
}

/**
 * Un passo = una transazione readwrite. Dentro solo callback (niente await):
 * una transazione IndexedDB si chiude appena resta senza richieste. La
 * versione si rilegge DENTRO la transazione, cosi' due schede che migrano
 * insieme non ripetono il passo (le readwrite sullo stesso store si mettono
 * in fila). `corpo(store, fine, fallisci)`: `fine()` scrive la versione.
 */
function passo(n, corpo) {
    return transazione('readwrite', (store) => new Promise((ok, ko) => {
        const fallisci = (e) => {
            try { store.transaction.abort(); } catch (x) { /* gia' chiusa */ }
            ko(e || new Error('migrazione ' + n + ' fallita'));
        };
        const r = store.get([IMPOSTAZIONI, SCHEMA_ID]);
        r.onerror = () => fallisci(r.error);
        r.onsuccess = () => {
            const prima = r.result && eRecord(r.result.value) ? r.result.value : null;
            if (versioneDi(prima) >= n) { ok(false); return; }
            const fine = () => {
                store.put({
                    tool: IMPOSTAZIONI,
                    id: SCHEMA_ID,
                    value: avvolgi({ versione: n }, { sid: prima ? prima.sid : '' }),
                    updated: Date.now()
                });
                ok(true);
            };
            try { corpo(store, fine, fallisci); } catch (e) { fallisci(e); }
        };
    }));
}

/* getAll di una collezione dentro la transazione del passo */
function tutti(store, tool, fallisci, cb) {
    const q = store.index('tool').getAll(tool);
    q.onerror = () => fallisci(q.error);
    q.onsuccess = () => {
        try { cb(q.result || []); } catch (e) { fallisci(e); }
    };
}

const oggetto = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

function lsLeggi(chiave) {
    try { return window.localStorage.getItem(chiave); } catch (e) { return null; }
}

function lsChiavi() {
    const out = [];
    try {
        const ls = window.localStorage;
        for (let i = 0; i < ls.length; i++) {
            const k = ls.key(i);
            if (k !== null) out.push(k);
        }
    } catch (e) { /* localStorage bloccato: nessuna preferenza da copiare */ }
    return out;
}

/*
 * I passi 1-4 lavorano su una VISTA: si legge tutto quel che serve dentro la
 * transazione, si decide in memoria, poi si mandano tutte le scritture e
 * SOLO DOPO le cancellazioni (si scrive sempre prima di cancellare). Gli
 * stessi pezzi, rimessi insieme, sono `ripara()`: la migrazione incrementale
 * che gira a ogni avvio anche a schema 6 (una scheda rimasta col codice
 * vecchio puo' ancora scrivere record nudi o `penna-tomb`).
 */

function leggiTutte(store, tools, fallisci, cb) {
    const out = {};
    let i = 0;
    const avanti = () => {
        if (i === tools.length) { cb(out); return; }
        const tool = tools[i++];
        tutti(store, tool, fallisci, (recs) => { out[tool] = recs; avanti(); });
    };
    avanti();
}

function nuovaVista(snap) {
    const mappe = {};
    Object.keys(snap).forEach((t) => { mappe[t] = new Map(snap[t].map((r) => [String(r.id), r])); });
    const puts = new Map();
    const dels = new Map();
    const chiave = (tool, id) => tool + '\u0000' + String(id);
    return {
        di: (tool) => [...(mappe[tool] || new Map()).values()],
        ha: (tool, id) => !!mappe[tool] && mappe[tool].has(String(id)),
        prendi: (tool, id) => (mappe[tool] ? mappe[tool].get(String(id)) : undefined),
        metti(raw) {
            (mappe[raw.tool] = mappe[raw.tool] || new Map()).set(String(raw.id), raw);
            const k = chiave(raw.tool, raw.id);
            puts.set(k, raw);
            dels.delete(k);
        },
        togli(tool, id) {
            if (mappe[tool]) mappe[tool].delete(String(id));
            const k = chiave(tool, id);
            dels.set(k, [tool, id]);
            puts.delete(k);
        },
        applica(store) {
            puts.forEach((raw) => store.put(raw));
            dels.forEach((k) => store.delete(k));
            return puts.size + dels.size;
        }
    };
}

/** 1: `penna` nell'involucro. */
function avvolgiPenna(w) {
    for (const raw of w.di('penna')) {
        if (eRecord(raw.value)) continue;
        let dati = raw.value;
        let sid = '';
        if (oggetto(raw.value)) {
            const { sid: s, ...resto } = raw.value;
            dati = resto;
            sid = typeof s === 'string' ? s : '';
        }
        const modificato = (oggetto(raw.value) && quandoIso(raw.value.modificato)) || Number(raw.updated) || Date.now();
        w.metti({ tool: 'penna', id: raw.id, value: avvolgi(dati, { sid, modificato }), updated: raw.updated || Date.now() });
    }
}

/** 2: `penna-tomb` -> lapidi in `penna` (id = sid), poi via le chiavi vecchie. */
function assorbiLapidi(w) {
    const sids = new Set(w.di('penna').filter((r) => eRecord(r.value)).map((r) => r.value.sid));
    for (const t of w.di('penna-tomb')) {
        const sid = String(t.id);
        /* un testo vivo con lo stesso sid vince: la 17 lo lasciava a vista,
           e la sincronizzazione decide poi col server */
        if (SID_RE.test(sid) && !sids.has(sid) && !w.ha('penna', sid)) {
            const morto = Number(t.value && t.value.aggiornato) || Number(t.updated) || Date.now();
            w.metti({ tool: 'penna', id: sid, value: avvolgi(null, { sid, modificato: morto, cancellato: 1 }), updated: Date.now() });
            sids.add(sid);
        }
        w.togli('penna-tomb', t.id);
    }
}

/** 3: lo storico del DNA nell'involucro; id = timestamp dell'analisi. */
function avvolgiDna(w) {
    for (const raw of w.di('dna')) {
        if (eRecord(raw.value)) continue;
        const modificato = (oggetto(raw.value) && quandoIso(raw.value.at)) || quandoIso(raw.id)
            || Number(raw.updated) || Date.now();
        w.metti({ tool: 'dna', id: raw.id, value: avvolgi(raw.value, { modificato }), updated: raw.updated || Date.now() });
    }
}

/**
 * 4: i piani del Pianificatore -> `uscite`. Un id gia' presente in `uscite`
 * con dati diversi NON si sovrascrive: il piano arriva con un id nuovo e si
 * tengono entrambi (uguali: resta quello che c'e').
 */
function spostaPiani(w) {
    for (const tool of ['pianificatore', 'pianificatore-uscita']) {
        for (const raw of w.di(tool)) {
            const v = raw.value;
            const modificato = (oggetto(v) && quandoIso(v.modificato)) || Number(raw.updated) || Date.now();
            const value = eRecord(v) ? v : avvolgi(v, { modificato });
            let id = raw.id;
            const gia = w.prendi('uscite', id);
            if (gia) {
                if (JSON.stringify(comeRecord(gia.value, gia.updated).dati) === JSON.stringify(value.dati)) {
                    w.togli(tool, raw.id);
                    continue;
                }
                do { id = String(raw.id) + '-' + nuovoSid().slice(0, 6); } while (w.ha('uscite', id));
            }
            w.metti({ tool: 'uscite', id, value, updated: raw.updated || Date.now() });
            w.togli(tool, raw.id);
        }
    }
}

/**
 * Un sid per record: due record con lo stesso sid (un testo copiato con la
 * 17, un file vecchio) sarebbero UNO per la sincronizzazione e per
 * importa/unisci, e uno dei due andrebbe perso. Il primo in ordine di id
 * tiene il sid, gli altri ne prendono uno nuovo.
 */
function sidUnici(w, tools) {
    for (const tool of tools) {
        const visti = new Set();
        const recs = w.di(tool).filter((r) => eRecord(r.value))
            .sort((a, b) => (String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0));
        for (const raw of recs) {
            if (sidValido(raw.value.sid) && !visti.has(raw.value.sid)) { visti.add(raw.value.sid); continue; }
            const value = { ...raw.value, sid: nuovoSid() };
            delete value.sincronizzato;
            w.metti({ ...raw, value });
            visti.add(value.sid);
        }
    }
}

function passoVista(tools, fa) {
    return (store, fine, fallisci) => leggiTutte(store, tools, fallisci, (snap) => {
        const w = nuovaVista(snap);
        fa(w);
        sidUnici(w, tools.filter((t) => COLLEZIONI.indexOf(t) >= 0));
        w.applica(store);
        fine();
    });
}

const m1 = passoVista(['penna'], avvolgiPenna);
const m2 = passoVista(['penna', 'penna-tomb'], assorbiLapidi);
const m3 = passoVista(['dna'], avvolgiDna);
const m4 = passoVista(['pianificatore', 'pianificatore-uscita', 'uscite'], spostaPiani);

/** 5: `tt.accordatore.custom` -> `accordature`. La preferenza resta. */
function m5(store, fine, fallisci) {
    let lista = [];
    try { lista = JSON.parse(lsLeggi('tt.accordatore.custom') || '[]'); } catch (e) { lista = []; }
    if (!Array.isArray(lista)) lista = [];
    tutti(store, 'accordature', fallisci, (gia) => {
        const ids = new Set(gia.map((r) => String(r.id)));
        const adesso = Date.now();
        lista.forEach((x, i) => {
            if (!x || x.id === undefined || x.id === null || !Array.isArray(x.strings)) return;
            const id = String(x.id);
            if (!id || ids.has(id)) return;
            const dati = { name: String(x.name || ''), strings: x.strings };
            store.put({ tool: 'accordature', id, value: avvolgi(dati, { modificato: adesso + i }), updated: adesso });
            ids.add(id);
        });
        fine();
    });
}

/** 6: preferenze portabili -> `impostazioni`, un record per chiave. */
function m6(store, fine, fallisci) {
    tutti(store, IMPOSTAZIONI, fallisci, (gia) => {
        const ids = new Set(gia.map((r) => String(r.id)));
        const adesso = Date.now();
        for (const k of lsChiavi()) {
            if (!portabile(k) || ids.has(k)) continue;
            const v = daLocale(k, lsLeggi(k));
            if (v === undefined) continue;
            store.put({ tool: IMPOSTAZIONI, id: k, value: avvolgi(v, { modificato: adesso }), updated: adesso });
            ids.add(k);
        }
        fine();
    });
}

const PASSI = [m1, m2, m3, m4, m5, m6];

async function migra() {
    let v = 0;
    try { v = versioneDi(await sGet(IMPOSTAZIONI, SCHEMA_ID)); } catch (e) { v = 0; }
    if (v >= VERSIONE_SCHEMA) return v;
    for (let i = 0; i < PASSI.length; i++) {
        if (v >= i + 1) continue;
        await passo(i + 1, PASSI[i]);
    }
    return VERSIONE_SCHEMA;
}

const DA_RIPARARE = ['penna-tomb', 'pianificatore', 'pianificatore-uscita',
    ...COLLEZIONI.filter((c) => c !== IMPOSTAZIONI)];

/**
 * Migrazione incrementale, idempotente, anche a schema 6: avvolge i record
 * nudi, assorbe le `penna-tomb` rimaste, sposta i piani, rende unici i sid.
 * Una transazione sola. -> quante scritture/cancellazioni ha fatto.
 * La chiama `pronto()` a ogni avvio e la sincronizzazione prima di ogni giro.
 */
export function ripara() {
    return transazione('readwrite', (store) => new Promise((ok, ko) => {
        const fallisci = (e) => {
            try { store.transaction.abort(); } catch (x) { /* gia' chiusa */ }
            ko(e || new Error('riparazione fallita'));
        };
        leggiTutte(store, DA_RIPARARE, fallisci, (snap) => {
            const w = nuovaVista(snap);
            avvolgiPenna(w);
            assorbiLapidi(w);
            avvolgiDna(w);
            spostaPiani(w);
            sidUnici(w, COLLEZIONI.filter((c) => c !== IMPOSTAZIONI));
            ok(w.applica(store));
        });
    }));
}

/** Le lapidi gia' sincronizzate e piu' vecchie di 90 giorni spariscono davvero. */
async function pota() {
    const adesso = Date.now();
    let ultima = 0;
    try { ultima = Number(window.localStorage.getItem(CHIAVE_POTATURA)) || 0; } catch (e) { ultima = 0; }
    if (adesso - ultima < GIORNO) return 0;
    let tolte = 0;
    for (const coll of COLLEZIONI) {
        tolte += await transazione('readwrite', (store) => new Promise((ok, ko) => {
            const q = store.index('tool').getAll(coll);
            q.onerror = () => ko(q.error);
            q.onsuccess = () => {
                let n = 0;
                for (const raw of q.result || []) {
                    const v = raw.value;
                    if (!eRecord(v) || !v.cancellato) continue;
                    if (!Number.isFinite(v.sincronizzato) || v.sincronizzato < v.modificato) continue;
                    if (adesso - v.modificato <= VITA_LAPIDE) continue;
                    store.delete([coll, raw.id]);
                    n++;
                }
                ok(n);
            };
        }));
    }
    try { window.localStorage.setItem(CHIAVE_POTATURA, String(adesso)); } catch (e) { /* si ripotera' */ }
    return tolte;
}

/* ---------------- avvisi per l'interfaccia ---------------- */

const avvisi = new Set();
let fallita = null;          // l'errore della migrazione, per tutta la sessione

/**
 * `cb({ codice, ... })` quando l'archivio ha qualcosa da far sapere a chi usa
 * l'app (lo aggancia nav.js a un toast):
 *   migrazione   i dati non si sono potuti aggiornare: sola lettura fino al
 *                prossimo avvio, quando la migrazione si riprova
 *   preferenza   una preferenza non e' entrata nell'archivio ({ chiave,
 *                motivo: 'grande' | 'limite' | 'errore' }): resta solo qui
 */
export function onAvviso(cb) {
    if (typeof cb !== 'function') return () => {};
    avvisi.add(cb);
    if (fallita) { try { cb({ codice: 'migrazione' }); } catch (e) { /* niente */ } }
    return () => { avvisi.delete(cb); };
}

function avvisa(a) {
    avvisi.forEach((cb) => { try { cb(a); } catch (e) { /* un ascoltatore rotto non ferma gli altri */ } });
}

/** Vero se la migrazione e' fallita: si legge quel che c'e', non si scrive. */
export function inSolaLettura() {
    return !!fallita;
}

let prontoP = null;

/**
 * Migrazioni (se servono), riparazione incrementale e potatura. Idempotente.
 * Se fallisce, la sessione resta in SOLA LETTURA (leggi/elenca mostrano i
 * dati come sono, scrivi/elimina rifiutano con codice 'migrazione') e si
 * riprova al prossimo avvio: mai uno schermo vuoto.
 */
export function pronto() {
    if (!prontoP) {
        prontoP = migra().then(async (v) => {
            await ripara();
            pota().catch(() => { /* si riprova domani */ });
            return v;
        });
        prontoP.catch((e) => {
            if (fallita) return;
            fallita = e || new Error('migrazione');
            console.warn('[archivio] migrazione non riuscita, sola lettura:', fallita && fallita.message);
            avvisa({ codice: 'migrazione' });
        });
    }
    return prontoP;
}

async function prontoPerLeggere() {
    try { await pronto(); } catch (e) { /* sola lettura: si legge quel che c'e' */ }
}

async function prontoPerScrivere() {
    try {
        await pronto();
    } catch (e) {
        const err = new Error('archivio in sola lettura: migrazione non riuscita');
        err.codice = 'migrazione';
        throw err;
    }
}

/* in sola lettura i piani possono essere ancora sotto il nome di prima */
const NOMI_VECCHI = { uscite: ['pianificatore', 'pianificatore-uscita'] };

async function listaGrezza(coll) {
    const recs = await sList(coll);
    if (!fallita || !NOMI_VECCHI[coll]) return recs;
    const ids = new Set(recs.map((r) => String(r.id)));
    for (const vecchio of NOMI_VECCHI[coll]) {
        for (const r of await sList(vecchio)) if (!ids.has(String(r.id))) { recs.push(r); ids.add(String(r.id)); }
    }
    return recs;
}

/* ---------------- lettura e scrittura ---------------- */

export async function leggiRecord(coll, id) {
    controlla(coll);
    await prontoPerLeggere();
    let v = await sGet(coll, id);
    if (v === undefined && fallita && NOMI_VECCHI[coll]) {
        for (const vecchio of NOMI_VECCHI[coll]) {
            v = await sGet(vecchio, id);
            if (v !== undefined) break;
        }
    }
    return v === undefined ? undefined : aVista(id, comeRecord(v, 0));
}

export async function leggi(coll, id) {
    const r = await leggiRecord(coll, id);
    return r && !r.cancellato ? r.dati : undefined;
}

async function contaVivi(coll) {
    const recs = await sList(coll);
    return recs.filter((r) => !(eRecord(r.value) && r.value.cancellato)
        && !(coll === IMPOSTAZIONI && r.id === SCHEMA_ID)).length;
}

function controllaLimiti(coll, dati, nuovo, vivi) {
    const lim = limiteDi(coll);
    if (!lim) return;
    if (pesoByte(dati) > lim.byte) throw new ErroreLimite(coll, 'byte', lim.byte);
    if (nuovo && vivi >= lim.voci) throw new ErroreLimite(coll, 'voci', lim.voci);
}

/**
 * Scrive `dati`. `id` null = id nuovo (il sid stesso). Il `sid` resta quello
 * del record se c'era; `opz.sid`/`opz.modificato`/`opz.sincronizzato` li usa
 * la sincronizzazione per scrivere un documento arrivato dal server.
 * -> l'id scritto. Oltre i limiti: ErroreLimite, niente scritto.
 */
export async function scrivi(coll, id, dati, opz = {}) {
    controlla(coll);
    await prontoPerScrivere();
    const chiave = id === null || id === undefined || id === '' ? null : id;
    const prima = chiave === null ? undefined : await sGet(coll, chiave);
    const prec = prima === undefined ? null : comeRecord(prima, 0);
    const nuovo = !prec || !!prec.cancellato;
    controllaLimiti(coll, dati, nuovo, nuovo && limiteDi(coll) ? await contaVivi(coll) : 0);
    const sid = sidValido(opz.sid) ? opz.sid : (prec && sidValido(prec.sid) ? prec.sid : nuovoSid());
    const modificato = Number.isFinite(opz.modificato)
        ? opz.modificato
        : Math.max(Date.now(), prec ? prec.modificato + 1 : 0);
    const sincronizzato = Number.isFinite(opz.sincronizzato)
        ? opz.sincronizzato
        : (prec ? numero(prec.sincronizzato) : NaN);
    const idFinale = chiave === null ? sid : chiave;
    await sPut(coll, idFinale, avvolgi(dati, { sid, modificato, sincronizzato }));
    annuncia(coll, idFinale, 'scrivi');
    return idFinale;
}

/** -> [{ id, sid, modificato, cancellato, dati }] in ordine di id; le lapidi solo a richiesta. */
export async function elenca(coll, { conCancellati = false } = {}) {
    controlla(coll);
    await prontoPerLeggere();
    const recs = await listaGrezza(coll);
    const out = [];
    for (const r of recs) {
        if (coll === IMPOSTAZIONI && r.id === SCHEMA_ID) continue;
        const rec = comeRecord(r.value, r.updated);
        if (rec.cancellato && !conCancellati) continue;
        out.push(aVista(r.id, rec));
    }
    return out;
}

/** La lapide: stesso id, stesso sid, cancellato:1, dati:null. -> true se c'era un record vivo. */
export async function elimina(coll, id, opz = {}) {
    controlla(coll);
    await prontoPerScrivere();
    const prima = await sGet(coll, id);
    if (prima === undefined) return false;
    const prec = comeRecord(prima, 0);
    if (opz.lapide === false) {
        /* potatura locale automatica: niente lapide, niente propagazione */
        await sDel(coll, id);
        annuncia(coll, id, 'elimina');
        return !prec.cancellato;
    }
    if (prec.cancellato && !Number.isFinite(opz.modificato)) return false;
    const modificato = Number.isFinite(opz.modificato)
        ? opz.modificato
        : Math.max(Date.now(), prec.modificato + 1);
    await sPut(coll, id, avvolgi(null, {
        sid: prec.sid, modificato, cancellato: 1, sincronizzato: numero(opz.sincronizzato)
    }));
    annuncia(coll, id, 'elimina');
    return !prec.cancellato;
}

/** Il server ha la versione `modificato` di questo record (lo chiama la sincronizzazione). */
export async function segnaSincronizzato(coll, id, modificato) {
    controlla(coll);
    await prontoPerScrivere();
    return transazione('readwrite', (store) => new Promise((ok, ko) => {
        const r = store.get([coll, id]);
        r.onerror = () => ko(r.error);
        r.onsuccess = () => {
            const raw = r.result;
            if (!raw || !eRecord(raw.value) || raw.value.modificato !== modificato) { ok(false); return; }
            store.put({ ...raw, value: { ...raw.value, sincronizzato: modificato } });
            ok(true);
        };
    }));
}

/**
 * Cancella DAVVERO (niente lapidi) una collezione, o tutte quelle
 * dell'archivio. La versione dello schema resta: le migrazioni non ripartono.
 */
export async function svuota(coll) {
    const colls = coll === undefined || coll === null ? COLLEZIONI.slice() : [coll];
    colls.forEach(controlla);
    await prontoPerScrivere();
    await transazione('readwrite', (store) => new Promise((ok, ko) => {
        let resta = colls.length;
        if (!resta) { ok(); return; }
        for (const c of colls) {
            const q = store.index('tool').getAllKeys(c);
            q.onerror = () => ko(q.error);
            q.onsuccess = () => {
                for (const k of q.result || []) {
                    if (c === IMPOSTAZIONI && k[1] === SCHEMA_ID) continue;
                    store.delete(k);
                }
                if (--resta === 0) ok();
            };
        }
    }));
    colls.forEach((c) => annuncia(c, null, 'svuota'));
}

/* ---------------- tra schede ---------------- */

let canale = null;
const ascolti = new Set();

function apriCanale() {
    if (canale) return canale;
    if (typeof BroadcastChannel !== 'function') return null;
    try {
        canale = new BroadcastChannel(CANALE);
    } catch (e) {
        return null;
    }
    canale.onmessage = (e) => {
        const m = e && e.data;
        if (!m || typeof m.coll !== 'string') return;
        ascolti.forEach((a) => {
            if (a.coll !== '*' && a.coll !== m.coll) return;
            try { a.cb(m); } catch (x) { /* un ascoltatore rotto non ferma gli altri */ }
        });
    };
    return canale;
}

function annuncia(coll, id, tipo) {
    try {
        const c = apriCanale();
        if (c) c.postMessage({ coll, id: id === undefined ? null : id, tipo });
    } catch (e) { /* nessun'altra scheda da avvisare */ }
}

/**
 * `cb({ coll, id, tipo })` a ogni cambio fatto da un'ALTRA scheda dello
 * stesso browser (tipo: scrivi | elimina | svuota | importa). Le scritture di
 * questa scheda non tornano indietro: chi scrive sa gia' che cosa ha fatto.
 * `coll` '*' = tutte. -> funzione per smettere di ascoltare.
 */
export function onChange(coll, cb) {
    if (typeof cb !== 'function') return () => {};
    apriCanale();
    const a = { coll: coll || '*', cb };
    ascolti.add(a);
    return () => { ascolti.delete(a); };
}

/* ---------------- esporta / importa ---------------- */

/**
 * Tutto l'archivio in un oggetto (lo serializza chi scarica il file).
 * Funziona anche se le migrazioni non sono potute partire: i record vecchi
 * escono nell'involucro, con un sid nuovo solo nel file.
 */
export async function esportaTutto() {
    let schema = VERSIONE_SCHEMA;
    try { await pronto(); } catch (e) { schema = 0; }
    const collezioni = {};
    const preferenze = {};
    for (const coll of COLLEZIONI) {
        let recs = [];
        try { recs = await listaGrezza(coll); } catch (e) { recs = []; }
        collezioni[coll] = recs
            .filter((r) => !(coll === IMPOSTAZIONI && r.id === SCHEMA_ID))
            .map((r) => {
                const rec = comeRecord(r.value, r.updated);
                const x = aVista(r.id, rec);
                delete x.sincronizzato;             // stato di questo dispositivo
                if (!sidValido(x.sid)) x.sid = nuovoSid();
                if (coll === IMPOSTAZIONI && !x.cancellato) preferenze[r.id] = x.dati;
                return x;
            });
    }
    return { app: APP, schema, esportato: new Date().toISOString(), collezioni, preferenze };
}

function pulisciInArrivo(coll, r) {
    if (!r || typeof r !== 'object') return null;
    if (!sidValido(r.sid)) return null;
    const id = typeof r.id === 'number' && Number.isFinite(r.id) ? r.id : (typeof r.id === 'string' && r.id ? r.id : null);
    if (id === null) return null;
    if (coll === IMPOSTAZIONI && id === SCHEMA_ID) return null;
    const modificato = numero(r.modificato);
    if (!Number.isFinite(modificato)) return null;
    const cancellato = r.cancellato ? 1 : 0;
    return { id, sid: r.sid, modificato, cancellato, dati: cancellato ? null : (r.dati === undefined ? null : r.dati) };
}

/**
 * Importa un file di `esportaTutto()` (oggetto o testo JSON).
 *   unisci      per `sid`: il record piu' recente vince, lapidi comprese;
 *               un sid che qui non c'e' entra col suo id (o col sid, se
 *               l'id e' gia' preso)
 *   sostituisci l'archivio diventa il file: i record del file si scrivono
 *               (sull'id locale del loro sid, se c'e'), quel che qui c'e' e
 *               nel file no diventa LAPIDE, non si cancella: senza lapidi la
 *               sincronizzazione riporterebbe indietro quei record dagli
 *               altri dispositivi
 * Tutto in una transazione. Oltre i limiti: ErroreLimite e niente toccato.
 * -> { nuovi, aggiornati, ignorati }
 */
export async function importaTutto(json, { strategia = 'unisci' } = {}) {
    let dati = json;
    if (typeof json === 'string') {
        try { dati = JSON.parse(json); } catch (e) { throw new Error('formato'); }
    }
    if (!dati || dati.app !== APP || !oggetto(dati.collezioni)) throw new Error('formato');
    const sostituisci = strategia === 'sostituisci';
    await prontoPerScrivere();

    const piano = [];         // { coll, puts: [[id, value]], dels: [id] }
    const esito = { nuovi: 0, aggiornati: 0, ignorati: 0 };

    for (const coll of COLLEZIONI) {
        let arrivo = (Array.isArray(dati.collezioni[coll]) ? dati.collezioni[coll] : [])
            .map((r) => pulisciInArrivo(coll, r)).filter(Boolean);
        /* un file senza `impostazioni` ma con `preferenze` piatte: queste non
           hanno sid, si riconoscono dalla chiave (= id) */
        let perChiave = false;
        if (coll === IMPOSTAZIONI && !arrivo.length && oggetto(dati.preferenze)) {
            const adesso = Date.now();
            perChiave = true;
            arrivo = Object.keys(dati.preferenze).filter(portabile)
                .map((k) => ({ id: k, sid: '', modificato: adesso, cancellato: 0, dati: dati.preferenze[k] }));
        }
        /* lo stesso sid due volte nel file (un file di prima): il secondo e'
           un record a se', con un sid nuovo, mai uno che ne cancella un altro */
        const vistiNelFile = new Set();
        arrivo = arrivo.map((r) => {
            if (perChiave) return r;
            const doppio = vistiNelFile.has(r.sid);
            const x = doppio ? { ...r, sid: nuovoSid() } : r;
            vistiNelFile.add(x.sid);
            return x;
        });
        const lim = limiteDi(coll);
        for (const r of arrivo) {
            if (!r.cancellato && lim && pesoByte(r.dati) > lim.byte) throw new ErroreLimite(coll, 'byte', lim.byte);
        }

        const locali = (await sList(coll)).filter((r) => !(coll === IMPOSTAZIONI && r.id === SCHEMA_ID));
        const stato = new Map();              // id -> record finale (per contare i vivi)
        locali.forEach((r) => stato.set(String(r.id), comeRecord(r.value, r.updated)));
        const puts = [];
        const dels = [];

        if (sostituisci) {
            const tenuti = new Set();
            const prima = new Map(stato);
            const idDelSid = new Map();
            prima.forEach((rec, id) => { if (sidValido(rec.sid)) idDelSid.set(rec.sid, id); });
            const idLocale = new Map(locali.map((r) => [String(r.id), r.id]));
            stato.clear();
            for (const r of arrivo) {
                /* stesso sid = stesso record: resta sul suo id locale; un id
                   locale occupato da un ALTRO sid non si sovrascrive */
                let id = r.id;
                if (!perChiave && idDelSid.has(r.sid)) id = idLocale.get(idDelSid.get(r.sid));
                else if (!perChiave && prima.has(String(id)) && prima.get(String(id)).sid !== r.sid) id = r.sid;
                if (tenuti.has(String(id))) continue;
                tenuti.add(String(id));
                /* una preferenza piatta tiene il sid che la chiave aveva qui */
                const gia = perChiave ? prima.get(String(r.id)) : null;
                const value = avvolgi(r.dati, gia ? { ...r, sid: gia.sid } : r);
                puts.push([id, value]);
                stato.set(String(id), value);
                if (!r.cancellato) esito.nuovi++;
            }
            /* quel che qui c'e' e nel file no: i record vivi diventano lapidi
               (cosi' la sincronizzazione porta la sostituzione anche agli
               altri dispositivi, invece di farli risorgere al giro dopo), le
               lapidi restano. Niente si cancella davvero. */
            const adesso = Date.now();
            for (const r of locali) {
                if (tenuti.has(String(r.id))) continue;
                const rec = comeRecord(r.value, r.updated);
                if (rec.cancellato) { stato.set(String(r.id), rec); continue; }
                const lapide = avvolgi(null, { sid: rec.sid, modificato: Math.max(adesso, rec.modificato + 1), cancellato: 1 });
                puts.push([r.id, lapide]);
                stato.set(String(r.id), lapide);
            }
        } else {
            const perSid = new Map();
            locali.forEach((r) => {
                const rec = comeRecord(r.value, r.updated);
                if (sidValido(rec.sid)) perSid.set(rec.sid, { id: r.id, rec });
            });
            for (const r of arrivo) {
                if (perChiave) {
                    /* preferenza piatta: stessa chiave, valore diverso -> si aggiorna */
                    const qui = stato.get(String(r.id));
                    if (qui && !qui.cancellato && JSON.stringify(qui.dati) === JSON.stringify(r.dati)) { esito.ignorati++; continue; }
                    const value = avvolgi(r.dati, {
                        sid: qui ? qui.sid : '',
                        modificato: Math.max(r.modificato, qui ? qui.modificato + 1 : 0)
                    });
                    puts.push([r.id, value]);
                    stato.set(String(r.id), value);
                    if (qui) esito.aggiornati++;
                    else esito.nuovi++;
                    continue;
                }
                const qui = perSid.get(r.sid);
                if (qui) {
                    if (r.modificato <= qui.rec.modificato) { esito.ignorati++; continue; }
                    const value = avvolgi(r.dati, r);
                    puts.push([qui.id, value]);
                    stato.set(String(qui.id), value);
                    perSid.set(r.sid, { id: qui.id, rec: value });
                    esito.aggiornati++;
                    continue;
                }
                const id = stato.has(String(r.id)) ? r.sid : r.id;
                const value = avvolgi(r.dati, r);
                puts.push([id, value]);
                stato.set(String(id), value);
                perSid.set(r.sid, { id, rec: value });
                if (r.cancellato) esito.ignorati++;
                else esito.nuovi++;
            }
        }
        if (lim) {
            const vivi = [...stato.values()].filter((v) => !v.cancellato).length;
            const viviPrima = locali.filter((r) => !comeRecord(r.value, r.updated).cancellato).length;
            if (vivi > lim.voci && vivi > viviPrima) throw new ErroreLimite(coll, 'voci', lim.voci);
        }
        if (puts.length || dels.length) piano.push({ coll, puts, dels });
    }

    if (piano.length) {
        await transazione('readwrite', (store) => {
            const adesso = Date.now();
            /* prima tutte le scritture, poi le cancellazioni */
            piano.forEach((p) => p.puts.forEach(([id, value]) => store.put({ tool: p.coll, id, value, updated: adesso })));
            piano.forEach((p) => p.dels.forEach((id) => store.delete([p.coll, id])));
        });
    }
    if (piano.some((p) => p.coll === IMPOSTAZIONI)) await applicaPreferenze();
    piano.forEach((p) => annuncia(p.coll, null, 'importa'));
    return esito;
}

/* ---------------- preferenze ---------------- */

const LINGUA = 'tinyTempleLang';
/* locali e mai sincronizzate anche se il prefisso le farebbe portabili */
const LOCALI = new Set(['tt.penna.pacchetti', 'tt.penna.rimario', 'tt.penna.ultimo']);
const PORTABILI = /^(tinyTempleLang|tt\.shared\.a4|tt\.dna\.target|tt\.(dash|penna|metronomo|calcolatore-tempo)\.[^.]+)$/;

/** Vero per le preferenze che vanno nell'archivio (spec 18 §3 punto 6). */
export function portabile(chiave) {
    return typeof chiave === 'string' && PORTABILI.test(chiave) && !LOCALI.has(chiave);
}

/* in localStorage la lingua e' una stringa nuda, le `tt.*` sono JSON */
function daLocale(chiave, grezzo) {
    if (grezzo === null || grezzo === undefined) return undefined;
    if (chiave === LINGUA) return grezzo;
    try { return JSON.parse(grezzo); } catch (e) { return undefined; }
}

function aLocale(chiave, valore) {
    try {
        if (valore === undefined || valore === null) window.localStorage.removeItem(chiave);
        else window.localStorage.setItem(chiave, chiave === LINGUA ? String(valore) : JSON.stringify(valore));
    } catch (e) { /* storage pieno o bloccato */ }
}

let coda = Promise.resolve();

async function salvaInArchivio(chiave, valore) {
    const prima = await leggiRecord(IMPOSTAZIONI, chiave);
    if (valore === undefined) {
        if (prima && !prima.cancellato) await elimina(IMPOSTAZIONI, chiave);
        return;
    }
    if (prima && !prima.cancellato && JSON.stringify(prima.dati) === JSON.stringify(valore)) return;
    await scrivi(IMPOSTAZIONI, chiave, valore);
}

/* in fila: due `set` veloci della stessa chiave arrivano nell'ordine giusto */
function accoda(chiave, valore) {
    const giro = coda.then(() => salvaInArchivio(chiave, valore));
    coda = giro.catch((e) => {
        console.warn('[archivio] preferenza non salvata:', chiave, e && e.message);
        /* resta in localStorage (su questo dispositivo), ma lo si dice:
           mai un errore silenzioso. In sola lettura l'avviso c'e' gia'. */
        if (!(e && e.codice === 'migrazione')) {
            avvisa({ codice: 'preferenza', chiave, motivo: (e && (e.codice === 'grande' || e.codice === 'limite')) ? e.codice : 'errore' });
        }
    });
    return coda;
}

/** Lettura sincrona dalla copia veloce (localStorage). */
export function pref(chiave, fallback) {
    const v = daLocale(chiave, lsLeggi(chiave));
    return v === undefined ? fallback : v;
}

/** Scrive localStorage subito e, se portabile, l'archivio. undefined = togli. */
export function impostaPref(chiave, valore) {
    aLocale(chiave, valore);
    return portabile(chiave) ? accoda(chiave, valore) : Promise.resolve();
}

/** Stessa forma di `prefs` di storage.js: chiave 'tt.<tool>.<key>'. */
export const prefs = {
    get(tool, key, fallback) {
        return sPrefs.get(tool, key, fallback);
    },
    set(tool, key, value) {
        sPrefs.set(tool, key, value);
        const chiave = 'tt.' + tool + '.' + key;
        if (portabile(chiave)) accoda(chiave, value);
    }
};

/** Dall'archivio alla copia veloce (dopo un import, e dal giro 3 dopo una sincronizzazione). */
export async function applicaPreferenze() {
    const recs = await elenca(IMPOSTAZIONI, { conCancellati: true });
    for (const r of recs) {
        if (!portabile(r.id)) continue;
        aLocale(r.id, r.cancellato ? undefined : r.dati);
    }
}
