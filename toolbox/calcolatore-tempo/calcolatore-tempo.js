/**
 * Tiny Temple Toolbox - Calcolatore tempo (spec 12).
 *
 * Tre schede: Delay e riverbero, Nota e frequenza, Sidechain. Nessun
 * audio: solo aritmetica (shared/tempo-math.js) e le funzioni di
 * shared/pitch.js per nota e Hz. Un tocco su un valore lo copia.
 *
 * Aggancia solo gli id del markup (spec 12 §3): #calc (data-calc-tab/
 * unit/dir), #calc-tabs, #calc-wheel(+#calc-bpm/#calc-bpm-input),
 * #calc-wheel-sc(+#calc-bpm-sc/#calc-bpm-sc-input), #calc-unit,
 * #calc-table, .calc-cell[data-calc-div|data-calc-reverb|data-calc-rate],
 * #calc-dir, #calc-note, #calc-octave, #calc-hz-input, #calc-a4,
 * #calc-a4-value, #calc-a4-reset, #calc-hz-out, #calc-note-out,
 * #calc-cents-out, #calc-wavelength-out, #calc-period-out, #calc-table-sc,
 * #calc-status. Non tocca HTML ne' CSS.
 *
 * A4 condiviso (spec 12 §4): si legge `tt.shared.a4`, in mancanza
 * `tt.accordatore.a4`, e si scrive in entrambe, cosi' l'accordatore vede
 * lo stesso valore senza modifiche.
 */

import commonDict from '/shared/i18n-common.js';
import toolDict from '/calcolatore-tempo/i18n.js';
import { init, t, lang, onChange } from '/shared/i18n.js';
import { pressFeedback, toast } from '/shared/ui.js';
import { mountBar } from '/shared/nav.js';
import { initPwa } from '/shared/pwa.js';
import { prefs } from '/shared/storage.js';
import { mountSelects } from '/shared/select.js';
import { mountInfos } from '/shared/sheet.js';
import { createBpmControl } from '/shared/bpm-control.js';
import { noteToHz, noteInfo } from '/shared/pitch.js';
import {
    divisionMs, hzFromMs, reverb, sidechain, wavelength, periodMs, clamp
} from '/shared/tempo-math.js';

const TOOL = 'calcolatore-tempo';
const BPM_MIN = 30;
const BPM_MAX = 300;
const BPM_DEFAULT = 120;
const A4_MIN = 415;
const A4_MAX = 466;
const A4_DEFAULT = 440;
const HZ_MIN = 1;
const HZ_MAX = 20000;
const TABS = ['delay', 'note', 'sidechain'];

/* Numeri: sempre due decimali per i millisecondi, tre per gli Hz. */
function fmt(value, digits) {
    try {
        return new Intl.NumberFormat(lang(), {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        }).format(value);
    } catch (e) {
        return value.toFixed(digits);
    }
}

/** Copia negli appunti, con i ripieghi dei browser che non li hanno. */
export async function copyText(text, el) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return 'clipboard';
        }
    } catch (e) { /* negato o non disponibile: si prova il ripiego */ }
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.className = 'sr-only';
        document.body.appendChild(ta);
        ta.select();
        const done = document.execCommand && document.execCommand('copy');
        ta.remove();
        if (done) return 'fallback';
    } catch (e) { /* nemmeno execCommand: resta la selezione */ }
    /* ultimo ripiego: si seleziona il valore perche' lo copi l'utente */
    try {
        if (el && window.getSelection && document.createRange) {
            const range = document.createRange();
            range.selectNodeContents(el);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        }
    } catch (e) { /* niente selezione: pazienza */ }
    return 'manual';
}

export function mountCalculator() {
    const root = document.getElementById('calc');
    if (!root) return null;

    const tabsBox = document.getElementById('calc-tabs');
    const unitBox = document.getElementById('calc-unit');
    const table = document.getElementById('calc-table');
    const tableSc = document.getElementById('calc-table-sc');
    const dirBox = document.getElementById('calc-dir');
    const noteBox = document.getElementById('calc-note');
    const octave = document.getElementById('calc-octave');
    const hzInput = document.getElementById('calc-hz-input');
    const hzWrap = document.getElementById('calc-hz-input-wrap');
    const noteInputs = document.getElementById('calc-note-inputs');
    const a4Input = document.getElementById('calc-a4');
    const a4Value = document.getElementById('calc-a4-value');
    const a4Reset = document.getElementById('calc-a4-reset');
    const hzOut = document.getElementById('calc-hz-out');
    const noteOut = document.getElementById('calc-note-out');
    const centsOut = document.getElementById('calc-cents-out');
    const waveOut = document.getElementById('calc-wavelength-out');
    const periodOut = document.getElementById('calc-period-out');

    const savedTab = prefs.get(TOOL, 'tab', 'delay');
    const ui = {
        bpm: clamp(prefs.get(TOOL, 'bpm', BPM_DEFAULT), BPM_MIN, BPM_MAX),
        tab: TABS.indexOf(savedTab) !== -1 ? savedTab : 'delay',
        unit: prefs.get(TOOL, 'unit', 'ms') === 'hz' ? 'hz' : 'ms',
        dir: prefs.get(TOOL, 'dir', 'note-hz') === 'hz-note' ? 'hz-note' : 'note-hz',
        note: 'A',
        octave: 4,
        hz: 440,
        /* A4 comune: prima tt.shared.a4, poi quello dell'accordatore */
        a4: clamp(prefs.get('shared', 'a4', prefs.get('accordatore', 'a4', A4_DEFAULT)), A4_MIN, A4_MAX)
    };

    const controls = [];

    /* ---------------- scheda 1: delay e riverbero ---------------- */

    const unitLabel = () => (ui.unit === 'hz' ? t('calc-hz-full') : t('calc-ms-full'));
    const digits = () => (ui.unit === 'hz' ? 3 : 2);
    const valueFor = (ms) => (ui.unit === 'hz' ? hzFromMs(ms) : ms);

    function cellLabel(cell, ms, name) {
        const text = fmt(valueFor(ms), digits());
        cell.textContent = text;
        cell.setAttribute('data-calc-value', String(valueFor(ms)));
        cell.setAttribute('aria-label', name + ', ' + text + ' ' + unitLabel() + ', ' + t('calc-copy-action'));
    }

    function renderTable() {
        if (!table) return;
        [...table.querySelectorAll('.calc-cell[data-calc-div]')].forEach((cell) => {
            const den = Number(cell.getAttribute('data-calc-div'));
            const mod = cell.getAttribute('data-calc-mod') || 'straight';
            const name = '1/' + den + (mod === 'straight' ? ''
                : ' ' + t(mod === 'dotted' ? 'calc-dotted' : 'calc-triplet').toLowerCase());
            cellLabel(cell, divisionMs(ui.bpm, den, mod), name);
        });
        const rev = reverb(ui.bpm);
        const revNames = {
            'predelay-64': t('calc-predelay') + ' 1/64',
            'predelay-128': t('calc-predelay') + ' 1/128',
            'decay-1': t('calc-decay') + ' ' + t('calc-decay-1'),
            'decay-2': t('calc-decay') + ' ' + t('calc-decay-2'),
            'decay-4': t('calc-decay') + ' ' + t('calc-decay-4')
        };
        const revValues = {
            'predelay-64': rev.predelay64,
            'predelay-128': rev.predelay128,
            'decay-1': rev.decay1,
            'decay-2': rev.decay2,
            'decay-4': rev.decay4
        };
        [...document.querySelectorAll('.calc-cell[data-calc-reverb]')].forEach((cell) => {
            const key = cell.getAttribute('data-calc-reverb');
            cellLabel(cell, revValues[key], revNames[key] || key);
        });
    }

    /* ---------------- scheda 3: sidechain ---------------- */

    function renderSidechain() {
        if (!tableSc) return;
        const data = sidechain(ui.bpm);
        const byDen = new Map(data.rates.map((r) => [r.den, r]));
        [...tableSc.querySelectorAll('tbody tr')].forEach((tr) => {
            const cell = tr.querySelector('.calc-cell[data-calc-rate]');
            if (!cell) return;
            const den = Number(cell.getAttribute('data-calc-rate'));
            const rate = byDen.get(den);
            if (!rate) return;
            const head = tr.querySelector('th');
            if (head) head.textContent = '1/' + den + ' — ' + fmt(rate.hz, 3) + ' Hz';
            [...tr.querySelectorAll('.calc-cell[data-calc-rate]')].forEach((btn) => {
                const soft = btn.getAttribute('data-calc-release') !== 'hard';
                const ms = soft ? rate.releaseSoft : rate.releaseHard;
                const name = '1/' + den + ', '
                    + t(soft ? 'calc-release-soft' : 'calc-release-hard').toLowerCase();
                btn.textContent = fmt(ms, 2);
                btn.setAttribute('data-calc-value', String(ms));
                btn.setAttribute('aria-label', name + ', ' + fmt(ms, 2) + ' ' + t('calc-ms-full') + ', ' + t('calc-copy-action'));
            });
        });
    }

    /* ---------------- scheda 2: nota e frequenza ---------------- */

    function renderNote() {
        const toNote = ui.dir === 'hz-note';
        if (noteInputs) noteInputs.hidden = toNote;
        if (hzWrap) hzWrap.hidden = !toNote;
        const hz = toNote ? ui.hz : noteToHz(ui.note + ui.octave, ui.a4);
        if (hzOut) hzOut.textContent = fmt(hz, 2) + ' Hz';
        if (noteOut) {
            if (toNote) {
                const info = noteInfo(hz, ui.a4);
                noteOut.hidden = false;
                noteOut.textContent = info.note + info.octave;
                if (centsOut) centsOut.textContent = t('calc-cents-value', { n: (info.cents > 0 ? '+' : '') + info.cents });
            } else {
                noteOut.hidden = true;
                if (centsOut) centsOut.textContent = '';
            }
        }
        if (waveOut) waveOut.textContent = fmt(wavelength(hz), 2) + ' m';
        if (periodOut) periodOut.textContent = fmt(periodMs(hz), 2) + ' ms';
    }

    /* ---------------- stato comune ---------------- */

    function markGroup(box, attr, value) {
        if (!box) return;
        [...box.querySelectorAll('[' + attr + ']')].forEach((b) => {
            const on = b.getAttribute(attr) === String(value);
            b.setAttribute('aria-checked', on ? 'true' : 'false');
            b.classList.toggle('is-active', on);
        });
    }

    function renderAll() {
        renderTable();
        renderSidechain();
        renderNote();
    }

    function setBpm(v, from) {
        const n = clamp(v, BPM_MIN, BPM_MAX);
        if (n === ui.bpm) return;
        ui.bpm = n;
        prefs.set(TOOL, 'bpm', n);
        controls.forEach((c) => { if (c !== from) c.sync(n); }); // le due rotelle vanno insieme
        renderTable();
        renderSidechain();
    }

    function setTab(tab) {
        if (TABS.indexOf(tab) === -1) return;
        ui.tab = tab;
        root.setAttribute('data-calc-tab', tab);
        prefs.set(TOOL, 'tab', tab);
        markGroup(tabsBox, 'data-calc-tab', tab);
        TABS.forEach((name) => {
            const panel = document.getElementById('calc-panel-' + name);
            if (panel) panel.hidden = name !== tab;
        });
        controls.forEach((c) => c.refresh()); // le tacche si posano quando si vedono
    }

    function setUnit(unit) {
        ui.unit = unit === 'hz' ? 'hz' : 'ms';
        root.setAttribute('data-calc-unit', ui.unit);
        prefs.set(TOOL, 'unit', ui.unit);
        markGroup(unitBox, 'data-calc-unit', ui.unit);
        renderTable();
    }

    function setDir(dir) {
        ui.dir = dir === 'hz-note' ? 'hz-note' : 'note-hz';
        root.setAttribute('data-calc-dir', ui.dir);
        prefs.set(TOOL, 'dir', ui.dir);
        markGroup(dirBox, 'data-calc-dir', ui.dir);
        renderNote();
    }

    function setA4(v) {
        ui.a4 = clamp(v, A4_MIN, A4_MAX);
        if (a4Input && Number(a4Input.value) !== ui.a4) a4Input.value = String(ui.a4);
        if (a4Value) a4Value.textContent = ui.a4 + ' Hz';
        if (a4Reset) a4Reset.disabled = ui.a4 === A4_DEFAULT;
        prefs.set('shared', 'a4', ui.a4);
        prefs.set('accordatore', 'a4', ui.a4); // finche' l'accordatore legge la sua chiave
        renderNote();
    }

    /* ---------------- copia ---------------- */

    async function copyCell(cell) {
        const raw = cell.getAttribute('data-calc-value');
        const text = raw ? fmt(Number(raw), digits()) : cell.textContent.trim();
        const how = await copyText(text, cell);
        toast(how === 'manual' ? 'calc-copy-manual' : 'calc-copied');
    }

    /* ---------------- eventi ---------------- */

    if (tabsBox) {
        tabsBox.addEventListener('click', (e) => {
            const b = e.target.closest('[data-calc-tab]');
            if (b) setTab(b.getAttribute('data-calc-tab'));
        });
    }
    if (unitBox) {
        unitBox.addEventListener('click', (e) => {
            const b = e.target.closest('[data-calc-unit]');
            if (b) setUnit(b.getAttribute('data-calc-unit'));
        });
    }
    if (dirBox) {
        dirBox.addEventListener('click', (e) => {
            const b = e.target.closest('[data-calc-dir]');
            if (b) setDir(b.getAttribute('data-calc-dir'));
        });
    }
    if (noteBox) {
        noteBox.addEventListener('click', (e) => {
            const b = e.target.closest('[data-calc-note]');
            if (!b) return;
            ui.note = b.getAttribute('data-calc-note');
            markGroup(noteBox, 'data-calc-note', ui.note);
            renderNote();
        });
    }
    if (octave) {
        octave.addEventListener('change', () => {
            ui.octave = clamp(octave.value, 0, 8);
            renderNote();
        });
    }
    if (hzInput) {
        const commit = () => {
            const n = Number(hzInput.value);
            if (isFinite(n) && n > 0) {
                ui.hz = clamp(n, HZ_MIN, HZ_MAX);
                if (Number(hzInput.value) !== ui.hz) hzInput.value = String(ui.hz);
                renderNote();
            }
        };
        hzInput.addEventListener('input', commit);
        hzInput.addEventListener('change', commit);
    }
    if (a4Input) a4Input.addEventListener('input', () => setA4(a4Input.value));
    if (a4Reset) a4Reset.addEventListener('click', () => setA4(A4_DEFAULT));

    root.addEventListener('click', (e) => {
        const cell = e.target.closest ? e.target.closest('.calc-cell') : null;
        if (cell) copyCell(cell);
    });

    onChange(() => renderAll()); // cambio lingua: numeri e aria-label si rifanno

    /* ---------------- montaggio ---------------- */

    mountSelects(document);
    mountInfos(document);

    [['calc-wheel', 'calc-bpm', 'calc-bpm-input'], ['calc-wheel-sc', 'calc-bpm-sc', 'calc-bpm-sc-input']]
        .forEach(([wheelId, outId, inputId]) => {
            const wheel = document.getElementById(wheelId);
            if (!wheel) return;
            const control = createBpmControl({
                wheel,
                drum: wheel.querySelector('.tb-wheel-drum'),
                readout: document.getElementById(outId),
                input: document.getElementById(inputId),
                min: BPM_MIN,
                max: BPM_MAX,
                value: ui.bpm,
                classes: { tick: 'tb-tick', major: 'is-major', dragging: 'is-dragging' },
                onChange: (v) => setBpm(v, control)
            });
            controls.push(control);
        });

    markGroup(noteBox, 'data-calc-note', ui.note);
    if (octave) octave.value = String(ui.octave);
    if (a4Input) a4Input.value = String(ui.a4);
    if (hzInput) hzInput.value = String(ui.hz);
    setA4(ui.a4);
    setUnit(ui.unit);
    setDir(ui.dir);
    setTab(ui.tab);
    renderAll();

    return {
        ui,
        setBpm: (v) => { setBpm(v); controls.forEach((c) => c.sync(ui.bpm)); },
        setTab,
        setUnit,
        setDir,
        setA4,
        copyCell,
        render: renderAll
    };
}

/* Avvio della pagina (nel browser; nei test il modulo si importa e basta). */
if (typeof document !== 'undefined' && document.getElementById('calc')) {
    init(commonDict, toolDict);
    pressFeedback(document);
    mountBar({ page: 'tool', current: TOOL });
    initPwa({
        installBtn: document.getElementById('tb-menu-install'),
        iosHelp: document.getElementById('tb-menu-ios'),
        installSection: document.querySelector('.tb-menu-install-group')
    });
    mountCalculator();
}
