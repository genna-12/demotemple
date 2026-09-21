/**
 * Tiny Temple Toolbox - il rimario italiano fuori dal thread della pagina
 * (spec 14 §4).
 *
 * Module worker: scarica i tre file di /penna/data/, costruisce l'indice in
 * memoria e risponde alle ricerche. Se il browser non regge i module worker,
 * penna.js importa QUESTO stesso file e chiama `creaRimario()` sul thread
 * principale: stesso codice, stessi risultati, solo piu' lento (come la 13).
 *
 * Messaggi in ingresso:
 *   { type: 'carica', base, lang }            scarica e indicizza UNA lingua
 *   { type: 'cerca', id, parola, tipo, sillabe, forza }
 * In uscita:
 *   { type: 'progresso', fatto, totale }
 *   { type: 'pronto', parole }
 *   { type: 'risultati', id, voci, sconosciuta, chiave, classe, stimato }
 *   { type: 'errore', message }
 *
 * L'indice: `parole` (l'indice di riga E' il rango di frequenza), `tratti`
 * (un byte per parola: 5 bit sillabe, 2 bit classe, 1 bit "accento stimato")
 * e una mappa chiave di rima -> indici. Assonanza e consonanza NON hanno un
 * indice sul disco: si ricavano al caricamento raggruppando le chiavi di
 * rima per vocali e per consonanti (le stesse informazioni, zero byte in
 * piu' da scaricare).
 */

import { CLASSI } from '/shared/testo/sillabe.js';
import { LINGUE, normalizzaCodice, cartella, moduli, fileDati } from '/shared/testo/lingue.js';

const SUFFISSO_MIN = 2;      // analogia ortografica: almeno due lettere
const MAX_RISULTATI = 300;
const VOCALI = 'aeiou';

/** "1f.2.3" -> [51, 53, 56] (differenze in base 36). */
export function decodifica(testo) {
    if (!testo) return [];
    const parti = String(testo).split('.');
    const out = new Array(parti.length);
    let acc = 0;
    for (let i = 0; i < parti.length; i++) {
        acc += parseInt(parti[i], 36);
        out[i] = acc;
    }
    return out;
}

const soloVocali = (k) => [...k].filter((c) => VOCALI.indexOf(c) !== -1).join('');

export function creaRimario({ radice = '' } = {}) {
    let lingua = 'it';
    let regole = null;          // { sillabe, fonetica } della lingua attiva
    let parole = [];
    let tratti = new Uint8Array(0);
    let mappaRima = new Map();
    let mappaMulti = new Map();
    let mappaVocali = new Map();
    let mappaCons = new Map();
    let indiceDiParola = new Map();
    let perSuffisso = new Map();   // analogia: suffisso scritto -> indice
    let rimaDi = null;             // indice inverso (EN/FR): indice -> chiave
    let consDi = null;
    let multiDi = null;
    let pronto = false;

    const chiaviDi = (parola, opts) => (regole ? regole.fonetica.chiavi(parola, opts) : { parola, rima: '', vocali: '', consonanti: '', multi: '', classe: 'piana', esito: 'stimato', sillabe: [] });

    /**
     * Analogia ortografica (spec 14b §4): per una parola che il dizionario
     * non ha, si cerca la parola NOTA con il suffisso scritto piu' lungo in
     * comune (almeno due lettere) e le si prende la chiave. In inglese e in
     * francese la chiave viene dalla pronuncia, che dalla scrittura non si
     * ricava: meglio una stima dichiarata che un risultato sbagliato dato
     * per buono.
     */
    function perAnalogia(parola) {
        for (let n = Math.min(8, parola.length); n >= SUFFISSO_MIN; n--) {
            const i = perSuffisso.get(parola.slice(-n));
            if (i !== undefined) return { indice: i, lettere: n };
        }
        return null;
    }

    /**
     * L'indice per ASSONANZA non sta sul disco: le vocali sono gia' dentro
     * la chiave di rima, quindi si raggruppano le chiavi al caricamento
     * ("ore" e "ole" finiscono insieme in "oe"). Zero byte da scaricare.
     * La consonanza invece parte dalla sillaba tonica (la "m" di "amore"),
     * che nella chiave di rima non c'e': quella mappa arriva dal file.
     */
    function derivate() {
        const perVocali = new Map();
        mappaRima.forEach((indici, chiave) => {
            const v = soloVocali(chiave);
            if (!v) return;
            const a = perVocali.get(v);
            if (a) a.push(indici); else perVocali.set(v, [indici]);
        });
        mappaVocali = new Map();
        perVocali.forEach((liste, chiave) => {
            let n = 0;
            liste.forEach((l) => { n += l.length; });
            const arr = new Int32Array(n);
            let o = 0;
            liste.forEach((l) => { arr.set(l, o); o += l.length; });
            arr.sort();   // l'indice e' il rango: ordinati = gia' per frequenza
            mappaVocali.set(chiave, arr);
        });
    }

    /** Indicizza quello che si ha in memoria (serve anche a `usaDati`). */
    function indicizza(json) {
        mappaRima = new Map();
        mappaMulti = new Map();
        mappaCons = new Map();
        if (json) {
            Object.keys(json.rima || {}).forEach((k) => mappaRima.set(k, Int32Array.from(decodifica(json.rima[k]))));
            Object.keys(json.multi || {}).forEach((k) => mappaMulti.set(k, Int32Array.from(decodifica(json.multi[k]))));
            Object.keys(json.cons || {}).forEach((k) => mappaCons.set(k, Int32Array.from(decodifica(json.cons[k]))));
        }
        indicizzaSoloParole();
    }

    /**
     * Indice INVERSO (tutte le lingue che spediscono le chiavi): dall'indice
     * della parola alla sua chiave. In EN e FR la chiave viene dalla
     * pronuncia; in IT dal Wikizionario (sillabazione e accento veri, v2):
     * dalla scrittura non si ricava, quindi per una parola nota si legge di
     * qui invece di ricalcolarla sbagliata ("pa-u-ra", non "pau-ra"). Si
     * costruisce dalle mappe gia' in memoria: zero byte in piu' (spec 14b §4).
     * Lo spagnolo (chiavi derivate dalle regole) non ne ha bisogno.
     */
    function inverso() {
        if (LINGUE[lingua].derivate) { rimaDi = null; consDi = null; multiDi = null; return; }
        rimaDi = new Array(parole.length);
        consDi = new Array(parole.length);
        multiDi = new Array(parole.length);
        const riempi = (mappa, dove) => mappa.forEach((arr, k) => {
            for (let j = 0; j < arr.length; j++) if (dove[arr[j]] === undefined) dove[arr[j]] = k;
        });
        riempi(mappaRima, rimaDi);
        riempi(mappaCons, consDi);
        riempi(mappaMulti, multiDi);
    }

    /**
     * Chiavi e tratti ricostruiti dalle regole: e' il caso dello spagnolo,
     * che cosi' scarica 0,45 MB invece di 0,8 (spec 14b §4). Costa meno di
     * un secondo su 150 000 forme.
     */
    function costruisciDaRegole() {
        const rima = new Map();
        const cons = new Map();
        const multi = new Map();
        tratti = new Uint8Array(parole.length);
        const spingi = (m, k, i) => { if (!k) return; const a = m.get(k); if (a) a.push(i); else m.set(k, [i]); };
        parole.forEach((p, i) => {
            const k = chiaviDi(p);
            spingi(rima, k.rima, i);
            spingi(cons, k.consonanti, i);
            spingi(multi, k.multi, i);
            const n = Array.isArray(k.sillabe) ? k.sillabe.length : (k.conta || 1);
            tratti[i] = (Math.min(31, n) << 3) | (CLASSI.indexOf(k.classe) << 1) | (k.esito === 'esatto' ? 0 : 1);
        });
        mappaRima = new Map();
        rima.forEach((v, k) => mappaRima.set(k, Int32Array.from(v)));
        mappaCons = new Map();
        cons.forEach((v, k) => mappaCons.set(k, Int32Array.from(v)));
        mappaMulti = new Map();
        multi.forEach((v, k) => mappaMulti.set(k, Int32Array.from(v)));
    }

    /**
     * Carica UNA lingua (spec 14b): azzera tutto, prende i file dalla sua
     * cartella e indicizza. Un pacchetto alla volta, come dice la spec.
     */
    async function carica(base = '/penna/data/', onProgresso = null, codice = 'it') {
        const lang = normalizzaCodice(codice);
        const spec = LINGUE[lang];
        const dir = cartella(lang, base);
        const FILE = fileDati(lang);
        const passi = spec.derivate ? 2 : 3;
        const avanti = (fatto) => { if (onProgresso) onProgresso(fatto, passi); };
        avanti(0);
        regole = await moduli(lang, { radice });
        lingua = lang;
        const testo = await fetch(dir + FILE.parole).then((r) => {
            if (!r.ok) throw new Error('parole: HTTP ' + r.status);
            return r.text();
        });
        parole = testo.split('\n').filter(Boolean);
        avanti(1);
        if (spec.derivate) {
            /* niente chiavi da scaricare: le fanno le regole */
            indiceDiParola = new Map();
            perSuffisso = new Map();
            costruisciDaRegole();
            indicizzaSoloParole();
            pronto = true;
            avanti(2);
            return parole.length;
        }
        const json = await fetch(dir + FILE.chiavi).then((r) => {
            if (!r.ok) throw new Error('chiavi: HTTP ' + r.status);
            return r.json();
        });
        avanti(2);
        const bin = await fetch(dir + FILE.tratti).then((r) => {
            if (!r.ok) throw new Error('tratti: HTTP ' + r.status);
            return r.arrayBuffer();
        });
        tratti = new Uint8Array(bin);
        indicizza(json);
        pronto = true;
        avanti(3);
        return parole.length;
    }

    /** Come `indicizza` ma senza toccare le mappe gia' costruite. */
    function indicizzaSoloParole() {
        indiceDiParola = new Map();
        perSuffisso = new Map();
        parole.forEach((p, i) => {
            if (!indiceDiParola.has(p)) indiceDiParola.set(p, i);
            for (let n = SUFFISSO_MIN; n <= Math.min(8, p.length); n++) {
                const suf = p.slice(-n);
                if (!perSuffisso.has(suf)) perSuffisso.set(suf, i);
            }
        });
        derivate();
        inverso();
    }

    const sillabeDi = (i) => tratti[i] >> 3;
    const classeDi = (i) => CLASSI[(tratti[i] >> 1) & 3];
    const stimatoDi = (i) => (tratti[i] & 1) === 1;

    function passaFiltro(i, filtro) {
        if (!filtro || filtro === 'tutte') return true;
        const n = sillabeDi(i);
        if (filtro === '4+') return n >= 4;
        return n === Number(filtro);
    }

    /**
     * cerca(parola, { tipo, sillabe, forza })
     *   tipo: 'rime' | 'assonanze' | 'consonanze' | 'multi'
     * -> { voci, sconosciuta, chiave, classe, stimato }
     */
    function cerca(parolaGrezza, { tipo = 'rime', sillabe = 'tutte', forza = null, max = MAX_RISULTATI } = {}) {
        const k = chiaviDi(parolaGrezza, { forza });
        const parola = k.parola;
        const vuoto = { voci: [], sconosciuta: false, analogia: false, lingua, chiave: k.rima, classe: k.classe, stimato: k.esito !== 'esatto' };
        if (!pronto || !parola) return vuoto;
        let idx = indiceDiParola.has(parola) ? indiceDiParola.get(parola) : -1;
        const sconosciuta = idx < 0;
        let chiave = { rima: k.rima, vocali: k.vocali, consonanti: k.consonanti, multi: k.multi };
        let analogia = false;
        /* parola NOTA in EN/FR: la chiave sta nell'indice, non nella scrittura */
        if (!sconosciuta && rimaDi) chiave = chiaviDiIndice(idx, parola);
        if (sconosciuta && LINGUE[lingua].analogia) {
            /* in EN e FR la chiave sta nella pronuncia: si prende in
               prestito da chi le somiglia nella scrittura */
            const vicina = perAnalogia(parola);
            if (vicina) {
                analogia = true;
                const altra = parole[vicina.indice];
                const ka = chiaviDiIndice(vicina.indice, altra);
                chiave = ka;
            }
        }
        const classe = sconosciuta || forza ? k.classe : classeDi(idx);
        const stimato = sconosciuta ? true : stimatoDi(idx);
        let base = null;
        let escludiRima = null;
        if (tipo === 'assonanze') { base = mappaVocali.get(chiave.vocali); escludiRima = chiave.rima; }
        else if (tipo === 'consonanze') { base = mappaCons.get(chiave.consonanti); escludiRima = chiave.rima; }
        else if (tipo === 'multi') base = mappaMulti.get(chiave.multi);
        else base = mappaRima.get(chiave.rima);
        if (!base) return { ...vuoto, sconosciuta, analogia, classe, stimato, chiave: chiave.rima };
        const voci = [];
        for (let j = 0; j < base.length && voci.length < max; j++) {
            const i = base[j];
            if (i === idx) continue;
            if (!passaFiltro(i, sillabe)) continue;
            if (escludiRima) {
                const altra = chiaviDiIndice(i, parole[i]);
                if (altra.rima === escludiRima) continue;
            }
            voci.push({ parola: parole[i], sillabe: sillabeDi(i), classe: classeDi(i), stimato: stimatoDi(i) });
        }
        return { voci, sconosciuta, analogia, lingua, chiave: tipo === 'multi' ? chiave.multi : chiave.rima, classe, stimato };
    }

    /**
     * La chiave di una parola NOTA: in EN e FR non si ricalcola dalla
     * scrittura (sarebbe sbagliata), si legge dall'indice inverso costruito
     * al caricamento — zero byte in piu' scaricati.
     */
    const cacheChiavi = new Map();
    function chiaviDiIndice(i, parola) {
        if (rimaDi) {
            const rima = rimaDi[i] || '';
            return { rima, vocali: soloVocali(rima), consonanti: consDi[i] || '', multi: multiDi[i] || '' };
        }
        if (cacheChiavi.has(i)) return cacheChiavi.get(i);
        const k = chiaviDi(parola);
        const fuori = { rima: k.rima, vocali: k.vocali, consonanti: k.consonanti, multi: k.multi };
        cacheChiavi.set(i, fuori);
        return fuori;
    }

    /** Classe d'accento di una parola nota: serve al conteggio metrico. */
    function classeDiParola(parola) {
        if (!pronto) return null;
        const i = indiceDiParola.get(parola);
        return i === undefined ? null : classeDi(i);
    }

    /**
     * Tratti di una parola nota { sillabe, classe, stimato }: il conteggio
     * metrico dell'editor li preferisce alle regole, perche' vengono dal
     * Wikizionario (IT: "pa-u-ra" = 3), dal CMU (EN) o dall'IPA (FR).
     * `stimato` vuol dire "accento e sillabe dalle regole", cioe' niente di
     * meglio di quanto l'editor sa gia' fare da solo.
     */
    function trattiDiParola(parola) {
        if (!pronto) return null;
        const i = indiceDiParola.get(parola);
        return i === undefined ? null : { sillabe: sillabeDi(i), classe: classeDi(i), stimato: stimatoDi(i) };
    }

    /** Lo stesso, a lotti: una mappa parola -> tratti (solo le note). */
    function trattiDiParole(lista) {
        const out = {};
        if (!pronto || !Array.isArray(lista)) return out;
        for (const parola of lista) {
            const tr = trattiDiParola(parola);
            if (tr) out[parola] = tr;
        }
        return out;
    }

    return {
        carica,
        cerca,
        classeDiParola,
        trattiDiParola,
        trattiDiParole,
        pronto: () => pronto,
        parole: () => parole.length,
        lingua: () => lingua,
        /* per i test e per il ripiego: un indice gia' in memoria, senza rete.
           Senza `chiavi` (spagnolo) le regole ricostruiscono tutto. */
        async usaDati({ parole: lista, chiavi: json = null, tratti: byte = null, lingua: codice = 'it' }) {
            lingua = normalizzaCodice(codice);
            regole = await moduli(lingua, { radice });
            parole = lista;
            cacheChiavi.clear();
            if (json) {
                tratti = byte || new Uint8Array(lista.length);
                indicizza(json);
            } else {
                costruisciDaRegole();
                indicizzaSoloParole();
            }
            pronto = true;
            return parole.length;
        }
    };
}

/* --- dentro il Worker: si ascoltano i messaggi. Importato dalla pagina
   (ripiego) non fa nulla. --- */
if (typeof self !== 'undefined' && typeof window === 'undefined' && typeof self.postMessage === 'function') {
    const rimario = creaRimario();
    self.onmessage = async (e) => {
        const msg = e.data || {};
        try {
            if (msg.type === 'carica') {
                const n = await rimario.carica(msg.base, (fatto, totale) => self.postMessage({ type: 'progresso', fatto, totale }), msg.lang);
                self.postMessage({ type: 'pronto', parole: n, lingua: rimario.lingua() });
                return;
            }
            if (msg.type === 'cerca') {
                const out = rimario.cerca(msg.parola, { tipo: msg.tipo, sillabe: msg.sillabe, forza: msg.forza });
                self.postMessage({ type: 'risultati', id: msg.id, ...out });
                return;
            }
            if (msg.type === 'classe') {
                self.postMessage({ type: 'classe', id: msg.id, parola: msg.parola, classe: rimario.classeDiParola(msg.parola) });
                return;
            }
            if (msg.type === 'tratti') {
                self.postMessage({ type: 'tratti', id: msg.id, lingua: rimario.lingua(), tratti: rimario.trattiDiParole(msg.parole) });
                return;
            }
            self.postMessage({ type: 'errore', message: 'messaggio sconosciuto' });
        } catch (err) {
            self.postMessage({ type: 'errore', id: msg.id, message: String((err && err.message) || err) });
        }
    };
}
