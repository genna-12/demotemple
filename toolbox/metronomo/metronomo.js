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
 * Spec 21: #met-countin (switch, aria-checked), #met-preset-next (+ -sub),
 * #met-preset-save, #met-preset-list (righe create qui: li.met-preset
 * [data-met-preset] > .met-preset-apply (.met-preset-name, .met-preset-sum),
 * .met-preset-rename, .met-preset-del; in rinomina input.met-preset-input),
 * #met-preset-empty, #met-preset-status. Per i test ogni click prenotato
 * esce come CustomEvent 'met-prenotato' su #met (tempi calcolati).
 * Non crea markup fuori da #met-dots e #met-preset-list e non tocca il CSS.
 */

import commonDict from '/shared/i18n-common.js';
import toolDict from '/metronomo/i18n.js';
import { init, t, onChange as onLang } from '/shared/i18n.js';
import { pressFeedback, setStatus, wakeLock, toast } from '/shared/ui.js';
import { mountBar } from '/shared/nav.js';
import { initPwa } from '/shared/pwa.js';
import { mountAiuto } from '/shared/aiuto.js';
import { getContext, unlock, needsGesture, onStateChange } from '/shared/audio.js';
import { createScheduler } from '/shared/scheduler.js';
import { createBpmControl } from '/shared/bpm-control.js';
import { mountRanges } from '/shared/range.js';
import {
    prefs, elenca, leggi, scrivi, elimina, onChange as onArchivio, inSolaLettura, ErroreLimite, LIMITI
} from '/shared/archivio.js';
import {
    COLLEZIONE as PRESET, NOME_MAX, pulisci, dati as datiPreset, ordina, nuovoId, nomeProposto,
    nomeValido, riassunto, uguale, successivo
} from '/metronomo/preset.js';
import { avviaPagina as avviaSync } from '/shared/sync.js';

const TOOL = 'metronomo';
const BPM_MIN = 30;
const BPM_MAX = 300;
const BPM_DEFAULT = 120;
const WHEEL_PX = 8;       // px di trascinamento per 1 BPM sulla rotella (spec 10 §11.1)
const WHEEL_TICKS = 12;   // tacche visibili per lato
const TICK_PX = 26;       // distanza fra due tacche
const BUZZ_MS = 40;       // un impulso ogni tot durante l'inerzia
const VOL_DEFAULT = 85;   // spec 10 §11.4
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

    /* Livelli (spec 10 §11.4, misurati in OfflineAudioContext a volume 0,85:
       picco fra -6 e -3 dBFS, RMS entro 3 dB fra i tre suoni, misurati da
       scripts di prova con node-web-audio-api). Il legno e' il piu' magro di
       natura: quasi tutta l'energia sta nel corpo (udibile ~12 ms) piu' una
       componente d'aria a 2,4 kHz; il rumore resta solo come transiente,
       cosi' non sfonda il picco e il carattere "wood" rimane. */
    const LEVEL = {
        legno: { noise: 0.1, body: 0.49, air: 0.168 },
        beep: { osc: 0.5 },
        rimshot: { noise: 0.39, body: 0.305 }
    };
    const kindScale = (kind) => (kind === 'accent' ? 1 : kind === 'sub' ? SUB_GAIN : 0.72);

    /* Legno: transiente cortissimo sul rumore, corpo di ~12 ms, aria a 2,4 kHz. */
    function legno(time, kind) {
        const k = kindScale(kind);
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer();
        const band = ctx.createBiquadFilter();
        band.type = 'bandpass';
        band.frequency.setValueAtTime(kind === 'accent' ? 2600 : kind === 'sub' ? 3000 : 1600, time);
        band.Q.setValueAtTime(3, time);
        const g = env(time, LEVEL.legno.noise * k, 0.03);
        src.connect(band).connect(g).connect(dest);

        const body = ctx.createOscillator();
        body.type = 'triangle';
        body.frequency.setValueAtTime(kind === 'accent' ? 1400 : kind === 'sub' ? 2000 : 1000, time);
        const bg = env(time, LEVEL.legno.body * k, 0.04); // corpo: e' qui l'energia (udibile ~12 ms)
        body.connect(bg).connect(dest);

        const air = ctx.createOscillator();
        air.type = 'sine';
        air.frequency.setValueAtTime(2400, time);
        const ag = env(time, LEVEL.legno.air * k, 0.025);
        air.connect(ag).connect(dest);

        src.start(time);
        body.start(time);
        air.start(time);
        stopAt(src, time + 0.05, () => { src.disconnect(); band.disconnect(); g.disconnect(); });
        stopAt(body, time + 0.06, () => { body.disconnect(); bg.disconnect(); });
        stopAt(air, time + 0.04, () => { air.disconnect(); ag.disconnect(); });
    }

    function beep(time, kind) {
        const k = kindScale(kind);
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(kind === 'accent' ? 1000 : kind === 'sub' ? 1600 : 800, time);
        const g = env(time, LEVEL.beep.osc * k, 0.03);
        osc.connect(g).connect(dest);
        osc.start(time);
        stopAt(osc, time + 0.08, () => { osc.disconnect(); g.disconnect(); });
    }

    function rimshot(time, kind) {
        const k = kindScale(kind);
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer();
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(kind === 'sub' ? 2500 : 1800, time);
        const ng = env(time, LEVEL.rimshot.noise * k, 0.035);
        src.connect(hp).connect(ng).connect(dest);
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(kind === 'accent' ? 420 : 320, time);
        const og = env(time, LEVEL.rimshot.body * k, 0.035);
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
 * si sente): info = { time, kind, pulse, accent, isPulse, bpm, cambio? }.
 * Chi disegna usa `drain()`, che restituisce gli eventi il cui tempo e'
 * passato.
 *
 * Battuta d'attacco (spec 21 §4): `start({ countIn: true })` suona prima
 * `pulses` click d'accento (kind 'count', niente suddivisioni, nessun timbro
 * nuovo), poi il «1» vero. Lo scheduler non cambia: e' `nextInterval` a
 * tenere il passo di un quarto finche' l'ultimo click prenotato e' d'attacco.
 * `applicaAlBattere(v)` tiene { bpm, meter, subdiv, sound } da parte e li
 * applica sul prossimo battere (pulse 0, sub 0) fuori dall'attacco; un
 * comando manuale (setBpm/setMeter/setSubdiv/setSound) lo annulla.
 */
export function createEngine({ ctx, onBeat } = {}) {
    const master = ctx.createGain();
    master.gain.value = (VOL_DEFAULT / 100) * (VOL_DEFAULT / 100);
    /* compressore leggero (spec 10 §11.4): tiene i picchi quando battono
       insieme accento e suddivisioni, senza schiacciare il transiente */
    if (typeof ctx.createDynamicsCompressor === 'function') {
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.setValueAtTime(-12, ctx.currentTime);
        comp.knee.setValueAtTime(6, ctx.currentTime);
        comp.ratio.setValueAtTime(4, ctx.currentTime);
        comp.attack.setValueAtTime(0.003, ctx.currentTime);
        comp.release.setValueAtTime(0.1, ctx.currentTime);
        master.connect(comp);
        comp.connect(ctx.destination);
    } else {
        master.connect(ctx.destination);
    }
    const voices = createVoices(ctx, master);

    const state = {
        bpm: BPM_DEFAULT,
        meter: '4/4',
        subdiv: 1,
        sound: 'legno',
        volume: VOL_DEFAULT
    };
    let pulse = 0;
    let sub = 0;
    let conta = 0;            // click d'attacco ancora da prenotare
    let contaTot = 0;         // quanti erano all'inizio (pulse del click = contaTot - conta)
    let ultimoConta = false;  // l'ultimo click prenotato era d'attacco
    let pending = null;       // { bpm, meter, subdiv, sound } per il prossimo battere

    const meterInfo = () => METERS[state.meter] || METERS['4/4'];

    const scheduler = createScheduler({
        ctx,
        onSchedule(time) {
            if (conta > 0) {
                /* attacco: soli accenti, un quarto l'uno, stesso timbro */
                voices.play('accent', time, state.sound);
                const count = {
                    time, kind: 'count', pulse: contaTot - conta, accent: true, isPulse: true, bpm: state.bpm
                };
                conta -= 1;
                ultimoConta = true;
                if (conta === 0) { pulse = 0; sub = 0; }
                if (typeof onBeat === 'function') onBeat(count);
                return count;
            }
            ultimoConta = false;
            let info = meterInfo();
            if (pulse >= info.pulses) pulse = 0; // battuta cambiata: si riparte dalla 1
            let cambio = false;
            if (pending && pulse === 0 && sub === 0) {
                Object.assign(state, pending);
                pending = null;
                cambio = true;
                info = meterInfo();
            }
            const isPulse = sub === 0;
            const accent = isPulse && info.accents.indexOf(pulse) !== -1;
            const kind = isPulse ? (accent ? 'accent' : 'beat') : 'sub';
            voices.play(kind, time, state.sound);
            const data = { time, kind, pulse, accent, isPulse, bpm: state.bpm };
            if (cambio) data.cambio = true;
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
            /* chiamata DOPO onSchedule (scheduler.js): dopo un click
               d'attacco il passo e' un quarto, suddivisioni o no */
            return 60 / state.bpm / (ultimoConta ? 1 : state.subdiv);
        }
    });

    return {
        state,
        setBpm(v) { pending = null; state.bpm = clampBpm(v); },
        setMeter(m) {
            if (!METERS[m]) return;
            pending = null;
            state.meter = m;
            if (conta > 0) { conta = 0; pulse = 0; sub = 0; } // niente piu' attacco: il «1» vero
            if (!scheduler.running()) { pulse = 0; sub = 0; }
        },
        setSubdiv(n) {
            const v = Number(n);
            if (SUBS.indexOf(v) === -1) return;
            pending = null;
            state.subdiv = v;
            if (!scheduler.running()) sub = 0;
        },
        setSound(s) {
            if (SOUNDS.indexOf(s) === -1) return;
            pending = null;
            state.sound = s;
        },
        /** Valori da applicare al prossimo battere (fermo: subito). */
        applicaAlBattere(v) {
            const next = {};
            if (v && v.bpm !== undefined) next.bpm = clampBpm(v.bpm);
            if (v && METERS[v.meter]) next.meter = v.meter;
            if (v && SUBS.indexOf(Number(v.subdiv)) !== -1) next.subdiv = Number(v.subdiv);
            if (v && SOUNDS.indexOf(v.sound) !== -1) next.sound = v.sound;
            if (!scheduler.running()) {
                Object.assign(state, next);
                pending = null;
                pulse = 0;
                sub = 0;
                return;
            }
            pending = next;
        },
        hasPending: () => pending !== null,
        inAttacco: () => conta > 0,
        setVolume(v) {
            const n = Math.min(100, Math.max(0, Math.round(v)));
            state.volume = n;
            const g = (n / 100) * (n / 100); // curva quadratica
            const now = ctx.currentTime;
            master.gain.cancelScheduledValues(now);
            master.gain.setTargetAtTime(g, now, 0.01);
        },
        start({ countIn = false } = {}) {
            if (scheduler.running()) return;
            pulse = 0;
            sub = 0;
            contaTot = countIn ? meterInfo().pulses : 0;
            conta = contaTot;
            ultimoConta = false;
            scheduler.start();
        },
        stop() {
            scheduler.stop();
            pulse = 0;
            sub = 0;
            conta = 0;
            contaTot = 0;
            ultimoConta = false;
            /* un preset in attesa del battere vale comunque: la pagina lo
               mostra gia', il prossimo Avvia deve suonarlo */
            if (pending) { Object.assign(state, pending); pending = null; }
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

const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

function isTextField(node) {
    if (!node) return false;
    const tag = node.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable === true;
}

export function mountMetronome() {
    const root = document.getElementById('met');
    if (!root) return null;

    const bpmOut = document.getElementById('met-bpm');
    const bpmInput = document.getElementById('met-bpm-input');
    const wheel = document.getElementById('met-wheel');
    const drum = wheel ? wheel.querySelector('.met-wheel-drum') : null;
    const tapBtn = document.getElementById('met-tap');
    const countBtn = document.getElementById('met-count');
    const counter = document.getElementById('met-counter');
    const counterHint = document.getElementById('met-counter-hint');
    const counterValue = document.getElementById('met-counter-value');
    const counterClose = document.getElementById('met-counter-close');
    const metersBox = document.getElementById('met-meters');
    const subsBox = document.getElementById('met-subs');
    const soundsBox = document.getElementById('met-sounds');
    const dotsBox = document.getElementById('met-dots');
    const volume = document.getElementById('met-volume');
    const toggle = document.getElementById('met-toggle');
    const toggleLabel = document.getElementById('met-toggle-label');
    const status = document.getElementById('met-status');
    const countinBtn = document.getElementById('met-countin');
    const presetList = document.getElementById('met-preset-list');
    const presetSave = document.getElementById('met-preset-save');
    const presetNext = document.getElementById('met-preset-next');
    const presetNextSub = document.getElementById('met-preset-next-sub');
    const presetEmpty = document.getElementById('met-preset-empty');
    const presetStatus = document.getElementById('met-preset-status');

    let engine = null;   // creato al primo avvio (l'AudioContext nasce nel gesto)
    /* preset (spec 21): copia in memoria dell'archivio, vedi piu' sotto */
    let presets = [];
    let ultimoPreset = null;     // id dell'ultimo applicato (per «Avanti»)
    let rinomina = null;         // id della riga in rinomina
    let daRicaricare = false;    // un cambio da fuori arrivato durante la rinomina o un tocco
    let toccoInCorso = false;    // dito/mouse giu' sulla lista: niente ridisegni sotto al tocco
    let chiudiToast = null;
    let fila = Promise.resolve();
    const trovaPreset = (id) => presets.find((p) => p.id === id) || null;
    let raf = null;
    let saveTimer = null;
    let resumeWanted = false; // era in funzione quando la pagina e' sparita
    const dots = [];
    const tapper = createTapTempo();
    const counterTap = createTapTempo();
    let counterCount = 0;
    let counterBpm = null;
    let lastBuzz = 0;

    /* preferenze salvate */
    const saved = {
        bpm: clampBpm(prefs.get(TOOL, 'bpm', BPM_DEFAULT)),
        meter: METERS[prefs.get(TOOL, 'meter', '4/4')] ? prefs.get(TOOL, 'meter', '4/4') : '4/4',
        subdiv: SUBS.indexOf(Number(prefs.get(TOOL, 'subdiv', 1))) !== -1 ? Number(prefs.get(TOOL, 'subdiv', 1)) : 1,
        sound: SOUNDS.indexOf(prefs.get(TOOL, 'sound', 'legno')) !== -1 ? prefs.get(TOOL, 'sound', 'legno') : 'legno',
        volume: Math.min(100, Math.max(0, Number(prefs.get(TOOL, 'volume', VOL_DEFAULT)))),
        countin: prefs.get(TOOL, 'countin', false) === true
    };
    const ui = { ...saved };

    /* vibrazione corta a ogni scatto: solo se il dispositivo la supporta e
       c'e' gia' stata un'interazione (altrimenti il browser la rifiuta) */
    function buzz() {
        if (typeof navigator.vibrate !== 'function') return;
        if (!(navigator.userActivation && navigator.userActivation.hasBeenActive)) return;
        const t = now();
        if (t - lastBuzz < BUZZ_MS) return;
        lastBuzz = t;
        try { navigator.vibrate(5); } catch (e) { /* vibrazione negata */ }
    }

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
            const d = ev.data;
            if (!d) return;
            if (d.kind !== 'count' && dotsBox) dotsBox.classList.remove('is-count');
            if (d.cambio) buildDots(); // preset arrivato sul battere: la battuta puo' essere un'altra
            if (d.isPulse) lightDot(d.pulse, now);
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
        if (dotsBox) dotsBox.classList.remove('is-count');
    }

    /* Il motore ha un preset in attesa del battere e arriva un comando
       manuale: vince il comando, con tutto quello che la pagina mostra gia'
       (i valori del preset compresi). Altrimenti il comando e basta. */
    function toEngine(apply) {
        if (!engine) return;
        if (engine.hasPending()) {
            engine.setBpm(ui.bpm);
            engine.setMeter(ui.meter);
            engine.setSubdiv(ui.subdiv);
            engine.setSound(ui.sound);
            buildDots();
            return;
        }
        apply();
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
        if (wheel) {
            wheel.setAttribute('aria-valuenow', String(ui.bpm));
            wheel.setAttribute('aria-valuetext', ui.bpm + ' BPM');
        }
    }

    function setBpm(v, { fromControl = false } = {}) {
        const n = clampBpm(v);
        if (n === ui.bpm) return;
        ui.bpm = n;
        toEngine(() => engine.setBpm(n));
        renderBpm();
        markCurrent();
        buzz();
        if (!fromControl && bpmControl) bpmControl.sync(n); // la rotella segue
        saveSoon();
    }

    function setMeter(m) {
        if (!METERS[m]) return;
        ui.meter = m;
        toEngine(() => engine.setMeter(m));
        markGroup(metersBox, 'data-met-meter', m);
        buildDots();
        markCurrent();
        saveSoon();
    }

    function setSubdiv(n) {
        const v = Number(n);
        if (SUBS.indexOf(v) === -1) return;
        ui.subdiv = v;
        toEngine(() => engine.setSubdiv(v));
        markGroup(subsBox, 'data-met-sub', v);
        markCurrent();
        saveSoon();
    }

    function setSound(s) {
        if (SOUNDS.indexOf(s) === -1) return;
        ui.sound = s;
        toEngine(() => engine.setSound(s));
        markGroup(soundsBox, 'data-met-sound', s);
        markCurrent();
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
        /* per i test (spec 21 §4): i tempi PRENOTATI, quelli passati allo
           scheduler, non misurati. Un dispatchEvent per click. */
        engine = createEngine({
            ctx,
            onBeat: (d) => {
                root.dispatchEvent(new CustomEvent('met-prenotato', {
                    detail: { time: d.time, kind: d.kind, pulse: d.pulse, bpm: d.bpm }
                }));
            }
        });
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
        eng.start({ countIn: ui.countin });
        renderToggle(true);
        stopFrames();
        if (ui.countin && dotsBox) dotsBox.classList.add('is-count');
        raf = window.requestAnimationFrame(frame);
        wakeLock(true);
    }

    function stop({ keepStatus = false } = {}) {
        if (engine) engine.stop();
        renderToggle(false);
        stopFrames();
        if (dots.length !== METERS[ui.meter].pulses) buildDots(); // preset rimasto in attesa del battere
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

    /* --- rotella BPM + campo numerico: shared/bpm-control.js (spec 12 §4).
       Stessi elementi, stesse classi (met-tick/is-major/is-dragging) e
       stesso CSS di prima: qui resta solo il collegamento. --- */
    const bpmControl = createBpmControl({
        wheel,
        drum,
        readout: bpmOut,
        input: bpmInput,
        min: BPM_MIN,
        max: BPM_MAX,
        value: ui.bpm,
        ticks: WHEEL_TICKS,
        tickPx: TICK_PX,
        pxPerBpm: WHEEL_PX,
        classes: { tick: 'met-tick', major: 'is-major', dragging: 'is-dragging' },
        onChange: (v) => setBpm(v, { fromControl: true })
    });

    /* --- modalita' Counter (spec 10 §11.3) --- */
    function onCounterKey(e) {
        if (e.key === 'Escape' || e.key === 'Esc') {
            e.preventDefault();
            closeCounter(true);
            return;
        }
        if (e.key === 'Tab') {
            e.preventDefault(); // un solo comando: il fuoco resta sulla X
            if (counterClose) counterClose.focus();
        }
        if (e.key === ' ' || e.code === 'Space') e.stopPropagation();
    }

    /* Numero grande = BPM stimato (dal secondo tap in poi); sotto, piccolo,
       quanti tap sono stati contati. "tap" e' uguale in IT e in EN. */
    function renderCounter() {
        if (!counterValue) return;
        counterValue.hidden = false;
        counterValue.textContent = counterBpm === null ? '\u2013' : String(counterBpm);
        let small = counterValue.querySelector('.met-counter-count');
        if (!small) {
            small = document.createElement('span');
            small.className = 'met-counter-count';
            counterValue.appendChild(small);
        }
        small.textContent = counterCount + ' tap';
    }

    function openCounter() {
        if (!counter) return;
        counterTap.reset();
        counterCount = 0;
        counterBpm = null;
        if (counterValue) {
            counterValue.textContent = '';
            counterValue.hidden = true;
        }
        if (counterHint) counterHint.hidden = false;
        counter.hidden = false;
        if (counterClose) counterClose.focus();
        document.addEventListener('keydown', onCounterKey, true);
    }

    function closeCounter(apply) {
        if (!counter || counter.hidden) return;
        document.removeEventListener('keydown', onCounterKey, true);
        counter.hidden = true;
        if (apply && counterBpm !== null) setBpm(counterBpm);
        if (countBtn && countBtn.focus) countBtn.focus();
    }

    if (countBtn) countBtn.addEventListener('click', openCounter);
    if (counter) {
        /* si conta il pointerdown, mai il click: su touch il browser manda
           anche eventi mouse sintetici e il tap verrebbe contato due volte */
        counter.addEventListener('pointerdown', (e) => {
            if (e.target.closest && e.target.closest('#met-counter-close')) return;
            e.preventDefault();
            counterCount += 1;
            const bpm = counterTap.tap(now());
            if (bpm !== null) counterBpm = bpm;
            if (counterHint) counterHint.hidden = true;
            renderCounter();
        });
        counter.addEventListener('click', (e) => {
            if (e.target.closest && e.target.closest('#met-counter-close')) closeCounter(true);
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

    /* ---- battuta d'attacco (spec 21 §3): vale al prossimo Avvia ---- */
    function renderCountin() {
        if (!countinBtn) return;
        countinBtn.setAttribute('aria-checked', ui.countin ? 'true' : 'false'); // switch, come impostazioni.js
        countinBtn.classList.toggle('is-on', ui.countin);
    }

    if (countinBtn) {
        countinBtn.addEventListener('click', () => {
            ui.countin = !ui.countin;
            renderCountin();
            prefs.set(TOOL, 'countin', ui.countin);
        });
    }

    /* ---- preset e scaletta (spec 21 §3-4) ----
       La verita' e' l'archivio (collezione `metronomo-preset`); la pagina
       tiene una copia in memoria, scrive in fila e ricarica quando cambia
       da un'altra scheda o dalla sincronizzazione. */

    /** In fila: le scritture arrivano nell'ordine in cui l'utente le ha fatte. */
    function accoda(job) {
        const giro = fila.then(job);
        fila = giro.catch(() => { /* chi ha accodato gestisce l'errore */ });
        return giro;
    }

    function presetMsg(kind, key, vars) {
        if (!presetStatus) return;
        if (!key) {
            presetStatus.textContent = '';
            presetStatus.removeAttribute('data-i18n');
            return;
        }
        setStatus(presetStatus, { kind });
        /* con le variabili il testo non si rifa' da solo al cambio lingua */
        if (vars) presetStatus.removeAttribute('data-i18n');
        else presetStatus.setAttribute('data-i18n', key);
        presetStatus.textContent = t(key, vars);
    }

    function erroreScrittura(e) {
        if (e instanceof ErroreLimite || (e && e.codice === 'limite')) {
            presetMsg('error', 'met-preset-limit', { max: LIMITI[PRESET].voci });
        } else {
            console.warn('[metronomo] preset non salvato:', e && e.message);
            presetMsg('error', 'met-preset-readonly');
        }
    }

    function markCurrent() {
        if (!presetList) return;
        [...presetList.querySelectorAll('[data-met-preset]')].forEach((li) => {
            const on = uguale(trovaPreset(li.getAttribute('data-met-preset')), ui);
            li.classList.toggle('is-current', on);
            const btn = li.querySelector('.met-preset-apply');
            if (btn) {
                if (on) btn.setAttribute('aria-current', 'true');
                else btn.removeAttribute('aria-current');
            }
        });
    }

    function renderNext() {
        if (!presetNext) return;
        const dopo = successivo(presets, ultimoPreset);
        presetNext.hidden = presets.length < 2;
        presetNext.disabled = !dopo;
        /* sotto «Avanti» il nome di quello che applicherebbe */
        if (presetNextSub) presetNextSub.textContent = dopo ? t('met-preset-next-sub', { nome: dopo.nome }) : '';
    }

    function renderReadonly() {
        const ro = inSolaLettura();
        if (presetSave) presetSave.disabled = ro;
        if (presetList) {
            [...presetList.querySelectorAll('.met-preset-rename, .met-preset-del')]
                .forEach((b) => { b.disabled = ro; });
        }
        if (ro) presetMsg('error', 'met-preset-readonly');
    }

    /** Pulsante icona della riga, con il suo tip (come le righe del DNA). */
    function icona(cls, key, glyph, onClick) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = cls + ' tb-btn--icon';
        b.setAttribute('data-i18n-aria', key);
        b.setAttribute('aria-label', t(key));
        b.setAttribute('data-tip', key);
        b.textContent = glyph;
        b.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
        return b;
    }

    function rigaPreset(p) {
        const li = document.createElement('li');
        li.className = 'met-preset';
        li.setAttribute('data-met-preset', p.id);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'met-preset-apply';
        const nome = document.createElement('span');
        nome.className = 'met-preset-name';
        nome.textContent = p.nome;
        const sum = document.createElement('span');
        sum.className = 'met-preset-sum';
        sum.textContent = riassunto(p, t);
        btn.append(nome, sum);
        btn.addEventListener('click', () => applicaPreset(p.id));
        li.append(
            btn,
            icona('met-preset-rename', 'met-preset-rename', '✎', () => startRename(p.id)),
            icona('met-preset-del', 'met-preset-delete', '×', () => removePreset(p.id))
        );
        return li;
    }

    function renderPresets() {
        if (!presetList) return;
        presetList.textContent = '';
        presets.forEach((p) => presetList.appendChild(rigaPreset(p)));
        if (presetEmpty) presetEmpty.hidden = presets.length > 0;
        markCurrent();
        renderNext();
        renderReadonly();
    }

    /** Dall'archivio, dopo le scritture gia' in fila di questa scheda. */
    function loadPresets() {
        return accoda(() => elenca(PRESET)).then((recs) => {
            if (rinomina !== null || toccoInCorso) { daRicaricare = true; return; }
            presets = ordina(pulisci(recs));
            if (ultimoPreset !== null && !trovaPreset(ultimoPreset)) ultimoPreset = null;
            renderPresets();
        }, () => {
            /* senza IndexedDB: elenco vuoto, il salvataggio lo dira' */
            renderPresets();
        });
    }

    function applicaPreset(id) {
        const p = trovaPreset(id);
        if (!p) return;
        ultimoPreset = p.id;
        setVolume(p.volume);   // il volume subito, anche in corsa
        if (engine && engine.isRunning()) {
            /* in corsa: la pagina mostra subito i valori nuovi, il motore li
               suona dal prossimo battere (i pallini si rifanno li') */
            ui.bpm = p.bpm;
            ui.meter = p.meter;
            ui.subdiv = p.subdiv;
            ui.sound = p.sound;
            renderBpm();
            if (bpmControl) bpmControl.sync(p.bpm);
            markGroup(metersBox, 'data-met-meter', p.meter);
            markGroup(subsBox, 'data-met-sub', p.subdiv);
            markGroup(soundsBox, 'data-met-sound', p.sound);
            engine.applicaAlBattere(p);
            saveSoon();
        } else {
            setBpm(p.bpm);
            setMeter(p.meter);
            setSubdiv(p.subdiv);
            setSound(p.sound);
        }
        markCurrent();
        renderNext();
    }

    function savePreset() {
        if (inSolaLettura()) { presetMsg('error', 'met-preset-readonly'); return; }
        if (presets.length >= LIMITI[PRESET].voci) {
            presetMsg('error', 'met-preset-limit', { max: LIMITI[PRESET].voci });
            return;
        }
        presetMsg(null);
        const p = {
            id: nuovoId(presets),
            nome: nomeProposto(ui),
            bpm: ui.bpm,
            meter: ui.meter,
            subdiv: ui.subdiv,
            sound: ui.sound,
            volume: ui.volume
        };
        presets = ordina(presets.concat([p]));
        renderPresets();
        /* la riga nasce in rinomina, dentro il gesto (tastiera su iOS) */
        startRename(p.id);
        accoda(() => scrivi(PRESET, p.id, datiPreset(p))).catch((e) => {
            presets = presets.filter((x) => x.id !== p.id);
            if (rinomina === p.id) rinomina = null;
            renderPresets();
            erroreScrittura(e);
        });
    }

    function startRename(id) {
        if (!presetList || inSolaLettura()) return;
        const p = trovaPreset(id);
        const li = [...presetList.querySelectorAll('[data-met-preset]')]
            .find((x) => x.getAttribute('data-met-preset') === id);
        const btn = li ? li.querySelector('.met-preset-apply') : null;
        if (!p || !btn || li.querySelector('.met-preset-input')) return;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'met-preset-input';
        input.maxLength = NOME_MAX;
        input.autocomplete = 'off';
        input.value = p.nome;
        input.setAttribute('data-i18n-aria', 'met-preset-name-aria');
        input.setAttribute('aria-label', t('met-preset-name-aria'));
        rinomina = id;
        let fatto = false;
        const chiudi = (salva) => {
            if (fatto) return;
            fatto = true;
            rinomina = null;
            const nome = nomeValido(input.value);
            const cambia = salva && nome && nome !== p.nome && !!trovaPreset(id);
            if (cambia) {
                const prima = p.nome;
                p.nome = nome;
                /* un'altra scheda (o la sincronizzazione) puo' averlo eliminato
                   mentre si scriveva: si rilegge, e se non c'e' piu' la
                   rinomina si scarta invece di resuscitarlo */
                accoda(async () => {
                    if ((await leggi(PRESET, p.id)) === undefined) return false;
                    await scrivi(PRESET, p.id, datiPreset(p));
                    return true;
                }).then((scritto) => {
                    if (!scritto) loadPresets();
                }, (e) => {
                    p.nome = prima;
                    renderPresets();
                    erroreScrittura(e);
                });
            }
            const tornaSu = document.activeElement === input;
            /* si rifa' SOLO la riga in rinomina: col blur arriva prima del
               click, e un ridisegno di tutta la lista si mangerebbe il tocco
               su un'altra riga (applica o ×) */
            const li = input.closest('[data-met-preset]');
            if (li && trovaPreset(id)) {
                const nuova = rigaPreset(p);
                li.replaceWith(nuova);
                markCurrent();
                renderNext();
                renderReadonly();
                const b = nuova.querySelector('.met-preset-apply');
                if (tornaSu && b && b.focus) b.focus();
            } else if (li) {
                li.remove();
            }
            if (daRicaricare) { daRicaricare = false; loadPresets(); }
        };
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); chiudi(true); }
            else if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); e.stopPropagation(); chiudi(false); }
        });
        input.addEventListener('blur', () => chiudi(true));
        btn.replaceWith(input);
        input.focus();
        input.select();
    }

    function removePreset(id) {
        if (inSolaLettura()) { presetMsg('error', 'met-preset-readonly'); return; }
        const p = trovaPreset(id);
        if (!p) return;
        const at = presets.indexOf(p);
        presets = presets.filter((x) => x.id !== id);
        if (ultimoPreset === id) ultimoPreset = null;
        presetMsg(null);
        renderPresets();
        /* il fuoco non si perde: sulla riga che ha preso il posto, o su «Salva» */
        const rows = presetList ? presetList.querySelectorAll('.met-preset-apply') : [];
        const next = rows[Math.min(at, rows.length - 1)] || presetSave;
        if (next && next.focus) next.focus();
        accoda(() => elimina(PRESET, id)).catch((e) => {
            presets = ordina(presets.concat([p]));
            renderPresets();
            erroreScrittura(e);
        });
        if (chiudiToast) { try { chiudiToast(); } catch (e) { /* gia' chiuso */ } }
        const copia = datiPreset(p);
        /* «Annulla» riscrive lo stesso id con gli stessi dati (schema dash.js) */
        chiudiToast = toast('met-preset-deleted', {
            vars: { nome: p.nome },
            timeout: 8000,
            action: {
                key: 'met-preset-undo',
                onClick: () => {
                    if (trovaPreset(id)) return;
                    const back = { id, ...copia };
                    presets = ordina(presets.concat([back]));
                    renderPresets();
                    accoda(() => scrivi(PRESET, id, copia)).catch((e) => {
                        presets = presets.filter((x) => x.id !== id);
                        renderPresets();
                        erroreScrittura(e);
                    });
                }
            }
        });
    }

    if (presetSave) presetSave.addEventListener('click', savePreset);
    /* un ricaricamento arrivato mentre il dito e' giu' sulla lista aspetta
       il click che segue (setTimeout 0: dopo pointerup e click) */
    if (presetList) {
        presetList.addEventListener('pointerdown', () => { toccoInCorso = true; }, true);
        const fine = () => {
            if (!toccoInCorso) return;
            setTimeout(() => {
                toccoInCorso = false;
                if (daRicaricare && rinomina === null) { daRicaricare = false; loadPresets(); }
            }, 0);
        };
        document.addEventListener('pointerup', fine, true);
        document.addEventListener('pointercancel', fine, true);
    }
    if (presetNext) {
        presetNext.addEventListener('click', () => {
            const p = successivo(presets, ultimoPreset);
            if (p) applicaPreset(p.id);
        });
    }
    /* le altre schede, e questa quando scrive la sincronizzazione (spec 18 §4) */
    onArchivio(PRESET, (m) => {
        if (m && m.locale && m.origine !== 'sync') return;
        loadPresets();
    }, { locali: true });
    onLang(() => { if (rinomina === null) renderPresets(); });

    /* ---- stato iniziale ---- */
    mountRanges(document); // il cursore del volume si colora fino al valore
    renderBpm();
    markGroup(metersBox, 'data-met-meter', ui.meter);
    markGroup(subsBox, 'data-met-sub', ui.subdiv);
    markGroup(soundsBox, 'data-met-sound', ui.sound);
    if (volume) volume.value = String(ui.volume);
    buildDots();
    renderToggle(false);
    renderCountin();
    loadPresets();

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
        dots: () => dots,
        ticks: () => (drum ? [...drum.children] : []),
        openCounter,
        closeCounter
    };
}

/* Avvio della pagina (nel browser; nei test il modulo si importa e basta). */
if (typeof document !== 'undefined' && document.getElementById('met')) {
    init(commonDict, toolDict);
    pressFeedback(document);
    mountBar({ page: 'tool', current: TOOL }); // niente titolo in barra (spec 10 §11.6)
    initPwa({
        installBtn: document.getElementById('tb-menu-install'),
        iosHelp: document.getElementById('tb-menu-ios'),
        installSection: document.querySelector('.tb-menu-install-group')
    });
    mountMetronome();
    /* «Come funziona», riga del primo avvio, tip dei pulsanti icona (spec 18 §6) */
    try { mountAiuto({ slug: TOOL }); } catch (e) { console.warn('[aiuto] non montato:', e && e.message); }
    /* le preferenze viaggiano con la sincronizzazione (spec 18 §4): giro
       all'apertura e 3 s dopo i salvataggi; senza codice niente rete */
    avviaSync().catch(() => { /* senza IndexedDB resta spenta */ });
}
