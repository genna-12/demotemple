/**
 * Tiny Temple - inoltro del modulo contatti (Cloudflare Pages Function)
 *
 * Perche' esiste: la access key di Web3Forms, se sta nel JavaScript della
 * pagina, e' pubblica per chiunque apra il sorgente, e chi la copia puo'
 * mandare messaggi nella casella dello studio. La restrizione per dominio di
 * Web3Forms e' a pagamento. Questa funzione fa la stessa cosa gratis: la
 * chiave vive qui sul server, il browser non la vede mai, e l'invio viene
 * accettato solo se arriva davvero dal nostro sito.
 *
 * DA CONFIGURARE UNA VOLTA SOLA, su Cloudflare:
 *   progetto Pages -> Settings -> Variables and Secrets -> Add
 *   nome: WEB3FORMS_KEY   tipo: Secret   valore: la access key di Web3Forms
 * Poi ripubblicare (le variabili si applicano al deploy successivo).
 */

const ORIGINI_AMMESSE = [
    'https://tinytemplestudio.it',
    'https://www.tinytemplestudio.it'
];

function risposta(dati, stato) {
    return new Response(JSON.stringify(dati), {
        status: stato,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store'
        }
    });
}

export async function onRequestPost(context) {
    const { request, env } = context;

    /* 1. Solo richieste che arrivano dal nostro sito. L'Origin lo mette il
       browser e una pagina esterna non puo' falsificarlo. */
    const origin = request.headers.get('Origin') || '';
    if (!ORIGINI_AMMESSE.includes(origin)) {
        return risposta({ success: false, message: 'Origine non autorizzata.' }, 403);
    }

    const chiave = env.WEB3FORMS_KEY;
    if (!chiave) {
        console.error('[contatto] manca la variabile WEB3FORMS_KEY');
        return risposta({ success: false, message: 'Servizio non configurato.' }, 500);
    }

    let dati;
    try {
        dati = await request.json();
    } catch (e) {
        return risposta({ success: false, message: 'Richiesta non valida.' }, 400);
    }

    /* 2. Non si inoltra quello che arriva: si ricostruisce il messaggio campo
       per campo, cosi' nessuno puo' infilare parametri di Web3Forms a piacere
       (destinatario, allegati, redirect...). */
    const nome = String(dati.from_name || '').trim().slice(0, 120);
    const email = String(dati.email || '').trim().slice(0, 200);
    const servizio = String(dati.service_type || '').trim().slice(0, 80);
    const messaggio = String(dati.message || '').trim().slice(0, 5000);

    if (!nome || !email || messaggio.length < 10) {
        return risposta({ success: false, message: 'Campi mancanti o troppo brevi.' }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        return risposta({ success: false, message: 'Indirizzo email non valido.' }, 400);
    }
    /* honeypot: se e' pieno l'ha compilato un bot. Si risponde "tutto ok"
       senza inoltrare nulla, cosi' il bot non capisce di essere stato scartato. */
    if (String(dati.botcheck || '').trim() !== '') {
        return risposta({ success: true, message: 'Messaggio inviato.' }, 200);
    }

    const payload = {
        access_key: chiave,
        from_name: nome,
        email: email,
        subject: `[Tiny Temple] Nuova richiesta da ${nome}${servizio ? ' - ' + servizio : ''}`,
        service_type: servizio,
        message: messaggio
    };

    try {
        const r = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(payload)
        });
        const esito = await r.json().catch(() => ({}));
        if (!r.ok) {
            console.error('[contatto] Web3Forms ha risposto', r.status, esito && esito.message);
            return risposta({ success: false, message: esito.message || "Errore durante l'invio." }, 502);
        }
        return risposta({ success: true, message: 'Messaggio inviato.' }, 200);
    } catch (err) {
        console.error('[contatto] invio non riuscito', err);
        return risposta({ success: false, message: "Errore durante l'invio." }, 502);
    }
}
