// Tiny Temple Toolbox - componenti UI condivisi
// ES module puro: nessun effetto all'import, nessun globale.
import { t } from './i18n.js';

const PRESS_SELECTOR = '.tb-btn, .tb-bar-back, a.tb-tool, a.tb-menu-link, .tb-menu-install, '
    + '.tb-menu-site, .tb-footer-links a, .tb-toast-action, .tb-consent button, .tb-consent a';
const PRESS_MIN_VISIBLE_MS = 120;

const STATUS_KINDS = ['idle', 'busy', 'ok', 'error', 'denied'];

/** Aggiorna lo stato visivo/testuale di un elemento .tb-status. */
export function setStatus(el, { kind = 'idle', key } = {}) {
    if (!el) return;
    STATUS_KINDS.forEach((k) => el.classList.remove('tb-status--' + k));
    el.classList.add('tb-status', 'tb-status--' + kind);
    el.setAttribute('data-status', kind);
    if (key) {
        el.setAttribute('data-i18n', key);
        el.textContent = t(key);
    }
}

let toastRegion = null;
function getToastRegion() {
    if (toastRegion && document.body.contains(toastRegion)) return toastRegion;
    toastRegion = document.createElement('div');
    toastRegion.className = 'tb-toast-region';
    toastRegion.setAttribute('aria-live', 'polite');
    toastRegion.setAttribute('aria-atomic', 'true');
    document.body.appendChild(toastRegion);
    return toastRegion;
}

/**
 * Mostra un toast (aria-live polite). `key` e' una chiave i18n.
 * `action`, se presente, e' { key, onClick } per un pulsante secondario
 * (es. "Aggiorna" del toast di nuova versione). Ritorna una funzione
 * per chiudere subito il toast.
 */
export function toast(key, { action, timeout = 4000 } = {}) {
    const region = getToastRegion();
    const el = document.createElement('div');
    el.className = 'tb-toast';
    el.setAttribute('role', 'status');

    const msg = document.createElement('span');
    msg.className = 'tb-toast-msg';
    msg.textContent = t(key);
    el.appendChild(msg);

    let timer = null;
    const close = () => {
        if (timer) clearTimeout(timer);
        el.classList.remove('is-visible');
        setTimeout(() => el.remove(), 300);
    };

    if (action && action.key) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tb-toast-action';
        btn.textContent = t(action.key);
        btn.addEventListener('click', () => {
            try {
                if (typeof action.onClick === 'function') action.onClick();
            } finally {
                close();
            }
        });
        el.appendChild(btn);
    }

    region.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-visible'));

    if (timeout > 0) {
        timer = setTimeout(close, timeout);
    }

    return close;
}

/**
 * Feedback al tocco (.is-pressed), stesso pattern della vetrina:
 * su mobile non c'e' hover, quindi la classe da' un riscontro visivo
 * immediato al tap su bottoni/link interattivi dentro root.
 */
export function pressFeedback(root = document) {
    const target = root && typeof root.addEventListener === 'function' ? root : document;
    let pressed = null;
    let pressedAt = 0;

    const release = () => {
        const el = pressed;
        if (!el) return;
        pressed = null;
        const wait = Math.max(0, PRESS_MIN_VISIBLE_MS - (Date.now() - pressedAt));
        setTimeout(() => el.classList.remove('is-pressed'), wait);
    };

    target.addEventListener('pointerdown', (e) => {
        const el = e.target.closest ? e.target.closest(PRESS_SELECTOR) : null;
        if (!el) return;
        if (pressed && pressed !== el) pressed.classList.remove('is-pressed');
        pressed = el;
        pressedAt = Date.now();
        el.classList.add('is-pressed');
    }, { passive: true });

    ['pointerup', 'pointercancel', 'touchend', 'touchcancel', 'dragstart'].forEach((ev) => {
        target.addEventListener(ev, release, { passive: true });
    });
}

let wakeLockSentinel = null;

/** Richiede/rilascia lo screen wake lock; no-op se l'API non e' supportata. */
export async function wakeLock(on) {
    if (!('wakeLock' in navigator)) return;
    try {
        if (on) {
            if (!wakeLockSentinel) {
                wakeLockSentinel = await navigator.wakeLock.request('screen');
                wakeLockSentinel.addEventListener('release', () => {
                    wakeLockSentinel = null;
                });
            }
        } else if (wakeLockSentinel) {
            const sentinel = wakeLockSentinel;
            wakeLockSentinel = null;
            await sentinel.release();
        }
    } catch {
        wakeLockSentinel = null;
    }
}
