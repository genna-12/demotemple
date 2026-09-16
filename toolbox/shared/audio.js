/**
 * Tiny Temple Toolbox - AudioContext condiviso.
 *
 * Un solo AudioContext per pagina, creato al primo uso. Nessun effetto
 * all'import: gli ascoltatori di pagina si installano con il contesto.
 *
 * iOS: il contesto parte (o riparte) solo dentro un gesto dell'utente,
 * quindi `unlock()` va chiamata nel gestore del tocco, prima di ogni await.
 * Dopo una chiamata o il background lo stato puo' diventare 'interrupted':
 * `needsGesture()` torna true e lo strumento mostra "Tocca per riprendere".
 */

let ctx = null;
let pageHooked = false;
const listeners = new Set();
const worklets = new WeakMap(); // ctx -> Map(url -> Promise<boolean>)

function notify() {
    const s = ctx ? ctx.state : 'closed';
    listeners.forEach((cb) => {
        try { cb(s); } catch (e) { console.warn('[audio] listener fallito', e); }
    });
}

function hookPage() {
    if (pageHooked) return;
    pageHooked = true;
    /* al ritorno visibile lo strumento ricontrolla needsGesture() */
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') notify();
    });
    /* uscendo dalla pagina il contesto si chiude; se la pagina torna dalla
       bfcache se ne crea uno nuovo al prossimo getContext() */
    window.addEventListener('pagehide', () => {
        if (!ctx) return;
        const old = ctx;
        ctx = null;
        old.close().catch(() => {});
        notify();
    });
}

export function getContext() {
    if (ctx && ctx.state !== 'closed') return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) throw new Error('Web Audio non supportato');
    ctx = new AC({ latencyHint: 'interactive' });
    ctx.addEventListener('statechange', notify);
    hookPage();
    return ctx;
}

export function unlock() {
    const c = getContext();
    /* resume() e il buffer muto partono in modo sincrono, dentro il gesto */
    const resumed = c.state === 'running' ? Promise.resolve() : c.resume();
    try {
        const src = c.createBufferSource();
        src.buffer = c.createBuffer(1, 1, c.sampleRate);
        src.connect(c.destination);
        src.start(0);
    } catch (e) { /* non bloccante */ }
    return resumed.then(() => c);
}

export function sampleRate() {
    return getContext().sampleRate;
}

export function needsGesture() {
    return !ctx || ctx.state !== 'running';
}

export function onStateChange(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
}

export function addWorklet(url) {
    let c;
    try { c = getContext(); } catch (e) { return Promise.resolve(false); }
    if (!c.audioWorklet || typeof AudioWorkletNode === 'undefined') return Promise.resolve(false);
    let map = worklets.get(c);
    if (!map) { map = new Map(); worklets.set(c, map); }
    const key = new URL(url, document.baseURI).href;
    if (!map.has(key)) {
        map.set(key, c.audioWorklet.addModule(key).then(() => true, (e) => {
            console.warn('[audio] worklet non caricato', key, e);
            map.delete(key);
            return false;
        }));
    }
    return map.get(key);
}

export async function decode(file) {
    const c = getContext();
    const data = await file.arrayBuffer();
    /* Safari vecchi: solo la forma a callback */
    return new Promise((resolve, reject) => {
        const p = c.decodeAudioData(data, resolve, reject);
        if (p && typeof p.then === 'function') p.then(resolve, reject);
    });
}
