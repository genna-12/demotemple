/**
 * Tiny Temple Toolbox - DNA: contenuti dell'aiuto in-app (spec 18 §6).
 * Modulo dati puro (nessun effetto all'import): shared/aiuto.js lo importa
 * e ci costruisce il foglio "Come funziona" + la riga .tb-hint del primo
 * avvio. `it`/`en` sono liste di { t: titolo, d: due righe }, stesso
 * ordine, stessa lunghezza nelle due lingue. `hint` e' una riga sola.
 */
export default {
    it: [
        {
            t: 'File o microfono',
            d: 'Scegli un file audio per un’analisi precisa, oppure registra dal microfono per una stima veloce, utile in sala prove. Le due strade danno risultati diversi in affidabilità.'
        },
        {
            t: 'BPM e ÷2 / ×2',
            d: 'Il tempo stimato a volte “raddoppia” o “dimezza” rispetto a quello vero (un brano lento con molte note può sembrare il doppio veloce). Se il numero non torna, tocca ÷2 o ×2 per correggerlo.'
        },
        {
            t: 'Tonalità e Camelot',
            d: 'La tonalità stimata, con il suo codice Camelot (es. 8A): un sistema usato dai DJ per trovare brani in tonalità compatibili da mixare fra loro senza stonature.'
        },
        {
            t: 'Confidenza',
            d: 'Alta, media o bassa: quanto l’analisi è sicura del risultato. Con confidenza bassa conviene verificare a orecchio, specialmente per la tonalità.'
        },
        {
            t: 'Loudness e target',
            d: 'I LUFS dicono quanto suona “forte” il brano in media; il target è il livello a cui lo riporta una piattaforma come Spotify o Apple Music in streaming. Tocca la “i” per i dettagli.'
        },
        {
            t: 'Stima dal microfono',
            d: 'Quando l’analisi viene dal microfono, un avviso lo ricorda: BPM e tonalità sono un buon punto di partenza, ma solo il file audio dà un risultato affidabile al 100%.'
        },
        {
            t: 'Storico',
            d: 'Ogni analisi resta salvata qui sotto: tocca una voce per riaprirla, la matita per rinominarla, o svuota tutto lo storico da “Svuota storico”.'
        }
    ],
    en: [
        {
            t: 'File or microphone',
            d: 'Choose an audio file for a precise analysis, or record from the microphone for a quick estimate, handy in rehearsal. The two routes give results with different reliability.'
        },
        {
            t: 'BPM and ÷2 / ×2',
            d: 'The estimated tempo sometimes “doubles” or “halves” compared to the real one (a slow song with lots of notes can sound twice as fast). If the number looks off, tap ÷2 or ×2 to fix it.'
        },
        {
            t: 'Key and Camelot',
            d: 'The estimated key, with its Camelot code (e.g. 8A): a system DJs use to find tracks in compatible keys that mix together without clashing.'
        },
        {
            t: 'Confidence',
            d: 'High, medium or low: how sure the analysis is about the result. With low confidence it’s worth checking by ear, especially for the key.'
        },
        {
            t: 'Loudness and target',
            d: 'LUFS say how loud the track sounds on average; the target is the level a platform like Spotify or Apple Music turns it down to for streaming. Tap the “i” for details.'
        },
        {
            t: 'Microphone estimate',
            d: 'When the analysis comes from the microphone, a note reminds you: BPM and key are a good starting point, but only the audio file gives a fully reliable result.'
        },
        {
            t: 'History',
            d: 'Every analysis stays saved below: tap an entry to reopen it, the pencil to rename it, or clear all of it from “Clear history”.'
        }
    ],
    hint: {
        it: 'Il BPM sembra sbagliato? Tocca ÷2 o ×2 per correggerlo.',
        en: 'BPM looks wrong? Tap ÷2 or ×2 to fix it.'
    }
};
