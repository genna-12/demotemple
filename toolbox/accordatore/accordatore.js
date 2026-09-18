/**
 * Tiny Temple Toolbox - Accordatore (spec 11).
 *
 * Due modalita': Riferimento (si suona la nota giusta) e Ascolto (si misura
 * quella che arriva dal microfono). L'analisi sta in shared/pitch.js, il
 * consenso e lo stream in shared/mic.js: qui c'e' la pagina.
 *
 * Aggancia solo gli id del contratto (spec 11 §6): #acc-mode
 * [data-acc-mode], #acc-consent, #acc-instrument, #acc-strings (vuoto: le
 * corde le crea questo file), #acc-note, #acc-octave, #acc-cents,
 * #acc-gauge (+ .acc-needle), #acc-a4, #acc-a4-value, #acc-loop,
 * #acc-status. Non tocca HTML ne' CSS.
 */

import commonDict from '/shared/i18n-common.js';
import toolDict from '/accordatore/i18n.js';
import { init, t } from '/shared/i18n.js';
import { pressFeedback, setStatus } from '/shared/ui.js';
import { mountBar } from '/shared/nav.js';
import { initPwa } from '/shared/pwa.js';
import { getContext, unlock, needsGesture, onStateChange } from '/shared/audio.js';
import * as mic from '/shared/mic.js';
import { prefs } from '/shared/storage.js';
import { createPitchTracker, noteInfo, noteToHz, nearestIndex } from '/shared/pitch.js';

const TOOL = 'accordatore';
const A4_MIN = 415;
const A4_MAX = 466;
const A4_DEFAULT = 440;
const IN_TUNE_CENTS = 5;      // entro questi cent la nota e' giusta
const NEAR_CENTS = 150;       // oltre, la corda non e' quella
const TONE_SECONDS = 2;       // durata di una nota di riferimento
const TONE_RELEASE = 0.03;    // rilascio della nota precedente
const LOOP_GAP = 0.25;        // pausa fra due ripetizioni
const SPRING_MS = 60;         // costante dell'ago (molla critica)
const SPEAK_MS = 700;         // throttle degli annunci

/* Accordature (spec 11 §5). `flats` cambia solo come si scrivono le note. */
export const TUNINGS = {
    guitar: { key: 'acc-inst-guitar', strings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
    'drop-d': { key: 'acc-inst-drop-d', strings: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
    dadgad: { key: 'acc-inst-dadgad', strings: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'] },
    'half-step': { key: 'acc-inst-half-step', flats: true, strings: ['Eb2', 'Ab2', 'Db3', 'Gb3', 'Bb3', 'Eb4'] },
    bass4: { key: 'acc-inst-bass4', strings: ['E1', 'A1', 'D2', 'G2'] },
    bass5: { key: 'acc-inst-bass5', strings: ['B0', 'E1', 'A1', 'D2', 'G2'] },
    ukulele: { key: 'acc-inst-ukulele', strings: ['G4', 'C4', 'E4', 'A4'] },
    violin: { key: 'acc-inst-violin', strings: ['G3', 'D4', 'A4', 'E5'] },
    chromatic: { key: 'acc-inst-chromatic', strings: [] }
};

const clampA4 = (v) => Math.min(A4_MAX, Math.max(A4_MIN, Math.round(Number(v) || A4_DEFAULT)));

export function mountTuner() {
    const root = document.getElementById('acc');
    if (!root) return null;

    const modeBox = document.getElementById('acc-mode');
    const consentBox = document.getElementById('acc-consent');
    const instrument = document.getElementById('acc-instrument');
    const stringsBox = document.getElementById('acc-strings');
    const noteOut = document.getElementById('acc-note');
    const octaveOut = document.getElementById('acc-octave');
    const centsOut = document.getElementById('acc-cents');
    const gauge = document.getElementById('acc-gauge');
    const needle = gauge ? gauge.querySelector('.acc-needle') : null;
    const a4Input = document.getElementById('acc-a4');
    const a4Value = document.getElementById('acc-a4-value');
    const loopBtn = document.getElementById('acc-loop');
    const status = document.getElementById('acc-status');

    const ui = {
        mode: 'reference',
        instrument: TUNINGS[prefs.get(TOOL, 'instrument', 'guitar')] ? prefs.get(TOOL, 'instrument', 'guitar') : 'guitar',
        a4: clampA4(prefs.get(TOOL, 'a4', A4_DEFAULT)),
        loop: false
    };

    let tracker = null;
    let raf = null;
    let target = -1;          // corda scelta a mano (-1 = automatica)
    let cents = 0;            // valore letto
    let shownCents = 0;       // valore dell'ago (insegue `cents`)
    let lastFrame = 0;
    let lastSpoken = 0;
    let lastSpeech = '';
    let voice = null;         // nota di riferimento in corso
    let loopTimer = null;
    let stringFreqs = [];
    let stringBtns = [];

    const tuning = () => TUNINGS[ui.instrument] || TUNINGS.guitar;

    /* ---------------- corde ---------------- */

    function buildStrings() {
        if (!stringsBox) return;
        const info = tuning();
        stringFreqs = info.strings.map((n) => noteToHz(n, ui.a4));
        stringsBox.textContent = '';
        stringBtns = info.strings.map((name, i) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'acc-string';
            b.setAttribute('data-acc-string', String(i));
            b.textContent = name;
            stringsBox.appendChild(b);
            return b;
        });
        target = -1;
        markStrings(-1);
    }

    function markStrings(nearIndex) {
        stringBtns.forEach((b, i) => {
            b.classList.toggle('is-target', i === target);
            b.classList.toggle('is-near', i !== target && i === nearIndex);
        });
    }

    /* ---------------- lettura ---------------- */

    function clearReading() {
        cents = 0;
        if (noteOut) {
            noteOut.textContent = '—';
            noteOut.removeAttribute('aria-label');
        }
        if (octaveOut) octaveOut.textContent = '';
        if (centsOut) centsOut.textContent = '';
        if (gauge) gauge.classList.remove('is-in-tune');
        markStrings(-1);
    }

    function speak(text) {
        if (!noteOut) return;
        const now = Date.now();
        if (text === lastSpeech || now - lastSpoken < SPEAK_MS) return;
        lastSpoken = now;
        lastSpeech = text;
        noteOut.setAttribute('aria-label', text);
    }

    /* Sotto la corda piu' bassa meno un tono non c'e' musica, solo ronzio:
       si stringe la banda dell'analizzatore (cromatica: tutto). */
    function applyRange() {
        if (!tracker) return;
        const lows = stringFreqs.filter((f) => f > 0);
        const lo = lows.length ? Math.min(...lows) * Math.pow(2, -2 / 12) : 28;
        tracker.setRange(lo, 1400);
    }

    function showPitch(hz) {
        const info = noteInfo(hz, ui.a4, { flats: !!tuning().flats });
        const near = stringFreqs.length ? nearestIndex(hz, stringFreqs, NEAR_CENTS) : -1;
        /* con una corda scelta a mano si misura rispetto a quella */
        let value = info.cents;
        let label = info.note;
        let octave = info.octave;
        if (target >= 0 && stringFreqs[target]) {
            value = Math.round(1200 * Math.log2(hz / stringFreqs[target]));
            value = Math.max(-50, Math.min(50, value));
            label = tuning().strings[target].replace(/-?\d+$/, '');
            octave = Number(tuning().strings[target].match(/-?\d+$/)[0]);
        }
        cents = value;
        startFrames();
        if (noteOut) noteOut.textContent = label;
        if (octaveOut) octaveOut.textContent = String(octave);
        if (centsOut) centsOut.textContent = (value > 0 ? '+' : '') + value;
        const inTune = Math.abs(value) <= IN_TUNE_CENTS;
        if (gauge) gauge.classList.toggle('is-in-tune', inTune);
        markStrings(near);
        speak(label + octave + ' ' + t(inTune ? 'acc-in-tune' : value < 0 ? 'acc-flat' : 'acc-sharp'));
    }

    /* ago: molla critica, nessun timer (spec 11 §4) */
    function frame(now) {
        const dt = lastFrame ? Math.min(0.1, (now - lastFrame) / 1000) : 0;
        lastFrame = now;
        const k = dt > 0 ? 1 - Math.exp(-dt * 1000 / SPRING_MS) : 1;
        shownCents += (cents - shownCents) * k;
        if (needle && gauge) {
            const half = (gauge.clientWidth || 240) / 2 - 8;
            needle.style.setProperty('transform',
                'translateX(' + (shownCents / 50 * half).toFixed(2) + 'px)');
        }
        raf = window.requestAnimationFrame(frame);
    }

    function startFrames() {
        if (raf !== null) return;
        lastFrame = 0;
        raf = window.requestAnimationFrame(frame);
    }

    function stopFrames() {
        if (raf !== null) window.cancelAnimationFrame(raf);
        raf = null;
        shownCents = 0;
        if (needle) needle.style.removeProperty('transform');
    }

    /* ---------------- nota di riferimento ---------------- */

    function releaseVoice(ctx, when) {
        if (!voice) return;
        const v = voice;
        voice = null;
        const at = when || ctx.currentTime;
        try {
            v.gain.gain.cancelScheduledValues(at);
            v.gain.gain.setValueAtTime(Math.max(0.0001, v.gain.gain.value), at);
            v.gain.gain.exponentialRampToValueAtTime(0.0001, at + TONE_RELEASE);
            v.oscs.forEach((o) => o.stop(at + TONE_RELEASE + 0.01));
        } catch (e) { /* voce gia' finita */ }
    }

    /** Nota con fondamentale + 2a (-10 dB) + 3a (-16 dB), spec 11 §5. */
    function playNote(hz) {
        let ctx;
        try {
            unlock().catch(() => { /* serve un gesto: lo dice lo stato */ });
            ctx = getContext();
        } catch (e) {
            setStatus(status, { kind: 'error', key: 'audio-resume-msg' });
            return;
        }
        const t0 = ctx.currentTime + 0.01;
        releaseVoice(ctx, t0);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.5, t0 + 0.008); // attacco 8 ms
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.8); // decadimento 1,8 s
        gain.connect(ctx.destination);
        const oscs = [1, 2, 3].map((n) => {
            const o = ctx.createOscillator();
            o.type = 'sine';
            o.frequency.setValueAtTime(hz * n, t0);
            const g = ctx.createGain();
            g.gain.value = n === 1 ? 1 : n === 2 ? 0.316 : 0.158; // -10 dB, -16 dB
            o.connect(g).connect(gain);
            o.start(t0);
            o.stop(t0 + TONE_SECONDS);
            return o;
        });
        const v = { gain, oscs };
        voice = v;
        oscs[0].onended = () => {
            if (voice === v) voice = null;
            try {
                gain.disconnect();
                oscs.forEach((o) => o.disconnect());
            } catch (e) { /* gia' scollegati */ }
        };
    }

    function stopLoop() {
        if (loopTimer) clearTimeout(loopTimer);
        loopTimer = null;
    }

    function playString(i) {
        const hz = stringFreqs[i];
        if (!(hz > 0)) return;
        stopLoop();
        playNote(hz);
        if (ui.loop) {
            loopTimer = setTimeout(() => playString(i), (TONE_SECONDS + LOOP_GAP) * 1000);
        }
    }

    /* ---------------- microfono ---------------- */

    function micStatus() {
        const s = mic.state();
        if (s === 'unavailable') {
            setStatus(status, { kind: 'denied', key: isInApp() ? 'acc-inapp' : 'mic-unavailable' });
            return;
        }
        if (s === 'denied') { setStatus(status, { kind: 'denied', key: 'mic-denied' }); return; }
        if (s === 'granted' && tracker && tracker.running()) {
            setStatus(status, { kind: 'busy', key: 'acc-listening' });
            return;
        }
        setStatus(status, { kind: 'idle', key: 'acc-no-signal' });
    }

    function isInApp() {
        const ua = navigator.userAgent || '';
        return /FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|Line\/|Snapchat|TikTok|musical_ly|BytedanceWebview/i.test(ua);
    }

    function renderConsent() {
        if (!consentBox) return;
        if (ui.mode !== 'listen') { consentBox.textContent = ''; return; }
        if (mic.state() === 'granted' && tracker && tracker.running()) {
            consentBox.textContent = '';
            return;
        }
        mic.renderConsent(consentBox, { onAllow: startListening });
        if (mic.state() === 'unavailable' && isInApp()) {
            setStatus(status, { kind: 'denied', key: 'acc-inapp' });
        }
    }

    /* gira DENTRO il gesto: prima unlock(), poi il microfono */
    function startListening() {
        let ctx = null;
        try {
            unlock().catch(() => {});
            ctx = getContext();
        } catch (e) { /* niente Web Audio: lo dira' lo stato */ }
        if (!tracker) {
            tracker = createPitchTracker({
                ctx,
                onPitch: ({ hz }) => showPitch(hz),
                onSilence: () => {
                    clearReading();
                    setStatus(status, { kind: 'idle', key: 'acc-no-signal' });
                },
                onError: () => setStatus(status, { kind: 'error', key: 'acc-mic-lost' })
            });
        }
        applyRange();
        setStatus(status, { kind: 'busy', key: 'acc-listening' });
        tracker.start().then(() => {
            startFrames();
            renderConsent();
            micStatus();
        }, () => {
            micStatus();
            renderConsent();
        });
    }

    function stopListening() {
        if (tracker) tracker.stop();
        stopFrames();
        clearReading();
    }

    mic.onStateChange((state, info) => {
        if (ui.mode !== 'listen') return;
        const reason = info && info.reason;
        if (reason === 'resumed') {
            if (tracker) tracker.rebuild();
            micStatus();
            return;
        }
        if (reason === 'lost' || reason === 'ended' || reason === 'suspended') {
            clearReading();
            setStatus(status, { kind: 'error', key: 'acc-mic-lost' });
            return;
        }
        renderConsent();
        micStatus();
    });

    onStateChange(() => {
        if (ui.mode === 'listen' && needsGesture()) {
            setStatus(status, { kind: 'idle', key: 'audio-resume-msg' });
        }
    });

    /* ---------------- modalita' ---------------- */

    function setMode(mode) {
        const next = mode === 'listen' ? 'listen' : 'reference';
        if (next === ui.mode) return;
        ui.mode = next;
        root.setAttribute('data-acc-mode', next);
        if (modeBox) {
            [...modeBox.querySelectorAll('[data-acc-mode]')].forEach((b) => {
                const on = b.getAttribute('data-acc-mode') === next;
                b.setAttribute('aria-checked', on ? 'true' : 'false');
                b.classList.toggle('is-active', on);
            });
        }
        if (next === 'listen') {
            stopLoop();
            renderConsent();
            micStatus();
            if (mic.state() === 'granted') startListening();
        } else {
            stopListening();
            if (consentBox) consentBox.textContent = '';
            if (status) status.textContent = '';
        }
    }

    /* ---------------- eventi ---------------- */

    if (modeBox) {
        modeBox.addEventListener('click', (e) => {
            const b = e.target.closest('[data-acc-mode]');
            if (b) setMode(b.getAttribute('data-acc-mode'));
        });
    }

    if (instrument) {
        instrument.addEventListener('change', () => {
            if (!TUNINGS[instrument.value]) return;
            ui.instrument = instrument.value;
            prefs.set(TOOL, 'instrument', ui.instrument);
            stopLoop();
            buildStrings();
            applyRange();
            clearReading();
        });
    }

    if (stringsBox) {
        stringsBox.addEventListener('click', (e) => {
            const b = e.target.closest('[data-acc-string]');
            if (!b) return;
            const i = Number(b.getAttribute('data-acc-string'));
            if (ui.mode === 'reference') {
                target = i;
                markStrings(-1);
                playString(i);
                return;
            }
            target = target === i ? -1 : i; // in ascolto: scegli/lascia la corda
            markStrings(-1);
        });
    }

    if (a4Input) {
        a4Input.addEventListener('input', () => {
            ui.a4 = clampA4(a4Input.value);
            if (a4Value) a4Value.textContent = ui.a4 + ' Hz';
            prefs.set(TOOL, 'a4', ui.a4);
            stringFreqs = tuning().strings.map((n) => noteToHz(n, ui.a4));
            applyRange();
        });
    }

    if (loopBtn) {
        loopBtn.addEventListener('click', () => {
            ui.loop = !ui.loop;
            loopBtn.setAttribute('aria-pressed', ui.loop ? 'true' : 'false');
            loopBtn.classList.toggle('is-on', ui.loop);
            if (!ui.loop) stopLoop();
        });
    }

    window.addEventListener('pagehide', () => {
        stopLoop();
        stopListening();
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'hidden') return;
        stopLoop(); // mic.js ferma da se' le tracce
    });

    /* ---------------- stato iniziale ---------------- */

    if (instrument) instrument.value = ui.instrument;
    if (a4Input) a4Input.value = String(ui.a4);
    if (a4Value) a4Value.textContent = ui.a4 + ' Hz';
    buildStrings();
    clearReading();
    setMode('reference');
    root.setAttribute('data-acc-mode', 'reference');

    return {
        ui,
        setMode,
        playString,
        strings: () => stringBtns,
        freqs: () => stringFreqs,
        showPitch,
        clearReading,
        tracker: () => tracker,
        target: () => target
    };
}

/* Avvio della pagina (nel browser; nei test il modulo si importa e basta). */
if (typeof document !== 'undefined' && document.getElementById('acc')) {
    init(commonDict, toolDict);
    pressFeedback(document);
    mountBar({ page: 'tool', current: TOOL });
    initPwa({
        installBtn: document.getElementById('tb-menu-install'),
        iosHelp: document.getElementById('tb-menu-ios'),
        installSection: document.querySelector('.tb-menu-install-group')
    });
    mountTuner();
}
