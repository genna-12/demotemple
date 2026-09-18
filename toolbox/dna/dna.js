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
 * ASCOLTO "alla Shazam" (feedback Genna) — markup atteso dal builder,
 * dentro lo stato registrazione (#dna-recording), al posto del countdown:
 *   <div id="dna-shazam" class="dna-shazam">
 *     <button type="button" id="dna-shazam-btn" class="dna-shazam-btn" aria-pressed="false">
 *       <img class="dna-shazam-logo" src="/assets/brand/logo-arancione.png" alt=""
 *            width="140" height="140">
 *       <span id="dna-shazam-label" class="dna-shazam-label"
 *             data-i18n="dna-press">Premi per iniziare</span>
 *     </button>
 *     <div id="dna-rings" class="dna-rings" aria-hidden="true"></div>
 *   </div>
 *   - mentre ascolta, #dna-shazam ha la classe `is-listening` e il bottone
 *     `aria-pressed="true"`; l'etichetta passa a dna-listening e poi a
 *     dna-almost (analisi in corso).
 *   - il logo "respira" con la musica: dna.js scrive su #dna-shazam-btn la
 *     variabile `--dna-pulse` (0..1, gia' smussata). In CSS basta
 *     `transform: scale(calc(1 + var(--dna-pulse) * 0.18))`.
 *   - a ogni colpo dna.js aggiunge dentro #dna-rings uno
 *     <span class="dna-ring"></span> e lo toglie dopo ~900 ms: l'anello che
 *     si espande e sfuma sta tutto nel CSS (animazione su .dna-ring).
 *   - il tocco successivo sul logo ferma e analizza; #dna-countdown, se c'e',
 *     continua a mostrare i secondi che restano.
 *   - ANNULLA (feedback Genna) — serve nel markup, dentro #dna-recording,
 *     sotto il logo: <button type="button" id="dna-listen-cancel"
 *     class="tb-btn tb-btn--ghost" data-i18n="dna-cancel">Annulla</button>
 *     (id NUOVO: #dna-cancel e' gia' preso dallo stato analisi e un id non
 *     si ripete). Ferma le tracce e torna allo stato vuoto SENZA analizzare;
 *     "ferma e analizza" resta il secondo tocco sul logo (e #dna-stop).
 *     Va bene anche un [data-dna-listen-cancel] su un altro elemento.
 *   - l'ascolto si ferma da solo quando due analisi di fila concordano
 *     (BPM con confidenza >= 0,6 e tonalita' >= 0,55), al massimo a 25 s:
 *     in quel caso il risultato porta l'avviso #dna-uncertain.
 * RISULTATO DAL MICROFONO:
 *   <p id="dna-mic-note" class="dna-mic-note" hidden data-i18n="dna-mic-note">...</p>
 *   <p id="dna-uncertain" class="dna-uncertain" hidden data-i18n="dna-uncertain">...</p>
 *   e una "i" (.tb-info + .tb-sheet #dna-mic-info) con la spiegazione lunga.
 *   I tre elementi stanno dentro .dna-mic-disclaimer: per un risultato da
 *   FILE il disclaimer non c'entra nulla, quindi dna.js nasconde tutto il
 *   contenitore (la "i" compresa). Serve la regola gemella di quella gia'
 *   in dna.css: `.dna-mic-disclaimer[hidden] { display: none }` (il
 *   contenitore e' display:flex, [hidden] da solo non basta).
 * NIENTE SEGNALE:
 *   sotto -60 dBFS di RMS o -50 LUFS il Worker torna { silent: true } e la
 *   pagina mostra l'errore `dna-silent` ("Nessun suono rilevato") senza
 *   BPM ne' tonalita'. Dopo i 25 s di ascolto senza conferma il risultato
 *   e' SEMPRE marcato incerto e le etichette di confidenza scendono.
 * LOUDNESS E PIATTAFORMA:
 *   <span id="dna-target-label" class="dna-target-label"></span> accanto al
 *   select: dna.js ci scrive "Target Spotify: -14 LUFS"; sulla barra
 *   #dna-lufs-bar scrive `--dna-lufs` (posizione del valore) e
 *   `--dna-target` (posizione del marcatore), entrambe in percentuale.
 *
 * Chiavi i18n in piu': dna-del-one, dna-clear, dna-clear-ask, dna-clear-yes,
 *   dna-clear-no, dna-history-empty. I messaggi del microfono sono
 *   CONDIVISI (shared/i18n-common.js, li usa anche l'accordatore):
 *   mic-denied e mic-unavailable ci sono gia', servono mic-none
 *   ("Nessun microfono collegato"), mic-busy ("Il microfono e' in uso da
 *   un'altra applicazione") e mic-failed ("Impossibile usare il microfono").
 *   Per l'ascolto: dna-press, dna-listening, dna-almost, dna-uncertain,
 *   dna-mic-note, dna-mic-info-title, dna-mic-info-text, dna-target-label
 *   ("Target {platform}: {lufs} LUFS").
 * Chiavi i18n usate da questo file (oltre a quelle del markup, spec 13 §3):
 *   dna-phase-decode / -loudness / -rhythm / -key   fasi della barra
 *   dna-conf-high / -mid / -low                     confidenza in parole
 *   dna-major / dna-minor / dna-key                 tonalita' e sua etichetta
 *   dna-on-target / dna-turn-up / dna-turn-down     consiglio sul target
 *   dna-copied / dna-copy-manual                    esito della copia
 *   dna-bad-file / dna-too-long / dna-long-warning  errori e avviso oltre 8 min
 *   dna-silent                                      "Nessun suono rilevato"
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
import { getContext, unlock, decode, needsGesture, addWorklet } from '/shared/audio.js';
import * as mic from '/shared/mic.js';
import { prefs, put, list, del } from '/shared/storage.js';
import { fold } from '/shared/analysis/bpm.js';
import { compatibleWith } from '/shared/analysis/key.js';
import { gainToTarget, TARGETS } from '/shared/analysis/loudness.js';
import { readTags, coverBlob } from '/shared/tags.js';

const TOOL = 'dna';
const WORKER_URL = '/dna/dna-worker.js';
const CAPTURE_URL = '/shared/capture-worklet.js';
const CAPTURE_BLOCK = 4096;   // campioni per messaggio dal worklet
const BLOCK_SECONDS = 30;     // i canali nativi viaggiano a blocchi
const MAX_MINUTES = 15;
const WARN_MINUTES = 8;       // oltre, su iPhone la decodifica puo' non farcela
const REC_MIN = 10;
const REC_MAX = 20;
const LISTEN_FIRST = 8;       // s: primo tentativo di analisi
const LISTEN_EVERY = 4;       // s fra un tentativo e il successivo
const LISTEN_MAX = 25;        // s: oltre, si mostra quel che si e' capito
const BPM_SURE = 0.6;
const KEY_SURE = 0.55;
const RING_MS = 900;          // quanto vive un anello
const PULSE_EASE = 0.25;      // quanto insegue il livello (0-1)
const ONSET_GAP = 180;        // ms minimi fra due anelli
const HISTORY = 200;   // solo metadati: 200 voci pesano pochi KB

const fmt = (v, digits) => {
    try {
        return new Intl.NumberFormat(lang(), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
    } catch (e) {
        return Number(v).toFixed(digits);
    }
};

/* Un risultato "incerto" (ascolto finito a tempo scaduto senza conferma)
   non puo' esibire una confidenza alta: le etichette scendono di un
   gradino, i numeri restano quelli veri. */
const UNSURE_SCALE = 0.5;
const confidenceKey = (c, unsure) => {
    const v = (Number(c) || 0) * (unsure ? UNSURE_SCALE : 1);
    return v >= 0.6 ? 'dna-conf-high' : v >= 0.3 ? 'dna-conf-mid' : 'dna-conf-low';
};

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
    const shazam = document.getElementById('dna-shazam');
    const shazamBtn = document.getElementById('dna-shazam-btn');
    const shazamLabel = document.getElementById('dna-shazam-label');
    const ringsBox = document.getElementById('dna-rings');
    const micNote = document.getElementById('dna-mic-note');
    const uncertain = document.getElementById('dna-uncertain');
    /* il disclaimer e la sua "i" sono un blocco solo: da file spariscono insieme */
    const disclaimer = (micNote && micNote.closest('.dna-mic-disclaimer'))
        || document.querySelector('.dna-mic-disclaimer');
    const listenCancel = document.getElementById('dna-listen-cancel')
        || document.querySelector('[data-dna-listen-cancel]');
    const targetLabel = document.getElementById('dna-target-label');
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
    let listening = null;       // ascolto in corso (stile Shazam)
    let coverUrl = null;        // object URL della copertina mostrata

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

    async function analyse(buffer, { source = 'file', name = '', tags = null, mic: fromMic = false, uncertain: notSure = false } = {}) {
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
            { type: 'analyse', channels: buffers, sampleRate, a4, mic: fromMic },
            buffers,
            (p, pct) => {
                const range = phases[p] || phases.rhythm;
                setPhase(p, range[0] + (range[1] - range[0]) * (pct / 100));
            }
        );
        copies.length = 0;
        if (cancelled) return null;
        /* rumore di fondo e silenzio: nessun numero, un messaggio chiaro */
        if (data.silent) { stopWorker(); fail('dna-silent'); return null; }

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
            uncertain: !!notSure,
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
        const unsure = !!result.uncertain;
        const conf = out('dna-bpm-conf');
        if (conf) {
            conf.setAttribute('data-i18n', confidenceKey(result.bpmConfidence, unsure));
            conf.textContent = t(confidenceKey(result.bpmConfidence, unsure));
        }
        if (foldBox) foldBox.hidden = !(result.bpmAlternatives && result.bpmAlternatives.length);
        set('dna-key', result.tonic ? result.tonic + ' ' + t(result.mode === 'minor' ? 'dna-minor' : 'dna-major') : '—');
        set('dna-camelot', result.camelot || '');
        set('dna-key-compat', compatibleWith(result.camelot).join(' · '));
        const keyConf = out('dna-key-conf');
        if (keyConf) {
            keyConf.setAttribute('data-i18n', confidenceKey(result.keyConfidence * 3, unsure));
            keyConf.textContent = t(confidenceKey(result.keyConfidence * 3, unsure));
        }
        set('dna-lufs', isFinite(result.lufs) ? fmt(result.lufs, 1) + ' LUFS' : '—');
        set('dna-tp', isFinite(result.truePeak) ? fmt(result.truePeak, 1) + ' dBTP' : '—');
        set('dna-lra', result.lra === null || result.lra === undefined ? '' : fmt(result.lra, 1) + ' LU');
        set('dna-duration', fmt(Math.floor(result.seconds / 60), 0) + ':' + String(Math.round(result.seconds % 60)).padStart(2, '0'));
        set('dna-rate', fmt(result.sampleRate / 1000, 1) + ' kHz');
        set('dna-channels', String(result.channels));
        const fromMic = result.source === 'mic';
        const badge = out('dna-estimate');
        if (badge) badge.hidden = !fromMic;
        /* dal microfono la stima puo' sbagliare: si dice, e si spiega. Da
           file non c'entra nulla: via il disclaimer, via anche la "i". */
        if (micNote) micNote.hidden = !fromMic;
        if (uncertain) uncertain.hidden = !unsure;
        if (disclaimer) disclaimer.hidden = !fromMic && !unsure;
        renderAdvice();
    }

    /* -30..0 LUFS sulla barra: comodo per leggere a colpo d'occhio */
    const barPos = (lufs) => Math.max(0, Math.min(100, (lufs + 30) / 30 * 100));

    function renderTargetLabel() {
        if (!targetLabel) return;
        const t0 = TARGETS[ui.target] || TARGETS.spotify;
        /* il nome della piattaforma e' quello scritto nel select: non serve
           una chiave per "Spotify" */
        const option = targetSelect ? targetSelect.querySelector('option[value="' + ui.target + '"]') : null;
        const name = option ? option.textContent.trim() : ui.target;
        const lufs = fmt(t0.lufs, 0);
        const text = t('dna-target-label', { platform: name, lufs });
        targetLabel.textContent = text === 'dna-target-label' ? 'Target ' + name + ': ' + lufs + ' LUFS' : text;
        const bar = out('dna-lufs-bar');
        if (bar) bar.style.setProperty('--dna-target', barPos(t0.lufs).toFixed(1) + '%');
    }

    function renderAdvice() {
        renderTargetLabel();
        const el = out('dna-advice');
        if (!el || !ui.result) return;
        const g = gainToTarget(ui.result.lufs, ui.target);
        el.textContent = g.onTarget
            ? t('dna-on-target')
            : t(g.direction === 'up' ? 'dna-turn-up' : 'dna-turn-down') + ' ' + fmt(Math.abs(g.diff), 1) + ' dB';
        const bar = out('dna-lufs-bar');
        if (bar) bar.style.setProperty('--dna-lufs', barPos(ui.result.lufs).toFixed(1) + '%');
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

    /** Il riquadro del consenso si vede solo finche' serve. */
    function showConsent(show) {
        if (!consentBox) return;
        if (show) {
            consentBox.hidden = false;
            mic.renderConsent(consentBox, { onAllow: startListening });
            return;
        }
        /* dato il permesso, il riquadro sparisce: prima restava li' */
        consentBox.textContent = '';
        consentBox.hidden = true;
    }

    function setListenLabel(key) {
        if (!shazamLabel) return;
        shazamLabel.setAttribute('data-i18n', key);
        shazamLabel.textContent = t(key);
    }

    function setListening(on) {
        if (shazam) shazam.classList.toggle('is-listening', on);
        if (shazamBtn) shazamBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (listenCancel) listenCancel.hidden = !on;
        if (!on && shazamBtn) shazamBtn.style.removeProperty('--dna-pulse');
        if (ringsBox && !on) ringsBox.textContent = '';
    }

    /** Un anello che si espande a ogni colpo (l'animazione sta nel CSS). */
    function ring() {
        if (!ringsBox) return;
        const el = document.createElement('span');
        el.className = 'dna-ring';
        ringsBox.appendChild(el);
        setTimeout(() => el.remove(), RING_MS);
    }

    /* Due analisi di fila che dicono la stessa cosa, con confidenze alte:
       piu' di cosi' non si impara restando in ascolto. */
    function agrees(prev, cur) {
        if (!prev || !cur) return false;
        if (!(cur.bpm.confidence >= BPM_SURE) || !(cur.key.confidence >= KEY_SURE)) return false;
        if (prev.key.tonic !== cur.key.tonic || prev.key.mode !== cur.key.mode) return false;
        const a = prev.bpm.bpm;
        const b = cur.bpm.bpm;
        return a > 0 && b > 0 && Math.abs(Math.log2(a / b)) < 0.03;
    }

    /* ---------------- ascolto "alla Shazam" ---------------- */

    function startListening() {
        if (starting || listening) return;
        starting = true;
        let ctx;
        try {
            unlock().catch(() => {});
            ctx = getContext();
        } catch (e) { starting = false; fail('audio-resume-msg'); return; }
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            starting = false;
            setStatus(statusOut, { kind: 'denied', key: 'mic-unavailable' });
            showConsent(true);
            return;
        }
        /* musica, non voce: niente cancellazione, niente riduzione rumore,
           niente guadagno automatico (falsano livello e intonazione) */
        mic.acquire({ echoCancellation: false, noiseSuppression: false, autoGainControl: false }).then(() => {
            starting = false;
            showConsent(false);
            setStatus(statusOut, { kind: 'idle', key: '' });
            if (statusOut) statusOut.textContent = '';
            beginCapture(ctx);
        }, (err) => {
            starting = false;
            setStatus(statusOut, { kind: 'denied', key: micError(err) });
            showConsent(true);
        });
    }

    /**
     * Cattura PCM dell'ascolto. Prima scelta: AudioWorklet
     * (shared/capture-worklet.js), che non stampa piu' in console
     * "ScriptProcessorNode is deprecated". Il ScriptProcessor resta SOLO
     * come ripiego se addModule fallisce (iOS vecchi).
     * Il worklet si carica in pochi ms mentre l'ascolto e' gia' partito:
     * la prima analisi arriva comunque a 8 s.
     */
    function attachCapture(state) {
        const { ctx, source, sink, parts } = state;
        const plug = (node) => {
            if (!node) return;
            if (listening !== state) { try { node.disconnect(); } catch (e) { /* mai collegato */ } return; }
            state.node = node;
            try { source.connect(node); node.connect(sink); } catch (e) { state.node = null; }
        };
        const fallback = () => {
            if (!ctx.createScriptProcessor) return;
            const node = ctx.createScriptProcessor(CAPTURE_BLOCK, 1, 1);
            node.onaudioprocess = (e) => parts.push(Float32Array.from(e.inputBuffer.getChannelData(0)));
            plug(node);
        };
        let ready;
        try { ready = addWorklet(CAPTURE_URL); } catch (e) { ready = Promise.resolve(false); }
        Promise.resolve(ready).then((okWorklet) => {
            if (listening !== state) return;
            if (!okWorklet || typeof AudioWorkletNode === 'undefined') { fallback(); return; }
            let node;
            try {
                node = new AudioWorkletNode(ctx, 'tt-capture', {
                    numberOfInputs: 1,
                    numberOfOutputs: 1,
                    outputChannelCount: [1],
                    processorOptions: { size: CAPTURE_BLOCK }
                });
            } catch (e) { fallback(); return; }
            node.port.onmessage = (e) => {
                const msg = e.data;
                if (!msg || msg.type !== 'block' || !msg.samples) return;
                parts.push(msg.samples);   // gia' trasferito: nessuna copia
            };
            plug(node);
        }, () => { if (listening === state) fallback(); });
    }

    function beginCapture(ctx) {
        const source = mic.source(ctx);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.6;
        const sink = ctx.createGain();
        sink.gain.value = 0;
        source.connect(analyser).connect(sink).connect(ctx.destination);
        const parts = [];
        const time = new Float32Array(analyser.fftSize);
        const spectrum = new Float32Array(analyser.frequencyBinCount);
        const prevSpectrum = new Float32Array(analyser.frequencyBinCount);
        listening = {
            ctx,
            source,
            analyser,
            sink,
            node: null,   // lo attacca attachCapture() appena il worklet e' pronto
            parts,
            rate: ctx.sampleRate,   // SEMPRE quello vero del contesto
            started: Date.now(),
            raf: null,
            pulse: 0,
            lastRing: 0,
            nextAt: LISTEN_FIRST,
            prev: null,
            busy: false
        };
        setListening(true);
        setListenLabel('dna-listening');
        attachCapture(listening);
        const tick = () => {
            if (!listening) return;
            const elapsed = (Date.now() - listening.started) / 1000;
            if (countdown) countdown.textContent = String(Math.max(0, Math.ceil(LISTEN_MAX - elapsed)));
            /* livello: il logo respira col volume */
            if (analyser.getFloatTimeDomainData) {
                analyser.getFloatTimeDomainData(time);
                let sum = 0;
                for (let i = 0; i < time.length; i++) sum += time[i] * time[i];
                const rms = Math.sqrt(sum / time.length);
                const target = Math.min(1, rms * 6);
                listening.pulse += (target - listening.pulse) * PULSE_EASE;
                if (shazamBtn) shazamBtn.style.setProperty('--dna-pulse', listening.pulse.toFixed(3));
                if (level) level.style.setProperty('--dna-level', (listening.pulse * 100).toFixed(1) + '%');
            }
            /* colpi: salto positivo dello spettro rispetto al frame prima */
            if (analyser.getFloatFrequencyData) {
                analyser.getFloatFrequencyData(spectrum);
                let flux = 0;
                for (let i = 0; i < spectrum.length; i++) {
                    const v = isFinite(spectrum[i]) ? spectrum[i] : -140;
                    const d = v - prevSpectrum[i];
                    if (d > 0) flux += d;
                    prevSpectrum[i] = v;
                }
                const now = Date.now();
                if (flux > 220 && now - listening.lastRing > ONSET_GAP) {
                    listening.lastRing = now;
                    ring();
                }
            }
            if (elapsed >= listening.nextAt && !listening.busy) {
                listening.nextAt = elapsed + LISTEN_EVERY;
                tryAnalysis();
            }
            if (elapsed >= LISTEN_MAX) { stopListening({ uncertain: true }); return; }
            listening.raf = window.requestAnimationFrame(tick);
        };
        listening.raf = window.requestAnimationFrame(tick);
    }

    /** Copia quel che si e' catturato finora, in un pezzo solo. */
    function captured() {
        if (!listening) return new Float32Array(0);
        const total = listening.parts.reduce((a, c) => a + c.length, 0);
        const mono = new Float32Array(total);
        let o = 0;
        listening.parts.forEach((c) => { mono.set(c, o); o += c.length; });
        return mono;
    }

    /* Analisi progressiva: ogni pochi secondi si prova, e appena due
       tentativi di fila concordano si smette di ascoltare. */
    async function tryAnalysis() {
        if (!listening || listening.busy) return;
        const mono = captured();
        if (mono.length < listening.rate * 4) return;
        listening.busy = true;
        setListenLabel('dna-almost');
        const a4 = Number(prefs.get('shared', 'a4', 440)) || 440;
        const rate = listening.rate;
        try {
            const data = await ask(
                { type: 'analyse', channels: [mono.buffer], sampleRate: rate, a4, mic: true },
                [mono.buffer],
                null
            );
            if (!listening) return;
            /* stanza muta: non si conta come tentativo, si continua ad ascoltare */
            if (data.silent) { listening.prev = null; listening.last = null; setListenLabel('dna-listening'); return; }
            const sure = agrees(listening.prev, data);
            listening.prev = data;
            listening.last = data;
            if (sure) { stopListening({ data }); return; }
            setListenLabel('dna-listening');
        } catch (e) {
            setListenLabel('dna-listening');
        } finally {
            if (listening) listening.busy = false;
        }
    }

    /** Stacca tutto e libera il microfono; torna lo stato che c'era. */
    function teardownListening() {
        const state = listening;
        if (!state) return null;
        listening = null;
        if (state.raf) window.cancelAnimationFrame(state.raf);
        if (state.node) {
            if (state.node.port) { try { state.node.port.postMessage('stop'); } catch (e) { /* gia' chiuso */ } }
            state.node.onaudioprocess = null;
            try { state.node.disconnect(); } catch (e) { /* gia' scollegato */ }
        }
        try { state.source.disconnect(); state.analyser.disconnect(); state.sink.disconnect(); } catch (e) { /* gia' scollegati */ }
        mic.release();   // le tracce si fermano qui: la spia del browser si spegne
        setListening(false);
        setListenLabel('dna-press');
        return state;
    }

    /** "Annulla" durante l'ascolto: si ferma tutto e non si analizza nulla. */
    function cancelListening() {
        if (!listening) return;
        teardownListening();
        if (statusOut) statusOut.textContent = '';
        setState('empty');
    }

    /** Chiude l'ascolto e mostra quel che si e' capito. */
    function stopListening({ data = null, uncertain: notSure = false } = {}) {
        const state = teardownListening();
        if (!state) return;
        const seconds = (Date.now() - state.started) / 1000;
        const found = data || state.last;
        if (found) {
            finishListening(found, { seconds, rate: state.rate, uncertain: notSure || !agrees(state.prev, found) });
            return;
        }
        /* niente di analizzabile: si analizza comunque quel che c'e' */
        const mono = new Float32Array(state.parts.reduce((a, c) => a + c.length, 0));
        let o = 0;
        state.parts.forEach((c) => { mono.set(c, o); o += c.length; });
        if (!mono.length) { setState('empty'); return; }
        const ctx = state.ctx;
        const buffer = ctx.createBuffer(1, mono.length, state.rate);
        buffer.getChannelData(0).set(mono);
        /* si e' arrivati qui senza conferma: il risultato nasce incerto */
        analyse(buffer, { source: 'mic', name: t('dna-mic-name'), mic: true, uncertain: true });
    }

    /** Dal risultato del worker alla scheda, senza rianalizzare. */
    function finishListening(data, { seconds, rate, uncertain: notSure }) {
        const result = {
            name: t('dna-mic-name'),
            source: 'mic',
            title: '',
            artist: '',
            album: '',
            year: '',
            seconds,
            sampleRate: rate,
            channels: 1,
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
            uncertain: !!notSure,
            at: new Date().toISOString()
        };
        stopWorker();
        showResult(result);
        saveHistory(result);
    }

    /* "Registra" dallo stato vuoto: porta alla schermata di ascolto e, se
       il permesso c'e' gia', parte subito (siamo dentro il gesto). */
    if (recordBtn) {
        recordBtn.addEventListener('click', () => {
            setState('recording');
            setListenLabel('dna-press');
            if (statusOut) statusOut.textContent = '';
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setStatus(statusOut, { kind: 'denied', key: 'mic-unavailable' });
                showConsent(true);
                return;
            }
            if (mic.state() === 'denied') {
                setStatus(statusOut, { kind: 'denied', key: 'mic-denied' });
                showConsent(true);
                return;
            }
            if (mic.granted()) {
                showConsent(false);
                startListening();
                return;
            }
            showConsent(true);
        });
    }

    /* Il logo: primo tocco ascolta, secondo ferma. */
    if (shazamBtn) {
        shazamBtn.addEventListener('click', () => {
            if (listening) { stopListening({}); return; }   // secondo tocco: basta
            if (mic.granted()) startListening();
            else showConsent(true);
        });
    }

    if (stopBtn) stopBtn.addEventListener('click', () => stopListening({}));
    /* "Annulla" sotto il logo: si esce dall'ascolto senza analizzare nulla */
    if (listenCancel) listenCancel.addEventListener('click', cancelListening);

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
            prefs.set(TOOL, 'target', ui.target);   // la piattaforma si ricorda
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
        /* si esce dalla pagina: si libera il microfono, non si analizza */
        teardownListening();
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
        startListening,
        stopListening,
        cancelListening,
        showConsent,
        agrees,
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
