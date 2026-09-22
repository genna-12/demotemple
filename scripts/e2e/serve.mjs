/**
 * Tiny Temple Toolbox - il server dei test end-to-end (spec 18 §8).
 *
 * Fa le due cose che Cloudflare Pages fa in produzione, e nient'altro:
 *
 *   1. serve `toolbox/` come sito statico, con gli INDIRIZZI SENZA ESTENSIONE
 *      (`/metronomo/` -> `metronomo/index.html`, `/pagina` -> `pagina.html`)
 *      e con le intestazioni scritte in `toolbox/_headers` - CSP compresa,
 *      perche' meta' dei difetti che si cercano qui nascono proprio li';
 *   2. risponde a `/api/quaderno/*` con la Pages Function VERA
 *      (`toolbox/functions/api/quaderno/[[route]].js`) appoggiata a un finto
 *      D1 in memoria (`d1-finto.mjs`): la sincronizzazione si prova senza
 *      database e senza rete.
 *
 * Nessuna dipendenza npm: solo Node. Porta 4321 (o `PORT`).
 * Si avvia da solo: `playwright.config.mjs` lo mette in `webServer`.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { creaD1 } from './d1-finto.mjs';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const RADICE = path.resolve(QUI, '..', '..');        // la radice del repository
const SITO = path.join(RADICE, 'toolbox');
const PORTA = Number(process.env.PORT || 4321);
const PREFISSO_API = '/api/quaderno/';

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg'
};

/* ---------------- _headers ---------------- */

/** Le regole di `toolbox/_headers`, nell'ordine in cui stanno nel file. */
function leggiRegole() {
    const testo = fs.readFileSync(path.join(SITO, '_headers'), 'utf8');
    const regole = [];
    let corrente = null;
    for (const riga of testo.split('\n')) {
        if (!riga.trim() || riga.startsWith('#')) continue;
        if (!/^\s/.test(riga)) {
            corrente = { pattern: riga.trim(), intestazioni: [] };
            regole.push(corrente);
            continue;
        }
        if (!corrente) continue;
        const i = riga.indexOf(':');
        if (i < 0) continue;
        corrente.intestazioni.push([riga.slice(0, i).trim(), riga.slice(i + 1).trim()]);
    }
    return regole;
}

const REGOLE = leggiRegole();

const combacia = (pattern, percorso) => new RegExp(
    '^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'
).test(percorso);

/** Come Pages: i blocchi che coincidono si SOMMANO (CLAUDE.md, regola d'oro). */
function intestazioniPer(percorso) {
    const out = {};
    for (const regola of REGOLE) {
        if (!combacia(regola.pattern, percorso)) continue;
        for (const [k, v] of regola.intestazioni) out[k] = out[k] ? out[k] + ', ' + v : v;
    }
    return out;
}

/* ---------------- file statici ---------------- */

/** -> percorso del file, 'REDIRECT' (manca la barra finale) o null. */
function risolvi(percorso) {
    if (percorso.includes('\0') || percorso.includes('..')) return null;
    const f = path.join(SITO, percorso);
    if (!f.startsWith(SITO)) return null;                     // niente uscite dalla cartella
    if (percorso.endsWith('/')) {
        const indice = path.join(f, 'index.html');
        return fs.existsSync(indice) ? indice : null;
    }
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
    if (fs.existsSync(f + '.html')) return f + '.html';       // indirizzo senza estensione
    if (fs.existsSync(path.join(f, 'index.html'))) return 'REDIRECT';
    return null;
}

function statico(req, res, percorso) {
    let file = risolvi(percorso);
    let stato = 200;
    if (file === 'REDIRECT') {
        res.writeHead(308, { Location: percorso + '/' });
        res.end();
        return;
    }
    if (!file) {
        file = path.join(SITO, '404.html');
        stato = 404;
    }
    const intestazioni = intestazioniPer(percorso);
    intestazioni['Content-Type'] = MIME[path.extname(file)] || 'application/octet-stream';
    const corpo = fs.readFileSync(file);
    intestazioni['Content-Length'] = String(corpo.length);
    res.writeHead(stato, intestazioni);
    if (req.method === 'HEAD') return res.end();
    res.end(corpo);
}

/* ---------------- /api/quaderno/* ---------------- */

/* La Function vera, importata com'e'. Il nome del file ha le parentesi
   doppie di Pages: `pathToFileURL` le passa senza farle interpretare. */
const FUNZIONE = await import(pathToFileURL(
    path.join(SITO, 'functions', 'api', 'quaderno', '[[route]].js')
).href);

const DB = creaD1();

/** Una richiesta Node -> la Response della Function, come farebbe Pages. */
async function api(req, res, percorso, url) {
    const segmenti = percorso.slice(PREFISSO_API.length).split('/').filter(Boolean);

    const pezzi = [];
    for await (const p of req) pezzi.push(p);
    const corpo = Buffer.concat(pezzi);

    const request = new Request(url.href, {
        method: req.method,
        headers: req.headers,
        body: (req.method === 'GET' || req.method === 'HEAD') ? undefined : corpo,
        duplex: 'half'
    });
    const context = { request, env: { QUADERNO: DB }, params: { route: segmenti } };

    let risposta;
    if (req.method === 'GET') risposta = await FUNZIONE.onRequestGet(context);
    else if (req.method === 'PUT') risposta = await FUNZIONE.onRequestPut(context);
    else if (req.method === 'DELETE') risposta = await FUNZIONE.onRequestDelete(context);
    else risposta = new Response('{"errore":"metodo"}', { status: 405 });

    const intestazioni = {};
    risposta.headers.forEach((v, k) => { intestazioni[k] = v; });
    const testo = Buffer.from(await risposta.arrayBuffer());
    intestazioni['Content-Length'] = String(testo.length);
    res.writeHead(risposta.status, intestazioni);
    res.end(testo);
}

/* ---------------- server ---------------- */

const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1:' + PORTA);
    const percorso = decodeURIComponent(url.pathname);
    if (percorso.startsWith(PREFISSO_API)) {
        api(req, res, percorso, url).catch((e) => {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errore: 'stub', dettaglio: String(e && e.message) }));
        });
        return;
    }
    try {
        statico(req, res, percorso);
    } catch (e) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('errore: ' + String(e && e.message));
    }
});

server.listen(PORTA, '127.0.0.1', () => {
    console.log('toolbox servita su http://127.0.0.1:' + PORTA + ' (radice ' + SITO + ')');
});
