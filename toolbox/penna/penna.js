/**
 * Tiny Temple Toolbox - Penna: blocco testi + rimario italiano (spec 14).
 *
 * =====================================================================
 * CONTRATTO CON IL MARKUP (spec 14 §5: gli id li fissa la spec, qui si
 * dice solo che cosa ci fa il JS; dove la spec tace vale questo file)
 * =====================================================================
 *   #penna          <main> con data-pen-state="vuoto|scrittura|documenti"
 *                   e data-pen-count="metrico|grammaticale"
 *   #pen-editor     contenitore dell'editor
 *   #pen-title      <input type="text"> titolo del documento
 *   #pen-text       <textarea> il testo (etichettata, spec §6.11)
 *   #pen-gutter     colonna dei conteggi, aria-hidden="true": il JS ci
 *                   mette un <span class="pen-n" data-riga="i"> per verso,
 *                   con .is-stimato quando l'accento e' indovinato e
 *                   .is-sinalefe quando il verso ne ha una; il numero e'
 *                   un <button> se ci sono sinalefi (apre il foglio)
 *   #pen-count-mode .tb-segment con [data-pen-count="metrico|grammaticale"]
 *   #pen-mono       .tb-toggle monospazio (input[type=checkbox])
 *   #pen-colors     .tb-toggle rime a colori
 *   #pen-lines      (facoltativo) livello sotto la textarea per i colori:
 *                   il JS ci scrive un <span class="pen-line pen-rima-N">
 *                   per verso; senza, i colori restano sulle pillole
 *   #pen-docs       lista documenti (vuota: la riempie il JS)
 *   #pen-new #pen-share #pen-delete   comandi
 *   #pen-status     .tb-status ("Salvato", errori)
 *   #pen-rhyme      pannello/foglio del rimario
 *   #pen-query      <input type="search"> parola
 *   #pen-type       .tb-segment--scroll [data-pen-type="rime|assonanze|
 *                   consonanze|multi"]
 *   #pen-syl        <select> sillabe: tutte|1|2|3|4+
 *   #pen-results    lista dei risultati (vuota: la riempie il JS)
 *   #pen-download   pulsante "Scarica il rimario"; #pen-progress la barra
 *                   (il JS scrive --pen-pct e aria-valuenow)
 *   #pen-copy-mode  .tb-toggle "Copia invece di inserire" (desktop)
 *   #pen-unknown    blocco "parola sconosciuta": dentro
 *                   [data-pen-forza="piana|sdrucciola"] per ricalcolare
 *   #pen-sheet      foglio delle sinalefi del verso (tb-sheet), dentro
 *                   #pen-sheet-list dove il JS mette un .tb-toggle per
 *                   ogni sinalefe (data-pen-sin="<indice>")
 *
 * =====================================================================
 * PACCHETTI LINGUA (spec 14b §5) — markup che scrive il builder
 * =====================================================================
 *   #pen-lang       .tb-segment in cima al pannello rimario, un bottone per
 *                   lingua: [data-pen-lang="it|en|fr|es"]. penna.js ci mette
 *                   is-active/aria-checked sulla lingua attiva e la classe
 *                   `is-missing` (puntino) su quelle non installate.
 *   #pen-pack-sheet .tb-sheet del pacchetto; dentro:
 *                   #pen-pack-title  titolo ("Scarica il pacchetto inglese")
 *                   #pen-pack-size   "0,9 MB · una volta sola · offline"
 *                   #pen-pack-go     .tb-btn--primary "Scarica"
 *                   #pen-pack-bar    barra: il JS scrive --pen-pct,
 *                                    aria-valuenow e aria-live="polite"
 *                   #pen-pack-cancel "Annulla" (chiude e ferma il download)
 *                   un link/gruppo con l'attribuzione del pacchetto, che il
 *                   JS riempie in #pen-pack-fonti (una riga per fonte)
 *   #pen-doc-lang   <select> lingua DEL DOCUMENTO (menu), stesse quattro
 *   #pen-emuet      .tb-toggle "e muta: conta (verso classico)", visibile
 *                   solo in francese: il JS gli mette [hidden] altrove
 *   #tb-packs-row   riga nel menu (nav.js), accanto a quella del microfono;
 *   #tb-pack-list   dentro, una <li> per pacchetto installato: la crea
 *                   nav.js/penna.js con nome, peso e "Rimuovi".
 *
 * Il catalogo dei pacchetti e' `penna/pacchetti.js` (lo scrive il builder):
 * un modulo PRECACHEATO, cosi' aprendo Penna non parte nessuna richiesta
 * verso /penna/data/ (spec 14b §2). Se manca, penna.js usa il catalogo
 * minimo qui sotto e continua a funzionare.
 *
 * Le pillole dei risultati le crea il JS:
 *   <button class="pen-hit" data-pen-word="amore" lang="it">
 *     amore <span class="pen-syl">3</span></button>
 * e restano SEMPRE lang="it" anche con l'interfaccia in inglese (§3).
 *
 * Chiavi i18n usate qui: penna-saved, penna-download, penna-downloading,
 *   penna-offline, penna-empty, penna-no-results, penna-unknown,
 *   penna-estimated, penna-copied, penna-inserted, penna-undo,
 *   penna-delete-ask, penna-deleted, penna-share-fail, penna-it-only,
 *   penna-new, penna-syllables, penna-sinalefe, piu' le comuni
 *   (search, copy, share, delete, cancel, close).
 *
 * Tutto il resto (documenti in IndexedDB, salvataggio automatico, colori,
 * condivisione, preferenze) sta qui sotto.
 */

import commonDict from '/shared/i18n-common.js';
import toolDict from '/penna/i18n.js';
import { init, t, lang } from '/shared/i18n.js';
import { pressFeedback, setStatus, toast } from '/shared/ui.js';
import { mountBar } from '/shared/nav.js';
import { initPwa } from '/shared/pwa.js';
import { mountSelects } from '/shared/select.js';
import { mountInfos } from '/shared/sheet.js';
import { prefs, get, put, list, del } from '/shared/storage.js';
import { versoMetrico, contaVerso, ultimaParola, parole as paroleDelVerso } from '/shared/testo/metrica.js';
import { chiaveRima } from '/shared/testo/fonetica.js';
import { LINGUE, CODICI, normalizzaCodice, cartella, moduli } from '/shared/testo/lingue.js';

const TOOL = 'penna';
const WORKER_URL = '/penna/rimario-worker.js';
const DATA_BASE = '/penna/data/';
const CACHE_PACCHETTI = 'toolbox-rimario';
const PACCHETTI_URL = '/penna/pacchetti.js';
/* catalogo minimo: vale finche' il builder non consegna pacchetti.js */
const CATALOGO_BASE = Object.fromEntries(CODICI.map((c) => {
    const v = LINGUE[c].versione;
    const gzip = { it: 1257000, en: 1612000, fr: 1047000, es: 452000 }[c];
    const file = LINGUE[c].derivate ? ['parole-' + v + '.txt'] : ['parole-' + v + '.txt', 'chiavi-' + v + '.json', 'tratti-' + v + '.bin'];
    return [c, { codice: c, nome: LINGUE[c].nome, versione: v, gzip, file }];
}));
const SALVA_DOPO = 600;      // ms di quiete prima di salvare
const COLORI = 6;            // classi di rima colorate (spec §3)
const LETTERE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const nuovoId = () => new Date().toISOString() + '-' + Math.random().toString(36).slice(2, 7);

/** Documento vuoto: la forma salvata in IndexedDB (spec §4). */
export function documentoVuoto(titolo = '', lingua = 'it') {
    const ora = new Date().toISOString();
    /* `lingua` decide le regole del gutter, `emuet` il francese (spec 14b §3) */
    return { titolo, testo: '', creato: ora, modificato: ora, dialefe: {}, lingua, emuet: false };
}

/**
 * Colori di rima: l'ultima parola di ogni verso entra in una classe; le
 * classi con almeno due versi prendono un colore (ciclico dopo sei) e una
 * LETTERA, che non si ricicla mai (spec §3: leggibile senza colore).
 * -> [{ riga, chiave, gruppo, colore, lettera } ...] solo per i versi in rima
 */
export function gruppiDiRima(testo, regole = null) {
    const righe = String(testo == null ? '' : testo).split('\n');
    /* i colori seguono la lingua del documento: senza regole caricate si
       resta all'italiano, che e' sempre in pagina */
    const pulisci = regole && regole.sillabe && regole.sillabe.normalizza ? regole.sillabe.normalizza : null;
    const chiaveDi = regole && regole.fonetica && regole.fonetica.chiaveRima ? regole.fonetica.chiaveRima : chiaveRima;
    const perChiave = new Map();
    righe.forEach((riga, i) => {
        const parola = pulisci ? ultimaParola(riga, pulisci) : ultimaParola(riga);
        if (!parola) return;
        const chiave = chiaveDi(parola);
        if (!chiave) return;
        const arr = perChiave.get(chiave);
        if (arr) arr.push(i); else perChiave.set(chiave, [i]);
    });
    const out = [];
    let gruppo = 0;
    perChiave.forEach((righeDelGruppo, chiave) => {
        if (righeDelGruppo.length < 2) return;   // una rima da sola non e' una rima
        const colore = gruppo % COLORI;
        const lettera = LETTERE[gruppo % LETTERE.length];
        righeDelGruppo.forEach((riga) => out.push({ riga, chiave, gruppo, colore, lettera }));
        gruppo++;
    });
    return out.sort((a, b) => a.riga - b.riga);
}

export function mountPenna() {
    const root = document.getElementById('penna');
    if (!root) return null;

    const el = (id) => document.getElementById(id);
    const titleIn = el('pen-title');
    const textIn = el('pen-text');
    const gutter = el('pen-gutter');
    const linesBox = el('pen-lines');
    const countMode = el('pen-count-mode');
    const monoTgl = el('pen-mono');
    const colorsTgl = el('pen-colors');
    const docsBox = el('pen-docs');
    const statusOut = el('pen-status');
    const newBtn = el('pen-new');
    const shareBtn = el('pen-share');
    const deleteBtn = el('pen-delete');
    const queryIn = el('pen-query');
    const typeBox = el('pen-type');
    const sylSel = el('pen-syl');
    const resultsBox = el('pen-results');
    const downloadBtn = el('pen-download');
    const progress = el('pen-progress');
    const copyTgl = el('pen-copy-mode');
    const unknownBox = el('pen-unknown');
    const sheet = el('pen-sheet');
    const sheetList = el('pen-sheet-list');
    const langBox = el('pen-lang');
    const packSheet = el('pen-pack-sheet');
    const packTitle = el('pen-pack-title');
    const packSize = el('pen-pack-size');
    const packGo = el('pen-pack-go');
    const packBar = el('pen-pack-bar');
    const packCancel = el('pen-pack-cancel');
    const packFonti = el('pen-pack-fonti');
    const docLang = el('pen-doc-lang');
    const emuetTgl = el('pen-emuet');

    const ui = {
        stato: 'vuoto',
        conteggio: prefs.get(TOOL, 'conteggio', 'metrico') === 'grammaticale' ? 'grammaticale' : 'metrico',
        mono: !!prefs.get(TOOL, 'mono', false),
        colori: prefs.get(TOOL, 'colori', true) !== false,
        copia: !!prefs.get(TOOL, 'copia', false),
        tipo: 'rime',
        sillabe: 'tutte',
        forza: null,
        doc: null,
        id: null,
        /* lingua del RIMARIO (quella caricata nel Worker) e lingua del
           DOCUMENTO (quella che guida il gutter): di solito coincidono */
        /* default: la lingua dell'INTERFACCIA (it/en), non `navigator.language`:
           chi ha il browser in inglese e il sito in italiano deve contare i
           versi all'italiana (spec 14b §3). */
        lingua: normalizzaCodice(prefs.get(TOOL, 'lingua', lang() || 'it')),
        docLingua: 'it',
        emuet: false,
        pacchetti: (() => {
            const v = prefs.get(TOOL, 'pacchetti', ['it']);
            return Array.isArray(v) ? v.filter((c) => CODICI.includes(c)) : ['it'];
        })()
    };

    let salvaTimer = null;
    let rimario = null;        // { cerca } sul thread principale (ripiego)
    let worker = null;
    let pronto = false;
    let caricando = false;
    let richiesta = 0;
    const inAttesa = new Map();
    let classi = null;         // (parola) -> classe, dal rimario
    /* Tratti veri delle parole del testo (sillabe, classe, stimato) dal
       rimario in memoria: Wikizionario per l'italiano, CMU per l'inglese,
       IPA per il francese. Col Worker arrivano in asincrono, a lotti: la
       colonna si ridisegna quando arrivano. La cache e' per lingua. */
    const trattiCache = new Map();   // "lang|parola" -> { sillabe, classe, stimato } | null
    let trattiInAttesa = null;       // Set di parole gia' chieste
    let trattiTimer = null;
    let catalogo = CATALOGO_BASE;
    let regoleDoc = null;      // moduli della lingua del documento
    let scaricamento = null;   // { annulla() } mentre un pacchetto scende

    /* ---------------- stato della pagina ---------------- */

    function setStato(stato) {
        ui.stato = stato;
        root.setAttribute('data-pen-state', stato);
    }

    function setConteggio(modo) {
        ui.conteggio = modo === 'grammaticale' ? 'grammaticale' : 'metrico';
        prefs.set(TOOL, 'conteggio', ui.conteggio);
        root.setAttribute('data-pen-count', ui.conteggio);
        if (countMode) {
            [...countMode.querySelectorAll('[data-pen-count]')].forEach((b) => {
                const on = b.getAttribute('data-pen-count') === ui.conteggio;
                b.setAttribute('aria-checked', on ? 'true' : 'false');
                b.classList.toggle('is-active', on);
            });
        }
        renderGutter();
    }

    function setMono(on) {
        ui.mono = !!on;
        prefs.set(TOOL, 'mono', ui.mono);
        root.classList.toggle('is-mono', ui.mono);
        if (monoTgl) monoTgl.checked = ui.mono;
    }

    function setColori(on) {
        ui.colori = !!on;
        prefs.set(TOOL, 'colori', ui.colori);
        root.classList.toggle('is-colori', ui.colori);
        if (colorsTgl) colorsTgl.checked = ui.colori;
        renderColori();
    }

    /* ---------------- gutter e colori ---------------- */

    /** Un numero per verso, con le sinalefi toccabili (spec §3). */
    function renderGutter() {
        if (!gutter || !textIn) return;
        const righe = String(textIn.value || '').split('\n');
        const dialefe = (ui.doc && ui.doc.dialefe) || {};
        chiediTratti(textIn.value || '');
        gutter.textContent = '';
        gutter.setAttribute('aria-hidden', 'true');
        righe.forEach((riga, i) => {
            const a = versoMetrico(riga, { dialefe: dialefe[String(i)], classi, ...opzioniLingua() });
            const n = ui.conteggio === 'grammaticale' ? a.grammaticale : a.metrico;
            const haSin = a.sinalefi.length > 0 && ui.conteggio === 'metrico';
            const nodo = document.createElement(haSin ? 'button' : 'span');
            if (haSin) { nodo.type = 'button'; nodo.setAttribute('data-pen-line', String(i)); }
            nodo.className = 'pen-n' + (a.stimato ? ' is-stimato' : '') + (haSin ? ' is-sinalefe' : '');
            nodo.setAttribute('data-riga', String(i));
            nodo.textContent = riga.trim() ? String(n) : '';
            if (a.stimato) nodo.setAttribute('aria-description', t('penna-estimated'));
            gutter.appendChild(nodo);
        });
        annunciaVerso();
    }

    /** Il conteggio del verso dove sta il cursore, per chi usa lo schermo letto. */
    function annunciaVerso() {
        if (!statusOut || !textIn) return;
        if (document.activeElement !== textIn) return;
        const prima = String(textIn.value || '').slice(0, textIn.selectionStart || 0);
        const riga = prima.split('\n').length - 1;
        const righe = String(textIn.value || '').split('\n');
        if (!righe[riga] || !righe[riga].trim()) return;
        const dialefe = (ui.doc && ui.doc.dialefe) || {};
        const n = contaVerso(righe[riga], ui.conteggio, dialefe[String(riga)], classi, opzioniLingua());
        statusOut.setAttribute('aria-live', 'polite');
        statusOut.textContent = n + ' ' + t('penna-syllables');
    }

    function renderColori() {
        if (!linesBox || !textIn) return;
        linesBox.textContent = '';
        linesBox.setAttribute('aria-hidden', 'true');
        if (!ui.colori) return;
        const righe = String(textIn.value || '').split('\n');
        const mappa = new Map();
        gruppiDiRima(textIn.value, regoleDoc).forEach((g) => mappa.set(g.riga, g));
        righe.forEach((riga, i) => {
            const g = mappa.get(i);
            const span = document.createElement('span');
            span.className = 'pen-line' + (g ? ' pen-rima-' + g.colore : '');
            span.textContent = riga;
            if (g) {
                const lettera = document.createElement('i');
                lettera.className = 'pen-lettera';
                lettera.textContent = g.lettera;
                span.appendChild(lettera);
            }
            linesBox.appendChild(span);
        });
    }

    /* ---------------- documenti ---------------- */

    function segnaSalvato() {
        if (!statusOut) return;
        statusOut.setAttribute('data-i18n', 'penna-saved');
        statusOut.textContent = t('penna-saved');
    }

    async function salvaOra() {
        if (!ui.doc || !ui.id) return;
        ui.doc.titolo = titleIn ? titleIn.value : ui.doc.titolo;
        ui.doc.testo = textIn ? textIn.value : ui.doc.testo;
        ui.doc.modificato = new Date().toISOString();
        try {
            await put(TOOL, ui.id, ui.doc);
            prefs.set(TOOL, 'ultimo', ui.id);
            segnaSalvato();
            renderDocs();
        } catch (e) {
            setStatus(statusOut, { kind: 'error', key: 'penna-save-fail' });
        }
    }

    function salvaPresto() {
        if (salvaTimer) clearTimeout(salvaTimer);
        salvaTimer = setTimeout(() => { salvaTimer = null; salvaOra(); }, SALVA_DOPO);
    }

    function apri(id, doc) {
        ui.id = id;
        ui.doc = { ...documentoVuoto(), ...doc };
        ui.docLingua = normalizzaCodice(ui.doc.lingua || ui.lingua);
        ui.emuet = !!ui.doc.emuet;
        ui.doc.lingua = ui.docLingua;
        caricaRegoleDoc();
        renderLingue();
        if (titleIn) titleIn.value = ui.doc.titolo || '';
        if (textIn) textIn.value = ui.doc.testo || '';
        setStato('scrittura');
        renderGutter();
        renderColori();
        prefs.set(TOOL, 'ultimo', id);
    }

    function nuovo() {
        const doc = documentoVuoto('', ui.lingua);
        apri(nuovoId(), doc);
        if (titleIn) titleIn.focus();
        salvaPresto();
    }

    function etichetta(doc) {
        const prima = String(doc.testo || '').split('\n').find((r) => r.trim()) || '';
        const data = new Date(doc.modificato || doc.creato || Date.now());
        let quando;
        try { quando = new Intl.DateTimeFormat(lang(), { day: 'numeric', month: 'short' }).format(data); } catch (e) { quando = ''; }
        return { titolo: doc.titolo || t('penna-untitled'), prima: prima.slice(0, 60), quando };
    }

    async function renderDocs() {
        if (!docsBox) return;
        let tutti = [];
        try { tutti = await list(TOOL); } catch (e) { return; }
        docsBox.textContent = '';
        tutti.slice().reverse().forEach((rec) => {
            const doc = rec.value || rec;
            const id = rec.id;
            const info = etichetta(doc);
            const li = document.createElement('li');
            li.className = 'pen-doc';
            const apriBtn = document.createElement('button');
            apriBtn.type = 'button';
            apriBtn.className = 'pen-doc-open';
            apriBtn.setAttribute('data-pen-doc', String(id));
            apriBtn.innerHTML = '';
            const titolo = document.createElement('span');
            titolo.className = 'pen-doc-title';
            titolo.textContent = info.titolo;
            const sotto = document.createElement('span');
            sotto.className = 'pen-doc-sub';
            sotto.textContent = [info.prima, info.quando].filter(Boolean).join(' · ');
            apriBtn.append(titolo, sotto);
            apriBtn.addEventListener('click', () => { apri(id, doc); });
            const rm = document.createElement('button');
            rm.type = 'button';
            rm.className = 'pen-doc-del tb-btn--icon';
            rm.setAttribute('data-pen-del', String(id));
            rm.setAttribute('aria-label', t('penna-delete'));
            rm.textContent = '×';
            rm.addEventListener('click', (e) => { e.stopPropagation(); chiediElimina(id); });
            li.append(apriBtn, rm);
            docsBox.appendChild(li);
        });
    }

    let daEliminare = null;
    function chiediElimina(id) {
        daEliminare = id;
        const box = el('pen-delete-confirm');
        if (!box) { elimina(id); return; }
        box.hidden = false;
    }
    async function elimina(id) {
        try { await del(TOOL, id); } catch (e) { /* niente da fare */ }
        const box = el('pen-delete-confirm');
        if (box) box.hidden = true;
        if (ui.id === id) { ui.id = null; ui.doc = null; setStato('vuoto'); }
        toast('penna-deleted');
        renderDocs();
    }

    /* ---------------- lingue e pacchetti ---------------- */

    /** Le opzioni metriche della lingua del documento (spec 14b §3). */
    /** (parola) -> tratti dalla cache, solo se il rimario in memoria e' nella lingua del testo. */
    function trattiDiParola(parola) {
        if (!pronto || ui.lingua !== ui.docLingua) return null;
        const k = ui.lingua + '|' + parola;
        return trattiCache.has(k) ? trattiCache.get(k) : null;
    }

    /**
     * Chiede al rimario i tratti delle parole del testo che la cache non
     * ha ancora: una richiesta sola per giro, e la colonna si ridisegna
     * solo se e' arrivato qualcosa di nuovo (niente rimbalzi).
     */
    function chiediTratti(testo) {
        if (!pronto || ui.lingua !== ui.docLingua) return;
        const lingua = ui.lingua;
        const nuove = new Set();
        for (const p of paroleDelVerso(testo, regoleDoc && regoleDoc.sillabe && regoleDoc.sillabe.normalizza ? regoleDoc.sillabe.normalizza : undefined)) {
            const parola = p.pulita.replace(/'/g, '');
            if (!parola) continue;
            const k = lingua + '|' + parola;
            if (trattiCache.has(k) || (trattiInAttesa && trattiInAttesa.has(k))) continue;
            nuove.add(parola);
        }
        if (!nuove.size) return;
        const lista = [...nuove];
        if (rimario) {
            /* sul thread principale la risposta e' sincrona */
            lista.forEach((parola) => trattiCache.set(lingua + '|' + parola, rimario.trattiDiParola(parola)));
            return;
        }
        if (!worker) return;
        if (!trattiInAttesa) trattiInAttesa = new Set();
        lista.forEach((parola) => trattiInAttesa.add(lingua + '|' + parola));
        const id = ++richiesta;
        inAttesa.set(id, (d) => {
            const trovate = (d && d.tratti) || {};
            const dove = (d && d.lingua) || lingua;
            let nuovo = false;
            lista.forEach((parola) => {
                const k = dove + '|' + parola;
                if (trattiInAttesa) trattiInAttesa.delete(k);
                const tr = Object.prototype.hasOwnProperty.call(trovate, parola) ? trovate[parola] : null;
                if (tr) nuovo = true;
                trattiCache.set(k, tr);
            });
            if (nuovo && dove === ui.lingua) {
                clearTimeout(trattiTimer);
                trattiTimer = setTimeout(() => { renderGutter(); }, 30);
            }
        });
        worker.postMessage({ type: 'tratti', id, parole: lista });
    }

    function opzioniLingua() {
        const spec = LINGUE[ui.docLingua] || LINGUE.it;
        return {
            moduli: regoleDoc,
            tratti: trattiDiParola,
            sinalefe: spec.sinalefe,
            /* la normalizzazione a piano e' romanza: IT ed ES (spec 14b §3).
               In francese l'accento e' sempre finale — normalizzare vorrebbe
               dire aggiungere +1 a ogni verso; in inglese non esiste. */
            normalizza: ui.docLingua === 'it' || ui.docLingua === 'es',
            emuet: ui.docLingua === 'fr' ? !!ui.emuet : false
        };
    }

    async function caricaRegoleDoc() {
        try {
            regoleDoc = ui.docLingua === 'it' ? null : await moduli(ui.docLingua);
        } catch (e) {
            regoleDoc = null;          // niente regole: si conta all'italiana
        }
        renderGutter();
    }

    function installato(codice) {
        return ui.pacchetti.includes(codice);
    }

    function renderLingue() {
        if (langBox) {
            [...langBox.querySelectorAll('[data-pen-lang]')].forEach((b) => {
                const codice = b.getAttribute('data-pen-lang');
                const on = codice === ui.lingua;
                b.setAttribute('aria-checked', on ? 'true' : 'false');
                b.classList.toggle('is-active', on);
                b.classList.toggle('is-missing', !installato(codice));
            });
        }
        if (docLang && docLang.value !== ui.docLingua) docLang.value = ui.docLingua;
        if (emuetTgl) {
            const riga = emuetTgl.closest('label') || emuetTgl;
            riga.hidden = ui.docLingua !== 'fr';
            emuetTgl.checked = !!ui.emuet;
        }
        if (resultsBox) resultsBox.setAttribute('lang', ui.lingua);
        root.setAttribute('data-pen-lang', ui.lingua);
        root.setAttribute('data-pen-doc-lang', ui.docLingua);
    }

    /** Apre il foglio del pacchetto (o cambia lingua, se e' gia' installato). */
    async function scegliLingua(codice) {
        const lang = normalizzaCodice(codice);
        if (lang === ui.lingua && pronto) return;
        if (installato(lang)) {
            ui.lingua = lang;
            prefs.set(TOOL, 'lingua', lang);
            pronto = false;
            renderLingue();
            await scarica();           // dalla cache: nessuna rete
            if (queryIn && queryIn.value.trim()) cerca(queryIn.value);
            return;
        }
        apriFoglioPacchetto(lang);
    }

    function pesoLeggibile(byte) {
        const mb = byte / 1048576;
        return (mb >= 1 ? mb.toFixed(1) : (byte / 1024).toFixed(0)) + (mb >= 1 ? ' MB' : ' KB');
    }

    function apriFoglioPacchetto(codice) {
        const pack = catalogo[codice] || CATALOGO_BASE[codice];
        if (!packSheet || !pack) return;
        packSheet.hidden = false;
        packSheet.setAttribute('data-pen-pack', codice);
        if (packTitle) packTitle.textContent = t('penna-pack-get', { lingua: pack.nome, language: pack.nome });
        if (packSize) packSize.textContent = pesoLeggibile(pack.gzip) + ' · ' + t('penna-pack-size') + ' · ' + t('penna-pack-offline');
        if (packBar) { packBar.hidden = true; packBar.style.setProperty('--pen-pct', '0%'); }
        if (packGo) packGo.hidden = false;
        if (packFonti) {
            packFonti.textContent = '';
            (pack.fonti || []).forEach((f) => {
                const li = document.createElement('li');
                li.textContent = f.nome + ' — ' + f.licenza;
                packFonti.appendChild(li);
            });
        }
    }

    function chiudiFoglioPacchetto() {
        if (scaricamento) scaricamento.annulla();
        if (packSheet) packSheet.hidden = true;
    }

    /**
     * Scarica un pacchetto dal NOSTRO origine e lo mette in Cache Storage
     * (spec 14b §2: nessun terzo, nessun identificatore, niente banner).
     * La barra avanza per file; "Annulla" ferma tutto e non lascia nulla a
     * meta': quello che era gia' in cache resta, il resto non si usa.
     */
    async function installaPacchetto(codice) {
        const lang = normalizzaCodice(codice);
        const pack = catalogo[lang] || CATALOGO_BASE[lang];
        if (!pack || scaricamento) return false;
        const file = ['manifest-' + pack.versione + '.json', ...(pack.file || [])];
        const dir = cartella(lang, DATA_BASE);
        let fermato = false;
        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        scaricamento = { annulla() { fermato = true; if (controller) controller.abort(); } };
        if (packBar) {
            packBar.hidden = false;
            packBar.setAttribute('role', 'progressbar');
            packBar.setAttribute('aria-live', 'polite');
            packBar.setAttribute('aria-valuemin', '0');
            packBar.setAttribute('aria-valuemax', '100');
        }
        if (packGo) packGo.hidden = true;
        const avanti = (fatti) => {
            const pct = Math.round(100 * fatti / file.length);
            if (packBar) {
                packBar.style.setProperty('--pen-pct', pct + '%');
                packBar.setAttribute('aria-valuenow', String(pct));
                packBar.textContent = pct + '%';
            }
        };
        avanti(0);
        try {
            const cache = typeof caches !== 'undefined' ? await caches.open(CACHE_PACCHETTI) : null;
            for (let i = 0; i < file.length; i++) {
                if (fermato) throw new Error('annullato');
                const url = dir + file[i];
                const risposta = await fetch(url, controller ? { signal: controller.signal } : undefined);
                if (!risposta.ok) throw new Error(file[i] + ': HTTP ' + risposta.status);
                if (cache) await cache.put(url, risposta.clone());
                avanti(i + 1);
            }
            if (!ui.pacchetti.includes(lang)) ui.pacchetti = [...ui.pacchetti, lang];
            prefs.set(TOOL, 'pacchetti', ui.pacchetti);
            scaricamento = null;
            if (packSheet) packSheet.hidden = true;
            ui.lingua = lang;
            prefs.set(TOOL, 'lingua', lang);
            pronto = false;
            renderLingue();
            await scarica();
            if (queryIn && queryIn.value.trim()) cerca(queryIn.value);
            return true;
        } catch (e) {
            scaricamento = null;
            if (packGo) packGo.hidden = false;
            if (packBar) packBar.hidden = true;
            if (!fermato) setStatus(statusOut, { kind: 'error', key: 'penna-offline' });
            return false;
        }
    }

    /** "Rimuovi": via dalla cache e dalle preferenze. */
    async function rimuoviPacchetto(codice) {
        const lang = normalizzaCodice(codice);
        const pack = catalogo[lang] || CATALOGO_BASE[lang];
        const dir = cartella(lang, DATA_BASE);
        try {
            if (typeof caches !== 'undefined') {
                const cache = await caches.open(CACHE_PACCHETTI);
                await Promise.all(['manifest-' + pack.versione + '.json', ...(pack.file || [])].map((f) => cache.delete(dir + f)));
            }
        } catch (e) { /* cache non disponibile: restano solo le prefs */ }
        ui.pacchetti = ui.pacchetti.filter((c) => c !== lang);
        prefs.set(TOOL, 'pacchetti', ui.pacchetti);
        if (ui.lingua === lang) {
            ui.lingua = ui.pacchetti[0] || 'it';
            prefs.set(TOOL, 'lingua', ui.lingua);
            pronto = false;
        }
        renderLingue();
        return ui.pacchetti;
    }

    /* ---------------- rimario ---------------- */

    function mostraProgresso(fatto, totale) {
        if (!progress) return;
        const pct = totale ? Math.round(100 * fatto / totale) : 0;
        progress.hidden = false;
        progress.setAttribute('role', 'progressbar');
        progress.setAttribute('aria-valuemin', '0');
        progress.setAttribute('aria-valuemax', '100');
        progress.setAttribute('aria-valuenow', String(pct));
        progress.style.setProperty('--pen-pct', pct + '%');
    }

    function finitoProgresso() {
        if (progress) progress.hidden = true;
        if (downloadBtn) downloadBtn.hidden = true;
    }

    /** Scarica l'indice: Worker se c'e', altrimenti qui (spec §4). */
    async function scarica() {
        if (pronto || caricando) return pronto;
        caricando = true;
        if (statusOut) setStatus(statusOut, { kind: 'idle', key: 'penna-downloading' });
        mostraProgresso(0, 3);
        trattiInAttesa = null;   // richieste al Worker precedente: mai piu' risposte
        try {
            worker = new Worker(WORKER_URL, { type: 'module' });
        } catch (e) {
            worker = null;   // Safari senza module worker: si lavora qui
        }
        if (worker) {
            worker.addEventListener('message', (e) => {
                const d = e.data || {};
                if (d.type === 'progresso') { mostraProgresso(d.fatto, d.totale); return; }
                if (d.type === 'pronto') { pronto = true; caricando = false; finitoProgresso(); dopoIndice(); return; }
                if (d.type === 'risultati' || d.type === 'classe' || d.type === 'tratti') {
                    const cb = inAttesa.get(d.id);
                    if (cb) { inAttesa.delete(d.id); cb(d); }
                    return;
                }
                if (d.type === 'errore') { caricando = false; fallitoIndice(d.message); }
            });
            worker.addEventListener('error', () => { caricando = false; fallitoIndice('worker'); });
            worker.postMessage({ type: 'carica', base: DATA_BASE, lang: ui.lingua });
            return true;
        }
        try {
            const mod = await import(WORKER_URL);
            rimario = mod.creaRimario();
            await rimario.carica(DATA_BASE, mostraProgresso, ui.lingua);
            pronto = true;
            caricando = false;
            finitoProgresso();
            dopoIndice();
            return true;
        } catch (e) {
            caricando = false;
            fallitoIndice(String((e && e.message) || e));
            return false;
        }
    }

    function fallitoIndice(motivo) {
        pronto = false;
        if (progress) progress.hidden = true;
        if (downloadBtn) downloadBtn.hidden = false;
        setStatus(statusOut, { kind: 'error', key: 'penna-offline' });
        if (resultsBox) resultsBox.setAttribute('data-pen-error', motivo ? 'si' : 'no');
    }

    function dopoIndice() {
        /* col rimario in memoria il conteggio metrico usa le classi vere */
        classi = (parola) => {
            if (rimario) return rimario.classeDiParola(parola);
            return null;   // col Worker la classe arriva in asincrono: si usa la stima
        };
        prefs.set(TOOL, 'rimario', true);
        renderGutter();
        if (queryIn && queryIn.value.trim()) cerca(queryIn.value);
    }

    function chiedi(messaggio) {
        return new Promise((resolve) => {
            if (rimario) {
                if (messaggio.type === 'cerca') {
                    resolve({ ...rimario.cerca(messaggio.parola, { tipo: messaggio.tipo, sillabe: messaggio.sillabe, forza: messaggio.forza }) });
                    return;
                }
                resolve({ classe: rimario.classeDiParola(messaggio.parola) });
                return;
            }
            if (!worker) { resolve({ voci: [] }); return; }
            const id = ++richiesta;
            inAttesa.set(id, resolve);
            worker.postMessage({ ...messaggio, id });
        });
    }

    async function cerca(parolaGrezza) {
        /* NFC una volta sola, qui all'ingresso: quello che arriva dal
           textarea o dagli appunti puo' avere gli accenti combinanti. */
        const parola = String(parolaGrezza || '').normalize('NFC').trim();
        if (!resultsBox) return null;
        if (!parola) { resultsBox.textContent = ''; if (unknownBox) unknownBox.hidden = true; return null; }
        if (!pronto) { const ok = await scarica(); if (!ok && !pronto) return null; }
        const out = await chiedi({ type: 'cerca', parola, tipo: ui.tipo, sillabe: ui.sillabe, forza: ui.forza });
        if (out) out.lingua = out.lingua || ui.lingua;
        renderRisultati(out);
        return out;
    }

    function renderRisultati(out) {
        if (!resultsBox) return;
        resultsBox.textContent = '';
        resultsBox.setAttribute('lang', ui.lingua);
        if (unknownBox) unknownBox.hidden = !(out && out.sconosciuta);
        /* chiave presa in prestito da una parola che si scrive simile */
        if (unknownBox && out && out.analogia) {
            unknownBox.setAttribute('data-pen-analogy', 'si');
            const nota = unknownBox.querySelector('[data-pen-analogy-text]');
            if (nota) nota.textContent = t('penna-analogy');
        } else if (unknownBox) unknownBox.removeAttribute('data-pen-analogy');
        if (!out || !out.voci.length) {
            const vuoto = document.createElement('p');
            vuoto.className = 'tb-status tb-status--idle';
            vuoto.setAttribute('data-i18n', 'penna-no-results');
            vuoto.textContent = t('penna-no-results');
            resultsBox.appendChild(vuoto);
            return;
        }
        out.voci.forEach((v) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'pen-hit tb-pill' + (v.stimato ? ' is-stimato' : '');
            b.setAttribute('data-pen-word', v.parola);
            b.setAttribute('lang', ui.lingua);
            const nome = document.createElement('span');
            nome.className = 'pen-hit-word';
            nome.textContent = v.parola;
            const n = document.createElement('span');
            n.className = 'pen-syl';
            n.textContent = String(v.sillabe);
            b.append(nome, n);
            if (v.stimato) b.setAttribute('aria-description', t('penna-estimated'));
            b.addEventListener('click', () => usaParola(v.parola));
            resultsBox.appendChild(b);
        });
    }

    /** Tocco su una pillola: la parola va al cursore (o in copia). */
    async function usaParola(parola) {
        if (ui.copia) {
            try { await navigator.clipboard.writeText(parola); toast('penna-copied'); } catch (e) { toast('penna-copy-manual'); }
            return;
        }
        if (!textIn) return;
        const start = textIn.selectionStart || 0;
        const end = textIn.selectionEnd || start;
        const prima = textIn.value.slice(0, start);
        const dopo = textIn.value.slice(end);
        const spazio = prima && !/\s$/.test(prima) ? ' ' : '';
        textIn.value = prima + spazio + parola + dopo;
        const cur = (prima + spazio + parola).length;
        textIn.setSelectionRange(cur, cur);
        textIn.dispatchEvent(new Event('input', { bubbles: true }));
        chiudiFoglio();
        toast('penna-inserted');
    }

    function chiudiFoglio() {
        if (!sheet) return;
        const rhyme = el('pen-rhyme');
        if (rhyme && rhyme.classList.contains('is-sheet')) rhyme.hidden = true;
    }

    /* ---------------- sinalefi del verso ---------------- */

    function apriSinalefi(riga) {
        if (!sheetList || !textIn) return;
        const righe = String(textIn.value || '').split('\n');
        const dialefe = (ui.doc && ui.doc.dialefe) || {};
        const spente = dialefe[String(riga)] || [];
        const a = versoMetrico(righe[riga] || '', { dialefe: spente, classi, ...opzioniLingua() });
        sheetList.textContent = '';
        sheetList.setAttribute('data-pen-line', String(riga));
        a.sinalefi.forEach((s) => {
            const label = document.createElement('label');
            label.className = 'tb-toggle pen-sin';
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = s.attiva;
            input.setAttribute('data-pen-sin', String(s.indice));
            const testo = document.createElement('span');
            testo.textContent = s.prima + ' ' + s.dopo;
            input.addEventListener('change', () => toggleSinalefe(riga, s.indice, input.checked));
            label.append(input, testo);
            sheetList.appendChild(label);
        });
        if (sheet) sheet.hidden = false;
    }

    function toggleSinalefe(riga, indice, attiva) {
        if (!ui.doc) return;
        const chiave = String(riga);
        const dialefe = ui.doc.dialefe || (ui.doc.dialefe = {});
        const spente = new Set(dialefe[chiave] || []);
        if (attiva) spente.delete(indice); else spente.add(indice);
        if (spente.size) dialefe[chiave] = [...spente].sort((x, y) => x - y);
        else delete dialefe[chiave];
        renderGutter();
        salvaPresto();
    }

    /* ---------------- condivisione ---------------- */

    async function condividi() {
        const testo = (ui.doc && ui.doc.testo) || (textIn ? textIn.value : '');
        const titolo = (titleIn && titleIn.value) || t('penna-untitled');
        if (!testo.trim()) return;
        if (navigator.share) {
            try { await navigator.share({ title: titolo, text: testo }); return; } catch (e) { /* annullato o non permesso */ }
        }
        try { await navigator.clipboard.writeText(testo); toast('penna-copied'); } catch (e) { toast('penna-copy-manual'); }
    }

    /* ---------------- eventi ---------------- */

    if (textIn) {
        textIn.addEventListener('input', () => {
            const fai = () => { renderGutter(); renderColori(); };
            if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(fai, { timeout: 120 });
            else fai();
            salvaPresto();
        });
        ['click', 'keyup'].forEach((ev) => textIn.addEventListener(ev, annunciaVerso));
        /* doppio tocco su una parola: va nel rimario (spec §3) */
        textIn.addEventListener('dblclick', () => {
            const v = textIn.value;
            const at = textIn.selectionStart || 0;
            const da = v.slice(0, at).search(/[a-zàèéìíîòóùú']+$/i);
            const resto = v.slice(at).match(/^[a-zàèéìíîòóùú']+/i);
            const parola = (da >= 0 ? v.slice(da, at) : '') + (resto ? resto[0] : '');
            if (!parola) return;
            if (queryIn) queryIn.value = parola;
            cerca(parola);
        });
    }
    if (titleIn) titleIn.addEventListener('input', salvaPresto);
    if (gutter) {
        gutter.addEventListener('click', (e) => {
            const b = e.target.closest('[data-pen-line]');
            if (b) apriSinalefi(Number(b.getAttribute('data-pen-line')));
        });
    }
    if (countMode) {
        countMode.addEventListener('click', (e) => {
            const b = e.target.closest('[data-pen-count]');
            if (b) setConteggio(b.getAttribute('data-pen-count'));
        });
    }
    if (monoTgl) monoTgl.addEventListener('change', () => setMono(monoTgl.checked));
    if (colorsTgl) colorsTgl.addEventListener('change', () => setColori(colorsTgl.checked));
    if (copyTgl) copyTgl.addEventListener('change', () => { ui.copia = copyTgl.checked; prefs.set(TOOL, 'copia', ui.copia); });
    if (newBtn) newBtn.addEventListener('click', nuovo);
    if (shareBtn) shareBtn.addEventListener('click', condividi);
    if (deleteBtn) deleteBtn.addEventListener('click', () => { if (ui.id) chiediElimina(ui.id); });
    const yes = el('pen-delete-yes');
    const no = el('pen-delete-no');
    if (yes) yes.addEventListener('click', () => { if (daEliminare) elimina(daEliminare); });
    if (no) no.addEventListener('click', () => { const b = el('pen-delete-confirm'); if (b) b.hidden = true; });
    if (downloadBtn) downloadBtn.addEventListener('click', () => scarica());
    if (queryIn) {
        let attesa = null;
        queryIn.addEventListener('input', () => {
            if (attesa) clearTimeout(attesa);
            attesa = setTimeout(() => { attesa = null; ui.forza = null; cerca(queryIn.value); }, 200);
        });
    }
    if (typeBox) {
        typeBox.addEventListener('click', (e) => {
            const b = e.target.closest('[data-pen-type]');
            if (!b) return;
            ui.tipo = b.getAttribute('data-pen-type');
            [...typeBox.querySelectorAll('[data-pen-type]')].forEach((x) => {
                const on = x === b;
                x.setAttribute('aria-checked', on ? 'true' : 'false');
                x.classList.toggle('is-active', on);
            });
            if (queryIn) cerca(queryIn.value);
        });
    }
    if (sylSel) {
        sylSel.addEventListener('change', () => {
            ui.sillabe = sylSel.value || 'tutte';
            if (queryIn) cerca(queryIn.value);
        });
    }
    if (unknownBox) {
        unknownBox.addEventListener('click', (e) => {
            const b = e.target.closest('[data-pen-forza]');
            if (!b || !queryIn) return;
            ui.forza = b.getAttribute('data-pen-forza');
            cerca(queryIn.value);
        });
    }
    if (langBox) {
        langBox.addEventListener('click', (e) => {
            const b = e.target.closest('[data-pen-lang]');
            if (b) scegliLingua(b.getAttribute('data-pen-lang'));
        });
    }
    if (packGo) {
        packGo.addEventListener('click', () => {
            const codice = packSheet ? packSheet.getAttribute('data-pen-pack') : null;
            if (codice) installaPacchetto(codice);
        });
    }
    if (packCancel) packCancel.addEventListener('click', chiudiFoglioPacchetto);
    if (docLang) {
        docLang.addEventListener('change', () => {
            ui.docLingua = normalizzaCodice(docLang.value);
            if (ui.doc) { ui.doc.lingua = ui.docLingua; salvaPresto(); }
            renderLingue();
            caricaRegoleDoc();
        });
    }
    if (emuetTgl) {
        emuetTgl.addEventListener('change', () => {
            ui.emuet = emuetTgl.checked;
            if (ui.doc) { ui.doc.emuet = ui.emuet; salvaPresto(); }
            renderGutter();
        });
    }
    window.addEventListener('pagehide', () => { if (salvaTimer) { clearTimeout(salvaTimer); salvaOra(); } });

    /* ---------------- avvio ---------------- */

    mountSelects(document);
    mountInfos(document);
    /* il catalogo e' un modulo precacheato: nessuna richiesta di rete */
    import(PACCHETTI_URL).then((m) => {
        if (m && m.PACCHETTI) { catalogo = m.PACCHETTI; renderLingue(); }
    }, () => { /* non consegnato: resta il catalogo minimo */ });
    if (!ui.pacchetti.includes('it')) ui.pacchetti = ['it', ...ui.pacchetti];
    /* il rimario parte su una lingua che c'e' davvero: il documento puo'
       restare in un'altra, il gutter gira anche senza pacchetto */
    ui.docLingua = ui.lingua;
    if (!installato(ui.lingua)) ui.lingua = 'it';
    renderLingue();
    caricaRegoleDoc();
    setConteggio(ui.conteggio);
    setMono(ui.mono);
    setColori(ui.colori);
    if (copyTgl) copyTgl.checked = ui.copia;
    setStato('vuoto');
    renderDocs();
    (async () => {
        const ultimo = prefs.get(TOOL, 'ultimo', null);
        if (!ultimo) return;
        try {
            const doc = await get(TOOL, ultimo);
            if (doc) apri(ultimo, doc);
        } catch (e) { /* niente documento: si resta sul vuoto */ }
    })();
    /* l'indice si scarica solo quando serve: l'editor funziona offline */
    if (prefs.get(TOOL, 'rimario', false) && navigator.onLine !== false) scarica();

    return {
        ui,
        apri,
        nuovo,
        salvaOra,
        renderDocs,
        renderGutter,
        renderColori,
        gruppiDiRima,
        cerca,
        usaParola,
        condividi,
        scarica,
        apriSinalefi,
        toggleSinalefe,
        elimina,
        setConteggio,
        setMono,
        setColori,
        scegliLingua,
        installaPacchetto,
        rimuoviPacchetto,
        apriFoglioPacchetto,
        chiudiFoglioPacchetto,
        renderLingue,
        opzioniLingua,
        catalogo: () => catalogo,
        documento: () => ui.doc,
        pronto: () => pronto
    };
}

/* Avvio della pagina (nel browser; nei test il modulo si importa e basta). */
if (typeof document !== 'undefined' && document.getElementById('penna')) {
    init(commonDict, toolDict);
    pressFeedback(document);
    mountBar({ page: 'tool', current: TOOL });
    initPwa({
        installBtn: document.getElementById('tb-menu-install'),
        iosHelp: document.getElementById('tb-menu-ios'),
        installSection: document.querySelector('.tb-menu-install-group')
    });
    mountPenna();
}
