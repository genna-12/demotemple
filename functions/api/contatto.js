/**
 * DISATTIVATA — 15 settembre 2026
 *
 * Questa funzione inoltrava il modulo contatti a Web3Forms tenendo la access
 * key sul server. Idea giusta, provider sbagliato: **Web3Forms limita le
 * richieste per indirizzo IP**, e una funzione Cloudflare esce da indirizzi
 * condivisi fra migliaia di siti, che sono gia' oltre il limite. Ogni invio
 * tornava indietro con "429 Rate limit exceeded. IP temporarily blocked".
 * Dal browser invece l'IP e' quello del visitatore e il limite non si sfiora.
 *
 * Il modulo e' quindi tornato all'invio diretto (vedi contact.js).
 *
 * Perche' questo file esiste ancora invece di essere sparito: finche' resta
 * nel repository, l'indirizzo /api/contatto risponde. Lasciarlo funzionante e
 * inutilizzato sarebbe un problema serio — chiunque potrebbe chiamarlo per
 * mandare posta alla casella dello studio usando la chiave sul server, senza
 * passare dal sito. Quindi risponde soltanto "410 Gone".
 *
 * PUOI CANCELLARE TUTTA LA CARTELLA functions/ QUANDO VUOI: e' il modo pulito
 * di chiudere la faccenda. Si puo' anche togliere il Secret WEB3FORMS_KEY dalle
 * impostazioni del progetto su Cloudflare, non serve piu' a nulla.
 */

export async function onRequest() {
    return new Response(
        JSON.stringify({ success: false, message: 'Endpoint non attivo.' }),
        {
            status: 410,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-store'
            }
        }
    );
}
