// Tiny Temple Toolbox - dashboard: griglia di tile, modifica, riordino (spec 02 §4).
// ES module puro: nessun effetto all'import. Uso: mountDash() dopo init().
//
// CONTRATTO CON IL MARKUP (gia' pronto in index.html):
//   <button id="tb-edit" class="tb-edit" aria-pressed="false" data-i18n = dash-edit>
//   <ul id="tb-tiles" class="tb-tiles"></ul>            VUOTO: lo riempie dash.js
//   <div id="tb-dash-live" class="sr-only" aria-live="polite"></div>
//   <button id="tb-tile-add" class="tb-tile-add" hidden data-i18n-aria = dash-add>+</button>
//   <dialog id="tb-picker" class="tb-picker"> .tb-picker-close · #tb-picker-groups (vuoto)
//                          · .tb-picker-empty[hidden] · .tb-picker-reset </dialog>
//   Icone: sprite di pagina <symbol id="tb-icon-<slug>"> (vedi shared/nav.js toolIcon()).
//
// Generato in #tb-tiles, un <li> per strumento visibile, nell'ordine salvato:
//   <li data-slug="<slug>">
//     <a class="tb-tile" href="/<slug>">                              -- status 'live'
//       <span class="tb-tile-icon"><svg><use href="#tb-icon-<slug>"></use></svg></span>
//       <span class="tb-tile-name" data-i18n = tool-<slug>></span></a>
//     <div class="tb-tile is-soon" aria-disabled="true">              -- status 'soon'
//       ...stessa struttura... + <span class="sr-only" data-i18n = pill-soon></span></div>
//     <button type="button" class="tb-tile-remove" hidden
//             data-i18n-aria = dash-remove-aria data-i18n-tool = tool-<slug>>&minus;</button>
//   Il "-" sta nel <li> (non dentro <a>: sarebbe HTML non valido); dash.js mette
//   `position: relative` sul <li>, ma in CSS va bene aggiungere `.tb-tiles > li { position: relative }`.
// Generato in #tb-picker-groups: section.tb-picker-group > span.tb-menu-eyebrow[data-i18n = fam-<id>]
//   + ul.tb-picker-list > li > button.tb-picker-item[data-slug] (icona + span[data-i18n = tool-<slug>]).
//
// CONTRATTO CSS (components.css): in modifica <html> ha la classe `tb-dash-editing`
//   (i "-" sono anche [hidden] fuori dalla modifica, quindi il CSS non e' obbligatorio).
//   Durante il trascinamento il <li> ha la classe `is-dragging` (dash.js imposta da se'
//   transform/z-index/touch-action); il tile "preso" da tastiera ha `is-moving` sul <li>.
//
// PERSISTENZA (storage.prefs, localStorage):
//   prefs 'dash'/'order'  = [slug...] ordine completo (anche dei nascosti)
//   prefs 'dash'/'hidden' = [slug...] tolti dalla griglia (stanno nel picker)
//   Uno strumento nuovo in tools.js si accoda da solo, anche su dashboard personalizzata.
//
// CHIAVI i18n USATE QUI: dash-edit, dash-done, dash-add, dash-remove-aria,
//   dash-move-aria, dash-moved, picker-title, picker-empty, picker-reset,
//   pill-soon, fam-<id>, tool-<slug>.

import { t, apply } from './i18n.js';
import { TOOLS, FAMILIES } from './tools.js';
import { prefs } from './storage.js';
import { toolIcon } from './nav.js';

const AREA = 'dash';
const DRAG_THRESHOLD = 6; // px: sotto questa soglia e' un tocco, non un trascinamento

let mounted = false;

const bySlug = (slug) => TOOLS.find((tool) => tool.slug === slug) || null;

/* ---------- modello ---------- */

function readOrder() {
    const known = TOOLS.map((tool) => tool.slug);
    const stored = prefs.get(AREA, 'order', null);
    const order = Array.isArray(stored) ? stored.filter((s) => known.includes(s)) : [];
    known.forEach((s) => { if (!order.includes(s)) order.push(s); }); // criterio 7: i nuovi in coda
    return order;
}

function readHidden() {
    const stored = prefs.get(AREA, 'hidden', []);
    const known = TOOLS.map((tool) => tool.slug);
    return Array.isArray(stored) ? stored.filter((s) => known.includes(s)) : [];
}

export function mountDash() {
    if (mounted) return null;
    const grid = document.getElementById('tb-tiles');
    if (!grid) return null;
    mounted = true;

    const editBtn = document.getElementById('tb-edit');
    const addBtn = document.getElementById('tb-tile-add');
    const live = document.getElementById('tb-dash-live');
    const picker = document.getElementById('tb-picker');
    const pickerGroups = picker ? picker.querySelector('#tb-picker-groups, .tb-picker-groups') : null;
    const pickerEmpty = picker ? picker.querySelector('.tb-picker-empty') : null;

    let order = readOrder();
    let hidden = readHidden();
    let editing = false;
    let moving = null; // <li> "preso" da tastiera

    const visible = () => order.filter((s) => !hidden.includes(s));
    const save = () => {
        prefs.set(AREA, 'order', order);
        prefs.set(AREA, 'hidden', hidden);
    };
    const say = (key, vars) => { if (live) live.textContent = t(key, vars); };

    /* ---------- render ---------- */

    function tileNode(tool) {
        const li = document.createElement('li');
        li.setAttribute('data-slug', tool.slug);
        li.style.setProperty('position', 'relative'); // aggancio del "-"

        const live_ = tool.status === 'live';
        const tile = document.createElement(live_ ? 'a' : 'div');
        tile.className = live_ ? 'tb-tile' : 'tb-tile is-soon';
        if (live_) tile.setAttribute('href', '/' + tool.slug);
        else tile.setAttribute('aria-disabled', 'true');

        const icon = document.createElement('span');
        icon.className = 'tb-tile-icon';
        icon.appendChild(toolIcon(tool.slug));
        const name = document.createElement('span');
        name.className = 'tb-tile-name';
        name.setAttribute('data-i18n', tool.key);
        tile.append(icon, name);
        if (!live_) {
            const sr = document.createElement('span');
            sr.className = 'sr-only';
            sr.setAttribute('data-i18n', 'pill-soon');
            tile.appendChild(sr);
        }

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'tb-tile-remove';
        remove.hidden = !editing;
        remove.setAttribute('data-i18n-aria', 'dash-remove-aria');
        remove.setAttribute('data-i18n-tool', tool.key);
        remove.textContent = '−';

        li.append(tile, remove);
        applyEditState(li);
        return li;
    }

    /* in modifica il tile non apre lo strumento: si sposta */
    function applyEditState(li) {
        const tile = li.querySelector('.tb-tile');
        const remove = li.querySelector('.tb-tile-remove');
        const tool = bySlug(li.getAttribute('data-slug'));
        if (remove) remove.hidden = !editing;
        if (!tile) return;
        li.style.setProperty('touch-action', editing ? 'none' : ''); // il dito trascina, non scrolla
        if (editing) {
            tile.setAttribute('tabindex', '0');
            tile.setAttribute('data-i18n-aria', 'dash-move-aria');
            if (tool) tile.setAttribute('data-i18n-tool', tool.key);
            tile.setAttribute('aria-label', t('dash-move-aria', { tool: tool ? t(tool.key) : '' }));
            if (tile.tagName === 'A') tile.setAttribute('aria-disabled', 'true');
        } else {
            tile.removeAttribute('data-i18n-aria');
            tile.removeAttribute('data-i18n-tool');
            tile.removeAttribute('aria-label');
            if (tile.tagName === 'A') {
                tile.removeAttribute('tabindex');
                tile.removeAttribute('aria-disabled');
            } else {
                tile.setAttribute('tabindex', '-1');
                tile.setAttribute('aria-disabled', 'true');
            }
        }
    }

    function render() {
        grid.textContent = '';
        visible().forEach((slug) => {
            const tool = bySlug(slug);
            if (tool) grid.appendChild(tileNode(tool));
        });
        apply(grid);
    }

    /* ---------- modifica ---------- */

    function setEditing(on) {
        editing = !!on;
        document.documentElement.classList.toggle('tb-dash-editing', editing);
        if (editBtn) {
            editBtn.setAttribute('aria-pressed', editing ? 'true' : 'false');
            const key = editing ? 'dash-done' : 'dash-edit';
            editBtn.setAttribute('data-i18n', key);
            editBtn.textContent = t(key);
        }
        if (addBtn) addBtn.hidden = !editing;
        if (!editing) drop(false);
        [...grid.children].forEach(applyEditState);
    }

    if (editBtn) editBtn.addEventListener('click', () => setEditing(!editing));

    grid.addEventListener('click', (e) => {
        const remove = e.target.closest ? e.target.closest('.tb-tile-remove') : null;
        if (remove) {
            e.preventDefault();
            const li = remove.closest('li');
            const slug = li.getAttribute('data-slug');
            if (!hidden.includes(slug)) hidden.push(slug);
            save();
            render();
            const tool = bySlug(slug);
            say('dash-remove-aria', { tool: tool ? t(tool.key) : slug });
            return;
        }
        if (!editing) return;
        const tile = e.target.closest ? e.target.closest('.tb-tile') : null;
        if (tile) e.preventDefault(); // in modifica non si naviga
    });

    /* ---------- riordino: modello ---------- */

    function domOrder() {
        return [...grid.children].map((li) => li.getAttribute('data-slug'));
    }

    /* l'ordine salvato contiene anche i nascosti: si riscrive solo la parte visibile */
    function commitDom() {
        const seq = domOrder();
        let i = 0;
        order = order.map((slug) => (hidden.includes(slug) ? slug : seq[i++]));
        save();
    }

    function moveTo(li, index) {
        const items = [...grid.children];
        const from = items.indexOf(li);
        const to = Math.max(0, Math.min(items.length - 1, index));
        if (to === from) return;
        /* rest = la griglia senza li: basta inserirlo davanti a chi occupera' `to` */
        const ref = items.filter((n) => n !== li)[to];
        if (ref) grid.insertBefore(li, ref);
        else grid.appendChild(li);
        commitDom();
        const tool = bySlug(li.getAttribute('data-slug'));
        say('dash-moved', { tool: tool ? t(tool.key) : '', n: [...grid.children].indexOf(li) + 1 });
    }

    /* ---------- riordino col dito (pointer events) ---------- */

    let drag = null;

    function tilesUnder(x, y, self) {
        self.style.setProperty('pointer-events', 'none');
        const node = document.elementFromPoint ? document.elementFromPoint(x, y) : null;
        self.style.removeProperty('pointer-events');
        const li = node && node.closest ? node.closest('li') : null;
        return li && li.parentElement === grid && li !== self ? li : null;
    }

    grid.addEventListener('pointerdown', (e) => {
        if (!editing || e.button !== 0) return;
        if (e.target.closest && e.target.closest('.tb-tile-remove')) return;
        const li = e.target.closest ? e.target.closest('li') : null;
        if (!li || li.parentElement !== grid) return;
        drag = { li, id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, active: false };
    });

    grid.addEventListener('pointermove', (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        const dx = e.clientX - drag.x0;
        const dy = e.clientY - drag.y0;
        if (!drag.active) {
            if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
            drag.active = true;
            drag.li.classList.add('is-dragging');
            drag.li.style.setProperty('z-index', '5');
            if (drag.li.setPointerCapture) {
                try { drag.li.setPointerCapture(e.pointerId); } catch (err) { /* niente capture */ }
            }
        }
        e.preventDefault();
        drag.li.style.setProperty('transform', 'translate(' + dx + 'px,' + dy + 'px)');
        const over = tilesUnder(e.clientX, e.clientY, drag.li);
        if (!over) return;
        const before = drag.li.getBoundingClientRect();
        const items = [...grid.children];
        if (items.indexOf(over) > items.indexOf(drag.li)) grid.insertBefore(drag.li, over.nextSibling);
        else grid.insertBefore(drag.li, over);
        /* il tile deve restare sotto il dito: si corregge l'origine dello spostamento */
        drag.li.style.setProperty('transform', 'translate(0px,0px)');
        const after = drag.li.getBoundingClientRect();
        drag.x0 += after.left - before.left;
        drag.y0 += after.top - before.top;
        drag.li.style.setProperty('transform',
            'translate(' + (e.clientX - drag.x0) + 'px,' + (e.clientY - drag.y0) + 'px)');
    });

    function endDrag() {
        if (!drag) return;
        const { li, active } = drag;
        drag = null;
        li.classList.remove('is-dragging');
        li.style.removeProperty('transform');
        li.style.removeProperty('z-index');
        if (!active) return;
        commitDom();
        const tool = bySlug(li.getAttribute('data-slug'));
        say('dash-moved', { tool: tool ? t(tool.key) : '', n: [...grid.children].indexOf(li) + 1 });
    }

    ['pointerup', 'pointercancel'].forEach((ev) => grid.addEventListener(ev, endDrag));

    /* ---------- riordino da tastiera ---------- */

    function columns() {
        const items = [...grid.children];
        if (items.length < 2) return 1;
        const top = items[0].offsetTop;
        let n = 0;
        while (n < items.length && items[n].offsetTop === top) n++;
        return Math.max(1, n);
    }

    function take(li) {
        moving = li;
        li.classList.add('is-moving');
        const tile = li.querySelector('.tb-tile');
        if (tile) tile.setAttribute('aria-grabbed', 'true');
        const tool = bySlug(li.getAttribute('data-slug'));
        say('dash-moved', { tool: tool ? t(tool.key) : '', n: [...grid.children].indexOf(li) + 1 });
    }

    function drop(keepFocus = true) {
        if (!moving) return;
        const li = moving;
        moving = null;
        li.classList.remove('is-moving');
        const tile = li.querySelector('.tb-tile');
        if (tile) {
            tile.removeAttribute('aria-grabbed');
            if (keepFocus) tile.focus({ preventScroll: true });
        }
    }

    grid.addEventListener('keydown', (e) => {
        if (!editing) return;
        const li = e.target.closest ? e.target.closest('li') : null;
        if (!li || li.parentElement !== grid) return;
        const items = [...grid.children];
        const i = items.indexOf(li);
        const cols = columns();
        const focusAt = (n) => {
            const next = [...grid.children][Math.max(0, Math.min(grid.children.length - 1, n))];
            const tile = next && next.querySelector('.tb-tile');
            if (tile) tile.focus({ preventScroll: true });
        };

        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            if (moving === li) drop();
            else { drop(); take(li); }
            return;
        }
        if (e.key === 'Escape' || e.key === 'Esc') {
            if (!moving) return;
            e.preventDefault();
            drop();
            return;
        }
        let target = null;
        if (e.key === 'ArrowLeft') target = i - 1;
        else if (e.key === 'ArrowRight') target = i + 1;
        else if (e.key === 'ArrowUp') target = i - cols;
        else if (e.key === 'ArrowDown') target = i + cols;
        else if (e.key === 'Home') target = 0;
        else if (e.key === 'End') target = items.length - 1;
        if (target === null) return;
        e.preventDefault();
        if (moving === li) {
            moveTo(li, target);
            const tile = li.querySelector('.tb-tile');
            if (tile) tile.focus({ preventScroll: true });
        } else {
            focusAt(target);
        }
    });

    /* ---------- picker ---------- */

    function fillPicker() {
        if (!pickerGroups) return;
        pickerGroups.textContent = '';
        let any = false;
        FAMILIES.forEach((fam) => {
            const items = TOOLS.filter((tool) => tool.family === fam.id && hidden.includes(tool.slug));
            if (!items.length) return;
            any = true;
            const section = document.createElement('section');
            section.className = 'tb-picker-group';
            const eyebrow = document.createElement('span');
            eyebrow.className = 'tb-menu-eyebrow';
            eyebrow.setAttribute('data-i18n', fam.key);
            const list = document.createElement('ul');
            list.className = 'tb-picker-list';
            items.forEach((tool) => {
                const li = document.createElement('li');
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'tb-picker-item';
                btn.setAttribute('data-slug', tool.slug);
                const name = document.createElement('span');
                name.setAttribute('data-i18n', tool.key);
                btn.append(toolIcon(tool.slug), name);
                li.appendChild(btn);
                list.appendChild(li);
            });
            section.append(eyebrow, list);
            pickerGroups.appendChild(section);
        });
        if (pickerEmpty) pickerEmpty.hidden = any;
        apply(pickerGroups);
    }

    function openPicker() {
        if (!picker) return;
        fillPicker();
        if (typeof picker.showModal === 'function') picker.showModal();
        else picker.setAttribute('open', '');
    }

    function closePicker() {
        if (!picker) return;
        if (typeof picker.close === 'function') picker.close();
        else picker.removeAttribute('open');
    }

    if (addBtn) addBtn.addEventListener('click', openPicker);

    if (picker) {
        picker.addEventListener('click', (e) => {
            if (e.target === picker) { closePicker(); return; } // tocco fuori dal contenuto
            const close = e.target.closest ? e.target.closest('.tb-picker-close') : null;
            if (close) { closePicker(); return; }
            const reset = e.target.closest ? e.target.closest('.tb-picker-reset') : null;
            if (reset) {
                prefs.set(AREA, 'order', undefined);
                prefs.set(AREA, 'hidden', undefined);
                order = readOrder();
                hidden = readHidden();
                render();
                closePicker();
                return;
            }
            const item = e.target.closest ? e.target.closest('.tb-picker-item') : null;
            if (!item) return;
            const slug = item.getAttribute('data-slug');
            hidden = hidden.filter((s) => s !== slug);
            order = order.filter((s) => s !== slug).concat(slug); // riaggiunto in coda
            save();
            render();
            const tool = bySlug(slug);
            say('dash-moved', { tool: tool ? t(tool.key) : slug, n: visible().length });
            fillPicker();
            if (!hidden.length) closePicker();
        });
    }

    render();
    setEditing(false);

    return {
        render,
        setEditing,
        isEditing: () => editing,
        order: () => visible()
    };
}
