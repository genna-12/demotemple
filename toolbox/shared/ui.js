// Tiny Temple Toolbox - componenti UI condivisi
// ES module puro: nessun effetto all'import, nessun globale.
import { t } from './i18n.js';

const PRESS_SELECTOR = '.tb-btn, .tb-logo, .tb-menu-toggle, .tb-edit, a.tb-tile, .tb-tile-add, '
    + '.tb-tile-remove, a.tb-menu-link, .tb-menu-install, .tb-menu-ext, .tb-picker-item, '
    + '.tb-picker-reset, .tb-picker-close, .tb-footer-links a, .tb-toast-action, .tb-consent button, .tb-consent a';
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
 * Mostra un toast (aria-live polite). `key` e' una chiave i18n, `vars` i
 * segnaposto del testo ({tool} e simili, come t()).
 * `action`, se presente, e' { key, onClick } per un pulsante secondario
 * (es. "Aggiorna" del toast di nuova versione).
 * `dismiss` aggiunge la «×» che chiude e basta: serve ai toast senza
 * scadenza (timeout: 0), che altrimenti non si tolgono piu' (spec 18 §7.11).
 * Ritorna una funzione per chiudere subito il toast.
 */
export function toast(key, { action, dismiss = false, timeout = 4000, vars } = {}) {
    const region = getToastRegion();
    const el = document.createElement('div');
    el.className = 'tb-toast';
    el.setAttribute('role', 'status');

    const msg = document.createElement('span');
    msg.className = 'tb-toast-msg';
    msg.textContent = t(key, vars);
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

    if (dismiss) {
        const x = document.createElement('button');
        x.type = 'button';
        /* .tb-toast-action da' misura (44 px) e stile: la «×» e' un'azione
           come le altre, solo che non fa niente oltre a chiudere.
           .tb-toast-close (shared/components.css) allarga il bersaglio,
           stretto per via del solo glifo. */
        x.className = 'tb-toast-close tb-toast-action';
        x.setAttribute('data-i18n-aria', 'toast-close-aria');
        x.setAttribute('aria-label', t('toast-close-aria'));
        x.textContent = '×';
        x.addEventListener('click', close);
        el.appendChild(x);
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
