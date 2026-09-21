/**
 * Tiny Temple Toolbox - Pianificatore di uscita: la timeline (spec 15 §4).
 *
 * MODULO PURO: nessun DOM, nessun i18n, nessuna rete, nessun import da
 * `shared/`. Si importa in Node cosi' com'e' ed e' cio' che rende
 * verificabili i criteri §6.1-§6.4. Da `tappe.js` arrivano id, anticipi e
 * CHIAVI i18n: qui dentro non si traduce niente, si sceglie solo QUALE
 * tappa e QUANDO. A tradurre ci pensa `pianificatore.js`.
 *
 * DATE COME STRINGHE 'YYYY-MM-DD'. L'aritmetica passa da `Date.UTC(y, m, d, 12)`:
 * a mezzogiorno UTC nessun fuso e nessun cambio d'ora puo' far scivolare il
 * giorno (criterio §6.4). Le `Date` locali a mezzanotte, che sbagliano di un
 * giorno il 25 ottobre, sono scartate apposta (spec §7).
 *
 * NESSUNO SPOSTAMENTO PER FINE SETTIMANA O FESTE. Spec e ricerca non lo
 * chiedono: T0 e' "convenzionalmente un venerdi'" ma resta una scelta
 * dell'utente, e gli anticipi sono quasi tutti multipli di 7, quindi una
 * data di venerdi' produce da sola tappe di venerdi'. Le date sono una
 * sottrazione secca: se l'utente sceglie un martedi', le tappe cadono di
 * martedi'. Lo strumento ricorda, non corregge (spec §1).
 *
 * VARIANTI (spec §4): EP +14 giorni di anticipo e album +28, ma solo fino a
 * `consegna` compresa; l'album aggiunge `singolo-1/2/3` a T-84/-56/-35.
 * Anticipi, varianti e tappe d'album stanno tutti in `tappe.js`.
 *
 * API
 *   isoDaData(ms) / dataDaIso(iso) / valida(iso)
 *   piuGiorni(iso, n) / giorniFra(a, b) / oggiIso(now?)
 *   generaTappe({ data, tipo, profilo }) -> [tappa]
 *   nuovaPersonale(titolo, data, { id, testo })
 *   ordina(tappe) / ricalcola(tappe, piano)
 *   statoTappa(tappa, oggi, { finestra }) / decora(tappe, oggi, opts)
 *   conteggio(tappe, oggi, opts) -> { fatte, totale, inScadenza, inRitardo, badge, pct }
 *   prossime(piani, { oggi, limite, finestra })
 *
 * Forma di una tappa generata (e' anche cio' che finisce in IndexedDB,
 * spec §4 "Salvataggio"):
 *   { id, data, fatta, origine: 'serie'|'custom',
 *     titolo: null|string,   // null su una di serie = usa `chiaveTitolo`
 *     testo: null|string,
 *     chiaveTitolo, chiaveTesto, chiaveFoglio, vars,   // solo 'serie'
 *     anticipo,              // solo 'serie': i giorni usati per calcolarla
 *     spostata: boolean,     // 'serie' con la data cambiata a mano
 *     peso }                 // ordine di serie, per i pari-data
 */

import { TAPPE, TAPPE_ALBUM, VARIANTI, ULTIMA_SPOSTATA, TIPI, PROFILI } from './tappe.js';

export { TIPI, PROFILI, VARIANTI, ULTIMA_SPOSTATA, TAPPE_ALBUM };

/** Giorni entro cui una tappa non spunta e' "in scadenza" (spec §2). */
export const FINESTRA = 7;

const GIORNO = 86400000;
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

const due = (n) => (n < 10 ? '0' + n : String(n));

/** true se la stringa e' una data 'YYYY-MM-DD' che esiste davvero. */
export function valida(iso) {
    const m = ISO.exec(String(iso || ''));
    if (!m) return false;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
    const dt = new Date(Date.UTC(y, mo - 1, d, 12));
    /* 2026-02-30 diventerebbe il 2 marzo: si rifiuta */
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** 'YYYY-MM-DD' -> millisecondi a mezzogiorno UTC (NaN se la data non va). */
export function dataDaIso(iso) {
    if (!valida(iso)) return NaN;
    const m = ISO.exec(iso);
    return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
}

/** Millisecondi (o Date) -> 'YYYY-MM-DD' letto in UTC. */
export function isoDaData(ms) {
    const t = ms instanceof Date ? ms.getTime() : Number(ms);
    if (!Number.isFinite(t)) return '';
    const d = new Date(t);
    return d.getUTCFullYear() + '-' + due(d.getUTCMonth() + 1) + '-' + due(d.getUTCDate());
}

/** Somma (o sottrae, con n negativo) giorni interi a una data ISO. */
export function piuGiorni(iso, n) {
    const t = dataDaIso(iso);
    if (!Number.isFinite(t)) return '';
    return isoDaData(t + Math.trunc(n) * GIORNO);
}

/** Giorni interi da `a` a `b` (positivo se `b` viene dopo). */
export function giorniFra(a, b) {
    const ta = dataDaIso(a);
    const tb = dataDaIso(b);
    if (!Number.isFinite(ta) || !Number.isFinite(tb)) return NaN;
    return Math.round((tb - ta) / GIORNO);
}

/**
 * Oggi secondo l'OROLOGIO LOCALE dell'utente, in 'YYYY-MM-DD'. Qui il fuso
 * serve davvero: "in scadenza" si misura sul calendario che l'utente vede.
 */
export function oggiIso(now = new Date()) {
    const d = now instanceof Date ? now : new Date(now);
    return d.getFullYear() + '-' + due(d.getMonth() + 1) + '-' + due(d.getDate());
}

const normTipo = (v) => (TIPI.indexOf(v) >= 0 ? v : 'singolo');
const normProfilo = (v) => (PROFILI.indexOf(v) >= 0 ? v : 'completa');

/** Indice oltre il quale le varianti EP/album non spostano piu' (spec §4). */
const LIMITE_VARIANTE = TAPPE.findIndex((t) => t.id === ULTIMA_SPOSTATA);

/**
 * Anticipo effettivo: null se la tappa non esiste in quel profilo,
 * altrimenti i giorni con la variante di tipo gia' applicata. `indice` < 0
 * (i singoli d'album) significa "la variante non ti riguarda".
 */
export function anticipoDi(voce, indice, tipo, profilo) {
    const base = voce && voce.anticipo ? voce.anticipo[normProfilo(profilo)] : null;
    if (base === null || base === undefined) return null;
    const extra = indice >= 0 && indice <= LIMITE_VARIANTE ? (VARIANTI[normTipo(tipo)] || 0) : 0;
    return base + extra;
}

function nuovaDiSerie(voce, anticipo, uscita, peso) {
    return {
        id: voce.id,
        data: piuGiorni(uscita, -anticipo),
        fatta: false,
        origine: 'serie',
        titolo: null,
        testo: null,
        chiaveTitolo: voce.titolo,
        chiaveTesto: voce.testo,
        chiaveFoglio: voce.foglio || null,
        vars: voce.vars || null,
        anticipo,
        spostata: false,
        peso
    };
}

/**
 * Genera le tappe di serie di un piano. `data` e' la data di uscita ISO.
 * Ritorna [] se la data non e' valida (il chiamante mostra l'errore).
 */
export function generaTappe({ data, tipo = 'singolo', profilo = 'completa' } = {}) {
    if (!valida(data)) return [];
    const t = normTipo(tipo);
    const p = normProfilo(profilo);
    const fuori = [];
    TAPPE.forEach((voce, i) => {
        const anticipo = anticipoDi(voce, i, t, p);
        if (anticipo === null) return;
        fuori.push(nuovaDiSerie(voce, anticipo, data, i));
    });
    if (t === 'album') {
        TAPPE_ALBUM.forEach((voce, i) => {
            const anticipo = anticipoDi(voce, -1, t, p);
            if (anticipo === null) return;
            fuori.push(nuovaDiSerie(voce, anticipo, data, TAPPE.length + i));
        });
    }
    return ordina(fuori);
}

/** Tappa aggiunta a mano (spec §3 "Aggiungi tappa"): i testi sono suoi. */
export function nuovaPersonale(titolo, data, { id, testo = '' } = {}) {
    return {
        id: id || 'custom-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
        data: valida(data) ? data : '',
        fatta: false,
        origine: 'custom',
        titolo: String(titolo || ''),
        testo: String(testo || ''),
        chiaveTitolo: null,
        chiaveTesto: null,
        chiaveFoglio: null,
        vars: null,
        anticipo: null,
        spostata: false,
        peso: 999
    };
}

/** Copia ordinata per data; a parita' di data vale l'ordine di serie. */
export function ordina(tappe) {
    return (tappe || []).slice().sort((a, b) => {
        if (a.data !== b.data) {
            if (!a.data) return 1;
            if (!b.data) return -1;
            return a.data < b.data ? -1 : 1;
        }
        const pa = Number.isFinite(a.peso) ? a.peso : 999;
        const pb = Number.isFinite(b.peso) ? b.peso : 999;
        return pa - pb;
    });
}

/**
 * Rigenera le tappe di serie dalla data (e da tipo/profilo) del piano.
 * Tiene le spunte, i nomi cambiati a mano e le date spostate a mano; non
 * tocca le personalizzate e non fa tornare quelle in `rimosse`. Le tappe
 * che un cambio di profilo fa comparire arrivano nuove, quelle che
 * spariscono dal profilo se ne vanno (spec §3, criterio §6.7).
 */
export function ricalcola(tappe, { data, tipo, profilo, rimosse = [] } = {}) {
    if (!valida(data)) return ordina(tappe);
    const prima = new Map((tappe || []).map((tp) => [tp.id, tp]));
    const serie = generaTappe({ data, tipo, profilo })
        .filter((tp) => rimosse.indexOf(tp.id) < 0)
        .map((tp) => {
            const vecchia = prima.get(tp.id);
            if (!vecchia) return tp;
            return {
                ...tp,
                fatta: !!vecchia.fatta,
                titolo: vecchia.titolo || null,
                testo: vecchia.testo || null,
                spostata: !!vecchia.spostata,
                data: vecchia.spostata ? vecchia.data : tp.data
            };
        });
    const personali = (tappe || []).filter((tp) => tp.origine !== 'serie');
    return ordina([...serie, ...personali]);
}

/**
 * Stato di una tappa rispetto a `oggi`:
 *   'fatta' | 'in ritardo' (passata e non spunta) |
 *   'in scadenza' (entro `finestra` giorni) | 'futura'
 */
export function statoTappa(tappa, oggi, { finestra = FINESTRA } = {}) {
    if (!tappa) return 'futura';
    if (tappa.fatta) return 'fatta';
    const g = giorniFra(oggi, tappa.data);
    if (!Number.isFinite(g)) return 'futura';
    if (g < 0) return 'in ritardo';
    if (g <= finestra) return 'in scadenza';
    return 'futura';
}

/** Aggiunge `giorni` (da oggi) e `stato` a ogni tappa, in ordine di data. */
export function decora(tappe, oggi, { finestra = FINESTRA } = {}) {
    const giorno = valida(oggi) ? oggi : oggiIso();
    return ordina(tappe).map((tp) => ({
        ...tp,
        giorni: giorniFra(giorno, tp.data),
        stato: statoTappa(tp, giorno, { finestra })
    }));
}

/** Numeri dell'intestazione: "fatte {n} di {tot}", badge, barra. */
export function conteggio(tappe, oggi, { finestra = FINESTRA } = {}) {
    const giorno = valida(oggi) ? oggi : oggiIso();
    const lista = tappe || [];
    let fatte = 0;
    let inScadenza = 0;
    let inRitardo = 0;
    lista.forEach((tp) => {
        const stato = statoTappa(tp, giorno, { finestra });
        if (stato === 'fatta') fatte++;
        else if (stato === 'in scadenza') inScadenza++;
        else if (stato === 'in ritardo') inRitardo++;
    });
    const totale = lista.length;
    return {
        fatte,
        totale,
        inScadenza,
        inRitardo,
        /* il badge della spec §2: non spunte entro 7 giorni O gia' passate */
        badge: inScadenza + inRitardo,
        pct: totale ? Math.round((fatte / totale) * 100) : 0
    };
}

/**
 * Le tappe non spunte piu' vicine, prese da TUTTI i piani (spec §3
 * "Prossime tappe"): la usa la vista Prossime e, in futuro, la dashboard
 * senza aprire la pagina. `piani` = [{ id, titolo, tappe }]. Ordine per
 * data crescente, quindi le passate (le piu' urgenti) vengono prima.
 */
export function prossime(piani, { oggi, limite = 3, finestra = FINESTRA } = {}) {
    const giorno = valida(oggi) ? oggi : oggiIso();
    const fuori = [];
    (piani || []).forEach((piano) => {
        if (!piano) return;
        (piano.tappe || []).forEach((tp) => {
            if (!tp || tp.fatta || !valida(tp.data)) return;
            fuori.push({
                pianoId: piano.id,
                pianoTitolo: piano.titolo || '',
                tappa: tp,
                data: tp.data,
                giorni: giorniFra(giorno, tp.data),
                stato: statoTappa(tp, giorno, { finestra })
            });
        });
    });
    fuori.sort((a, b) => {
        if (a.data !== b.data) return a.data < b.data ? -1 : 1;
        const pa = Number.isFinite(a.tappa.peso) ? a.tappa.peso : 999;
        const pb = Number.isFinite(b.tappa.peso) ? b.tappa.peso : 999;
        return pa - pb;
    });
    return limite > 0 ? fuori.slice(0, limite) : fuori;
}
