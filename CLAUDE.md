# Tiny Temple Studio — istruzioni per gli agenti

Sito statico di uno studio di registrazione (Forlì), online su tinytemplestudio.it.
Repository pubblico: github.com/genna-12/demotemple. Hosting Cloudflare Pages,
deploy automatico a ogni push su `main`. Sezione in sviluppo: **Toolbox**
(strumenti per artisti e produttori, tutto nel browser). Piano, specifiche e
stato in `docs/toolbox/`. Leggi `docs/toolbox/00-workflow.md` prima di agire.

## Vincoli non negoziabili
1. **Costo zero.** Niente piani a pagamento, server sempre accesi, servizi a consumo, chiavi segrete.
2. **Niente dipendenti.** I collaboratori sono professionisti autonomi: mai descriverli come impiegati (testo, JSON-LD, ovunque).
3. **Niente tracciamento senza consenso.** Zero cookie, zero analytics. Ogni chiamata a terzi parte solo da un'azione esplicita dell'utente, con pattern click-to-load (vedi `consent.js`) e va segnalata perché cambia le informative Iubenda.
4. **Nessun build step.** Si pubblica il repository così com'è: ES modules nativi, librerie vendorizzate in `toolbox/vendor/`.
5. **Non rompere la vetrina.** Le pagine esistenti restano come sono salvo richiesta esplicita.

## Convenzioni tecniche
- Indirizzi senza estensione (`/servizi`, non `/servizi.html`); Cloudflare Pages gestisce i clean URL.
- Traduzioni IT/EN: dizionario `dict = {it:{}, en:{}}` in `main.js`, attributo `data-translate="chiave"` (anche `data-translate-aria`). Ogni chiave va in ENTRAMBE le lingue. Lingua in `localStorage.tinyTempleLang`, default `it`.
- Ordine script a fondo pagina: `/consent.js` → `/main.js` → script di pagina → `/pwa.js`. `/preload.js` nel `<head>` prima del CSS.
- Design system in `style.css`: variabili `--bg-color`, `--text-primary`, `--text-muted`, `--accent-brown`, `--accent-orange`, `--font-title`, `--font-text`, `--ease-cinematic`. Componenti riusabili: `.spatial-btn`, `.spatial-glass-card`, `.service-card`, `.floating-btn`. Breakpoint mobile `max-width: 768px`; hover solo sotto `@media (hover: hover) and (pointer: fine)`; rispettare `prefers-reduced-motion`.
- Font self-hosted (Archivo, Inter). Nessuna richiesta verso Google, mai.
- Sicurezza in `_headers`: CSP stretta, `Permissions-Policy` con microfono chiuso, `worker-src 'self'`. Ogni contenuto esterno, WASM (`'wasm-unsafe-eval'`) o permesso nuovo passa da lì ed è una decisione da motivare nella spec.

## Trappole già pagate (non ripetere)
- **Fine riga miste, file per file.** HTML, `main.js`, `sw.js`, `pwa.js` sono LF nel repo; `style.css`, `preload.js`, `page.js`, `consent.js`, `contact.js`, `home.js`, `portfolio.js` sono CRLF. La regola è: **un file tracciato mantiene lo stile che ha in `HEAD`** (lo verifica `scripts/check.mjs`); **tutti i file nuovi (toolbox/, docs/, scripts/, .claude/) sono LF.** Attenzione: sul disco di Genna alcuni file possono avere CR in più rispetto al repo (OneDrive/Windows): non "correggerli", non sono nel perimetro.
- **`_headers`: regole che coincidono si sommano**, non si sostituiscono (stesso header due volte = valori uniti da virgola = invalido). Regole `Cache-Control` una per percorso, mai sovrapposte. Commenti in colonna 0.
- **Ogni modifica a file in precache richiede di alzare `VERSION` in `sw.js`** (ora `v13`), altrimenti i visitatori vedono la versione vecchia. Non serve per `_headers`.
- **CSP e Spotify:** l'embed richiede `embed-cdn.spotifycdn.com` e `'unsafe-eval'`. Non toccare quelle voci.
- **Web3Forms limita per IP:** un proxy serverless è già stato provato e fallisce (429). La chiave pubblica è accettata.
- **Immagini:** quelle in `assets/` sono ottimizzate; gli originali stanno fuori dal repo (`archivio/`). Non ingrandire mai un asset già ridotto.
- **Il repository di Genna sta in OneDrive:** dopo ogni scrittura automatica verificare con `git status` che il file risulti cambiato.
- **Non collaudabili in locale:** Spotify e i limiti per IP dei servizi esterni. Si provano sul sito online (o su un deploy di anteprima di Cloudflare per branch).

## Regole per gli agenti (token = risorsa scarsa)
- Leggi solo i file che la tua consegna nomina, più quelli che `scout` ti ha indicato. Non esplorare per curiosità. Non rileggere file già riassunti nella consegna.
- Report finale ≤ 250 parole, sempre con le sezioni: **Fatto / File toccati / Dubbi / Prossimo**. Niente dump di codice nei report: il codice sta nei file.
- Non riformattare, non rinominare, non "migliorare" codice fuori dal perimetro della consegna.
- Le verifiche meccaniche (fine riga, chiavi di traduzione, VERSION, `_headers`, precache) le fa `node scripts/check.mjs`, non un agente: lancialo prima di dichiarare finito.
- Se una consegna è ambigua o viola un vincolo, fermati e dillo nel report invece di scegliere da solo.
