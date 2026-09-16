/**
 * Tiny Temple Toolbox - microfono condiviso.
 *
 * Stesso principio di consent.js della vetrina: prima un riquadro che spiega
 * cosa succede, poi il tocco su "Attiva il microfono" E' il consenso
 * (localStorage.tinyTempleMicConsent = 'granted'), e solo allora parte
 * getUserMedia. L'audio resta nel browser: nessun dato lascia il dispositivo.
 *
 * Un solo MediaStream per pagina, con contatore dei riferimenti:
 * acquire() +1, release() -1, a zero tutte le tracce vengono fermate
 * (l'indicatore del microfono si spegne).
 * Pagina nascosta -> tracce ferme; di nuovo visibile -> se qualcuno lo stava
 * usando si riacquisisce e gli ascoltatori ricevono reason 'resumed': lo
 * strumento deve ricreare il nodo con source(ctx).
 *
 * Stati: 'unasked' | 'granted' | 'denied' | 'unavailable'.
 * Chiavi i18n usate (in shared/i18n-common.js): mic-consent-title,
 * mic-consent-text, mic-consent-allow, mic-start, mic-denied, mic-retry,
 * mic-unavailable.
 */

import { apply } from './i18n.js';

const STORAGE_KEY = 'tinyTempleMicConsent';

let current = null;          // stato calcolato al primo uso
let stream = null;
let pending = null;          // getUserMedia in corso
let refs = 0;
let lastOpts = {};
let hooked = false;
let permChecked = false;
const listeners = new Set();
const sources = new WeakMap(); // AudioContext -> { stream, node }

function supported() {
    return typeof navigator !== 'undefined' && !!navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === 'function';
}

function hasConsent() {
    try { return window.localStorage.getItem(STORAGE_KEY) === 'granted'; } catch (e) { return false; }
}

function setConsent(on) {
    try {
        if (on) window.localStorage.setItem(STORAGE_KEY, 'granted');
        else window.localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* storage bloccato: il consenso vale solo per questa visita */ }
}

function emit(reason) {
    const info = { active: !!stream, reason };
    listeners.forEach((cb) => {
        try { cb(current, info); } catch (e) { console.warn('[mic] listener fallito', e); }
    });
}

function setState(s, reason) {
    const changed = s !== current;
    current = s;
    if (changed || reason) emit(reason || 'state');
}

/* Permissions API (non su tutti i browser): allinea lo stato senza chiedere nulla. */
function checkPermission() {
    if (permChecked || !supported() || !navigator.permissions || !navigator.permissions.query) return;
    permChecked = true;
    navigator.permissions.query({ name: 'microphone' }).then((p) => {
        const sync = () => {
            if (p.state === 'denied') setState('denied');
            else if (p.state === 'granted' && hasConsent()) setState('granted');
            else if (p.state === 'prompt' && current !== 'unasked') setState('unasked');
        };
        sync();
        p.onchange = sync;
    }).catch(() => { /* Firefox/Safari vecchi: 'microphone' non interrogabile */ });
}

function ensureInit() {
    if (current === null) current = supported() ? 'unasked' : 'unavailable';
    checkPermission();
}

function stopTracks() {
    if (!stream) return;
    stream.getTracks().forEach((t) => { t.onended = null; t.stop(); });
    stream = null;
}

function hookPage() {
    if (hooked) return;
    hooked = true;
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            if (stream) { stopTracks(); emit('suspended'); }
        } else if (refs > 0 && !stream && !pending) {
            open(lastOpts).then(() => emit('resumed'), () => emit('lost'));
        }
    });
    window.addEventListener('pagehide', () => {
        refs = 0;
        if (stream) { stopTracks(); emit('released'); }
    });
}

function open(opts) {
    const audio = Object.assign({
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
    }, opts);
    pending = navigator.mediaDevices.getUserMedia({ audio, video: false }).then((s) => {
        pending = null;
        if (refs === 0) {            // rilasciato mentre il permesso era in attesa
            s.getTracks().forEach((t) => t.stop());
            return s;
        }
        stream = s;
        s.getTracks().forEach((t) => {
            /* microfono scollegato o tolto dal sistema */
            t.onended = () => {
                if (stream !== s) return;
                stopTracks();
                emit('ended');
            };
        });
        setState('granted');
        return s;
    }, (err) => {
        pending = null;
        if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) setState('denied');
        throw err;
    });
    return pending;
}

export function state() {
    ensureInit();
    return current;
}

export function renderConsent(container, { onAllow } = {}) {
    ensureInit();
    const box = document.createElement('div');
    box.className = 'tb-consent';
    const add = ({ tag, cls, key }) => {
        const el = document.createElement(tag);
        el.className = cls;
        el.setAttribute('data-i18n', key);
        el.textContent = key;
        box.appendChild(el);
        return el;
    };
    let btn = null;
    if (current === 'unavailable') {
        box.classList.add('tb-consent--unavailable');
        add({ tag: 'p', cls: 'tb-consent__text', key: 'mic-unavailable' });
    } else if (current === 'denied') {
        box.classList.add('tb-consent--denied');
        add({ tag: 'p', cls: 'tb-consent__text', key: 'mic-denied' });
        btn = add({ tag: 'button', cls: 'tb-btn', key: 'mic-retry' });
    } else if (hasConsent()) {
        box.classList.add('tb-consent--compact');
        btn = add({ tag: 'button', cls: 'tb-btn tb-btn--primary', key: 'mic-start' });
    } else {
        add({ tag: 'p', cls: 'tb-consent__title', key: 'mic-consent-title' });
        add({ tag: 'p', cls: 'tb-consent__text', key: 'mic-consent-text' });
        btn = add({ tag: 'button', cls: 'tb-btn tb-btn--primary', key: 'mic-consent-allow' });
    }
    if (btn) {
        btn.type = 'button';
        btn.addEventListener('click', () => {
            setConsent(true);
            /* sincrono: onAllow gira dentro il gesto (unlock() + acquire()) */
            if (typeof onAllow === 'function') onAllow();
        });
    }
    container.replaceChildren(box);
    apply(box);
}

export function acquire(opts = {}) {
    ensureInit();
    if (!supported()) {
        setState('unavailable');
        return Promise.reject(new DOMException('Microfono non disponibile', 'NotSupportedError'));
    }
    if (!hasConsent()) {
        return Promise.reject(new DOMException('Consenso al microfono mancante', 'NotAllowedError'));
    }
    hookPage();
    refs++;
    lastOpts = opts;
    if (stream) return Promise.resolve(stream);
    /* ogni chiamante in attesa restituisce il suo riferimento se fallisce */
    return (pending || open(opts)).catch((err) => {
        refs = Math.max(0, refs - 1);
        throw err;
    });
}

export function release() {
    if (refs > 0) refs--;
    if (refs === 0 && stream) {
        stopTracks();
        emit('released');
    }
}

export function source(ctx) {
    if (!stream) throw new Error('Microfono non attivo: chiamare acquire() prima');
    const cached = sources.get(ctx);
    if (cached && cached.stream === stream) return cached.node;
    const node = ctx.createMediaStreamSource(stream);
    sources.set(ctx, { stream, node });
    return node;
}

export function revoke() {
    ensureInit();
    setConsent(false);
    refs = 0;
    stopTracks();
    setState(current === 'granted' ? 'unasked' : current, 'revoked');
}

export function onStateChange(cb) {
    ensureInit();
    listeners.add(cb);
    return () => listeners.delete(cb);
}
