/**
 * Tiny Temple Toolbox - Pianificatore di uscita: dati delle tappe (spec 15
 * §4). Modulo dati puro, importato da timeline.js senza DOM: nessun effetto
 * all'import, nessun globale, nessun testo diretto (solo CHIAVI i18n: il
 * testo vero sta in i18n.js, cosi' timeline.js resta puro e verificabile in
 * Node senza caricare un dizionario — CONTRATTO in testa a pianificatore.js
 * e import in timeline.js: `{ TAPPE, TAPPE_ALBUM, VARIANTI, ULTIMA_SPOSTATA,
 * TIPI, PROFILI }`, più `DISTRIBUTORI` per pianificatore.js).
 *
 * SORGENTE dei contenuti (titolo/testo/foglio, non gli anticipi qui sotto):
 * copia esatta di docs/toolbox/contenuti/pianificatore-tappe.md — per
 * correggere un titolo o un "perché" si cambia LÌ (lo studio), poi si
 * riportano le stringhe nelle chiavi corrispondenti di i18n.js. Non
 * aggiungere/rinominare id qui senza prima cambiarli nel file dei
 * contenuti: sono l'unica sorgente e sono salvati nei piani in IndexedDB
 * (spec 15 §4 "Salvataggio").
 *
 * anticipo.completa / anticipo.veloce = giorni prima della data di uscita
 * per il profilo Completa/Veloce (positivo = prima, negativo = dopo);
 * null = la tappa non esiste in quel profilo (spec 15 §6, criterio 2).
 */

export const TIPI = ['singolo', 'ep', 'album'];
export const PROFILI = ['completa', 'veloce'];
export const DISTRIBUTORI = ['nessuno', 'distrokid', 'tunecore', 'amuse', 'believe', 'altro'];

/* Variante di tipo (spec §4): giorni in piu' sugli anticipi, solo fino a
   ULTIMA_SPOSTATA (= 'consegna') compresa. */
export const VARIANTI = { singolo: 0, ep: 14, album: 28 };
export const ULTIMA_SPOSTATA = 'consegna';

export const TAPPE = [
    {
        id: 'data',
        anticipo: { completa: 70, veloce: 28 },
        titolo: 'pia-step-data-titolo',
        testo: 'pia-step-data-testo',
        foglio: 'pia-step-data-foglio'
    },
    {
        id: 'master',
        anticipo: { completa: 56, veloce: 28 },
        titolo: 'pia-step-master-titolo',
        testo: 'pia-step-master-testo',
        foglio: 'pia-step-master-foglio'
    },
    {
        id: 'split',
        anticipo: { completa: 56, veloce: 28 },
        titolo: 'pia-step-split-titolo',
        testo: 'pia-step-split-testo',
        foglio: 'pia-step-split-foglio'
    },
    {
        id: 'artwork',
        anticipo: { completa: 49, veloce: 28 },
        titolo: 'pia-step-artwork-titolo',
        testo: 'pia-step-artwork-testo',
        foglio: 'pia-step-artwork-foglio'
    },
    {
        id: 'consegna',
        anticipo: { completa: 42, veloce: 21 },
        titolo: 'pia-step-consegna-titolo',
        testo: 'pia-step-consegna-testo',
        foglio: 'pia-step-consegna-foglio'
    },
    {
        id: 'visual',
        anticipo: { completa: 35, veloce: null },
        titolo: 'pia-step-visual-titolo',
        testo: 'pia-step-visual-testo',
        foglio: 'pia-step-visual-foglio'
    },
    {
        id: 'pitch',
        anticipo: { completa: 28, veloce: 14 },
        titolo: 'pia-step-pitch-titolo',
        testo: 'pia-step-pitch-testo',
        foglio: 'pia-step-pitch-foglio'
    },
    {
        id: 'presave',
        anticipo: { completa: 21, veloce: 7 },
        titolo: 'pia-step-presave-titolo',
        testo: 'pia-step-presave-testo',
        foglio: 'pia-step-presave-foglio'
    },
    {
        id: 'press',
        anticipo: { completa: 14, veloce: null },
        titolo: 'pia-step-press-titolo',
        testo: 'pia-step-press-testo',
        foglio: 'pia-step-press-foglio'
    },
    {
        id: 'social',
        anticipo: { completa: 7, veloce: 7 },
        titolo: 'pia-step-social-titolo',
        testo: 'pia-step-social-testo',
        foglio: 'pia-step-social-foglio'
    },
    {
        id: 'uscita',
        anticipo: { completa: 0, veloce: 0 },
        titolo: 'pia-step-uscita-titolo',
        testo: 'pia-step-uscita-testo',
        foglio: 'pia-step-uscita-foglio'
    },
    {
        id: 'seguito',
        anticipo: { completa: -3, veloce: -3 },
        titolo: 'pia-step-seguito-titolo',
        testo: 'pia-step-seguito-testo',
        foglio: 'pia-step-seguito-foglio'
    },
    {
        id: 'dati',
        anticipo: { completa: -28, veloce: -28 },
        titolo: 'pia-step-dati-titolo',
        testo: 'pia-step-dati-testo',
        foglio: 'pia-step-dati-foglio'
    }
];

/* Solo per il tipo "album" (spec §4): tre singoli di lancio a T-84/-56/-35,
   anticipo fisso (non seguono la variante di tipo). Non fanno parte del
   file dei contenuti (che copre solo le 13 tappe sopra): testi minimi,
   DA VALIDARE CON PONZ come il resto del file dei contenuti. */
export const TAPPE_ALBUM = [
    { id: 'singolo-1', anticipo: { completa: 84, veloce: 84 }, titolo: 'pia-step-singolo-titolo', testo: 'pia-step-singolo-testo', vars: { n: 1 } },
    { id: 'singolo-2', anticipo: { completa: 56, veloce: 56 }, titolo: 'pia-step-singolo-titolo', testo: 'pia-step-singolo-testo', vars: { n: 2 } },
    { id: 'singolo-3', anticipo: { completa: 35, veloce: 35 }, titolo: 'pia-step-singolo-titolo', testo: 'pia-step-singolo-testo', vars: { n: 3 } }
];

/**
 * Quante tappe di serie genera un piano nuovo con questo profilo e tipo
 * (spec 22 §3, riga «Veloce / Completa»): le tappe che esistono nel profilo
 * (anticipo non null) piu', per l'album, i singoli di lancio. Pura: e' la
 * stessa regola di `generaTappe` in timeline.js, senza date. Profilo o tipo
 * sconosciuti valgono 'completa' / 'singolo', come la' dentro.
 */
export function conta(profilo, tipo) {
    const p = PROFILI.indexOf(profilo) >= 0 ? profilo : 'completa';
    const t = TIPI.indexOf(tipo) >= 0 ? tipo : 'singolo';
    const esiste = (voce) => !!voce.anticipo && voce.anticipo[p] !== null && voce.anticipo[p] !== undefined;
    return TAPPE.filter(esiste).length + (t === 'album' ? TAPPE_ALBUM.filter(esiste).length : 0);
}
