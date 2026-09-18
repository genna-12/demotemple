/**
 * Tiny Temple Toolbox - DNA della traccia (spec 13).
 *
 * File o microfono -> decodifica -> Worker -> BPM, tonalita', loudness.
 * Niente rete, niente upload: il file non lascia il dispositivo.
 *
 * =====================================================================
 * CONTRATTO CON IL MARKUP (spec 13 §5; dove la spec tace, vale questo)
 * =====================================================================
 *   #dna            <main> con data-dna-state="empty|recording|working|result|error"
 *   #dna-drop       zona di rilascio (vuoto); dentro:
 *                     <input type="file" id="dna-file" accept="audio/*" class="sr-only">
 *                     <label for="dna-file" class="tb-btn tb-btn--primary">Scegli file</label>
 *                     <button id="dna-record" class="tb-btn">Registra</button>
 *   #dna-consent    contenitore per mic.renderConsent (vuoto)
 *   #dna-countdown  numero grande dei secondi di registrazione
 *   #dna-level      <div> con --dna-level in % (barra di livello, la scrive il JS)
 *   #dna-stop       "Ferma" (attivo dopo 10 s)
 *   #dna-progress   [role="progressbar"] con --dna-pct; #dna-phase testo della fase
 *   #dna-cancel     "Annulla"
 *   #dna-result     card dei risultati; dentro gli id dei valori:
 *                     #dna-bpm #dna-bpm-conf #dna-bpm-alt (tb-segment x2/:2, data-dna-fold)
 *                     #dna-key #dna-camelot #dna-key-compat #dna-key-conf
 *                     #dna-lufs #dna-tp #dna-lra #dna-advice
 *                     #dna-duration #dna-rate #dna-channels
 *                     #dna-estimate (badge "stima", [hidden] se viene da file)
 *                     #dna-copy (copia il riepilogo)  #dna-again (nuova analisi)
 *   #dna-target     .tb-select con <select id="dna-target"> (spotify|apple|youtube|tidal)
 *   #dna-history    lista dello storico (vuota: la riempie il JS con
 *                     <li><button class="dna-history-item" data-dna-id="<id>">…</button></li>)
 *   #dna-status     .tb-status per errori e messaggi
 * Chiavi i18n usate da questo file (oltre a quelle del markup, spec 13 §3):
 *   dna-phase-decode / -loudness / -rhythm / -key   fasi della barra
 *   dna-conf-high / -mid / -low                     confidenza in parole
 *   dna-major / dna-minor / dna-key                 tonalita' e sua etichetta
 *   dna-on-target / dna-turn-up / dna-turn-down     consiglio sul target
 *   dna-copied / dna-copy-manual                    esito della copia
 *   dna-bad-file / dna-too-long / dna-long-warning  errori e avviso oltre 8 min
 *   dna-mic-name                                    nome del record registrato
 * Piu' quelle gia' condivise: mic-denied, audio-resume-msg.
 */

import commonDict from '/shared/i18n-common.js';
import toolDict from '/dna/i18n.js';
import { init, t, lang } from '/shared/i18n.js';
import { pressFeedback, setStatus, toast } from '/shared/ui.js';
import { mountBar } from '/shared/nav.js';
import { initPwa } from '/shared/pwa.js';
import { mountSelects } from '/shared/select.js';
import { mountInfos } from '/shared/sheet.js';
import { mountRanges } from '/shared/range.js';
import { getContext, unlock, decode, needsGesture } from '/shared/audio.js';
import * as mic from '/shared/mic.js';
import { prefs, put, list, del } from '/shared/storage.js';
import { fold } from '/shared/analysis/bpm.js';
import { compatibleWith } from '/shared/analysis/key.js';
import { gainToTarget, TARGETS } from '/shared/analysis/loudness.js';

const TOOL = 'dna';
const WORKER_URL = '/dna/dna-worker.js';
const BLOCK_SECONDS = 30;     // i canali nativi viaggiano a blocchi
const MAX_MINUTES = 15;
const WARN_MINUTES = 8;       // oltre, su iPhone la decodifica puo' non farcela
const REC_MIN = 10;
const REC_MAX = 20;
const HISTORY = 10;

const fmt = (v, digits) => {
    try {
        return new Intl.NumberFormat(lang(), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
    } catch (e) {
        return Number(v).toFixed(digits);
    }
};

const confidenceKey = (c) => (c >= 0.6 ? 'dna-conf-high' : c >= 0.3 ? 'dna-conf-mid' : 'dna-conf-low');

/** Copia i canali nativi a blocchi: si spedisce e si libera, uno alla volta. */
export function channelBlocks(buffer, seconds = BLOCK_SECONDS) {
    const size = Math.round(buffer.sampleRate * seconds);
    const blocks = [];
    for (let start = 0; start < buffer.length; start += size) {
        const len = Math.min(size, buffer.length - start);
        const chans = [];
        for (let c = 0; c < buffer.numberOfChannels; c++) {
            const part = new Float32Array(len);
            part.set(buffer.getChannelData(c).subarray(start, start + len));
            chans.push(part);
        }
        blocks.push(chans);
    }
    return blocks;
}

export function mountDna() {
    const root = document.getElementById('dna');
    if (!root) return null;

    const fileInput = document.getElementById('dna-file');
    const recordBtn = document.getElementById('dna-record');
    const stopBtn = document.getElementById('dna-stop');
    const consentBox = document.getElementById('dna-consent');
    const countdown = document.getElementById('dna-countdown');
    const level = document.getElementById('dna-level');
    const progress = document.getElementById('dna-progress');
    const phaseOut = document.getElementById('dna-phase');
    const cancelBtn = document.getElementById('dna-cancel');
    const targetSelect = document.getElementById('dna-target');
    const historyBox = document.getElementById('dna-history');
    const statusOut = document.getElementById('dna-status');
    const copyBtn = document.getElementById('dna-copy');
    const againBtn = document.getElementById('dna-again');
    const foldBox = document.getElementById('dna-bpm-alt');

    const out = (id) => document.getElementById(id);

    const ui = {
        state: 'empty',
        target: TARGETS[prefs.get(TOOL, 'target', 'spotify')] ? prefs.get(TOOL, 'target', 'spotify') : 'spotify',
        source: 'file',
        result: null,
        name: ''
    };

    let worker = null;
    let cancelled = false;
    let recording = null;   // { stop(), started, timer, raf }

    /* ---------------- stati ---------------- */

    function setState(state) {
        ui.state = state;
        root.setAttribute('data-dna-state', state);
        ['empty', 'recording', 'working', 'result', 'error'].forEach((name) => {
            const el = document.getElementById('dna-' + (name === 'empty' ? 'drop' : name === 'working' ? 'progress' : name));
            if (el && el.id !== 'dna-status') el.hidden = name !== state;
        });
        if (state !== 'error' && statusOut) statusOut.textContent = '';
    }

    function setPhase(phase, pct) {
        if (phaseOut) {
            phaseOut.setAttribute('data-i18n', 'dna-phase-' + phase);
            phaseOut.textContent = t('dna-phase-' + phase);
        }
        if (progress) {
            const value = Math.max(0, Math.min(100, Math.round(pct)));
            progress.setAttribute('role', 'progressbar');
            progress.setAttribute('aria-valuenow', String(value));
            progress.setAttribute('aria-valuemin', '0');
            progress.setAttribute('aria-valuemax', '100');
            progress.style.setProperty('--dna-pct', value + '%');
        }
    }

    function fail(key) {
        setState('error');
        setStatus(statusOut, { kind: 'error', key });
    }

    /* ---------------- Worker (con ripiego sul thread principale) ---------------- */

    function startWorker() {
        if (worker) return worker;
        try {
            worker = new Worker(WORKER_URL, { type: 'module' });
        } catch (e) {
            worker = null; // Safari senza module worker: si lavora qui
        }
        return worker;
    }

    function stopWorker() {
        if (worker) {
            worker.terminate();
            worker = null;
        }
    }

    /** Una richiesta al Worker; senza Worker usa gli stessi moduli qui. */
    function ask(message, transfer, onPhase) {
        const w = startWorker();
        if (!w) {
            return import(WORKER_URL).then((mod) => mod.runAnalysis(
                message.channels.map((c) => new Float32Array(c)),
                message.sampleRate,
                { a4: message.a4, onPhase }
            ));
        }
        return new Promise((resolve, reject) => {
            const onMessage = (e) => {
                const data = e.data || {};
                if (data.type === 'phase') { if (onPhase) onPhase(data.phase, data.pct); return; }
                w.removeEventListener('message', onMessage);
                if (data.type === 'result') resolve(data.result);
                else reject(new Error(data.message || 'analisi fallita'));
            };
            w.addEventListener('message', onMessage);
            w.postMessage(message, transfer || []);
        });
    }

    /* ---------------- analisi ---------------- */

    async function analyse(buffer, { source = 'file', name = '' } = {}) {
        cancelled = false;
        ui.source = source;
        ui.name = name;
        setState('working');
        setPhase('decode', 5);

        const sampleRate = buffer.sampleRate;
        const channels = buffer.numberOfChannels;
        const seconds = buffer.duration;

        /* una copia sola dei canali nativi, poi si trasferisce: il Worker
           fa loudness, downmix e decimazione senza un secondo render */
        const copies = [];
        for (let c = 0; c < channels; c++) {
            const part = new Float32Array(buffer.length);
            part.set(buffer.getChannelData(c));
            copies.push(part);
        }
        buffer = null; // eslint-disable-line no-param-reassign
        const a4 = Number(prefs.get('shared', 'a4', 440)) || 440;
        const buffers = copies.map((c) => c.buffer);
        setPhase('loudness', 15);
        const phases = { loudness: [15, 45], rhythm: [45, 80], key: [80, 100] };
        const data = await ask(
            { type: 'analyse', channels: buffers, sampleRate, a4 },
            buffers,
            (p, pct) => {
                const range = phases[p] || phases.rhythm;
                setPhase(p, range[0] + (range[1] - range[0]) * (pct / 100));
            }
        );
        copies.length = 0;
        if (cancelled) return null;

        const result = {
            name,
            source,
            seconds,
            sampleRate,
            channels,
            bpm: data.bpm.bpm,
            bpmConfidence: data.bpm.confidence,
            bpmAlternatives: data.bpm.alternatives,
            tonic: data.key.tonic,
            mode: data.key.mode,
            camelot: data.key.camelot,
            keyConfidence: data.key.confidence,
            lufs: data.loudness.lufs,
            truePeak: data.loudness.truePeak,
            lra: data.loudness.lra,
            at: new Date().toISOString()
        };
        stopWorker();
        showResult(result);
        saveHistory(result);
        return result;
    }

    /* ---------------- risultato ---------------- */

    function showResult(result) {
        ui.result = result;
        setState('result');
        const set = (id, text) => { const el = out(id); if (el) el.textContent = text; };
        set('dna-bpm', result.bpm ? fmt(result.bpm, 0) : '—');
        const conf = out('dna-bpm-conf');
        if (conf) {
            conf.setAttribute('data-i18n', confidenceKey(result.bpmConfidence));
            conf.textContent = t(confidenceKey(result.bpmConfidence));
        }
        if (foldBox) foldBox.hidden = !(result.bpmAlternatives && result.bpmAlternatives.length);
        set('dna-key', result.tonic ? result.tonic + ' ' + t(result.mode === 'minor' ? 'dna-minor' : 'dna-major') : '—');
        set('dna-camelot', result.camelot || '');
        set('dna-key-compat', compatibleWith(result.camelot).join(' · '));
        const keyConf = out('dna-key-conf');
        if (keyConf) {
            keyConf.setAttribute('data-i18n', confidenceKey(result.keyConfidence * 3));
            keyConf.textContent = t(confidenceKey(result.keyConfidence * 3));
        }
        set('dna-lufs', isFinite(result.lufs) ? fmt(result.lufs, 1) + ' LUFS' : '—');
        set('dna-tp', isFinite(result.truePeak) ? fmt(result.truePeak, 1) + ' dBTP' : '—');
        set('dna-lra', result.lra === null || result.lra === undefined ? '' : fmt(result.lra, 1) + ' LU');
        set('dna-duration', fmt(Math.floor(result.seconds / 60), 0) + ':' + String(Math.round(result.seconds % 60)).padStart(2, '0'));
        set('dna-rate', fmt(result.sampleRate / 1000, 1) + ' kHz');
        set('dna-channels', String(result.channels));
        const badge = out('dna-estimate');
        if (badge) badge.hidden = result.source !== 'mic';
        renderAdvice();
    }

    function renderAdvice() {
        const el = out('dna-advice');
        if (!el || !ui.result) return;
        const g = gainToTarget(ui.result.lufs, ui.target);
        el.textContent = g.onTarget
            ? t('dna-on-target')
            : t(g.direction === 'up' ? 'dna-turn-up' : 'dna-turn-down') + ' ' + fmt(Math.abs(g.diff), 1) + ' dB';
        const bar = out('dna-lufs-bar');
        if (bar) bar.style.setProperty('--dna-lufs', Math.max(0, Math.min(100, (ui.result.lufs + 30) / 30 * 100)) + '%');
    }

    /** Riepilogo testuale da incollare dove serve. */
    function summary() {
        const r = ui.result;
        if (!r) return '';
        const rows = [
            r.name,
            'BPM ' + fmt(r.bpm, 0),
            t('dna-key') + ' ' + r.tonic + ' ' + t(r.mode === 'minor' ? 'dna-minor' : 'dna-major') + ' (' + r.camelot + ')',
            fmt(r.lufs, 1) + ' LUFS',
            fmt(r.truePeak, 1) + ' dBTP'
        ];
        if (r.lra !== null && r.lra !== undefined) rows.push(fmt(r.lra, 1) + ' LU');
        return rows.filter(Boolean).join(' · ');
    }

    /* ---------------- storico ---------------- */

    async function saveHistory(result) {
        try {
            await put(TOOL, result.at, result);
            const all = await list(TOOL);
            const extra = all.slice(0, Math.max(0, all.length - HISTORY));
            await Promise.all(extra.map((rec) => del(TOOL, rec.id)));
            renderHistory();
        } catch (e) { /* IndexedDB non disponibile: si vive senza storico */ }
    }

    async function renderHistory() {
        if (!historyBox) return;
        let all = [];
        try { all = await list(TOOL); } catch (e) { return; }
        historyBox.textContent = '';
        all.slice(-HISTORY).reverse().forEach((rec) => {
            const r = rec.value || rec;
            const li = document.createElement('li');
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'dna-history-item';
            btn.setAttribute('data-dna-id', rec.id || r.at);
            btn.textContent = [r.name, r.bpm ? fmt(r.bpm, 0) + ' BPM' : '', r.camelot,
                isFinite(r.lufs) ? fmt(r.lufs, 1) + ' LUFS' : ''].filter(Boolean).join(' · ');
            btn.addEventListener('click', () => showResult(r));
            li.appendChild(btn);
            historyBox.appendChild(li);
        });
    }

    /* ---------------- ingresso: file ---------------- */

    async function fromFile(file) {
        if (!file) return;
        try {
            setState('working');
            setPhase('decode', 2);
            const buffer = await decode(file);
            if (buffer.duration > MAX_MINUTES * 60) { fail('dna-too-long'); return; }
            if (buffer.duration > WARN_MINUTES * 60) setStatus(statusOut, { kind: 'idle', key: 'dna-long-warning' });
            await analyse(buffer, { source: 'file', name: file.name });
        } catch (e) {
            fail('dna-bad-file');
        }
    }

    if (fileInput) {
        fileInput.addEventListener('change', () => {
            const file = fileInput.files && fileInput.files[0];
            fileInput.value = '';
            fromFile(file);
        });
    }

    /* trascinamento: solo dove c'e' un puntatore fine (spec 13 §3) */
    const drop = document.getElementById('dna-drop');
    if (drop) {
        ['dragenter', 'dragover'].forEach((ev) => {
            drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-over'); });
        });
        ['dragleave', 'drop'].forEach((ev) => {
            drop.addEventListener(ev, () => drop.classList.remove('is-over'));
        });
        drop.addEventListener('drop', (e) => {
            e.preventDefault();
            const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
            if (file) fromFile(file);
        });
    }

    /* ---------------- ingresso: microfono ---------------- */

    function startRecording() {
        let ctx;
        try {
            unlock().catch(() => {});
            ctx = getContext();
        } catch (e) { fail('audio-resume-msg'); return; }
        mic.acquire().then((stream) => {
            setState('recording');
            /* livello: AnalyserNode, niente ScriptProcessor (deprecato) */
            const source = mic.source(ctx);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 1024;
            const sink = ctx.createGain();
            sink.gain.value = 0;
            source.connect(analyser).connect(sink).connect(ctx.destination);

            /* cattura: MediaRecorder dove c'e', altrimenti si registra
               quel che passa dall'AnalyserNode (ripiego) */
            const chunks = [];
            let recorder = null;
            if (typeof MediaRecorder === 'function') {
                try {
                    recorder = new MediaRecorder(stream);
                    recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
                    recorder.start();
                } catch (e) { recorder = null; }
            }
            const data = new Float32Array(analyser.fftSize);
            const started = Date.now();
            const tick = () => {
                if (!recording) return;
                const elapsed = (Date.now() - started) / 1000;
                if (countdown) countdown.textContent = String(Math.max(0, Math.ceil(REC_MAX - elapsed)));
                if (stopBtn) stopBtn.disabled = elapsed < REC_MIN;
                if (analyser.getFloatTimeDomainData) {
                    analyser.getFloatTimeDomainData(data);
                    let sum = 0;
                    for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
                    const rms = Math.sqrt(sum / data.length);
                    if (level) level.style.setProperty('--dna-level', Math.min(100, rms * 300).toFixed(1) + '%');
                }
                if (elapsed >= REC_MAX) { stopRecording(); return; }
                recording.raf = window.requestAnimationFrame(tick);
            };
            recording = {
                started,
                raf: null,
                recorder,
                async finish() {
                    try { source.disconnect(); analyser.disconnect(); sink.disconnect(); } catch (e) { /* gia' scollegati */ }
                    let blob = null;
                    if (recorder && recorder.state !== 'inactive') {
                        blob = await new Promise((resolve) => {
                            recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
                            recorder.stop();
                        });
                    }
                    mic.release();
                    return blob;
                }
            };
            recording.raf = window.requestAnimationFrame(tick);
        }, () => {
            setState('empty');
            setStatus(statusOut, { kind: 'denied', key: 'mic-denied' });
            if (consentBox) mic.renderConsent(consentBox, { onAllow: startRecording });
        });
    }

    async function stopRecording() {
        if (!recording) return;
        if (recording.raf) window.cancelAnimationFrame(recording.raf);
        const current = recording;
        recording = null;
        const blob = await current.finish();
        if (!blob || !blob.size) { setState('empty'); return; }
        try {
            const buffer = await decode(blob);
            await analyse(buffer, { source: 'mic', name: t('dna-mic-name') });
        } catch (e) {
            fail('dna-bad-file');
        }
    }

    if (recordBtn) {
        recordBtn.addEventListener('click', () => {
            if (mic.state() === 'granted') startRecording();
            else if (consentBox) mic.renderConsent(consentBox, { onAllow: startRecording });
            else startRecording();
        });
    }
    if (stopBtn) stopBtn.addEventListener('click', stopRecording);

    /* ---------------- comandi del risultato ---------------- */

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            cancelled = true;
            stopWorker();
            setState('empty');
        });
    }
    if (againBtn) againBtn.addEventListener('click', () => setState('empty'));
    if (foldBox) {
        foldBox.addEventListener('click', (e) => {
            const b = e.target.closest('[data-dna-fold]');
            if (!b || !ui.result) return;
            ui.result.bpm = fold(ui.result.bpm, Number(b.getAttribute('data-dna-fold')));
            const el = out('dna-bpm');
            if (el) el.textContent = fmt(ui.result.bpm, 0);
        });
    }
    if (targetSelect) {
        targetSelect.addEventListener('change', () => {
            ui.target = TARGETS[targetSelect.value] ? targetSelect.value : 'spotify';
            prefs.set(TOOL, 'target', ui.target);
            renderAdvice();
        });
    }
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const text = summary();
            try {
                await navigator.clipboard.writeText(text);
                toast('dna-copied');
            } catch (e) {
                toast('dna-copy-manual');
            }
        });
    }

    window.addEventListener('pagehide', () => {
        cancelled = true;
        stopWorker();
        if (recording) { if (recording.raf) window.cancelAnimationFrame(recording.raf); recording.finish(); recording = null; }
    });

    /* ---------------- stato iniziale ---------------- */

    mountRanges(document);
    mountSelects(document);
    mountInfos(document);
    if (targetSelect) targetSelect.value = ui.target;
    setState('empty');
    renderHistory();
    if (needsGesture()) { /* nessun suono da sbloccare finche' non si registra */ }

    return {
        ui,
        analyse,
        showResult,
        summary,
        setState,
        renderHistory,
        fromFile,
        stopWorker
    };
}

/* Avvio della pagina (nel browser; nei test il modulo si importa e basta). */
if (typeof document !== 'undefined' && document.getElementById('dna')) {
    init(commonDict, toolDict);
    pressFeedback(document);
    mountBar({ page: 'tool', current: TOOL });
    initPwa({
        installBtn: document.getElementById('tb-menu-install'),
        iosHelp: document.getElementById('tb-menu-ios'),
        installSection: document.querySelector('.tb-menu-install-group')
    });
    mountDna();
}
