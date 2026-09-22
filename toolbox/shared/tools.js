// Tiny Temple Toolbox - catalogo strumenti (spec 01, sezione "Dati").
// Modulo dati puro: nessun effetto all'import, nessun globale.
// Letto da shared/nav.js per riempire il menu (tb-menu-groups) e dalla
// home (index.html), che ne rispecchia l'ordine "a mano" nel markup
// statico (niente build step: i due elenchi vanno tenuti allineati).
//
// FAMILIES: array ordinato (= ordine nel menu e in home).
//   { id: string, key: string }   key = chiave i18n del nome famiglia.
//
// TOOLS: array ordinato per famiglia (l'ordine dentro una famiglia e'
// quello di visualizzazione).
//   { slug: string,     percorso pubblicato: '/<slug>'
//     family: string,   deve combaciare con un FAMILIES[].id
//     key: string,      chiave i18n del nome dello strumento (tool-<slug>)
//     status: 'live' | 'soon',
//     next?: true }      solo sullo strumento "prossimo in arrivo" (uno solo)
export const FAMILIES = [
    { id: 'live', key: 'fam-live' },
    { id: 'analysis', key: 'fam-analysis' },
    { id: 'writing', key: 'fam-writing' },
    { id: 'calc', key: 'fam-calc' },
    { id: 'release', key: 'fam-release' }
];

export const TOOLS = [
    { slug: 'metronomo', family: 'live', key: 'tool-metronomo', status: 'live' },
    { slug: 'accordatore', family: 'live', key: 'tool-accordatore', status: 'live' },
    { slug: 'dna', family: 'analysis', key: 'tool-dna', status: 'live' },
    { slug: 'penna', family: 'writing', key: 'tool-penna', status: 'live' },
    { slug: 'calcolatore-tempo', family: 'calc', key: 'tool-calcolatore-tempo', status: 'live' },
    { slug: 'pianificatore-uscita', family: 'release', key: 'tool-pianificatore-uscita', status: 'live' }
    /* Checklist consegna e Split sheet: tolti il 22/09 (Genna): erano tagliati sul
       flusso di lavoro di Tiny Temple, e gli strumenti devono servire a tutti. */
];
