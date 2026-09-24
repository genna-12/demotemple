/**
 * Tiny Temple Toolbox - Penna: i file del quaderno (spec 16 §3/§4).
 *
 * Esporta tutto (.json), importa, condividi il testo (.txt), stampa.
 * Nessuna richiesta di rete: il download e' `URL.createObjectURL` +
 * `<a download>`, lo stesso di `pianificatore.js` sotto questa CSP, con lo
 * stesso ripiego (foglio col testo e "Copia") quando iOS in standalone lo
 * rifiuta. Chi chiama passa `ripiego({ titolo, testo })`: il foglio e' roba
 * di penna.js, qui si decide solo quando serve.
 *
 * Niente i18n qui dentro: queste funzioni tornano l'esito ('file',
 * 'scaricato', 'copiato'...) e i messaggi li sceglie penna.js.
 */

export const MARCA = 'tiny-temple-penna';
export const VERSIONE_FILE = 1;
/* la busta di tutto l'archivio (spec 18 §3/§5, `esportaTutto()`) */
export const MARCA_ARCHIVIO = 'tiny-temple-toolbox';

const due = (n) => String(n).padStart(2, '0');

/** quaderno-AAAA-MM-GG.json (data locale: e' il nome che vede chi scarica). */
export function nomeQuaderno(data = new Date()) {
    return 'quaderno-' + data.getFullYear() + '-' + due(data.getMonth() + 1) + '-' + due(data.getDate()) + '.json';
}

/** La busta del file esportato: `testi` e' [{ id, ...documento }]. */
export function costruisciQuaderno(testi, adesso = new Date()) {
    return {
        tipo: MARCA,
        versione: VERSIONE_FILE,
        esportato: adesso.toISOString(),
        testi: Array.isArray(testi) ? testi : []
    };
}

function ripulisci(v) {
    if (!v || typeof v !== 'object') return null;
    const id = v.id;
    if (typeof id !== 'string' || !id.trim()) return null;
    if (typeof v.testo !== 'string' && typeof v.titolo !== 'string') return null;
    const dialefe = {};
    if (v.dialefe && typeof v.dialefe === 'object') {
        Object.keys(v.dialefe).forEach((k) => {
            const arr = v.dialefe[k];
            if (Array.isArray(arr)) dialefe[k] = arr.filter((n) => Number.isInteger(n));
        });
    }
    const creato = typeof v.creato === 'string' ? v.creato : '';
    return {
        id: id.trim(),
        titolo: typeof v.titolo === 'string' ? v.titolo : '',
        testo: typeof v.testo === 'string' ? v.testo : '',
        creato: creato || (typeof v.modificato === 'string' ? v.modificato : ''),
        modificato: typeof v.modificato === 'string' ? v.modificato : creato,
        dialefe,
        lingua: typeof v.lingua === 'string' && v.lingua ? v.lingua : 'it',
        emuet: !!v.emuet
    };
}

/**
 * Legge un file esportato. -> [{ id, ...documento }] (anche vuoto, se il
 * quaderno lo era) oppure null se non e' un quaderno: allora non si tocca
 * niente e si dice `penna-import-fail` (spec 16 §6.7).
 * Accetta tre forme: la busta del quaderno (`tipo: tiny-temple-penna`, quella
 * che Penna esporta, anche dai file gia' scaricati), un array nudo di testi,
 * e la busta di tutto l'archivio della spec 18 (`app: tiny-temple-toolbox`),
 * di cui prende i testi vivi della collezione `penna`.
 */
export function leggiQuaderno(testoJson) {
    let dati = null;
    try { dati = JSON.parse(String(testoJson)); } catch (e) { return null; }
    if (Array.isArray(dati)) {
        const fuori = dati.map(ripulisci).filter(Boolean);
        return fuori.length ? fuori : null;      // un array qualunque non basta
    }
    if (!dati || typeof dati !== 'object') return null;
    if (dati.app === MARCA_ARCHIVIO && dati.collezioni && typeof dati.collezioni === 'object') {
        const recs = dati.collezioni.penna;
        if (!Array.isArray(recs)) return null;
        return recs
            .filter((r) => r && !r.cancellato && r.dati && typeof r.dati === 'object')
            .map((r) => ripulisci({ ...r.dati, id: typeof r.id === 'string' ? r.id : '' }))
            .filter(Boolean);
    }
    if (dati.tipo !== MARCA || !Array.isArray(dati.testi)) return null;
    return dati.testi.map(ripulisci).filter(Boolean);
}

/** Il .txt condiviso: titolo, riga vuota, versi; fine riga sempre `\n`. */
export function testoTxt(titolo, testo) {
    const corpo = String(testo == null ? '' : testo).replace(/\r\n?/g, '\n');
    const capo = String(titolo == null ? '' : titolo).trim();
    return capo ? capo + '\n\n' + corpo : corpo;
}

/** Nome di file accettabile ovunque a partire dal titolo. */
export function nomeTxt(titolo, senzaTitolo = 'testo') {
    const base = String(titolo == null ? '' : titolo)
        .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^\.+/, '')
        .slice(0, 60)
        .trim();
    return (base || senzaTitolo) + '.txt';
}

/** Download vero e proprio. -> true se il browser l'ha accettato. */
export function scaricaBlob(blob, nome) {
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
export function inStandaloneIos() {
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

/** Web Share con un file allegato. -> true solo se e' andata davvero. */
export async function condividiFile(blob, nome, tipo, titolo) {
    if (typeof File !== 'function' || !navigator.canShare || !navigator.share) return false;
    try {
        const file = new File([blob], nome, { type: tipo });
        if (!navigator.canShare({ files: [file] })) return false;
        await navigator.share({ files: [file], title: titolo });
        return true;
    } catch (e) {
        return false;      // annullato o non permesso: si scende di un gradino
    }
}

/**
 * Esporta tutto il quaderno. -> 'condiviso' | 'scaricato' | 'foglio' | 'niente'
 * In standalone su iOS si prova prima la condivisione del file, perche' li'
 * il download di un Blob e' capriccioso (spec 16 §2).
 */
export async function esporta(testi, { ripiego, adesso = new Date() } = {}) {
    const nome = nomeQuaderno(adesso);
    const json = JSON.stringify(costruisciQuaderno(testi, adesso), null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    if (inStandaloneIos() && await condividiFile(blob, nome, 'application/json', nome)) return 'condiviso';
    if (scaricaBlob(blob, nome)) return 'scaricato';
    if (typeof ripiego === 'function') { ripiego({ titolo: nome, testo: json }); return 'foglio'; }
    return 'niente';
}

/** Legge il file scelto nell'`<input type="file">`. -> testo o null. */
export function leggiFileScelto(file) {
    return new Promise((resolve) => {
        if (!file || typeof FileReader !== 'function') { resolve(null); return; }
        const fr = new FileReader();
        fr.onload = () => resolve(typeof fr.result === 'string' ? fr.result : null);
        fr.onerror = () => resolve(null);
        try { fr.readAsText(file); } catch (e) { resolve(null); }
    });
}

/**
 * Condivide un testo come `.txt` (spec 16 §3): Web Share col file ->
 * Web Share col testo (il "Condividi" della 14, resta come ripiego) ->
 * download -> copia -> foglio.
 * -> 'file' | 'testo' | 'scaricato' | 'copiato' | 'foglio' | 'niente'
 */
export async function condividi({ titolo, testo, ripiego } = {}) {
    const corpo = testoTxt(titolo, testo);
    if (!corpo.trim()) return 'niente';
    const nome = nomeTxt(titolo);
    const blob = new Blob([corpo], { type: 'text/plain;charset=utf-8' });
    if (await condividiFile(blob, nome, 'text/plain', titolo || nome)) return 'file';
    if (navigator.share) {
        try { await navigator.share({ title: titolo || nome, text: corpo }); return 'testo'; }
        catch (e) { /* annullato o non permesso: si scende ancora */ }
    }
    if (scaricaBlob(blob, nome)) return 'scaricato';
    try { await navigator.clipboard.writeText(corpo); return 'copiato'; }
    catch (e) { /* appunti negati: resta il foglio */ }
    if (typeof ripiego === 'function') { ripiego({ titolo: titolo || nome, testo: corpo }); return 'foglio'; }
    return 'niente';
}

/**
 * Stampa la pagina (il CSS lascia solo titolo e versi). `prima`/`dopo`
 * servono a far crescere la textarea in altezza di stampa e a rimetterla
 * com'era: in `print` il corpo cambia font e interlinea, e l'altezza in
 * pixel scritta da `misuraRighe()` taglierebbe il testo.
 */
export function stampa({ prima, dopo } = {}) {
    let fatto = false;
    const rimetti = () => {
        if (fatto) return;
        fatto = true;
        window.removeEventListener('afterprint', rimetti);
        try { if (typeof dopo === 'function') dopo(); } catch (e) { /* niente da fare */ }
    };
    try { if (typeof prima === 'function') prima(); } catch (e) { /* si stampa comunque */ }
    window.addEventListener('afterprint', rimetti);
    try { window.print(); } catch (e) { /* stampa non disponibile */ }
    /* Safari/iOS non manda sempre `afterprint`: una rete di sicurezza. */
    setTimeout(rimetti, 2000);
}
