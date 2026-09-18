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
 *   #dna-history    lista dello storico (vuota: la riempie il JS)
 *   #dna-status     .tb-status per errori e messaggi
 *
 * NOVITA' (feedback Genna) — markup atteso dal builder:
 *   Storico fino a 200 voci, ognuna con il suo "elimina":
 *     <li class="dna-history-row">
 *       <button class="dna-history-item" data-dna-id="<id>">nome · BPM · key · LUFS</button>
 *       <button class="dna-history-del tb-btn--icon" data-dna-del="<id>"
 *               data-i18n-aria="dna-del-one" aria-label="Elimina">&times;</button></li>
 *   Sopra o sotto la lista, sempre nel markup statico:
 *     <button type="button" id="dna-clear" class="tb-btn tb-btn--ghost" hidden
 *             data-i18n="dna-clear">Svuota storico</button>
 *     <div id="dna-clear-confirm" class="dna-clear-confirm" hidden>
 *       <span data-i18n="dna-clear-ask">Cancello tutto lo storico?</span>
 *       <button type="button" id="dna-clear-yes" class="tb-btn" data-i18n="dna-clear-yes">Svuota</button>
 *       <button type="button" id="dna-clear-no" class="tb-btn tb-btn--ghost" data-i18n="dna-clear-no">Annulla</button>
 *     </div>
 *   Tag del file (shared/tags.js), dentro #dna-result, sopra i numeri:
 *     <div id="dna-tags" class="dna-tags" hidden>
 *       <img id="dna-cover" class="dna-cover" alt="" hidden>
 *       <span id="dna-title"></span><span id="dna-artist"></span><span id="dna-album"></span>
 *       <span id="dna-year"></span></div>
 *   Le voci dello storico si riaprono senza rianalizzare: il record salvato
 *   contiene SOLO metadati (nome, titolo, artista, album, anno, bpm, key,
 *   camelot, lufs, tp, lra, durata, sample rate, canali, data). Nessun
 *   campione audio e nessuna copertina finiscono in IndexedDB.
 *
 * Chiavi i18n in piu': dna-del-one, dna-clear, dna-clear-ask, dna-clear-yes,
 *   dna-clear-no, dna-history-empty. I messaggi del microfono sono
 *   CONDIVISI (shared/i18n-common.js, li usa anche l'accordatore):
 *   mic-denied e mic-unavailable ci sono gia', servono mic-none
 *   ("Nessun microfono collegato"), mic-busy ("Il microfono e' in uso da
 *   un'altra applicazione") e mic-failed ("Impossibile usare il microfono").
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
import { readTags, coverBlob } from '/shared/tags.js';

const TOOL = 'dna';
const WORKER_URL = '/dna/dna-worker.js';
const BLOCK_SECONDS = 30;     // i canali nativi viaggiano a blocchi
const MAX_MINUTES = 15;
const WARN_MINUTES = 8;       // oltre, su iPhone la decodifica puo' non farcela
const REC_MIN = 10;
const REC_MAX = 20;
const HISTORY = 200;   // solo metadati: 200 voci pesano pochi KB

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
    const clearBtn = document.getElementById('dna-clear');
    const clearConfirm = document.getElementById('dna-clear-confirm');
    const tagsBox = document.getElementById('dna-tags');
    const coverImg = document.getElementById('dna-cover');

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
    let starting = false;       // guardia del tasto "Registra" (si azzera SEMPRE)
    let coverUrl = null;        // object URL della copertina mostrata
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

    async function analyse(buffer, { source = 'file', name = '', tags = null } = {}) {
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
            title: (tags && tags.title) || '',
            artist: (tags && tags.artist) || '',
            album: (tags && tags.album) || '',
            year: (tags && tags.year) || '',
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
        showResult(result, { cover: tags && tags.cover });
        saveHistory(result);   // salva i metadati, non la copertina
        return result;
    }

    /* ---------------- risultato ---------------- */

    /** Titolo, artista, album, anno e copertina del file (se ci sono). */
    function showTags(tags, cover) {
        if (coverUrl) { URL.revokeObjectURL(coverUrl); coverUrl = null; }
        const has = !!(tags && (tags.title || tags.artist || tags.album || tags.year));
        if (tagsBox) tagsBox.hidden = !has && !cover;
        const set = (id, text) => { const el = out(id); if (el) el.textContent = text || ''; };
        set('dna-title', tags && tags.title);
        set('dna-artist', tags && tags.artist);
        set('dna-album', tags && tags.album);
        set('dna-year', tags && tags.year);
        if (!coverImg) return;
        const blob = cover ? coverBlob(cover) : null;
        if (!blob) { coverImg.hidden = true; coverImg.removeAttribute('src'); return; }
        coverUrl = URL.createObjectURL(blob);   // la copertina si mostra, non si salva
        coverImg.src = coverUrl;
        coverImg.hidden = false;
    }

    function showResult(result, { cover = null } = {}) {
        ui.result = result;
        setState('result');
        showTags(result, cover);
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

    /** Nello storico va SOLO questo: numeri e testo, mai audio ne' copertine. */
    function historyRecord(result) {
        return {
            at: result.at,
            name: result.name,
            source: result.source,
            title: result.title || '',
            artist: result.artist || '',
            album: result.album || '',
            year: result.year || '',
            seconds: result.seconds,
            sampleRate: result.sampleRate,
            channels: result.channels,
            bpm: result.bpm,
            bpmConfidence: result.bpmConfidence,
            tonic: result.tonic,
            mode: result.mode,
            camelot: result.camelot,
            keyConfidence: result.keyConfidence,
            lufs: result.lufs,
            truePeak: result.truePeak,
            lra: result.lra
        };
    }

    async function saveHistory(result) {
        try {
            await put(TOOL, result.at, historyRecord(result));
            const all = await list(TOOL);
            const extra = all.slice(0, Math.max(0, all.length - HISTORY));
            await Promise.all(extra.map((rec) => del(TOOL, rec.id)));
            renderHistory();
        } catch (e) { /* IndexedDB non disponibile: si vive senza storico */ }
    }

    async function removeHistory(id) {
        try {
            await del(TOOL, id);
            renderHistory();
        } catch (e) { /* niente da fare */ }
    }

    async function clearHistory() {
        try {
            const all = await list(TOOL);
            await Promise.all(all.map((rec) => del(TOOL, rec.id)));
        } catch (e) { /* niente da fare */ }
        if (clearConfirm) clearConfirm.hidden = true;
        renderHistory();
    }

    function historyLabel(r) {
        const name = [r.artist, r.title].filter(Boolean).join(' - ') || r.name;
        return [name, r.bpm ? fmt(r.bpm, 0) + ' BPM' : '', r.camelot,
            isFinite(r.lufs) ? fmt(r.lufs, 1) + ' LUFS' : ''].filter(Boolean).join(' · ');
    }

    async function renderHistory() {
        if (!historyBox) return;
        let all = [];
        try { all = await list(TOOL); } catch (e) { return; }
        historyBox.textContent = '';
        const recent = all.slice(-HISTORY).reverse();
        if (clearBtn) clearBtn.hidden = recent.length === 0;
        if (clearConfirm && !recent.length) clearConfirm.hidden = true;
        recent.forEach((rec) => {
            const r = rec.value || rec;
            const id = rec.id || r.at;
            const li = document.createElement('li');
            li.className = 'dna-history-row';
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'dna-history-item';
            btn.setAttribute('data-dna-id', id);
            btn.textContent = historyLabel(r);
            /* riapre il risultato salvato: nessuna nuova analisi */
            btn.addEventListener('click', () => showResult(r));
            const rm = document.createElement('button');
            rm.type = 'button';
            rm.className = 'dna-history-del tb-btn--icon';
            rm.setAttribute('data-dna-del', String(id));
            rm.setAttribute('data-i18n-aria', 'dna-del-one');
            rm.setAttribute('aria-label', t('dna-del-one'));
            rm.textContent = '\u00d7';
            rm.addEventListener('click', (e) => { e.stopPropagation(); removeHistory(id); });
            li.append(btn, rm);
            historyBox.appendChild(li);
        });
    }

    /* ---------------- ingresso: file ---------------- */

    async function fromFile(file) {
        if (!file) return;
        try {
            setState('working');
            setPhase('decode', 2);
            /* i tag si leggono dai soli byte di testa, prima della decodifica */
            const tags = await readTags(file);
            const buffer = await decode(file);
            if (buffer.duration > MAX_MINUTES * 60) { fail('dna-too-long'); return; }
            if (buffer.duration > WARN_MINUTES * 60) setStatus(statusOut, { kind: 'idle', key: 'dna-long-warning' });
            await analyse(buffer, { source: 'file', name: file.name, tags });
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

    /* Ogni motivo per cui il microfono non parte ha il suo messaggio: se
       il tasto "Registra" non facesse nulla, non si capirebbe perche'.
       La mappa sta in mic.js, cosi' e' la stessa in tutti gli strumenti. */
    const micError = (err) => mic.errorKey(err);

    /* anche gli errori che arrivano da un'altra strada (stream perso,
       dispositivo staccato) devono comparire nel pannello */
    mic.onStateChange((state, info) => {
        if (!info || info.reason !== 'error') return;
        if (ui.state !== 'recording') return;
        setStatus(statusOut, { kind: 'denied', key: mic.errorKey(info.code) });
    });

    function startRecording() {
        if (starting || recording) return;
        starting = true;
        let ctx;
        try {
            unlock().catch(() => {});
            ctx = getContext();
        } catch (e) { starting = false; fail('audio-resume-msg'); return; }
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            starting = false;
            setState('recording');
            setStatus(statusOut, { kind: 'denied', key: 'mic-unavailable' });
            return;
        }
        mic.acquire().then((stream) => {
            starting = false;
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
            const mimeOk = typeof MediaRecorder === 'function'
                && (!MediaRecorder.isTypeSupported
                    || ['audio/webm', 'audio/mp4', 'audio/ogg', ''].some((m) => !m || MediaRecorder.isTypeSupported(m)));
            if (mimeOk) {
                try {
                    recorder = new MediaRecorder(stream);
                    recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
                    recorder.start();
                } catch (e) { recorder = null; }
            }
            /* nessun MediaRecorder utilizzabile: si registra il PCM a mano */
            let pcm = null;
            if (!recorder) {
                const node = ctx.createScriptProcessor ? ctx.createScriptProcessor(4096, 1, 1) : null;
                if (node) {
                    const parts = [];
                    node.onaudioprocess = (e) => parts.push(Float32Array.from(e.inputBuffer.getChannelData(0)));
                    source.connect(node);
                    node.connect(sink);
                    pcm = { node, parts, rate: ctx.sampleRate };
                }
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
                pcm,
                async finish() {
                    let blob = null;
                    if (recorder && recorder.state !== 'inactive') {
                        blob = await new Promise((resolve) => {
                            recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
                            recorder.stop();
                        });
                    }
                    let raw = null;
                    if (pcm) {
                        pcm.node.onaudioprocess = null;
                        try { pcm.node.disconnect(); } catch (e) { /* gia' scollegato */ }
                        const total = pcm.parts.reduce((a, c) => a + c.length, 0);
                        const mono = new Float32Array(total);
                        let o = 0;
                        pcm.parts.forEach((c) => { mono.set(c, o); o += c.length; });
                        raw = { mono, rate: pcm.rate };
                    }
                    try { source.disconnect(); analyser.disconnect(); sink.disconnect(); } catch (e) { /* gia' scollegati */ }
                    mic.release();
                    return { blob, raw };
                }
            };
            recording.raf = window.requestAnimationFrame(tick);
        }, (err) => {
            starting = false;   // senza questo il tasto restava muto per sempre
            setState('recording');
            setStatus(statusOut, { kind: 'denied', key: micError(err) });
            if (consentBox) mic.renderConsent(consentBox, { onAllow: startRecording });
        });
    }

    async function stopRecording() {
        if (!recording) return;
        if (recording.raf) window.cancelAnimationFrame(recording.raf);
        const current = recording;
        recording = null;
        starting = false;
        const { blob, raw } = await current.finish();
        try {
            if (blob && blob.size) {
                const buffer = await decode(blob);
                await analyse(buffer, { source: 'mic', name: t('dna-mic-name') });
                return;
            }
            if (raw && raw.mono.length) {
                const ctx = getContext();
                const buffer = ctx.createBuffer(1, raw.mono.length, raw.rate);
                buffer.getChannelData(0).set(raw.mono);
                await analyse(buffer, { source: 'mic', name: t('dna-mic-name') });
                return;
            }
            setState('recording');
            setStatus(statusOut, { kind: 'error', key: 'mic-failed' });
        } catch (e) {
            fail('dna-bad-file');
        }
    }

    if (recordBtn) {
        recordBtn.addEventListener('click', () => {
            /* si entra SUBITO nello stato registrazione: il riquadro del
               consenso deve vedersi, altrimenti sembra che non succeda nulla */
            setState('recording');
            if (consentBox) consentBox.textContent = '';
            /* niente API del microfono (http, browser dentro un'app): si dice */
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setStatus(statusOut, { kind: 'denied', key: 'mic-unavailable' });
                if (consentBox) mic.renderConsent(consentBox, { onAllow: startRecording });
                return;
            }
            if (mic.state() === 'denied') {
                setStatus(statusOut, { kind: 'denied', key: 'mic-denied' });
                if (consentBox) mic.renderConsent(consentBox, { onAllow: startRecording });
                return;
            }
            if (mic.granted()) {
                startRecording();   // dentro il gesto: getUserMedia puo' partire
                return;
            }
            if (consentBox) mic.renderConsent(consentBox, { onAllow: startRecording });
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
    /* svuota tutto: conferma nella pagina, mai il confirm() del browser */
    if (clearBtn && clearConfirm) {
        clearBtn.addEventListener('click', () => { clearConfirm.hidden = false; });
        const yes = document.getElementById('dna-clear-yes');
        const no = document.getElementById('dna-clear-no');
        if (yes) yes.addEventListener('click', clearHistory);
        if (no) no.addEventListener('click', () => { clearConfirm.hidden = true; });
    }
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
        showTags,
        renderHistory,
        removeHistory,
        clearHistory,
        historyRecord,
        startRecording,
        micError,
        summary,
        setState,
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
