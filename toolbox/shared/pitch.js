/**
 * Tiny Temple Toolbox - rilevamento dell'altezza (pitch) dal microfono.
 *
 * Riusabile: accordatore oggi, estensione vocale e DNA domani. Fa una cosa
 * sola, l'analisi; il consenso e lo stream sono di shared/mic.js, il
 * contesto di shared/audio.js.
 *
 * Catena: mic.source(ctx) -> highpass 60 Hz (Q 0,707) -> analizzatore.
 * L'analizzatore e' un AudioWorklet (shared/pitch-worklet.js); se
 * audio.addWorklet() torna false (iOS) si passa a un ScriptProcessorNode
 * 2048 sul thread principale, con lo stesso algoritmo e la stessa pitchy.
 *
 * Finestra 2048, hop 1024, frequenza di campionamento letta a runtime.
 * Si scarta un frame se clarity < 0,90, hz fuori 28-1400 Hz o RMS sotto
 * -55 dBFS; sui frame buoni si prende la MEDIANA di 5. Se in 400 ms i
 * frame validi sono meno di 3 si emette "niente" (ago neutro).
 * Nessuna allocazione per frame: i buffer sono creati una volta sola.
 *
 * createPitchTracker({ ctx, onPitch, onSilence, onError, ... })
 *   -> { start(), stop(), rebuild(), running(), usingWorklet() }
 *   onPitch({ hz, clarity, rms })   hz gia' mediato
 *   onSilence()                     nessun suono utile (ago neutro)
 * Le funzioni pure (noteInfo, nearestIndex...) non toccano il microfono e
 * si possono usare anche nei test.
 */

import { getContext, addWorklet, sampleRate } from './audio.js';
import * as mic from './mic.js';

const WORKLET_URL = '/shared/pitch-worklet.js';
const PITCHY_URL = '/vendor/pitchy@4.1.0/pitchy.js';
const SIZE = 2048;
const HOP = 1024;
const HPF_HZ = 60;
const HPF_Q = 0.707;
const CLARITY_MIN = 0.9;
const HZ_MIN = 28;
const HZ_MAX = 1400;
const RMS_MIN_DB = -55;
const MEDIAN = 5;
const QUIET_MS = 400;
const QUIET_MIN_FRAMES = 3;

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/* ---------------- funzioni pure (niente audio) ---------------- */

/** MIDI (numero reale) di una frequenza, dato il riferimento A4. */
export function hzToMidi(hz, a4 = 440) {
    return 69 + 12 * Math.log2(hz / a4);
}

export function midiToHz(midi, a4 = 440) {
    return a4 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Nota, ottava e scostamento in cent (-50..+50) di una frequenza.
 * `flats` scrive Sib invece di La#, per le accordature in bemolle.
 */
export function noteInfo(hz, a4 = 440, { flats = false } = {}) {
    const midi = hzToMidi(hz, a4);
    const nearest = Math.round(midi);
    const cents = Math.round((midi - nearest) * 100);
    const names = flats ? FLAT_NAMES : NOTE_NAMES;
    const index = ((nearest % 12) + 12) % 12;
    return {
        hz,
        midi,
        nearest,
        cents,
        note: names[index],
        octave: Math.floor(nearest / 12) - 1
    };
}

/** Nota di un nome tipo "E2"/"Eb2"/"F#3" -> frequenza con il dato A4. */
export function noteToHz(name, a4 = 440) {
    const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(String(name).trim());
    if (!m) return NaN;
    const step = NOTE_NAMES.indexOf(m[1].toUpperCase());
    if (step === -1) return NaN;
    const alter = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
    const midi = (Number(m[3]) + 1) * 12 + step + alter;
    return midiToHz(midi, a4);
}

/**
 * Indice della frequenza piu' vicina in `freqs` (corde), o -1 se nessuna
 * sta entro `maxCents`. Confronto in cent: e' quello che sente l'orecchio.
 */
export function nearestIndex(hz, freqs, maxCents = 150) {
    let best = -1;
    let bestCents = Infinity;
    for (let i = 0; i < freqs.length; i++) {
        const cents = Math.abs(1200 * Math.log2(hz / freqs[i]));
        if (cents < bestCents) { bestCents = cents; best = i; }
    }
    return bestCents <= maxCents ? best : -1;
}

/* ---------------- analizzatore ---------------- */

/** Mediana su una finestra fissa, senza allocare nulla per frame. */
function createMedian(n) {
    const values = new Float32Array(n);
    const sorted = new Float32Array(n);
    let count = 0;
    let write = 0;
    return {
        push(v) {
            values[write] = v;
            write = (write + 1) % n;
            if (count < n) count++;
            sorted.set(values);
            const view = sorted.subarray(0, count);
            view.sort();
            return count % 2 ? view[(count - 1) / 2] : (view[count / 2 - 1] + view[count / 2]) / 2;
        },
        reset() { count = 0; write = 0; },
        count: () => count
    };
}

export function createPitchTracker({
    ctx = null,
    onPitch,
    onSilence,
    onError,
    clarityMin = CLARITY_MIN,
    minHz = HZ_MIN,
    maxHz = HZ_MAX,
    rmsMinDb = RMS_MIN_DB
} = {}) {
    let audioCtx = ctx;
    let hpf = null;
    let node = null;         // AudioWorkletNode o ScriptProcessorNode
    let sink = null;         // gain a zero: tiene vivo il ramo senza far rumore
    let src = null;
    let detector = null;     // solo nel ripiego
    let buffer = null;       // finestra del ripiego (allocata una volta)
    let ring = null;
    let ringWrite = 0;
    let ringFilled = 0;
    let ringTotal = 0;
    let worklet = false;
    let started = false;
    const median = createMedian(MEDIAN);
    let validTimes = new Float64Array(QUIET_MIN_FRAMES * 4);
    let validWrite = 0;
    let quiet = true;

    const rmsMin = Math.pow(10, rmsMinDb / 20);

    function markValid(now) {
        validTimes[validWrite] = now;
        validWrite = (validWrite + 1) % validTimes.length;
    }

    function enoughRecent(now) {
        let n = 0;
        for (let i = 0; i < validTimes.length; i++) {
            if (validTimes[i] && now - validTimes[i] <= QUIET_MS) n++;
        }
        return n >= QUIET_MIN_FRAMES;
    }

    /* cuore comune ai due percorsi: un frame analizzato -> forse una nota */
    function handle(hz, clarity, rms) {
        const now = (audioCtx ? audioCtx.currentTime : 0) * 1000;
        const good = clarity >= clarityMin && hz >= minHz && hz <= maxHz && rms >= rmsMin;
        if (good) {
            markValid(now);
            const value = median.push(hz);
            if (median.count() >= 3) {
                quiet = false;
                if (typeof onPitch === 'function') onPitch({ hz: value, clarity, rms });
            }
            return;
        }
        if (enoughRecent(now)) return; // buco breve: si tiene l'ultima lettura
        median.reset();
        if (!quiet) {
            quiet = true;
            if (typeof onSilence === 'function') onSilence();
        }
    }

    function onWorkletMessage(e) {
        const d = e.data;
        handle(d.hz, d.clarity, d.rms);
    }

    /* ripiego: stessa analisi, ma sul thread principale */
    function processFallback(e) {
        const input = e.inputBuffer.getChannelData(0);
        for (let i = 0; i < input.length; i++) {
            ring[ringWrite] = input[i];
            ringWrite = (ringWrite + 1) % SIZE;
        }
        ringFilled += input.length;
        ringTotal += input.length;
        if (ringFilled < HOP || ringTotal < SIZE) return;
        ringFilled = 0;
        const tail = SIZE - ringWrite;
        buffer.set(ring.subarray(ringWrite), 0);
        buffer.set(ring.subarray(0, ringWrite), tail);
        let sum = 0;
        for (let i = 0; i < SIZE; i++) sum += buffer[i] * buffer[i];
        const [hz, clarity] = detector.findPitch(buffer, audioCtx.sampleRate);
        handle(hz, clarity, Math.sqrt(sum / SIZE));
    }

    async function buildFallback() {
        const { PitchDetector } = await import(PITCHY_URL);
        detector = PitchDetector.forFloat32Array(SIZE);
        detector.minVolumeDecibels = -60;
        buffer = new Float32Array(SIZE);
        ring = new Float32Array(SIZE);
        ringWrite = 0;
        ringFilled = 0;
        ringTotal = 0;
        const sp = audioCtx.createScriptProcessor(SIZE, 1, 1);
        sp.onaudioprocess = processFallback;
        return sp;
    }

    /** Collega (o ricollega) microfono -> filtro -> analizzatore. */
    function connect() {
        src = mic.source(audioCtx);
        src.connect(hpf);
        hpf.connect(node);
        node.connect(sink);
    }

    function disconnectChain() {
        [src, hpf, node, sink].forEach((n) => {
            if (n) { try { n.disconnect(); } catch (e) { /* gia' scollegato */ } }
        });
        src = null;
    }

    async function start() {
        if (started) return true;
        audioCtx = audioCtx || getContext();
        await mic.acquire();
        if (!hpf) {
            hpf = audioCtx.createBiquadFilter();
            hpf.type = 'highpass';
            hpf.frequency.setValueAtTime(HPF_HZ, audioCtx.currentTime);
            hpf.Q.setValueAtTime(HPF_Q, audioCtx.currentTime);
            sink = audioCtx.createGain();
            sink.gain.value = 0; // nessun ritorno in cuffia: solo per tenere vivo il ramo
            sink.connect(audioCtx.destination);
        }
        if (!node) {
            worklet = await addWorklet(WORKLET_URL);
            if (worklet) {
                node = new AudioWorkletNode(audioCtx, 'tt-pitch', {
                    numberOfInputs: 1,
                    numberOfOutputs: 1,
                    outputChannelCount: [1],
                    processorOptions: { size: SIZE, hop: HOP, sampleRate: sampleRate() }
                });
                node.port.onmessage = onWorkletMessage;
            } else {
                node = await buildFallback();
            }
        }
        median.reset();
        validTimes = validTimes.fill(0);
        quiet = true;
        connect();
        started = true;
        return true;
    }

    /** Il microfono e' tornato (mic reason 'resumed'): si rifa' il nodo sorgente. */
    function rebuild() {
        if (!started) return;
        try {
            if (src) src.disconnect();
        } catch (e) { /* gia' scollegato */ }
        median.reset();
        quiet = true;
        try {
            connect();
        } catch (e) {
            if (typeof onError === 'function') onError(e);
        }
    }

    function stop() {
        if (!started) return;
        started = false;
        if (node && node.port) node.port.postMessage('stop');
        if (node && node.onaudioprocess) node.onaudioprocess = null;
        disconnectChain();
        node = null;
        detector = null;
        median.reset();
        quiet = true;
        mic.release();
    }

    return {
        start,
        stop,
        rebuild,
        /** Limita la banda utile (es. la corda piu' bassa meno un tono):
            sotto quella soglia il ronzio di rete non diventa una nota. */
        setRange(lo, hi) {
            if (lo > 0) minHz = lo;
            if (hi > 0) maxHz = hi;
            median.reset();
        },
        range: () => ({ minHz, maxHz }),
        running: () => started,
        usingWorklet: () => worklet,
        /** Solo per i test: inietta un frame gia' analizzato. */
        feed: (hz, clarity, rms) => handle(hz, clarity, rms)
    };
}
