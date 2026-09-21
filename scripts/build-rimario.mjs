#!/usr/bin/env node
/**
 * Costruisce i dati del rimario di Penna (spec 14 §4).
 *
 *   node scripts/build-rimario.mjs [--lang it|en|fr|es] [--limite 150000] [--offline]
 *
 * Con --lang diverso da `it` scrive in toolbox/penna/data/<lang>/ (spec 14b)
 * e prende le regole da shared/testo/<lang>/: inglese dal CMU (ARPAbet con
 * l'accento marcato), francese dall'IPA sillabata del Wikizionario FR,
 * spagnolo dalle sole regole RAE — lo spagnolo NON spedisce chiavi ne'
 * tratti, il Worker li ricostruisce (0,45 MB invece di 0,8).
 *
 * Tre sorgenti, tre cose diverse (ricerca 2026-09-19 §1):
 *   1. kaikki.org / it.wiktionary  -> sillabazione CON l'accento segnato
 *      (`hyphenations.parts` = ["a","mó","re"]) e IPA di controprova.
 *      CC BY-SA 4.0. E' l'unica fonte di accenti ESATTI.
 *      File: raw-wiktextract-data.jsonl.gz (38 MB compressi, 490 MB aperti,
 *      TUTTE le lingue del Wikizionario italiano: si tiene lang_code "it").
 *      Si legge in streaming, gunzip + riga per riga: in memoria non ci
 *      entra mai piu' di una voce. Il vecchio
 *      kaikki.org-dictionary-Italiano.jsonl (deprecato) va ancora bene.
 *   2. napolux/paroleitaliane      -> copertura delle forme (MIT).
 *   3. hermitdave/FrequencyWords   -> ordine per frequenza (CC BY-SA 4.0).
 *
 * I file si cercano prima in `scripts/input/` (scaricati a mano, come dice
 * la spec) e solo se mancano si prova la rete. Se un host e' bloccato lo
 * script NON si ferma: lo scrive a chiare lettere e va avanti con quello
 * che ha, marcando come "stimati" gli accenti che avrebbe preso da
 * Wikizionario.
 *
 * Scrive in toolbox/penna/data/:
 *   parole-vN.txt   una forma per riga, ordinata per frequenza (l'indice E' il rango)
 *   chiavi-vN.json  { rima, cons, multi }: chiave -> indici (differenze in base 36)
 *   tratti-vN.bin   un byte per parola: 5 bit sillabe, 2 bit classe, 1 bit stimato
 *   LICENSE.txt, ATTRIBUZIONE.md
 * e stampa forme, quota di accenti esatti e byte compressi.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import readline from 'node:readline';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CLASSI } from '../toolbox/shared/testo/sillabe.js';
import { moduli, LINGUE } from '../toolbox/shared/testo/lingue.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INPUT = path.join(ROOT, 'scripts', 'input');
const OUT_BASE = path.join(ROOT, 'toolbox', 'penna', 'data');
const argomento = (nome, def) => {
    const i = process.argv.indexOf('--' + nome);
    return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
};
const LIMITE = Number(argomento('limite', 150000));
const OFFLINE = process.argv.includes('--offline');
const LANG = (() => {
    const l = String(argomento('lang', 'it')).toLowerCase();
    return ['it', 'en', 'fr', 'es'].includes(l) ? l : 'it';
})();
/* il suffisso di versione sta in un posto solo: LINGUE[lang].versione (lingue.js) */
const VERSIONE = process.env.RIMARIO_V || LINGUE[LANG].versione || 'v1';
const RAW = 'https://raw.githubusercontent.com/';

const FONTI_IT = {
    parole: {
        file: '280000_parole_italiane.txt',
        url: RAW + 'napolux/paroleitaliane/master/paroleitaliane/280000_parole_italiane.txt',
        licenza: 'MIT (napolux/paroleitaliane)'
    },
    frequenze: {
        file: 'it_50k.txt',
        url: RAW + 'hermitdave/FrequencyWords/master/content/2018/it/it_50k.txt',
        licenza: 'CC BY-SA 4.0 (hermitdave/FrequencyWords, OpenSubtitles 2018)'
    },
    kaikki: {
        /* in ordine: il file di oggi, il suo scompattato, il vecchio nome */
        file: 'raw-wiktextract-data.jsonl.gz',
        alternativi: ['raw-wiktextract-data.jsonl', 'kaikki.org-dictionary-Italiano.jsonl'],
        url: 'https://kaikki.org/itwiktionary/raw-wiktextract-data.jsonl.gz',
        licenza: 'CC BY-SA 4.0 (Wikizionario via kaikki.org, wiktextract)',
        opzionale: true
    }
};

/* Le altre tre lingue (spec 14b). Stessa forma: `parole` da' la copertura,
   `frequenze` l'ordine, la terza voce la pronuncia dove serve. */
const FONTI_LANG = {
    en: {
        pronuncia: {
            file: 'cmudict.dict',
            url: RAW + 'cmusphinx/cmudict/master/cmudict.dict',
            licenza: 'BSD 2 clausole (CMU Pronouncing Dictionary)'
        },
        frequenze: {
            file: 'en_50k.txt',
            url: RAW + 'hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt',
            licenza: 'CC BY-SA 4.0 (hermitdave/FrequencyWords)'
        }
    },
    fr: {
        parole: {
            file: 'french-words.json',
            url: RAW + 'words/an-array-of-french-words/master/index.json',
            licenza: 'MIT (words/an-array-of-french-words)'
        },
        frequenze: {
            file: 'fr_50k.txt',
            url: RAW + 'hermitdave/FrequencyWords/master/content/2018/fr/fr_50k.txt',
            licenza: 'CC BY-SA 4.0 (hermitdave/FrequencyWords)'
        },
        kaikki: {
            file: 'fr-raw-wiktextract-data.jsonl.gz',
            alternativi: ['fr-raw-wiktextract-data.jsonl', 'kaikki.org-dictionary-French.jsonl'],
            url: 'https://kaikki.org/frwiktionary/raw-wiktextract-data.jsonl.gz',
            licenza: 'CC BY-SA 4.0 (Wikizionario FR via kaikki.org)',
            opzionale: true,
            lang: 'fr'
        }
    },
    es: {
        parole: {
            file: 'spanish-words.json',
            url: RAW + 'words/an-array-of-spanish-words/master/index.json',
            licenza: 'MIT (words/an-array-of-spanish-words)'
        },
        frequenze: {
            file: 'es_50k.txt',
            url: RAW + 'hermitdave/FrequencyWords/master/content/2018/es/es_50k.txt',
            licenza: 'CC BY-SA 4.0 (hermitdave/FrequencyWords)'
        }
    }
};

const FONTI = LANG === 'it' ? FONTI_IT : FONTI_LANG[LANG];

const log = (...x) => console.log(...x);
const mancanti = [];

/** Prende la sorgente: prima il file locale, poi la rete. */
async function prendi(nome) {
    const f = FONTI[nome];
    for (const candidato of [f.file, ...(f.alternativi || [])]) {
        const locale = path.join(INPUT, candidato);
        if (fs.existsSync(locale)) {
            log('  ' + nome + ': ' + path.relative(ROOT, locale) + ' (locale)');
            return locale;
        }
    }
    const locale = path.join(INPUT, f.file);
    if (OFFLINE) { mancanti.push({ nome, motivo: '--offline e nessun file in scripts/input/', url: f.url }); return null; }
    fs.mkdirSync(INPUT, { recursive: true });
    try {
        const res = await fetch(f.url, { redirect: 'follow' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const buf = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(locale, buf);
        log('  ' + nome + ': scaricato ' + (buf.length / 1048576).toFixed(1) + ' MB da ' + new URL(f.url).host);
        return locale;
    } catch (e) {
        const host = new URL(f.url).host;
        mancanti.push({ nome, motivo: String(e.message || e), url: f.url, host });
        log('  ' + nome + ': NON raggiungibile (' + host + ': ' + (e.message || e) + ')');
        return null;
    }
}

const AMMESSA = /^[a-zàèéìíîòóùú']+$/;
const HA_VOCALE = /[aeiouàèéìíîòóùú]/;
/* sigle senza vocali ("mr", "tv") non sono parole da rimare */
const buona = (p) => AMMESSA.test(p) && HA_VOCALE.test(p) && p.length > 1;

/** it_50k.txt -> Map(parola -> rango) */
function leggiFrequenze(file) {
    const m = new Map();
    if (!file) return m;
    const righe = fs.readFileSync(file, 'utf8').split('\n');
    let rango = 0;
    for (const riga of righe) {
        const parola = riga.split(' ')[0];
        if (!parola || !buona(parola)) continue;
        if (!m.has(parola)) m.set(parola, rango++);
    }
    return m;
}

/**
 * kaikki JSONL -> Map(parola -> { sillabe, tonica }) leggendo
 * `hyphenations[].parts`: la sillaba con la vocale accentata e' la tonica.
 */
async function leggiKaikki(file) {
    const m = new Map();
    if (!file) return m;
    /* 490 MB: si legge a flusso, mai tutto in memoria. Il .gz si apre al
       volo; il dump ha dentro tutte le lingue, qui serve solo l'italiano. */
    const grezzo = fs.createReadStream(file);
    const flusso = file.endsWith('.gz') ? grezzo.pipe(zlib.createGunzip()) : grezzo;
    const rl = readline.createInterface({ input: flusso, crlfDelay: Infinity });
    const ACCENTO = /[àèéìíîòóùúÀÈÉÌÍÒÓÙÚ]/;
    let viste = 0;
    let italiane = 0;
    for await (const riga of rl) {
        if (!riga || riga[0] !== '{') continue;
        viste++;
        /* filtro a buon mercato prima di parlare di JSON */
        /* il dump scrive `"lang_code": "it"` (con spazio); si accettano entrambe le forme */
        if (riga.indexOf('"lang_code"') !== -1 && !/"lang_code":\s*"it"/.test(riga)) continue;
        let v;
        try { v = JSON.parse(riga); } catch (e) { continue; }
        if (v.lang_code && v.lang_code !== 'it') continue;
        italiane++;
        const parola = (v.word || '').toLowerCase();
        if (!parola || !buona(parola)) continue;
        const hy = Array.isArray(v.hyphenations) ? v.hyphenations : [];
        for (const h of hy) {
            const parts = Array.isArray(h.parts) ? h.parts.map((p) => String(p).toLowerCase()) : null;
            if (!parts || !parts.length || parts.some((p) => !/^[a-zàèéìíîòóùú]+$/.test(p))) continue;
            const senza = parts.join('');
            /* la sillabazione deve essere della parola, non di un'altra forma */
            if (senza.normalize('NFD').replace(/[̀-ͯ]/g, '') !== parola.normalize('NFD').replace(/[̀-ͯ]/g, '')) continue;
            /* tonica = -1: sillabazione senza accento segnato (conta esatta, accento dalle regole) */
            const idx = parts.findIndex((p) => ACCENTO.test(p));
            const gia = m.get(parola);
            if (!gia || (gia.tonica < 0 && idx >= 0)) m.set(parola, { sillabe: parts.length, tonica: idx, parti: parts });
            if (idx >= 0) break;
        }
    }
    if (viste) log('    (kaikki: ' + viste + ' voci lette, ' + italiane + ' italiane)');
    return m;
}

function classeDa(sillabe, tonica) {
    return CLASSI[Math.min(CLASSI.length - 1, Math.max(0, sillabe - 1 - tonica))];
}

const OUT = LANG === 'it' ? OUT_BASE : path.join(OUT_BASE, LANG);

/** I moduli di regole della lingua scelta (stesse firme per tutte). */
async function regole() {
    // URL file://, non percorso: su Windows "C:\..." verrebbe letto come schema "c:".
    const radice = pathToFileURL(path.join(ROOT, 'toolbox')).href;
    const m = await moduli(LANG, { radice });
    return m;
}

/** cmudict.dict -> Map(parola -> "L AH1 V"). Le varianti "word(2)" si saltano. */
function leggiCmu(file) {
    const m = new Map();
    if (!file) return m;
    for (const riga of fs.readFileSync(file, 'utf8').split('\n')) {
        if (!riga || riga[0] === ';') continue;
        const pulita = riga.split('#')[0].trim();
        if (!pulita) continue;
        const spazio = pulita.indexOf(' ');
        if (spazio < 0) continue;
        const parola = pulita.slice(0, spazio).toLowerCase();
        if (/\(\d\)$/.test(parola)) continue;         // seconda pronuncia
        if (!buona(parola)) continue;
        if (!m.has(parola)) m.set(parola, pulita.slice(spazio + 1).trim());
    }
    return m;
}

/** index.json di words/an-array-of-*-words -> array di forme. */
function leggiListaJson(file) {
    if (!file) return [];
    try {
        const v = JSON.parse(fs.readFileSync(file, 'utf8'));
        return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
}

/**
 * kaikki di un'altra lingua: dall'IPA gia' sillabata (\a.muʁ\) si prende
 * il numero di sillabe. Serve al francese; se l'host e' bloccato si tira
 * avanti con le regole, dichiarandolo.
 */
async function leggiIpa(file, codice) {
    const m = new Map();
    if (!file) return m;
    const grezzo = fs.createReadStream(file);
    const flusso = file.endsWith('.gz') ? grezzo.pipe(zlib.createGunzip()) : grezzo;
    const rl = readline.createInterface({ input: flusso, crlfDelay: Infinity });
    for await (const riga of rl) {
        if (!riga || riga[0] !== '{') continue;
        if (riga.indexOf('"lang_code"') !== -1 && !new RegExp('"lang_code":\\s*"' + codice + '"').test(riga)) continue;
        let v;
        try { v = JSON.parse(riga); } catch (e) { continue; }
        if (v.lang_code && v.lang_code !== codice) continue;
        const parola = (v.word || '').toLowerCase();
        if (!parola || !buona(parola) || m.has(parola)) continue;
        const suoni = Array.isArray(v.sounds) ? v.sounds : [];
        const ipa = (suoni.find((x) => x && x.ipa) || {}).ipa;
        if (!ipa) continue;
        const pulita = String(ipa).replace(/[\\\/\[\]]/g, '').trim();
        if (!pulita) continue;
        m.set(parola, pulita);
    }
    return m;
}

async function main() {
    log('Rimario ' + LANG.toUpperCase() + ' ' + VERSIONE + ' — sorgenti');
    const mod = await regole();
    const chiavi = mod.fonetica.chiavi;
    const sorgenti = [];

    /* --- sorgenti, lingua per lingua --- */
    const frequenze = leggiFrequenze(await prendi('frequenze'));
    log('  frequenze: ' + frequenze.size + ' parole ordinate');
    let cmu = new Map();
    let ipa = new Map();
    let extra = [];
    let accentiVeri = new Map();
    if (LANG === 'it') {
        const fParole = await prendi('parole');
        accentiVeri = await leggiKaikki(await prendi('kaikki'));
        let conAccento = 0;
        accentiVeri.forEach((v) => { if (v.tonica >= 0) conAccento++; });
        log('  Wikizionario: ' + accentiVeri.size + ' forme sillabate, ' + conAccento + ' con accento segnato');
        if (fParole) extra = fs.readFileSync(fParole, 'utf8').split('\n').map((x) => x.trim().toLowerCase());
    } else if (LANG === 'en') {
        cmu = leggiCmu(await prendi('pronuncia'));
        log('  CMU: ' + cmu.size + ' pronunce con accento');
    } else {
        extra = leggiListaJson(await prendi('parole')).map((x) => String(x).toLowerCase());
        log('  lista MIT: ' + extra.length + ' forme');
        if (FONTI.kaikki) {
            ipa = await leggiIpa(await prendi('kaikki'), FONTI.kaikki.lang || LANG);
            log('  Wikizionario ' + LANG.toUpperCase() + ': ' + ipa.size + ' forme con IPA');
        }
    }

    /* --- lemmario --- */
    const forme = new Set();
    extra.forEach((p) => { if (buona(p)) forme.add(p); });
    cmu.forEach((_, p) => forme.add(p));
    ipa.forEach((_, p) => forme.add(p));
    frequenze.forEach((_, p) => forme.add(p));
    accentiVeri.forEach((_, p) => forme.add(p));
    if (!forme.size) {
        console.error('Nessuna forma: nessuna sorgente raggiunta.');
        process.exitCode = 1;
        return;
    }
    log('  lemmario: ' + forme.size + ' forme distinte');

    const lista = [...forme].sort((a, b) => {
        const fa = frequenze.has(a) ? frequenze.get(a) : Infinity;
        const fb = frequenze.has(b) ? frequenze.get(b) : Infinity;
        if (fa !== fb) return fa - fb;
        if (a.length !== b.length) return a.length - b.length;
        return a < b ? -1 : 1;
    }).slice(0, LIMITE);

    /* --- chiavi e tratti --- */
    const rima = new Map();
    const cons = new Map();
    const multi = new Map();
    const tratti = new Uint8Array(lista.length);
    let esatti = 0;
    lista.forEach((parola, i) => {
        const vero = accentiVeri.get(parola);
        /* le sillabe del Wikizionario entrano nel calcolo delle CHIAVI, non
           solo nei tratti: la vocale tonica decide la rima ("àncora"/"ancóra") */
        const opzioni = cmu.has(parola) ? { arpabet: cmu.get(parola) } : (vero ? { sillabe: vero.parti } : {});
        const k = chiavi(parola, opzioni);
        let sillabe = k.conta || (k.sillabe ? k.sillabe.length : 1);
        if (typeof k.sillabe === 'number') sillabe = k.sillabe;
        let classe = k.classe;
        let stimato = k.esito !== 'esatto';
        if (vero && vero.tonica >= 0) {
            sillabe = vero.sillabe;
            classe = classeDa(vero.sillabe, vero.tonica);
            stimato = false;
        }
        const suonoIpa = ipa.get(parola);
        if (suonoIpa && suonoIpa.indexOf('.') !== -1) {
            sillabe = suonoIpa.split('.').length;      // l'IPA di kaikki e' gia' sillabata
            stimato = false;
        } else if (LANG === 'fr') {
            /* in francese l'accento e' fisso (esatto), ma senza l'IPA la
               CHIAVE viene dalle regole di scrittura: e' una stima e si
               dichiara, altrimenti il badge non comparirebbe mai */
            stimato = true;
        }
        if (LANG === 'en' && !cmu.has(parola)) stimato = true;
        if (!stimato) esatti++;
        const spingi = (mappa, chiave) => {
            if (!chiave) return;
            const arr = mappa.get(chiave);
            if (arr) arr.push(i); else mappa.set(chiave, [i]);
        };
        spingi(rima, k.rima);
        spingi(cons, k.consonanti);
        spingi(multi, k.multi);
        let byte = (Math.min(31, sillabe) << 3) | (CLASSI.indexOf(classe) << 1) | (stimato ? 1 : 0);
        /* il francese usa il bit libero della classe per "rima femminile" */
        if (LANG === 'fr' && k.femminile) byte |= 0b100;
        tratti[i] = byte;
    });

    /* --- scrittura --- */
    fs.mkdirSync(OUT, { recursive: true });
    const nome = (base, ext) => path.join(OUT, base + '-' + VERSIONE + '.' + ext);
    const derivate = !!LINGUE[LANG].derivate;
    const testo = lista.join('\n') + '\n';
    fs.writeFileSync(nome('parole', 'txt'), testo);
    const codifica = (arr) => {
        let prev = 0;
        return arr.map((v) => { const d = v - prev; prev = v; return d.toString(36); }).join('.');
    };
    const obj = (m) => {
        const o = {};
        [...m.keys()].sort().forEach((k) => { o[k] = codifica(m.get(k)); });
        return o;
    };
    const gz = (buf) => zlib.gzipSync(buf, { level: 9 }).length;
    const pesi = { parole: gz(Buffer.from(testo)) };
    let json = '';
    if (!derivate) {
        json = JSON.stringify({ versione: VERSIONE, parole: lista.length, formato: 'delta36', rima: obj(rima), cons: obj(cons), multi: obj(multi) });
        fs.writeFileSync(nome('chiavi', 'json'), json);
        fs.writeFileSync(nome('tratti', 'bin'), Buffer.from(tratti.buffer));
        pesi.chiavi = gz(Buffer.from(json));
        pesi.tratti = gz(Buffer.from(tratti.buffer));
    } else {
        /* spagnolo: le regole RAE ricostruiscono tutto al caricamento */
        [nome('chiavi', 'json'), nome('tratti', 'bin')].forEach((f) => { if (fs.existsSync(f)) fs.unlinkSync(f); });
    }
    scriviLicenze(OUT, LANG);
    const somma = Object.values(pesi).reduce((a, b) => a + b, 0);
    const soloRegole = (LANG === 'fr' && !ipa.size) || (LANG === 'en' && !cmu.size);
    scriviManifesto(OUT, LANG, lista.length, pesi, derivate, esatti, soloRegole);

    log('\nFatto (' + LANG + '):');
    log('  forme            ' + lista.length);
    log('  accenti esatti   ' + esatti + ' (' + (100 * esatti / lista.length).toFixed(1) + ' %)');
    log('  chiavi di rima   ' + rima.size + ' · consonantiche ' + cons.size + ' · multi ' + multi.size + (derivate ? ' (derivate: non spedite)' : ''));
    Object.keys(pesi).forEach((k) => log('  ' + k.padEnd(16) + (pesi[k] / 1024).toFixed(0) + ' KB gzip'));
    const tetto = LANG === 'it' ? 1536 : 2048;
    log('  TOTALE           ' + (somma / 1024).toFixed(0) + ' KB gzip (limite ' + tetto + ')');
    if (mancanti.length) {
        log('\nSorgenti NON raggiunte (si va avanti con quello che c\'e\'):');
        mancanti.forEach((m) => log('  - ' + m.nome + ' @ ' + (m.host || m.url) + ' -> ' + m.motivo));
    }
    if (somma > tetto * 1024) { console.error('\nTroppo grande: abbassa --limite.'); process.exitCode = 1; }
}

function scriviLicenzeIt(dir) {
    fs.writeFileSync(path.join(dir, 'LICENSE.txt'), `Dati del rimario di Penna (Tiny Temple Toolbox)
=================================================

Questi file sono un'opera derivata di tre sorgenti. La raccolta e' distribuita
sotto CC BY-SA 4.0, la piu' restrittiva delle tre.

1) Wikizionario italiano (it.wiktionary.org), via kaikki.org / wiktextract
   Sillabazione con l'accento tonico e IPA
   (dump raw-wiktextract-data.jsonl.gz, https://kaikki.org/itwiktionary/).
   Licenza: Creative Commons Attribuzione - Condividi allo stesso modo 4.0
   https://creativecommons.org/licenses/by-sa/4.0/deed.it
   Citazione richiesta da kaikki.org: Tatu Ylonen, "Wiktextract: Wiktionary
   as Machine-Readable Structured Data", LREC 2022. https://kaikki.org

2) hermitdave/FrequencyWords - frequenze da OpenSubtitles 2018
   Contenuti: CC BY-SA 4.0. https://github.com/hermitdave/FrequencyWords

3) napolux/paroleitaliane - liste di forme italiane
   Licenza MIT. https://github.com/napolux/paroleitaliane

   The MIT License (MIT)
   Copyright (c) napolux e contributori

   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to deal
   in the Software without restriction, including without limitation the rights
   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is
   furnished to do so, subject to the following conditions:

   The above copyright notice and this permission notice shall be included in
   all copies or substantial portions of the Software.

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
   SOFTWARE.

Il codice della Toolbox che legge questi file resta separato: li interroga,
non li incorpora (semplice aggregazione).
`);
    fs.writeFileSync(path.join(dir, 'ATTRIBUZIONE.md'), `# Da dove vengono le rime

I dati del rimario italiano di **Penna** sono costruiti da tre fonti libere.

| Fonte | Cosa da' | Licenza |
|---|---|---|
| [Wikizionario italiano](https://it.wiktionary.org) via [kaikki.org](https://kaikki.org/itwiktionary/index.html) (wiktextract, \`raw-wiktextract-data.jsonl.gz\`) | sillabazione con l'accento tonico, IPA | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.it) |
| [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) (OpenSubtitles 2018) | ordine per frequenza d'uso | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.it) |
| [napolux/paroleitaliane](https://github.com/napolux/paroleitaliane) | copertura delle forme | MIT |

I file generati (\`parole-*.txt\`, \`chiavi-*.json\`, \`tratti-*.bin\`) sono un'opera
derivata e si distribuiscono a loro volta sotto **CC BY-SA 4.0**.

Citazione chiesta da kaikki.org: Tatu Ylonen, *Wiktextract: Wiktionary as
Machine-Readable Structured Data*, LREC 2022.

Dove Wikizionario non arriva, l'accento e' **stimato** dalle regole
dell'italiano (accento grafico, suffissi sdruccioli, default piana): in quel
caso Penna lo dice, e la parola porta la nota "accento stimato".

Rigenerazione: \`node scripts/build-rimario.mjs\`.
`);
}

/* --- licenze e manifesto dei pacchetti EN/FR/ES (spec 14b §2) --- */

const LICENZE = {
    en: [
        ['CMU Pronouncing Dictionary (cmusphinx/cmudict)', 'pronuncia con l\'accento (ARPAbet)', 'BSD a 2 clausole', 'https://github.com/cmusphinx/cmudict'],
        ['hermitdave/FrequencyWords (OpenSubtitles 2018)', 'ordine per frequenza', 'CC BY-SA 4.0', 'https://github.com/hermitdave/FrequencyWords']
    ],
    fr: [
        ['Wikizionario francese via kaikki.org (wiktextract)', 'pronuncia IPA gia\' sillabata', 'CC BY-SA 4.0', 'https://kaikki.org/frwiktionary/'],
        ['hermitdave/FrequencyWords (OpenSubtitles 2018)', 'ordine per frequenza', 'CC BY-SA 4.0', 'https://github.com/hermitdave/FrequencyWords'],
        ['words/an-array-of-french-words', 'copertura delle forme', 'MIT', 'https://github.com/words/an-array-of-french-words']
    ],
    es: [
        ['Wikizionario spagnolo via kaikki.org (wiktextract)', 'lemmario e IPA di controprova', 'CC BY-SA 4.0', 'https://kaikki.org/eswiktionary/'],
        ['hermitdave/FrequencyWords (OpenSubtitles 2018)', 'ordine per frequenza', 'CC BY-SA 4.0', 'https://github.com/hermitdave/FrequencyWords'],
        ['words/an-array-of-spanish-words', 'copertura delle forme', 'MIT', 'https://github.com/words/an-array-of-spanish-words'],
        ['Regole RAE di acentuacion', 'accento tonico calcolato, nessun dato', 'regole', 'https://www.rae.es/dpd/tilde']
    ]
};

const BSD_CMU = `The Carnegie Mellon Pronouncing Dictionary, Copyright (c) 1993-2015
Carnegie Mellon University. All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice,
   this list of conditions and the following disclaimer. The contents of this
   file are deemed to be source code.
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

This work was supported in part by funding from the Defense Advanced Research
Projects Agency, the Office of Naval Research and the National Science
Foundation of the United States of America, and by member companies of the
Carnegie Mellon Sphinx Speech Consortium. We acknowledge the contributions of
many volunteers to the expansion and improvement of this dictionary.

THIS SOFTWARE IS PROVIDED BY CARNEGIE MELLON UNIVERSITY "AS IS" AND ANY
EXPRESSED OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL CARNEGIE MELLON UNIVERSITY NOR ITS EMPLOYEES BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.`;

const MIT_LISTE = `The MIT License (MIT)
Copyright (c) Zeke Sikelianos e contributori (words/an-array-of-*-words)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

function scriviLicenze(dir, lang) {
    if (lang === 'it') { scriviLicenzeIt(dir); return; }
    const righe = LICENZE[lang] || [];
    const nome = LINGUE[lang].nome;
    fs.writeFileSync(path.join(dir, 'LICENSE.txt'),
        'Pacchetto rimario ' + nome + ' (Tiny Temple Toolbox)\n' +
        '='.repeat(40) + '\n\n' +
        'Opera derivata delle fonti qui sotto. La raccolta si distribuisce\n' +
        'sotto CC BY-SA 4.0, la piu\' restrittiva delle licenze coinvolte.\n' +
        'https://creativecommons.org/licenses/by-sa/4.0/deed.it\n\n' +
        righe.map((r, i) => (i + 1) + ') ' + r[0] + '\n   ' + r[1] + '\n   Licenza: ' + r[2] + '\n   ' + r[3]).join('\n\n') +
        (lang === 'en' ? '\n\n--- CMU Pronouncing Dictionary ---\n\n' + BSD_CMU : '') +
        (lang === 'fr' || lang === 'es' ? '\n\n--- liste di forme ---\n\n' + MIT_LISTE : '') +
        '\n\nIl codice della Toolbox legge questi file, non li incorpora.\n');
    fs.writeFileSync(path.join(dir, 'ATTRIBUZIONE.md'),
        '# Da dove vengono le rime (' + nome + ')\n\n' +
        '| Fonte | Cosa da\' | Licenza |\n|---|---|---|\n' +
        righe.map((r) => '| [' + r[0] + '](' + r[3] + ') | ' + r[1] + ' | ' + r[2] + ' |').join('\n') +
        '\n\nI file generati sono un\'opera derivata e si distribuiscono sotto\n' +
        '**CC BY-SA 4.0**. Dove la pronuncia non c\'e\', la chiave di rima e\'\n' +
        'calcolata dalle regole o presa **per analogia** dalla parola nota col\n' +
        'suffisso scritto piu\' lungo in comune: Penna lo dichiara con un badge.\n\n' +
        'Rigenerazione: `node scripts/build-rimario.mjs --lang ' + lang + '`.\n');
}

/** Il manifesto viaggia col pacchetto (spec 14b §2: niente sonde remote). */
function scriviManifesto(dir, lang, forme, pesi, derivate, esatti, regole = false) {
    const file = {};
    Object.keys(pesi).forEach((k) => {
        const nome = k + '-' + VERSIONE + (k === 'parole' ? '.txt' : k === 'chiavi' ? '.json' : '.bin');
        file[k] = { nome, gzip: pesi[k], byte: fs.statSync(path.join(dir, nome)).size };
    });
    if (derivate) { file.chiavi = 'derivata'; file.tratti = 'derivata'; }
    fs.writeFileSync(path.join(dir, 'manifest-' + VERSIONE + '.json'), JSON.stringify({
        lingua: lang,
        nome: LINGUE[lang].nome,
        versione: VERSIONE,
        forme,
        esatti,
        derivate,
        /* true = le chiavi vengono dalle regole di scrittura, non dalla
           pronuncia: succede se la sorgente della pronuncia non c'era */
        soloRegole: regole,
        file,
        gzip: Object.values(pesi).reduce((a, b) => a + b, 0),
        licenza: 'CC BY-SA 4.0',
        fonti: (LICENZE[lang] || []).map((r) => ({ nome: r[0], licenza: r[2], url: r[3] }))
    }, null, 1) + '\n');
}

main();
