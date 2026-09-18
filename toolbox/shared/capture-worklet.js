/**
 * Tiny Temple Toolbox - cattura PCM nel thread audio.
 *
 * Sostituisce lo ScriptProcessorNode (deprecato: Chrome lo dice in
 * console a ogni ascolto) per raccogliere i campioni del microfono.
 * Si carica con audio.addWorklet('/shared/capture-worklet.js'); se
 * addModule fallisce (iOS ha dato problemi) chi lo usa torna al
 * ScriptProcessor, che resta SOLO come ripiego.
 *
 * Nessun import: dentro il worklet un modulo ESM in piu' e' un motivo
 * in piu' per non partire.
 *
 * Accumula i campioni del primo canale in un blocco di `size` (4096 di
 * default) e lo manda al thread principale gia' trasferito, quindi
 * senza copia: { type: 'block', samples: Float32Array }. Il messaggio
 * 'stop' svuota l'ultimo blocco parziale, manda { type: 'end' } e
 * chiude il processore.
 */

const DEFAULT_SIZE = 4096;

class CaptureProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        const opts = (options && options.processorOptions) || {};
        this.size = opts.size || DEFAULT_SIZE;
        this.block = new Float32Array(this.size);
        this.at = 0;
        this.alive = true;
        this.port.onmessage = (e) => {
            if (e.data !== 'stop') return;
            this.flush();
            this.port.postMessage({ type: 'end' });
            this.alive = false;
        };
    }

    /** Manda quel che c'e' (anche mezzo blocco) e riparte da zero. */
    flush() {
        if (!this.at) return;
        const samples = this.block.slice(0, this.at);
        this.at = 0;
        this.port.postMessage({ type: 'block', samples }, [samples.buffer]);
    }

    process(inputs) {
        if (!this.alive) return false;
        const ch = inputs[0] && inputs[0][0];
        if (!ch) return true; // microfono in pausa: si resta vivi
        for (let i = 0; i < ch.length; i++) {
            this.block[this.at++] = ch[i];
            if (this.at >= this.size) this.flush();
        }
        return true;
    }
}

registerProcessor('tt-capture', CaptureProcessor);
