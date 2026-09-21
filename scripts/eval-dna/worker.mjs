/**
 * Banco di valutazione DNA - il lavoratore.
 *
 * Riceve una fetta di indici del corpus, per ognuno genera il brano, lo
 * analizza pulito e "da microfono", e torna solo i numeri (il segnale non
 * attraversa mai il canale: si rigenera dal seed).
 */

import { parentPort, workerData } from 'node:worker_threads';
import { renderTrack } from './synth.mjs';
import { micify } from './degrade.mjs';
import { analyse } from './analyse.mjs';
import { buildCorpus } from './corpus.mjs';
import { bpmAcc1, bpmAcc2, keyScore } from './metrics.mjs';

const corpus = buildCorpus();

function evaluate(spec) {
    const { signal, sampleRate, truth } = renderTrack(spec);
    const out = [];
    [['pulito', signal, false], ['microfono', micify(signal, sampleRate, { seed: spec.seed, strength: 0.6 }), true]].forEach(([condition, sig, mic]) => {
        const r = analyse(sig, sampleRate, { mic });
        out.push({
            id: spec.id,
            genre: truth.genre,
            condition,
            progression: truth.progression,
            realMode: truth.realMode,
            refBpm: truth.bpm,
            refTonic: truth.tonic,
            refMode: truth.mode,
            bpm: r.bpm.bpm,
            bpmConfidence: r.bpm.confidence,
            bpmAcc1: bpmAcc1(r.bpm.bpm, truth.bpm),
            bpmAcc2: bpmAcc2(r.bpm.bpm, truth.bpm),
            tonic: r.key.tonic,
            mode: r.key.mode,
            keyMode: r.key.keyMode || '',
            keyConfidence: r.key.confidence,
            keyScore: keyScore(r.key.tonic, r.key.mode, truth.tonic, truth.mode),
            ms: r.ms
        });
    });
    return out;
}

const rows = [];
workerData.ids.forEach((id) => { evaluate(corpus[id]).forEach((r) => rows.push(r)); });
parentPort.postMessage(rows);
