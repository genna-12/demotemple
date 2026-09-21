/**
 * Banco di valutazione DNA - `node scripts/eval-dna/run.mjs`.
 *
 * Genera il corpus sintetico, lo analizza pulito e da microfono su tutti i
 * core disponibili e stampa: tabella per genere e condizione (BPM Acc1/Acc2,
 * MIREX della tonalita'), diagramma di affidabilita' della confidenza e il
 * bucket "alta" cosi' come lo mostra la pagina.
 *
 * Opzioni:  --jobs N   quanti lavoratori (default: i core)
 *           --limit N  solo i primi N brani (prova rapida)
 *           --json F   scrive le righe grezze in F (per i confronti prima/dopo)
 *           --diff F   confronta con un JSON salvato prima
 */

import { Worker } from 'node:worker_threads';
import { cpus } from 'node:os';
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildCorpus, GENRES, CONDITIONS } from './corpus.mjs';
import { summarize, reliability, highBucket, HIGH_BPM, HIGH_KEY } from './metrics.mjs';

const argv = process.argv.slice(2);
const arg = (name, def) => {
    const i = argv.indexOf('--' + name);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};

const corpus = buildCorpus();
const only = arg('genre', '');
const pool = only ? corpus.filter((c) => c.genre === only) : corpus;
const limit = Number(arg('limit', pool.length));
const ids = pool.slice(0, limit).map((c) => c.id);
const jobs = Math.max(1, Math.min(Number(arg('jobs', cpus().length || 2)), ids.length));
const workerUrl = new URL('./worker.mjs', import.meta.url);

const slices = Array.from({ length: jobs }, () => []);
ids.forEach((id, i) => slices[i % jobs].push(id));

const t0 = Date.now();
const rows = (await Promise.all(slices.map((slice) => new Promise((resolve, reject) => {
    const w = new Worker(fileURLToPath(workerUrl), { workerData: { ids: slice } });
    w.on('message', resolve);
    w.on('error', reject);
})))).flat();
const elapsed = (Date.now() - t0) / 1000;

/* ------------------------------------------------------------------ */

const pct = (v) => (Number.isFinite(v) ? (v * 100).toFixed(1).padStart(5) + '%' : '    --');
const num = (v, d = 3) => (Number.isFinite(v) ? v.toFixed(d).padStart(5) : '   --');
const pad = (s, n) => String(s).padEnd(n);

console.log('\n=== BANCO DNA ===');
console.log(`${ids.length} brani sintetici, ${rows.length} analisi (pulito + microfono), ${jobs} lavoratori, ${elapsed.toFixed(1)} s`);
const msAvg = rows.reduce((a, r) => a + r.ms, 0) / (rows.length || 1);
console.log(`tempo medio di analisi: ${msAvg.toFixed(0)} ms per brano\n`);

console.log(pad('genere', 10) + pad('condizione', 12) + pad('n', 6) + pad('BPM Acc1', 10) + pad('BPM Acc2', 10) + pad('Key MIREX', 11) + pad('Key esatta', 11));
console.log('-'.repeat(70));
const table = [];
GENRES.forEach((g) => {
    CONDITIONS.forEach((c) => {
        const sel = rows.filter((r) => r.genre === g && r.condition === c);
        if (!sel.length) return;
        const s = summarize(sel);
        table.push({ genre: g, condition: c, ...s });
        console.log(pad(g, 10) + pad(c, 12) + pad(s.n, 6) + pad(pct(s.acc1), 10) + pad(pct(s.acc2), 10) + pad(num(s.mirex), 11) + pad(pct(s.exact), 11));
    });
});
console.log('-'.repeat(70));
CONDITIONS.forEach((c) => {
    const sel = rows.filter((r) => r.condition === c);
    const s = summarize(sel);
    console.log(pad('TUTTI', 10) + pad(c, 12) + pad(s.n, 6) + pad(pct(s.acc1), 10) + pad(pct(s.acc2), 10) + pad(num(s.mirex), 11) + pad(pct(s.exact), 11));
});
const all = summarize(rows);
console.log(pad('TUTTI', 10) + pad('insieme', 12) + pad(all.n, 6) + pad(pct(all.acc1), 10) + pad(pct(all.acc2), 10) + pad(num(all.mirex), 11) + pad(pct(all.exact), 11));

/* casi modali: la tonica e' quella, il modo vero non e' maggiore/minore */
const modal = rows.filter((r) => r.realMode !== 'major' && r.realMode !== 'minor');
if (modal.length) {
    const tonicOk = modal.filter((r) => r.tonic === r.refTonic).length / modal.length;
    const declared = modal.filter((r) => r.keyMode && r.keyMode === r.realMode).length / modal.length;
    console.log(`\nmodali (${modal.length} analisi): tonica giusta ${pct(tonicOk)}, modo dichiarato giusto ${pct(declared)}`);
    const tonal = rows.filter((r) => r.realMode === 'major' || r.realMode === 'minor');
    const st = summarize(tonal);
    console.log(`solo tonali (${st.n}): MIREX ${num(st.mirex)}, esatta ${pct(st.exact)}`);
}

/* ------------------------------------------------------------------ *
 * Calibrazione
 * ------------------------------------------------------------------ */

function diagram(title, confOf, okOf, threshold) {
    console.log(`\n--- calibrazione ${title} ---`);
    console.log(pad('bucket', 12) + pad('n', 7) + pad('conf media', 12) + pad('accuratezza', 12));
    reliability(rows, confOf, okOf).forEach((b, i) => {
        if (!b.n) return;
        console.log(pad(`${(i / 10).toFixed(1)}-${((i + 1) / 10).toFixed(1)}`, 12) + pad(b.n, 7) + pad(num(b.sum / b.n, 2), 12) + pad(pct(b.ok / b.n), 12));
    });
    const hi = highBucket(rows, confOf, okOf, threshold);
    const flag = hi.n === 0 ? 'VUOTO' : hi.acc >= 0.95 ? 'OK' : 'SOTTO IL 95%';
    console.log(`bucket "alta" (>= ${threshold}): ${hi.n} casi (${pct(hi.share)} del totale), accuratezza ${pct(hi.acc)} -> ${flag}`);
    return hi;
}

const hiBpm = diagram('BPM (giusto = Acc1)', (r) => r.bpmConfidence, (r) => r.bpmAcc1, HIGH_BPM);
const hiKey = diagram('tonalita\' (giusto = esatta)', (r) => r.keyConfidence, (r) => r.keyScore === 1, HIGH_KEY);

/* ------------------------------------------------------------------ */

const jsonPath = arg('json', '');
if (jsonPath) {
    writeFileSync(jsonPath, JSON.stringify({ rows, table, elapsed, msAvg, hiBpm, hiKey }, null, 0));
    console.log(`\nrighe salvate in ${jsonPath}`);
}

const diffPath = arg('diff', '');
if (diffPath) {
    const before = JSON.parse(readFileSync(diffPath, 'utf8'));
    console.log('\n=== PRIMA / DOPO ===');
    console.log(pad('genere', 10) + pad('condizione', 12) + pad('Acc1', 16) + pad('Acc2', 16) + pad('MIREX', 16));
    const key = (t) => t.genre + '|' + t.condition;
    const map = new Map(before.table.map((t) => [key(t), t]));
    const line = (a, b, f, d = 3) => {
        const x = f(a);
        const y = b ? f(b) : NaN;
        const delta = Number.isFinite(y) ? (x - y >= 0 ? '+' : '') + (x - y).toFixed(d) : '';
        return `${x.toFixed(d)} (${delta})`;
    };
    table.forEach((t) => {
        const b = map.get(key(t));
        console.log(pad(t.genre, 10) + pad(t.condition, 12) + pad(line(t, b, (x) => x.acc1), 16) + pad(line(t, b, (x) => x.acc2), 16) + pad(line(t, b, (x) => x.mirex), 16));
    });
    const bAll = summarize(before.rows);
    console.log(pad('TUTTI', 10) + pad('insieme', 12) + pad(line(all, bAll, (x) => x.acc1), 16) + pad(line(all, bAll, (x) => x.acc2), 16) + pad(line(all, bAll, (x) => x.mirex), 16));
}
console.log('');
