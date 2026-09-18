/**
 * Tiny Temple Toolbox - foglio dal basso / popover (spec 03 §2).
 *
 * Sotto i 768px e' un foglio che sale dal basso con lo scrim scuro; da
 * 768px un popover ancorato al bottone che l'ha aperto. Chiude con la X,
 * con lo scrim, con Esc; il fuoco resta dentro (stessa trappola del menu,
 * shared/focus.js) e torna al bottone.
 *
 * Markup atteso (contratto in components.css), gia' nelle pagine:
 *   button.tb-info[aria-haspopup=dialog][aria-controls="<id>"]
 *   div.tb-sheet-scrim#<id>-scrim[hidden]
 *   div.tb-sheet#<id>[role=dialog][aria-modal][hidden]
 *     > .tb-sheet-head (h2#<id>-title + button.tb-sheet-close) + .tb-sheet-body
 *
 * mountInfo(button)                accende un bottone "i"
 * mountInfos(root)                 tutti quelli che trova
 * openSheet(target, { anchor })    apre un foglio gia' nel DOM (id o nodo)
 * openSheet({ titleKey, textKey }) ne costruisce uno al volo e lo apre
 * closeSheet()                     chiude quello aperto
 */

import { t, apply } from './i18n.js';
import { createFocusTrap } from './focus.js';

const POPOVER_MIN = 768; // da qui in su e' un popover, non un foglio
const GAP = 8;

const mounted = new WeakSet();
let current = null; // { sheet, scrim, trap, anchor, temporary }
let hooked = false;

/* Il foglio non deve restare aperto tornando indietro dalla bfcache.
   Si aggancia al primo uso: l'import non deve fare nulla. */
function hookPage() {
    if (hooked) return;
    hooked = true;
    window.addEventListener('pagehide', () => closeSheet({ restoreFocus: false }));
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) closeSheet({ restoreFocus: false });
    });
}

function isPopover() {
    return typeof window.matchMedia === 'function'
        && window.matchMedia('(min-width: ' + POPOVER_MIN + 'px)').matches;
}

function scrimOf(sheet) {
    const byId = sheet.id ? document.getElementById(sheet.id + '-scrim') : null;
    if (byId) return byId;
    const prev = sheet.previousElementSibling;
    return prev && prev.classList.contains('tb-sheet-scrim') ? prev : null;
}

/* Popover: sotto il bottone, dentro lo schermo; foglio: ci pensa il CSS. */
function place(sheet, anchor) {
    sheet.classList.remove('is-above');
    sheet.style.removeProperty('top');
    sheet.style.removeProperty('left');
    if (!isPopover() || !anchor || typeof anchor.getBoundingClientRect !== 'function') return;
    const rect = anchor.getBoundingClientRect();
    const width = sheet.offsetWidth || 320;
    const height = sheet.offsetHeight || 200;
    const below = window.innerHeight - rect.bottom;
    const above = below < height + GAP && rect.top > below;
    const top = above ? Math.max(GAP, rect.top - height - GAP) : rect.bottom + GAP;
    const left = Math.max(GAP, Math.min(window.innerWidth - width - GAP, rect.left + rect.width / 2 - width / 2));
    sheet.classList.toggle('is-above', above);
    sheet.style.setProperty('top', top + 'px');
    sheet.style.setProperty('left', left + 'px');
}

function buildSheet({ titleKey, textKey }) {
    const id = 'tb-sheet-' + Math.random().toString(36).slice(2, 8);
    const scrim = document.createElement('div');
    scrim.className = 'tb-sheet-scrim';
    scrim.id = id + '-scrim';
    scrim.hidden = true;
    const sheet = document.createElement('div');
    sheet.className = 'tb-sheet';
    sheet.id = id;
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-labelledby', id + '-title');
    sheet.hidden = true;
    const head = document.createElement('div');
    head.className = 'tb-sheet-head';
    const h2 = document.createElement('h2');
    h2.id = id + '-title';
    if (titleKey) {
        h2.setAttribute('data-i18n', titleKey);
        h2.textContent = t(titleKey);
    }
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'tb-sheet-close';
    close.setAttribute('data-i18n-aria', 'sheet-close');
    close.setAttribute('aria-label', t('sheet-close'));
    close.textContent = '×';
    head.append(h2, close);
    const body = document.createElement('div');
    body.className = 'tb-sheet-body';
    if (textKey) {
        body.setAttribute('data-i18n', textKey);
        body.textContent = t(textKey);
    }
    sheet.append(head, body);
    document.body.append(scrim, sheet);
    return { sheet, scrim };
}

export function closeSheet({ restoreFocus = true } = {}) {
    if (!current) return;
    const { sheet, scrim, trap, anchor, temporary } = current;
    current = null;
    sheet.classList.remove('is-open');
    if (scrim) scrim.classList.remove('is-open');
    sheet.hidden = true;
    if (scrim) scrim.hidden = true;
    if (anchor) anchor.setAttribute('aria-expanded', 'false');
    trap.off({ restoreFocus: false });
    if (restoreFocus && anchor && typeof anchor.focus === 'function') {
        anchor.focus({ preventScroll: true });
    }
    if (temporary) {
        sheet.remove();
        if (scrim) scrim.remove();
    }
}

/**
 * Apre un foglio. `target` puo' essere un nodo, un id, oppure
 * { titleKey, textKey } per costruirne uno al volo.
 */
export function openSheet(target, { anchor = null } = {}) {
    hookPage();
    closeSheet({ restoreFocus: false });
    let sheet = null;
    let scrim = null;
    let temporary = false;
    if (typeof target === 'string') sheet = document.getElementById(target);
    else if (target && target.nodeType === 1) sheet = target;
    else if (target && (target.titleKey || target.textKey)) {
        const made = buildSheet(target);
        sheet = made.sheet;
        scrim = made.scrim;
        temporary = true;
        apply(sheet);
    }
    if (!sheet) return null;
    if (!scrim) scrim = scrimOf(sheet);

    if (scrim) scrim.hidden = false;
    sheet.hidden = false;
    if (anchor) anchor.setAttribute('aria-expanded', 'true');
    place(sheet, anchor);
    void sheet.offsetWidth; // reflow: l'animazione parte da chiuso
    sheet.classList.add('is-open');
    if (scrim) scrim.classList.add('is-open');

    const trap = createFocusTrap({
        container: sheet,
        keep: () => [sheet, scrim].filter(Boolean),
        onEscape: () => closeSheet(),
        lockScroll: !isPopover() // il popover non blocca la pagina
    });
    current = { sheet, scrim, trap, anchor, temporary };
    trap.on();

    const close = sheet.querySelector('.tb-sheet-close');
    if (close && !mounted.has(close)) {
        mounted.add(close);
        close.addEventListener('click', () => closeSheet());
    }
    if (scrim && !mounted.has(scrim)) {
        mounted.add(scrim);
        scrim.addEventListener('click', () => closeSheet());
    }
    return { sheet, close: () => closeSheet() };
}

/** Accende un bottone "i": apre il foglio indicato da aria-controls. */
export function mountInfo(button) {
    if (!button || mounted.has(button)) return null;
    mounted.add(button);
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', () => {
        const id = button.getAttribute('aria-controls');
        const sheet = id ? document.getElementById(id) : null;
        if (current && current.anchor === button) { closeSheet(); return; }
        if (sheet) openSheet(sheet, { anchor: button });
        else openSheet({ titleKey: button.getAttribute('data-sheet-title'), textKey: button.getAttribute('data-sheet-text') }, { anchor: button });
    });
    return button;
}

export function mountInfos(root = document) {
    return [...root.querySelectorAll('.tb-info')].map(mountInfo).filter(Boolean);
}

