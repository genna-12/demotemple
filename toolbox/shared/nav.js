// Tiny Temple Toolbox - barra superiore e menu fullscreen (spec 01).
// ES module puro: nessun effetto all'import. Uso: mountBar({...}) dopo init().
//
// CONTRATTO CON IL MARKUP (index.html, 404.html; se manca, nav.js lo crea):
//   <header class="tb-bar">                       figlio diretto di <body>
//     home:      <a class="tb-bar-brand" href="/">TINY TEMPLE <span class="tb-bar-brand-accent">TOOLBOX</span></a>
//     strumento: <a class="tb-bar-back" href="/" data-i18n-aria="bar-back-aria">svg + <span>Toolbox</span></a>
//                <h1 class="tb-bar-title"> (data-i18n = titleKey)
//     <button type="button" class="tb-menu-toggle" aria-controls="tb-menu" aria-expanded="false"
//             data-i18n-aria="bar-menu-open"><span class="tb-menu-toggle-line"></span>x2</button>
//   </header>
//   <div id="tb-menu" class="tb-menu" role="dialog" aria-modal="true" aria-label="Menu" hidden>
//                                                  figlio diretto di <body>, dopo la barra
//     <div class="tb-menu-inner">
//       <a class="tb-menu-home tb-menu-item" href="/" data-i18n="menu-all"></a>
//       <div class="tb-menu-groups"></div>         VUOTO: lo riempie nav.js da tools.js
//       <div class="tb-menu-foot tb-menu-item">
//         <div class="tb-lang-switch" role="group" aria-label="Lingua / Language">
//           <button type="button" data-lang="it" aria-pressed="true">IT</button>
//           <button type="button" data-lang="en" aria-pressed="false">EN</button></div>
//         <button type="button" class="tb-menu-install" data-i18n="menu-install"></button>
//         <a class="tb-menu-site" href="https://tinytemplestudio.it/" data-i18n="menu-site"></a>
//   Generato in .tb-menu-groups, per famiglia:
//     section.tb-menu-group > span.tb-menu-eyebrow#tb-menu-fam-<id> + ul.tb-menu-list
//       > li.tb-menu-item > a.tb-menu-link[href="/<slug>"]  (live; la corrente: aria-current="page" + .is-current)
//                         | span.tb-menu-link.is-soon + span.tb-pill (.is-next se e' il prossimo)
//
// CONTRATTO CSS (components.css):
//   - #tb-menu si mostra/nasconde con l'attributo `hidden` (non sovrascrivere [hidden] con display);
//     l'animazione e' solo su `.tb-menu.is-open` (transform/opacity, 0.6s); in chiusura nav.js
//     aspetta `transitionend` sul menu (ripiego 900ms, 250ms con reduced motion) e poi rimette hidden.
//   - `.tb-menu-item` ha la variabile --i (0,1,2...) per la cascata: transition-delay: calc(var(--i) * 40ms).
//   - Toggle aperto: `.tb-menu-toggle[aria-expanded="true"]` (anche classe .is-open) -> X.
//   - <html> ha la classe `tb-menu-open` a menu aperto. z-index della barra > menu: il toggle resta
//     visibile sopra il menu; a menu aperto nav.js rende la barra position:fixed (il body e' bloccato).
//
// CONTRATTO DATI (shared/tools.js):
//   export const FAMILIES = [{ id: 'live', key: 'fam-live' }, ...]            (ordine = ordine nel menu)
//   export const TOOLS = [{ slug: 'metronomo', family: 'live', key: '<chiave i18n del nome>',
//                           status: 'live' | 'soon', next: true /* solo il prossimo */ }, ...]
//
// mountBar({ page: 'home' | 'tool', titleKey, current })
//   current = slug della pagina (default 'home' se page === 'home'); ritorna { open, close, isOpen }.

import { t, lang, setLang, apply, onChange } from './i18n.js';
import { TOOLS, FAMILIES } from './tools.js';
import { trackInstall, installState, promptInstall, onInstallChange } from './pwa.js';

const MENU_ID = 'tb-menu';
const SVG_NS = 'http://www.w3.org/2000/svg';
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), '
    + 'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const CLOSE_FALLBACK_MS = 900;
const CLOSE_FALLBACK_REDUCED_MS = 250;
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'LINK', 'NOSCRIPT']);

let api = null;

function el(tag, cls, attrs) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) Object.keys(attrs).forEach((k) => n.setAttribute(k, attrs[k]));
    return n;
}

function reducedMotion() {
    return typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function backArrow() {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', 'M15 18l-6-6 6-6');
    svg.appendChild(path);
    return svg;
}

/* ---------- costruzione (solo cio' che manca nel markup) ---------- */

function ensureBar(page, titleKey) {
    let bar = document.querySelector('.tb-bar');
    if (!bar) {
        bar = el('header', 'tb-bar');
        document.body.prepend(bar);
    }
    let toggle = bar.querySelector('.tb-menu-toggle');
    if (!toggle) {
        toggle = el('button', 'tb-menu-toggle', { type: 'button' });
        toggle.append(el('span', 'tb-menu-toggle-line'), el('span', 'tb-menu-toggle-line'));
        bar.appendChild(toggle);
    }
    if (page === 'tool') {
        if (!bar.querySelector('.tb-bar-back')) {
            const back = el('a', 'tb-bar-back', { href: '/', 'data-i18n-aria': 'bar-back-aria' });
            const label = el('span', 'tb-bar-back-label');
            label.textContent = 'Toolbox';
            back.append(backArrow(), label);
            bar.insertBefore(back, toggle);
        }
        let title = bar.querySelector('.tb-bar-title');
        if (!title) {
            title = el('h1', 'tb-bar-title');
            bar.insertBefore(title, toggle);
        }
        if (titleKey) title.setAttribute('data-i18n', titleKey);
    } else if (!bar.querySelector('.tb-bar-brand')) {
        const brand = el('a', 'tb-bar-brand', { href: '/' });
        const accent = el('span', 'tb-bar-brand-accent');
        accent.textContent = 'TOOLBOX';
        brand.append('TINY TEMPLE ', accent);
        bar.insertBefore(brand, toggle);
    }
    return { bar, toggle };
}

function ensureMenu(bar) {
    let menu = document.getElementById(MENU_ID);
    if (!menu) {
        menu = el('div', 'tb-menu', { id: MENU_ID });
        bar.after(menu);
    }
    if (!menu.getAttribute('role')) menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-modal', 'true');
    if (!menu.hasAttribute('aria-label')) menu.setAttribute('aria-label', 'Menu');
    menu.hidden = true;

    let inner = menu.querySelector('.tb-menu-inner');
    if (!inner) {
        inner = el('div', 'tb-menu-inner');
        while (menu.firstChild) inner.appendChild(menu.firstChild);
        menu.appendChild(inner);
    }
    if (!inner.querySelector('.tb-menu-home')) {
        inner.prepend(el('a', 'tb-menu-home tb-menu-item', { href: '/', 'data-i18n': 'menu-all' }));
    }
    let foot = inner.querySelector('.tb-menu-foot');
    if (!foot) {
        foot = el('div', 'tb-menu-foot tb-menu-item');
        inner.appendChild(foot);
    }
    if (!foot.querySelector('.tb-lang-switch')) {
        const sw = el('div', 'tb-lang-switch', { role: 'group', 'aria-label': 'Lingua / Language' });
        ['it', 'en'].forEach((l) => {
            const b = el('button', null, { type: 'button', 'data-lang': l, 'aria-pressed': 'false' });
            b.textContent = l.toUpperCase();
            sw.appendChild(b);
        });
        foot.appendChild(sw);
    }
    if (!foot.querySelector('.tb-menu-install')) {
        foot.appendChild(el('button', 'tb-menu-install', { type: 'button', 'data-i18n': 'menu-install' }));
    }
    if (!foot.querySelector('.tb-menu-site')) {
        foot.appendChild(el('a', 'tb-menu-site', { href: 'https://tinytemplestudio.it/', 'data-i18n': 'menu-site' }));
    }
    let groups = inner.querySelector('.tb-menu-groups');
    if (!groups) {
        groups = el('div', 'tb-menu-groups');
        inner.insertBefore(groups, foot);
    }
    return { menu, inner, groups, foot };
}

function fillGroups(groups, current) {
    groups.textContent = '';
    const tools = Array.isArray(TOOLS) ? TOOLS : [];
    (Array.isArray(FAMILIES) ? FAMILIES : []).forEach((fam) => {
        const famId = typeof fam === 'string' ? fam : fam.id;
        const famKey = typeof fam === 'string' ? 'fam-' + fam : fam.key;
        const items = tools.filter((tool) => tool.family === famId);
        if (!items.length) return;

        const section = el('section', 'tb-menu-group');
        const eyebrowId = 'tb-menu-fam-' + famId;
        const eyebrow = el('span', 'tb-menu-eyebrow', { id: eyebrowId, 'data-i18n': famKey });
        const list = el('ul', 'tb-menu-list', { 'aria-labelledby': eyebrowId });
        items.forEach((tool) => {
            const li = el('li', 'tb-menu-item');
            if (tool.status === 'live') {
                const a = el('a', 'tb-menu-link', { href: '/' + tool.slug, 'data-i18n': tool.key });
                if (tool.slug === current) {
                    a.setAttribute('aria-current', 'page');
                    a.classList.add('is-current');
                }
                li.appendChild(a);
            } else {
                li.appendChild(el('span', 'tb-menu-link is-soon', { 'data-i18n': tool.key }));
                const pill = el('span', tool.next ? 'tb-pill is-next' : 'tb-pill',
                    { 'data-i18n': tool.next ? 'pill-next' : 'pill-soon' });
                li.appendChild(pill);
            }
            list.appendChild(li);
        });
        section.append(eyebrow, list);
        groups.appendChild(section);
    });
}

/* ---------- blocco scroll (iOS compreso) ---------- */

const BODY_PROPS = ['position', 'top', 'left', 'right', 'width', 'padding-right'];
const BAR_PROPS = ['position', 'top', 'left', 'right'];

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

function createScrollLock(bar) {
    let state = null;
    return {
        lock() {
            if (state) return;
            const body = document.body;
            const root = document.documentElement;
            const y = window.scrollY || window.pageYOffset || 0;
            const scrollbar = Math.max(0, window.innerWidth - root.clientWidth);
            const barPos = window.getComputedStyle(bar).position;
            state = { y, body: saveStyle(body, BODY_PROPS), bar: null };
            if (barPos !== 'fixed') {
                /* col body fisso una barra sticky scorrerebbe via insieme alla pagina */
                state.bar = saveStyle(bar, BAR_PROPS);
                bar.style.setProperty('position', 'fixed');
                bar.style.setProperty('top', '0');
                bar.style.setProperty('left', '0');
                bar.style.setProperty('right', '0');
            }
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
            if (state.bar) restoreStyle(bar, state.bar);
            state = null;
            const prev = root.style.getPropertyValue('scroll-behavior');
            root.style.setProperty('scroll-behavior', 'auto'); // niente scroll animato al ripristino
            window.scrollTo(0, y);
            if (prev) root.style.setProperty('scroll-behavior', prev);
            else root.style.removeProperty('scroll-behavior');
        }
    };
}

/* ---------- inert sul resto della pagina ---------- */

function createInert(bar, menu, toggle) {
    const supports = typeof HTMLElement !== 'undefined' && 'inert' in HTMLElement.prototype;
    let touched = [];
    const targets = () => {
        const list = [];
        [...document.body.children].forEach((node) => {
            if (SKIP_TAGS.has(node.tagName) || node === menu) return;
            if (node.classList.contains('tb-toast-region')) return; // i toast restano annunciati
            if (node === bar || node.contains(bar) || node.contains(menu)) return;
            list.push(node);
        });
        [...bar.children].forEach((node) => {
            if (node === menu || node.contains(toggle) || node.contains(menu)) return;
            list.push(node);
        });
        return list;
    };
    return {
        on() {
            touched = [];
            targets().forEach((node) => {
                if (supports) {
                    if (node.inert) return;
                    node.inert = true;
                    touched.push(node);
                } else if (!node.hasAttribute('aria-hidden')) {
                    node.setAttribute('aria-hidden', 'true');
                    touched.push(node);
                }
            });
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

/* ---------- montaggio ---------- */

export function mountBar({ page = 'home', titleKey, current } = {}) {
    if (api) return api;
    const cur = current !== undefined ? current : (page === 'home' ? 'home' : null);

    const { bar, toggle } = ensureBar(page, titleKey);
    const { menu, inner, groups, foot } = ensureMenu(bar);
    fillGroups(groups, cur);

    const home = inner.querySelector('.tb-menu-home');
    if (cur === 'home') {
        home.setAttribute('aria-current', 'page');
        home.classList.add('is-current');
    }
    /* cascata: indice progressivo sulle voci */
    [...inner.querySelectorAll('.tb-menu-item')].forEach((item, i) => {
        item.style.setProperty('--i', String(i));
    });

    toggle.setAttribute('aria-controls', MENU_ID);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('data-i18n-aria', 'bar-menu-open');

    const scroll = createScrollLock(bar);
    const inert = createInert(bar, menu, toggle);
    let isOpen = false;
    let closeTimer = null;
    let onEnd = null;

    const setToggle = (open) => {
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.classList.toggle('is-open', open);
        const key = open ? 'bar-menu-close' : 'bar-menu-open';
        toggle.setAttribute('data-i18n-aria', key);
        toggle.setAttribute('aria-label', t(key));
    };

    const focusables = () => [toggle, ...menu.querySelectorAll(FOCUSABLE)]
        .filter((n) => !n.hidden && !n.closest('[hidden]:not(#' + MENU_ID + ')') && n.getClientRects().length > 0);

    const cancelPendingHide = () => {
        if (closeTimer) clearTimeout(closeTimer);
        closeTimer = null;
        if (onEnd) menu.removeEventListener('transitionend', onEnd);
        onEnd = null;
    };

    function onKeydown(e) {
        if (!isOpen) return;
        if (e.key === 'Escape' || e.key === 'Esc') {
            e.preventDefault();
            close();
            return;
        }
        if (e.key !== 'Tab') return;
        const list = focusables();
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        const active = document.activeElement;
        if (!list.includes(active)) {
            e.preventDefault();
            (e.shiftKey ? last : first).focus();
        } else if (e.shiftKey && active === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && active === last) {
            e.preventDefault();
            first.focus();
        }
    }

    /* ripiego senza inert: il focus che scappa torna nel menu */
    function onFocusIn(e) {
        if (!isOpen) return;
        const n = e.target;
        if (n === toggle || menu.contains(n)) return;
        const list = focusables();
        (list[1] || list[0]).focus({ preventScroll: true });
    }

    function open() {
        if (isOpen) return;
        isOpen = true;
        cancelPendingHide();
        menu.hidden = false;
        scroll.lock();
        inert.on();
        setToggle(true);
        document.documentElement.classList.add('tb-menu-open');
        void menu.offsetWidth; // reflow: parte la transizione da chiuso
        menu.classList.add('is-open');
        document.addEventListener('keydown', onKeydown, true);
        document.addEventListener('focusin', onFocusIn, true);
        const first = menu.querySelector(FOCUSABLE);
        if (first) first.focus({ preventScroll: true });
    }

    function close({ immediate = false, restoreFocus = true } = {}) {
        if (!isOpen) return;
        isOpen = false;
        document.removeEventListener('keydown', onKeydown, true);
        document.removeEventListener('focusin', onFocusIn, true);
        menu.classList.remove('is-open');
        inert.off();
        scroll.unlock();
        setToggle(false);
        document.documentElement.classList.remove('tb-menu-open');
        if (restoreFocus) toggle.focus({ preventScroll: true });

        cancelPendingHide();
        const hide = () => {
            cancelPendingHide();
            if (!isOpen) menu.hidden = true;
        };
        if (immediate) {
            hide();
            return;
        }
        onEnd = (e) => { if (e.target === menu) hide(); };
        menu.addEventListener('transitionend', onEnd);
        closeTimer = setTimeout(hide, reducedMotion() ? CLOSE_FALLBACK_REDUCED_MS : CLOSE_FALLBACK_MS);
    }

    toggle.addEventListener('click', () => {
        if (isOpen) close();
        else open();
    });

    /* tocco su una voce: si chiude; la voce corrente non ricarica la pagina */
    menu.addEventListener('click', (e) => {
        const a = e.target.closest ? e.target.closest('a[href]') : null;
        if (!a || !menu.contains(a)) return;
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (a.getAttribute('aria-current') === 'page') {
            e.preventDefault();
            close();
            return;
        }
        close({ restoreFocus: false });
    });

    /* bfcache: il menu non deve riapparire aperto tornando indietro */
    window.addEventListener('pagehide', () => close({ immediate: true, restoreFocus: false }));
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) close({ immediate: true, restoreFocus: false });
    });

    /* lingua */
    const langBtns = [...foot.querySelectorAll('[data-lang]')];
    const renderLang = () => {
        const l = lang();
        langBtns.forEach((b) => b.setAttribute('aria-pressed', b.getAttribute('data-lang') === l ? 'true' : 'false'));
    };
    langBtns.forEach((b) => b.addEventListener('click', () => setLang(b.getAttribute('data-lang'))));
    onChange(renderLang);
    renderLang();

    /* installazione: prompt nativo se c'e', altrimenti la sezione #installa della home */
    const installBtn = foot.querySelector('.tb-menu-install');
    trackInstall();
    const renderInstall = (st) => { installBtn.hidden = st === 'installed'; };
    onInstallChange(renderInstall);
    renderInstall(installState());
    installBtn.addEventListener('click', () => {
        if (installState() === 'prompt') {
            close();
            promptInstall();
            return;
        }
        const section = document.getElementById('installa') || document.getElementById('tb-install-section');
        if (!section || section.hidden) {
            window.location.assign('/#installa');
            return;
        }
        close({ immediate: true, restoreFocus: false });
        if (!section.hasAttribute('tabindex')) section.setAttribute('tabindex', '-1');
        section.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
        section.focus({ preventScroll: true });
        try {
            window.history.replaceState(null, '', '#' + section.id);
        } catch (err) { /* replaceState non disponibile */ }
    });

    apply(bar);
    apply(menu);
    setToggle(false);

    api = { open, close, isOpen: () => isOpen };
    return api;
}
