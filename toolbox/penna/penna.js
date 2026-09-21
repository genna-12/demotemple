/**
 * Tiny Temple Toolbox - Penna: il quaderno (spec 14, 14b, 16).
 *
 * Due viste sotto lo stesso <main>: l'ELENCO dei testi (l'ingresso) e
 * l'EDITOR. L'unica fonte della vista e' l'hash: `/penna/` e' l'elenco,
 * `/penna/#t=<id>` e' quel testo (spec 16 §3). Il modello dell'elenco
 * (ricerca, ordine, unione dei file importati) sta in `penna/elenco.js`,
 * i file del quaderno in `penna/file.js`: tutti e due si provano da soli.
 *
 * =====================================================================
 * CONTRATTO CON IL MARKUP (spec 14 §5 e 16 §4: gli id li fissa la spec,
 * qui si dice solo che cosa ci fa il JS; dove la spec tace vale questo file)
 * =====================================================================
 *   #penna          <main> con data-pen-vista="elenco|editor" (lo scrive il
 *                   JS, il CSS ci accende una delle due sezioni) e
 *                   data-pen-count="metrico|grammaticale"
 *   #pen-list       la vista elenco; dentro:
 *                   #pen-search   <input type="search"> ricerca
 *                   #pen-sort     <select> ordine: mod|titolo (tb-select)
 *                   #pen-list-grid dove vanno le card
 *                   #pen-card-tpl <template> di una card: il JS lo clona e
 *                                 riempie .pen-card-title/.pen-card-verse/
 *                                 .pen-card-lang/.pen-card-date/.pen-card-verses
 *                                 e scrive data-id sul bottone
 *                   #pen-list-empty quaderno vuoto (+ #pen-list-empty-new)
 *                   #pen-list-none  ricerca senza risultati
 *   #pen-editor     contenitore dell'editor
 *   #pen-back       torna all'elenco (salvando prima)
 *   #pen-settings   foglio impostazioni (tb-sheet, shared/sheet.js), aperto
 *                   dai due .pen-settings-open (#pen-settings-open in elenco,
 *                   #pen-settings-open-editor in barra); dentro, oltre ai
 *                   comandi della 14/14b: #pen-export #pen-import
 *                   #pen-import-input #pen-print, e la sezione #pen-sync
 *                   (spec 17, qui sotto)
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
 *   #pen-lines      livello sotto la textarea: il JS ci scrive un
 *                   <span class="pen-line pen-rima-N"> per verso. Si disegna
 *                   SEMPRE, anche a colori spenti (spec 16 §4 punto 7): e' il
 *                   righello che misuraRighe() legge riga per riga per
 *                   scrivere --pen-h su ogni .pen-n e l'altezza della
 *                   textarea. I colori li spegne il CSS, non il JS.
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
 * =====================================================================
 * SINCRONIZZA FRA DISPOSITIVI (spec 17 §3) — markup che scrive il builder
 * =====================================================================
 *   #pen-sync       la sezione dentro #pen-settings; dentro:
 *                   #pen-sync-state  .tb-status con aria-live (in corso,
 *                                    fatto, offline, codice non valido...)
 *                   quattro sotto-viste [data-sync-view="off|create|have|on"]:
 *                   penna.js mostra quella giusta e mette [hidden] alle altre.
 *      off:   #pen-sync-create "Crea un codice", #pen-sync-have "Ho gia' un codice"
 *      create: #pen-sync-code il riquadro grande e selezionabile con le sei
 *              parole (lo riempie il JS), #pen-sync-copy, #pen-sync-activate
 *      have:  #pen-sync-input <input> del codice, #pen-sync-link "Collega"
 *      on:    #pen-sync-last "Ultima sincronizzazione: {ora}" (testo dal JS),
 *             #pen-sync-now, #pen-sync-show, #pen-sync-unlink, #pen-sync-wipe
 *             e la conferma #pen-sync-wipe-confirm con -yes / -no.
 *   Ogni .pen-sync-cancel (in create e have) riporta a "off" e butta via il
 *   codice generato ma mai attivato. #pen-sync-show e' un INTERRUTTORE: porta
 *   aria-expanded e rivela #pen-sync-code-on + #pen-sync-copy-on dentro "on",
 *   cosi' non si vedono mai due sotto-viste insieme.
 *   La rete sta tutta in penna/sync.js e non parte mai da sola (spec 17 §2).
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
 *   penna-new, penna-syllables, penna-sinalefe, penna-untitled,
 *   penna-verses, penna-list-title, penna-gone, penna-imported,
 *   penna-import-fail, penna-copy-manual, piu' le comuni
 *   (search, copy, share, delete, cancel, close).
 *
 * Tutto il resto (documenti in IndexedDB, salvataggio automatico, colori,
 * condivisione, preferenze) sta qui sotto.
 */

import commonDict from '/shared/i18n-common.js';
import toolDict from '/penna/i18n.js';
import { init, t, lang, onChange } from '/shared/i18n.js';
import { pressFeedback, setStatus, toast } from '/shared/ui.js';
import { mountBar } from '/shared/nav.js';
import { initPwa } from '/shared/pwa.js';
import { mountSelects } from '/shared/select.js';
import { mountInfos, openSheet, closeSheet } from '/shared/sheet.js';
import { prefs, get, put, list, del } from '/shared/storage.js';
import { filtra, fondi, riassunto, idDaHash, hashDiId } from '/penna/elenco.js';
import { condividi as condividiFileTesto, esporta, leggiFileScelto, leggiQuaderno, stampa } from '/penna/file.js';
import {
    avvia as avviaSync, stato as statoSync, onStato as onStatoSync, creaCodice, collega,
    scollega, sincronizza, segnaEliminato
} from '/penna/sync.js';
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
const SYNC_DOPO = 3000;      // ms di quiete dopo l'ultimo salvataggio (spec 17 §3)
const MISURA_DOPO = 100;     // ms di quiete del ResizeObserver (spec 16 §4)
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
    const bodyBox = root.querySelector('.pen-body');
    const wrapBox = root.querySelector('.pen-text-wrap');
    const countMode = el('pen-count-mode');
    const monoTgl = el('pen-mono');
    const colorsTgl = el('pen-colors');
    const statusOut = el('pen-status');
    const newBtn = el('pen-new');
    /* --- vista elenco (spec 16 §3) --- */
    const listBox = el('pen-list');
    const gridBox = el('pen-list-grid');
    const cardTpl = el('pen-card-tpl');
    const searchIn = el('pen-search');
    const sortSel = el('pen-sort');
    const emptyBox = el('pen-list-empty');
    const emptyNewBtn = el('pen-list-empty-new');
    const noneBox = el('pen-list-none');
    const backBtn = el('pen-back');
    /* --- foglio impostazioni e quaderno (spec 16 §3) --- */
    const settingsSheet = el('pen-settings');
    const settingsBtns = [...document.querySelectorAll('.pen-settings-open')];
    const exportBtn = el('pen-export');
    const importBtn = el('pen-import');
    const importIn = el('pen-import-input');
    const printBtn = el('pen-print');
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
    /* --- sincronizza fra dispositivi (spec 17 §3): il markup lo scrive il
           builder, qui si aggancia quel che c'e' e non si fallisce mai per
           un id che manca --- */
    const syncBox = el('pen-sync');
    const syncState = el('pen-sync-state');
    const syncCreateBtn = el('pen-sync-create');
    const syncHaveBtn = el('pen-sync-have');
    const syncCodeBox = el('pen-sync-code');
    const syncCodeOn = el('pen-sync-code-on');
    const syncCopyBtn = el('pen-sync-copy');
    const syncCopyOn = el('pen-sync-copy-on');
    const syncActivateBtn = el('pen-sync-activate');
    const syncCancelBtns = [...document.querySelectorAll('.pen-sync-cancel')];
    const syncInput = el('pen-sync-input');
    const syncLinkBtn = el('pen-sync-link');
    const syncNowBtn = el('pen-sync-now');
    const syncShowBtn = el('pen-sync-show');
    const syncUnlinkBtn = el('pen-sync-unlink');
    const syncWipeBtn = el('pen-sync-wipe');
    const syncWipeBox = el('pen-sync-wipe-confirm');
    const syncWipeYes = el('pen-sync-wipe-yes');
    const syncWipeNo = el('pen-sync-wipe-no');
    const syncLastOut = el('pen-sync-last');

    const ui = {
        vista: 'elenco',
        /* i record dell'elenco in memoria (elenco.js: riassunto()) */
        record: [],
        ordine: prefs.get(TOOL, 'ordine', 'mod') === 'titolo' ? 'titolo' : 'mod',
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

    /* ---------------- vista e router dell'hash (spec 16 §3) ---------------- */

    let hashApplicato = null;  // l'hash gia' servito: popstate+hashchange arrivano in coppia
    let focusTitolo = false;   // un testo appena creato apre col fuoco sul titolo
    let primaVista = true;
    /* Come si sta navigando: col puntatore il fuoco e' gia' dove serve, da
       tastiera o con l'Indietro del browser va riportato a mano. */
    let daTastiera = false;
    let daStoria = false;

    function setVista(vista) {
        const nuova = vista === 'editor' ? 'editor' : 'elenco';
        const cambia = ui.vista !== nuova;
        ui.vista = nuova;
        root.setAttribute('data-pen-vista', nuova);
        if (cambia || primaVista) annunciaVista();
        primaVista = false;
    }

    /* Regione di cortesia per lo schermo letto: l'elenco non ha una .tb-status
       e #pen-status vive dentro l'editor (nascosto in vista elenco). Mai il
       fuoco sul titolo: disegnerebbe un riquadro a tutta larghezza. */
    let vocePagina = null;
    function annuncia(testo) {
        if (!vocePagina) {
            vocePagina = document.createElement('p');
            vocePagina.className = 'sr-only';
            vocePagina.setAttribute('aria-live', 'polite');
            vocePagina.setAttribute('aria-atomic', 'true');
            document.body.appendChild(vocePagina);
        }
        vocePagina.textContent = testo;
    }

    /** Il cambio vista si sente anche con lo schermo letto (spec 16 §6.11). */
    function annunciaVista() {
        if (ui.vista === 'editor') {
            if (!statusOut) return;
            statusOut.removeAttribute('data-i18n');
            statusOut.setAttribute('aria-live', 'polite');
            statusOut.textContent = (ui.doc && ui.doc.titolo) || t('penna-untitled');
            return;
        }
        if (primaVista) return;
        annuncia(t('penna-list-title'));
        /* Il fuoco si sposta solo quando non c'e' un puntatore che l'ha gia'
           portato dove serve: da tastiera o dall'Indietro del browser. */
        if (!daTastiera && !daStoria) return;
        const primo = [searchIn, newBtn].find((e) => e && e.offsetParent !== null);
        if (primo) { try { primo.focus({ preventScroll: true }); } catch (e) { /* niente fuoco */ } }
    }

    /** Il testo aperto va salvato prima di lasciare la vista (spec 16 §3). */
    async function salvaPrimaDiUscire() {
        if (!salvaTimer) return;
        clearTimeout(salvaTimer);
        salvaTimer = null;
        await salvaOra();
    }

    /** Porta a un testo (id) o all'elenco (null), scrivendo l'hash. */
    function vai(id, { sostituisci = false } = {}) {
        const url = location.pathname + location.search + (id ? hashDiId(id) : '');
        try {
            if (sostituisci) history.replaceState(null, '', url);
            else history.pushState(null, '', url);
        } catch (e) {
            location.hash = id ? hashDiId(id) : '';
            return;                      // l'hashchange fara' il resto
        }
        applicaHash();
    }

    /**
     * L'hash e' l'unica fonte della vista: qui si esegue. Un id sconosciuto
     * torna all'elenco con un toast (spec 16 §3).
     */
    async function applicaHash() {
        const hash = location.hash || '';
        if (hash === hashApplicato) return;
        hashApplicato = hash;
        const id = idDaHash(hash);
        await salvaPrimaDiUscire();
        if (!id) { mostraElenco(); return; }
        if (ui.id === id && ui.doc) { setVista('editor'); dopoEditor(); return; }
        let doc = null;
        try { doc = await get(TOOL, id); } catch (e) { doc = null; }
        if (!doc) {
            toast('penna-gone');
            vai(null, { sostituisci: true });
            return;
        }
        apri(id, doc);
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
        /* i .pen-n sono nuovi: hanno perso --pen-h, si rimisura */
        pianificaMisura();
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

    /**
     * Il mirror sotto la textarea. Si disegna SEMPRE, anche a colori spenti
     * (spec 16 §4 punto 7): e' il righello di misuraRighe(); i colori li
     * toglie il CSS con #penna:not(.is-colori).
     */
    function renderColori() {
        if (!linesBox || !textIn) return;
        linesBox.textContent = '';
        linesBox.setAttribute('aria-hidden', 'true');
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
        pianificaMisura();
    }

    /* ---------------- misura delle righe (spec 16 §4) ---------------- */

    let misuraRaf = null;
    let misuraTimer = null;
    let osservatore = null;

    /** Una sola misura per giro, dopo che il mirror e' in pagina. */
    function pianificaMisura() {
        if (misuraRaf !== null) return;
        if (typeof requestAnimationFrame !== 'function') { misuraRighe(); return; }
        misuraRaf = requestAnimationFrame(() => { misuraRaf = null; misuraRighe(); });
    }

    /**
     * Allinea la colonna dei numeri alla textarea: legge l'altezza vera di
     * ogni verso sul mirror #pen-lines (i versi vanno a capo, spec 16 §4
     * punto 6), poi scrive --pen-h su ogni .pen-n e l'altezza della
     * textarea. Tutte le letture prima, tutte le scritture dopo: un solo
     * reflow per giro.
     */
    function misuraRighe() {
        if (!linesBox || !textIn || !gutter) return;
        if (ui.vista !== 'editor') return;      // in elenco l'editor e' display:none
        const versi = linesBox.children;
        const numeri = gutter.children;
        const n = Math.min(versi.length, numeri.length);
        if (!n) return;
        /* --- letture ---
           getBoundingClientRect, non offsetHeight: l'interlinea vera e'
           frazionaria (1.6 × 0.95rem = 24,32 px) e offsetHeight arrotonda a
           intero. Su 55 versi quei 0,32 px persi per riga diventavano 20 px
           di sfasamento in fondo alla pagina. */
        const alte = new Array(n);
        for (let i = 0; i < n; i++) alte[i] = versi[i].getBoundingClientRect().height;
        const totale = linesBox.getBoundingClientRect().height;
        const minimo = bodyBox ? bodyBox.clientHeight : 0;
        if (!totale) return;                    // non ancora in pagina
        /* --- scritture --- */
        for (let i = 0; i < n; i++) {
            /* .pen-gutter e' una colonna flex: senza flex-shrink:0 i numeri
               si comprimerebbero quando il testo supera il riquadro */
            numeri[i].style.setProperty('--pen-h', alte[i].toFixed(3) + 'px');
            numeri[i].style.flexShrink = '0';
        }
        textIn.style.height = Math.max(totale, minimo) + 'px';
    }

    /** ResizeObserver sulla colonna di scrittura, con quiete di 100 ms. */
    function osservaLarghezza() {
        if (osservatore || typeof ResizeObserver !== 'function' || !wrapBox) return;
        osservatore = new ResizeObserver(() => {
            if (misuraTimer) clearTimeout(misuraTimer);
            misuraTimer = setTimeout(() => { misuraTimer = null; pianificaMisura(); }, MISURA_DOPO);
        });
        osservatore.observe(wrapBox);
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
            aggiornaRecord(ui.id, ui.doc);
            /* 3 s di quiete dopo l'ultimo salvataggio, mai mentre si scrive
               (spec 17 §3); senza sincronizzazione attiva non fa niente */
            pianificaGiro();
        } catch (e) {
            setStatus(statusOut, { kind: 'error', key: 'penna-save-fail' });
        }
    }

    function salvaPresto() {
        if (salvaTimer) clearTimeout(salvaTimer);
        salvaTimer = setTimeout(() => { salvaTimer = null; salvaOra(); }, SALVA_DOPO);
    }

    /** Apre un testo nell'editor (ci arriva solo il router dell'hash). */
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
        /* setVista annuncia il titolo in aria-live (spec 16 §6.11); la riga
           diventa "Salvato" al primo salvataggio, non prima. */
        setVista('editor');
        renderGutter();
        renderColori();
        prefs.set(TOOL, 'ultimo', id);
        dopoEditor();
    }

    /** Quello che va fatto ogni volta che l'editor torna a video. */
    function dopoEditor() {
        osservaLarghezza();
        pianificaMisura();
        const box = el('pen-delete-confirm');
        if (box) box.hidden = true;
        if (focusTitolo && titleIn) {
            focusTitolo = false;
            try { titleIn.focus({ preventScroll: true }); } catch (e) { titleIn.focus(); }
        }
    }

    /** Nuovo testo: nasce salvato, poi lo apre l'hash. */
    async function nuovo() {
        const id = nuovoId();
        const doc = documentoVuoto('', ui.lingua);
        try { await put(TOOL, id, doc); } catch (e) { /* si apre lo stesso, si risalva dopo */ }
        aggiornaRecord(id, doc);
        focusTitolo = true;
        vai(id);
    }

    /* ---------------- elenco (spec 16 §3) ---------------- */

    /** Rilegge tutto il quaderno da IndexedDB e ridisegna l'elenco. */
    async function caricaElenco() {
        let tutti = [];
        try { tutti = await list(TOOL); } catch (e) { tutti = []; }
        ui.record = tutti.map((rec) => riassunto(rec.id, rec.value || {}));
        renderElenco();
    }

    /** Aggiorna (o inserisce) un record senza rileggere tutto il quaderno. */
    function aggiornaRecord(id, doc) {
        const nuovoRec = riassunto(id, doc);
        const i = ui.record.findIndex((r) => r.id === String(id));
        if (i >= 0) ui.record[i] = nuovoRec;
        else ui.record.push(nuovoRec);
        if (ui.vista === 'elenco') renderElenco();
    }

    function togliRecord(id) {
        ui.record = ui.record.filter((r) => r.id !== String(id));
        if (ui.vista === 'elenco') renderElenco();
    }

    function dataBreve(iso) {
        const data = new Date(iso || Date.now());
        if (Number.isNaN(data.getTime())) return '';
        const stessoAnno = data.getFullYear() === new Date().getFullYear();
        const opzioni = stessoAnno
            ? { day: 'numeric', month: 'short' }
            : { day: 'numeric', month: 'short', year: 'numeric' };
        try { return new Intl.DateTimeFormat(lang(), opzioni).format(data); } catch (e) { return ''; }
    }

    /**
     * Una card clonata da <template id="pen-card-tpl"> (spec 16 §4):
     * <article> con dentro il bottone che apre, il cestino e la conferma
     * inline. Il cestino porta aria-expanded sulla conferma.
     */
    function cardDi(rec) {
        if (!cardTpl || !cardTpl.content) return null;
        const nodo = cardTpl.content.firstElementChild.cloneNode(true);
        const scrivi = (sel, testo) => {
            const e = nodo.querySelector(sel);
            if (e) e.textContent = testo;
        };
        const titolo = rec.titolo.trim() || t('penna-untitled');
        nodo.setAttribute('data-id', rec.id);
        scrivi('.pen-card-title', titolo);
        scrivi('.pen-card-verse', rec.prima);
        scrivi('.pen-card-lang', String(rec.lingua || 'it').toUpperCase());
        scrivi('.pen-card-date', dataBreve(rec.modificato));
        scrivi('.pen-card-verses', rec.versi === 1 ? t('penna-verse-one') : t('penna-verses', { n: rec.versi }));

        const apriBtn = nodo.querySelector('.pen-card-open');
        if (apriBtn) apriBtn.addEventListener('click', () => vai(rec.id));

        const cestino = nodo.querySelector('.pen-card-del');
        const conferma = nodo.querySelector('.pen-card-confirm');
        if (cestino && conferma) {
            if (!conferma.id) conferma.id = 'pen-card-confirm-' + (++contaConferme);
            cestino.setAttribute('aria-controls', conferma.id);
            cestino.setAttribute('aria-expanded', 'false');
            cestino.addEventListener('click', () => {
                if (cardAperta === nodo) { chiudiConferme(); return; }
                chiudiConferme();
                cardAperta = nodo;
                conferma.hidden = false;
                cestino.setAttribute('aria-expanded', 'true');
                const si = conferma.querySelector('.pen-card-yes');
                if (si) { try { si.focus({ preventScroll: true }); } catch (e) { /* niente fuoco */ } }
            });
            const no = conferma.querySelector('.pen-card-no');
            if (no) no.addEventListener('click', () => { chiudiConferme(); try { cestino.focus({ preventScroll: true }); } catch (e) { /* niente fuoco */ } });
            const si = conferma.querySelector('.pen-card-yes');
            if (si) si.addEventListener('click', () => elimina(rec.id));
        }
        return nodo;
    }

    /** Una conferma per volta (spec 16 §3): la aprono le card, la chiude Esc. */
    let cardAperta = null;
    let contaConferme = 0;
    function chiudiConferme() {
        if (!gridBox) return;
        gridBox.querySelectorAll('.pen-card-confirm').forEach((c) => { c.hidden = true; });
        gridBox.querySelectorAll('.pen-card-del').forEach((b) => b.setAttribute('aria-expanded', 'false'));
        cardAperta = null;
    }

    function renderElenco() {
        if (!gridBox) return;
        const mostrati = filtra(ui.record, searchIn ? searchIn.value : '', ui.ordine);
        gridBox.textContent = '';
        cardAperta = null;            // le card sono nuove: nessuna conferma aperta
        mostrati.forEach((rec) => {
            const card = cardDi(rec);
            if (card) gridBox.appendChild(card);
        });
        const quadernoVuoto = ui.record.length === 0;
        if (emptyBox) emptyBox.hidden = !quadernoVuoto;
        if (noneBox) noneBox.hidden = quadernoVuoto || mostrati.length > 0;
        gridBox.hidden = quadernoVuoto;
    }

    function mostraElenco() {
        setVista('elenco');
        caricaElenco();
        /* l'elenco e' l'ingresso: e' il momento buono per un giro (spec 17 §3) */
        giroSync();
    }

    /* ---------------- elimina ---------------- */

    let daEliminare = null;
    function chiediElimina(id) {
        daEliminare = id;
        const box = el('pen-delete-confirm');
        if (!box) { elimina(id); return; }
        box.hidden = false;
        const si = el('pen-delete-yes');
        if (si) { try { si.focus({ preventScroll: true }); } catch (e) { /* niente fuoco */ } }
    }
    async function elimina(id) {
        /* la lapide va scritta PRIMA: il `sid` vive dentro il documento
           (spec 17 §4). Senza sincronizzazione attiva non c'e' `sid` e non
           succede niente. */
        await segnaEliminato(id, ui.id === id ? ui.doc : null);
        try { await del(TOOL, id); } catch (e) { /* niente da fare */ }
        const box = el('pen-delete-confirm');
        if (box) box.hidden = true;
        daEliminare = null;
        togliRecord(id);
        toast('penna-deleted');
        if (ui.id === id) {
            ui.id = null;
            ui.doc = null;
            if (salvaTimer) { clearTimeout(salvaTimer); salvaTimer = null; }
            prefs.set(TOOL, 'ultimo', undefined);
            vai(null);
        }
    }

    /* ---------------- sincronizza fra dispositivi (spec 17) ---------------- */

    /*
     * Tutta la rete sta in penna/sync.js: qui ci sono solo i bottoni, gli
     * stati in aria-live e i tre momenti in cui parte un giro — all'apertura
     * dell'elenco, 3 s dopo l'ultimo salvataggio, a mano. Finche' l'utente
     * non tocca Attiva o Collega non parte NESSUNA richiesta (spec 17 §2):
     * `statoSync().attivo` e' falso e ogni funzione qui sotto esce subito.
     *
     * La vista giusta fra `[data-sync-view="off|create|have|on"]` la sceglie
     * renderSync(); l'unica eccezione e' "Mostra il codice" da collegato, che
     * lascia visibile anche la sotto-vista dove vive #pen-sync-code.
     */
    let syncVista = 'off';        // off | create | have (da scollegato)
    let codiceNuovo = '';         // le sei parole appena sorteggiate
    let codiceVisibile = false;   // l'interruttore "Mostra il codice"
    let giroTimer = null;

    function oraBreve(ms) {
        if (!ms) return '';
        try { return new Intl.DateTimeFormat(lang(), { hour: '2-digit', minute: '2-digit' }).format(new Date(ms)); } catch (e) { return ''; }
    }

    function statoSyncUI(kind, key) {
        if (syncState) setStatus(syncState, { kind, key });
    }

    /* #pen-sync-state e' una regione aria-live: quando non c'e' niente da
       annunciare deve restare VUOTA, non ospitare l'introduzione (che sta
       nella .pen-sync-intro della vista "off"). */
    function pulisciStatoSync() {
        if (!syncState) return;
        setStatus(syncState, { kind: 'idle' });
        syncState.removeAttribute('data-i18n');
        syncState.textContent = '';
    }

    function renderSync() {
        if (!syncBox) return;
        const s = statoSync();
        const vista = s.attivo ? 'on' : syncVista;
        /* una sola sotto-vista per volta, sempre */
        syncBox.querySelectorAll('[data-sync-view]').forEach((v) => {
            v.hidden = v.getAttribute('data-sync-view') !== vista;
        });
        if (syncCodeBox) syncCodeBox.textContent = codiceNuovo;
        /* da collegato il codice sta nel suo riquadro dentro "on", rivelato
           dall'interruttore #pen-sync-show: niente due viste insieme */
        const mostra = s.attivo && codiceVisibile;
        if (syncCodeOn) {
            syncCodeOn.textContent = mostra ? s.codice : '';
            syncCodeOn.hidden = !mostra;
        }
        if (syncCopyOn) syncCopyOn.hidden = !mostra;
        if (syncShowBtn) syncShowBtn.setAttribute('aria-expanded', mostra ? 'true' : 'false');
        if (syncLastOut) syncLastOut.textContent = s.ultima ? t('sync-last', { ora: oraBreve(s.ultima) }) : '';
        if (syncWipeBox && !s.attivo) syncWipeBox.hidden = true;
        if (syncNowBtn) syncNowBtn.disabled = !!s.inCorso;
    }

    function vistaSync(quale) {
        syncVista = quale;
        codiceVisibile = false;
        renderSync();
    }

    /** Un giro solo per volta; senza rete si dice e basta, non si insiste. */
    async function giroSync({ manuale = false } = {}) {
        const s = statoSync();
        if (!s.attivo || s.inCorso) return null;
        if (navigator.onLine === false) {
            if (manuale) statoSyncUI('denied', 'sync-off');
            return null;
        }
        statoSyncUI('busy', 'sync-doing');
        let esito;
        try {
            esito = await sincronizza();
        } catch (e) {
            esito = { esito: 'server' };
        }
        const chiavi = {
            ok: ['ok', 'sync-done'],
            offline: ['denied', 'sync-off'],
            server: ['error', 'sync-fail'],
            pieno: ['error', 'sync-full'],
            grande: ['error', 'sync-too-big']
        };
        const [kind, chiave] = chiavi[esito.esito] || chiavi.server;
        statoSyncUI(kind, chiave);
        renderSync();
        /* oltre i 20 documenti per giro il resto va al giro dopo */
        if (esito.esito === 'ok' && esito.restano > 0) pianificaGiro();
        return esito;
    }

    function pianificaGiro() {
        if (!statoSync().attivo) return;
        if (giroTimer) clearTimeout(giroTimer);
        giroTimer = setTimeout(() => { giroTimer = null; giroSync(); }, SYNC_DOPO);
    }

    /** Un testo arrivato (o cambiato) dal server: e' gia' in IndexedDB. */
    function suDocumento(id, doc) {
        aggiornaRecord(id, doc);
        if (ui.id !== id || !ui.doc) return;
        if (doc.sid && ui.doc.sid !== doc.sid) ui.doc.sid = doc.sid;
        const piuNuovo = Date.parse(doc.modificato || '') > Date.parse(ui.doc.modificato || '');
        /* mai mentre si scrive: se c'e' un salvataggio in coda si lascia stare */
        if (!piuNuovo || salvaTimer) return;
        if (ui.vista === 'editor') apri(id, doc);
        else ui.doc = { ...ui.doc, ...doc };
    }

    /** Un testo eliminato altrove: e' gia' sparito da IndexedDB. */
    function suRimosso(id) {
        togliRecord(id);
        if (ui.id !== id) return;
        ui.id = null;
        ui.doc = null;
        if (salvaTimer) { clearTimeout(salvaTimer); salvaTimer = null; }
        prefs.set(TOOL, 'ultimo', undefined);
        toast('penna-gone');
        vai(null, { sostituisci: true });
    }

    async function attivaCodice(codice) {
        try {
            await collega(codice);
        } catch (e) {
            statoSyncUI('error', 'sync-bad-code');
            return false;
        }
        codiceNuovo = '';
        codiceVisibile = false;
        syncVista = 'off';
        renderSync();
        giroSync({ manuale: true });
        return true;
    }

    if (syncCreateBtn) {
        syncCreateBtn.addEventListener('click', async () => {
            try {
                codiceNuovo = await creaCodice();
            } catch (e) {
                statoSyncUI('error', 'sync-fail');
                return;
            }
            vistaSync('create');
        });
    }
    if (syncHaveBtn) {
        syncHaveBtn.addEventListener('click', () => {
            vistaSync('have');
            if (syncInput) { try { syncInput.focus({ preventScroll: true }); } catch (e) { /* niente fuoco */ } }
        });
    }
    async function copiaCodice(testo) {
        if (!testo) return;
        try {
            await navigator.clipboard.writeText(testo);
            statoSyncUI('ok', 'sync-copied');
        } catch (e) {
            /* senza permesso resta il riquadro, che e' selezionabile a mano */
            statoSyncUI('idle', 'sync-copy');
        }
    }
    if (syncCopyBtn) syncCopyBtn.addEventListener('click', () => copiaCodice(codiceNuovo));
    if (syncCopyOn) syncCopyOn.addEventListener('click', () => copiaCodice(statoSync().codice));
    /* "Annulla" da create/have: si torna alla scelta e il codice generato ma
       mai attivato si butta via (spec 17 §3, nessuno stato a meta') */
    syncCancelBtns.forEach((b) => b.addEventListener('click', () => {
        codiceNuovo = '';
        if (syncInput) syncInput.value = '';
        pulisciStatoSync();
        vistaSync('off');
    }));
    if (syncActivateBtn) syncActivateBtn.addEventListener('click', () => { if (codiceNuovo) attivaCodice(codiceNuovo); });
    if (syncLinkBtn) syncLinkBtn.addEventListener('click', () => attivaCodice(syncInput ? syncInput.value : ''));
    if (syncInput) {
        syncInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); attivaCodice(syncInput.value); }
        });
    }
    if (syncNowBtn) syncNowBtn.addEventListener('click', () => giroSync({ manuale: true }));
    if (syncShowBtn) {
        syncShowBtn.addEventListener('click', () => {
            codiceVisibile = !codiceVisibile;
            renderSync();
        });
    }
    if (syncUnlinkBtn) {
        syncUnlinkBtn.addEventListener('click', async () => {
            try { await scollega({ elimina: false }); } catch (e) { statoSyncUI('error', 'sync-fail'); return; }
            codiceNuovo = '';
            syncVista = 'off';
            pulisciStatoSync();
            renderSync();
        });
    }
    if (syncWipeBtn && syncWipeBox) {
        syncWipeBtn.addEventListener('click', () => {
            syncWipeBox.hidden = false;
            if (syncWipeYes) { try { syncWipeYes.focus({ preventScroll: true }); } catch (e) { /* niente fuoco */ } }
        });
    }
    if (syncWipeNo && syncWipeBox) syncWipeNo.addEventListener('click', () => { syncWipeBox.hidden = true; });
    if (syncWipeYes) {
        syncWipeYes.addEventListener('click', async () => {
            statoSyncUI('busy', 'sync-doing');
            try {
                await scollega({ elimina: true });
            } catch (e) {
                statoSyncUI(navigator.onLine === false ? 'denied' : 'error', navigator.onLine === false ? 'sync-off' : 'sync-fail');
                return;
            }
            if (syncWipeBox) syncWipeBox.hidden = true;
            codiceNuovo = '';
            syncVista = 'off';
            statoSyncUI('ok', 'sync-done');
            renderSync();
        });
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
        /* il foglio puo' aver ospitato il ripiego del download: titolo a posto */
        const cap = el('pen-sheet-title');
        if (cap) { cap.setAttribute('data-i18n', 'penna-sinalefe'); cap.textContent = t('penna-sinalefe'); }
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
        /* shared/sheet.js: scrim, trappola del fuoco, X ed Esc come altrove */
        if (sheet) openSheet(sheet);
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

    /* ---------------- condivisione, file, stampa (spec 16 §3) ---------------- */

    /**
     * Ripiego del download (standalone su iOS, dove <a download> non apre
     * niente): il foglio delle sinalefi presta la sua struttura — e' l'unico
     * tb-sheet libero in pagina — e mostra il testo, gia' selezionato e
     * copiato negli appunti. Niente pulsante "Copia" perche' il dizionario
     * di Penna non ha una chiave per quell'etichetta (vedi report): il
     * riscontro lo da' il toast penna-copied / penna-copy-manual.
     */
    function apriFoglioTesto({ titolo, testo }) {
        if (!sheet || !sheetList) { copia(testo); return; }
        const cap = el('pen-sheet-title');
        if (cap) { cap.removeAttribute('data-i18n'); cap.textContent = titolo || ''; }
        sheetList.textContent = '';
        sheetList.removeAttribute('data-pen-line');
        const area = document.createElement('textarea');
        area.className = 'pen-fallback-text';
        area.readOnly = true;
        area.rows = 8;
        area.style.width = '100%';
        area.value = testo || '';
        sheetList.appendChild(area);
        openSheet(sheet);
        try { area.select(); } catch (e) { /* selezione a mano */ }
        copia(testo);
    }

    async function copia(testo) {
        if (!testo) return;
        try { await navigator.clipboard.writeText(testo); toast('penna-copied'); }
        catch (e) { toast('penna-copy-manual'); }
    }

    /** Condividi il testo aperto come .txt (spec 16 §3, ripieghi in file.js). */
    async function condividi() {
        const testo = (textIn ? textIn.value : '') || (ui.doc && ui.doc.testo) || '';
        const titolo = (titleIn && titleIn.value.trim()) || t('penna-untitled');
        if (!testo.trim()) return;
        const esito = await condividiFileTesto({ titolo, testo, ripiego: apriFoglioTesto });
        if (esito === 'copiato') toast('penna-copied');
        else if (esito === 'niente') toast('penna-copy-manual');
    }

    /** Tutto il quaderno in un .json (spec 16 §3). */
    async function esportaTutto() {
        let tutti = [];
        try { tutti = await list(TOOL); } catch (e) { tutti = []; }
        const testi = tutti.map((rec) => ({ id: rec.id, ...documentoVuoto(), ...(rec.value || {}) }));
        const esito = await esporta(testi, { ripiego: apriFoglioTesto });
        if (esito === 'niente') toast('penna-import-fail');
    }

    /**
     * Importa un quaderno: unione per id (elenco.js), poi in IndexedDB.
     * Un file non riconosciuto non tocca niente (spec 16 §6.7).
     * `toast` traduce la chiave che riceve: qui il messaggio ha {n} e {m},
     * quindi si passa gia' tradotto (t() di una stringa non-chiave la
     * restituisce com'e').
     */
    async function importa(file) {
        const grezzo = await leggiFileScelto(file);
        const testi = grezzo === null ? null : leggiQuaderno(grezzo);
        if (!testi) { toast('penna-import-fail'); return null; }
        let tutti = [];
        try { tutti = await list(TOOL); } catch (e) { tutti = []; }
        const locali = tutti.map((rec) => ({ id: rec.id, ...(rec.value || {}) }));
        const esito = fondi(locali, testi);
        for (const rec of esito.daScrivere) {
            const { id, ...doc } = rec;
            try { await put(TOOL, id, doc); } catch (e) { /* un record in meno, gli altri passano */ }
        }
        await caricaElenco();
        /* il testo aperto puo' essere stato sovrascritto: si rilegge */
        if (ui.id && esito.daScrivere.some((r) => r.id === ui.id)) {
            try {
                const doc = await get(TOOL, ui.id);
                if (doc && ui.vista === 'editor') apri(ui.id, doc);
            } catch (e) { /* si tiene quello in memoria */ }
        }
        toast(t('penna-imported', { n: esito.nuovi, m: esito.aggiornati }));
        return esito;
    }

    /**
     * Stampa: la textarea ha un'altezza in pixel scritta da misuraRighe()
     * per lo schermo, ma in stampa font e interlinea cambiano (penna.css
     * @media print). Si passa alle righe e si rimette tutto dopo.
     */
    function stampaTesto() {
        let altezza = '';
        let righe = 0;
        stampa({
            prima: () => {
                if (!textIn) return;
                altezza = textIn.style.height;
                righe = textIn.rows;
                const versi = String(textIn.value || '').split('\n').length;
                /* i versi andati a capo a video contano come righe in piu':
                   in stampa la colonna e' piu' larga, quindi ne bastano meno */
                const passo = linesBox ? parseFloat(getComputedStyle(linesBox).lineHeight) || 0 : 0;
                const visive = linesBox && passo
                    ? [...linesBox.children].reduce((n, e) => n + Math.max(1, Math.round(e.offsetHeight / passo)), 0)
                    : versi;
                textIn.style.height = 'auto';
                textIn.rows = Math.max(versi, visive, 1);
            },
            dopo: () => {
                if (!textIn) return;
                textIn.rows = righe || 1;
                textIn.style.height = altezza;
                pianificaMisura();
            }
        });
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
    if (emptyNewBtn) emptyNewBtn.addEventListener('click', nuovo);
    if (shareBtn) shareBtn.addEventListener('click', condividi);
    if (deleteBtn) deleteBtn.addEventListener('click', () => { if (ui.id) chiediElimina(ui.id); });
    const yes = el('pen-delete-yes');
    const no = el('pen-delete-no');
    if (yes) yes.addEventListener('click', () => { if (daEliminare) elimina(daEliminare); });
    if (no) no.addEventListener('click', () => { const b = el('pen-delete-confirm'); if (b) b.hidden = true; daEliminare = null; });

    /* --- elenco: indietro, ricerca, ordine (spec 16 §3) --- */
    if (backBtn) backBtn.addEventListener('click', () => vai(null));
    if (gridBox) {
        gridBox.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape' && e.key !== 'Esc') return;
            if (!cardAperta) return;
            const cestino = cardAperta.querySelector('.pen-card-del');
            chiudiConferme();
            if (cestino) { try { cestino.focus({ preventScroll: true }); } catch (x) { /* niente fuoco */ } }
        });
    }
    if (searchIn) searchIn.addEventListener('input', renderElenco);
    if (sortSel) {
        sortSel.addEventListener('change', () => {
            ui.ordine = sortSel.value === 'titolo' ? 'titolo' : 'mod';
            prefs.set(TOOL, 'ordine', ui.ordine);
            renderElenco();
        });
    }

    /* --- foglio impostazioni e quaderno (spec 16 §3) --- */
    settingsBtns.forEach((b) => {
        b.addEventListener('click', () => {
            if (settingsSheet && !settingsSheet.hidden) { closeSheet(); return; }
            /* la sezione sync riparte sempre dalla scelta (spec 17 §3): "Crea
               un codice" e "Ho gia' un codice" vivono solo li' dentro, e da
               "create" non ci sarebbe altro modo di tornare indietro */
            syncVista = 'off';
            codiceNuovo = '';
            codiceVisibile = false;
            renderSync();
            if (settingsSheet) openSheet(settingsSheet, { anchor: b });
        });
    });
    if (exportBtn) exportBtn.addEventListener('click', esportaTutto);
    if (importBtn && importIn) importBtn.addEventListener('click', () => importIn.click());
    if (importIn) {
        importIn.addEventListener('change', async () => {
            const file = importIn.files && importIn.files[0];
            importIn.value = '';          // lo stesso file si puo' riprovare
            if (file) await importa(file);
        });
    }
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            closeSheet();
            /* in stampa resta solo .pen-write: senza un testo aperto non ci
               sarebbe niente da stampare (vedi report, Dubbi) */
            if (ui.vista !== 'editor' || !ui.doc) { toast('penna-gone'); return; }
            stampaTesto();
        });
    }

    /* --- l'hash e' la vista: si ascoltano tutti e due gli eventi, la
           traversata ne manda una coppia e applicaHash() serve un hash solo
           una volta (spec 16 §3) --- */
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') daTastiera = true;
    }, true);
    document.addEventListener('pointerdown', () => { daTastiera = false; }, true);
    const daHistory = () => { daStoria = true; applicaHash().finally(() => { daStoria = false; }); };
    window.addEventListener('hashchange', daHistory);
    window.addEventListener('popstate', daHistory);

    /**
     * apply() di shared/i18n.js traduce data-i18n, -aria e -html, non
     * data-i18n-placeholder (che il markup usa qui e nel pianificatore):
     * finche' e' cosi' i segnaposto li traduce lo strumento.
     */
    function applicaSegnaposto() {
        document.querySelectorAll('[data-i18n-placeholder]').forEach((e) => {
            e.setAttribute('placeholder', t(e.getAttribute('data-i18n-placeholder')));
        });
    }

    /* le card le scrive il JS (t('penna-verses'), data breve, "Senza
       titolo"): apply() del cambio lingua non le vede, si rifanno qui */
    onChange(() => { renderElenco(); applicaSegnaposto(); renderSync(); });
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
    applicaSegnaposto();
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
    /* l'ordine salvato passa dal <select> nativo: mountSelect e' gia' in
       ascolto e allinea la pillola da solo (shared/select.js) */
    if (sortSel && sortSel.value !== ui.ordine) {
        sortSel.value = ui.ordine;
        sortSel.dispatchEvent(new Event('change', { bubbles: true }));
    }
    /* Sincronizzazione: si legge solo che cosa c'e' salvato. Nessuna rete
       finche' l'utente non tocca Attiva o Collega (spec 17 §2); il giro
       dell'apertura parte da mostraElenco(), quando c'e' un codice. */
    onStatoSync(renderSync);
    renderSync();
    avviaSync({ applicaDoc: suDocumento, rimuoviDoc: suRimosso, apertoId: () => ui.id })
        .then(() => { renderSync(); if (ui.vista === 'elenco') giroSync(); })
        .catch(() => { /* senza IndexedDB la sincronizzazione resta spenta */ });
    /* La vista la decide l'hash, sempre: /penna/ e' l'elenco, anche se
       l'ultima volta si stava scrivendo (spec 16 §6.2). */
    applicaHash();
    /* l'indice si scarica solo quando serve: l'editor funziona offline */
    if (prefs.get(TOOL, 'rimario', false) && navigator.onLine !== false) scarica();

    return {
        ui,
        apri,
        nuovo,
        salvaOra,
        caricaElenco,
        renderElenco,
        misuraRighe,
        vai,
        esportaTutto,
        importa,
        stampaTesto,
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
        pronto: () => pronto,
        /* sincronizzazione (spec 17): per i collaudi in browser headless */
        giroSync,
        renderSync,
        statoSync
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
