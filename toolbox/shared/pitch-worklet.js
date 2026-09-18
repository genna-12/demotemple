/**
 * Tiny Temple Toolbox - rilevamento del pitch nel thread audio.
 *
 * Caricato con audio.addWorklet('/shared/pitch-worklet.js'); se il browser
 * non regge l'import ESM dentro il worklet (iOS ha dato problemi),
 * addModule fallisce, addWorklet torna false e shared/pitch.js passa al
 * ScriptProcessor sul thread principale con lo STESSO algoritmo.
 *
 * Accumula `size` campioni (2048) e a ogni `hop` (1024) calcola pitch e
 * clarity con pitchy (MPM), piu' l'RMS della finestra. Tutti i buffer sono
 * allocati una volta sola: dentro process() non si alloca nulla.
 * Al thread principale va un messaggio { hz, clarity, rms } per finestra
 * (circa 47 al secondo a 48 kHz), niente di piu'.
 */

import { PitchDetector } from '/vendor/pitchy@4.1.0/pitchy.js';

const DEFAULT_SIZE = 2048;
const DEFAULT_HOP = 1024;

class PitchProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        const opts = (options && options.processorOptions) || {};
        this.size = opts.size || DEFAULT_SIZE;
        this.hop = opts.hop || DEFAULT_HOP;
        this.ring = new Float32Array(this.size);
        this.window = new Float32Array(this.size);
        this.write = 0;      // posizione di scrittura nel buffer circolare
        this.filled = 0;     // campioni raccolti dall'ultima analisi
        this.total = 0;      // campioni totali visti (serve al primo riempimento)
        this.detector = PitchDetector.forFloat32Array(this.size);
        this.detector.minVolumeDecibels = -60;
        this.alive = true;
        this.port.onmessage = (e) => {
            if (e.data === 'stop') this.alive = false;
        };
    }

    analyse() {
        const { ring, window, size, write } = this;
        /* il buffer circolare si srotola in due copie, sempre sugli stessi array */
        const tail = size - write;
        window.set(ring.subarray(write), 0);
        window.set(ring.subarray(0, write), tail);
        let sum = 0;
        for (let i = 0; i < size; i++) sum += window[i] * window[i];
        const rms = Math.sqrt(sum / size);
        const [hz, clarity] = this.detector.findPitch(window, sampleRate);
        this.port.postMessage({ hz, clarity, rms });
    }

    process(inputs) {
        if (!this.alive) return false;
        const input = inputs[0];
        const ch = input && input[0];
        if (!ch) return true; // microfono in pausa: si resta vivi
        const { ring, size } = this;
        for (let i = 0; i < ch.length; i++) {
            ring[this.write] = ch[i];
            this.write = (this.write + 1) % size;
        }
        this.filled += ch.length;
        this.total += ch.length;
        if (this.filled >= this.hop && this.total >= size) {
            this.filled = 0;
            this.analyse();
        }
        return true;
    }
}

registerProcessor('tt-pitch', PitchProcessor);
