/**
 * Tiny Temple Toolbox - preset del Metronomo (spec 21 §4).
 *
 * Modulo PURO: niente DOM, niente archivio, niente i18n importata (la
 * traduzione arriva come funzione `t`). Si importa anche in Node.
 *
 * Collezione `metronomo-preset` dell'archivio, un record per preset:
 *   id   `p<n>` (n = Date.now() alla nascita, mai riusato)
 *   dati { nome, bpm, meter, subdiv, sound, volume }
 * L'ordine e' quello di nascita (l'id), come le accordature personalizzate.
 */

export const COLLEZIONE = 'metronomo-preset';
export const NOME_MAX = 24;

const BPM_MIN = 30;
const BPM_MAX = 300;
/* gli stessi valori di metronomo.js (METERS, SOUNDS, SUBS): qui ripetuti
   perche' metronomo.js importa il DOM e questo file deve restare puro */
const METRI = ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '12/8'];
const SUONI = ['legno', 'beep', 'rimshot'];
const SUDDIVISIONI = [1, 2, 3, 4];
const VOLUME_DEFAULT = 85;

const intero = (v, min, max, riserva) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : riserva;
};

/** Un nome valido: stringa, spazi tolti ai lati, al massimo NOME_MAX caratteri. */
export function nomeValido(nome) {
    return Array.from(String(nome === undefined || nome === null ? '' : nome).trim())
        .slice(0, NOME_MAX).join('');
}

/**
 * Dai record dell'archivio ([{ id, dati }]) o da voci gia' piatte
 * ([{ id, nome, ... }]) alla forma usata dalla pagina:
 * [{ id, nome, bpm, meter, subdiv, sound, volume }]. Quello che non torna
 * si scarta o si riporta al valore di riserva: mai un'eccezione.
 */
export function pulisci(raw) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    raw.forEach((r) => {
        if (!r || r.id === undefined || r.id === null || r.id === '') return;
        const d = r.dati && typeof r.dati === 'object' ? r.dati : r;
        const bpm = intero(d.bpm, BPM_MIN, BPM_MAX, NaN);
        if (!Number.isFinite(bpm)) return;
        const meter = METRI.indexOf(d.meter) !== -1 ? d.meter : '4/4';
        const subdiv = SUDDIVISIONI.indexOf(Number(d.subdiv)) !== -1 ? Number(d.subdiv) : 1;
        const sound = SUONI.indexOf(d.sound) !== -1 ? d.sound : 'legno';
        const volume = intero(d.volume, 0, 100, VOLUME_DEFAULT);
        const nome = nomeValido(d.nome) || nomeProposto({ bpm, meter });
        out.push({ id: String(r.id), nome, bpm, meter, subdiv, sound, volume });
    });
    return out;
}

/** I dati da scrivere nell'archivio per una voce (senza id). */
export function dati(p) {
    return { nome: p.nome, bpm: p.bpm, meter: p.meter, subdiv: p.subdiv, sound: p.sound, volume: p.volume };
}

/** Confronto d'ordine: per numero dopo la `p`, poi per id (come `customOrder` dell'accordatore). */
export const confronta = (a, b) => (Number(String(a.id).slice(1)) || 0) - (Number(String(b.id).slice(1)) || 0)
    || String(a.id).localeCompare(String(b.id));

/** Copia ordinata per nascita. */
export function ordina(list) {
    return (Array.isArray(list) ? list.slice() : []).sort(confronta);
}

/**
 * Id nuovo, `p<Date.now()>`, mai uguale a uno della lista (ne' a uno nato
 * nello stesso millisecondo). `adesso` si passa solo nei test.
 */
export function nuovoId(list, adesso = Date.now()) {
    const usati = new Set((Array.isArray(list) ? list : []).map((x) => String(x.id)));
    let n = Math.floor(Number(adesso) || 0);
    while (usati.has('p' + n)) n += 1;
    return 'p' + n;
}

/** Il nome proposto al salvataggio: `96 · 4/4`. */
export function nomeProposto(v) {
    return v.bpm + ' · ' + v.meter;
}

/**
 * Il riassunto sotto il nome: `96 BPM · 4/4 · ottavi`; la suddivisione si
 * omette se sono quarti. `t` = funzione di traduzione (chiavi met-sub-<n>).
 */
export function riassunto(p, t) {
    const parti = [p.bpm + ' BPM', p.meter];
    if (Number(p.subdiv) > 1) {
        const tr = typeof t === 'function' ? t('met-sub-' + p.subdiv) : String(p.subdiv);
        parti.push(String(tr).toLowerCase());
    }
    return parti.join(' · ');
}

/** Vero se il preset suona come lo stato (bpm, battuta, suddivisione, suono). */
export function uguale(p, stato) {
    return !!p && !!stato
        && Number(p.bpm) === Number(stato.bpm)
        && p.meter === stato.meter
        && Number(p.subdiv) === Number(stato.subdiv)
        && p.sound === stato.sound;
}

/**
 * La voce dopo `ultimoId` nell'ordine della lista; nessun ultimo (o un id
 * che non c'e' piu') -> la prima; sull'ultima -> null.
 */
export function successivo(list, ultimoId) {
    if (!Array.isArray(list) || !list.length) return null;
    const i = ultimoId === null || ultimoId === undefined
        ? -1
        : list.findIndex((x) => x.id === ultimoId);
    if (i === -1) return list[0];
    return i + 1 < list.length ? list[i + 1] : null;
}
