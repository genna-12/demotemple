/**
 * Tiny Temple Toolbox - installazione e aggiornamenti.
 *
 * - Registra /sw.js (scope '/').
 * - Aggiornamenti NON silenziosi: quando un SW nuovo e' pronto e in attesa,
 *   toast "Nuova versione - Aggiorna"; al tocco -> 'skip-waiting' -> il SW
 *   nuovo prende il controllo -> ricarica (solo se l'ha chiesto l'utente).
 * - A ogni ritorno in primo piano: registration.update().
 * - Installazione: `beforeinstallprompt` mostra `installBtn` (Chrome/Edge/
 *   Android); su iOS mostra `iosHelp` (tutorial Condividi -> Aggiungi a
 *   Home). Dentro `iosHelp` gli elementi `[data-pwa-when="safari"]` e
 *   `[data-pwa-when="inapp"]` vengono mostrati/nascosti a seconda che la
 *   pagina sia aperta in Safari o nel browser interno di un'app (Instagram,
 *   Facebook...), dove l'installazione non e' possibile.
 * - Browser senza prompt e non iOS (Firefox, Safari desktop...), o Chromium
 *   che non manda `beforeinstallprompt` entro pochi secondi: stato "manual",
 *   si mostrano gli elementi `[data-pwa-when="manual"]` della sezione
 *   (testo di ripiego "usa il menu del browser", chiave pwa-manual).
 * - App gia' installata (isStandalone()): nascosta l'INTERA sezione.
 *
 * initPwa({ installBtn, iosHelp, installSection }):
 *   installSection (facoltativo) = contenitore dell'installazione (la
 *   section#installa della home o un blocco nel menu); se manca si usa il
 *   genitore di installBtn. Tutti facoltativi: initPwa({}) registra solo
 *   il SW e ascolta il prompt (pagine senza sezione, es. 404).
 *
 * Per il pulsante "Installa l'app" del menu (shared/nav.js):
 *   trackInstall()        cattura beforeinstallprompt/appinstalled (idempotente)
 *   installState()        'installed' | 'prompt' | 'ios' | 'manual'
 *   promptInstall()       apre il prompt nativo; true se e' stato mostrato
 *   onInstallChange(cb)   avvisa a ogni cambio di stato; ritorna l'unsubscribe
 * Chiavi i18n: pwa-update, pwa-update-action, pwa-manual.
 */

import { toast } from './ui.js';

let started = false;
let deferredPrompt = null;
let promptSeen = false;
let reloading = false;
let updateRequested = false;
let lastUpdateCheck = 0;
const UPDATE_MIN_INTERVAL = 60 * 1000;
const PROMPT_WAIT = 3000; // attesa di beforeinstallprompt prima del ripiego manuale

export function isStandalone() {
    const mq = typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
    return !!mq || navigator.standalone === true;
}

export function platform() {
    const ua = navigator.userAgent || '';
    /* iPadOS si presenta come Mac: lo tradisce il touch */
    if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    return 'desktop';
}

/* Browser interni delle app: da li' "Aggiungi a Home" non esiste. */
function isInAppBrowser() {
    const ua = navigator.userAgent || '';
    return /FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|Line\/|Snapchat|TikTok|musical_ly|BytedanceWebview|Twitter|GSA\//i.test(ua);
}

function showUpdate(worker) {
    toast('pwa-update', {
        timeout: 0, // resta finche' l'utente non sceglie
        action: {
            key: 'pwa-update-action',
            onClick: () => {
                updateRequested = true;
                worker.postMessage('skip-waiting');
            }
        }
    });
}

function watchUpdates(reg) {
    const sw = navigator.serviceWorker;
    /* un SW nuovo era gia' in attesa (es. installato in una visita precedente) */
    if (reg.waiting && sw.controller) showUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
            /* senza controller e' la prima installazione: niente toast */
            if (nw.state === 'installed' && sw.controller) showUpdate(nw);
        });
    });
    sw.addEventListener('controllerchange', () => {
        if (!updateRequested || reloading) return;
        reloading = true;
        window.location.reload();
    });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return;
        const now = Date.now();
        if (now - lastUpdateCheck < UPDATE_MIN_INTERVAL) return;
        lastUpdateCheck = now;
        reg.update().catch(() => { /* offline: si riprova al prossimo ritorno */ });
    });
}

function register() {
    if (!('serviceWorker' in navigator)) return;
    const go = () => {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
            .then((reg) => { lastUpdateCheck = Date.now(); watchUpdates(reg); })
            .catch((e) => console.warn('[pwa] registrazione non riuscita', e));
    };
    if (document.readyState === 'complete') go();
    else window.addEventListener('load', go, { once: true });
}

let tracking = false;
let installedNow = false;
const installListeners = new Set();

function notifyInstall() {
    const st = installState();
    installListeners.forEach((cb) => {
        try { cb(st); } catch (e) { /* un listener rotto non blocca gli altri */ }
    });
}

/** Cattura prompt nativo e installazione; si puo' chiamare piu' volte. */
export function trackInstall() {
    if (tracking) return;
    tracking = true;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        promptSeen = true;
        notifyInstall();
    });
    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        installedNow = true;
        notifyInstall();
    });
}

export function installState() {
    if (installedNow || isStandalone()) return 'installed';
    if (deferredPrompt) return 'prompt';
    if (platform() === 'ios') return 'ios';
    return 'manual';
}

export function onInstallChange(cb) {
    installListeners.add(cb);
    return () => installListeners.delete(cb);
}

/** Apre il prompt nativo se disponibile (una sola volta per evento). */
export async function promptInstall() {
    const p = deferredPrompt;
    if (!p) return false;
    deferredPrompt = null;
    notifyInstall();
    try {
        await p.prompt();
        await p.userChoice;
    } catch (e) { /* prompt gia' usato o rifiutato */ }
    return true;
}

function setupInstall(installBtn, iosHelp, section) {
    trackInstall();
    const manualEls = section ? [...section.querySelectorAll('[data-pwa-when="manual"]')] : [];
    const showManual = (on) => manualEls.forEach((el) => { el.hidden = !on; });
    if (installBtn) installBtn.hidden = true;
    if (iosHelp) iosHelp.hidden = true;
    showManual(false);
    if (isStandalone()) {
        if (section) section.hidden = true;
        return;
    }

    if (iosHelp && platform() === 'ios') {
        const inApp = isInAppBrowser();
        iosHelp.querySelectorAll('[data-pwa-when]').forEach((el) => {
            el.hidden = el.getAttribute('data-pwa-when') !== (inApp ? 'inapp' : 'safari');
        });
        iosHelp.hidden = false;
    }

    let manualAllowed = false;
    const render = (st) => {
        if (st === 'installed') {
            if (section) section.hidden = true;
            else if (installBtn) installBtn.hidden = true;
            return;
        }
        if (installBtn) installBtn.hidden = st !== 'prompt';
        if (st === 'prompt') showManual(false);
        else if (st === 'manual' && manualAllowed && !promptSeen) showManual(true);
    };

    if (platform() !== 'ios') {
        /* niente prompt nativo: subito il ripiego; Chromium: si aspetta un po' */
        const allowManual = () => { manualAllowed = true; render(installState()); };
        if (!('onbeforeinstallprompt' in window)) allowManual();
        else setTimeout(() => { if (!promptSeen) allowManual(); }, PROMPT_WAIT);
    }

    onInstallChange(render);
    render(installState()); // il prompt puo' essere arrivato prima di initPwa

    if (!installBtn) return;
    installBtn.addEventListener('click', () => { promptInstall(); });
}

export function initPwa({ installBtn = null, iosHelp = null, installSection = null } = {}) {
    if (started) return;
    started = true;
    register();
    setupInstall(installBtn, iosHelp, installSection || (installBtn && installBtn.parentElement) || null);
}
