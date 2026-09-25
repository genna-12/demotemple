/**
 * Tiny Temple Toolbox - DNA della traccia (spec 13).
 *
 * File o microfono -> decodifica -> Worker -> BPM, tonalita', loudness.
 * Niente rete, niente upload: il file non lascia il dispositivo.
 *
 * =====================================================================
 * CONTRATTO CON IL MARKUP (spec 13 §5; dove la spec tace, vale questo)
 * =====================================================================
 *   #dna            <main> con data-dna-state="empty|recording|working|result|none"
 *                   ("error" non si usa piu': l'errore resta nello stato
 *                   "empty" e si vede in #dna-error, spec 18 §7.7)
 *   #dna-drop       zona di rilascio (vuoto); dentro:
 *                     <input type="file" id="dna-file" accept="audio/*" class="sr-only">
 *                     <label for="dna-file" class="tb-btn tb-btn--primary">Scegli file</label>
 *                     <button id="dna-record" class="tb-btn">Registra</button>
 *   #dna-consent    contenitore per mic.renderConsent (vuoto)
 *   #dna-countdown  numero grande dei secondi di registrazione
 *   #dna-level      <div> con --dna-level in % (barra di livello, la scrive il JS)
 *   #dna-stop       TOLTO: non c'e' piu' un "ferma e analizza" a mano
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
 *   #dna-none       stato "nessun risultato" (vedi sotto)
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
 *
 * FLUSSO DELL'ASCOLTO (feedback Genna, sostituisce quello di prima):
 *   1. "Registra" (#dna-record) porta SOLO nella schermata del logo: niente
 *      microfono, niente permesso, niente riquadro del consenso. Il logo e'
 *      fermo e l'etichetta dice dna-press.
 *   2. Il tocco SUL LOGO chiede il consenso se serve (#dna-consent) e, dato
 *      il permesso, avvia cattura e animazione.
 *   3. Il tocco successivo SUL LOGO annulla: ferma le tracce, torna alla
 *      schermata del logo fermo e NON analizza nulla.
 *   4. #dna-listen-cancel ("Annulla", sotto il logo) esce dallo strumento di
 *      ascolto e torna allo stato vuoto. Va bene anche
 *      [data-dna-listen-cancel] su un altro elemento.
 *   5. NON esiste piu' "ferma e analizza" a mano: #dna-stop va TOLTO dal
 *      markup (se resta, dna.js lo tiene nascosto).
 *   La fine e' solo automatica:
 *   - appena due analisi di fila concordano (stesso BPM a meno di 2 e
 *     stessa tonalita', con confidenza BPM >= 0,35 e margine
 *     della tonalita' >= 0,10, e almeno 8 battiti sentiti) si mostra il
 *     risultato, di solito fra i 12 e i 16 s;
 *   - a 25 s senza convergenza NON si mostra nessun valore: stato
 *     "nessun risultato" (sotto);
 *   - se il segnale e' sotto le soglie di silenzio, stesso stato con il
 *     testo "Nessun suono rilevato".
 *
 * STATO "NESSUN RISULTATO" (nuovo, data-dna-state="none") — markup:
 *   <div id="dna-none" class="dna-none" hidden>
 *     <p id="dna-none-text" class="dna-none-text" data-i18n="dna-none-unsure">
 *       Nessun risultato affidabile</p>
 *     <p class="dna-none-hint" data-i18n="dna-none-hint">Avvicina il telefono
 *       alla cassa, alza il volume e riprova.</p>
 *     <button type="button" id="dna-retry" class="tb-btn tb-btn--primary"
 *             data-i18n="dna-retry">Riprova</button></div>
 *   dna.js scrive in #dna-none-text la chiave giusta (dna-none-unsure oppure
 *   dna-none-silent) e #dna-retry riporta alla schermata del logo fermo.
 * RISULTATO DAL MICROFONO:
 *   <p id="dna-mic-note" class="dna-mic-note" hidden data-i18n="dna-mic-note">...</p>
 *   <p id="dna-uncertain" class="dna-uncertain" hidden data-i18n="dna-uncertain">...</p>
 *   e una "i" (.tb-info + .tb-sheet #dna-mic-info) con la spiegazione lunga.
 *   I tre elementi stanno dentro .dna-mic-disclaimer: per un risultato da
 *   FILE il disclaimer non c'entra nulla, quindi dna.js nasconde tutto il
 *   contenitore (la "i" compresa). Serve la regola gemella di quella gia'
 *   in dna.css: `.dna-mic-disclaimer[hidden] { display: none }` (il
 *   contenitore e' display:flex, [hidden] da solo non basta).
 *   Il testo della "i" sul microfono (dna-mic-info-text) va riscritto:
 *   "BPM e tonalita' possono essere sbagliati, anche di molto: dal
 *   microfono l'analisi e' una stima".
 * NIENTE SEGNALE:
 *   sotto -60 dBFS di RMS o -50 LUFS il Worker torna { silent: true }: da
 *   file e' l'errore `dna-silent`, in ascolto e' lo stato "nessun risultato"
 *   con il testo dna-none-silent. Mai un BPM inventato.
 * LOUDNESS E PIATTAFORMA:
 *   <span id="dna-target-label" class="dna-target-label"></span> accanto al
 *   select: dna.js ci scrive "Target Spotify: -14 LUFS"; sulla barra
 *   #dna-lufs-bar scrive `--dna-lufs` (posizione del valore) e
 *   `--dna-target` (posizione del marcatore), entrambe in percentuale.
 *   La "i" che spiega LUFS/picco reale/normalizzazione e' SOLO markup:
 *   <button class="tb-info" aria-haspopup="dialog" aria-expanded="false"
 *           aria-controls="dna-lufs-info" data-i18n-aria="info-aria">…</button>
 *   piu' il foglio <div class="tb-sheet" id="dna-lufs-info" role="dialog"
 *   aria-modal="true" aria-labelledby="dna-lufs-info-title" hidden>…</div>
 *   fuori da .tb-shell, come #dna-mic-info. dna.js chiama gia'
 *   mountInfos(document) su TUTTE le .tb-info: non serve altro codice.
 *
 * STORICO RINOMINABILE (feedback Genna):
 *   le righe le costruisce dna.js, al builder servono solo le classi
 *   .dna-history-rename (matita, .tb-btn--icon) e .dna-history-input
 *   (campo inline). Tocco sul nome o sulla matita -> campo di testo;
 *   Invio o uscita dal campo salvano in IndexedDB, Esc annulla.
 *   Le registrazioni nascono con il nome "Registrazione 18 set 21:34"
 *   (chiave dna-rec-name, "Registrazione {when}"). Le voci vecchie che non
 *   hanno tutti i campi vengono normalizzate in lettura: niente riga rotta
 *   e niente eccezioni.
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
 *   Nuove (testi provvisori gia' in dna/i18n.js, da rivedere): dna-none-unsure,
 *   dna-none-silent, dna-rec-name ("Registrazione {when}"), dna-rename.
 *   Solo markup, da aggiungere: dna-none-hint, dna-retry, dna-lufs-info-title,
 *   dna-lufs-info-text.
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
 *
 * =====================================================================
 * SPEC 20 (DNA «completo») - quel che questo file si aspetta in piu'
 * =====================================================================
 *   Router: `#r=<id>` = risultato di una voce, senza hash = vuoto; la pref
 *   locale `tt.dna.ultimo` e' l'id dell'hash (riapre dopo la chiusura).
 *   #dna-history-wrap   fuori da #dna-drop, dopo #dna-result: dna.js lo
 *                       mostra in "empty" e "result", lo nasconde negli altri
 *   #dna-search         campo di ricerca (con >= 6 voci; se sta in un
 *                       contenitore .dna-search-wrap si nasconde quello)
 *   #dna-filter         barra del filtro; il testo va in #dna-filter-label
 *                       (o nel primo .dna-filter-label/<span> dentro)
 *   #dna-filter-clear   «×» che toglie il filtro
 *   #dna-export         «Esporta .csv» nella testa dello storico
 *   #dna-share          «Condividi», visibile solo con navigator.share
 *   #dna-fold-hint      riga sotto il segment ÷2/×2, nascosta con lui
 *   #dna-lufs-hint      .tb-hint del glossario, «×» #dna-lufs-hint-close
 *   #dna-compare        .tb-sheet del confronto, con <table id="dna-compare-table">
 *                       (la riempie dna.js: thead + tbody)
 *   #dna-key-compat     contenitore dei chip button.dna-compat-chip
 *                       [data-dna-camelot][aria-pressed] (li crea dna.js)
 *   Righe dello storico: la voce aperta ha .is-open e aria-current; le
 *   icone hanno data-tip; .dna-history-compare (⇄) solo nel risultato e
 *   mai sulla voce aperta. Stato vuoto del filtro/ricerca:
 *   li.dna-history-none come lo storico vuoto.
 *   Confronto, testata: th > span.dna-compare-role + span.dna-compare-name.
 */

import commonDict from '/shared/i18n-common.js';
import toolDict from '/dna/i18n.js';
import { init, t, lang, onChange as onLingua } from '/shared/i18n.js';
import { pressFeedback, setStatus, toast } from '/shared/ui.js';
import { mountBar } from '/shared/nav.js';
import { initPwa } from '/shared/pwa.js';
import { mountAiuto } from '/shared/aiuto.js';
import { mountSelects } from '/shared/select.js';
import { mountInfos, openSheet, closeSheet } from '/shared/sheet.js';
import { mountRanges } from '/shared/range.js';
import { getContext, unlock, decode, needsGesture, addWorklet } from '/shared/audio.js';
import * as mic from '/shared/mic.js';
import { prefs, leggi, scrivi, elenca, elimina, onChange as onArchivio } from '/shared/archivio.js';
import { avviaPagina as avviaSync } from '/shared/sync.js';
import { fold } from '/shared/analysis/bpm.js';
import { compatibleWith } from '/shared/analysis/key.js';
import { gainToTarget, TARGETS } from '/shared/analysis/loudness.js';
import { readTags, coverBlob } from '/shared/tags.js';
import { idDaHash, hashDiId, filtra, confronto, csv, nomeCsv, testoVoce, nomeMostrato, durata } from '/dna/storico.js';

const TOOL = 'dna';

/* Lo storico sta nell'archivio (spec 18 §3), collezione `dna`, id = istante
   dell'analisi. Stesse forme di storage.js di prima: `list` -> [{ id, value }],
   `del` lascia la lapide che servira' alla sincronizzazione. */
const get = (coll, id) => leggi(coll, id);
const put = (coll, id, value) => scrivi(coll, id, value);
const list = (coll) => elenca(coll).then((rs) => rs.map((r) => ({ id: r.id, value: r.dati })));
const del = (coll, id) => elimina(coll, id);
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
/* Soglie misurate sul banco "da microfono" (stanza, cassa del telefono,
   rumore rosa, riverbero, clipping) con le confidenze nuove:
   - BPM: 0,45-0,70 quando e' giusto, 0,04-0,10 senza ritmo. A 0,35 passano
     anche i 174 BPM da telefono e non passa il rumore.
   - Tonalita': e' il margine fra la prima e la seconda ipotesi (0,12-0,33
     quando e' giusta). Restare a 0,10 e' quello che tiene fuori i casi
     sbagliati, che sul banco non superano mai 0,097.
   Le etichette moltiplicano la confidenza della tonalita' per 3. */
const BPM_SURE = 0.35;
const KEY_SURE = 0.1;
const BPM_SAME = 2;      // BPM uguale a meno di 2 fra due analisi di fila
const MIN_BEATS = 8;     // battiti da aver sentito prima di fidarsi
const RING_MS = 900;          // quanto vive un anello
const PULSE_EASE = 0.25;      // quanto insegue il livello (0-1)
const ONSET_GAP = 180;        // ms minimi fra due anelli
const HISTORY = 200;   // solo metadati: 200 voci pesano pochi KB
const SEARCH_MIN = 6;  // la ricerca compare da 6 voci in su (spec 20 §3)
const RESULT_MAX = 5;  // sotto un risultato lo storico si accorcia (revisione ui-ux)

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
    const errorBox = document.getElementById('dna-error');
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
    const noneText = document.getElementById('dna-none-text');
    const retryBtn = document.getElementById('dna-retry');
    const targetLabel = document.getElementById('dna-target-label');
    const coverImg = document.getElementById('dna-cover');
    /* spec 20: storico anche nel risultato, filtro, ricerca, confronto, esporta */
    const historyWrap = document.getElementById('dna-history-wrap')
        || (historyBox && historyBox.closest('.dna-history-wrap'));
    const searchIn = document.getElementById('dna-search');
    const searchBox = searchIn ? (searchIn.closest('.dna-search-wrap') || searchIn) : null;
    const filterBar = document.getElementById('dna-filter');
    const filterLabel = document.getElementById('dna-filter-label')
        || (filterBar && filterBar.querySelector('.dna-filter-label, span'));
    const filterClear = document.getElementById('dna-filter-clear');
    const exportBtn = document.getElementById('dna-export');
    const shareBtn = document.getElementById('dna-share');
    const foldHint = document.getElementById('dna-fold-hint');
    const lufsHint = document.getElementById('dna-lufs-hint');
    const lufsHintClose = document.getElementById('dna-lufs-hint-close');
    const lufsInfoBtn = document.querySelector('.tb-info[aria-controls="dna-lufs-info"]');
    const compareSheet = document.getElementById('dna-compare');
    const compareTable = document.getElementById('dna-compare-table');
    const compatBox = document.getElementById('dna-key-compat');

    const out = (id) => document.getElementById(id);

    const ui = {
        state: 'empty',
        target: TARGETS[prefs.get(TOOL, 'target', 'spotify')] ? prefs.get(TOOL, 'target', 'spotify') : 'spotify',
        source: 'file',
        result: null,
        name: '',
        openId: null,      // id della voce mostrata (null: vuoto o risultato non salvato)
        voci: [],          // lo storico normalizzato, dalla voce piu' recente
        filtro: null,      // Camelot del chip acceso (in memoria, non persiste)
        q: '',             // ricerca per nome
        confronto: null,   // voce scelta nel foglio del confronto
        tutte: false       // «Mostra tutte» toccato: vale per la sessione
    };
    let hashApplicato = null;   // l'hash gia' servito: popstate+hashchange arrivano in coppia

    let worker = null;
    let cancelled = false;
    let starting = false;       // guardia del tasto "Registra" (si azzera SEMPRE)
    let listening = null;       // ascolto in corso (stile Shazam)
    let session = 0;            // numero della richiesta di ascolto in corso
    let coverUrl = null;        // object URL della copertina mostrata

    /* ---------------- stati ---------------- */

    function setState(state) {
        ui.state = state;
        root.setAttribute('data-dna-state', state);
        ['empty', 'recording', 'working', 'result', 'none', 'error'].forEach((name) => {
            const el = document.getElementById('dna-' + (name === 'empty' ? 'drop' : name === 'working' ? 'progress' : name));
            if (el && el.id !== 'dna-status') el.hidden = name !== state;
        });
        /* «Recenti» si vede nel vuoto e sotto il risultato (spec 20 §3) */
        if (historyWrap && historyWrap !== document.getElementById('dna-drop')) {
            historyWrap.hidden = !(state === 'empty' || state === 'result');
        }
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

    /**
     * Un errore NON svuota la pagina (spec 18 §7.7, audit §2.2): si resta
     * nello stato "vuoto" - zona di rilascio, «Scegli file», «Registra» e
     * «Recenti» dove sono - e il messaggio compare SOPRA, in #dna-error,
     * che al primo errore si sposta in cima a #dna. Cosi' chi ha sbagliato
     * file legge cos'e' successo e riprova senza ricaricare.
     */
    /**
     * Uscita da un'analisi o da un ascolto senza risultato (errore, annulla,
     * nessun risultato): l'hash cambiato nel frattempo (ignorato, vedi
     * applicaHash) non deve restare `#r=...` sopra una vista che non e'
     * quella voce. Si toglie con un replace, come `ultimo`.
     */
    function pulisciHash() {
        ui.openId = null;
        if (idDaHash(location.hash)) {
            try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* resta */ }
        }
        hashApplicato = location.hash || '';
        prefs.set(TOOL, 'ultimo', undefined);
    }

    function fail(key) {
        setState('empty');
        pulisciHash();
        if (statusOut) statusOut.textContent = ''; // il messaggio sta sopra, non due volte
        if (!errorBox) { setStatus(statusOut, { kind: 'error', key }); return; }
        if (errorBox.parentElement === root && errorBox !== root.firstElementChild) {
            root.insertBefore(errorBox, root.firstElementChild);
        }
        errorBox.setAttribute('role', 'status');
        errorBox.setAttribute('aria-live', 'polite');
        errorBox.hidden = false;
        setStatus(errorBox, { kind: 'error', key });
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
        mostraNuovo(result, { cover: tags && tags.cover });   // salva i metadati, non la copertina
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
        ui.filtro = null;   // il filtro e' della voce di prima: si riparte da tutto
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
        const piega = !(result.bpmAlternatives && result.bpmAlternatives.length);
        if (foldBox) foldBox.hidden = piega;
        aggiornaFoldHint();   // la spiegazione va e viene col segment
        set('dna-key', result.tonic ? result.tonic + ' ' + t(result.mode === 'minor' ? 'dna-minor' : 'dna-major') : '—');
        set('dna-camelot', result.camelot || '');
        renderChips(result.camelot);
        mostraGlossario();
        const keyConf = out('dna-key-conf');
        if (keyConf) {
            keyConf.setAttribute('data-i18n', confidenceKey(result.keyConfidence * 3, unsure));
            keyConf.textContent = t(confidenceKey(result.keyConfidence * 3, unsure));
        }
        set('dna-lufs', isFinite(result.lufs) ? fmt(result.lufs, 1) + ' LUFS' : '—');
        set('dna-tp', isFinite(result.truePeak) ? fmt(result.truePeak, 1) + ' dBTP' : '—');
        set('dna-lra', result.lra === null || result.lra === undefined ? '' : fmt(result.lra, 1) + ' LU');
        set('dna-duration', durata(result.seconds));   // 59,6 s = 1:00, non 0:60
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

    /**
     * Il testo di Copia e Condividi (spec 20 §3): nome, BPM e tonalita',
     * loudness, durata e fonte. Sostituisce il riepilogo su una riga, che
     * non diceva ne' la durata ne' la fonte.
     */
    function summary() {
        return ui.result ? testoVoce(ui.result, { lingua: lang(), t }) : '';
    }

    /**
     * «Il BPM sembra sbagliato?» si vede col segment ÷2/×2, ma non insieme
     * alla riga del primo avvio (#tb-hint, shared/aiuto.js): due righe di
     * aiuto una sopra l'altra sono troppe (revisione ui-ux). Chiusa quella,
     * compare questa (MutationObserver sotto).
     */
    function aggiornaFoldHint() {
        if (!foldHint) return;
        const primoAvvio = document.getElementById('tb-hint');
        const occupato = !!(primoAvvio && !primoAvvio.hidden);
        foldHint.hidden = !foldBox || foldBox.hidden || occupato;
    }

    /** Glossario LUFS (spec 20 §3): una riga, finche' non e' stata vista. */
    function mostraGlossario() {
        if (lufsHint) lufsHint.hidden = !!prefs.get(TOOL, 'glossario-visto', false);
    }

    function glossarioVisto() {
        prefs.set(TOOL, 'glossario-visto', true);   // locale: portabile() non la porta
        if (lufsHint) lufsHint.hidden = true;
    }

    /* ---------------- compatibili: chip e filtro ---------------- */

    /** Il Camelot della voce, poi i compatibili: ogni codice e' un chip. */
    function renderChips(camelot) {
        if (!compatBox) return;
        compatBox.textContent = '';
        if (!camelot) return;
        [camelot, ...compatibleWith(camelot)].forEach((k, i) => {
            const b = document.createElement('button');
            b.type = 'button';
            /* il primo e' la tonalita' della voce stessa: stile a parte */
            b.className = 'dna-compat-chip' + (i === 0 ? ' is-self' : '');
            b.setAttribute('data-dna-camelot', k);
            b.setAttribute('aria-pressed', 'false');
            b.setAttribute('aria-label', t('dna-filter-label', { camelot: k }));
            b.textContent = k;
            compatBox.appendChild(b);
        });
        aggiornaFiltro();
    }

    /** Chip acceso, barra «Brani in 9A» e la sua «×». */
    function aggiornaFiltro() {
        if (filterBar) filterBar.hidden = !ui.filtro;
        if (filterLabel && ui.filtro) filterLabel.textContent = t('dna-filter-label', { camelot: ui.filtro });
        if (!compatBox) return;
        compatBox.querySelectorAll('.dna-compat-chip').forEach((c) => {
            const on = !!ui.filtro && c.getAttribute('data-dna-camelot') === ui.filtro;
            c.classList.toggle('is-active', on);
            c.setAttribute('aria-pressed', on ? 'true' : 'false');
            c.setAttribute('aria-label', t('dna-filter-label', { camelot: c.getAttribute('data-dna-camelot') }));
        });
    }

    /** Stesso chip = togli; un altro = filtra per quello. Lo storico viene in vista. */
    function scegliFiltro(camelot) {
        ui.filtro = camelot && camelot !== ui.filtro ? camelot : null;
        disegnaStorico();
        if (ui.filtro && historyWrap && typeof historyWrap.scrollIntoView === 'function') {
            let calmo = false;
            try { calmo = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { calmo = false; }
            try { historyWrap.scrollIntoView({ block: 'start', behavior: calmo ? 'auto' : 'smooth' }); } catch (e) { /* vecchio Safari */ }
        }
    }

    /* ---------------- confronto ---------------- */

    /* zero alla precisione mostrata: niente segno (ne' "+0,0" ne' "-0,0") */
    const nullo = (v, cifre) => Math.abs(v) < 0.5 * Math.pow(10, -cifre);
    const segnato = (v, cifre) => (nullo(v, cifre) ? fmt(0, cifre) : (v > 0 ? '+' : '') + fmt(v, cifre));
    const DASH = '\u2014';

    /** La tabella aperta · scelta · Δ (spec 20 §3). */
    function disegnaConfronto(a, b) {
        if (!compareTable) return;
        compareTable.textContent = '';
        const cell = (tag, text, cls) => {
            const c = document.createElement(tag);
            if (cls) c.className = cls;
            c.textContent = text;
            return c;
        };
        const thead = document.createElement('thead');
        const head = document.createElement('tr');
        const corner = document.createElement('td');
        head.appendChild(corner);
        [['dna-compare-current', a], ['dna-compare-other', b]].forEach(([key, r]) => {
            const th = document.createElement('th');
            th.scope = 'col';
            th.append(cell('span', t(key), 'dna-compare-role'), cell('span', nomeMostrato(r), 'dna-compare-name'));
            head.appendChild(th);
        });
        const delta = cell('th', '\u0394');
        delta.scope = 'col';
        head.appendChild(delta);
        thead.appendChild(head);

        const n1 = (v) => fmt(v, 1);
        const intero = (v) => Math.abs(v - Math.round(v)) < 0.05;
        const valori = {
            bpm: { label: 'BPM', unita: true, cifre: 1, v: (v) => fmt(v, 0), d: (d) => segnato(d, intero(d) ? 0 : 1) },
            camelot: { label: 'Camelot', cifre: 0, v: (v) => v, d: null },
            lufs: { label: 'LUFS', unita: true, cifre: 1, v: n1, d: (d) => segnato(d, 1) + ' LU' },
            tp: { label: 'dBTP', unita: true, cifre: 1, v: n1, d: (d) => segnato(d, 1) + ' dB' },
            lra: { label: 'LRA', unita: true, cifre: 1, v: (v) => n1(v) + ' LU', d: (d) => segnato(d, 1) + ' LU' },
            durata: { label: t('dna-duration-label'), cifre: 0, v: (v) => durata(v),
                d: (d) => (Math.round(d) > 0 ? '+' : '') + durata(d) }
        };
        const tbody = document.createElement('tbody');
        confronto(a, b).forEach((riga) => {
            const f = valori[riga.chiave];
            if (!f) return;
            const tr = document.createElement('tr');
            tr.setAttribute('data-dna-row', riga.chiave);
            /* le unita' (dBTP, LUFS...) si scrivono come sono: niente maiuscolo del CSS */
            const th = cell('th', f.label, f.unita ? 'dna-compare-unit' : '');
            th.scope = 'row';
            tr.appendChild(th);
            tr.appendChild(cell('td', riga.a === null ? DASH : f.v(riga.a)));
            tr.appendChild(cell('td', riga.b === null ? DASH : f.v(riga.b)));
            let d = DASH;
            if (riga.chiave === 'camelot') {
                const parti = [];
                if (riga.delta !== null) {
                    const uno = Math.abs(riga.delta) === 1;
                    parti.push(uno ? t('dna-compare-semitone', { n: segnato(riga.delta, 0) })
                        : t('dna-compare-semitones', { n: segnato(riga.delta, 0) }));
                }
                if (riga.a && riga.b) parti.push(t(riga.compatibile ? 'dna-compare-compatible' : 'dna-compare-incompatible'));
                /* a capo, non « · »: la cella e' white-space: pre-line (dna.css) */
                if (parti.length) d = parti.join('\n');
            } else if (riga.delta !== null) {
                d = f.d(riga.delta);
            }
            /* Δ nullo: non si evidenzia (niente accento su "0") */
            const zero = riga.delta !== null && nullo(riga.delta, f.cifre);
            tr.appendChild(cell('td', d, 'dna-compare-delta' + (zero ? ' is-zero' : '')));
            tbody.appendChild(tr);
        });
        compareTable.append(thead, tbody);
    }

    function apriConfronto(r, anchor) {
        if (!compareSheet || !ui.result) return;
        ui.confronto = r;
        disegnaConfronto(ui.result, r);
        openSheet(compareSheet, { anchor });
    }

    /** Il foglio si chiude a ogni cambio di hash (spec 20 §3). */
    function chiudiConfronto() {
        ui.confronto = null;
        if (compareSheet && !compareSheet.hidden) closeSheet({ restoreFocus: false });
    }

    /* ---------------- storico ---------------- */

    /** Nello storico va SOLO questo: numeri e testo, mai audio ne' copertine. */
    function historyRecord(result) {
        return {
            at: result.at,
            name: result.name,
            renamed: !!result.renamed,
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
            /* senza le alternative il ÷2/×2 spariva riaprendo la voce (spec 20 §3) */
            bpmAlternatives: (Array.isArray(result.bpmAlternatives) ? result.bpmAlternatives : [])
                .filter((v) => typeof v === 'number' && isFinite(v)).slice(0, 4),
            tonic: result.tonic,
            mode: result.mode,
            camelot: result.camelot,
            keyConfidence: result.keyConfidence,
            lufs: result.lufs,
            truePeak: result.truePeak,
            lra: result.lra,
            uncertain: !!result.uncertain
        };
    }

    /** -> true se la voce e' nell'archivio. */
    async function saveHistory(result) {
        try {
            await put(TOOL, result.at, historyRecord(result));
            const all = await list(TOOL);
            const extra = all.slice(0, Math.max(0, all.length - HISTORY));
            /* taglio automatico oltre HISTORY: una lapide normale, cosi'
               la voce sparisce anche sugli altri dispositivi invece di
               tornare dal server al giro dopo (spec 18 §3-4) */
            await Promise.all(extra.map((rec) => elimina(TOOL, rec.id)));
            await renderHistory();
            return true;
        } catch (e) {
            /* archivio pieno o record troppo grande: lo si dice (spec 18 §3);
               IndexedDB non disponibile: si vive senza storico */
            if (e && (e.codice === 'limite' || e.codice === 'grande')) toast('store-limit');
            return false;
        }
    }

    /**
     * Un risultato appena analizzato (file o microfono): si mostra, si salva
     * e, se il salvataggio riesce, prende il suo `#r=<id>` con un push e lo
     * si dice (spec 20 §3). Salvataggio fallito: risultato senza hash.
     */
    async function mostraNuovo(result, { cover = null } = {}) {
        ui.openId = null;
        showResult(result, { cover });
        const bpmSalvato = result.bpm;   // historyRecord() lo legge adesso, prima del put
        const ok = await saveHistory(result);
        const id = String(result.at);
        /* un ÷2/×2 toccato mentre il primo salvataggio era in corso: il
           record ha ancora il BPM di prima, si riscrive (validator, spec 20) */
        if (ok && result.bpm !== bpmSalvato) salvaPiega(result, id);
        /* nel frattempo si e' andati altrove: niente hash, niente toast */
        if (!ok || ui.result !== result || ui.state !== 'result') return;
        ui.openId = id;
        const hash = hashDiId(id);
        try {
            history.pushState(null, '', location.pathname + location.search + hash);
            hashApplicato = location.hash || hash;
        } catch (e) { /* senza history si resta senza hash */ }
        prefs.set(TOOL, 'ultimo', id);
        toast('dna-saved');
        disegnaStorico();
    }

    async function removeHistory(id) {
        try {
            await del(TOOL, id);
        } catch (e) { return; }
        /* la voce aperta eliminata da qui: si torna al vuoto, senza toast
           (chi elimina sa gia' che non c'e' piu') */
        if (ui.openId !== null && String(id) === ui.openId) {
            prefs.set(TOOL, 'ultimo', undefined);
            vai(null, { sostituisci: true });
        }
        renderHistory();
    }

    async function clearHistory() {
        try {
            const all = await list(TOOL);
            await Promise.all(all.map((rec) => del(TOOL, rec.id)));
        } catch (e) { /* niente da fare */ }
        if (clearConfirm) clearConfirm.hidden = true;
        if (ui.openId !== null) {
            prefs.set(TOOL, 'ultimo', undefined);
            vai(null, { sostituisci: true });
        }
        renderHistory();
    }

    /**
     * Le voci salvate mesi fa possono non avere tutti i campi di oggi: si
     * leggono lo stesso, con i valori di riserva. Nessuna riga rotta,
     * nessuna eccezione durante il rendering.
     */
    function migrate(rec, id) {
        const r = (rec && rec.value) || rec || {};
        const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
        return {
            at: r.at || id || '',
            name: typeof r.name === 'string' ? r.name : '',
            renamed: !!r.renamed,
            source: r.source === 'mic' ? 'mic' : 'file',
            title: r.title || '', artist: r.artist || '', album: r.album || '', year: r.year || '',
            seconds: num(r.seconds, 0),
            sampleRate: num(r.sampleRate, 0),
            channels: num(r.channels, 1),
            bpm: num(r.bpm, 0),
            bpmConfidence: num(r.bpmConfidence, 0),
            bpmAlternatives: Array.isArray(r.bpmAlternatives) ? r.bpmAlternatives : [],
            tonic: r.tonic || '', mode: r.mode === 'minor' ? 'minor' : 'major', camelot: r.camelot || '',
            keyConfidence: num(r.keyConfidence, 0),
            lufs: num(r.lufs, NaN),
            truePeak: num(r.truePeak, NaN),
            lra: r.lra === null || r.lra === undefined ? null : num(r.lra, null),
            uncertain: !!r.uncertain
        };
    }

    /** Il nome scelto a mano vince sui tag del file. */
    function historyName(r) {
        return nomeMostrato(r);   // la stessa regola della ricerca e del CSV (storico.js)
    }

    /** Numeri della riga, senza il nome (che sta nel suo <span>). */
    function historyMeta(r) {
        const parts = [r.bpm ? fmt(r.bpm, 0) + ' BPM' : '', r.camelot,
            isFinite(r.lufs) ? fmt(r.lufs, 1) + ' LUFS' : ''].filter(Boolean);
        return parts.join(' · ');
    }

    /** Rinomina in linea: Invio o uscita dal campo salvano, Esc annulla. */
    async function renameHistory(id, name) {
        const value = String(name || '').trim().slice(0, 120);
        if (!value) return;
        try {
            const prev = migrate(await get(TOOL, id), id);
            await put(TOOL, id, { ...prev, name: value, renamed: true });
        } catch (e) {
            if (e && (e.codice === 'limite' || e.codice === 'grande')) toast('store-limit');
            /* IndexedDB non disponibile: il nome resta quello */
        }
        await renderHistory();
    }

    function startRename(li, btn, id, current) {
        if (li.querySelector('.dna-history-input')) return;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'dna-history-input';
        input.value = current;
        input.setAttribute('aria-label', t('dna-rename'));
        let done = false;
        const close = (save) => {
            if (done) return;
            done = true;
            const value = input.value;
            input.replaceWith(btn);
            if (save) renameHistory(id, value);
        };
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); close(true); }
            else if (e.key === 'Escape') { e.preventDefault(); close(false); }
        });
        input.addEventListener('blur', () => close(true));
        btn.replaceWith(input);
        input.focus();
        input.select();
    }

    /** Tutte le voci vive, normalizzate e con il loro `id`, dalla piu' recente. */
    async function tutteLeVoci() {
        const all = await list(TOOL);
        return all.slice().reverse().map((rec) => {
            const id = rec.id || (rec.value && rec.value.at) || '';
            return { ...migrate(rec, id), id: String(id) };
        });
    }

    async function renderHistory() {
        if (!historyBox) return;
        try { ui.voci = (await tutteLeVoci()).slice(0, HISTORY); } catch (e) { return; }
        disegnaStorico();
    }

    /** Una riga senza voci: storico vuoto, filtro o ricerca senza risultati. */
    function rigaVuota(key, vars) {
        const vuoto = document.createElement('li');
        vuoto.className = 'dna-history-none';
        /* con le variabili il testo lo riscrive disegnaStorico() al cambio lingua */
        if (!vars) vuoto.setAttribute('data-i18n', key);
        vuoto.textContent = t(key, vars);
        historyBox.appendChild(vuoto);
    }

    /** Ridisegna l'elenco dalla copia in memoria (`ui.voci`): filtro, ricerca, voce aperta. */
    function disegnaStorico() {
        if (!historyBox) return;
        const voci = ui.voci;
        historyBox.textContent = '';
        mostraAltre(0);   // lo rimette solo l'elenco accorciato qui sotto
        if (clearBtn) clearBtn.hidden = voci.length === 0;
        if (exportBtn) exportBtn.hidden = voci.length === 0;
        if (clearConfirm && !voci.length) clearConfirm.hidden = true;
        /* la ricerca serve da SEARCH_MIN voci in su; sotto sparisce e si azzera */
        const conRicerca = voci.length >= SEARCH_MIN;
        if (searchBox) searchBox.hidden = !conRicerca;
        if (!conRicerca && ui.q) {
            ui.q = '';
            if (searchIn) searchIn.value = '';
        }
        aggiornaFiltro();
        if (!voci.length) {
            /* la riga che il markup si aspetta da sempre (CONTRATTO in
               index.html): senza, «Recenti» e' un elenco alto zero e chi
               apre lo strumento non capisce se manca qualcosa */
            rigaVuota('dna-history-empty');
            return;
        }
        const aperta = ui.state === 'result' ? ui.openId : null;
        /* filtrando per tonalita' la voce aperta resta fuori: si cercano le ALTRE */
        let mostrate = filtra(voci, { camelot: ui.filtro, q: ui.q, esclusa: ui.filtro ? aperta : null });
        if (!mostrate.length) {
            if (ui.filtro) rigaVuota('dna-filter-empty', { camelot: ui.filtro });
            else rigaVuota('dna-search-empty');
            return;
        }
        /* sotto un risultato bastano le ultime RESULT_MAX (la voce aperta
           sempre dentro) e «Mostra tutte»; nel vuoto, filtrando o cercando
           si vede tutto */
        if (ui.state === 'result' && !ui.filtro && !ui.q && !ui.tutte && mostrate.length > RESULT_MAX) {
            const prime = mostrate.slice(0, RESULT_MAX);
            const lei = aperta === null ? null : mostrate.find((r) => r.id === aperta);
            if (lei && !prime.includes(lei)) prime[RESULT_MAX - 1] = lei;
            mostraAltre(voci.length);
            mostrate = prime;
        }
        mostrate.forEach((r) => historyBox.appendChild(rigaStorico(r, aperta)));
    }

    /** «Mostra tutte» (n = voci totali) sotto l'elenco accorciato; 0 = via. */
    let altreBtn = null;
    function mostraAltre(n) {
        if (!n) { if (altreBtn) altreBtn.hidden = true; return; }
        if (!altreBtn) {
            altreBtn = document.createElement('button');
            altreBtn.type = 'button';
            altreBtn.id = 'dna-history-more';
            altreBtn.className = 'tb-btn tb-btn--ghost dna-history-more';
            altreBtn.addEventListener('click', () => {
                ui.tutte = true;
                disegnaStorico();
            });
        }
        if (!altreBtn.isConnected) historyBox.after(altreBtn);
        altreBtn.textContent = t('dna-history-more', { n });
        altreBtn.hidden = false;
    }

    /** Pulsante icona della riga, con il suo tip (tocco lungo, hover, fuoco). */
    function icona(cls, key, glyph, onClick) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = cls + ' tb-btn--icon';
        b.setAttribute('data-i18n-aria', key);
        b.setAttribute('aria-label', t(key));
        b.setAttribute('data-tip', key);
        b.textContent = glyph;
        b.addEventListener('click', (e) => { e.stopPropagation(); onClick(b); });
        return b;
    }

    function rigaStorico(r, aperta) {
        const id = r.id;
        const li = document.createElement('li');
        li.className = 'dna-history-row';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'dna-history-item';
        btn.setAttribute('data-dna-id', id);
        const nameEl = document.createElement('span');
        nameEl.className = 'dna-history-name';
        nameEl.textContent = historyName(r);
        const metaEl = document.createElement('span');
        metaEl.className = 'dna-history-meta';
        metaEl.textContent = historyMeta(r);
        btn.append(nameEl, metaEl);
        const suAperta = aperta !== null && id === aperta;
        if (suAperta) {
            li.classList.add('is-open');
            btn.setAttribute('aria-current', 'true');
        }
        /* riapre il risultato salvato (push di #r=<id>): nessuna nuova analisi */
        btn.addEventListener('click', () => { if (!suAperta) vai(id); });
        /* il tocco sul nome rinomina, non riapre (feedback Genna) */
        nameEl.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            startRename(li, btn, id, historyName(r));
        });
        const pen = icona('dna-history-rename', 'dna-rename', '✎', () => startRename(li, btn, id, historyName(r)));
        pen.setAttribute('data-dna-rename', id);
        const rm = icona('dna-history-del', 'dna-del-one', '×', () => removeHistory(id));
        rm.setAttribute('data-dna-del', id);
        li.append(btn, pen);
        /* «Confronta» solo sotto un risultato salvato, e mai con se stessa */
        if (ui.state === 'result' && ui.openId !== null && !suAperta) {
            const cmp = icona('dna-history-compare', 'dna-compare-tip', '⇄', (b) => apriConfronto(r, b));
            cmp.setAttribute('data-dna-compare', id);
            li.appendChild(cmp);
        } else if (ui.state === 'result' && ui.openId !== null) {
            /* la voce aperta non ha «Confronta»: lo spazio resta, le righe
               restano allineate (stessa larghezza del nome in tutte) */
            const posto = document.createElement('span');
            posto.className = 'dna-history-spacer';
            posto.setAttribute('aria-hidden', 'true');
            li.appendChild(posto);
        }
        li.appendChild(rm);
        return li;
    }

    /* ---------------- router: #r=<id> (spec 20 §3, come penna.js) ---------------- */

    /** Porta a una voce (id) o al vuoto (null), scrivendo l'hash. */
    function vai(id, { sostituisci = false } = {}) {
        const hash = id ? hashDiId(id) : '';
        /* stesso hash (es. «Analizza un altro» da un risultato non salvato):
           nessuna voce nuova nella cronologia, ma la vista si riapplica */
        if ((location.hash || '') === hash) {
            hashApplicato = null;
            return applicaHash();
        }
        const url = location.pathname + location.search + hash;
        try {
            if (sostituisci) history.replaceState(null, '', url);
            else history.pushState(null, '', url);
        } catch (e) {
            location.hash = hash;
            return Promise.resolve();   // l'hashchange fara' il resto
        }
        return applicaHash();
    }

    /** Stato vuoto: niente voce aperta, niente filtro, `ultimo` tolto. */
    function mostraVuoto() {
        ui.openId = null;
        ui.result = null;
        ui.filtro = null;
        prefs.set(TOOL, 'ultimo', undefined);
        setState('empty');
        disegnaStorico();
    }

    function apriVoce(id, r) {
        ui.openId = String(id);
        ui.source = r.source;
        ui.name = r.name;
        showResult(r);
        prefs.set(TOOL, 'ultimo', ui.openId);
        disegnaStorico();
    }

    /**
     * L'hash e' la vista: qui si esegue. Durante un'analisi o un ascolto si
     * ignora (non si butta via il lavoro in corso). Un id sconosciuto torna
     * al vuoto con un toast.
     */
    async function applicaHash() {
        if (ui.state === 'working' || ui.state === 'recording') return;
        const hash = location.hash || '';
        if (hash === hashApplicato) return;
        hashApplicato = hash;
        chiudiConfronto();
        const id = idDaHash(hash);
        if (!id) { mostraVuoto(); return; }
        if (ui.openId === id && ui.state === 'result') return;
        let rec = null;
        try { rec = await get(TOOL, id); } catch (e) { rec = null; }
        if ((location.hash || '') !== hash) return;   // nel frattempo si e' andati altrove
        if (ui.state === 'working' || ui.state === 'recording') return;
        if (!rec) {
            toast('dna-gone');
            prefs.set(TOOL, 'ultimo', undefined);
            vai(null, { sostituisci: true });
            return;
        }
        apriVoce(id, migrate(rec, id));
    }

    /** La voce aperta c'e' ancora? (eliminata da un'altra scheda o dalla sync) */
    async function controllaAperta() {
        const id = ui.openId;
        if (id === null || ui.state !== 'result') return;
        let rec;
        try { rec = await get(TOOL, id); } catch (e) { return; }
        if (ui.openId !== id || rec) return;
        toast('dna-gone');
        prefs.set(TOOL, 'ultimo', undefined);
        vai(null, { sostituisci: true });
    }

    /**
     * All'avvio: con l'hash vale l'hash; senza, si riapre l'ultima voce
     * (iPhone in standalone riparte sempre da start_url) con un replace,
     * cosi' "indietro" non torna a una pagina vuota. `ultimo` orfano: via.
     */
    async function avvia() {
        if (!idDaHash(location.hash)) {
            const u = prefs.get(TOOL, 'ultimo', null);
            if (u) {
                let rec = null;
                try { rec = await get(TOOL, String(u)); } catch (e) { rec = null; }
                if (rec && !idDaHash(location.hash) && ui.state === 'empty') {
                    vai(String(u), { sostituisci: true });
                    return;
                }
                if (!rec) prefs.set(TOOL, 'ultimo', undefined);
            }
        }
        applicaHash();
    }

    /* ---------------- esporta .csv, condividi, copia ---------------- */

    function scaricaBlob(blob, nome) {
        try {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = nome;
            a.rel = 'noopener';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 10000);
            return true;
        } catch (e) {
            return false;
        }
    }

    /** iPhone/iPad aggiunti alla schermata Home: li' `<a download>` non apre nulla. */
    function inStandaloneIos() {
        try {
            const ua = navigator.userAgent || '';
            const piatt = navigator.platform || '';
            const iOS = /iPhone|iPad|iPod/.test(ua) || /iP(hone|ad|od)/.test(piatt)
                || (/Mac/.test(piatt) && navigator.maxTouchPoints > 1);
            const solo = navigator.standalone === true
                || (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches);
            return !!(iOS && solo);
        } catch (e) {
            return false;
        }
    }

    /** Web Share con il file allegato. -> true solo se e' andata davvero. */
    async function condividiFile(blob, nome) {
        if (typeof File !== 'function' || !navigator.canShare || !navigator.share) return false;
        try {
            const file = new File([blob], nome, { type: 'text/csv' });
            if (!navigator.canShare({ files: [file] })) return false;
            await navigator.share({ files: [file], title: nome });
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Tutto lo storico in .csv (spec 20 §3). Stessi ripieghi di Penna: in
     * standalone su iOS prima la condivisione del file, poi il download,
     * infine il testo negli appunti.
     */
    async function esportaCsv() {
        let voci = ui.voci;
        try { voci = await tutteLeVoci(); } catch (e) { /* si usa la copia in memoria */ }
        if (!voci.length) return;
        const testo = csv(voci, { lingua: lang(), t });
        const nome = nomeCsv();
        const blob = new Blob([testo], { type: 'text/csv;charset=utf-8' });
        if (inStandaloneIos() && await condividiFile(blob, nome)) return;
        if (scaricaBlob(blob, nome)) return;
        try {
            await navigator.clipboard.writeText(testo);
            toast('dna-csv-copied');
        } catch (e) {
            toast('dna-csv-fail');
        }
    }

    async function copia(text) {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            toast('dna-copied');
        } catch (e) {
            toast('dna-copy-manual');
        }
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
        /* Basta che UNA delle due analisi sia sopra soglia: la prova che il
           risultato tiene e' l'accordo fra le due, la soglia serve solo a
           escludere chi non ha mai visto niente di solido. Su un giro lento
           la confidenza della tonalita' oscilla da un tentativo all'altro
           anche quando la risposta non cambia mai. */
        if (!(Math.max(prev.bpm.confidence, cur.bpm.confidence) >= BPM_SURE)) return false;
        if (!(Math.max(prev.key.confidence, cur.key.confidence) >= KEY_SURE)) return false;
        if (prev.key.tonic !== cur.key.tonic || prev.key.mode !== cur.key.mode) return false;
        const a = prev.bpm.bpm;
        const b = cur.bpm.bpm;
        return a > 0 && b > 0 && Math.abs(a - b) <= BPM_SAME;
    }

    /**
     * Otto battiti sono il minimo per credere a un BPM, e otto battiti
     * durano il doppio a 60 BPM che a 120: la finestra minima dipende dal
     * BPM stimato, non e' un numero fisso di secondi (ricerca, punto 10).
     */
    function longEnough(data, seconds) {
        const bpm = data && data.bpm ? data.bpm.bpm : 0;
        if (!(bpm > 0)) return false;
        return seconds >= MIN_BEATS * 60 / bpm;
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
        /* chi annulla mentre il permesso e' in volo cambia `session`: quella
           richiesta non deve piu' far partire nulla, e il microfono che
           arriva dopo va rilasciato subito (altrimenti resta acceso) */
        const mine = ++session;
        mic.acquire({ echoCancellation: false, noiseSuppression: false, autoGainControl: false }).then(() => {
            starting = false;
            if (mine !== session) { mic.release(); return; }
            showConsent(false);
            setStatus(statusOut, { kind: 'idle', key: '' });
            if (statusOut) statusOut.textContent = '';
            beginCapture(ctx);
        }, (err) => {
            starting = false;
            if (mine !== session) return;
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
            busy: false,
            sawSound: false   // almeno un'analisi con del segnale dentro
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
            /* 25 s senza convergenza: nessun valore, si dice com'e' andata */
            if (elapsed >= LISTEN_MAX) { giveUp(listening.sawSound ? 'unsure' : 'silent'); return; }
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
        /* `mine` e non `listening`: un'analisi lanciata da una sessione
           annullata arriva comunque, e senza questo confronto finiva
           addosso all'ascolto successivo (falso "c'e' del suono"). */
        const mine = listening;
        if (!mine || mine.busy) return;
        const mono = captured();
        if (mono.length < mine.rate * 4) return;
        mine.busy = true;
        setListenLabel('dna-almost');
        const a4 = Number(prefs.get('shared', 'a4', 440)) || 440;
        const rate = mine.rate;
        try {
            const data = await ask(
                { type: 'analyse', channels: [mono.buffer], sampleRate: rate, a4, mic: true },
                [mono.buffer],
                null
            );
            if (listening !== mine) return;
            /* stanza muta: non si conta come tentativo, si continua ad ascoltare */
            if (data.silent) { mine.prev = null; mine.last = null; setListenLabel('dna-listening'); return; }
            mine.sawSound = true;
            const heard = (Date.now() - mine.started) / 1000;
            const sure = agrees(mine.prev, data) && longEnough(data, heard);
            mine.prev = data;
            mine.last = data;
            if (sure) { stopListening({ data }); return; }
            setListenLabel('dna-listening');
        } catch (e) {
            if (listening === mine) setListenLabel('dna-listening');
        } finally {
            mine.busy = false;
        }
    }

    /** Stacca tutto e libera il microfono; torna lo stato che c'era. */
    function teardownListening() {
        session++;   // qualunque richiesta in volo diventa vecchia
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

    /**
     * "Annulla": si ferma tutto e non si analizza nulla.
     *   back = 'recording' -> il secondo tocco sul logo, si resta li' col
     *   logo fermo; back = 'empty' -> il pulsante Annulla sotto il logo.
     */
    function cancelListening(back = 'empty') {
        teardownListening();   // vale anche mentre si sta ancora chiedendo il permesso
        starting = false;
        if (statusOut) statusOut.textContent = '';
        setState(back === 'recording' ? 'recording' : 'empty');
        if (back !== 'recording') pulisciHash();
    }

    /**
     * Fine dell'ascolto senza un risultato in cui credere: niente numeri
     * inventati, si dice cosa e' successo e si offre "Riprova".
     *   why = 'silent' (nessun suono) | 'unsure' (nessuna convergenza)
     */
    function giveUp(why) {
        teardownListening();
        const key = why === 'silent' ? 'dna-none-silent' : 'dna-none-unsure';
        if (noneText) {
            noneText.setAttribute('data-i18n', key);
            noneText.textContent = t(key);
        }
        setState('none');
        pulisciHash();
        /* senza il markup del nuovo stato almeno il messaggio si vede */
        if (!document.getElementById('dna-none')) setStatus(statusOut, { kind: 'error', key });
    }

    /** Fine dell'ascolto con la convergenza: il risultato si mostra subito. */
    function stopListening({ data = null } = {}) {
        const state = teardownListening();
        if (!state) return;
        /* nessun ripiego su `state.last`: senza due analisi concordi non si
           mostra nessun numero (feedback Genna) */
        if (!data) { giveUp(state.sawSound ? 'unsure' : 'silent'); return; }
        finishListening(data, { seconds: (Date.now() - state.started) / 1000, rate: state.rate });
    }

    /** "Registrazione 18 set 21:34": un nome che dice quando, non cosa. */
    function recordingName(date = new Date()) {
        let when;
        try {
            when = new Intl.DateTimeFormat(lang(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
        } catch (e) {
            when = date.toLocaleString();
        }
        when = when.replace(/,/g, '');
        const text = t('dna-rec-name', { when });
        return text === 'dna-rec-name' ? 'Registrazione ' + when : text;
    }

    /** Dal risultato del worker alla scheda, senza rianalizzare. */
    function finishListening(data, { seconds, rate }) {
        const result = {
            name: recordingName(),
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
            uncertain: false,   // si arriva qui SOLO con due analisi concordi
            at: new Date().toISOString()
        };
        stopWorker();
        mostraNuovo(result);
    }

    /** Schermata del logo fermo: nessun microfono, nessun permesso. */
    function showListenScreen() {
        setState('recording');
        setListening(false);
        setListenLabel('dna-press');
        showConsent(false);
        /* la via d'uscita si vede sempre, anche prima di cominciare */
        if (listenCancel) listenCancel.hidden = false;
        if (statusOut) statusOut.textContent = '';
    }

    /* "Registra" NON accende nulla: porta solo alla schermata del logo
       (feedback Genna). Il permesso si chiede al tocco sul logo. */
    if (recordBtn) recordBtn.addEventListener('click', showListenScreen);

    /* Il logo: primo tocco chiede il permesso (se serve) e ascolta, secondo
       tocco annulla e resta qui. La fine "buona" e' solo automatica. */
    if (shazamBtn) {
        shazamBtn.addEventListener('click', () => {
            if (listening || starting) { cancelListening('recording'); return; }
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
            if (mic.granted()) startListening();
            else showConsent(true);
        });
    }

    /* "Ferma e analizza" non esiste piu': se il markup vecchio ha ancora
       #dna-stop, sparisce invece di mentire. */
    if (stopBtn) stopBtn.hidden = true;
    /* "Annulla" sotto il logo: si esce dall'ascolto e si torna allo stato vuoto */
    if (listenCancel) {
        listenCancel.addEventListener('click', () => cancelListening('empty'));
    }
    /* "Riprova" dopo un ascolto senza risultato: si torna al logo fermo */
    if (retryBtn) retryBtn.addEventListener('click', showListenScreen);

    /* ---------------- comandi del risultato ---------------- */

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            cancelled = true;
            stopWorker();
            setState('empty');
            pulisciHash();
        });
    }
    /* «Analizza un altro»: push del vuoto (indietro riapre il risultato) */
    if (againBtn) againBtn.addEventListener('click', () => { vai(null); });
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
            salvaPiega(ui.result);
        });
    }

    /**
     * La scelta ÷2/×2 va nel record (spec 20 §3: prima restava in memoria e
     * al ricaricamento tornava il BPM di prima). Si rilegge il record, cosi'
     * un nome cambiato nel frattempo non si perde. Un risultato non ancora
     * salvato non serve: `mostraNuovo` salva lo stesso oggetto.
     */
    async function salvaPiega(result, id = ui.openId) {
        /* senza id il salvataggio e' ancora in corso: ci pensa mostraNuovo */
        if (id === null || !result) return;
        try {
            const prev = await get(TOOL, id);
            if (!prev) return;
            await put(TOOL, id, historyRecord({ ...migrate(prev, id), bpm: result.bpm }));
            await renderHistory();
        } catch (e) {
            if (e && (e.codice === 'limite' || e.codice === 'grande')) toast('store-limit');
        }
    }

    /* chip dei compatibili: filtro in memoria sullo storico */
    if (compatBox) {
        compatBox.addEventListener('click', (e) => {
            const chip = e.target.closest('.dna-compat-chip');
            if (chip) scegliFiltro(chip.getAttribute('data-dna-camelot'));
        });
    }
    if (filterClear) filterClear.addEventListener('click', () => scegliFiltro(null));
    if (searchIn) {
        searchIn.addEventListener('input', () => {
            ui.q = searchIn.value;
            disegnaStorico();
        });
    }
    if (exportBtn) exportBtn.addEventListener('click', () => { esportaCsv(); });
    if (lufsHintClose) lufsHintClose.addEventListener('click', glossarioVisto);
    /* chi apre la «i» ha visto il glossario: la riga non serve piu' */
    if (lufsInfoBtn) lufsInfoBtn.addEventListener('click', glossarioVisto);
    /* Condividi solo dove c'e' Web Share (spec 20 §3); annullato = niente,
       altri errori = si copia */
    if (shareBtn) {
        shareBtn.hidden = typeof navigator.share !== 'function';
        shareBtn.addEventListener('click', async () => {
            const text = summary();
            if (!text) return;
            try {
                await navigator.share({ title: nomeMostrato(ui.result), text });
            } catch (e) {
                if (e && e.name === 'AbortError') return;
                copia(text);
            }
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
        copyBtn.addEventListener('click', () => { copia(summary()); });
    }

    /* l'hash e' la vista: la traversata manda popstate e hashchange in
       coppia, applicaHash() serve un hash una volta sola */
    window.addEventListener('hashchange', () => { applicaHash(); });
    window.addEventListener('popstate', () => { applicaHash(); });

    /* cambio lingua: le righe con variabili, il filtro, il confronto aperto */
    function applicaSegnaposto() {
        document.querySelectorAll('[data-i18n-placeholder]').forEach((e) => {
            e.setAttribute('placeholder', t(e.getAttribute('data-i18n-placeholder')));
        });
    }
    onLingua(() => {
        applicaSegnaposto();
        disegnaStorico();
        if (ui.result && compatBox) aggiornaFiltro();
        if (ui.confronto && ui.result && compareSheet && !compareSheet.hidden) disegnaConfronto(ui.result, ui.confronto);
    });

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
    applicaSegnaposto();
    const primoAvvio = document.getElementById('tb-hint');
    if (primoAvvio && typeof MutationObserver === 'function') {
        new MutationObserver(aggiornaFoldHint).observe(primoAvvio, { attributes: true, attributeFilter: ['hidden'] });
    }
    setState('empty');
    /* prima lo storico (serve a disegnare la voce aperta), poi l'hash o l'ultima voce */
    renderHistory().then(avvia, avvia);
    /* analisi arrivate (o tolte) dalla sincronizzazione o da un'altra
       scheda: «Recenti» si ridisegna (spec 18 §4) e, se la voce aperta non
       c'e' piu', «Analisi non trovata» e si torna al vuoto (spec 20 §3) */
    onArchivio(TOOL, (m) => {
        if (!m || !(m.origine === 'sync' || !m.locale)) return;
        renderHistory();
        if (ui.openId !== null && (m.id === null || m.id === undefined || String(m.id) === ui.openId)) controllaAperta();
    }, { locali: true });
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
        showListenScreen,
        renameHistory,
        recordingName,
        migrate,
        showConsent,
        agrees,
        longEnough,
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
    /* «Come funziona», riga del primo avvio, tip dei pulsanti icona (spec 18 §6) */
    try { mountAiuto({ slug: TOOL }); } catch (e) { console.warn('[aiuto] non montato:', e && e.message); }
    /* giro all'apertura e 3 s dopo i salvataggi; senza codice niente rete */
    avviaSync().catch(() => { /* senza IndexedDB resta spenta */ });
}
