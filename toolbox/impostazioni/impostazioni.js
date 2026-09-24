/**
 * Tiny Temple Toolbox - pagina Impostazioni (spec 18 §5).
 *
 * Una pagina vera, non una tile: la apre la voce "Impostazioni" del menu
 * (shared/nav.js). Tiene quello che prima stava sparso nei fogli degli
 * strumenti: lingua, aspetto, microfono, pacchetti lingua, dati, versione.
 * E la sincronizzazione (#imp-sync): il codice e' della Toolbox intera,
 * la rete sta tutta in shared/sync.js (spec 18 §4).
 *
 * CONTRATTO CON IL MARKUP (impostazioni/index.html). Ogni id e' facoltativo:
 * `el()` tollera quelli che mancano e la sezione relativa resta ferma.
 *   #imp-lingua-seg      .tb-segment con un pulsante per lingua; il valore
 *                        viene da data-imp-lang (o data-value, o dal testo)
 *   #imp-anim-ridotte    interruttore (button[role=switch] con aria-checked,
 *   #imp-salta-intro     oppure input[type=checkbox])
 *   #imp-mic-stato       testo dello stato; #imp-mic-revoca "Revoca il
 *                        permesso" (nascosto se non c'e' niente da revocare)
 *   #imp-sync            la sincronizzazione, speculare alla vecchia #pen-sync:
 *                        #imp-sync-state (aria-live: in corso, fatto, errori),
 *                        quattro sotto-viste [data-sync-view="off|create|have|on"]
 *                        (il JS ne mostra una e nasconde le altre);
 *      off:    #imp-sync-create, #imp-sync-have
 *      create: #imp-sync-code (le sei parole), #imp-sync-copy, #imp-sync-activate
 *      have:   #imp-sync-input, #imp-sync-link
 *      on:     #imp-sync-last, #imp-sync-now, #imp-sync-show (interruttore con
 *              aria-expanded: rivela #imp-sync-code-on e #imp-sync-copy-on),
 *              #imp-sync-reupload (solo con lo stato vuoto-remoto: il server
 *              e' stato svuotato altrove, si reinvia solo a richiesta),
 *              #imp-sync-unlink, #imp-sync-wipe con la conferma
 *              #imp-sync-wipe-confirm (-yes / -no), e un interruttore per
 *              collezione #imp-sync-coll-<coll> (limiti.js SINCRONIZZABILI)
 *      ogni .imp-sync-cancel torna a "off" e butta il codice mai attivato
 *   #imp-pacchetti-lista contenitore; ogni lingua del rimario e' un clone di
 *   <template id="imp-pack-tpl">, dove si cercano (data-imp-pack-<parte> o
 *                        .imp-pack-<parte>): nome, peso, stato, scarica,
 *                        rimuovi. Il clone porta data-imp-pack="<codice>" e
 *                        data-imp-pack-stato (installato | assente | scarico
 *                        | errore). #imp-pacchetti-vuoto solo a lista vuota.
 *   #imp-esporta         scarica toolbox-AAAA-MM-GG.json
 *   #imp-importa         apre #imp-importa-input (type=file); la strategia
 *   #imp-importa-modo    e' il segment Unisci / Sostituisci (data-imp-modo =
 *                        unisci|sostituisci, o l'ordine: 1o unisci)
 *   #imp-dati-status     .tb-status: l'esito di esporta/importa/cancella
 *                        (data-imp-esito = chiave i18n dell'ultimo esito)
 *   #imp-cancella        mostra/nasconde #imp-cancella-box, dove
 *                        #imp-cancella-parola mostra la parola da scrivere
 *                        (t('imp-cancella-parola'): CANCELLA / DELETE; CANCELLA
 *                        vale in tutte e due le lingue), #imp-cancella-conferma
 *                        la riceve, #imp-cancella-si resta disabilitato finche'
 *                        non c'e', #imp-cancella-annulla richiude
 *   #imp-versione        "Toolbox tb-vNN · aggiornata il ..."
 *
 * Preferenze di Aspetto: `tt.shared.animazioni-ridotte` e
 * `tt.shared.salta-intro`, portabili (nell'archivio, viaggiano con
 * esporta/importa). lang-boot.js le legge da localStorage prima del primo
 * paint (html.tb-ridotte / html.tb-no-intro).
 *
 * "Cancella tutto" toglie SOLO i dati dell'utente: il codice della
 * sincronizzazione (le copie sul server restano: per quelle c'e' "Scollega
 * ed elimina"), tutte le collezioni
 * dell'archivio (davvero, senza lapidi), le preferenze `tt.*` di
 * localStorage e la cache dei pacchetti `toolbox-rimario`. La cache
 * dell'app (service worker) resta: la Toolbox continua a funzionare offline.
 *
 * Importa: la busta dell'archivio (`app: tiny-temple-toolbox`) va a
 * `importaTutto` con la strategia scelta; la busta vecchia di Penna
 * (`tipo: tiny-temple-penna`, o un array di testi) passa dall'adattatore di
 * penna/file.js e dall'unione per id di penna/elenco.js, come in Penna;
 * con "Sostituisci" rimpiazza SOLO i testi di Penna (il file non contiene
 * altro), le altre collezioni restano.
 */

import commonDict from '/shared/i18n-common.js';
import toolDict from '/impostazioni/i18n.js';
import { init, t, lang, setLang, onChange as onLingua } from '/shared/i18n.js';
import { pressFeedback, toast, setStatus } from '/shared/ui.js';
import { mountBar } from '/shared/nav.js';
import { initPwa } from '/shared/pwa.js';
import { mountAiuto } from '/shared/aiuto.js';
import { mountInfos } from '/shared/sheet.js';
import * as mic from '/shared/mic.js';
import {
    esportaTutto, importaTutto, svuota, pref, impostaPref, elenca, scrivi, elimina, APP,
    onChange as onArchivio
} from '/shared/archivio.js';
import * as pacchetti from '/shared/pacchetti-lingua.js';
import { CODICI } from '/shared/testo/lingue.js';
import * as sync from '/shared/sync.js';
import { VERSIONE, DATA_VERSIONE } from '/shared/versione.js';
import { scaricaBlob, inStandaloneIos, condividiFile, leggiFileScelto, leggiQuaderno } from '/penna/file.js';
import { fondi } from '/penna/elenco.js';

const TOOL = 'impostazioni';
const PREF_RIDOTTE = 'tt.shared.animazioni-ridotte';
const PREF_SALTA = 'tt.shared.salta-intro';
/* la parola di conferma: CANCELLA sempre, piu' quella tradotta
   (`imp-cancella-parola`, DELETE in inglese) */
const PAROLA_CONFERMA = 'CANCELLA';

const el = (id) => (typeof document !== 'undefined' ? document.getElementById(id) : null);

const due = (n) => String(n).padStart(2, '0');

/** toolbox-AAAA-MM-GG.json (data locale: e' il nome che vede chi scarica). */
export function nomeFile(data = new Date()) {
    return 'toolbox-' + data.getFullYear() + '-' + due(data.getMonth() + 1) + '-' + due(data.getDate()) + '.json';
}

/**
 * La conferma di "Cancella tutto": CANCELLA (o la parola tradotta,
 * `tradotta`), maiuscole o minuscole, spazi ai lati ammessi.
 */
export function confermaValida(testo, tradotta = PAROLA_CONFERMA) {
    const v = String(testo == null ? '' : testo).trim().toUpperCase();
    return v !== '' && (v === PAROLA_CONFERMA || v === String(tradotta || '').trim().toUpperCase());
}

/* ---------------- segment e interruttori ---------------- */

function valoreDi(btn, i, ammessi) {
    const v = btn.getAttribute('data-imp-lang') || btn.getAttribute('data-imp-modo')
        || btn.getAttribute('data-value') || btn.getAttribute('data-lang') || btn.getAttribute('data-modo');
    if (v) return v;
    const testo = (btn.textContent || '').trim().toLowerCase();
    if (ammessi.includes(testo)) return testo;
    return ammessi[i] || testo;
}

/** Un .tb-segment: `ammessi` e' l'elenco dei valori (anche per posizione). */
function segment(root, ammessi, { iniziale, cambia } = {}) {
    if (!root) return { valore: () => iniziale, imposta() {} };
    const bottoni = [...root.querySelectorAll('button, [role="radio"]')];
    let valore = iniziale;
    const disegna = () => {
        bottoni.forEach((b, i) => {
            const on = valoreDi(b, i, ammessi) === valore;
            b.setAttribute('aria-checked', on ? 'true' : 'false');
            b.classList.toggle('is-active', on);
            /* giro del Tab dei radio: solo quello scelto */
            if (b.getAttribute('role') === 'radio') b.tabIndex = on ? 0 : -1;
        });
    };
    const scegli = (v, avvisa) => {
        if (!ammessi.includes(v)) return;
        valore = v;
        disegna();
        if (avvisa && typeof cambia === 'function') cambia(v);
    };
    bottoni.forEach((b, i) => {
        b.addEventListener('click', () => scegli(valoreDi(b, i, ammessi), true));
        b.addEventListener('keydown', (e) => {
            const passo = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1
                : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
            if (!passo) return;
            e.preventDefault();
            const j = (i + passo + bottoni.length) % bottoni.length;
            scegli(valoreDi(bottoni[j], j, ammessi), true);
            bottoni[j].focus();
        });
    });
    disegna();
    return { valore: () => valore, imposta: (v) => scegli(v, false) };
}

const eCasella = (n) => n && n.tagName === 'INPUT' && n.type === 'checkbox';

function leggiInterruttore(n) {
    if (!n) return false;
    return eCasella(n) ? n.checked : n.getAttribute('aria-checked') === 'true';
}

function scriviInterruttore(n, on) {
    if (!n) return;
    if (eCasella(n)) n.checked = !!on;
    else n.setAttribute('aria-checked', on ? 'true' : 'false');
}

function interruttore(n, cambia) {
    if (!n) return;
    if (eCasella(n)) {
        n.addEventListener('change', () => cambia(n.checked));
        return;
    }
    if (!n.getAttribute('role')) n.setAttribute('role', 'switch');
    n.addEventListener('click', () => {
        const on = !leggiInterruttore(n);
        scriviInterruttore(n, on);
        cambia(on);
    });
}

/* ---------------- pagina ---------------- */

export function mountImpostazioni() {
    /* ---- lingua ---- */
    const lingua = segment(el('imp-lingua-seg'), ['it', 'en'], {
        iniziale: lang(),
        cambia: (v) => setLang(v)
    });

    /* ---- aspetto ---- */
    const ridotte = el('imp-anim-ridotte');
    const salta = el('imp-salta-intro');
    const renderAspetto = () => {
        scriviInterruttore(ridotte, pref(PREF_RIDOTTE, false) === true);
        scriviInterruttore(salta, pref(PREF_SALTA, false) === true);
        document.documentElement.classList.toggle('tb-ridotte', pref(PREF_RIDOTTE, false) === true);
    };
    interruttore(ridotte, (on) => {
        impostaPref(PREF_RIDOTTE, on);
        document.documentElement.classList.toggle('tb-ridotte', on);
    });
    interruttore(salta, (on) => { impostaPref(PREF_SALTA, on); });

    /* ---- microfono ---- */
    const micStato = el('imp-mic-stato');
    const micRevoca = el('imp-mic-revoca');
    const renderMic = () => {
        const s = mic.state();
        const key = s === 'denied' ? 'mic-denied'
            : s === 'unavailable' ? 'mic-unavailable'
                : mic.granted() ? 'mic-state-granted' : 'mic-state-unasked';
        if (micStato) {
            micStato.setAttribute('data-i18n', key);
            micStato.textContent = t(key);
            micStato.setAttribute('data-imp-mic', mic.granted() ? 'granted' : s);
        }
        if (micRevoca) micRevoca.hidden = !mic.granted();
    };
    if (micRevoca) {
        micRevoca.addEventListener('click', () => {
            mic.revoke();          // ferma le tracce e cancella il consenso
            renderMic();
            toast('imp-mic-revoked');
        });
    }
    mic.onStateChange(renderMic);

    /* ---- pacchetti lingua ---- */
    const packLista = el('imp-pacchetti-lista');
    const packTpl = el('imp-pack-tpl');
    const voci = new Map();              // codice -> { nodo, stato, pct }
    let catalogo = pacchetti.CATALOGO_BASE;
    let scaricando = null;               // codice in download (uno alla volta)

    const parte = (nodo, nome) => nodo.querySelector('[data-imp-pack-' + nome + '], .imp-pack-' + nome);

    function nuovaVoce(codice) {
        let nodo = null;
        if (packTpl && packTpl.content && packTpl.content.firstElementChild) {
            nodo = packTpl.content.firstElementChild.cloneNode(true);
        } else {
            /* nessun template: una riga minima, stesse parti */
            nodo = document.createElement('li');
            nodo.className = 'imp-pack';
            ['nome', 'peso', 'stato'].forEach((p) => {
                const s = document.createElement('span');
                s.className = 'imp-pack-' + p;
                nodo.appendChild(s);
            });
            [['scarica', 'imp-pack-scarica'], ['rimuovi', 'imp-pack-rimuovi']].forEach(([p, key]) => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'tb-btn imp-pack-' + p;
                b.setAttribute('data-i18n', key);
                nodo.appendChild(b);
            });
        }
        nodo.setAttribute('data-imp-pack', codice);
        const scarica = parte(nodo, 'scarica');
        const rimuovi = parte(nodo, 'rimuovi');
        if (scarica) scarica.addEventListener('click', () => scaricaPacchetto(codice));
        if (rimuovi) rimuovi.addEventListener('click', () => rimuoviPacchetto(codice));
        const voce = { nodo, stato: 'assente', pct: 0 };
        voci.set(codice, voce);
        packLista.appendChild(nodo);
        return voce;
    }

    function disegnaVoce(codice) {
        const voce = voci.get(codice) || nuovaVoce(codice);
        const pack = pacchetti.pacchetto(codice, catalogo);
        const { nodo, stato } = voce;
        nodo.setAttribute('data-imp-pack-stato', stato);
        const nome = parte(nodo, 'nome');
        const peso = parte(nodo, 'peso');
        const testo = parte(nodo, 'stato');
        const scarica = parte(nodo, 'scarica');
        const rimuovi = parte(nodo, 'rimuovi');
        if (nome) nome.textContent = pack ? pack.nome : codice;
        if (peso) peso.textContent = pack && pack.gzip ? pacchetti.pesoLeggibile(pack.gzip) : '';
        if (testo) {
            testo.textContent = stato === 'installato' ? t('imp-pack-installato')
                : stato === 'scarico' ? t('imp-pack-downloading', { pct: voce.pct })
                    : stato === 'errore' ? t('imp-pack-failed')
                        : t(codice === 'it' ? 'imp-pack-auto' : 'imp-pack-non-installato');
        }
        nodo.setAttribute('aria-busy', stato === 'scarico' ? 'true' : 'false');
        if (scarica) {
            scarica.hidden = stato === 'installato' || stato === 'scarico';
            scarica.disabled = !!scaricando;
        }
        if (rimuovi) rimuovi.hidden = stato !== 'installato';
        if (scarica) scarica.textContent = t(scarica.getAttribute('data-i18n') || 'imp-pack-scarica');
        if (rimuovi) rimuovi.textContent = t(rimuovi.getAttribute('data-i18n') || 'imp-pack-rimuovi');
    }

    async function statoReale(codice) {
        /* in cache davvero; per le lingue diverse dall'italiano basta anche la
           preferenza di Penna (la cache puo' essere stata sfrattata: Penna le
           considera installate e le riscarica da sola) */
        if (await pacchetti.presente(codice, catalogo)) return 'installato';
        return codice !== 'it' && pacchetti.installati().includes(codice) ? 'installato' : 'assente';
    }

    const packVuoto = el('imp-pacchetti-vuoto');

    async function renderPacchetti() {
        if (!packLista) return;
        for (const codice of CODICI) {
            const voce = voci.get(codice) || nuovaVoce(codice);
            if (voce.stato !== 'scarico') voce.stato = await statoReale(codice);
            disegnaVoce(codice);
        }
        if (packVuoto) packVuoto.hidden = packLista.children.length > 0;
    }

    const ridisegnaTutte = () => voci.forEach((v, codice) => disegnaVoce(codice));

    async function scaricaPacchetto(codice) {
        if (scaricando) return;
        scaricando = codice;
        const voce = voci.get(codice);
        voce.stato = 'scarico';
        voce.pct = 0;
        ridisegnaTutte();
        try {
            await pacchetti.scaricaFile(codice, {
                catalogo,
                onAvanti: (fatti, totale) => {
                    voce.pct = Math.round(100 * fatti / totale);
                    disegnaVoce(codice);
                }
            });
            pacchetti.segnaInstallato(codice);
            voce.stato = 'installato';
            toast('imp-pack-done', { vars: { lingua: (pacchetti.pacchetto(codice, catalogo) || {}).nome || codice } });
        } catch (e) {
            voce.stato = 'errore';
            toast('imp-pack-failed');
        } finally {
            scaricando = null;
            ridisegnaTutte();
        }
    }

    async function rimuoviPacchetto(codice) {
        if (scaricando) return;
        await pacchetti.togliDallaCache(codice, catalogo);
        pacchetti.segnaRimosso(codice);
        const voce = voci.get(codice);
        if (voce) voce.stato = await statoReale(codice);
        disegnaVoce(codice);
        toast('imp-pack-removed');
    }

    /* ---- dati: l'esito in #imp-dati-status (o in un toast, se manca) ---- */
    const datiStatus = el('imp-dati-status');
    let ultimoEsito = null;
    const esitoDati = (kind, key, vars) => {
        ultimoEsito = { kind, key, vars };
        if (!datiStatus) { toast(key, { vars }); return; }
        setStatus(datiStatus, { kind });
        datiStatus.removeAttribute('data-i18n');     // ha segnaposto: lo ritraduce onLingua
        datiStatus.setAttribute('data-imp-esito', key);
        datiStatus.textContent = t(key, vars);
    };

    /* ---- dati: esporta ---- */
    const esporta = el('imp-esporta');
    if (esporta) {
        esporta.addEventListener('click', async () => {
            esporta.disabled = true;
            try {
                const esito = await esportaFile();
                if (esito === 'copiato') esitoDati('ok', 'imp-export-copied');
                else if (esito === 'niente') esitoDati('error', 'imp-export-failed');
                else esitoDati('ok', 'imp-export-done');
            } catch (e) {
                esitoDati('error', 'imp-export-failed');
            } finally {
                esporta.disabled = false;
            }
        });
    }

    /* ---- dati: importa ---- */
    const modo = segment(el('imp-importa-modo'), ['unisci', 'sostituisci'], { iniziale: 'unisci' });
    const importaBtn = el('imp-importa');
    const importaInput = el('imp-importa-input');
    if (importaBtn && importaInput && importaBtn.tagName !== 'LABEL') {
        importaBtn.addEventListener('click', () => importaInput.click());
    }
    if (importaInput) {
        importaInput.addEventListener('change', async () => {
            const file = importaInput.files && importaInput.files[0];
            if (!file) return;
            try {
                await importaFile(file, modo.valore());
            } finally {
                importaInput.value = '';
            }
        });
    }

    async function importaFile(file, strategia) {
        const grezzo = await leggiFileScelto(file);
        if (grezzo === null) { esitoDati('error', 'imp-import-failed'); return null; }
        let dati = null;
        try { dati = JSON.parse(grezzo); } catch (e) { dati = null; }
        let esito = null;
        try {
            if (dati && dati.app === APP) {
                esito = await importaTutto(dati, { strategia });
            } else {
                const testi = leggiQuaderno(grezzo);
                if (!testi) { esitoDati('error', 'imp-import-failed'); return null; }
                esito = await importaQuadernoPenna(testi, strategia);
            }
        } catch (e) {
            esitoDati('error', e && (e.codice === 'limite' || e.codice === 'grande') ? 'imp-import-limit' : 'imp-import-failed');
            return null;
        }
        /* le preferenze importate sono gia' in localStorage (applicaPreferenze):
           la pagina si rimette in pari, lingua compresa */
        const l = pref('tinyTempleLang', lang());
        if ((l === 'it' || l === 'en') && l !== lang()) setLang(l);
        renderAspetto();
        renderPacchetti();
        esitoDati('ok', 'imp-import-done', { n: esito.nuovi, m: esito.aggiornati });
        return esito;
    }

    /* ---- dati: cancella tutto ---- */
    const cancella = el('imp-cancella');
    const box = el('imp-cancella-box');
    const conferma = el('imp-cancella-conferma');
    const si = el('imp-cancella-si');
    const annulla = el('imp-cancella-annulla');
    const parola = el('imp-cancella-parola');
    const renderParola = () => {
        const w = t('imp-cancella-parola');
        if (parola) parola.textContent = w;
        if (conferma) conferma.setAttribute('placeholder', w);
        aggiornaSi();
    };
    const aggiornaSi = () => {
        if (si) si.disabled = !confermaValida(conferma ? conferma.value : '', t('imp-cancella-parola'));
    };
    const chiudiBox = () => {
        if (box) box.hidden = true;
        if (cancella) cancella.setAttribute('aria-expanded', 'false');
        if (conferma) conferma.value = '';
        aggiornaSi();
    };
    if (cancella && box) {
        cancella.setAttribute('aria-controls', 'imp-cancella-box');
        cancella.setAttribute('aria-expanded', box.hidden ? 'false' : 'true');
        cancella.addEventListener('click', () => {
            if (!box.hidden) { chiudiBox(); return; }
            box.hidden = false;
            cancella.setAttribute('aria-expanded', 'true');
            if (conferma) conferma.focus();
        });
    }
    if (annulla) annulla.addEventListener('click', () => { chiudiBox(); if (cancella) cancella.focus(); });
    if (conferma) {
        conferma.addEventListener('input', aggiornaSi);
        conferma.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && si && !si.disabled) { e.preventDefault(); si.click(); }
            if (e.key === 'Escape') { e.preventDefault(); chiudiBox(); if (cancella) cancella.focus(); }
        });
    }
    if (si) {
        si.addEventListener('click', async () => {
            if (!confermaValida(conferma ? conferma.value : '', t('imp-cancella-parola'))) { aggiornaSi(); return; }
            si.disabled = true;
            try {
                await cancellaTutto();
                syncUi.render();
                chiudiBox();
                renderAspetto();
                await renderPacchetti();
                esitoDati('ok', 'imp-wipe-done');
            } catch (e) {
                aggiornaSi();
                esitoDati('error', 'imp-wipe-failed');
            }
        });
    }
    renderParola();

    /* ---- sincronizzazione (spec 18 §4-5) ---- */
    const syncUi = mountSync({ dopoArrivo: () => {
        /* le preferenze arrivate sono gia' in localStorage (applicaPreferenze) */
        const l = pref('tinyTempleLang', lang());
        if ((l === 'it' || l === 'en') && l !== lang()) setLang(l);
        renderAspetto();
    } });

    /* ---- versione ---- */
    const versione = el('imp-versione');
    const renderVersione = () => {
        if (!versione) return;
        let giorno = DATA_VERSIONE;
        try {
            giorno = new Date(DATA_VERSIONE + 'T12:00:00').toLocaleDateString(lang() === 'en' ? 'en-GB' : 'it-IT',
                { day: 'numeric', month: 'long', year: 'numeric' });
        } catch (e) { /* resta AAAA-MM-GG */ }
        versione.textContent = t('imp-version', { versione: VERSIONE, data: giorno });
        versione.setAttribute('data-imp-versione', VERSIONE);
    };

    /* ---- lingua che cambia (anche dal menu): tutto il testo dinamico ---- */
    onLingua((l) => {
        lingua.imposta(l);
        renderMic();
        ridisegnaTutte();
        renderVersione();
        renderParola();
        syncUi.render();
        if (ultimoEsito) esitoDati(ultimoEsito.kind, ultimoEsito.key, ultimoEsito.vars);
    });

    renderAspetto();
    renderMic();
    renderVersione();
    renderPacchetti();
    pacchetti.caricaCatalogo().then((c) => {
        catalogo = c;
        ridisegnaTutte();
    });

    return {
        importaFile,
        esportaFile,
        cancellaTutto,
        renderPacchetti,
        scaricaPacchetto,
        rimuoviPacchetto,
        sync: syncUi
    };
}

/* ---------------- sincronizzazione ---------------- */

/**
 * La sezione #imp-sync. Tutta la rete sta in shared/sync.js: qui ci sono i
 * bottoni, lo stato in aria-live e gli interruttori per collezione. Finche'
 * l'utente non tocca Attiva o Collega non parte NESSUNA richiesta (spec 18
 * §10.4): `sync.stato().attivo` e' falso e il giro esce subito.
 */
function mountSync({ dopoArrivo } = {}) {
    const box = el('imp-sync');
    const statoOut = el('imp-sync-state');
    const creaBtn = el('imp-sync-create');
    const hoBtn = el('imp-sync-have');
    const codiceBox = el('imp-sync-code');
    const codiceOn = el('imp-sync-code-on');
    const copiaBtn = el('imp-sync-copy');
    const copiaOn = el('imp-sync-copy-on');
    const attivaBtn = el('imp-sync-activate');
    const annullaBtns = box ? [...box.querySelectorAll('.imp-sync-cancel')] : [];
    const input = el('imp-sync-input');
    const collegaBtn = el('imp-sync-link');
    const oraBtn = el('imp-sync-now');
    const mostraBtn = el('imp-sync-show');
    const scollegaBtn = el('imp-sync-unlink');
    const wipeBtn = el('imp-sync-wipe');
    const wipeBox = el('imp-sync-wipe-confirm');
    const wipeSi = el('imp-sync-wipe-yes');
    const wipeNo = el('imp-sync-wipe-no');
    const ultimaOut = el('imp-sync-last');
    const reinviaBtn = el('imp-sync-reupload');
    /* il testo con l'ora lo scrive il JS: apply() del cambio lingua non deve
       rimetterci il modello con "{ora}" */
    if (ultimaOut) ultimaOut.removeAttribute('data-i18n');

    let vista = 'off';            // off | create | have (da scollegato)
    let codiceNuovo = '';
    let codiceVisibile = false;
    let ultimoStato = null;       // { kind, key } dell'ultimo annuncio

    const oraBreve = (ms) => {
        if (!ms) return '';
        try {
            return new Intl.DateTimeFormat(lang(), { hour: '2-digit', minute: '2-digit' }).format(new Date(ms));
        } catch (e) { return ''; }
    };

    function annuncia(kind, key) {
        ultimoStato = { kind, key };
        if (statoOut) setStatus(statoOut, { kind, key });
    }

    /* #imp-sync-state e' aria-live: senza niente da dire resta VUOTA */
    function pulisci() {
        ultimoStato = null;
        if (!statoOut) return;
        setStatus(statoOut, { kind: 'idle' });
        statoOut.removeAttribute('data-i18n');
        statoOut.textContent = '';
    }

    function render() {
        if (!box) return;
        const s = sync.stato();
        const qui = s.attivo ? 'on' : vista;
        box.querySelectorAll('[data-sync-view]').forEach((v) => {
            v.hidden = v.getAttribute('data-sync-view') !== qui;
        });
        box.setAttribute('data-sync-stato', s.attivo ? (s.inCorso ? 'in-corso' : 'attivo') : 'spento');
        if (codiceBox) codiceBox.textContent = codiceNuovo;
        const mostra = s.attivo && codiceVisibile;
        if (codiceOn) {
            codiceOn.textContent = mostra ? s.codice : '';
            codiceOn.hidden = !mostra;
        }
        if (copiaOn) copiaOn.hidden = !mostra;
        if (mostraBtn) mostraBtn.setAttribute('aria-expanded', mostra ? 'true' : 'false');
        if (ultimaOut) ultimaOut.textContent = s.ultima ? t('sync-last', { ora: oraBreve(s.ultima) }) : '';
        if (wipeBox && !s.attivo) wipeBox.hidden = true;
        if (oraBtn) oraBtn.disabled = !!s.inCorso;
        if (reinviaBtn) {
            reinviaBtn.hidden = !(s.attivo && s.esito === 'vuoto-remoto');
            reinviaBtn.disabled = !!s.inCorso;
        }
        sync.collezioni().forEach((c) => scriviInterruttore(el('imp-sync-coll-' + c.coll), c.attiva));
        if (ultimoStato && statoOut) setStatus(statoOut, ultimoStato);
    }

    function vai(quale) {
        vista = quale;
        codiceVisibile = false;
        render();
    }

    const CHIAVI = {
        ok: ['ok', 'sync-done'],
        offline: ['denied', 'sync-off'],
        server: ['error', 'sync-fail'],
        pieno: ['error', 'sync-full'],
        grande: ['error', 'sync-too-big'],
        'vuoto-remoto': ['denied', 'sync-empty-remote']
    };

    /** Un giro a mano; senza rete si dice e basta, non si insiste. */
    async function giro({ manuale = false, forza = false } = {}) {
        const s = sync.stato();
        if (!s.attivo) return null;
        if (navigator.onLine === false) {
            if (manuale) annuncia('denied', 'sync-off');
            return null;
        }
        annuncia('busy', 'sync-doing');
        let esito;
        try { esito = await sync.sincronizza({ forza }); } catch (e) { esito = { esito: 'server' }; }
        return esito;
    }

    /* lo stato del modulo (anche i giri partiti da soli: apertura, 3 s dopo
       un salvataggio) arriva qui */
    let eraInCorso = false;
    sync.onStato((s) => {
        if (s.inCorso && !eraInCorso) annuncia('busy', 'sync-doing');
        if (!s.inCorso && eraInCorso && s.attivo && s.esito !== 'fermo') {
            const [kind, key] = CHIAVI[s.esito] || CHIAVI.server;
            annuncia(kind, key);
        }
        eraInCorso = s.inCorso;
        render();
    });

    /* quel che la sincronizzazione ha scritto nelle impostazioni: la pagina
       si rimette in pari (lingua, aspetto). applicaPreferenze() gira a fine
       giro, quindi si aspetta quello. */
    let daApplicare = false;
    onArchivio('impostazioni', (m) => {
        if (!m || m.origine !== 'sync' || typeof dopoArrivo !== 'function') return;
        if (sync.stato().inCorso) daApplicare = true;
        else dopoArrivo();
    }, { locali: true });
    sync.onStato((s) => {
        if (!s.inCorso && daApplicare && typeof dopoArrivo === 'function') {
            daApplicare = false;
            dopoArrivo();
        }
    });

    async function attivaCodice(codice) {
        try {
            await sync.collega(codice);
        } catch (e) {
            annuncia('error', 'sync-bad-code');
            return false;
        }
        codiceNuovo = '';
        codiceVisibile = false;
        vista = 'off';
        if (input) input.value = '';
        render();
        giro({ manuale: true });
        return true;
    }

    if (creaBtn) {
        creaBtn.addEventListener('click', async () => {
            try {
                codiceNuovo = await sync.creaCodice();
            } catch (e) {
                annuncia('error', 'sync-fail');
                return;
            }
            pulisci();
            vai('create');
        });
    }
    if (hoBtn) {
        hoBtn.addEventListener('click', () => {
            pulisci();
            vai('have');
            if (input) { try { input.focus({ preventScroll: true }); } catch (e) { /* niente fuoco */ } }
        });
    }
    async function copia(testo) {
        if (!testo) return;
        try {
            await navigator.clipboard.writeText(testo);
            annuncia('ok', 'sync-copied');
        } catch (e) {
            /* senza permesso resta il riquadro, che e' selezionabile a mano */
            annuncia('idle', 'sync-copy');
        }
    }
    if (copiaBtn) copiaBtn.addEventListener('click', () => copia(codiceNuovo));
    if (copiaOn) copiaOn.addEventListener('click', () => copia(sync.stato().codice));
    annullaBtns.forEach((b) => b.addEventListener('click', () => {
        codiceNuovo = '';
        if (input) input.value = '';
        pulisci();
        vai('off');
    }));
    if (attivaBtn) attivaBtn.addEventListener('click', () => { if (codiceNuovo) attivaCodice(codiceNuovo); });
    if (collegaBtn) collegaBtn.addEventListener('click', () => attivaCodice(input ? input.value : ''));
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); attivaCodice(input.value); }
        });
    }
    if (oraBtn) oraBtn.addEventListener('click', () => giro({ manuale: true }));
    /* il server e' vuoto (svuotato da un altro dispositivo): i dati di qui
       ripartono solo se lo chiede l'utente (spec 17 §6.7) */
    if (reinviaBtn) reinviaBtn.addEventListener('click', () => giro({ manuale: true, forza: true }));
    if (mostraBtn) {
        mostraBtn.addEventListener('click', () => {
            codiceVisibile = !codiceVisibile;
            render();
        });
    }
    if (scollegaBtn) {
        scollegaBtn.addEventListener('click', async () => {
            try { await sync.scollega({ elimina: false }); } catch (e) { annuncia('error', 'sync-fail'); return; }
            codiceNuovo = '';
            pulisci();
            vai('off');
        });
    }
    if (wipeBtn && wipeBox) {
        wipeBtn.setAttribute('aria-controls', 'imp-sync-wipe-confirm');
        wipeBtn.addEventListener('click', () => {
            wipeBox.hidden = false;
            if (wipeSi) { try { wipeSi.focus({ preventScroll: true }); } catch (e) { /* niente fuoco */ } }
        });
    }
    if (wipeNo && wipeBox) wipeNo.addEventListener('click', () => { wipeBox.hidden = true; });
    if (wipeSi) {
        wipeSi.addEventListener('click', async () => {
            annuncia('busy', 'sync-doing');
            try {
                await sync.scollega({ elimina: true });
            } catch (e) {
                annuncia(navigator.onLine === false ? 'denied' : 'error', navigator.onLine === false ? 'sync-off' : 'sync-fail');
                return;
            }
            if (wipeBox) wipeBox.hidden = true;
            codiceNuovo = '';
            vista = 'off';
            annuncia('ok', 'sync-done');
            render();
        });
    }
    /* un interruttore per collezione: locale, mai sincronizzato */
    sync.collezioni().forEach((c) => {
        interruttore(el('imp-sync-coll-' + c.coll), (on) => { sync.impostaCollezione(c.coll, on); });
    });

    render();
    /* il giro dell'apertura: solo con un codice gia' attivo */
    sync.avviaPagina().then(render).catch(() => { /* senza IndexedDB resta spenta */ });

    return { render, giro, attivaCodice };
}

/* ---------------- operazioni sui dati ---------------- */

/**
 * Tutto l'archivio in `toolbox-AAAA-MM-GG.json`. Stessi ripieghi di
 * penna/file.js: su iOS in standalone prima la condivisione del file, poi
 * il download, poi gli appunti.
 * -> 'condiviso' | 'scaricato' | 'copiato' | 'niente'
 */
export async function esportaFile(adesso = new Date()) {
    const dati = await esportaTutto();
    const nome = nomeFile(adesso);
    const json = JSON.stringify(dati, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    if (inStandaloneIos() && await condividiFile(blob, nome, 'application/json', nome)) return 'condiviso';
    if (scaricaBlob(blob, nome)) return 'scaricato';
    try {
        await navigator.clipboard.writeText(json);
        return 'copiato';
    } catch (e) {
        return 'niente';
    }
}

/**
 * La busta vecchia di Penna (`tiny-temple-penna`): testi senza sid, si
 * uniscono per id come fa Penna (penna/elenco.js `fondi`, vince il
 * `modificato` piu' recente). "Sostituisci": i testi che qui ci sono e nel
 * file no diventano lapidi; le altre collezioni non si toccano.
 * -> { nuovi, aggiornati, ignorati }
 */
export async function importaQuadernoPenna(testi, strategia = 'unisci') {
    const tutti = await elenca('penna');
    const locali = tutti.map((r) => ({ id: r.id, ...(r.dati || {}) }));
    if (strategia === 'sostituisci') {
        const nelFile = new Set(testi.map((x) => String(x.id)));
        for (const r of tutti) if (!nelFile.has(String(r.id))) await elimina('penna', r.id);
    }
    const esito = fondi(strategia === 'sostituisci' ? locali.filter((r) => testi.some((x) => String(x.id) === String(r.id))) : locali, testi);
    for (const rec of esito.daScrivere) {
        const { id, ...doc } = rec;
        await scrivi('penna', id, doc);
    }
    return { nuovi: esito.nuovi, aggiornati: esito.aggiornati, ignorati: testi.length - esito.daScrivere.length };
}

/**
 * "Cancella tutto": archivio (tutte le collezioni, senza lapidi),
 * preferenze `tt.*` di localStorage, pacchetti lingua in cache. Non tocca
 * la cache dell'app ne' il consenso al microfono (si revoca a parte).
 */
export async function cancellaTutto() {
    /* prima si scollega (senza toccare il server): altrimenti il giro dopo
       riporterebbe qui tutto quello che si voleva cancellare */
    try { await sync.scollega({ elimina: false }); } catch (e) { /* niente codice: niente da fare */ }
    await svuota();
    try {
        const ls = window.localStorage;
        const via = [];
        for (let i = 0; i < ls.length; i++) {
            const k = ls.key(i);
            if (k && k.indexOf('tt.') === 0) via.push(k);
        }
        via.forEach((k) => ls.removeItem(k));
    } catch (e) { /* localStorage bloccato: non c'era niente */ }
    try {
        if (typeof caches !== 'undefined') await caches.delete(pacchetti.CACHE_PACCHETTI);
    } catch (e) { /* niente Cache Storage */ }
    document.documentElement.classList.remove('tb-ridotte');
}

/* Avvio della pagina (nel browser; nei test il modulo si importa e basta). */
if (typeof document !== 'undefined'
    && ['imp-lingua-seg', 'imp-esporta', 'imp-versione', 'imp-pacchetti-lista'].some((id) => document.getElementById(id))) {
    init(commonDict, toolDict);
    pressFeedback(document);
    mountBar({ page: 'tool', current: TOOL });
    initPwa({
        installBtn: document.getElementById('tb-menu-install'),
        iosHelp: document.getElementById('tb-menu-ios'),
        installSection: document.querySelector('.tb-menu-install-group')
    });
    mountInfos(document);
    mountImpostazioni();
    /* «Come funziona», riga del primo avvio, tip dei pulsanti icona (spec 18 §6) */
    try { mountAiuto({ slug: TOOL }); } catch (e) { console.warn('[aiuto] non montato:', e && e.message); }
}
