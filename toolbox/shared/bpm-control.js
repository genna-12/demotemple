/**
 * Tiny Temple Toolbox - rotella BPM (spec 12 §4, estratta dal metronomo).
 *
 * E' la rotella 3D del metronomo, resa riusabile A PARAMETRI: stesse
 * regole (1 BPM ogni 8 px, inerzia esponenziale che si ferma entro 1 s e
 * si aggancia all'intero, rotella del mouse ±1, bordi ±1, frecce,
 * PagSu/PagGiu, Inizio/Fine, campo numerico al tocco sul valore).
 * Chi la usa passa i propri elementi e le proprie classi: il metronomo
 * resta con `met-tick`/`is-major`/`is-dragging` e il suo CSS, il
 * calcolatore usa `tb-tick` e il blocco `.tb-wheel*`.
 *
 * TUTTA la rotella trascina (spec 18 §7.6, audit §2.1). I due <button>
 * invisibili ai bordi non ci sono piu': con un dito (raggio 12 px)
 * l'aggiustamento del bersaglio di Chromium li agganciava molto oltre i
 * loro 44 px e circa il 40 % della rotella non rispondeva. Ora i bordi
 * sono solo ZONE misurate qui (`edgePx` per lato) e contano solo a dito
 * FERMO: tap nella zona = ±1, tap sul valore = editor numerico, tutto il
 * resto - valore compreso - fa partire il trascinamento.
 *
 * createBpmControl({
 *   wheel, drum, readout, input,        elementi (drum: dove nascono le tacche)
 *   min, max, value,                    limiti e valore iniziale
 *   ticks, tickPx, pxPerBpm,            quante tacche per lato e quanto distano
 *   edgePx,                             larghezza delle zone ±1 ai due bordi
 *   classes: { tick, major, dragging },
 *   onChange(value, { fromWheel }),     un solo punto di verita' per chi usa
 *   onEditKeydown(e)                    tasti nel campo numerico (facoltativo)
 * }) -> { value, set, openEditor, closeEditor, refresh, destroy }
 */

const DEFAULTS = {
    min: 30,
    max: 300,
    value: 120,
    ticks: 12,
    tickPx: 26,
    pxPerBpm: 8,
    edgePx: 44,
    classes: { tick: 'tb-tick', major: 'is-major', dragging: 'is-dragging' }
};
const INERTIA_K = 5;      // decelerazione esponenziale: ferma entro 1 s
const INERTIA_MIN = 0.6;  // BPM/s sotto cui si aggancia all'intero
const TAP_PX = 6;         // sotto questo spostamento il dito e' fermo: e' un tap

const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

function reducedMotion() {
    return typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function createBpmControl(options = {}) {
    const cfg = Object.assign({}, DEFAULTS, options);
    cfg.classes = Object.assign({}, DEFAULTS.classes, options.classes || {});
    const { wheel, readout, input } = cfg;
    const drum = cfg.drum || (wheel ? wheel.querySelector('.tb-wheel-drum, .met-wheel-drum') : null);
    const { min, max, ticks: span, tickPx, pxPerBpm } = cfg;

    const clamp = (v) => Math.min(max, Math.max(min, Math.round(Number(v) || min)));

    let value = clamp(cfg.value);
    let wheelValue = value;     // valore continuo mentre si trascina
    let inertia = null;
    let editCancelled = false;
    const tickEls = [];
    const listeners = [];

    const on = (target, type, fn, opts) => {
        if (!target) return;
        target.addEventListener(type, fn, opts);
        listeners.push([target, type, fn, opts]);
    };

    /* ---------- tacche ---------- */

    function buildTicks() {
        if (!drum) return;
        drum.textContent = '';
        tickEls.length = 0;
        for (let i = -span; i <= span; i++) {
            const el = document.createElement('span');
            el.className = cfg.classes.tick;
            drum.appendChild(el);
            tickEls.push(el);
        }
    }

    function renderWheel() {
        if (!tickEls.length) return;
        const base = Math.round(wheelValue);
        tickEls.forEach((el, i) => {
            const at = base + (i - span);
            const off = at - wheelValue;
            const far = Math.abs(off);
            const visible = at >= min && at <= max && far <= span;
            el.classList.toggle(cfg.classes.major, at % 10 === 0);
            /* stessa posa di .carousel-item nella vetrina: sposta, allontana e ruota */
            el.style.setProperty('transform', 'translateX(' + (off * tickPx).toFixed(2) + 'px) '
                + 'translateZ(' + (-far * 26).toFixed(2) + 'px) '
                + 'rotateY(' + Math.max(-45, Math.min(45, -off * 7)).toFixed(2) + 'deg)');
            el.style.setProperty('opacity', visible ? String(Math.max(0, 1 - far / 9).toFixed(3)) : '0');
        });
    }

    function renderValue() {
        if (readout) readout.textContent = String(value);
        if (wheel) {
            wheel.setAttribute('aria-valuenow', String(value));
            wheel.setAttribute('aria-valuetext', value + ' BPM');
        }
    }

    /** Scrive il valore e avvisa chi usa il controllo. */
    function set(v, { silent = false, fromWheel = false } = {}) {
        const n = clamp(v);
        if (n === value) return value;
        value = n;
        if (!fromWheel) {
            wheelValue = n;
            renderWheel();
        }
        renderValue();
        if (!silent && typeof cfg.onChange === 'function') cfg.onChange(value, { fromWheel });
        return value;
    }

    /* ---------- trascinamento e inerzia ---------- */

    function applyWheel() {
        wheelValue = Math.min(max, Math.max(min, wheelValue));
        renderWheel();
        set(Math.round(wheelValue), { fromWheel: true });
    }

    function snapWheel() {
        wheelValue = clamp(wheelValue);
        applyWheel();
    }

    function stopInertia() {
        if (inertia !== null) window.cancelAnimationFrame(inertia);
        inertia = null;
    }

    function startInertia(v0) {
        stopInertia();
        if (reducedMotion() || Math.abs(v0) < INERTIA_MIN) { snapWheel(); return; }
        let vel = Math.max(-600, Math.min(600, v0));
        let last = now();
        const begin = last;
        const step = () => {
            const t = now();
            const dt = Math.min(0.05, (t - last) / 1000);
            last = t;
            wheelValue += vel * dt;
            vel *= Math.exp(-INERTIA_K * dt);
            applyWheel();
            if (Math.abs(vel) < INERTIA_MIN || t - begin > 1000
                || wheelValue <= min || wheelValue >= max) {
                inertia = null;
                snapWheel();
                return;
            }
            inertia = window.requestAnimationFrame(step);
        };
        inertia = window.requestAnimationFrame(step);
    }

    if (wheel) {
        buildTicks();
        renderWheel();
        let drag = null;

        /** -1 = zona sinistra, +1 = zona destra, 0 = in mezzo. */
        function edgeZone(x) {
            const r = wheel.getBoundingClientRect();
            const edge = Math.min(cfg.edgePx, r.width / 3); // rotelle strette: mai piu' di un terzo
            if (x - r.left <= edge) return -1;
            if (r.right - x <= edge) return 1;
            return 0;
        }

        on(wheel, 'pointerdown', (e) => {
            if (e.button !== undefined && e.button !== 0) return;
            if (input && !input.hidden && e.target === input) return; // editor aperto: si scrive
            stopInertia();
            drag = {
                id: e.pointerId, x0: e.clientX, v0: wheelValue, x: e.clientX,
                t: now(), vel: 0, moved: false,
                zone: edgeZone(e.clientX),
                /* il valore fa partire il trascinamento come tutto il resto:
                   qui si ricorda solo per aprire l'editor a dito fermo */
                onReadout: !!readout && (e.target === readout
                    || (readout.contains && readout.contains(e.target)))
            };
            wheel.classList.add(cfg.classes.dragging);
            e.preventDefault(); // niente selezione ne' scroll della pagina
            if (wheel.setPointerCapture) {
                try { wheel.setPointerCapture(e.pointerId); } catch (err) { /* niente capture */ }
            }
        });
        on(wheel, 'pointermove', (e) => {
            if (!drag || e.pointerId !== drag.id) return;
            e.preventDefault();
            if (!drag.moved) {
                if (Math.abs(e.clientX - drag.x0) < TAP_PX) return; // ancora un tap
                drag.moved = true;
            }
            const t = now();
            const dt = t - drag.t;
            if (dt > 0) drag.vel = ((e.clientX - drag.x) / pxPerBpm) / (dt / 1000);
            drag.x = e.clientX;
            drag.t = t;
            wheelValue = drag.v0 + (e.clientX - drag.x0) / pxPerBpm;
            applyWheel();
        });
        ['pointerup', 'pointercancel'].forEach((ev) => {
            on(wheel, ev, (e) => {
                if (!drag || (e.pointerId !== undefined && e.pointerId !== drag.id)) return;
                const gesto = drag;
                drag = null;
                wheel.classList.remove(cfg.classes.dragging);
                if (gesto.moved) { startInertia(ev === 'pointerup' ? gesto.vel : 0); return; }
                if (ev !== 'pointerup') return;      // annullato: niente tap
                /* dito fermo: ±1 ai bordi, editor sul valore, niente altrove */
                if (gesto.zone) { set(value + gesto.zone); return; }
                if (gesto.onReadout) openEditor();
            });
        });
        on(wheel, 'wheel', (e) => {
            if (!e.deltaY) return;
            e.preventDefault();
            stopInertia();
            set(value + (e.deltaY < 0 ? 1 : -1)); // 1 BPM per tacca
        }, { passive: false });
        on(wheel, 'keydown', (e) => {
            let v = null;
            if (e.key === 'ArrowUp' || e.key === 'ArrowRight') v = value + 1;
            else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') v = value - 1;
            else if (e.key === 'PageUp') v = value + 5;
            else if (e.key === 'PageDown') v = value - 5;
            else if (e.key === 'Home') v = min;
            else if (e.key === 'End') v = max;
            if (v === null) return;
            e.preventDefault();
            stopInertia();
            set(v);
        });
    }

    /* ---------- campo numerico (tap sul valore) ---------- */

    function openEditor() {
        if (!input || !readout || !input.hidden) return; // gia' aperto
        editCancelled = false;
        input.value = String(value);
        readout.hidden = true;
        input.hidden = false;
        input.focus();
        if (input.select) input.select();
    }

    function closeEditor(commit) {
        if (!input || input.hidden) return;
        if (commit) {
            const n = parseInt(input.value, 10);
            if (isFinite(n)) set(n); // clamp; testo non valido: invariato
        }
        input.hidden = true;
        if (readout) readout.hidden = false;
    }

    /* niente listener di `click` sul valore: un trascinamento che finisce
       sopra al numero genera un click, e l'editor si sarebbe aperto da solo.
       Lo apre il tap fermo, gestito nel pointerup qui sopra. */
    if (input) {
        on(input, 'keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                closeEditor(true);
                if (wheel && wheel.focus) wheel.focus();
            } else if (e.key === 'Escape' || e.key === 'Esc') {
                e.preventDefault();
                editCancelled = true;
                closeEditor(false);
            }
            if (typeof cfg.onEditKeydown === 'function') cfg.onEditKeydown(e);
            e.stopPropagation(); // col campo aperto i tasti non arrivano alla pagina
        });
        on(input, 'blur', () => {
            if (editCancelled) { editCancelled = false; return; }
            closeEditor(true);
        });
    }

    renderValue();
    renderWheel();

    return {
        wheel,
        value: () => value,
        set,
        /** Riallinea la rotella a un valore deciso altrove (senza onChange). */
        sync: (v) => set(v, { silent: true }),
        openEditor,
        closeEditor,
        refresh: () => { renderValue(); renderWheel(); },
        destroy() {
            stopInertia();
            listeners.forEach(([target, type, fn, opts]) => target.removeEventListener(type, fn, opts));
            listeners.length = 0;
        }
    };
}
