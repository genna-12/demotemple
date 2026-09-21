/**
 * Tiny Temple Toolbox - Accordatore (spec 11 + accordature personalizzate).
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
 *
 * =====================================================================
 * CONTRATTO per le ACCORDATURE PERSONALIZZATE (markup e CSS: builder)
 * =====================================================================
 * 1) Nel select strumento (#acc-instrument + .tb-select) serve, ULTIMA,
 *    la voce che apre l'editor:
 *      <option value="__custom__" data-i18n="acc-custom-new">Personalizzata…</option>
 *    e la corrispondente .tb-select-option[data-value="__custom__"].
 *    Le accordature salvate le inserisce accordatore.js PRIMA di quella
 *    voce, sia nel <select> nativo sia nel pannello, con
 *    value/data-value = "custom:<id>". Il builder non scrive quelle voci.
 *
 * 2) Accanto al select, due bottoni visibili solo con un'accordatura
 *    personalizzata scelta (accordatore.js toglie/mette [hidden]):
 *      <button id="acc-custom-edit" class="tb-btn tb-btn--ghost" hidden
 *              data-i18n="acc-custom-edit">Modifica</button>
 *      <button id="acc-custom-remove" class="tb-btn tb-btn--ghost" hidden
 *              data-i18n="acc-custom-delete">Elimina</button>
 *
 * 3) Foglio dell'editor (stessa forma di #acc-a4-info, shared/sheet.js):
 *      <div class="tb-sheet-scrim" id="acc-custom-scrim" hidden></div>
 *      <div class="tb-sheet" id="acc-custom" role="dialog" aria-modal="true"
 *           aria-labelledby="acc-custom-title" hidden>
 *        <div class="tb-sheet-head">
 *          <h2 id="acc-custom-title" data-i18n="acc-custom-title">Accordatura personalizzata</h2>
 *          <button type="button" class="tb-sheet-close" data-i18n-aria="sheet-close" aria-label="Chiudi">&times;</button>
 *        </div>
 *        <div class="tb-sheet-body">
 *          <label class="acc-label" for="acc-custom-name" data-i18n="acc-custom-name">Nome</label>
 *          <input type="text" id="acc-custom-name" class="tb-number" maxlength="24" autocomplete="off">
 *          <span class="acc-label" id="acc-custom-count-label" data-i18n="acc-custom-count">Corde</span>
 *          <div id="acc-custom-count" class="tb-segment" role="radiogroup"
 *               aria-labelledby="acc-custom-count-label">
 *            <button type="button" class="tb-segment-btn" data-acc-count="3" role="radio" aria-checked="false">3</button>
 *            ... fino a 8 ...
 *          </div>
 *          <div id="acc-custom-strings" class="acc-custom-strings"></div>   VUOTO: lo riempie questo file
 *          <p id="acc-custom-error" class="tb-status" hidden></p>
 *          <div class="acc-custom-actions">
 *            <button type="button" id="acc-custom-save" class="tb-btn tb-btn--primary" data-i18n="acc-custom-save">Salva</button>
 *            <button type="button" id="acc-custom-cancel" class="tb-btn tb-btn--ghost" data-i18n="acc-custom-cancel">Annulla</button>
 *          </div>
 *        </div>
 *      </div>
 *
 * 4) Conferma di eliminazione INLINE (niente confirm() del browser), nel
 *    foglio o accanto ai bottoni, nascosta di default:
 *      <div id="acc-custom-confirm" class="acc-custom-confirm" hidden>
 *        <span data-i18n="acc-custom-delete-ask">Elimino questa accordatura?</span>
 *        <button type="button" id="acc-custom-confirm-yes" class="tb-btn" data-i18n="acc-custom-delete-yes">Elimina</button>
 *        <button type="button" id="acc-custom-confirm-no" class="tb-btn tb-btn--ghost" data-i18n="acc-custom-delete-no">Annulla</button>
 *      </div>
 *
 * 5) Righe delle corde, GENERATE QUI dentro #acc-custom-strings (una per
 *    corda, dalla piu' grave): servono solo le classi, il CSS le veste.
 *      <div class="acc-custom-row" data-acc-row="<i>">
 *        <span class="acc-custom-row-label">1</span>
 *        <div class="tb-segment tb-segment--scroll acc-custom-notes" role="radiogroup" aria-label="<nota>">
 *          <button type="button" class="tb-segment-btn" data-acc-note="C" role="radio" aria-checked="false">C</button> ... 12
 *        </div>
 *        <div class="tb-segment tb-segment--scroll acc-custom-octs" role="radiogroup" aria-label="<ottava>">
 *          <button type="button" class="tb-segment-btn" data-acc-oct="0" role="radio" aria-checked="false">0</button> ... 8
 *        </div>
 *      </div>
 *
 * 6) Chiavi i18n (IT / EN) da aggiungere in accordatore/i18n.js:
 *    acc-custom-new        Personalizzata… / Custom…
 *    acc-custom-title      Accordatura personalizzata / Custom tuning
 *    acc-custom-name       Nome / Name
 *    acc-custom-count      Corde / Strings
 *    acc-custom-note       Nota / Note          acc-custom-oct  Ottava / Octave
 *    acc-custom-save       Salva / Save         acc-custom-cancel Annulla / Cancel
 *    acc-custom-edit       Modifica / Edit      acc-custom-delete Elimina / Delete
 *    acc-custom-delete-ask Elimino questa accordatura? / Delete this tuning?
 *    acc-custom-delete-yes Elimina / Delete     acc-custom-delete-no Annulla / Cancel
 *    acc-custom-name-empty Dai un nome all'accordatura / Give the tuning a name
 *    acc-custom-default    La mia accordatura / My tuning
 *
 * 7) Dati: prefs `tt.accordatore.custom` = [{ id, name, strings: [{ note, oct }] }].
 *    Le accordature standard non si toccano; le personalizzate valgono in
 *    entrambe le modalita' (corda piu' vicina in Ascolto, suono in Riferimento).
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
import { mountSelects, mountSelect } from '/shared/select.js';
import { mountInfos, openSheet, closeSheet } from '/shared/sheet.js';
import { mountRanges } from '/shared/range.js';

const TOOL = 'accordatore';
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const OCTAVES = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const CUSTOM_MIN = 3;
const CUSTOM_MAX = 8;
const CUSTOM_NEW = '__custom__';  // voce "Personalizzata..." in fondo al select
const CUSTOM_PREFIX = 'custom:';
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

/* Accordature salvate: prefs `tt.accordatore.custom`. Forma tollerante:
   quello che non torna si scarta invece di rompere la pagina. */
export function readCustom() {
    const raw = prefs.get(TOOL, 'custom', []);
    if (!Array.isArray(raw)) return [];
    return raw.filter((x) => x && x.id && Array.isArray(x.strings) && x.strings.length)
        .map((x) => ({
            id: String(x.id),
            name: String(x.name || ''),
            strings: x.strings
                .filter((sg) => sg && NOTES.indexOf(sg.note) !== -1)
                .map((sg) => ({ note: sg.note, oct: Math.min(8, Math.max(0, Number(sg.oct) || 0)) }))
        }))
        .filter((x) => x.strings.length >= CUSTOM_MIN);
}

export function writeCustom(list) {
    prefs.set(TOOL, 'custom', list);
}

const customId = (list) => {
    let n = 1;
    while (list.some((x) => x.id === 'c' + n)) n += 1;
    return 'c' + n;
};

/** Un'accordatura salvata nella stessa forma di TUNINGS. */
function customTuning(entry) {
    return {
        id: CUSTOM_PREFIX + entry.id,
        name: entry.name,
        custom: true,
        strings: entry.strings.map((sg) => sg.note + sg.oct)
    };
}

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
        instrument: prefs.get(TOOL, 'instrument', 'guitar'),
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

    let custom = readCustom();
    let instrumentSelect = null;   // api di shared/select.js sulla pillola
    let editing = null;            // bozza aperta nell'editor

    const customById = (value) => {
        const id = String(value || '').slice(CUSTOM_PREFIX.length);
        return custom.find((x) => x.id === id) || null;
    };
    const isCustom = (value) => String(value || '').startsWith(CUSTOM_PREFIX);

    function tuningOf(value) {
        if (isCustom(value)) {
            const entry = customById(value);
            return entry ? customTuning(entry) : TUNINGS.guitar;
        }
        return TUNINGS[value] || TUNINGS.guitar;
    }

    const tuning = () => tuningOf(ui.instrument);

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

    /**
     * Pulsante grande "Avvia ascolto" dentro #acc-consent. Serve quando il
     * permesso c'e' gia' ma l'ascolto non e' partito: su iOS la cattura
     * puo' cominciare SOLO dentro un gesto, quindi ci vuole qualcosa da
     * toccare (prima qui non c'era piu' niente e la pagina restava ferma).
     */
    function renderStart() {
        if (!consentBox) return;
        consentBox.textContent = '';
        consentBox.hidden = false;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'acc-start';
        btn.className = 'tb-btn tb-btn--primary acc-start';
        btn.setAttribute('data-i18n', 'mic-start');
        btn.textContent = t('mic-start');
        /* niente await prima di startListening: il gesto deve arrivare
           intero a getUserMedia e a AudioContext.resume() */
        btn.addEventListener('click', () => startListening());
        consentBox.appendChild(btn);
        renderMicOff();
    }

    function renderConsent() {
        if (!consentBox) return;
        if (ui.mode !== 'listen') { consentBox.textContent = ''; consentBox.hidden = true; return; }
        if (mic.granted() && mic.state() !== 'denied') {
            /* permesso c'e': o sta gia' ascoltando (via il riquadro) o serve
               il tocco che fa partire la cattura */
            if (tracker && tracker.running()) {
                consentBox.textContent = '';
                consentBox.hidden = true;
                renderMicOff();
                return;
            }
            renderStart();
            return;
        }
        consentBox.hidden = false;
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
            renderConsent();   // il permesso c'e': via il riquadro
            micStatus();
        }, (err) => {
            /* qualunque rifiuto ha il suo messaggio (mappa in mic.js) */
            setStatus(status, { kind: 'denied', key: mic.errorKey(err) });
            renderConsent();
            renderMicOff();
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
        if (reason === 'error') {
            clearReading();
            setStatus(status, { kind: 'denied', key: mic.errorKey(info.code) });
            renderConsent();
            renderMicOff();
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

    /**
     * iOS: dopo una telefonata o un passaggio in background l'AudioContext
     * resta 'interrupted' e il ramo del microfono smette di produrre frame
     * senza dire niente. Tornando in primo piano si prova a riprendere da
     * soli; se il sistema pretende un gesto, ricompare "Avvia ascolto".
     */
    onStateChange((state) => {
        if (ui.mode !== 'listen') return;
        if (state === 'running') {
            if (tracker && tracker.running()) { tracker.rebuild(); micStatus(); renderConsent(); }
            return;
        }
        if (!(tracker && tracker.running())) return;
        setStatus(status, { kind: 'idle', key: 'audio-resume-msg' });
        unlock().then(() => {
            if (ui.mode !== 'listen' || !(tracker && tracker.running())) return;
            tracker.rebuild();
            micStatus();
            renderConsent();
        }, () => {
            if (needsGesture()) renderStart();
        });
    });

    /* ---------------- modalita' ---------------- */

    /**
     * `gesture` = la chiamata arriva da un tocco dell'utente. Solo allora
     * si puo' avviare la cattura: all'apertura della pagina (modalita'
     * ricordata nelle preferenze) si mostra "Avvia ascolto" e si aspetta.
     */
    function setMode(mode, { gesture = false } = {}) {
        const next = mode === 'listen' ? 'listen' : 'reference';
        if (next === ui.mode) return;
        ui.mode = next;
        prefs.set(TOOL, 'mode', next);
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
            /* mic.state() resta 'unasked' su Safari (niente Permissions API):
               il consenso dato in una sessione precedente lo dice granted() */
            if (gesture && mic.granted() && mic.state() !== 'denied') {
                startListening();   // DENTRO il gesto: niente await prima
                renderMicOff();
                return;
            }
            renderConsent();
            renderMicOff();
            micStatus();
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
            if (b) setMode(b.getAttribute('data-acc-mode'), { gesture: true });
        });
    }

    function setInstrument(value) {
        if (!TUNINGS[value] && !customById(value)) return false;
        ui.instrument = value;
        prefs.set(TOOL, 'instrument', value);
        root.setAttribute('data-acc-instrument', isCustom(value) ? 'custom' : value);
        if (instrument && instrument.value !== value) instrument.value = value;
        if (instrumentSelect) instrumentSelect.set(value);
        stopLoop();
        keyNote = null;
        buildStrings();
        applyRange();
        clearReading();
        renderCustomButtons();
        return true;
    }

    if (instrument) {
        instrument.addEventListener('change', () => {
            if (instrument.value === CUSTOM_NEW) {
                /* la voce "Personalizzata..." non e' un'accordatura: apre
                   l'editor e il select torna a quella di prima */
                instrument.value = ui.instrument;
                if (instrumentSelect) instrumentSelect.set(ui.instrument);
                openEditor(null);
                return;
            }
            setInstrument(instrument.value);
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

    /* ---------------- accordature personalizzate ---------------- */

    const editBtn = document.getElementById('acc-custom-edit');
    const removeBtn = document.getElementById('acc-custom-remove');
    const confirmBox = document.getElementById('acc-custom-confirm');
    const sheet = document.getElementById('acc-custom');
    const nameInput = document.getElementById('acc-custom-name');
    const countBox = document.getElementById('acc-custom-count');
    const rowsBox = document.getElementById('acc-custom-strings');
    const errorOut = document.getElementById('acc-custom-error');
    const saveBtn = document.getElementById('acc-custom-save');
    const cancelBtn = document.getElementById('acc-custom-cancel');

    /** Voci del select: le salvate stanno prima di "Personalizzata...". */
    function syncCustomOptions() {
        if (!instrument) return;
        const panel = document.getElementById('acc-instrument-panel');
        [...instrument.querySelectorAll('option')].forEach((o) => {
            if (isCustom(o.value)) o.remove();
        });
        if (panel) {
            [...panel.querySelectorAll('.tb-select-option')].forEach((o) => {
                if (isCustom(o.getAttribute('data-value'))) o.remove();
            });
        }
        const lastOption = instrument.querySelector('option[value="' + CUSTOM_NEW + '"]');
        const lastPanel = panel ? panel.querySelector('.tb-select-option[data-value="' + CUSTOM_NEW + '"]') : null;
        custom.forEach((entry) => {
            const value = CUSTOM_PREFIX + entry.id;
            const option = document.createElement('option');
            option.value = value;
            option.textContent = entry.name;
            instrument.insertBefore(option, lastOption);
            if (!panel) return;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'tb-select-option';
            btn.setAttribute('role', 'option');
            btn.setAttribute('data-value', value);
            btn.setAttribute('aria-selected', 'false');
            const label = document.createElement('span');
            label.textContent = entry.name;
            btn.append(label, checkIcon());
            panel.insertBefore(btn, lastPanel);
        });
        if (instrumentSelect) instrumentSelect.refresh();
    }

    /* la spunta del pannello: stesso sprite delle voci scritte a mano */
    function checkIcon() {
        const NS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('class', 'tb-select-check');
        svg.setAttribute('aria-hidden', 'true');
        const use = document.createElementNS(NS, 'use');
        use.setAttribute('href', '#tb-icon-check');
        svg.appendChild(use);
        return svg;
    }

    function renderCustomButtons() {
        const on = isCustom(ui.instrument) && !!customById(ui.instrument);
        if (editBtn) editBtn.hidden = !on;
        if (removeBtn) removeBtn.hidden = !on;
        if (confirmBox && !on) confirmBox.hidden = true;
    }

    /* ---- editor ---- */

    function segment(cls, attr, values, aria) {
        const box = document.createElement('div');
        box.className = 'tb-segment tb-segment--scroll ' + cls;
        box.setAttribute('role', 'radiogroup');
        box.setAttribute('aria-label', aria);
        values.forEach((v) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'tb-segment-btn';
            b.setAttribute(attr, String(v));
            b.setAttribute('role', 'radio');
            b.setAttribute('aria-checked', 'false');
            b.textContent = String(v);
            box.appendChild(b);
        });
        return box;
    }

    function markRow(row) {
        const i = Number(row.getAttribute('data-acc-row'));
        const value = editing.strings[i];
        [...row.querySelectorAll('[data-acc-note]')].forEach((b) => {
            const on = b.getAttribute('data-acc-note') === value.note;
            b.setAttribute('aria-checked', on ? 'true' : 'false');
            b.classList.toggle('is-active', on);
        });
        [...row.querySelectorAll('[data-acc-oct]')].forEach((b) => {
            const on = Number(b.getAttribute('data-acc-oct')) === value.oct;
            b.setAttribute('aria-checked', on ? 'true' : 'false');
            b.classList.toggle('is-active', on);
        });
    }

    function buildRows() {
        if (!rowsBox) return;
        rowsBox.textContent = '';
        editing.strings.forEach((sg, i) => {
            const row = document.createElement('div');
            row.className = 'acc-custom-row';
            row.setAttribute('data-acc-row', String(i));
            const label = document.createElement('span');
            label.className = 'acc-custom-row-label';
            label.textContent = String(i + 1);
            row.append(
                label,
                segment('acc-custom-notes', 'data-acc-note', NOTES, t('acc-custom-note')),
                segment('acc-custom-octs', 'data-acc-oct', OCTAVES, t('acc-custom-oct'))
            );
            rowsBox.appendChild(row);
            markRow(row);
        });
        if (countBox) {
            [...countBox.querySelectorAll('[data-acc-count]')].forEach((b) => {
                const on = Number(b.getAttribute('data-acc-count')) === editing.strings.length;
                b.setAttribute('aria-checked', on ? 'true' : 'false');
                b.classList.toggle('is-active', on);
            });
        }
    }

    /* `entry` null = nuova accordatura (parte dalla chitarra, tagliata a 6) */
    function openEditor(entry) {
        const base = entry || {
            id: null,
            name: t('acc-custom-default'),
            strings: TUNINGS.guitar.strings.map((n) => ({
                note: n.replace(/-?\d+$/, ''),
                oct: Number(n.match(/-?\d+$/)[0])
            }))
        };
        editing = {
            id: base.id,
            name: base.name,
            strings: base.strings.map((sg) => ({ note: sg.note, oct: sg.oct }))
        };
        if (nameInput) nameInput.value = editing.name;
        if (errorOut) { errorOut.hidden = true; errorOut.textContent = ''; }
        buildRows();
        if (sheet) openSheet(sheet, { anchor: editBtn && !editBtn.hidden ? editBtn : null });
    }

    function closeEditor() {
        editing = null;
        if (sheet) closeSheet();
    }

    function saveEditor() {
        if (!editing) return null;
        const name = (nameInput ? nameInput.value : editing.name).trim();
        if (!name) {
            if (errorOut) {
                errorOut.hidden = false;
                errorOut.setAttribute('data-i18n', 'acc-custom-name-empty');
                errorOut.textContent = t('acc-custom-name-empty');
            }
            if (nameInput && nameInput.focus) nameInput.focus();
            return null;
        }
        const entry = {
            id: editing.id || customId(custom),
            name,
            strings: editing.strings.map((sg) => ({ note: sg.note, oct: sg.oct }))
        };
        const at = custom.findIndex((x) => x.id === entry.id);
        if (at === -1) custom.push(entry);
        else custom[at] = entry;
        writeCustom(custom);
        syncCustomOptions();
        closeEditor();
        setInstrument(CUSTOM_PREFIX + entry.id); // si usa subito
        return entry;
    }

    function removeCustom(id) {
        custom = custom.filter((x) => x.id !== id);
        writeCustom(custom);
        syncCustomOptions();
        if (confirmBox) confirmBox.hidden = true;
        setInstrument('guitar');
    }

    if (countBox) {
        countBox.addEventListener('click', (e) => {
            const b = e.target.closest('[data-acc-count]');
            if (!b || !editing) return;
            const n = Math.min(CUSTOM_MAX, Math.max(CUSTOM_MIN, Number(b.getAttribute('data-acc-count'))));
            while (editing.strings.length > n) editing.strings.pop();
            while (editing.strings.length < n) {
                const last = editing.strings[editing.strings.length - 1] || { note: 'E', oct: 2 };
                editing.strings.push({ note: last.note, oct: last.oct });
            }
            buildRows();
        });
    }

    if (rowsBox) {
        rowsBox.addEventListener('click', (e) => {
            const row = e.target.closest('.acc-custom-row');
            if (!row || !editing) return;
            const i = Number(row.getAttribute('data-acc-row'));
            const note = e.target.closest('[data-acc-note]');
            const oct = e.target.closest('[data-acc-oct]');
            if (note) editing.strings[i].note = note.getAttribute('data-acc-note');
            else if (oct) editing.strings[i].oct = Number(oct.getAttribute('data-acc-oct'));
            else return;
            markRow(row);
        });
    }

    if (saveBtn) saveBtn.addEventListener('click', () => saveEditor());
    if (cancelBtn) cancelBtn.addEventListener('click', closeEditor);
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            const entry = customById(ui.instrument);
            if (entry) openEditor(entry);
        });
    }
    /* eliminazione: conferma nella pagina, mai il confirm() del browser */
    if (removeBtn && confirmBox) {
        removeBtn.addEventListener('click', () => { confirmBox.hidden = false; });
        const yes = document.getElementById('acc-custom-confirm-yes');
        const no = document.getElementById('acc-custom-confirm-no');
        if (yes) {
            yes.addEventListener('click', () => {
                const entry = customById(ui.instrument);
                if (entry) removeCustom(entry.id);
            });
        }
        if (no) no.addEventListener('click', () => { confirmBox.hidden = true; });
    }

    /* ---------------- stato iniziale ---------------- */

    mountRanges(document);    // il cursore dell'A4 si colora fino al valore
    const selectBox = instrument ? instrument.closest('.tb-select') : null;
    instrumentSelect = selectBox ? mountSelect(selectBox) : null;
    mountSelects(document);   // gli altri <select> diventano pillole glass
    mountInfos(document);     // la "i" apre il foglio
    syncCustomOptions();
    if (!TUNINGS[ui.instrument] && !customById(ui.instrument)) ui.instrument = 'guitar';
    if (instrument) instrument.value = ui.instrument;
    if (instrumentSelect) instrumentSelect.set(ui.instrument);
    renderCustomButtons();
    if (a4Input) a4Input.value = String(ui.a4);
    setA4(ui.a4);
    root.setAttribute('data-acc-instrument', isCustom(ui.instrument) ? 'custom' : ui.instrument);
    buildStrings();
    markKeys();
    clearReading();
    /* la modalita' si ricorda, ma l'ascolto NON parte da solo: senza un
       gesto iOS non da' il microfono, e il pulsante grande e' quel gesto */
    setMode('reference');
    root.setAttribute('data-acc-mode', 'reference');
    if (prefs.get(TOOL, 'mode', 'reference') === 'listen') setMode('listen');

    return {
        ui,
        setMode,
        renderConsent,
        renderStart,
        playString,
        strings: () => stringBtns,
        freqs: () => stringFreqs,
        showPitch,
        clearReading,
        setA4,
        playChosen,
        chosen,
        tracker: () => tracker,
        target: () => target,
        setInstrument,
        openEditor,
        closeEditor,
        saveEditor,
        removeCustom,
        customList: () => custom
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
