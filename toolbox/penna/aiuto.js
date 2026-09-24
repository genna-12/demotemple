/**
 * Tiny Temple Toolbox - Penna: contenuti dell'aiuto in-app (spec 18 §6).
 * Modulo dati puro (nessun effetto all'import): shared/aiuto.js lo importa
 * e ci costruisce il foglio "Come funziona" + la riga .tb-hint del primo
 * avvio. `it`/`en` sono liste di { t: titolo, d: due righe }, stesso
 * ordine, stessa lunghezza nelle due lingue. `hint` e' una riga sola.
 */
export default {
    it: [
        {
            t: 'I numeri a margine',
            d: 'Sono le sillabe di ogni verso. In corsivo significa che sono stimate, non certe: succede con parole rare o quando il rimario di quella lingua non è ancora pronto.'
        },
        {
            t: 'Numero sottolineato',
            d: 'Il verso ha almeno una sinalefe (due vocali che si fondono in una sillaba): tocca il numero per vedere quali e scegliere se contarle o no, verso per verso.'
        },
        {
            t: 'Lettere colorate a fine verso',
            d: 'Quando “Rime a colori” è attivo, ogni lettera indica lo schema delle rime (A, B, A…): versi con la stessa lettera fanno rima fra loro, e prendono lo stesso colore.'
        },
        {
            t: 'Metrico o Grammaticale',
            d: 'Metrico conta le sillabe come si cantano (con sinalefi ed elisioni). Grammaticale le conta come sul vocabolario, verso per verso, senza fondere nulla.'
        },
        {
            t: 'Rime, Assonanze, Consonanze, Multisillabiche',
            d: 'Rime cerca la corrispondenza esatta del suono finale. Assonanze e Consonanze allentano la regola (solo vocali o solo consonanti). Multisillabiche cerca rime di più sillabe insieme, utile per le barre.'
        },
        {
            t: 'Pacchetti lingua',
            d: 'La prima volta che apri una lingua nel rimario, la scarica (circa 1 MB): da lì in poi funziona anche offline. Le lingue già scaricate hanno il pallino verde.'
        },
        {
            t: 'Sincronizzare i testi',
            d: 'Da Impostazioni puoi collegare questo dispositivo a un codice di sei parole: gli stessi testi restano allineati anche su telefono e computer, senza account.'
        }
    ],
    en: [
        {
            t: 'The margin numbers',
            d: 'They’re the syllables in each line. In italics means they’re estimated, not certain: this happens with rare words or when that language’s rhyme dictionary isn’t ready yet.'
        },
        {
            t: 'Underlined number',
            d: 'The line has at least one elision (two vowels merging into one syllable): tap the number to see which ones and choose whether to count them, line by line.'
        },
        {
            t: 'Coloured letters at line end',
            d: 'When “Rhymes in colour” is on, each letter shows the rhyme scheme (A, B, A…): lines sharing a letter rhyme with each other, and share a colour.'
        },
        {
            t: 'Metric or Grammatical',
            d: 'Metric counts syllables the way they’re sung (with elisions merged). Grammatical counts them the dictionary way, line by line, without merging anything.'
        },
        {
            t: 'Rhymes, Assonances, Consonances, Multisyllabic',
            d: 'Rhymes looks for an exact match of the final sound. Assonances and Consonances loosen the rule (vowels only, or consonants only). Multisyllabic finds rhymes across several syllables, handy for bars.'
        },
        {
            t: 'Language packs',
            d: 'The first time you open a language in the rhyme dictionary, it downloads it (about 1 MB): from then on it also works offline. Downloaded languages show a green dot.'
        },
        {
            t: 'Syncing your lyrics',
            d: 'From Settings you can link this device to a six-word code: the same lyrics stay in step on your phone and computer, no account needed.'
        }
    ],
    hint: {
        it: 'Numero in corsivo = stima; sottolineato = tocca per la sinalefe.',
        en: 'Italic number = estimate; underlined = tap for the elision.'
    }
};
