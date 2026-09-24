/**
 * Tiny Temple Toolbox - Pianificatore di uscita (spec 15).
 *
 * Scritto CONTRO il markup di `index.html` e il dizionario di `i18n.js`
 * (builder): qui sotto c'e' solo cio' che il JS si aspetta e cio' che
 * scrive. Se un elemento manca, la funzione che lo usa si salta: la pagina
 * non esplode mai per un id assente.
 *
 * =====================================================================
 * ELEMENTI LETTI (tutti da index.html)
 * =====================================================================
 *   #pianificatore   <main>, data-pia-state="vuoto|modifica|piano|piani"
 *   #pia-plans (bottone "Piani")   #pia-new (bottone "Nuovo piano")
 *   #pia-empty
 *   #pia-form #pia-title #pia-type #pia-date #pia-profile #pia-distro
 *     #pia-notes #pia-form-error #pia-cancel #pia-save
 *     (il JS mette `novalidate` sul form: la validazione e' sua e il
 *      messaggio e' tradotto. `required` su #pia-date resta, ed e' il
 *      ripiego quando il JS non parte. #pia-form-error deve avere
 *      aria-live="polite": e' li' che l'errore viene annunciato.)
 *   #pia-plan #pia-plan-title #pia-plan-date #pia-plan-distro
 *     #pia-plan-notes #pia-badge #pia-count #pia-progress #pia-view
 *     #pia-list #pia-add #pia-recalc #pia-ics #pia-share #pia-print
 *     #pia-copy #pia-edit #pia-delete #pia-status
 *   [data-pia-panel="piani"] > #pia-plans-empty + #pia-plans-list
 *   #pia-sheet #pia-sheet-scrim #pia-sheet-title #pia-sheet-body
 *
 * STATI. `data-pia-state` su `#pianificatore`: `vuoto` (nessun piano),
 * `modifica` (modulo aperto), `piano` (piano aperto), `piani` (lista). Il
 * JS mette comunque [hidden] sui contenitori, quindi il CSS puo' anche
 * ignorare l'attributo.
 *
 * COSA SCRIVE IL JS (contratto con pianificatore.css)
 *   #pia-progress: role=progressbar, aria-valuemin/max/now in PERCENTUALE
 *     e la variabile --pia-pct, che `.pia-progress-fill` usa come width.
 *   #pia-list: un <li class="pia-step" data-pia-step="<id>"
 *     data-pia-state="fatta|scadenza|ritardo|futura"> per tappa:
 *       input.pia-check#pia-chk-<i> + label.pia-step-title[for]
 *       p.pia-step-when > time[datetime] + span.pia-step-days
 *         (+ span.pia-step-flag "in ritardo"/"in scadenza")
 *       p.pia-step-text
 *       button.tb-info (solo le tappe con un "perche'")
 *       button.tb-btn--icon.pia-step-menu
 *     In vista "Prossime" si aggiunge p.pia-step-plan col nome del piano.
 *     `aria-description` sulla casella quando lo stato va detto a parole.
 *   #pia-plans-list: <li class="pia-plan-row"> con
 *     button.pia-plan-open[data-pia-plan] > .pia-plan-name + .pia-plan-sub
 *   #pia-sheet-body: fogli "i", menu per tappa (.pia-sheet-menu), moduli
 *     rinomina/sposta/aggiungi (.pia-field + .pia-sheet-actions), conferme.
 *
 * =====================================================================
 * CHIAVI i18n USATE QUI (tutte gia' in i18n.js). I titoli e i testi delle
 * tappe NON stanno qui: ogni tappa porta le proprie chiavi da tappe.js,
 * tradotte con `vars` dove servono (i singoli d'album e il loro {n}).
 * =====================================================================
 *   pia-untitled pia-saved pia-save-fail pia-date-bad pia-done-count
 *   pia-progress-aria pia-due pia-late pia-today pia-in-days pia-days-ago
 *   pia-in-day pia-day-ago
 *   pia-custom pia-step-menu-aria pia-name pia-date pia-ok pia-cancel
 *   pia-add pia-add-title pia-rename pia-move pia-restore pia-delete-step
 *   pia-delete-step-ask pia-delete-ask pia-deleted pia-recalc
 *   pia-recalc-ask pia-recalc-done pia-share-fail pia-copy pia-copied
 *   pia-copy-manual pia-plans-empty pia-no-upcoming pia-distro-label
 *   pia-distro-<valore> pia-all pia-upcoming, piu' `info-aria` (comune).
 *
 * SALVATAGGIO (spec §4, archivio della spec 18 §3). collezione 'uscite', <id>, {
 *   titolo, tipo, data, profilo, distributore, note, rimosse,
 *   tappe: [{ id, titolo, testo, data, fatta, origine, chiaveTitolo,
 *            chiaveTesto, chiaveFoglio, vars, anticipo, spostata, peso }],
 *   creato, modificato }). Prefs: tt.pianificatore.{ultimo, profilo, vista}.
 * Su una tappa di serie `titolo`/`testo` restano `null` finche' l'utente non
 * li cambia: cosi' cambiando lingua cambiano anche loro (criterio §6.10).
 */

import commonDict from '/shared/i18n-common.js';
import toolDict from '/pianificatore-uscita/i18n.js';
import { init, t, lang, onChange } from '/shared/i18n.js';
import { pressFeedback, setStatus, toast } from '/shared/ui.js';
import { mountBar } from '/shared/nav.js';
import { initPwa } from '/shared/pwa.js';
import { mountSelects } from '/shared/select.js';
import { openSheet, closeSheet } from '/shared/sheet.js';
import { prefs, leggi, scrivi, elenca, elimina } from '/shared/archivio.js';
import { TIPI, PROFILI } from '/pianificatore-uscita/tappe.js';
import {
    generaTappe, nuovaPersonale, ricalcola, decora, conteggio, prossime,
    ordina, oggiIso, valida
} from '/pianificatore-uscita/timeline.js';
import { icsDaPiano, nomeFile } from '/pianificatore-uscita/ics.js';

const TOOL = 'pianificatore';            // chiave delle prefs (spec §4)
const SLUG = 'pianificatore-uscita';     // cartella e voce di menu
/* I piani stanno nell'archivio (spec 18 §3), collezione `uscite`; le prefs
   restano `tt.pianificatore.*`. Stesse forme di storage.js di prima:
   `list` -> [{ id, value }], `del` lascia la lapide. */
const USCITE = 'uscite';
const get = (_tool, id) => leggi(USCITE, id);
const put = (_tool, id, value) => scrivi(USCITE, id, value);
const list = () => elenca(USCITE).then((rs) => rs.map((r) => ({ id: r.id, value: r.dati })));
const del = (_tool, id) => elimina(USCITE, id);
/* "Non ancora scelto": nessun nome da mostrare nella riga della consegna. */
const SENZA_DISTRO = ['nessuno', 'nonscelto', ''];
const senzaDistro = (v) => SENZA_DISTRO.indexOf(v || '') >= 0;

/* gli stati di timeline.js hanno lo spazio, il markup una parola sola */
const CLASSE_STATO = {
    fatta: 'fatta', 'in ritardo': 'ritardo', 'in scadenza': 'scadenza', futura: 'futura'
};
/* stato detto a parole (spec §3): solo dove il colore da solo non basta */
const PAROLA_STATO = { 'in ritardo': 'pia-late', 'in scadenza': 'pia-due' };

const nuovoId = () => new Date().toISOString() + '-' + Math.random().toString(36).slice(2, 7);

/** Piano vuoto: e' la forma salvata in IndexedDB (spec §4 "Salvataggio"). */
export function pianoVuoto() {
    const ora = new Date().toISOString();
    return {
        titolo: '', tipo: 'singolo', data: '', profilo: 'completa',
        distributore: '', note: '', tappe: [], rimosse: [],
        creato: ora, modificato: ora
    };
}

/**
 * I testi di una tappa nella lingua corrente: quello scritto dall'utente
 * vince, altrimenti si traduce la chiave che `tappe.js` le ha dato. Per
 * questo su una tappa di serie `titolo` resta `null` finche' non la si
 * rinomina: cosi' cambiando lingua cambia anche lei (criterio §6.10).
 */
export function testiDi(tappa) {
    const vars = tappa.vars || undefined;
    return {
        titolo: tappa.titolo || (tappa.chiaveTitolo ? t(tappa.chiaveTitolo, vars) : t('pia-custom')),
        testo: tappa.testo || (tappa.chiaveTesto ? t(tappa.chiaveTesto, vars) : ''),
        perche: tappa.chiaveFoglio ? t(tappa.chiaveFoglio, vars) : ''
    };
}

/** Testo condiviso e copiato: una riga per tappa, con le date vere. */
export function testoPiano(piano) {
    const righe = [String(piano.titolo || t('pia-untitled'))];
    if (piano.data) righe.push(piano.data);
    righe.push('');
    ordina(piano.tappe || []).forEach((tp) => {
        righe.push((tp.fatta ? '[x] ' : '[ ] ') + tp.data + ' — ' + testiDi(tp).titolo);
    });
    return righe.join('\n');
}

export function mountPianificatore() {
    const root = document.getElementById('pianificatore') || document.querySelector('main');
    if (!root) return null;

    const el = (id) => document.getElementById(id);

    const emptyBox = el('pia-empty');

    const form = el('pia-form');
    const titleIn = el('pia-title');
    const typeBox = el('pia-type');
    const dateIn = el('pia-date');
    const profileBox = el('pia-profile');
    const distroIn = el('pia-distro');
    const notesIn = el('pia-notes');
    const formError = el('pia-form-error');

    const planBox = el('pia-plan');
    const planTitle = el('pia-plan-title');
    const planDate = el('pia-plan-date');
    const planDistro = el('pia-plan-distro');
    const planNotes = el('pia-plan-notes');
    const badge = el('pia-badge');
    const countOut = el('pia-count');
    const progress = el('pia-progress');
    const listBox = el('pia-list');
    const statusOut = el('pia-status');

    const viewBox = el('pia-view');
    const plansList = el('pia-plans-list');
    const plansEmpty = el('pia-plans-empty');
    const plansPanel = plansList ? (plansList.closest('[data-pia-panel]') || plansList.parentElement) : null;

    const sheet = el('pia-sheet');
    const sheetTitle = el('pia-sheet-title');
    const sheetBody = el('pia-sheet-body');

    const prefProfilo = prefs.get(TOOL, 'profilo', 'completa');

    const ui = {
        id: null,
        piano: null,
        stato: 'vuoto',
        vista: prefs.get(TOOL, 'vista', 'tutte') === 'prossime' ? 'prossime' : 'tutte',
        profilo: PROFILI.indexOf(prefProfilo) >= 0 ? prefProfilo : 'completa',
        tipo: 'singolo',
        tutti: [],
        oggi: oggiIso()
    };

    /* ---------------- stati ---------------- */

    function setStato(stato) {
        ui.stato = stato;
        root.setAttribute('data-pia-state', stato);
        if (emptyBox) emptyBox.hidden = stato !== 'vuoto';
        if (form) form.hidden = stato !== 'modifica';
        if (planBox) planBox.hidden = stato !== 'piano';
        if (plansPanel) plansPanel.hidden = stato !== 'piani';
    }

    /* ---------------- modulo ---------------- */

    function apriForm(piano) {
        const p = piano || pianoVuoto();
        if (titleIn) titleIn.value = p.titolo || '';
        if (dateIn) dateIn.value = p.data || '';
        if (notesIn) notesIn.value = p.note || '';
        ui.tipo = TIPI.indexOf(p.tipo) >= 0 ? p.tipo : 'singolo';
        ui.profilo = PROFILI.indexOf(p.profilo) >= 0 ? p.profilo : ui.profilo;
        segna(typeBox, 'data-pia-type', ui.tipo);
        segna(profileBox, 'data-pia-profile', ui.profilo);
        setDistro(p.distributore);
        pulisciErrore();
        setStato('modifica');
        if (titleIn) titleIn.focus();
    }

    /* `setStatus` non cancella il testo se non gli si da' una chiave: qui
       serve proprio svuotarlo, altrimenti l'errore della data resta scritto
       anche dopo un salvataggio andato bene. */
    function pulisciErrore() {
        if (dateIn) {
            dateIn.removeAttribute('aria-invalid');
            dateIn.removeAttribute('aria-errormessage');
        }
        if (!formError) return;
        setStatus(formError, { kind: 'idle' });
        formError.removeAttribute('data-i18n');
        formError.textContent = '';
    }

    /** Accende il bottone giusto di un .tb-segment (role=radio). */
    function segna(box, attributo, valore) {
        if (!box) return;
        box.querySelectorAll('[' + attributo + ']').forEach((b) => {
            const on = b.getAttribute(attributo) === valore;
            b.setAttribute('aria-checked', on ? 'true' : 'false');
            b.classList.toggle('is-active', on);
        });
    }

    function setDistro(v) {
        if (!distroIn) return;
        const esiste = [...distroIn.options].some((o) => o.value === v);
        const valore = esiste ? v : (distroIn.options[0] ? distroIn.options[0].value : '');
        if (distroIn.value === valore) return;
        distroIn.value = valore;
        /* select.js ascolta `change` sul nativo e allinea la pillola */
        distroIn.dispatchEvent(new Event('change', { bubbles: true }));
    }

    /** L'etichetta: la chiave i18n se esiste, altrimenti il testo dell'option
        (i marchi in index.html non hanno data-i18n). */
    function nomeDistro(valore) {
        if (senzaDistro(valore)) return '';
        const chiave = 'pia-distro-' + valore;
        const tradotto = t(chiave);
        if (tradotto !== chiave) return tradotto;
        const opt = distroIn ? [...distroIn.options].find((o) => o.value === valore) : null;
        return opt ? opt.textContent.trim() : valore;
    }

    /* ---------------- date a parole ---------------- */

    function fmtData(iso) {
        if (!valida(iso)) return '';
        const [y, m, d] = iso.split('-').map(Number);
        const date = new Date(Date.UTC(y, m - 1, d, 12));
        try {
            return new Intl.DateTimeFormat(lang(), {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'
            }).format(date);
        } catch (e) {
            return iso;
        }
    }

    function fmtGiorni(n) {
        if (!Number.isFinite(n)) return '';
        if (n === 0) return t('pia-today');
        /* singolare (spec 18 §7.8): "fra 1 giorno"/"1 giorno fa", non il
           plurale con {n}=1. Le chiavi -in-days/-days-ago restano per n >= 2. */
        if (n === 1) return t('pia-in-day');
        if (n === -1) return t('pia-day-ago');
        return n > 0 ? t('pia-in-days', { n }) : t('pia-days-ago', { n: -n });
    }

    /* ---------------- rendering del piano ---------------- */

    function render() {
        if (!ui.piano) { renderPiani(); setStato(ui.tutti.length ? 'piani' : 'vuoto'); return; }
        const piano = ui.piano;
        if (planTitle) planTitle.textContent = piano.titolo || t('pia-untitled');
        if (planDate) {
            planDate.textContent = fmtData(piano.data);
            planDate.setAttribute('datetime', piano.data || '');
        }
        if (planDistro) {
            const quale = nomeDistro(piano.distributore);
            planDistro.hidden = !quale;
            planDistro.textContent = quale ? t('pia-distro-label') + ': ' + quale : '';
        }
        if (planNotes) {
            planNotes.hidden = !piano.note;
            planNotes.textContent = piano.note || '';
        }

        const n = conteggio(piano.tappe, ui.oggi);
        if (countOut) countOut.textContent = t('pia-done-count', { n: n.fatte, tot: n.totale });
        if (progress) {
            progress.setAttribute('role', 'progressbar');
            progress.setAttribute('aria-valuemin', '0');
            progress.setAttribute('aria-valuemax', '100');
            progress.setAttribute('aria-valuenow', String(n.pct));
            progress.setAttribute('aria-label', t('pia-progress-aria'));
            progress.style.setProperty('--pia-pct', n.pct + '%');
        }
        if (badge) {
            badge.hidden = n.badge === 0;
            badge.textContent = t(n.inRitardo ? 'pia-late' : 'pia-due') + ' · ' + n.badge;
        }
        segna(viewBox, 'data-pia-view', ui.vista);
        renderLista();
        setStato('piano');
    }

    /** #pia-list: tutte le tappe del piano, oppure le tre prossime. */
    function renderLista() {
        if (!listBox) return;
        listBox.textContent = '';
        if (ui.vista === 'prossime') { renderProssime(); return; }
        decora(ui.piano.tappe, ui.oggi).forEach((tp, i) => listBox.appendChild(riga(tp, i)));
    }

    function riga(tp, i) {
        const testi = testiDi(tp);
        const li = document.createElement('li');
        li.className = 'pia-step';
        li.setAttribute('data-pia-step', String(tp.id));
        li.setAttribute('data-pia-state', CLASSE_STATO[tp.stato] || 'futura');
        const parola = PAROLA_STATO[tp.stato];

        const chkId = 'pia-chk-' + i;
        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.className = 'pia-check';
        chk.id = chkId;
        chk.checked = !!tp.fatta;
        /* lo stato anche a parole, non solo col colore (spec §3) */
        if (parola) chk.setAttribute('aria-description', t(parola));
        chk.addEventListener('change', () => spunta(tp.id, chk.checked));

        const label = document.createElement('label');
        label.className = 'pia-step-title';
        label.setAttribute('for', chkId);
        label.textContent = testi.titolo;

        const when = document.createElement('p');
        when.className = 'pia-step-when';
        const time = document.createElement('time');
        time.setAttribute('datetime', tp.data || '');
        time.textContent = fmtData(tp.data);
        when.appendChild(time);
        const giorni = fmtGiorni(tp.giorni);
        if (giorni) {
            const span = document.createElement('span');
            span.className = 'pia-step-days';
            span.textContent = giorni;
            when.appendChild(span);
        }
        if (parola) {
            const flag = document.createElement('span');
            flag.className = 'pia-step-flag';
            flag.textContent = t(parola);
            when.appendChild(flag);
        }

        li.append(chk, label, when);

        /* il distributore compare nella riga della consegna (spec §3) */
        const quale = tp.id === 'consegna' ? nomeDistro(ui.piano ? ui.piano.distributore : '') : '';
        const testo = [testi.testo, quale ? t('pia-distro-label') + ': ' + quale : '']
            .filter(Boolean).join(' · ');
        if (testo) {
            const p = document.createElement('p');
            p.className = 'pia-step-text';
            p.textContent = testo;
            li.appendChild(p);
        }

        if (testi.perche) {
            const info = document.createElement('button');
            info.type = 'button';
            info.className = 'tb-info';
            info.setAttribute('aria-haspopup', 'dialog');
            info.setAttribute('aria-expanded', 'false');
            info.setAttribute('aria-controls', 'pia-sheet');
            info.setAttribute('aria-label', t('info-aria'));
            const glifo = document.createElement('span');
            glifo.className = 'tb-info-glyph';
            glifo.setAttribute('aria-hidden', 'true');
            glifo.textContent = 'i';
            info.appendChild(glifo);
            info.addEventListener('click', () => apriFoglio({
                titolo: testi.titolo, testo: testi.perche, anchor: info
            }));
            li.appendChild(info);
        }

        const menu = document.createElement('button');
        menu.type = 'button';
        menu.className = 'tb-btn tb-btn--icon pia-step-menu';
        menu.setAttribute('aria-haspopup', 'dialog');
        menu.setAttribute('aria-expanded', 'false');
        menu.setAttribute('aria-label', t('pia-step-menu-aria', { tappa: testi.titolo }));
        menu.appendChild(icona('tb-icon-more'));
        menu.addEventListener('click', () => apriMenu(tp, menu));
        li.appendChild(menu);

        return li;
    }

    /* <svg><use href="#id"></use></svg>, come lo sprite di index.html */
    function icona(id) {
        const NS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('aria-hidden', 'true');
        const use = document.createElementNS(NS, 'use');
        use.setAttribute('href', '#' + id);
        svg.appendChild(use);
        return svg;
    }

    /**
     * Vista "Prossime": le tre tappe non spunte piu' vicine di TUTTI i
     * piani, col nome del piano (spec §3). Le righe di un altro piano non
     * hanno il menu: quelle modifiche si fanno aprendo il piano.
     */
    function renderProssime() {
        const piani = ui.tutti.map((r) => ({ id: r.id, titolo: (r.value || {}).titolo, tappe: (r.value || {}).tappe }));
        const righe = prossime(piani, { oggi: ui.oggi, limite: 3 });
        if (!righe.length) {
            const li = document.createElement('li');
            li.className = 'pia-step pia-step--empty';
            li.textContent = t('pia-no-upcoming');
            listBox.appendChild(li);
            return;
        }
        righe.forEach((r, i) => {
            const li = riga({ ...r.tappa, giorni: r.giorni, stato: r.stato }, i);
            const dove = document.createElement('p');
            dove.className = 'pia-step-plan';
            dove.textContent = r.pianoTitolo || t('pia-untitled');
            li.appendChild(dove);
            li.setAttribute('data-pia-plan', String(r.pianoId));
            /* la spunta deve agire sul piano giusto, non su quello aperto */
            const chk = li.querySelector('.pia-check');
            if (chk) {
                const clone = chk.cloneNode(true);
                chk.replaceWith(clone);
                clone.addEventListener('change', () => spuntaAltrove(r.pianoId, r.tappa.id, clone.checked));
            }
            const menu = li.querySelector('.pia-step-menu');
            if (menu && r.pianoId !== ui.id) menu.remove();
            listBox.appendChild(li);
        });
    }

    /* ---------------- lista dei piani ---------------- */

    function renderPiani() {
        if (!plansList) return;
        plansList.textContent = '';
        if (plansEmpty) plansEmpty.hidden = ui.tutti.length > 0;
        ui.tutti.slice().reverse().forEach((rec) => {
            const piano = rec.value || {};
            const n = conteggio(piano.tappe || [], ui.oggi);
            const li = document.createElement('li');
            li.className = 'pia-plan-row';
            const apriBtn = document.createElement('button');
            apriBtn.type = 'button';
            apriBtn.className = 'pia-plan-open';
            apriBtn.setAttribute('data-pia-plan', String(rec.id));
            const nome = document.createElement('span');
            nome.className = 'pia-plan-name';
            nome.textContent = piano.titolo || t('pia-untitled');
            const sotto = document.createElement('span');
            sotto.className = 'pia-plan-sub';
            sotto.textContent = [fmtData(piano.data), t('pia-done-count', { n: n.fatte, tot: n.totale })]
                .filter(Boolean).join(' · ');
            apriBtn.append(nome, sotto);
            apriBtn.addEventListener('click', () => apri(rec.id, piano));
            li.appendChild(apriBtn);
            plansList.appendChild(li);
        });
    }

    /* ---------------- fogli ---------------- */

    /**
     * Riempie #pia-sheet e lo apre. `menu` = colonna di bottoni;
     * `campi` = [{ id, etichetta, valore, tipo }]; `azioni` = riga in fondo.
     * Il foglio chiude con Esc, la X o lo scrim (shared/sheet.js) e
     * restituisce il fuoco al bottone che l'ha aperto.
     */
    function apriFoglio({ titolo, testo, menu, campi, azioni, anchor }) {
        if (!sheet || !sheetBody) return null;
        if (sheetTitle) {
            sheetTitle.removeAttribute('data-i18n');
            sheetTitle.textContent = titolo || '';
        }
        sheetBody.textContent = '';

        if (testo) {
            const p = document.createElement('p');
            p.className = 'pia-sheet-text';
            p.textContent = testo;
            sheetBody.appendChild(p);
        }

        if (menu && menu.length) {
            const col = document.createElement('div');
            col.className = 'pia-sheet-menu';
            menu.forEach((v) => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'tb-btn tb-btn--ghost';
                b.textContent = v.testo;
                b.addEventListener('click', () => { closeSheet({ restoreFocus: false }); v.onClick(); });
                col.appendChild(b);
            });
            sheetBody.appendChild(col);
        }

        const inputs = {};
        (campi || []).forEach((c) => {
            const wrap = document.createElement('div');
            wrap.className = 'pia-field';
            const id = 'pia-sheet-' + c.id;
            const label = document.createElement('label');
            label.setAttribute('for', id);
            label.textContent = c.etichetta || '';
            const input = document.createElement('input');
            input.id = id;
            input.type = c.tipo || 'text';
            input.className = c.tipo === 'date' ? 'pia-date-input' : 'pia-text-input';
            input.value = c.valore || '';
            if (c.tipo !== 'date') input.setAttribute('autocomplete', 'off');
            wrap.append(label, input);
            sheetBody.appendChild(wrap);
            inputs[c.id] = input;
        });

        if (azioni && azioni.length) {
            const row = document.createElement('div');
            row.className = 'pia-sheet-actions';
            azioni.forEach((a) => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'tb-btn' + (a.primario ? ' tb-btn--primary' : ' tb-btn--ghost');
                b.textContent = a.testo;
                b.addEventListener('click', () => {
                    const valori = {};
                    Object.keys(inputs).forEach((k) => { valori[k] = inputs[k].value; });
                    closeSheet();
                    if (typeof a.onClick === 'function') a.onClick(valori);
                });
                row.appendChild(b);
            });
            sheetBody.appendChild(row);
        }

        const aperto = openSheet(sheet, { anchor: anchor || null });
        const primo = Object.keys(inputs)[0];
        if (primo) inputs[primo].focus();
        return aperto;
    }

    function apriMenu(tp, anchor) {
        const testi = testiDi(tp);
        const voci = [
            { testo: t('pia-rename'), onClick: () => chiediRinomina(tp, anchor) },
            { testo: t('pia-move'), onClick: () => chiediSposta(tp, anchor) }
        ];
        /* una tappa di serie modificata resta ripristinabile (spec §3) */
        if (tp.origine === 'serie' && (tp.titolo || tp.spostata)) {
            voci.push({ testo: t('pia-restore'), onClick: () => ripristina(tp.id) });
        }
        voci.push({ testo: t('pia-delete-step'), onClick: () => chiediEliminaTappa(tp, anchor) });
        apriFoglio({ titolo: testi.titolo, menu: voci, anchor });
    }

    function chiediRinomina(tp, anchor) {
        apriFoglio({
            titolo: t('pia-rename'),
            campi: [{ id: 'nome', etichetta: t('pia-name'), valore: testiDi(tp).titolo }],
            azioni: [
                { testo: t('pia-cancel') },
                { testo: t('pia-ok'), primario: true, onClick: (v) => rinomina(tp.id, v.nome) }
            ],
            anchor
        });
    }

    function chiediSposta(tp, anchor) {
        apriFoglio({
            titolo: t('pia-move'),
            campi: [{ id: 'data', etichetta: t('pia-date'), valore: tp.data, tipo: 'date' }],
            azioni: [
                { testo: t('pia-cancel') },
                { testo: t('pia-ok'), primario: true, onClick: (v) => sposta(tp.id, v.data) }
            ],
            anchor
        });
    }

    function chiediAggiungi(anchor) {
        const quando = ui.piano && valida(ui.piano.data) ? ui.piano.data : ui.oggi;
        apriFoglio({
            titolo: t('pia-add-title'),
            campi: [
                { id: 'nome', etichetta: t('pia-name'), valore: '' },
                { id: 'data', etichetta: t('pia-date'), valore: quando, tipo: 'date' }
            ],
            azioni: [
                { testo: t('pia-cancel') },
                { testo: t('pia-add'), primario: true, onClick: (v) => aggiungi(v.nome, v.data) }
            ],
            anchor
        });
    }

    function chiediEliminaTappa(tp, anchor) {
        apriFoglio({
            titolo: testiDi(tp).titolo,
            testo: t('pia-delete-step-ask'),
            azioni: [
                { testo: t('pia-cancel') },
                { testo: t('pia-delete-step'), primario: true, onClick: () => eliminaTappa(tp.id) }
            ],
            anchor
        });
    }

    function chiediRicalcolo(anchor) {
        apriFoglio({
            titolo: t('pia-recalc'),
            testo: t('pia-recalc-ask'),
            azioni: [
                { testo: t('pia-cancel') },
                { testo: t('pia-recalc'), primario: true, onClick: () => applicaRicalcolo() }
            ],
            anchor
        });
    }

    function chiediEliminaPiano(id, piano, anchor) {
        apriFoglio({
            titolo: (piano && piano.titolo) || t('pia-untitled'),
            testo: t('pia-delete-ask'),
            azioni: [
                { testo: t('pia-cancel') },
                { testo: t('pia-delete-step'), primario: true, onClick: () => eliminaPiano(id) }
            ],
            anchor
        });
    }

    /* ---------------- modifiche alle tappe ---------------- */

    const trova = (id) => (ui.piano ? ui.piano.tappe.find((x) => x.id === id) : null) || null;

    function spunta(id, fatta) {
        const tp = trova(id);
        if (!tp) return;
        tp.fatta = !!fatta;
        salva();
        render();
    }

    /** Spunta una tappa che appartiene a un ALTRO piano (vista Prossime). */
    async function spuntaAltrove(pianoId, tappaId, fatta) {
        if (pianoId === ui.id) { spunta(tappaId, fatta); return; }
        const rec = ui.tutti.find((r) => r.id === pianoId);
        if (!rec || !rec.value) return;
        const tp = (rec.value.tappe || []).find((x) => x.id === tappaId);
        if (!tp) return;
        tp.fatta = !!fatta;
        rec.value.modificato = new Date().toISOString();
        try { await put(TOOL, pianoId, rec.value); } catch (e) { /* si riprova al prossimo tocco */ }
        renderLista();
    }

    function rinomina(id, valore) {
        const tp = trova(id);
        const nome = String(valore == null ? '' : valore).trim();
        if (!tp || !nome) return;
        tp.titolo = nome;
        salva();
        render();
    }

    function sposta(id, valore) {
        const tp = trova(id);
        if (!tp || !valida(valore)) return;
        tp.data = valore;
        if (tp.origine === 'serie') tp.spostata = true;
        ui.piano.tappe = ordina(ui.piano.tappe);
        salva();
        render();
    }

    function ripristina(id) {
        const tp = trova(id);
        if (!tp || tp.origine !== 'serie') return;
        tp.titolo = null;
        tp.testo = null;
        tp.spostata = false;
        ui.piano.tappe = ricalcola(ui.piano.tappe, ui.piano);
        salva();
        render();
    }

    function eliminaTappa(id) {
        if (!ui.piano) return;
        const tp = trova(id);
        ui.piano.tappe = ui.piano.tappe.filter((x) => x.id !== id);
        /* una tappa di serie tolta a mano non deve tornare al ricalcolo */
        if (tp && tp.origine === 'serie') {
            if (!Array.isArray(ui.piano.rimosse)) ui.piano.rimosse = [];
            if (ui.piano.rimosse.indexOf(id) < 0) ui.piano.rimosse.push(id);
        }
        salva();
        render();
        toast('pia-deleted');
    }

    function aggiungi(nome, data) {
        if (!ui.piano) return;
        const titolo = String(nome == null ? '' : nome).trim();
        if (!titolo) return;
        const quando = valida(data) ? data : (valida(ui.piano.data) ? ui.piano.data : ui.oggi);
        ui.piano.tappe = ordina([...ui.piano.tappe, nuovaPersonale(titolo, quando)]);
        salva();
        render();
    }

    /** "Ricalcola dalla data", dopo l'avviso del foglio (spec §3). */
    function applicaRicalcolo() {
        if (!ui.piano) return;
        ui.piano.tappe = ricalcola(ui.piano.tappe, ui.piano);
        salva();
        render();
        toast('pia-recalc-done');
    }

    /* ---------------- piani ---------------- */

    async function salva() {
        if (!ui.piano || !ui.id) return;
        ui.piano.modificato = new Date().toISOString();
        try {
            await put(TOOL, ui.id, ui.piano);
            prefs.set(TOOL, 'ultimo', ui.id);
            if (statusOut) {
                statusOut.setAttribute('data-i18n', 'pia-saved');
                statusOut.textContent = t('pia-saved');
            }
            await caricaTutti();
        } catch (e) {
            if (statusOut) setStatus(statusOut, { kind: 'error', key: 'pia-save-fail' });
        }
    }

    async function caricaTutti() {
        try { ui.tutti = await list(TOOL); } catch (e) { ui.tutti = []; }
        renderPiani();
        return ui.tutti;
    }

    function apri(id, piano) {
        ui.id = id;
        ui.piano = { ...pianoVuoto(), ...piano };
        if (!Array.isArray(ui.piano.tappe)) ui.piano.tappe = [];
        if (!Array.isArray(ui.piano.rimosse)) ui.piano.rimosse = [];
        ui.piano.tappe = ordina(ui.piano.tappe);
        prefs.set(TOOL, 'ultimo', id);
        render();
    }

    async function eliminaPiano(id) {
        if (!id) return;
        try { await del(TOOL, id); } catch (e) { /* niente da fare */ }
        if (ui.id === id) { ui.id = null; ui.piano = null; prefs.set(TOOL, 'ultimo', undefined); }
        await caricaTutti();
        toast('pia-deleted');
        setStato(ui.tutti.length ? 'piani' : 'vuoto');
    }

    /** Submit del modulo: crea un piano o aggiorna quello aperto. */
    function salvaForm(e) {
        if (e) e.preventDefault();
        const data = dateIn ? dateIn.value : '';
        if (!valida(data)) {
            if (formError) {
                setStatus(formError, { kind: 'error', key: 'pia-date-bad' });
                formError.textContent = t('pia-date-bad');
            }
            if (dateIn) {
                dateIn.setAttribute('aria-invalid', 'true');
                if (formError) dateIn.setAttribute('aria-errormessage', formError.id);
                dateIn.focus();
            }
            return;
        }
        const nuovo = !ui.piano;
        const base = nuovo ? pianoVuoto() : ui.piano;
        const cambiata = base.data !== data || base.tipo !== ui.tipo || base.profilo !== ui.profilo;
        base.titolo = titleIn ? titleIn.value.trim() : '';
        base.tipo = ui.tipo;
        base.profilo = ui.profilo;
        base.data = data;
        base.distributore = distroIn ? distroIn.value : '';
        base.note = notesIn ? notesIn.value : '';
        prefs.set(TOOL, 'profilo', ui.profilo);
        pulisciErrore();

        if (nuovo) {
            base.tappe = generaTappe(base);
            ui.id = nuovoId();
            ui.piano = base;
        } else if (cambiata) {
            /* cambiare data, tipo o profilo dal modulo ricalcola subito: la
               conferma l'ha gia' data chi ha premuto "Crea il piano" */
            ui.piano.tappe = ricalcola(ui.piano.tappe, ui.piano);
        }
        salva();
        render();
    }

    /* ---------------- uscite ---------------- */

    function pianoPerIcs() {
        return {
            id: ui.id,
            titolo: ui.piano.titolo || t('pia-untitled'),
            tappe: ordina(ui.piano.tappe).map((tp) => {
                const testi = testiDi(tp);
                return { id: tp.id, data: tp.data, titolo: testi.titolo, testo: testi.testo };
            })
        };
    }

    function fileIcs() {
        const testo = icsDaPiano(pianoPerIcs());
        const blob = new Blob([testo], { type: 'text/calendar;charset=utf-8' });
        return { testo, blob, nome: nomeFile(ui.piano) };
    }

    function scarica() {
        if (!ui.piano) return false;
        try {
            const { blob, nome } = fileIcs();
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
            toast('pia-share-fail');
            return false;
        }
    }

    /**
     * Ripiego a cascata della spec §7: Web Share col file -> Web Share col
     * testo -> download -> foglio col testo dell'.ics e "Copia" (in
     * standalone su iOS il download di un Blob e' capriccioso).
     */
    async function condividi() {
        if (!ui.piano) return;
        const { testo, blob, nome } = fileIcs();
        const titolo = ui.piano.titolo || t('pia-untitled');
        if (typeof File === 'function' && navigator.canShare && navigator.share) {
            try {
                const file = new File([blob], nome, { type: 'text/calendar' });
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({ files: [file], title: titolo });
                    return;
                }
            } catch (e) { /* annullato o non permesso: si scende di un gradino */ }
        }
        if (navigator.share) {
            try { await navigator.share({ title: titolo, text: testoPiano(ui.piano) }); return; }
            catch (e) { /* si scende ancora */ }
        }
        if (scarica()) { toast('pia-share-fail'); return; }
        apriFoglio({
            titolo,
            testo,
            azioni: [{ testo: t('pia-copy'), primario: true, onClick: () => copia(testo) }]
        });
    }

    async function copia(testo) {
        const contenuto = testo || (ui.piano ? testoPiano(ui.piano) : '');
        if (!contenuto) return;
        try { await navigator.clipboard.writeText(contenuto); toast('pia-copied'); }
        catch (e) { toast('pia-copy-manual'); }
    }

    /* ---------------- eventi ---------------- */

    if (form) {
        /* `#pia-date` e' `required` in index.html: senza JS il browser blocca
           il submit da solo (ripiego giusto). Con il JS acceso la validazione
           nativa va spenta, altrimenti mostrerebbe il suo tooltip NELLA LINGUA
           DEL BROWSER, in inglese anche con l'interfaccia in italiano. Il
           messaggio giusto e' `pia-date-bad` in #pia-form-error, che e'
           aria-live: lo annuncia anche chi usa uno screen reader. */
        form.noValidate = true;
        form.setAttribute('novalidate', '');
        form.addEventListener('submit', salvaForm);
    }
    const saveBtn = el('pia-save');
    if (saveBtn && saveBtn.type !== 'submit') saveBtn.addEventListener('click', salvaForm);
    const cancelBtn = el('pia-cancel');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            if (ui.piano) render();
            else setStato(ui.tutti.length ? 'piani' : 'vuoto');
        });
    }

    const newBtn = el('pia-new');
    if (newBtn) newBtn.addEventListener('click', () => { ui.id = null; ui.piano = null; apriForm(null); });
    const editBtn = el('pia-edit');
    if (editBtn) editBtn.addEventListener('click', () => apriForm(ui.piano));
    const plansBtn = el('pia-plans');
    if (plansBtn) plansBtn.addEventListener('click', () => { renderPiani(); setStato('piani'); });

    if (typeBox) {
        typeBox.addEventListener('click', (e) => {
            const b = e.target.closest('[data-pia-type]');
            if (!b) return;
            ui.tipo = b.getAttribute('data-pia-type');
            segna(typeBox, 'data-pia-type', ui.tipo);
        });
    }
    if (profileBox) {
        profileBox.addEventListener('click', (e) => {
            const b = e.target.closest('[data-pia-profile]');
            if (!b) return;
            ui.profilo = b.getAttribute('data-pia-profile');
            segna(profileBox, 'data-pia-profile', ui.profilo);
        });
    }
    if (viewBox) {
        viewBox.addEventListener('click', (e) => {
            const b = e.target.closest('[data-pia-view]');
            if (!b) return;
            ui.vista = b.getAttribute('data-pia-view') === 'prossime' ? 'prossime' : 'tutte';
            prefs.set(TOOL, 'vista', ui.vista);
            segna(viewBox, 'data-pia-view', ui.vista);
            renderLista();
        });
    }

    const addBtn = el('pia-add');
    if (addBtn) addBtn.addEventListener('click', () => chiediAggiungi(addBtn));
    const recalcBtn = el('pia-recalc');
    if (recalcBtn) recalcBtn.addEventListener('click', () => chiediRicalcolo(recalcBtn));
    const icsBtn = el('pia-ics');
    if (icsBtn) icsBtn.addEventListener('click', () => scarica());
    const shareBtn = el('pia-share');
    if (shareBtn) shareBtn.addEventListener('click', condividi);
    const printBtn = el('pia-print');
    if (printBtn) printBtn.addEventListener('click', () => window.print());
    const copyBtn = el('pia-copy');
    if (copyBtn) copyBtn.addEventListener('click', () => copia());
    const delBtn = el('pia-delete');
    if (delBtn) delBtn.addEventListener('click', () => chiediEliminaPiano(ui.id, ui.piano, delBtn));

    /* cambiando lingua cambiano titoli delle tappe, date e parole di stato */
    onChange(() => { if (ui.stato === 'piano') render(); else renderPiani(); });

    /* tornando dopo mezzanotte "in scadenza" deve riallinearsi */
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return;
        const adesso = oggiIso();
        if (adesso === ui.oggi) return;
        ui.oggi = adesso;
        if (ui.stato === 'piano') render(); else renderPiani();
    });

    /* ---------------- avvio ---------------- */

    mountSelects(document);
    segna(typeBox, 'data-pia-type', ui.tipo);
    segna(profileBox, 'data-pia-profile', ui.profilo);
    segna(viewBox, 'data-pia-view', ui.vista);
    setStato('vuoto');

    const pronto = (async () => {
        await caricaTutti();
        const ultimo = prefs.get(TOOL, 'ultimo', null);
        if (ultimo) {
            const rec = ui.tutti.find((r) => r.id === ultimo);
            if (rec) { apri(rec.id, rec.value); return; }
            try {
                const piano = await get(TOOL, ultimo);
                if (piano) { apri(ultimo, piano); return; }
            } catch (e) { /* il piano non c'e' piu' */ }
        }
        setStato(ui.tutti.length ? 'piani' : 'vuoto');
    })();

    return {
        ui, pronto,
        apri, apriForm, salvaForm, salva, caricaTutti, render, renderPiani,
        spunta, spuntaAltrove, rinomina, sposta, ripristina, eliminaTappa, aggiungi,
        applicaRicalcolo, eliminaPiano, scarica, condividi, copia,
        fileIcs, pianoPerIcs, testiDi,
        testoPiano: () => testoPiano(ui.piano || pianoVuoto()),
        piano: () => ui.piano
    };
}

/* Avvio della pagina (nel browser; nei test il modulo si importa e basta). */
if (typeof document !== 'undefined' && document.getElementById('pianificatore')) {
    init(commonDict, toolDict);
    pressFeedback(document);
    mountBar({ page: 'tool', current: SLUG });
    initPwa({
        installBtn: document.getElementById('tb-menu-install'),
        iosHelp: document.getElementById('tb-menu-ios'),
        installSection: document.querySelector('.tb-menu-install-group')
    });
    mountPianificatore();
}
