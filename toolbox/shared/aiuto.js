/**
 * Tiny Temple Toolbox - aiuto in-app uniforme (spec 18 §6).
 *
 * Tre pezzi, montati da `mountAiuto({ slug })` una volta per pagina:
 *
 *  1. «Come funziona»: il pulsante `.tb-help` (etichetta visibile, nella
 *     pagina) apre un `tb-sheet` costruito qui e aperto con `openSheet` di
 *     shared/sheet.js (dialog, fuoco dentro, Esc, fuoco di ritorno). Le voci
 *     stanno in `/<slug>/aiuto.js`:
 *         export default { it:[{ t, d }], en:[...], hint:{ it, en } }
 *     e si importano SOLO al primo tocco (il modulo e' comunque in precache,
 *     quindi funziona offline).
 *  2. Primo avvio: la riga `.tb-hint` (`#tb-hint`, gia' nella pagina e
 *     `hidden`) mostra `hint` con una «×». La «×» la ricorda in
 *     `tt.<slug>.hint` (prefs dell'archivio, locale: `portabile()` la
 *     esclude, non si sincronizza). Finche' la riga non e' stata chiusa il
 *     modulo dell'aiuto si importa all'avvio (serve il testo); dopo, mai.
 *     Non blocca e non copre niente: e' una riga nel flusso della pagina.
 *  3. `[data-tip="<chiave i18n>"]` sui pulsanti icona: popover `.tb-tip`
 *     (il `title` al dito non esiste, audit §4). Il pulsante fa la sua
 *     azione al tocco; il tip compare
 *       - al tocco lungo (pointerdown >= 400 ms senza pointerup ne' spostamento),
 *         e in quel caso l'azione NON parte (il click che segue si mangia);
 *       - col fuoco da tastiera (:focus-visible) o col mouse sopra (350 ms).
 *     Si chiude con un tocco fuori, con Esc, scorrendo, lasciando il pulsante.
 *     Delega su `document`: vale anche per i pulsanti creati dopo.
 *     Limite noto: un pulsante che agisce su `pointerdown` (il "tap" del
 *     metronomo) non puo' avere un tip col tocco lungo: l'azione e' gia' partita.
 *
 * Nessun effetto all'import.
 */

import { t, lang, onChange } from './i18n.js';
import { openSheet, closeSheet } from './sheet.js';
import { prefs } from './archivio.js';

const LONG_MS = 400;     // tocco lungo
const HOVER_MS = 350;    // mouse fermo sopra
const MOVE_TOL = 10;     // px: oltre e' uno scorrimento, non un tocco lungo
const GAP = 8;           // distanza dal pulsante e dai bordi dello schermo
const SHEET_ID = 'tb-help-sheet';
const TIP_ID = 'tb-tip';

let tipsMounted = false;

/* ---------------- contenuti ---------------- */

function voci(data) {
    if (!data) return [];
    const l = lang();
    const list = Array.isArray(data[l]) ? data[l] : (Array.isArray(data.it) ? data.it : []);
    return list.filter((v) => v && (v.t || v.d));
}

function hintDi(data) {
    const h = data && data.hint;
    if (!h) return '';
    if (typeof h === 'string') return h;
    return h[lang()] || h.it || '';
}

/* ---------------- 1. foglio «Come funziona» ---------------- */

function buildSheet() {
    const scrim = document.createElement('div');
    scrim.className = 'tb-sheet-scrim';
    scrim.id = SHEET_ID + '-scrim';
    scrim.hidden = true;

    const sheet = document.createElement('div');
    sheet.className = 'tb-sheet tb-help-sheet';
    sheet.id = SHEET_ID;
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-labelledby', SHEET_ID + '-title');
    sheet.hidden = true;

    const head = document.createElement('div');
    head.className = 'tb-sheet-head';
    const h2 = document.createElement('h2');
    h2.id = SHEET_ID + '-title';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'tb-sheet-close';
    close.textContent = '×';
    head.append(h2, close);

    const body = document.createElement('div');
    body.className = 'tb-sheet-body';
    const list = document.createElement('ul');
    list.className = 'tb-help-list';
    body.append(list);

    sheet.append(head, body);
    document.body.append(scrim, sheet);
    return { sheet, scrim, h2, close, list };
}

function fillSheet(parts, data) {
    parts.h2.textContent = t('help-open');
    parts.close.setAttribute('aria-label', t('help-close'));
    const frag = document.createDocumentFragment();
    voci(data).forEach((v) => {
        const li = document.createElement('li');
        li.className = 'tb-help-item';
        if (v.t) {
            const h3 = document.createElement('h3');
            h3.className = 'tb-help-item-title';
            h3.textContent = v.t;
            li.append(h3);
        }
        if (v.d) {
            const p = document.createElement('p');
            p.className = 'tb-help-item-text';
            p.textContent = v.d;
            li.append(p);
        }
        frag.append(li);
    });
    parts.list.replaceChildren(frag);
}

/* ---------------- 2. riga del primo avvio ---------------- */

function fillHint(box, text, onClose) {
    let p = box.querySelector('.tb-hint-text');
    if (!p) {
        p = document.createElement('p');
        p.className = 'tb-hint-text';
        box.prepend(p);
    }
    p.textContent = text;
    let x = box.querySelector('.tb-hint-close');
    if (!x) {
        x = document.createElement('button');
        x.type = 'button';
        x.className = 'tb-hint-close';
        x.textContent = '×';
        box.append(x);
        x.addEventListener('click', onClose);
    }
    x.setAttribute('aria-label', t('hint-close-aria'));
}

/* ---------------- 3. popover dei pulsanti icona ---------------- */

const tip = {
    el: null,
    target: null,     // pulsante di cui si mostra il tip
    via: null,        // 'long' | 'focus' | 'hover'
    prevDescribed: null,
    press: null,      // { el, id, x, y, timer }
    hoverTimer: 0,
    hoverOut: 0,
    swallow: null,    // pulsante il cui prossimo click non deve partire
    lastTouch: 0
};

function tipEl() {
    if (tip.el && tip.el.isConnected) return tip.el;
    const el = document.createElement('div');
    el.className = 'tb-tip';
    el.id = TIP_ID;
    el.setAttribute('role', 'tooltip');
    el.hidden = true;
    /* fixed: il popover non allarga mai la pagina (niente scroll orizzontale) */
    el.style.setProperty('position', 'fixed');
    el.style.setProperty('max-width', 'min(280px, calc(100vw - ' + (GAP * 2) + 'px))');
    el.addEventListener('pointerenter', () => { clearTimeout(tip.hoverOut); });
    el.addEventListener('pointerleave', (e) => {
        if (tip.via === 'hover' && !(tip.target && tip.target.contains(e.relatedTarget))) hideTip();
    });
    document.body.append(el);
    tip.el = el;
    return el;
}

function placeTip(el, anchor) {
    const r = anchor.getBoundingClientRect();
    const vw = document.documentElement.clientWidth || window.innerWidth;
    const vh = window.innerHeight;
    el.style.setProperty('left', '0px');
    el.style.setProperty('top', '0px');
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = Math.max(GAP, Math.min(vw - w - GAP, r.left + r.width / 2 - w / 2));
    let top = r.bottom + GAP;
    const above = top + h > vh - GAP && r.top - h - GAP >= GAP;
    if (above) top = r.top - h - GAP;
    el.classList.toggle('is-above', above);
    el.style.setProperty('left', Math.round(left) + 'px');
    el.style.setProperty('top', Math.round(top) + 'px');
}

function showTip(target, via) {
    const key = target.getAttribute('data-tip');
    if (!key) return;
    if (tip.target && tip.target !== target) hideTip();
    const el = tipEl();
    el.textContent = t(key);
    el.hidden = false;
    placeTip(el, target);
    el.classList.add('is-open');
    if (tip.target !== target) {
        tip.prevDescribed = target.getAttribute('aria-describedby');
        target.setAttribute('aria-describedby', tip.prevDescribed ? tip.prevDescribed + ' ' + TIP_ID : TIP_ID);
    }
    tip.target = target;
    tip.via = via;
}

function hideTip() {
    clearTimeout(tip.hoverTimer);
    clearTimeout(tip.hoverOut);
    if (!tip.target) return;
    const target = tip.target;
    tip.target = null;
    tip.via = null;
    if (tip.prevDescribed) target.setAttribute('aria-describedby', tip.prevDescribed);
    else target.removeAttribute('aria-describedby');
    tip.prevDescribed = null;
    if (tip.el) {
        tip.el.classList.remove('is-open');
        tip.el.hidden = true;
    }
}

const tipTarget = (node) => (node && node.nodeType === 1 && typeof node.closest === 'function'
    ? node.closest('[data-tip]') : null);

function cancelPress() {
    if (!tip.press) return;
    clearTimeout(tip.press.timer);
    tip.press = null;
}

function mountTips() {
    if (tipsMounted) return;
    tipsMounted = true;

    document.addEventListener('pointerdown', (e) => {
        tip.swallow = null; // un gesto nuovo: il click "da mangiare" era del precedente
        const target = tipTarget(e.target);
        /* tocco fuori (o su un altro pulsante): il tip aperto si chiude */
        if (tip.target && !(tip.el && tip.el.contains(e.target))) hideTip();
        cancelPress();
        if (!target) return;
        if (e.pointerType === 'mouse') {
            clearTimeout(tip.hoverTimer);
            return; // col mouse il click e' l'azione, il tip e' dell'hover
        }
        tip.lastTouch = Date.now();
        const press = { el: target, id: e.pointerId, x: e.clientX, y: e.clientY, timer: 0 };
        press.timer = setTimeout(() => {
            if (tip.press !== press) return;
            tip.press = null;
            tip.swallow = target;
            showTip(target, 'long');
        }, LONG_MS);
        tip.press = press;
    }, true);

    document.addEventListener('pointermove', (e) => {
        const p = tip.press;
        if (!p || e.pointerId !== p.id) return;
        if (Math.abs(e.clientX - p.x) > MOVE_TOL || Math.abs(e.clientY - p.y) > MOVE_TOL) cancelPress();
    }, true);
    document.addEventListener('pointerup', cancelPress, true);
    document.addEventListener('pointercancel', cancelPress, true);

    /* dopo un tocco lungo il click (se il browser lo manda) non e' un'azione */
    document.addEventListener('click', (e) => {
        const s = tip.swallow;
        if (!s) return;
        tip.swallow = null;
        if (s.contains(e.target)) {
            e.preventDefault();
            e.stopImmediatePropagation();
        }
    }, true);

    /* niente menu contestuale / anteprima al dito sopra un pulsante col tip */
    document.addEventListener('contextmenu', (e) => {
        if (!tipTarget(e.target)) return;
        if (Date.now() - tip.lastTouch < 2000) e.preventDefault();
    }, true);

    document.addEventListener('pointerover', (e) => {
        if (e.pointerType !== 'mouse') return;
        const target = tipTarget(e.target);
        if (!target) return;
        if (tip.target === target) { clearTimeout(tip.hoverOut); return; }
        if (target.contains(e.relatedTarget)) return;
        clearTimeout(tip.hoverTimer);
        tip.hoverTimer = setTimeout(() => {
            if (target.isConnected && target.matches(':hover')) showTip(target, 'hover');
        }, HOVER_MS);
    }, true);

    document.addEventListener('pointerout', (e) => {
        if (e.pointerType !== 'mouse') return;
        const target = tipTarget(e.target);
        if (!target || target.contains(e.relatedTarget)) return;
        clearTimeout(tip.hoverTimer);
        if (tip.target === target && tip.via === 'hover') {
            if (tip.el && tip.el.contains(e.relatedTarget)) return;
            clearTimeout(tip.hoverOut);
            tip.hoverOut = setTimeout(hideTip, 150); // il tempo di passare sul popover
        }
    }, true);

    document.addEventListener('focusin', (e) => {
        const target = tipTarget(e.target);
        if (!target || target !== e.target) return;
        let visibile = false;
        try { visibile = target.matches(':focus-visible'); } catch (x) { visibile = false; }
        if (visibile) showTip(target, 'focus');
    }, true);

    document.addEventListener('focusout', (e) => {
        if (tip.target && tip.target === e.target && tip.via === 'focus') hideTip();
    }, true);

    document.addEventListener('keydown', (e) => {
        if ((e.key === 'Escape' || e.key === 'Esc') && tip.target) hideTip();
    }, true);

    window.addEventListener('scroll', () => { if (tip.target) hideTip(); }, { passive: true, capture: true });
    window.addEventListener('resize', () => { if (tip.target) hideTip(); });
    window.addEventListener('pagehide', () => { cancelPress(); hideTip(); });
}

/* ---------------- montaggio ---------------- */

/**
 * Monta l'aiuto di uno strumento. `slug` e' la cartella (`/<slug>/aiuto.js`)
 * e il nome della preferenza (`tt.<slug>.hint`). Difensivo: senza
 * `.tb-help`, senza `#tb-hint` o senza il modulo dei contenuti fa quel che
 * puo' e non lancia.
 */
export function mountAiuto({ slug, root = document } = {}) {
    mountTips();
    if (!slug || typeof document === 'undefined') return null;

    const url = '/' + slug + '/aiuto.js';
    let loading = null;
    let data = null;
    const load = () => {
        if (!loading) {
            loading = import(url).then((m) => {
                data = (m && m.default) || null;
                return data;
            }).catch((e) => {
                loading = null; // si riprova al prossimo tocco
                console.warn('[aiuto] contenuti non caricati:', url, e && e.message);
                return null;
            });
        }
        return loading;
    };

    /* 1. «Come funziona» */
    let parts = null;
    const isOpen = () => !!(parts && !parts.sheet.hidden);
    const buttons = [...root.querySelectorAll('.tb-help')];
    buttons.forEach((btn) => {
        btn.setAttribute('aria-haspopup', 'dialog');
        btn.setAttribute('aria-controls', SHEET_ID);
        btn.setAttribute('aria-expanded', 'false');
        btn.addEventListener('click', async () => {
            if (isOpen()) { closeSheet(); return; }
            btn.setAttribute('aria-busy', 'true');
            const d = await load();
            btn.removeAttribute('aria-busy');
            if (!d || !btn.isConnected) return;
            if (!parts || !parts.sheet.isConnected) parts = buildSheet();
            fillSheet(parts, d);
            hideTip();
            openSheet(parts.sheet, { anchor: btn });
        });
    });

    /* 2. riga del primo avvio */
    const box = root.querySelector('#tb-hint') || root.querySelector('.tb-hint');
    let hintOn = false;
    const dismiss = () => {
        const aveva = box.contains(document.activeElement);
        hintOn = false;
        box.hidden = true;
        prefs.set(slug, 'hint', true);
        /* il fuoco non resta su un pulsante sparito: va al «Come funziona» */
        if (aveva && buttons[0]) buttons[0].focus({ preventScroll: true });
    };
    if (box && !prefs.get(slug, 'hint', false)) {
        load().then((d) => {
            const text = hintDi(d);
            if (!text || prefs.get(slug, 'hint', false)) return;
            fillHint(box, text, dismiss);
            box.hidden = false;
            hintOn = true;
        });
    }

    /* cambio lingua: foglio aperto, riga e tip seguono */
    onChange(() => {
        if (data && parts) fillSheet(parts, data);
        if (data && hintOn && box) fillHint(box, hintDi(data), dismiss);
        if (tip.target && tip.el) {
            tip.el.textContent = t(tip.target.getAttribute('data-tip'));
            placeTip(tip.el, tip.target);
        }
    });

    return {
        open: () => (buttons[0] ? buttons[0].click() : undefined),
        close: () => { if (isOpen()) closeSheet(); }
    };
}
