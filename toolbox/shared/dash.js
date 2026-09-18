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
//   In modifica il <li> riceve anche la maniglia (spec 03 §5), prima del tile:
//     <button type="button" class="tb-tile-grip" tabindex="-1" aria-hidden="true">
//       <svg aria-hidden="true"><use href="#tb-icon-grip"></use></svg></button>
//   Il trascinamento col dito parte SOLO dalla maniglia (touch-action: none in
//   CSS); il resto del <li> resta `pan-y`, cosi' la pagina scorre. Da tastiera
//   non cambia nulla: il fuoco resta sul tile.
// Generato in #tb-picker-groups: section.tb-picker-group > span.tb-menu-eyebrow[data-i18n = fam-<id>]
//   + ul.tb-picker-list > li > button.tb-picker-item[data-slug] (icona + span[data-i18n = tool-<slug>]).
//
// CONTRATTO CSS (components.css): in modifica <html> ha la classe `tb-dash-editing`
//   (i "-" sono anche [hidden] fuori dalla modifica, quindi il CSS non e' obbligatorio).
//   Durante il trascinamento il <li> ha `is-dragging` (dash.js imposta transform e
//   z-index) e le tile che si spostano hanno `is-moving`, che in CSS porta la
//   transizione del FLIP: `.tb-tiles > li.is-moving { transition: transform 180ms }`.
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

/* icona dallo sprite di pagina, come toolIcon ma per le icone di servizio */
const icon_ = (id) => toolIcon(id.replace(/^tb-icon-/, ''));

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

        const grip = document.createElement('button');
        grip.type = 'button';
        grip.className = 'tb-tile-grip';
        grip.tabIndex = -1;
        grip.setAttribute('aria-hidden', 'true');
        grip.hidden = !editing;
        grip.appendChild(icon_('tb-icon-grip'));

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'tb-tile-remove';
        remove.hidden = !editing;
        remove.setAttribute('data-i18n-aria', 'dash-remove-aria');
        remove.setAttribute('data-i18n-tool', tool.key);
        remove.appendChild(icon_('tb-icon-minus'));

        li.append(grip, tile, remove);
        applyEditState(li);
        return li;
    }

    /* in modifica il tile non apre lo strumento: si sposta */
    function applyEditState(li) {
        const tile = li.querySelector('.tb-tile');
        const remove = li.querySelector('.tb-tile-remove');
        const grip = li.querySelector('.tb-tile-grip');
        const tool = bySlug(li.getAttribute('data-slug'));
        if (remove) remove.hidden = !editing;
        if (grip) grip.hidden = !editing;
        if (!tile) return;
        /* il dito sul tile scorre la pagina: si trascina solo dalla maniglia */
        li.style.setProperty('touch-action', 'pan-y');
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

    /* ---------- riordino col dito (pointer events + FLIP) ----------
       La tile trascinata segue il dito con `transform: translate`; le altre
       si spostano con una transizione FLIP (si misura dove stavano, si
       riordina il DOM, si riparte dalla posizione vecchia e si lascia
       animare). Il DOM si riordina solo quando il puntatore supera la meta'
       della tile vicina: senza questa isteresi le tile ballano. Durante il
       trascinamento non si ri-disegna nulla. */

    const FLIP_MS = 180;
    let drag = null;

    const reducedMotion = () => typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /** Tile su cui il puntatore e' entrato oltre la meta': quella da scavalcare. */
    function crossedTile(x, y) {
        const items = [...grid.children];
        const self = items.indexOf(drag.li);
        for (let k = 0; k < items.length; k++) {
            const other = items[k];
            if (other === drag.li) continue;
            const r = other.getBoundingClientRect();
            if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            const after = k > self;
            const dragRect = drag.li.getBoundingClientRect();
            const sameRow = Math.abs(r.top - dragRect.top) < r.height / 2;
            /* >= e <=: fermarsi ESATTAMENTE sul centro conta come superato,
               altrimenti un dito preciso resta a meta' senza riordinare */
            const passed = sameRow ? (after ? x >= cx : x <= cx) : (after ? y >= cy : y <= cy);
            if (passed) return { other, after };
        }
        return null;
    }

    /** Sposta il nodo e anima le altre tile dalla vecchia posizione alla nuova. */
    function flipTo(other, after) {
        const items = [...grid.children];
        const before = new Map(items.map((n) => [n, n.getBoundingClientRect()]));
        if (after) grid.insertBefore(drag.li, other.nextSibling);
        else grid.insertBefore(drag.li, other);
        const animate = !reducedMotion();
        items.forEach((n) => {
            if (n === drag.li) return;
            const was = before.get(n);
            const now = n.getBoundingClientRect();
            const dx = was.left - now.left;
            const dy = was.top - now.top;
            if (!dx && !dy) return;
            /* FLIP: si rimette la tile dov'era (senza transizione), si forza
               il calcolo dello stile e solo dopo si toglie lo spostamento:
               cosi' il browser ha due stati diversi da interpolare. Con il
               solo requestAnimationFrame i due valori finivano nello stesso
               frame e il salto era istantaneo. */
            n.classList.remove('is-moving');
            n.style.setProperty('transition', 'none');
            n.style.setProperty('transform', 'translate(' + dx + 'px,' + dy + 'px)');
            void n.offsetWidth; // reflow: fissa la posizione di partenza
            if (!animate) {
                n.style.removeProperty('transition');
                n.style.removeProperty('transform');
                return;
            }
            n.classList.add('is-moving'); // la transizione sta nel CSS
            n.style.removeProperty('transition');
            n.style.setProperty('transform', 'translate(0px,0px)');
            const done = (e) => {
                if (e && e.target !== n) return;
                n.removeEventListener('transitionend', done);
                n.classList.remove('is-moving');
                n.style.removeProperty('transform');
            };
            n.addEventListener('transitionend', done);
        });
        /* la tile trascinata non deve saltare: si sposta l'origine del dito */
        const was = before.get(drag.li);
        const now = drag.li.getBoundingClientRect();
        drag.x0 += now.left - was.left;
        drag.y0 += now.top - was.top;
    }

    /** Ripulisce le tile ferme; a quelle che stanno ancora scivolando si
        lascia finire la transizione (ci pensa il loro `transitionend`,
        piu' una rete di sicurezza col tempo del FLIP). */
    function settleFlip(li) {
        [...grid.children].forEach((n) => {
            if (n === li) return;
            if (!n.classList.contains('is-moving')) {
                n.style.removeProperty('transition');
                n.style.removeProperty('transform');
                return;
            }
            setTimeout(() => {
                if (!n.classList.contains('is-moving')) return;
                n.classList.remove('is-moving');
                n.style.removeProperty('transform');
            }, FLIP_MS + 120);
        });
    }

    grid.addEventListener('pointerdown', (e) => {
        if (!editing || e.button !== 0) return;
        if (e.target.closest && e.target.closest('.tb-tile-remove')) return;
        /* spec 03 §5: solo la maniglia trascina */
        const grip = e.target.closest && e.target.closest('.tb-tile-grip');
        if (!grip) return;
        const li = grip.closest('li');
        if (!li || li.parentElement !== grid) return;
        drag = { li, grip, id: e.pointerId, x0: e.clientX, y0: e.clientY, active: false };
        if (grip.setPointerCapture) {
            try { grip.setPointerCapture(e.pointerId); } catch (err) { /* niente capture */ }
        }
        e.preventDefault(); // niente selezione del testo, niente scroll
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
            drag.li.style.setProperty('transition', 'none'); // segue il dito, non insegue
        }
        e.preventDefault();
        drag.li.style.setProperty('transform', 'translate(' + dx + 'px,' + dy + 'px)');
        const hit = crossedTile(e.clientX, e.clientY);
        if (!hit) return;
        flipTo(hit.other, hit.after);
        drag.li.style.setProperty('transform',
            'translate(' + (e.clientX - drag.x0) + 'px,' + (e.clientY - drag.y0) + 'px)');
    });

    function finishDrag(li) {
        li.classList.remove('is-dragging');
        li.classList.remove('is-moving');
        li.style.removeProperty('transform');
        li.style.removeProperty('transition');
        li.style.removeProperty('z-index');
    }

    function endDrag(e) {
        if (!drag) return;
        if (e && e.pointerId !== undefined && e.pointerId !== drag.id) return;
        const { li, active } = drag;
        drag = null;
        settleFlip(li);
        if (!active) { finishDrag(li); return; }
        /* rilascio: la tile scivola nel suo posto invece di saltarci */
        if (reducedMotion()) {
            finishDrag(li);
        } else {
            void li.offsetWidth; // la posizione attuale e' il punto di partenza
            li.classList.add('is-moving');
            li.style.removeProperty('transition');
            li.style.setProperty('transform', 'translate(0px,0px)');
            const done = () => {
                li.removeEventListener('transitionend', done);
                finishDrag(li);
            };
            li.addEventListener('transitionend', done);
            setTimeout(done, FLIP_MS + 120); // ripiego se la transizione non parte
        }
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
