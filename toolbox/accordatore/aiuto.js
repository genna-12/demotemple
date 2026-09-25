/**
 * Tiny Temple Toolbox - Accordatore: contenuti dell'aiuto in-app (spec 18
 * §6). Modulo dati puro (nessun effetto all'import): shared/aiuto.js lo
 * importa e ci costruisce il foglio "Come funziona" + la riga .tb-hint del
 * primo avvio. `it`/`en` sono liste di { t: titolo, d: due righe }, stesso
 * ordine, stessa lunghezza nelle due lingue. `hint` e' una riga sola.
 */
export default {
    it: [
        {
            t: 'Riferimento o Ascolto',
            d: 'Riferimento suona la nota sullo strumento del telefono, la accordi a orecchio. Ascolto usa il microfono: suoni tu, l’indicatore ti dice se sei crescente o calante.'
        },
        {
            t: 'Corde e tastiera',
            d: 'Tocca una corda (o un tasto, per la Cromatica) per sentirla. In Riferimento puoi ritoccarla quante volte vuoi, resta accesa finché non ne scegli un’altra. La prossima volta che apri l’Accordatore ritrova da sola l’ultima corda scelta.'
        },
        {
            t: 'Strumento e accordature',
            d: 'Il menu ha le accordature più comuni (Drop D, DADGAD, mezzo tono giù…) e “Personalizzata…” per scriverne una tua, che resta salvata per la prossima volta.'
        },
        {
            t: 'Riferimento A4',
            d: 'Il “La” a cui si accorda tutto: 440 Hz è lo standard. Cambialo solo se devi accordarti su un piano o un’orchestra che usano un’altra intonazione.'
        },
        {
            t: 'L’indicatore',
            d: 'La lancetta al centro (verde) vuol dire intonato; a sinistra la nota è calante, a destra crescente. I numeri sono i cent di scostamento.'
        }
    ],
    en: [
        {
            t: 'Reference or Listen',
            d: 'Reference plays the note through the phone, you tune to it by ear. Listen uses the microphone: you play, the needle tells you if you’re flat or sharp.'
        },
        {
            t: 'Strings and keyboard',
            d: 'Tap a string (or a key, for Chromatic) to hear it. In Reference you can retouch it as many times as you like, it stays lit until you pick another. Next time you open the Tuner it picks up the last string you chose.'
        },
        {
            t: 'Instrument and tunings',
            d: 'The menu has the most common tunings (Drop D, DADGAD, half-step down…) and “Custom…” to write your own, saved for next time.'
        },
        {
            t: 'A4 reference',
            d: 'The “A” everything else is tuned to: 440 Hz is the standard. Change it only if you need to match a piano or orchestra using a different pitch.'
        },
        {
            t: 'The needle',
            d: 'Centred and green means in tune; to the left the note is flat, to the right it’s sharp. The numbers are the offset in cents.'
        }
    ],
    hint: {
        it: 'Ascolto usa il microfono; tocca una corda in Riferimento per sentirla suonare.',
        en: 'Listen uses the microphone; tap a string in Reference to hear it play.'
    }
};
