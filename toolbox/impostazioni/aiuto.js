/**
 * Tiny Temple Toolbox - Impostazioni: contenuti dell'aiuto in-app (spec 18
 * §6). Modulo dati puro (nessun effetto all'import): shared/aiuto.js lo
 * importa e ci costruisce il foglio "Come funziona" + la riga .tb-hint del
 * primo avvio. `it`/`en` sono liste di { t: titolo, d: due righe }, stesso
 * ordine, stessa lunghezza nelle due lingue. `hint` e' una riga sola.
 */
export default {
    it: [
        {
            t: 'Una pagina per tutta la Toolbox',
            d: 'Qui ci sono le preferenze comuni a tutti gli strumenti: lingua, microfono, sincronizzazione, dati. L’ingranaggio di ogni strumento apre invece solo le sue opzioni.'
        },
        {
            t: 'Codice di sincronizzazione',
            d: 'Sei parole che collegano questo dispositivo agli altri: crealo una volta, collegalo altrove per allineare gli stessi testi, piani e accordature senza account.'
        },
        {
            t: 'Cosa non può fare',
            d: 'Il codice non si può recuperare: se lo perdi prima di averlo scritto da qualche parte, i dati restano solo sui dispositivi già collegati, non c’è un “password dimenticata”.'
        },
        {
            t: 'Cosa sincronizzare',
            d: 'Un interruttore per ogni tipo di dato (testi, piani, accordature…): spegnilo se non vuoi che quella collezione lasci questo dispositivo.'
        },
        {
            t: 'Pacchetti lingua',
            d: 'Le lingue del rimario di Penna già scaricate: da qui le riscarichi o le rimuovi per liberare spazio, indipendentemente da quale stai usando ora.'
        },
        {
            t: 'Esporta, importa, cancella',
            d: 'Esporta salva tutto in un file .json come copia di sicurezza. Importa lo rilegge (unendo o sostituendo). “Cancella tutto” svuota questo dispositivo e va confermato scrivendo una parola.'
        }
    ],
    en: [
        {
            t: 'One page for the whole Toolbox',
            d: 'Here are the preferences shared by every tool: language, microphone, sync, data. Each tool’s gear icon instead only opens its own options.'
        },
        {
            t: 'Sync code',
            d: 'Six words that link this device to others: create it once, link it elsewhere to keep the same lyrics, plans and tunings in step, no account needed.'
        },
        {
            t: 'What it can’t do',
            d: 'The code can’t be recovered: if you lose it before writing it down, the data only stays on the devices already linked, there’s no “forgot password”.'
        },
        {
            t: 'What to sync',
            d: 'A switch for every kind of data (lyrics, plans, tunings…): turn it off if you don’t want that collection leaving this device.'
        },
        {
            t: 'Language packs',
            d: 'The rhyme dictionary languages already downloaded for Lyric Pad: from here you can re-download or remove them to free up space, whichever one you’re using now.'
        },
        {
            t: 'Export, import, delete',
            d: 'Export saves everything into a .json file as a backup. Import reads it back (merging or replacing). “Delete everything” wipes this device and needs a typed word to confirm.'
        }
    ],
    hint: {
        it: 'Il codice di sincronizzazione non si recupera: scrivilo da qualche parte.',
        en: 'The sync code can’t be recovered: write it down somewhere safe.'
    }
};
