/**
 * Tiny Temple Toolbox - Penna: il modello dell'elenco (spec 16 §4).
 *
 * Qui non si tocca il DOM: sono funzioni pure, si provano in Node.
 *   riassunto(id, doc)        il record dell'elenco a partire dal documento
 *   filtra(record, q, ordine) ricerca (maiuscole e accenti ignorati) + ordine
 *   fondi(locali, importati)  unione per id, vince il `modificato` piu' recente
 *   idDaHash / hashDiId       l'hash #t=<id>, unica fonte della vista
 *   provaDaHash               l'hash #t=<id>&prova, la modalita' prova (spec 19)
 *   titoloMostrato(rec)       il titolo da far vedere: quello vero o il primo verso
 *   versoTrovato(testo, q)    il primo verso che contiene la ricerca
 *
 * I marcatori di sezione (`[Ritornello]`, spec 19 §3) non sono versi: non
 * contano, non fanno da primo verso ne' da titolo.
 *
 * Il record tiene anche `testo`: la ricerca deve trovare una parola in mezzo
 * al brano (spec 16 §6.1, "Ooo-ooo-ooo" e' al verso 10 del testo di prova),
 * non solo nel titolo o nel primo verso. Sono decine di brani da pochi KB:
 * sta in memoria senza peso.
 */

import { isSezione } from '../shared/testo/schema.js';

/** Minuscole, accenti via (NFD senza segni) e apostrofi tipografici dritti. */
export function normalizza(s) {
    return String(s == null ? '' : s)
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[‘’ʼ´`]/g, "'")
        .toLowerCase();
}

const eVerso = (r) => !!r.trim() && !isSezione(r);

/** Versi = righe non vuote e non marcatori di sezione (spec 16 §4, 19 §3). */
export function contaVersi(testo) {
    return String(testo == null ? '' : testo).split('\n').filter(eVerso).length;
}

/** I versi (righe non vuote, marcatori esclusi), senza spazi ai lati. */
function versiDi(testo) {
    return String(testo == null ? '' : testo).split('\n').filter(eVerso).map((r) => r.trim());
}

/** Il primo verso che non sia vuoto, troncato per la card. */
export function primoVerso(testo, max = 80) {
    return (versiDi(testo)[0] || '').slice(0, max);
}

/** Il secondo verso: la riga della card quando il primo fa da titolo. */
export function secondoVerso(testo, max = 80) {
    return (versiDi(testo)[1] || '').slice(0, max);
}

/**
 * Il titolo da mostrare (spec 19 §3): quello scritto, se c'e', se no il
 * primo verso. Solo mostrato, mai salvato. '' se il testo e' vuoto: la
 * scritta "Senza titolo" la mette chi chiama (e' tradotta).
 * Accetta un record dell'elenco o un documento.
 */
export function titoloMostrato(rec) {
    const r = rec || {};
    const titolo = typeof r.titolo === 'string' ? r.titolo.trim() : '';
    if (titolo) return titolo;
    if (typeof r.testo === 'string') return primoVerso(r.testo);
    return typeof r.prima === 'string' ? r.prima : '';
}

/**
 * Il primo verso che contiene `q` (maiuscole e accenti ignorati), per la
 * card di una ricerca (spec 19 §3). -> { verso, da, a } | null.
 * `da`/`a` sono le posizioni del termine nel verso; -1 quando la forma
 * normalizzata non ha la stessa lunghezza del verso (lettere che si
 * scompongono): allora si mostra il verso senza evidenziare.
 */
export function versoTrovato(testo, q) {
    const ago = normalizza(q).trim();
    if (!ago) return null;
    for (const verso of versiDi(testo)) {
        const piatto = normalizza(verso);
        const i = piatto.indexOf(ago);
        if (i < 0) continue;
        if (piatto.length !== verso.length) return { verso, da: -1, a: -1 };
        return { verso, da: i, a: i + ago.length };
    }
    return null;
}

/** Da { id, documento } al record dell'elenco. */
export function riassunto(id, doc) {
    const d = doc || {};
    const testo = typeof d.testo === 'string' ? d.testo : '';
    return {
        id: String(id),
        titolo: typeof d.titolo === 'string' ? d.titolo : '',
        prima: primoVerso(testo),
        seconda: secondoVerso(testo),
        versi: contaVersi(testo),
        lingua: typeof d.lingua === 'string' && d.lingua ? d.lingua : 'it',
        modificato: d.modificato || d.creato || '',
        testo
    };
}

function quando(r) {
    const v = Date.parse((r && r.modificato) || '');
    return Number.isNaN(v) ? 0 : v;
}

/* Ultima modifica: dal piu' recente; a pari data decide il titolo. */
function perData(a, b) {
    const d = quando(b) - quando(a);
    return d !== 0 ? d : normalizza(a.titolo).localeCompare(normalizza(b.titolo));
}

/* Titolo: alfabetico, i senza titolo in fondo; a pari titolo decide la data. */
function perTitolo(a, b) {
    const ta = normalizza(a.titolo).trim();
    const tb = normalizza(b.titolo).trim();
    if (!ta !== !tb) return ta ? -1 : 1;
    const d = ta.localeCompare(tb);
    return d !== 0 ? d : perData(a, b);
}

/**
 * I record che contengono `q` (titolo o testo), nell'ordine chiesto
 * (`mod` = ultima modifica, `titolo`). Non muta l'array in ingresso.
 */
export function filtra(record, q, ordine) {
    const lista = Array.isArray(record) ? record.slice() : [];
    const ago = normalizza(q).trim();
    const trovati = ago
        ? lista.filter((r) => normalizza((r.titolo || '') + '\n' + (r.testo || r.prima || '')).includes(ago))
        : lista;
    return trovati.sort(ordine === 'titolo' ? perTitolo : perData);
}

/**
 * Unione di due quaderni per `id` (spec 16 §3, importazione):
 * id nuovo entra, id gia' presente vince chi ha `modificato` piu' recente,
 * mai duplicati. -> { record, nuovi, aggiornati, daScrivere }
 * `daScrivere` e' il sottoinsieme da mettere davvero in IndexedDB.
 */
export function fondi(locali, importati) {
    const per = new Map();
    (Array.isArray(locali) ? locali : []).forEach((r) => {
        if (r && r.id != null) per.set(String(r.id), r);
    });
    let nuovi = 0;
    let aggiornati = 0;
    const daScrivere = [];
    (Array.isArray(importati) ? importati : []).forEach((r) => {
        if (!r || r.id == null) return;
        const id = String(r.id);
        const vecchio = per.get(id);
        if (!vecchio) {
            per.set(id, r);
            nuovi++;
            daScrivere.push(r);
            return;
        }
        if (quando(r) > quando(vecchio)) {
            per.set(id, r);
            aggiornati++;
            daScrivere.push(r);
        }
    });
    return { record: [...per.values()], nuovi, aggiornati, daScrivere };
}

/** `#t=<id>` (anche `#t=<id>&prova`) -> id, oppure null (elenco). */
export function idDaHash(hash) {
    const m = String(hash == null ? '' : hash).match(/^#?t=([^&]*)(?:&[\s\S]*)?$/);
    if (!m) return null;
    let v = m[1];
    try { v = decodeURIComponent(v); } catch (e) { /* hash malfatto: si usa com'e' */ }
    v = v.trim();
    return v || null;
}

/** `#t=<id>&prova` -> true: il testo si apre in modalita' prova (spec 19 §3). */
export function provaDaHash(hash) {
    if (!idDaHash(hash)) return false;
    return String(hash).split('&').slice(1).some((p) => p.trim() === 'prova');
}

/** id -> `#t=<id>` (gli id contengono ':' e '.': si codificano); `prova` aggiunge `&prova`. */
export function hashDiId(id, { prova = false } = {}) {
    return '#t=' + encodeURIComponent(String(id)) + (prova ? '&prova' : '');
}
