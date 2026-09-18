/**
 * Tiny Temple Toolbox - fuoco, inert e blocco dello scroll.
 *
 * Quel che serve a ogni cosa che si apre "sopra" la pagina: il menu
 * (shared/nav.js), i fogli e i popover (shared/sheet.js) e domani gli
 * altri. Era dentro nav.js: qui sta una volta sola.
 *
 * createScrollLock()            lock()/unlock(), compatibile iOS
 * createInert(keepFn|keep[])    on()/off(): rende inerte tutto il resto
 * createFocusTrap({...})        on()/off(): Tab in cerchio, Esc, fuoco
 *                               di ritorno; usa gli altri due se richiesto
 * focusables(root, extra)       elementi davvero raggiungibili nel nodo
 */

export const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), '
    + 'select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'LINK', 'NOSCRIPT']);
const BODY_PROPS = ['position', 'top', 'left', 'right', 'width', 'padding-right'];

function saveStyle(node, props) {
    const saved = {};
    props.forEach((p) => {
        saved[p] = [node.style.getPropertyValue(p), node.style.getPropertyPriority(p)];
    });
    return saved;
}

function restoreStyle(node, saved) {
    Object.keys(saved).forEach((p) => {
        const [v, prio] = saved[p];
        if (v) node.style.setProperty(p, v, prio);
        else node.style.removeProperty(p);
    });
}

/** Elementi raggiungibili col Tab dentro `root` (piu' eventuali `extra`). */
export function focusables(root, extra = []) {
    const list = [...extra, ...(root ? root.querySelectorAll(FOCUSABLE) : [])];
    return list.filter((n) => n && !n.hidden && !n.closest('[hidden]')
        && (typeof n.getClientRects !== 'function' || n.getClientRects().length > 0));
}

/**
 * Scroll bloccato anche su iOS: body fisso all'offset corrente, poi
 * ripristino esatto della posizione. Gli elementi position:fixed (logo,
 * hamburger) restano dove sono.
 */
export function createScrollLock() {
    let state = null;
    return {
        lock() {
            if (state) return;
            const body = document.body;
            const root = document.documentElement;
            const y = window.scrollY || window.pageYOffset || 0;
            const scrollbar = Math.max(0, window.innerWidth - root.clientWidth);
            state = { y, body: saveStyle(body, BODY_PROPS) };
            body.style.setProperty('position', 'fixed');
            body.style.setProperty('top', -y + 'px');
            body.style.setProperty('left', '0');
            body.style.setProperty('right', '0');
            body.style.setProperty('width', '100%');
            if (scrollbar > 0) {
                const pad = parseFloat(window.getComputedStyle(body).paddingRight) || 0;
                body.style.setProperty('padding-right', (pad + scrollbar) + 'px');
            }
        },
        unlock() {
            if (!state) return;
            const { y } = state;
            const root = document.documentElement;
            restoreStyle(document.body, state.body);
            state = null;
            const prev = root.style.getPropertyValue('scroll-behavior');
            root.style.setProperty('scroll-behavior', 'auto'); // niente scroll animato al ripristino
            window.scrollTo(0, y);
            if (prev) root.style.setProperty('scroll-behavior', prev);
            else root.style.removeProperty('scroll-behavior');
        },
        locked: () => !!state
    };
}

/**
 * Rende inerte tutta la pagina tranne i nodi da tenere vivi (e i loro
 * contenitori, in cui si scende). `keep` puo' essere un array o una
 * funzione che lo restituisce al momento dell'apertura.
 */
export function createInert(keep) {
    const supports = typeof HTMLElement !== 'undefined' && 'inert' in HTMLElement.prototype;
    let touched = [];
    const mark = (node) => {
        if (supports) {
            if (node.inert) return;
            node.inert = true;
            touched.push(node);
        } else if (!node.hasAttribute('aria-hidden')) {
            node.setAttribute('aria-hidden', 'true');
            touched.push(node);
        }
    };
    return {
        on() {
            const alive = (typeof keep === 'function' ? keep() : keep).filter(Boolean);
            touched = [];
            const walk = (parent) => {
                [...parent.children].forEach((node) => {
                    if (SKIP_TAGS.has(node.tagName)) return;
                    if (alive.includes(node)) return;
                    if (node.classList.contains('tb-toast-region')) return; // i toast restano annunciati
                    if (alive.some((k) => node.contains(k))) { walk(node); return; } // contenitore: si scende
                    mark(node);
                });
            };
            walk(document.body);
        },
        off() {
            touched.forEach((node) => {
                if (supports) node.inert = false;
                else node.removeAttribute('aria-hidden');
            });
            touched = [];
        }
    };
}

/**
 * Trappola del fuoco per un pannello aperto.
 *   container  il pannello (o una funzione che lo restituisce)
 *   extra      altri elementi che restano nel giro (es. l'hamburger)
 *   onEscape   che fare con Esc
 *   keep       nodi da NON rendere inerti (default: container + extra)
 *   lockScroll blocca lo scroll della pagina (default true)
 */
export function createFocusTrap({
    container,
    extra = [],
    onEscape,
    keep = null,
    lockScroll = true
} = {}) {
    const node = () => (typeof container === 'function' ? container() : container);
    const others = () => (typeof extra === 'function' ? extra() : extra);
    const scroll = lockScroll ? createScrollLock() : null;
    const inert = createInert(() => (keep ? (typeof keep === 'function' ? keep() : keep)
        : [node(), ...others()]));
    let active = false;
    let last = null;

    const list = () => focusables(node(), others());

    function onKeydown(e) {
        if (!active) return;
        if (e.key === 'Escape' || e.key === 'Esc') {
            e.preventDefault();
            if (typeof onEscape === 'function') onEscape();
            return;
        }
        if (e.key !== 'Tab') return;
        const items = list();
        if (!items.length) return;
        const first = items[0];
        const end = items[items.length - 1];
        const cur = document.activeElement;
        if (!items.includes(cur)) {
            e.preventDefault();
            (e.shiftKey ? end : first).focus();
        } else if (e.shiftKey && cur === first) {
            e.preventDefault();
            end.focus();
        } else if (!e.shiftKey && cur === end) {
            e.preventDefault();
            first.focus();
        }
    }

    /* senza inert il fuoco puo' scappare: lo si riporta dentro */
    function onFocusIn(e) {
        if (!active) return;
        const n = e.target;
        if (n === node() || (node() && node().contains(n)) || others().includes(n)) return;
        const items = list();
        if (items.length) items[0].focus({ preventScroll: true });
    }

    return {
        on({ focusFirst = true } = {}) {
            if (active) return;
            active = true;
            last = document.activeElement;
            if (scroll) scroll.lock();
            inert.on();
            document.addEventListener('keydown', onKeydown, true);
            document.addEventListener('focusin', onFocusIn, true);
            if (focusFirst) {
                const items = focusables(node());
                if (items.length) items[0].focus({ preventScroll: true });
            }
        },
        off({ restoreFocus = true } = {}) {
            if (!active) return;
            active = false;
            document.removeEventListener('keydown', onKeydown, true);
            document.removeEventListener('focusin', onFocusIn, true);
            inert.off();
            if (scroll) scroll.unlock();
            if (restoreFocus && last && typeof last.focus === 'function') {
                last.focus({ preventScroll: true });
            }
            last = null;
        },
        active: () => active,
        setReturn(el) { last = el; }
    };
}
