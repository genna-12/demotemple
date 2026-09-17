/**
 * Tiny Temple Toolbox - Metronomo (spec 10).
 *
 * Tutto il tempo sta sull'orologio dell'AudioContext: lo scheduler
 * (shared/scheduler.js) prenota i click con 100 ms di anticipo, il disegno
 * a schermo legge la coda a ogni frame. Nessun setTimeout per l'audio,
 * nessun Date.now(). Un cambio di BPM, battuta o suddivisione vale dal
 * battito successivo: quello gia' prenotato non si tocca.
 *
 * Aggancia solo gli id del contratto (spec 10 §2): #met-bpm,
 * #met-bpm-control, [data-met-step], #met-tap, #met-meters [data-met-meter],
 * #met-subs [data-met-sub], #met-sounds [data-met-sound], #met-dots,
 * #met-volume, #met-toggle (+ #met-toggle-label), #met-status.
 * Non crea markup fuori da #met-dots (i pallini) e non tocca il CSS.
 */

import commonDict from '/shared/i18n-common.js';
import toolDict from '/metronomo/i18n.js';
import { init, t } from '/shared/i18n.js';
import { pressFeedback, setStatus, wakeLock } from '/shared/ui.js';
import { mountBar } from '/shared/nav.js';
import { initPwa } from '/shared/pwa.js';
import { getContext, unlock, needsGesture, onStateChange } from '/shared/audio.js';
import { createScheduler } from '/shared/scheduler.js';
import { prefs } from '/shared/storage.js';

const TOOL = 'metronomo';
const BPM_MIN = 30;
const BPM_MAX = 300;
const BPM_DEFAULT = 120;
const DRAG_PX = 6;        // px di trascinamento per 1 BPM
const DOT_MIN_MS = 90;    // il pallino resta acceso almeno cosi'
const SAVE_DELAY = 400;   // ms prima di scrivere le preferenze
const TAP_RESET_MS = 2000;
const SUB_GAIN = 0.5;     // i click intermedi a meta' volume

/* Battute: `pulses` impulsi contati (quarti nelle x/4, ottavi nelle x/8),
   `accents` gli impulsi accentati (spec 10 §3). */
export const METERS = {
    '2/4': { pulses: 2, accents: [0] },
    '3/4': { pulses: 3, accents: [0] },
    '4/4': { pulses: 4, accents: [0] },
    '5/4': { pulses: 5, accents: [0] },
    '6/8': { pulses: 6, accents: [0, 3] },
    '7/8': { pulses: 7, accents: [0, 3] },
    '12/8': { pulses: 12, accents: [0, 3, 6, 9] }
};
export const SOUNDS = ['legno', 'beep', 'rimshot'];
const SUBS = [1, 2, 3, 4];

const clampBpm = (v) => Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(v)));

/* ---------------- suoni sintetizzati (nessun file) ---------------- */

/**
 * createVoices(ctx, dest) -> { play(kind, time, sound) }
 * kind: 'accent' | 'beat' | 'sub'. Voci monouso: ogni click crea i suoi
 * nodi e li libera in `onended`.
 */
export function createVoices(ctx, dest) {
    let noise = null;

    function noiseBuffer() {
        if (noise) return noise;
        const len = Math.floor(ctx.sampleRate * 0.2);
        noise = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = noise.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        return noise;
    }

    function env(time, peak, decay) {
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, time);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0001, time + decay);
        return g;
    }

    function stopAt(node, time, cleanup) {
        node.onended = () => {
            try { cleanup(); } catch (e) { /* gia' scollegato */ }
        };
        node.stop(time);
    }

    function legno(time, kind) {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer();
        const band = ctx.createBiquadFilter();
        band.type = 'bandpass';
        band.frequency.setValueAtTime(kind === 'accent' ? 2200 : kind === 'sub' ? 3200 : 1500, time);
        band.Q.setValueAtTime(8, time);
        const g = env(time, kind === 'accent' ? 1 : kind === 'sub' ? SUB_GAIN : 0.7, 0.02);
        src.connect(band).connect(g).connect(dest);
        src.start(time);
        stopAt(src, time + 0.05, () => { src.disconnect(); band.disconnect(); g.disconnect(); });
    }

    function beep(time, kind) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(kind === 'accent' ? 1000 : kind === 'sub' ? 1600 : 800, time);
        const g = env(time, kind === 'accent' ? 0.9 : kind === 'sub' ? SUB_GAIN * 0.8 : 0.6, 0.05);
        osc.connect(g).connect(dest);
        osc.start(time);
        stopAt(osc, time + 0.08, () => { osc.disconnect(); g.disconnect(); });
    }

    function rimshot(time, kind) {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer();
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(kind === 'sub' ? 2500 : 1800, time);
        const ng = env(time, kind === 'accent' ? 0.8 : kind === 'sub' ? SUB_GAIN * 0.7 : 0.5, 0.06);
        src.connect(hp).connect(ng).connect(dest);
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(kind === 'accent' ? 420 : 320, time);
        const og = env(time, kind === 'accent' ? 0.6 : kind === 'sub' ? SUB_GAIN * 0.5 : 0.35, 0.06);
        osc.connect(og).connect(dest);
        src.start(time);
        osc.start(time);
        stopAt(src, time + 0.09, () => { src.disconnect(); hp.disconnect(); ng.disconnect(); });
        stopAt(osc, time + 0.09, () => { osc.disconnect(); og.disconnect(); });
    }

    return {
        play(kind, time, sound) {
            if (sound === 'beep') beep(time, kind);
            else if (sound === 'rimshot') rimshot(time, kind);
            else legno(time, kind);
        }
    };
}

/* ---------------- motore ---------------- */

/**
 * createEngine({ ctx, onBeat }) -> comandi del metronomo.
 * `onBeat(info)` e' chiamata quando un click viene PRENOTATO (non quando
 * si sente): info = { time, kind, pulse, accent, isPulse }. Chi disegna
 * usa `drain()`, che restituisce gli eventi il cui tempo e' passato.
 */
export function createEngine({ ctx, onBeat } = {}) {
    const master = ctx.createGain();
    master.gain.value = 0.49; // 70% con curva quadratica
    master.connect(ctx.destination);
    const voices = createVoices(ctx, master);

    const state = {
        bpm: BPM_DEFAULT,
        meter: '4/4',
        subdiv: 1,
        sound: 'legno',
        volume: 70
    };
    let pulse = 0;
    let sub = 0;

    const meterInfo = () => METERS[state.meter] || METERS['4/4'];

    const scheduler = createScheduler({
        ctx,
        onSchedule(time) {
            const info = meterInfo();
            if (pulse >= info.pulses) pulse = 0; // battuta cambiata: si riparte dalla 1
            const isPulse = sub === 0;
            const accent = isPulse && info.accents.indexOf(pulse) !== -1;
            const kind = isPulse ? (accent ? 'accent' : 'beat') : 'sub';
            voices.play(kind, time, state.sound);
            const data = { time, kind, pulse, accent, isPulse };
            if (typeof onBeat === 'function') onBeat(data);
            /* avanzamento: i valori "vivi" valgono dal prossimo evento */
            sub += 1;
            if (sub >= state.subdiv) {
                sub = 0;
                pulse = (pulse + 1) % info.pulses;
            }
            return data;
        },
        nextInterval() {
            return 60 / state.bpm / state.subdiv;
        }
    });

    return {
        state,
        setBpm(v) { state.bpm = clampBpm(v); },
        setMeter(m) {
            if (!METERS[m]) return;
            state.meter = m;
            if (!scheduler.running()) { pulse = 0; sub = 0; }
        },
        setSubdiv(n) {
            const v = Number(n);
            if (SUBS.indexOf(v) === -1) return;
            state.subdiv = v;
            if (!scheduler.running()) sub = 0;
        },
        setSound(s) { if (SOUNDS.indexOf(s) !== -1) state.sound = s; },
        setVolume(v) {
            const n = Math.min(100, Math.max(0, Math.round(v)));
            state.volume = n;
            const g = (n / 100) * (n / 100); // curva quadratica
            const now = ctx.currentTime;
            master.gain.cancelScheduledValues(now);
            master.gain.setTargetAtTime(g, now, 0.01);
        },
        start() {
            if (scheduler.running()) return;
            pulse = 0;
            sub = 0;
            scheduler.start();
        },
        stop() {
            scheduler.stop();
            pulse = 0;
            sub = 0;
        },
        isRunning: () => scheduler.running(),
        queue: () => scheduler.queue(),
        drain: (now) => scheduler.drain(now),
        pulses: () => meterInfo().pulses,
        accents: () => meterInfo().accents
    };
}

/* ---------------- tap tempo ---------------- */

/**
 * createTapTempo({ max, resetMs }) -> { tap(now), reset() }
 * Media degli ultimi intervalli, scartando quelli oltre il 40% dalla
 * mediana; dopo `resetMs` di silenzio la serie ricomincia.
 */
export function createTapTempo({ max = 6, resetMs = TAP_RESET_MS } = {}) {
    let taps = [];
    return {
        reset() { taps = []; },
        tap(now = (typeof performance !== 'undefined' ? performance.now() : 0)) {
            if (taps.length && now - taps[taps.length - 1] > resetMs) taps = [];
            taps.push(now);
            if (taps.length > max) taps = taps.slice(-max);
            if (taps.length < 2) return null;
            const gaps = [];
            for (let i = 1; i < taps.length; i++) gaps.push(taps[i] - taps[i - 1]);
            const sorted = [...gaps].sort((a, b) => a - b);
            const median = sorted.length % 2
                ? sorted[(sorted.length - 1) / 2]
                : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
            const good = gaps.filter((g) => Math.abs(g - median) <= median * 0.4);
            const use = good.length ? good : gaps;
            const avg = use.reduce((a, b) => a + b, 0) / use.length;
            if (!(avg > 0)) return null;
            return clampBpm(60000 / avg);
        }
    };
}

/* ---------------- interfaccia ---------------- */

function isTextField(node) {
    if (!node) return false;
    const tag = node.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable === true;
}

export function mountMetronome() {
    const root = document.getElementById('met');
    if (!root) return null;

    const bpmOut = document.getElementById('met-bpm');
    const bpmControl = document.getElementById('met-bpm-control');
    const tapBtn = document.getElementById('met-tap');
    const metersBox = document.getElementById('met-meters');
    const subsBox = document.getElementById('met-subs');
    const soundsBox = document.getElementById('met-sounds');
    const dotsBox = document.getElementById('met-dots');
    const volume = document.getElementById('met-volume');
    const toggle = document.getElementById('met-toggle');
    const toggleLabel = document.getElementById('met-toggle-label');
    const status = document.getElementById('met-status');

    let engine = null;   // creato al primo avvio (l'AudioContext nasce nel gesto)
    let raf = null;
    let saveTimer = null;
    let resumeWanted = false; // era in funzione quando la pagina e' sparita
    const dots = [];
    const tapper = createTapTempo();

    /* preferenze salvate */
    const saved = {
        bpm: clampBpm(prefs.get(TOOL, 'bpm', BPM_DEFAULT)),
        meter: METERS[prefs.get(TOOL, 'meter', '4/4')] ? prefs.get(TOOL, 'meter', '4/4') : '4/4',
        subdiv: SUBS.indexOf(Number(prefs.get(TOOL, 'subdiv', 1))) !== -1 ? Number(prefs.get(TOOL, 'subdiv', 1)) : 1,
        sound: SOUNDS.indexOf(prefs.get(TOOL, 'sound', 'legno')) !== -1 ? prefs.get(TOOL, 'sound', 'legno') : 'legno',
        volume: Math.min(100, Math.max(0, Number(prefs.get(TOOL, 'volume', 70)) || 0))
    };
    const ui = { ...saved };

    function saveSoon() {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            saveTimer = null;
            prefs.set(TOOL, 'bpm', ui.bpm);
            prefs.set(TOOL, 'meter', ui.meter);
            prefs.set(TOOL, 'subdiv', ui.subdiv);
            prefs.set(TOOL, 'sound', ui.sound);
            prefs.set(TOOL, 'volume', ui.volume);
        }, SAVE_DELAY);
    }

    /* ---- pallini ---- */
    function buildDots() {
        if (!dotsBox) return;
        const info = METERS[ui.meter];
        dotsBox.textContent = '';
        dots.length = 0;
        for (let i = 0; i < info.pulses; i++) {
            const dot = document.createElement('span');
            dot.className = info.accents.indexOf(i) !== -1 ? 'met-dot is-accent' : 'met-dot';
            dotsBox.appendChild(dot);
            dots.push({ el: dot, offAt: 0 });
        }
    }

    function lightDot(index, now) {
        const d = dots[index];
        if (!d) return;
        d.el.classList.add('is-on');
        d.offAt = now + DOT_MIN_MS / 1000;
    }

    function frame() {
        if (!engine) return;
        const now = typeof engine.nowFn === 'function' ? engine.nowFn() : ctxNow();
        engine.drain(now).forEach((ev) => {
            if (ev.data && ev.data.isPulse) lightDot(ev.data.pulse, now);
        });
        dots.forEach((d) => {
            if (d.offAt && now >= d.offAt) {
                d.el.classList.remove('is-on');
                d.offAt = 0;
            }
        });
        raf = window.requestAnimationFrame(frame);
    }

    function ctxNow() {
        try { return getContext().currentTime; } catch (e) { return 0; }
    }

    function stopFrames() {
        if (raf !== null) window.cancelAnimationFrame(raf);
        raf = null;
        dots.forEach((d) => { d.el.classList.remove('is-on'); d.offAt = 0; });
    }

    /* ---- stato dei gruppi ---- */
    function markGroup(box, attr, value) {
        if (!box) return;
        [...box.querySelectorAll('[' + attr + ']')].forEach((b) => {
            const on = b.getAttribute(attr) === String(value);
            b.setAttribute('aria-checked', on ? 'true' : 'false');
            b.classList.toggle('is-active', on);
        });
    }

    function renderBpm() {
        if (bpmOut) bpmOut.textContent = String(ui.bpm);
        if (bpmControl) {
            bpmControl.setAttribute('aria-valuenow', String(ui.bpm));
            bpmControl.setAttribute('aria-valuetext', ui.bpm + ' BPM');
        }
    }

    function setBpm(v) {
        const n = clampBpm(v);
        if (n === ui.bpm) return;
        ui.bpm = n;
        if (engine) engine.setBpm(n);
        renderBpm();
        saveSoon();
    }

    function setMeter(m) {
        if (!METERS[m]) return;
        ui.meter = m;
        if (engine) engine.setMeter(m);
        markGroup(metersBox, 'data-met-meter', m);
        buildDots();
        saveSoon();
    }

    function setSubdiv(n) {
        const v = Number(n);
        if (SUBS.indexOf(v) === -1) return;
        ui.subdiv = v;
        if (engine) engine.setSubdiv(v);
        markGroup(subsBox, 'data-met-sub', v);
        saveSoon();
    }

    function setSound(s) {
        if (SOUNDS.indexOf(s) === -1) return;
        ui.sound = s;
        if (engine) engine.setSound(s);
        markGroup(soundsBox, 'data-met-sound', s);
        saveSoon();
    }

    function setVolume(v) {
        const n = Math.min(100, Math.max(0, Math.round(Number(v) || 0)));
        ui.volume = n;
        if (engine) engine.setVolume(n);
        if (volume && Number(volume.value) !== n) volume.value = String(n);
        saveSoon();
    }

    /* ---- avvio e stop ---- */
    function renderToggle(on) {
        if (toggle) {
            toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
            toggle.classList.toggle('is-on', on);
        }
        if (toggleLabel) {
            const key = on ? 'met-stop' : 'met-start';
            toggleLabel.setAttribute('data-i18n', key);
            toggleLabel.textContent = t(key);
        }
    }

    function ensureEngine() {
        if (engine) return engine;
        const ctx = getContext();
        engine = createEngine({ ctx });
        engine.nowFn = () => ctx.currentTime;
        engine.setBpm(ui.bpm);
        engine.setMeter(ui.meter);
        engine.setSubdiv(ui.subdiv);
        engine.setSound(ui.sound);
        engine.setVolume(ui.volume);
        return engine;
    }

    function start() {
        let eng;
        try {
            unlock().catch(() => { /* resume() rifiutato: serve un gesto, lo dice #met-status */ });
            eng = ensureEngine();
        } catch (e) {
            setStatus(status, { kind: 'error', key: 'audio-resume-msg' });
            return;
        }
        if (eng.isRunning()) return;
        if (status) status.textContent = '';
        eng.start();
        renderToggle(true);
        stopFrames();
        raf = window.requestAnimationFrame(frame);
        wakeLock(true);
    }

    function stop({ keepStatus = false } = {}) {
        if (engine) engine.stop();
        renderToggle(false);
        stopFrames();
        wakeLock(false);
        if (!keepStatus && status) status.textContent = '';
    }

    function toggleRun() {
        if (engine && engine.isRunning()) stop();
        else start();
    }

    /* ---- eventi ---- */
    if (toggle) toggle.addEventListener('click', toggleRun);

    if (metersBox) {
        metersBox.addEventListener('click', (e) => {
            const b = e.target.closest('[data-met-meter]');
            if (b) setMeter(b.getAttribute('data-met-meter'));
        });
    }
    if (subsBox) {
        subsBox.addEventListener('click', (e) => {
            const b = e.target.closest('[data-met-sub]');
            if (b) setSubdiv(b.getAttribute('data-met-sub'));
        });
    }
    if (soundsBox) {
        soundsBox.addEventListener('click', (e) => {
            const b = e.target.closest('[data-met-sound]');
            if (b) setSound(b.getAttribute('data-met-sound'));
        });
    }

    root.addEventListener('click', (e) => {
        const step = e.target.closest ? e.target.closest('[data-met-step]') : null;
        if (!step) return;
        setBpm(ui.bpm + Number(step.getAttribute('data-met-step')));
    });

    if (tapBtn) {
        tapBtn.addEventListener('click', () => {
            const bpm = tapper.tap();
            if (bpm !== null) setBpm(bpm); // il tap non avvia il suono
        });
    }

    if (volume) {
        volume.addEventListener('input', () => setVolume(volume.value));
    }

    /* numero BPM: trascinamento verticale, rotella, tastiera */
    if (bpmControl) {
        let dragId = null;
        let dragY = 0;
        let dragBase = 0;
        bpmControl.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            dragId = e.pointerId;
            dragY = e.clientY;
            dragBase = ui.bpm;
            e.preventDefault(); // niente selezione del testo
            if (bpmControl.setPointerCapture) {
                try { bpmControl.setPointerCapture(e.pointerId); } catch (err) { /* niente capture */ }
            }
        });
        bpmControl.addEventListener('pointermove', (e) => {
            if (dragId === null || e.pointerId !== dragId) return;
            e.preventDefault();
            setBpm(dragBase + Math.round((dragY - e.clientY) / DRAG_PX));
        });
        ['pointerup', 'pointercancel'].forEach((ev) => {
            bpmControl.addEventListener(ev, () => { dragId = null; });
        });
        bpmControl.addEventListener('wheel', (e) => {
            if (!e.deltaY) return;
            e.preventDefault();
            setBpm(ui.bpm + (e.deltaY < 0 ? 1 : -1));
        }, { passive: false });
        bpmControl.addEventListener('keydown', (e) => {
            let v = null;
            if (e.key === 'ArrowUp' || e.key === 'ArrowRight') v = ui.bpm + 1;
            else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') v = ui.bpm - 1;
            else if (e.key === 'PageUp') v = ui.bpm + 5;
            else if (e.key === 'PageDown') v = ui.bpm - 5;
            else if (e.key === 'Home') v = BPM_MIN;
            else if (e.key === 'End') v = BPM_MAX;
            if (v === null) return;
            e.preventDefault();
            setBpm(v);
        });
    }

    /* barra spaziatrice: avvia e ferma da qualunque punto della pagina */
    document.addEventListener('keydown', (e) => {
        if (e.key !== ' ' && e.key !== 'Spacebar' && e.code !== 'Space') return;
        if (e.repeat || isTextField(e.target)) return;
        if (e.target && e.target.closest && e.target.closest('#tb-menu')) return;
        e.preventDefault();
        toggleRun();
    });

    /* iOS e schede in secondo piano: si ferma e si ricorda lo stato */
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            if (engine && engine.isRunning()) {
                resumeWanted = true;
                stop({ keepStatus: true });
            }
            return;
        }
        if (!resumeWanted) return;
        resumeWanted = false;
        if (needsGesture()) setStatus(status, { kind: 'idle', key: 'audio-resume-msg' });
        else start(); // riparte dal battito 1
    });

    window.addEventListener('pagehide', () => {
        resumeWanted = false;
        stop();
    });

    onStateChange(() => {
        if (engine && engine.isRunning() && needsGesture()) stop();
    });

    /* ---- stato iniziale ---- */
    renderBpm();
    markGroup(metersBox, 'data-met-meter', ui.meter);
    markGroup(subsBox, 'data-met-sub', ui.subdiv);
    markGroup(soundsBox, 'data-met-sound', ui.sound);
    if (volume) volume.value = String(ui.volume);
    buildDots();
    renderToggle(false);

    return {
        ui,
        start,
        stop,
        toggle: toggleRun,
        setBpm,
        setMeter,
        setSubdiv,
        setSound,
        setVolume,
        tap: () => {
            const bpm = tapper.tap();
            if (bpm !== null) setBpm(bpm);
            return bpm;
        },
        engine: () => engine,
        dots: () => dots
    };
}

/* Avvio della pagina (nel browser; nei test il modulo si importa e basta). */
if (typeof document !== 'undefined' && document.getElementById('met')) {
    init(commonDict, toolDict);
    pressFeedback(document);
    mountBar({ page: 'tool', titleKey: 'met-title', current: TOOL });
    initPwa({
        installBtn: document.getElementById('tb-menu-install'),
        iosHelp: document.getElementById('tb-menu-ios'),
        installSection: document.querySelector('.tb-menu-install-group')
    });
    mountMetronome();
}
