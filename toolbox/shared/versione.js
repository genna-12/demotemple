/**
 * Tiny Temple Toolbox - versione dell'app (spec 18 §5, "Versione dell'app").
 *
 * La mostra la pagina Impostazioni. `sw.js` e' uno script CLASSICO (niente
 * `import`) e ha la sua `const VERSION`: le due costanti devono coincidere,
 * e `node scripts/check.mjs` lo verifica. Si alzano insieme, con la data.
 */

export const VERSIONE = 'tb-v50';
/** Giorno della versione (AAAA-MM-GG), scritto a mano: nessun build step. */
export const DATA_VERSIONE = '2026-09-25';
