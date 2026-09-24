// Tiny Temple Toolbox - i18n
// ES module puro: nessun effetto all'import, nessun globale.
// Lingua salvata in localStorage.tinyTempleLang (chiave uguale alla
// vetrina ma origin diverso: il valore resta separato). Default "it".
// ?lang=it|en all'arrivo vince, si salva e si toglie dall'URL.

import { impostaPref } from './archivio.js';

const STORAGE_KEY = 'tinyTempleLang';
const DEFAULT_LANG = 'it';

let dict = { it: {}, en: {} };
let currentLang = DEFAULT_LANG;
const listeners = new Set();

function readStoredLang() {
    try {
        const v = window.localStorage.getItem(STORAGE_KEY);
        return v === 'it' || v === 'en' ? v : null;
    } catch {
        return null;
    }
}

function writeStoredLang(l) {
    try {
        window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
        /* storage non disponibile: si ignora, la lingua resta in memoria */
    }
    /* la verita' e' l'archivio (spec 18 §3), localStorage la copia veloce
       che lang-boot.js legge prima del primo paint */
    impostaPref(STORAGE_KEY, l).catch(() => { /* senza IndexedDB resta la copia */ });
}

function resolveInitialLang() {
    let params = null;
    try {
        params = new URLSearchParams(window.location.search);
    } catch {
        params = null;
    }
    const fromQuery = params ? params.get('lang') : null;
    if (fromQuery === 'it' || fromQuery === 'en') {
        writeStoredLang(fromQuery);
        try {
            params.delete('lang');
            const qs = params.toString();
            const url = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
            window.history.replaceState(null, '', url);
        } catch {
            /* replaceState non disponibile: la query resta nell'URL */
        }
        return fromQuery;
    }
    return readStoredLang() || DEFAULT_LANG;
}

/**
 * Unisce i dizionari passati (shared/i18n-common.js + eventuale
 * <slug>/i18n.js dello strumento), risolve la lingua iniziale e
 * applica subito le traduzioni al documento.
 */
export function init(...dicts) {
    const merged = { it: {}, en: {} };
    dicts.forEach((d) => {
        if (!d) return;
        Object.assign(merged.it, d.it || {});
        Object.assign(merged.en, d.en || {});
    });
    dict = merged;
    currentLang = resolveInitialLang();
    document.documentElement.setAttribute('lang', currentLang);
    apply(document);
    document.documentElement.classList.remove('tb-i18n-pending'); // vedi shared/lang-boot.js
}

/** Traduce una chiave nella lingua corrente; {vars} sostituisce segnaposto {chiave}. */
export function t(key, vars) {
    const table = dict[currentLang] || {};
    let str = Object.prototype.hasOwnProperty.call(table, key) ? table[key] : key;
    if (vars) {
        Object.keys(vars).forEach((k) => {
            str = str.replace(new RegExp('\\{' + k + '\\}', 'g'), String(vars[k]));
        });
    }
    return str;
}

export function lang() {
    return currentLang;
}

/** Cambia lingua, salva, riapplica al documento e avvisa chi ascolta. */
export function setLang(l) {
    if (l !== 'it' && l !== 'en') return;
    currentLang = l;
    writeStoredLang(l);
    document.documentElement.setAttribute('lang', l);
    apply(document);
    listeners.forEach((cb) => {
        try {
            cb(l);
        } catch {
            /* un listener rotto non deve bloccare gli altri */
        }
    });
}

/**
 * Applica le traduzioni correnti a root (default: tutto il documento).
 * data-i18n -> textContent, data-i18n-aria -> aria-label,
 * data-i18n-html -> innerHTML (solo stringhe con markup fidato,
 * mai testo utente). Non tocca data-translate (quello e' della vetrina).
 * data-i18n-tool (insieme a data-i18n): la chiave punta a una stringa con
 * un segnaposto {tool} (es. "home-next": "Il prossimo: {tool}"), riempito
 * traducendo a sua volta la chiave in data-i18n-tool (es. "tool-metronomo").
 */
export function apply(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n');
        const toolKey = el.getAttribute('data-i18n-tool');
        el.textContent = toolKey ? t(key, { tool: t(toolKey) }) : t(key);
    });
    root.querySelectorAll('[data-i18n-aria]').forEach((el) => {
        const key = el.getAttribute('data-i18n-aria');
        const toolKey = el.getAttribute('data-i18n-tool');
        el.setAttribute('aria-label', toolKey ? t(key, { tool: t(toolKey) }) : t(key));
    });
    root.querySelectorAll('[data-i18n-html]').forEach((el) => {
        const key = el.getAttribute('data-i18n-html');
        el.innerHTML = t(key);
    });
}

/** Registra un ascoltatore del cambio lingua; ritorna la funzione per rimuoverlo. */
export function onChange(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
}
