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
        }
    ],
    hint: {
        it: 'La rotella si trascina, e tocca il numero se preferisci scriverlo.',
        en: 'Drag the wheel, or tap the number if you’d rather type it.'
    }
};
