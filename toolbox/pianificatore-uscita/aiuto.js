/**
 * Tiny Temple Toolbox - Pianificatore di uscita: contenuti dell'aiuto
 * in-app (spec 18 §6). Modulo dati puro (nessun effetto all'import):
 * shared/aiuto.js lo importa e ci costruisce il foglio "Come funziona" + la
 * riga .tb-hint del primo avvio. `it`/`en` sono liste di { t: titolo, d:
 * due righe }, stesso ordine, stessa lunghezza nelle due lingue. `hint` e'
 * una riga sola.
 */
export default {
    it: [
        {
            t: 'Un piano per ogni uscita',
            d: 'Scegli il tipo (Singolo, EP, Album) e la data di uscita: il piano calcola da solo tutte le tappe a ritroso da quella data, con le loro scadenze.'
        },
        {
            t: 'Profilo Completo o Veloce',
            d: 'Completo segue tutte le tappe con largo anticipo, comodo se pianifichi con mesi di margine. Veloce salta le due meno urgenti (grafica per i video, comunicato stampa) e comprime le scadenze, per uscire in poche settimane.'
        },
        {
            t: 'Le tappe',
            d: 'Ogni tappa ha una data, un consiglio pratico e spesso una “i” che spiega perché conviene farla con quell’anticipo. Spunta una tappa quando è fatta: la barra di avanzamento segue.'
        },
        {
            t: 'Aggiungi al calendario',
            d: 'Scarica un file .ics con tutte le scadenze del piano: apribile da Calendario di iPhone, Google Calendar o qualsiasi altra app che li legge.'
        },
        {
            t: 'Ricalcola dalla data',
            d: 'Se sposti la data di uscita, questo bottone ricalcola tutte le tappe non ancora fatte mantenendo lo stesso anticipo in giorni.'
        },
        {
            t: 'Condividi e Stampa',
            d: 'Condividi manda il piano come testo (utile per un promoter o un collega); Stampa prepara una versione pulita da salvare in PDF o stampare su carta.'
        },
        {
            t: 'Bozza e più piani',
            d: 'Se chiudi il modulo a metà lo ritrovi com’era la prossima volta. Nella lista dei piani, un’etichetta mostra le tappe in ritardo o in scadenza di ognuno.'
        }
    ],
    en: [
        {
            t: 'A plan for every release',
            d: 'Pick the type (Single, EP, Album) and the release date: the plan works out every step backwards from that date, with its own deadline.'
        },
        {
            t: 'Full or Fast profile',
            d: 'Full follows every step well in advance, handy when you’re planning months ahead. Fast skips the two least urgent ones (video artwork, press release) and tightens the deadlines, to release in a few weeks.'
        },
        {
            t: 'The steps',
            d: 'Each step has a date, a practical tip, and often an “i” explaining why it’s worth doing that far ahead. Check a step off when it’s done: the progress bar follows along.'
        },
        {
            t: 'Add to calendar',
            d: 'Downloads an .ics file with every deadline in the plan: openable from the iPhone Calendar app, Google Calendar, or any other app that reads them.'
        },
        {
            t: 'Recalculate from date',
            d: 'If you move the release date, this button recalculates every step not yet done, keeping the same lead time in days.'
        },
        {
            t: 'Share and Print',
            d: 'Share sends the plan as text (handy for a promoter or a bandmate); Print prepares a clean version to save as a PDF or print on paper.'
        },
        {
            t: 'Draft and several plans',
            d: 'Close the form halfway through and you’ll find it just as you left it next time. In the plans list, a label shows each plan’s overdue or upcoming steps.'
        }
    ],
    hint: {
        it: 'Veloce salta due tappe e comprime le scadenze, per uscire in poche settimane.',
        en: 'Fast skips two steps and tightens the deadlines, to release in a few weeks.'
    }
};
