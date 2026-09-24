// Tiny Temple Toolbox - Impostazioni (spec 18 §5): dizionario IT/EN.
// Modulo dati puro: nessun effetto all'import, unito a shared/i18n-common.js
// da impostazioni.js (implementer) come ogni altro <slug>/i18n.js.
// Chiavi "imp-sec-*": titolo di ogni sezione (.imp-sezione-title).
// "imp-pack-*": righe di #imp-pacchetti-lista, clonate da #imp-pack-tpl.
// "imp-cancella-parola": la parola di conferma digitata (CONTRATTO
// impostazioni.js: legge il valore TRADOTTO con t(), non un letterale
// fisso, e lo confronta col contenuto di #imp-cancella-conferma).
export default {
    it: {
        'imp-title': 'Impostazioni',

        'imp-sec-lingua': 'Lingua',

        'imp-sec-aspetto': 'Aspetto',
        'imp-anim-ridotte': 'Animazioni ridotte',
        'imp-salta-intro': 'Salta l’intro',

        'imp-sec-mic': 'Microfono',
        'imp-mic-revoca': 'Revoca il permesso',

        'imp-sec-sync': 'Sincronizzazione',
        'sync-empty-remote': 'Il server è vuoto: le copie sono state eliminate da un altro dispositivo. Reinvio i dati di questo?',
        'sync-reupload': 'Reinvia i dati',

        'imp-sec-pacchetti': 'Pacchetti lingua',
        'imp-pacchetti-vuoto': 'Nessun pacchetto scaricato.',
        'imp-pack-scarica': 'Scarica',
        'imp-pack-rimuovi': 'Rimuovi',
        'imp-pack-installato': 'Installato',
        'imp-pack-non-installato': 'Non scaricato',
        'imp-pack-auto': 'Si prepara da solo al primo uso',

        'imp-sec-dati': 'Dati',
        'imp-esporta': 'Esporta tutto (.json)',
        'imp-importa': 'Importa',
        'imp-importa-modo-label': 'In caso di conflitto',
        'imp-importa-unisci': 'Unisci',
        'imp-importa-sostituisci': 'Sostituisci',
        'imp-cancella': 'Cancella tutto',
        'imp-cancella-avviso': 'Elimina tutti i dati della Toolbox da questo dispositivo: testi, analisi, piani, accordature e preferenze. Non si può annullare.',
        'imp-cancella-etichetta': 'Scrivi la parola per confermare',
        'imp-cancella-parola': 'CANCELLA',
        'imp-annulla': 'Annulla',

        'imp-sec-informative': 'Informative',
        'imp-cookie': 'Cookie',

        'imp-sec-versione': 'Versione dell’app',

        /* testi dinamici di impostazioni.js (implementer) */
        'imp-mic-revoked': 'Permesso del microfono revocato.',
        'imp-pack-downloading': 'Scarico… {pct}%',
        'imp-pack-failed': 'Download non riuscito. Controlla la connessione e riprova.',
        'imp-pack-done': 'Pacchetto {lingua} scaricato: funziona anche offline.',
        'imp-pack-removed': 'Pacchetto rimosso. Potrai riscaricarlo quando vuoi.',
        'imp-export-done': 'File esportato.',
        'imp-export-copied': 'Non riesco a salvare il file: ho copiato i dati negli appunti.',
        'imp-export-failed': 'Esportazione non riuscita.',
        'imp-import-done': 'Importati: {n} nuovi, {m} aggiornati.',
        'imp-import-failed': 'Questo file non è un’esportazione della Toolbox: non ho toccato niente.',
        'imp-import-limit': 'Il file supera i limiti della Toolbox: non ho toccato niente.',
        'imp-wipe-done': 'Tutti i dati della Toolbox sono stati cancellati da questo dispositivo.',
        'imp-wipe-failed': 'Non sono riuscito a cancellare tutto. Riprova.',
        'imp-version': 'Toolbox {versione} · aggiornata il {data}'
    },
    en: {
        'imp-title': 'Settings',

        'imp-sec-lingua': 'Language',

        'imp-sec-aspetto': 'Appearance',
        'imp-anim-ridotte': 'Reduced animations',
        'imp-salta-intro': 'Skip the intro',

        'imp-sec-mic': 'Microphone',
        'imp-mic-revoca': 'Revoke access',

        'imp-sec-sync': 'Sync',
        'sync-empty-remote': 'The server is empty: the copies were deleted from another device. Upload this device\u2019s data again?',
        'sync-reupload': 'Upload again',

        'imp-sec-pacchetti': 'Language packs',
        'imp-pacchetti-vuoto': 'No packs downloaded.',
        'imp-pack-scarica': 'Download',
        'imp-pack-rimuovi': 'Remove',
        'imp-pack-installato': 'Installed',
        'imp-pack-non-installato': 'Not downloaded',
        'imp-pack-auto': 'Prepared automatically on first use',

        'imp-sec-dati': 'Data',
        'imp-esporta': 'Export everything (.json)',
        'imp-importa': 'Import',
        'imp-importa-modo-label': 'On conflict',
        'imp-importa-unisci': 'Merge',
        'imp-importa-sostituisci': 'Replace',
        'imp-cancella': 'Delete everything',
        'imp-cancella-avviso': 'Deletes all Toolbox data from this device: lyrics, analyses, plans, tunings and preferences. This cannot be undone.',
        'imp-cancella-etichetta': 'Type the word to confirm',
        'imp-cancella-parola': 'DELETE',
        'imp-annulla': 'Cancel',

        'imp-sec-informative': 'Legal',
        'imp-cookie': 'Cookies',

        'imp-sec-versione': 'App version',

        'imp-mic-revoked': 'Microphone access revoked.',
        'imp-pack-downloading': 'Downloading… {pct}%',
        'imp-pack-failed': 'Download failed. Check your connection and try again.',
        'imp-pack-done': '{lingua} pack downloaded: it works offline too.',
        'imp-pack-removed': 'Pack removed. You can download it again any time.',
        'imp-export-done': 'File exported.',
        'imp-export-copied': 'Couldn’t save the file: the data has been copied to the clipboard.',
        'imp-export-failed': 'Export failed.',
        'imp-import-done': 'Imported: {n} new, {m} updated.',
        'imp-import-failed': 'This file is not a Toolbox export: nothing was changed.',
        'imp-import-limit': 'The file exceeds the Toolbox limits: nothing was changed.',
        'imp-wipe-done': 'All Toolbox data has been deleted from this device.',
        'imp-wipe-failed': 'Couldn’t delete everything. Please try again.',
        'imp-version': 'Toolbox {versione} · updated on {data}'
    }
};
