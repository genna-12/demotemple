/**
 * Tiny Temple Toolbox - Calcolatore tempo: contenuti dell'aiuto in-app
 * (spec 18 §6). Modulo dati puro (nessun effetto all'import):
 * shared/aiuto.js lo importa e ci costruisce il foglio "Come funziona" + la
 * riga .tb-hint del primo avvio. `it`/`en` sono liste di { t: titolo, d:
 * due righe }, stesso ordine, stessa lunghezza nelle due lingue. `hint` e'
 * una riga sola.
 */
export default {
    it: [
        {
            t: 'Le tre schede',
            d: 'Delay e riverbero calcola i tempi degli effetti sul BPM. Nota e frequenza converte una nota musicale in Hz per l’EQ. Sidechain trova l’attacco/rilascio del compressore per il “pompaggio” a tempo.'
        },
        {
            t: 'La rotella del BPM',
            d: 'Stesso controllo del metronomo: trascina o tocca il numero per scriverlo. Tutte le tabelle si aggiornano da sole col nuovo tempo.'
        },
        {
            t: 'ms o Hz',
            d: 'Cambia solo l’unità di misura della tabella dei delay: millisecondi (il tempo da impostare sul plugin) oppure Hertz (per un filtro o un LFO).'
        },
        {
            t: 'Le celle della tabella',
            d: 'Tocca un valore per copiarlo negli appunti: comparirà un avviso “Copiato”. Ogni cella mostra già la suddivisione, normale, puntata o in terzina.'
        },
        {
            t: 'Riferimento A4',
            d: 'Il “La” usato per il calcolo nota-frequenza: 440 Hz è lo standard, cambialo solo se lavori su un riferimento diverso.'
        },
        {
            t: 'L’icona di copia',
            d: 'La piccola icona sul lato destro di ogni cella ricorda che è copiabile; diventa piena per un attimo appena tocchi il valore.'
        }
    ],
    en: [
        {
            t: 'The three tabs',
            d: 'Delay and reverb works out effect times from the BPM. Note and frequency converts a musical note into Hz for EQ. Sidechain finds attack/release for a compressor’s rhythmic “pumping”.'
        },
        {
            t: 'The BPM wheel',
            d: 'Same control as the metronome: drag it or tap the number to type it. Every table updates itself with the new tempo.'
        },
        {
            t: 'ms or Hz',
            d: 'Only changes the delay table’s unit: milliseconds (the time to set on your plugin) or Hertz (for a filter or an LFO).'
        },
        {
            t: 'The table cells',
            d: 'Tap a value to copy it to the clipboard: a “Copied” toast appears. Every cell already shows the subdivision, straight, dotted or triplet.'
        },
        {
            t: 'A4 reference',
            d: 'The “A” used for the note-to-frequency calculation: 440 Hz is the standard, change it only if you’re working from a different reference.'
        },
        {
            t: 'The copy icon',
            d: 'The small icon on the right of every cell is a reminder it’s copyable; it turns solid for a moment as soon as you tap the value.'
        }
    ],
    hint: {
        it: 'Tocca un valore in tabella per copiarlo; la rotella cambia il BPM di tutte le schede.',
        en: 'Tap a table value to copy it; the wheel changes the BPM for every tab.'
    }
};
