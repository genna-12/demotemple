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
import { createStringVoices, voiceFor } from '/shared/strings.js';
import { mountSelects } from '/shared/select.js';
import { mountInfos } from '/shared/sheet.js';

const TOOL = 'accordatore';
const A4_MIN = 415;
const A4_MAX = 466;
const A4_DEFAULT = 440;
const IN_TUNE_CENTS = 5;      // entro questi cent la nota e' giusta
const NEAR_CENTS = 150;       // oltre, la corda non e' quella
const LOOP_EVERY = 4000;      // ms fra due ripetizioni con #acc-loop attivo
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
    const loopHint = document.getElementById('acc-loop-hint');
    const a4Reset = document.getElementById('acc-a4-reset');
    const micOff = document.getElementById('acc-mic-off');
    const keysBox = document.getElementById('acc-keys');
    const octaveBox = document.getElementById('acc-key-octave');
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
    let strings = null;       // voci di riferimento (shared/strings.js)
    let loopTimer = null;
    let stringFreqs = [];
    let stringBtns = [];
    let keyNote = null;       // nota scelta sulla tastiera cromatica
    let keyOctave = 4;

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
        markKeys();
        renderLoop();
    }

    function markKeys() {
        if (!keysBox) return;
        [...keysBox.querySelectorAll('[data-acc-note]')].forEach((b) => {
            b.classList.toggle('is-target', b.getAttribute('data-acc-note') === keyNote);
        });
        if (!octaveBox) return;
        [...octaveBox.querySelectorAll('[data-acc-octave]')].forEach((b) => {
            const on = Number(b.getAttribute('data-acc-octave')) === keyOctave;
            b.setAttribute('aria-checked', on ? 'true' : 'false');
            b.classList.toggle('is-active', on);
        });
    }

    /* una nota scelta: una corda (strumenti) o un tasto (cromatica) */
    const chromatic = () => ui.instrument === 'chromatic';
    const chosen = () => (chromatic() ? keyNote !== null : target >= 0);
    const chosenHz = () => (chromatic()
        ? (keyNote === null ? 0 : noteToHz(keyNote + keyOctave, ui.a4))
        : (stringFreqs[target] || 0));

    /* "Suona in loop" resta spento finche' non si sceglie una nota */
    function renderLoop() {
        if (!loopBtn) return;
        const ready = chosen();
        loopBtn.disabled = !ready;
        if (!ready && ui.loop) {
            ui.loop = false;
            loopBtn.setAttribute('aria-pressed', 'false');
            loopBtn.classList.remove('is-on');
            stopLoop();
        }
        if (loopHint) loopHint.hidden = ready;
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

    function voices() {
        if (strings) return strings;
        try {
            unlock().catch(() => { /* serve un gesto: lo dice lo stato */ });
            strings = createStringVoices(getContext());
        } catch (e) {
            setStatus(status, { kind: 'error', key: 'audio-resume-msg' });
            return null;
        }
        return strings;
    }

    /** Nota di riferimento: corda pizzicata (o arcata sul violino). */
    function playNote(hz) {
        const v = voices();
        if (!v) return;
        v.play(hz, voiceFor(ui.instrument));
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
        if (ui.loop) loopTimer = setTimeout(() => playString(i), LOOP_EVERY);
    }

    /** Suona quel che e' scelto adesso (corda o tasto), eventualmente in loop. */
    function playChosen() {
        const hz = chosenHz();
        if (!(hz > 0)) return;
        stopLoop();
        playNote(hz);
        if (ui.loop) loopTimer = setTimeout(playChosen, LOOP_EVERY);
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

    /* "Disattiva microfono": solo in Ascolto e solo se il permesso c'e' */
    function renderMicOff() {
        if (!micOff) return;
        micOff.hidden = !(ui.mode === 'listen' && mic.state() === 'granted');
    }

    function renderConsent() {
        if (!consentBox) return;
        if (ui.mode !== 'listen') { consentBox.textContent = ''; return; }
        if (mic.state() === 'granted' && tracker && tracker.running()) {
            consentBox.textContent = '';
            renderMicOff();
            return;
        }
        mic.renderConsent(consentBox, { onAllow: startListening });
        renderMicOff();
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
            renderMicOff();
            micStatus();
            return;
        }
        if (reason === 'lost' || reason === 'ended' || reason === 'suspended') {
            clearReading();
            setStatus(status, { kind: 'error', key: 'acc-mic-lost' });
            return;
        }
        renderConsent();
        renderMicOff();
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
            renderMicOff();
            micStatus();
            if (mic.state() === 'granted') startListening();
        } else {
            stopListening();
            if (consentBox) consentBox.textContent = '';
            if (micOff) micOff.hidden = true;
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
            root.setAttribute('data-acc-instrument', ui.instrument);
            stopLoop();
            keyNote = null;
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
                playChosen();
                return;
            }
            target = target === i ? -1 : i; // in ascolto: scegli/lascia la corda
            markStrings(-1);
        });
    }

    function setA4(v) {
        ui.a4 = clampA4(v);
        if (a4Input && Number(a4Input.value) !== ui.a4) a4Input.value = String(ui.a4);
        if (a4Value) a4Value.textContent = ui.a4 + ' Hz';
        if (a4Reset) a4Reset.disabled = ui.a4 === A4_DEFAULT;
        prefs.set(TOOL, 'a4', ui.a4);
        stringFreqs = tuning().strings.map((n) => noteToHz(n, ui.a4));
        applyRange();
    }

    if (a4Input) a4Input.addEventListener('input', () => setA4(a4Input.value));
    if (a4Reset) a4Reset.addEventListener('click', () => setA4(A4_DEFAULT));

    /* tastiera cromatica (solo in Riferimento, spec 03 §6) */
    if (keysBox) {
        keysBox.addEventListener('click', (e) => {
            const b = e.target.closest('[data-acc-note]');
            if (!b) return;
            keyNote = b.getAttribute('data-acc-note');
            target = -1;
            markStrings(-1);
            playChosen();
        });
    }
    if (octaveBox) {
        octaveBox.addEventListener('click', (e) => {
            const b = e.target.closest('[data-acc-octave]');
            if (!b) return;
            keyOctave = Number(b.getAttribute('data-acc-octave'));
            markKeys();
            if (keyNote !== null) playChosen();
        });
    }

    if (micOff) {
        micOff.addEventListener('click', () => {
            stopListening();
            mic.revoke();       // torna a 'unasked': ricompare il box del consenso
            renderConsent();
            renderMicOff();
            micStatus();
        });
    }

    if (loopBtn) {
        loopBtn.addEventListener('click', () => {
            if (!chosen()) return;
            ui.loop = !ui.loop;
            loopBtn.setAttribute('aria-pressed', ui.loop ? 'true' : 'false');
            loopBtn.classList.toggle('is-on', ui.loop);
            if (ui.loop) playChosen();
            else stopLoop();
        });
    }

    window.addEventListener('pagehide', () => {
        stopLoop();
        if (strings) strings.stop();
        stopListening();
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'hidden') return;
        stopLoop(); // mic.js ferma da se' le tracce
        if (strings) strings.stop();
    });

    /* ---------------- stato iniziale ---------------- */

    mountSelects(document);   // il <select> nativo diventa la pillola glass
    mountInfos(document);     // la "i" apre il foglio
    if (instrument) instrument.value = ui.instrument;
    if (a4Input) a4Input.value = String(ui.a4);
    setA4(ui.a4);
    root.setAttribute('data-acc-instrument', ui.instrument);
    buildStrings();
    markKeys();
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
        setA4,
        playChosen,
        chosen,
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
