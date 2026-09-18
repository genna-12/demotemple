/**
 * Tiny Temple Toolbox - riempimento dei cursori `.tb-range`.
 *
 * Il CSS colora la traccia fino a `--tb-fill` (una percentuale), ma quella
 * variabile va scritta: senza JS il cursore si muove e la barra resta
 * grigia. Qui si aggiorna a ogni `input`/`change` e al montaggio.
 *
 * I cambi fatti da codice (reset dell'A4, preferenze rilette) non emettono
 * eventi: chi scrive `input.value` chiama `syncRange(input)`. Per comodita'
 * `mountRange` avvolge anche il setter di `value` dell'elemento, cosi' un
 * `input.value = 432` scritto altrove aggiorna comunque il riempimento.
 *
 * mountRanges(root = document) -> numero di cursori agganciati
 * mountRange(input), syncRange(input)
 */

const mounted = new WeakSet();

/** Aggiorna `--tb-fill` sull'input (e sul contenitore, se serve al CSS). */
export function syncRange(input) {
    if (!input) return;
    const min = Number(input.min === '' ? 0 : input.min);
    const max = Number(input.max === '' ? 100 : input.max);
    const value = Number(input.value);
    const span = max - min;
    const pct = span > 0 ? ((Math.min(max, Math.max(min, value)) - min) / span) * 100 : 0;
    const text = pct.toFixed(2) + '%';
    input.style.setProperty('--tb-fill', text);
    const wrap = input.parentElement;
    if (wrap && wrap.classList && wrap.classList.contains('tb-range-wrap')) {
        wrap.style.setProperty('--tb-fill', text);
    }
}

export function mountRange(input) {
    if (!input || mounted.has(input)) return null;
    mounted.add(input);
    input.addEventListener('input', () => syncRange(input));
    input.addEventListener('change', () => syncRange(input));
    /* value scritto da codice: nessun evento, quindi si intercetta il setter */
    try {
        const proto = Object.getPrototypeOf(input);
        const desc = Object.getOwnPropertyDescriptor(proto, 'value');
        if (desc && desc.set && desc.get) {
            Object.defineProperty(input, 'value', {
                configurable: true,
                get() { return desc.get.call(this); },
                set(v) {
                    desc.set.call(this, v);
                    syncRange(this);
                }
            });
        }
    } catch (e) { /* proprieta' non ridefinibile: resta syncRange() a mano */ }
    syncRange(input);
    return input;
}

/** Aggancia tutti i cursori della pagina (idempotente). */
export function mountRanges(root = document) {
    const list = [
        ...root.querySelectorAll('input[type="range"].tb-range'),
        ...root.querySelectorAll('.tb-range input[type="range"]')
    ];
    const seen = new Set();
    list.forEach((input) => {
        if (seen.has(input)) return;
        seen.add(input);
        mountRange(input);
    });
    return seen.size;
}
