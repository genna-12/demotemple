/**
 * Tiny Temple Toolbox - Metronomo: contenuti dell'aiuto in-app (spec 18 §6).
 * Modulo dati puro (nessun effetto all'import): shared/aiuto.js lo importa
 * e ci costruisce il foglio "Come funziona" + la riga .tb-hint del primo
 * avvio. `it`/`en` sono liste di { t: titolo, d: due righe }, stesso
 * ordine, stessa lunghezza nelle due lingue. `hint` e' una riga sola.
 */
export default {
    it: [
        {
            t: 'La rotella del tempo',
            d: 'Trascina la rotella per cambiare il BPM, oppure tocca il numero al centro per scriverlo a mano. I bottoni −5/−1/+1/+5 spostano il tempo di poco alla volta.'
        },
        {
            t: 'Tap',
            d: 'Tocca il bottone Tap a tempo con la musica: dopo qualche tocco il metronomo prende il tuo tempo. Sei tu a dare il BPM.'
        },
        {
            t: 'Conta',
            d: 'Apre uno schermo grande per contare i tap col dito, comodo se tieni in mano uno strumento. Alla fine applica il BPM contato.'
        },
        {
            t: 'Battuta',
            d: 'Quante pulsazioni per misura (2/4, 3/4, 4/4…): cambia solo l’accento, non il tempo. Scegli quella del brano che stai suonando.'
        },
        {
            t: 'Suddivisione',
            d: 'Quanti click senti dentro ogni pulsazione: quarti, ottavi, terzine o sedicesimi. Utile per esercitarti su un groove preciso.'
        },
        {
            t: 'Suono e volume',
            d: 'Legno, beep o rimshot: cambia solo il timbro del click, per sentirlo meglio in sala prove o in cuffia.'
        },
        {
            t: 'Preset e scaletta',
            d: 'Salva il tempo di un brano con «Salva preset»: nome, battuta, suddivisione e suono restano pronti in una riga, anche a metronomo fermo. Tocca una riga per applicarla; «Avanti» passa alla prossima della scaletta, comodo dal vivo.'
        },
        {
            t: 'Battuta d’attacco',
            d: 'Accendila e, ogni volta che parti da fermo, senti una battuta di soli accenti prima del click vero: il tempo per prendere fiato o alzare lo strumento.'
        }
    ],
    en: [
        {
            t: 'The tempo wheel',
            d: 'Drag the wheel to change the BPM, or tap the number in the middle to type it. The −5/−1/+1/+5 buttons nudge the tempo a little at a time.'
        },
        {
            t: 'Tap',
            d: 'Tap the Tap button in time with the music: after a few taps the metronome picks up your tempo. You set the BPM.'
        },
        {
            t: 'Count',
            d: 'Opens a big full-screen counter for tapping with your finger, handy when your hands are full with an instrument. It applies the counted BPM at the end.'
        },
        {
            t: 'Meter',
            d: 'How many beats per bar (2/4, 3/4, 4/4…): it only changes the accent, not the tempo. Pick the one that matches the song.'
        },
        {
            t: 'Subdivision',
            d: 'How many clicks you hear inside each beat: quarters, eighths, triplets or sixteenths. Useful for practising a precise groove.'
        },
        {
            t: 'Sound and volume',
            d: 'Wood, beep or rimshot: only changes the click’s tone, to hear it better in rehearsal or on headphones.'
        },
        {
            t: 'Presets and setlist',
            d: 'Save a song’s tempo with “Save preset”: name, meter, subdivision and sound stay ready in a row, even while stopped. Tap a row to apply it; “Next” moves to the next one in the setlist, handy live.'
        },
        {
            t: 'Count-in',
            d: 'Turn it on and, every time you start from a stop, you’ll hear one bar of accents only before the real click: time to catch your breath or lift your instrument.'
        }
    ],
    hint: {
        it: 'Trascina la rotella per cambiare · tocca il numero per scriverlo.',
        en: 'Drag the wheel to change · tap the number to type it.'
    }
};
