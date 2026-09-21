// Tiny Temple Toolbox - logo, hamburger e menu compatto (spec 02 §1 e §3,
// ritocco Genna: niente barra, logo e hamburger fissi come nella vetrina).
// ES module puro: nessun effetto all'import. Uso: mountBar({...}) dopo init().
//
// CONTRATTO CON IL MARKUP (index.html, 404.html; dove manca, lo crea nav.js):
//   NIENTE contenitore barra: logo e hamburger sono due elementi `position: fixed`
//   figli di <body> (un eventuale <header> che li contiene va bene lo stesso).
//   <a class="tb-logo" href="/" data-i18n-aria = bar-logo-aria>img + span.sr-only</a>
//       e' anche il logo dell'intro (vedi shared/intro.js): a riposo al centro,
//       con .in-nav in alto a sinistra. Nelle pagine senza intro parte gia' .in-nav.
//   <button type="button" class="tb-menu-toggle" aria-controls="tb-menu"
//           aria-expanded="false" data-i18n-aria = bar-menu-open>2 x span.tb-menu-toggle-line
//       compare con .is-visible (la mette intro.js; statica dove non c'e' intro).
//   <div id="tb-menu" class="tb-menu" hidden>      figlio diretto di <body>
//     <div class="tb-menu-scrim"></div>
//     <div class="tb-menu-panel" role="dialog" aria-modal="true" aria-label="Menu">
//       <a class="tb-menu-home tb-menu-item" href="/" data-i18n = menu-all>   (aria-current in home)
//       <div class="tb-menu-groups"></div>          VUOTO: lo riempie nav.js da tools.js
//       <div class="tb-menu-foot tb-menu-item">     .tb-menu-install-group (#tb-menu-install,
//                                                   #tb-menu-ios, .tb-menu-manual) e
//                                                   .tb-menu-foot-row (lang-switch + .tb-menu-ext)
// Generato in .tb-menu-groups, per ogni famiglia con strumenti:
//   <section class="tb-menu-group">
//     <span class="tb-menu-eyebrow" id="tb-menu-fam-<id>" data-i18n = fam-<id>></span>
//     <ul class="tb-menu-list" aria-labelledby="tb-menu-fam-<id>">
//       <li class="tb-menu-item"><a class="tb-menu-link" href="/<slug>">      -- status 'live'
//             <svg class="tb-menu-link-icon" aria-hidden="true"><use href="#tb-icon-<slug>"></use></svg>
//             <span class="tb-menu-link-name" data-i18n = tool-<slug>></span></a>
//       <li class="tb-menu-item"><span class="tb-menu-link is-soon">icona + nome</span>  -- 'soon'
//           <span class="tb-pill" data-i18n = pill-soon></span>
// La voce della pagina corrente: aria-current="page" + class .is-current.
//
// CONTRATTO CSS (base.css):
//   - #tb-menu si mostra/nasconde con [hidden] (non sovrascrivere [hidden] con display);
//     l'animazione sta su `.tb-menu.is-open` (scrim + pannello); in chiusura nav.js
//     aspetta transitionend su menu/scrim/pannello (ripiego 700ms, 200ms reduced motion).
//   - Toggle aperto: `.tb-menu-toggle[aria-expanded="true"]` (anche .is-open).
//   - <html> ha la classe `tb-menu-open` a menu aperto. Logo e hamburger sono
//     `position: fixed`, quindi restano al loro posto col body bloccato.
//
// INDICATORE DEL MICROFONO (feedback Genna). Markup atteso, gia' nelle pagine:
//   accanto all'hamburger, fratello di .tb-menu-toggle:
//     <span id="tb-mic-live" class="tb-mic-live" hidden role="status"
//           data-i18n-aria="mic-live-aria" aria-label="Microfono in uso">
//       <svg aria-hidden="true"><use href="#tb-icon-mic"></use></svg></span>
//   nel menu, nella .tb-menu-foot vicino alla lingua:
//     <div id="tb-mic-row" class="tb-mic-row" hidden>
//       <span id="tb-mic-state" data-i18n="mic-state-granted">Microfono: consentito</span>
//       <button type="button" id="tb-mic-revoke" class="tb-btn tb-btn--ghost"
//               data-i18n="mic-revoke">Revoca</button></div>
//   nav.js toglie [hidden] da #tb-mic-live mentre uno stream e' attivo in
//   QUALSIASI strumento (mic.onStateChange) e da #tb-mic-row solo quando il
//   consenso c'e'; "Revoca" chiama mic.revoke() e ferma le tracce.
//   Sprite: serve il simbolo #tb-icon-mic.
//
//   PACCHETTI DEL RIMARIO (spec 14b §3), accanto alla riga del microfono:
//     <div id="tb-packs-row" class="tb-packs-row" hidden>
//       <span data-i18n="pack-installed">Pacchetti del rimario</span>
//       <ul id="tb-pack-list"></ul>
//       <div id="tb-pack-confirm" hidden><span data-i18n="pack-remove-ask">Rimuovo?</span>
//         <button type="button" id="tb-pack-yes" class="tb-btn">Rimuovi</button>
//         <button type="button" id="tb-pack-no" class="tb-btn tb-btn--ghost">Annulla</button></div></div>
//   nav.js riempie #tb-pack-list (nome, peso, "Rimuovi"), svuota la cache
//   `toolbox-rimario` e aggiorna le preferenze; la riga resta nascosta se
//   non c'e' nessun pacchetto installato.
//
// CHIAVI i18n USATE QUI: bar-logo-aria, bar-menu-open, bar-menu-close, menu-all,
//   fam-<id> e tool-<slug> (da tools.js), pill-soon, mic-live-aria,
//   mic-state-granted, mic-state-unasked, mic-revoke.
//
// L'installazione NON e' gestita qui: il blocco nel menu (#tb-menu-install,
// #tb-menu-ios, .tb-menu-manual dentro .tb-menu-install-group) e' passato a
// initPwa() da index.js / 404.js.
//
// mountBar({ page: 'home' | 'tool', current })
//   La barra non ha titolo (spec 10 §11.6): `titleKey`, se passato, e' ignorato.
//   current = slug della pagina ('home' in dashboard); idempotente: chiamate
//   successive non rimontano nulla e ritornano la stessa api { open, close, isOpen }.
import { t, lang, setLang, apply, onChange } from './i18n.js';
import { TOOLS, FAMILIES } from './tools.js';
import { FOCUSABLE, focusables, createScrollLock, createInert } from './focus.js';
import * as mic from './mic.js';
import { prefs } from './storage.js';
import { LINGUE, normalizzaCodice, cartella } from './testo/lingue.js';

const MENU_ID = 'tb-menu';
const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';
const CLOSE_FALLBACK_MS = 700;
const CLOSE_FALLBACK_REDUCED_MS = 200;

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

/** Icona dallo sprite di pagina (<symbol id="tb-icon-<slug>">). */
export function toolIcon(slug, cls) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    if (cls) svg.setAttribute('class', cls);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', '#tb-icon-' + slug);
    use.setAttributeNS(XLINK_NS, 'xlink:href', '#tb-icon-' + slug); // Safari vecchi
    svg.appendChild(use);
    return svg;
}

/* ---------- costruzione (solo cio' che manca nel markup) ---------- */

function ensureShell() {
    let toggle = document.querySelector('.tb-menu-toggle');
    if (!toggle) {
        toggle = el('button', 'tb-menu-toggle is-visible', { type: 'button' });
        toggle.append(el('span', 'tb-menu-toggle-line'), el('span', 'tb-menu-toggle-line'));
        document.body.appendChild(toggle);
    }
    let logo = document.querySelector('.tb-logo');
    if (!logo) {
        /* pagine senza markup statico: il logo parte gia' agganciato (niente intro) */
        logo = el('a', 'tb-logo in-nav', { href: '/', 'data-i18n-aria': 'bar-logo-aria' });
        const img = el('img');
        img.src = '/assets/brand/logo-arancione.png';
        img.width = 100;
        img.height = 100;
        img.alt = '';
        const name = el('span', 'sr-only');
        name.textContent = 'Tiny Temple Toolbox';
        logo.append(img, name);
        document.body.insertBefore(logo, document.body.firstChild);
    }
    /* Nessun titolo in barra (spec 10 §1/§11.6): il nome dello strumento e'
       l'h1 della pagina. Un eventuale titleKey passato da un chiamante
       vecchio viene ignorato. */
    return { logo, toggle };
}

function ensureMenu(toggle) {
    let menu = document.getElementById(MENU_ID);
    if (!menu) {
        menu = el('div', 'tb-menu', { id: MENU_ID });
        document.body.appendChild(menu);
    }
    menu.hidden = true;
    let scrim = menu.querySelector('.tb-menu-scrim');
    if (!scrim) {
        scrim = el('div', 'tb-menu-scrim');
        menu.prepend(scrim);
    }
    let panel = menu.querySelector('.tb-menu-panel');
    if (!panel) {
        panel = el('div', 'tb-menu-panel');
        while (menu.lastChild && menu.lastChild !== scrim) panel.prepend(menu.lastChild);
        menu.appendChild(panel);
    }
    if (!panel.getAttribute('role')) panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    if (!panel.hasAttribute('aria-label')) panel.setAttribute('aria-label', 'Menu');

    if (!panel.querySelector('.tb-menu-home')) {
        panel.prepend(el('a', 'tb-menu-home tb-menu-item', { href: '/', 'data-i18n': 'menu-all' }));
    }
    let foot = panel.querySelector('.tb-menu-foot');
    if (!foot) {
        foot = el('div', 'tb-menu-foot tb-menu-item');
        panel.appendChild(foot);
    }
    if (!foot.querySelector('.tb-lang-switch')) {
        const sw = el('div', 'tb-lang-switch', { role: 'group', 'aria-label': 'Lingua / Language' });
        ['it', 'en'].forEach((l) => {
            const b = el('button', null, { type: 'button', 'data-lang': l, 'aria-pressed': 'false' });
            b.textContent = l.toUpperCase();
            sw.appendChild(b);
        });
        foot.prepend(sw);
    }
    let groups = panel.querySelector('.tb-menu-groups');
    if (!groups) {
        groups = el('div', 'tb-menu-groups');
        panel.insertBefore(groups, foot);
    }
    return { menu, scrim, panel, groups, foot };
}

function fillGroups(groups, current) {
    groups.textContent = '';
    const tools = Array.isArray(TOOLS) ? TOOLS : [];
    (Array.isArray(FAMILIES) ? FAMILIES : []).forEach((fam) => {
        const items = tools.filter((tool) => tool.family === fam.id);
        if (!items.length) return;

        const section = el('section', 'tb-menu-group');
        const eyebrowId = 'tb-menu-fam-' + fam.id;
        const eyebrow = el('span', 'tb-menu-eyebrow', { id: eyebrowId, 'data-i18n': fam.key });
        const list = el('ul', 'tb-menu-list', { 'aria-labelledby': eyebrowId });
        items.forEach((tool) => {
            const li = document.createElement('li');
            const live = tool.status === 'live';
            const link = live
                ? el('a', 'tb-menu-link', { href: '/' + tool.slug })
                : el('span', 'tb-menu-link is-soon');
            const name = el('span', 'tb-menu-link-name', { 'data-i18n': tool.key });
            link.append(toolIcon(tool.slug, 'tb-menu-link-icon'), name);
            if (live && tool.slug === current) {
                link.setAttribute('aria-current', 'page');
                link.classList.add('is-current');
            }
            li.appendChild(link);
            if (!live) li.appendChild(el('span', 'tb-pill tb-pill--sm', { 'data-i18n': 'pill-soon' }));
            list.appendChild(li);
        });
        section.append(eyebrow, list);
        groups.appendChild(section);
    });
}

/* ---------- blocco scroll (iOS compreso) ---------- */

/* ---------- montaggio ---------- */

export function mountBar({ page = 'home', titleKey, current } = {}) {
    if (api) return api; // idempotente
    const cur = current !== undefined ? current : (page === 'home' ? 'home' : null);

    const { logo, toggle } = ensureShell();
    const { menu, scrim, panel, groups, foot } = ensureMenu(toggle);
    fillGroups(groups, cur);

    const home = panel.querySelector('.tb-menu-home');
    if (cur === 'home') {
        home.setAttribute('aria-current', 'page');
        home.classList.add('is-current');
    } else {
        home.removeAttribute('aria-current');
        home.classList.remove('is-current');
    }

    toggle.setAttribute('aria-controls', MENU_ID);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('data-i18n-aria', 'bar-menu-open');

    const scroll = createScrollLock();
    const inert = createInert([logo, toggle, menu, document.getElementById('tb-intro')]);
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

    /* il giro del Tab: hamburger + tutto quel che c'e' nel pannello */
    const trapList = () => focusables(panel, [toggle]);

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
        const list = trapList();
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
        if (n === toggle || n === logo || menu.contains(n)) return;
        const list = trapList();
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
        const first = panel.querySelector(FOCUSABLE);
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
        onEnd = (e) => {
            if (e.target === menu || e.target === panel || e.target === scrim) hide();
        };
        menu.addEventListener('transitionend', onEnd);
        closeTimer = setTimeout(hide, reducedMotion() ? CLOSE_FALLBACK_REDUCED_MS : CLOSE_FALLBACK_MS);
    }

    toggle.addEventListener('click', () => {
        if (isOpen) close();
        else open();
    });

    /* un tocco fuori dal pannello (scrim) chiude */
    menu.addEventListener('click', (e) => {
        if (e.target === scrim || e.target === menu) close();
    });

    /* tocco su una voce: si chiude; la voce corrente non ricarica la pagina */
    panel.addEventListener('click', (e) => {
        const a = e.target.closest ? e.target.closest('a[href]') : null;
        if (!a || !panel.contains(a)) return;
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

    /* ---- microfono: indicatore nella barra e riga nel menu ---- */
    const micLive = document.getElementById('tb-mic-live');
    const micRow = document.getElementById('tb-mic-row');
    const micState = document.getElementById('tb-mic-state');
    const micRevoke = document.getElementById('tb-mic-revoke');

    function renderMic() {
        const active = mic.isActive();
        const ok = mic.granted();
        if (micLive) micLive.hidden = !active;
        if (micRow) micRow.hidden = !ok;
        if (micState) {
            const key = ok ? 'mic-state-granted' : 'mic-state-unasked';
            micState.setAttribute('data-i18n', key);
            micState.textContent = t(key);
        }
    }

    if (micRevoke) {
        micRevoke.addEventListener('click', () => {
            mic.revoke();   // ferma le tracce e cancella il consenso
            renderMic();
        });
    }
    mic.onStateChange(renderMic);
    renderMic();

    /* ---- pacchetti del rimario: riga nel menu, accanto al microfono ----
       Stessa idea della revoca del microfono: quello che l'utente ha
       scaricato deve potersi togliere da qualsiasi pagina, senza andare a
       cercarlo. La riga sparisce se non c'e' niente da rimuovere. */
    const packsRow = document.getElementById('tb-packs-row');
    const packList = document.getElementById('tb-pack-list');
    const PESI = { it: 1215000, en: 1612000, fr: 1072000, es: 449000 };

    const installati = () => {
        const v = prefs.get('penna', 'pacchetti', []);
        return Array.isArray(v) ? v.filter((c) => !!LINGUE[c]) : [];
    };

    async function rimuoviPacchetto(codice) {
        const lang = normalizzaCodice(codice);
        try {
            if (typeof caches !== 'undefined') {
                const cache = await caches.open('toolbox-rimario');
                const dir = cartella(lang, '/penna/data/');
                const chiavi = await cache.keys();
                await Promise.all(chiavi
                    .filter((req) => String(req.url).indexOf(dir) !== -1)
                    .map((req) => cache.delete(req)));
            }
        } catch (e) { /* niente Cache Storage: restano le preferenze */ }
        const resta = installati().filter((c) => c !== lang);
        prefs.set('penna', 'pacchetti', resta);
        if (normalizzaCodice(prefs.get('penna', 'lingua', 'it')) === lang) {
            prefs.set('penna', 'lingua', resta[0] || 'it');
        }
        renderPacks();
        return resta;
    }

    function renderPacks() {
        if (!packsRow) return;
        const lista = installati();
        packsRow.hidden = lista.length === 0;
        if (!packList) return;
        packList.textContent = '';
        lista.forEach((codice) => {
            const spec = LINGUE[codice];
            const li = document.createElement('li');
            li.className = 'tb-pack';
            li.setAttribute('data-tb-pack', codice);
            const nome = document.createElement('span');
            nome.className = 'tb-pack-name';
            const mb = (PESI[codice] || 0) / 1048576;
            nome.textContent = spec.nome + (mb ? ' · ' + mb.toFixed(1) + ' MB' : '');
            const via = document.createElement('button');
            via.type = 'button';
            via.className = 'tb-btn tb-btn--ghost tb-pack-remove';
            via.setAttribute('data-tb-pack-remove', codice);
            via.setAttribute('data-i18n', 'pack-remove');
            via.textContent = t('pack-remove');
            via.addEventListener('click', () => {
                const conferma = document.getElementById('tb-pack-confirm');
                if (!conferma) { rimuoviPacchetto(codice); return; }
                conferma.hidden = false;
                conferma.setAttribute('data-tb-pack', codice);
            });
            li.append(nome, via);
            packList.appendChild(li);
        });
    }

    const packYes = document.getElementById('tb-pack-yes');
    const packNo = document.getElementById('tb-pack-no');
    if (packYes) {
        packYes.addEventListener('click', () => {
            const conferma = document.getElementById('tb-pack-confirm');
            const codice = conferma ? conferma.getAttribute('data-tb-pack') : null;
            if (conferma) conferma.hidden = true;
            if (codice) rimuoviPacchetto(codice);
        });
    }
    if (packNo) {
        packNo.addEventListener('click', () => {
            const conferma = document.getElementById('tb-pack-confirm');
            if (conferma) conferma.hidden = true;
        });
    }
    renderPacks();

    apply(document); // logo/hamburger sono radici a se': si traduce tutto il documento
    setToggle(false);

    api = { open, close, isOpen: () => isOpen, renderPacks, rimuoviPacchetto };
    return api;
}
