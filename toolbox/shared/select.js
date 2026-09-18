/**
 * Tiny Temple Toolbox - select a pillola (spec 03 §2).
 *
 * Nessuna tendina nativa a video: il markup ha un <select> vero (il
 * valore, e il ripiego se il JS non parte) piu' una pillola e un pannello
 * role="listbox" gia' pronti; qui si accende il tutto.
 *
 * Markup atteso (contratto in components.css):
 *   .tb-select[data-value] > select.tb-select-native
 *     + button.tb-select-trigger[aria-haspopup=listbox][aria-expanded][aria-controls]
 *         (> .tb-select-label, .tb-select-value, .tb-select-chevron)
 *     + .tb-select-panel[role=listbox][hidden] > button.tb-select-option[role=option][data-value]
 *
 * Tastiera: sul trigger Invio/Spazio/frecce aprono; nel pannello frecce,
 * Home, End e le lettere spostano l'opzione attiva (.is-active +
 * aria-activedescendant), Invio o click scelgono, Esc o un tocco fuori
 * chiudono; il fuoco torna sempre al trigger. Il <select> nativo resta
 * sincronizzato e riceve un evento `change` come se l'avesse cambiato
 * l'utente: chi ascolta il select non cambia una riga.
 *
 * mountSelect(el) -> { open, close, value, set } | null
 * mountSelects(root) monta tutti i .tb-select trovati.
 */

const PANEL_GAP = 6;        // px fra pillola e pannello
const TYPE_RESET_MS = 800;  // pausa dopo cui le lettere ricominciano
const SHEET_MAX = 480;      // sotto questa larghezza il pannello e' un foglio

const mounted = new WeakSet();

function optionsOf(panel) {
    return [...panel.querySelectorAll('.tb-select-option')];
}

function labelOf(option) {
    const span = option.querySelector('span');
    return (span ? span.textContent : option.textContent).trim();
}

export function mountSelect(el) {
    if (!el || mounted.has(el)) return null;
    const native = el.querySelector('.tb-select-native');
    const trigger = el.querySelector('.tb-select-trigger');
    const panel = el.querySelector('.tb-select-panel');
    const valueOut = el.querySelector('.tb-select-value');
    if (!native || !trigger || !panel) return null;
    mounted.add(el);

    const options = optionsOf(panel);
    options.forEach((o, i) => {
        if (!o.id) o.id = (panel.id || 'tb-select') + '-opt-' + i;
        o.setAttribute('tabindex', '-1');
    });

    let open = false;
    let activeIndex = Math.max(0, options.findIndex((o) => o.getAttribute('data-value') === native.value));
    let typed = '';
    let typedAt = 0;

    el.classList.add('is-enhanced'); // il CSS nasconde il nativo solo ora
    native.classList.add('sr-only');
    native.setAttribute('tabindex', '-1');
    native.setAttribute('aria-hidden', 'true');

    const isSheet = () => typeof window.matchMedia === 'function'
        && window.matchMedia('(max-width: ' + SHEET_MAX + 'px)').matches;

    function setActive(i) {
        if (!options.length) return;
        activeIndex = Math.max(0, Math.min(options.length - 1, i));
        options.forEach((o, k) => o.classList.toggle('is-active', k === activeIndex));
        const cur = options[activeIndex];
        panel.setAttribute('aria-activedescendant', cur.id);
        if (typeof cur.scrollIntoView === 'function' && open) {
            cur.scrollIntoView({ block: 'nearest' });
        }
    }

    /** Scrive il valore ovunque: nativo, pillola, opzioni, contenitore. */
    function set(value, { silent = false } = {}) {
        const option = options.find((o) => o.getAttribute('data-value') === value);
        if (!option) return false;
        const changed = native.value !== value;
        native.value = value;
        el.setAttribute('data-value', value);
        options.forEach((o) => o.setAttribute('aria-selected', o === option ? 'true' : 'false'));
        if (valueOut) {
            valueOut.textContent = labelOf(option);
            const key = option.querySelector('[data-i18n]');
            if (key) valueOut.setAttribute('data-i18n', key.getAttribute('data-i18n'));
        }
        setActive(options.indexOf(option));
        if (changed && !silent) {
            /* l'evento va creato nella finestra del documento (non in quella
               globale): altrimenti fuori dal browser non e' lo stesso tipo */
            const view = native.ownerDocument && native.ownerDocument.defaultView;
            const Ctor = (view && view.Event) || Event;
            native.dispatchEvent(new Ctor('change', { bubbles: true }));
        }
        return true;
    }

    /* il pannello sta sotto la pillola; se sotto non ci sta, sopra */
    function place() {
        panel.classList.toggle('tb-sheet', isSheet());
        panel.classList.remove('is-above');
        if (isSheet()) return;
        const rect = trigger.getBoundingClientRect ? trigger.getBoundingClientRect() : null;
        if (!rect) return;
        const height = panel.offsetHeight || 0;
        const below = window.innerHeight - rect.bottom;
        if (below < height + PANEL_GAP && rect.top > below) panel.classList.add('is-above');
    }

    function openPanel({ toEnd = false } = {}) {
        if (open) return;
        open = true;
        panel.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
        el.classList.add('is-open');
        place();
        /* in versione foglio il CSS lo tiene fuori schermo (translateY(100%))
           finche' non ha .is-open: senza questa classe su telefono il
           pannello restava invisibile e sembrava che non si aprisse */
        void panel.offsetWidth;
        panel.classList.add('is-open');
        setActive(toEnd ? options.length - 1
            : Math.max(0, options.findIndex((o) => o.getAttribute('data-value') === native.value)));
        const cur = options[activeIndex];
        if (cur) cur.focus({ preventScroll: true });
        document.addEventListener('pointerdown', onOutside, true);
    }

    function closePanel({ restoreFocus = true } = {}) {
        if (!open) return;
        open = false;
        panel.hidden = true;
        panel.classList.remove('is-open');
        panel.removeAttribute('aria-activedescendant');
        trigger.setAttribute('aria-expanded', 'false');
        el.classList.remove('is-open');
        document.removeEventListener('pointerdown', onOutside, true);
        if (restoreFocus) trigger.focus({ preventScroll: true });
    }

    function onOutside(e) {
        if (el.contains(e.target)) return;
        closePanel({ restoreFocus: false });
    }

    function choose(i) {
        const option = options[i];
        if (!option) return;
        set(option.getAttribute('data-value'));
        closePanel();
    }

    function typeAhead(key) {
        const now = Date.now();
        typed = now - typedAt > TYPE_RESET_MS ? key : typed + key;
        typedAt = now;
        const from = typed.length === 1 ? activeIndex + 1 : activeIndex;
        for (let k = 0; k < options.length; k++) {
            const i = (from + k) % options.length;
            if (labelOf(options[i]).toLowerCase().startsWith(typed.toLowerCase())) {
                setActive(i);
                if (!open) choose(i);
                return;
            }
        }
    }

    trigger.addEventListener('click', () => {
        if (open) closePanel();
        else openPanel();
    });

    trigger.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            openPanel();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault();
            openPanel({ toEnd: true });
        } else if (e.key.length === 1 && /\S/.test(e.key)) {
            typeAhead(e.key);
        }
    });

    panel.addEventListener('click', (e) => {
        const option = e.target.closest('.tb-select-option');
        if (option) choose(options.indexOf(option));
    });

    panel.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); closePanel(); return; }
        if (e.key === 'Tab') { closePanel(); return; }
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            choose(activeIndex);
            return;
        }
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(activeIndex + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(activeIndex - 1); }
        else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
        else if (e.key === 'End') { e.preventDefault(); setActive(options.length - 1); }
        else if (e.key.length === 1 && /\S/.test(e.key)) { typeAhead(e.key); }
        else return;
        const cur = options[activeIndex];
        if (cur) cur.focus({ preventScroll: true });
    });

    /* qualcun altro (o il ripiego senza JS) cambia il nativo: si allinea */
    native.addEventListener('change', () => set(native.value, { silent: true }));

    set(native.value, { silent: true });

    return {
        el,
        open: () => openPanel(),
        close: () => closePanel({ restoreFocus: false }),
        isOpen: () => open,
        value: () => native.value,
        set: (v) => set(v)
    };
}

/** Monta tutti i .tb-select presenti (idempotente). */
export function mountSelects(root = document) {
    return [...root.querySelectorAll('.tb-select')].map(mountSelect).filter(Boolean);
}
