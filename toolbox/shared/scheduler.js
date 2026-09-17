/**
 * Tiny Temple Toolbox - scheduler "lookahead" per l'audio.
 *
 * Il classico schema di Chris Wilson: un timer poco preciso (setInterval)
 * guarda avanti di poche decine di millisecondi e prenota gli eventi sul
 * clock dell'AudioContext, che invece e' preciso al campione. Il timer puo'
 * arrivare in ritardo: i tempi sono gia' scritti, il suono non si sposta.
 *
 * Non sa nulla di musica: chi lo usa decide quanto dura il prossimo
 * intervallo (nextInterval) e cosa suonare (onSchedule).
 *
 * createScheduler({ ctx, interval, lookahead, onSchedule, nextInterval })
 *   ctx           AudioContext (serve solo currentTime)
 *   interval      ms fra un giro e l'altro del timer (25 di default)
 *   lookahead     secondi di orizzonte (0.1 di default)
 *   onSchedule    (time, i) => data   prenota il suono a `time`; quel che
 *                 torna finisce nella coda (usato dal disegno a schermo)
 *   nextInterval  (i) => secondi fino all'evento successivo
 *
 * Ritorna { start, stop, running, queue, reset, next }:
 *   queue()  eventi gia' prenotati e non ancora passati, in ordine:
 *            [{ time, i, data }]; chi disegna li legge a ogni frame e
 *            toglie quelli il cui `time` e' passato (drop/shift).
 *   start()  riparte da i = 0 con un piccolo margine iniziale.
 */

const DEFAULT_INTERVAL = 25;
const DEFAULT_LOOKAHEAD = 0.1;
const START_MARGIN = 0.06; // s: tempo per prenotare il primo evento

export function createScheduler({
    ctx,
    interval = DEFAULT_INTERVAL,
    lookahead = DEFAULT_LOOKAHEAD,
    onSchedule,
    nextInterval
} = {}) {
    if (!ctx) throw new Error('createScheduler: manca ctx');
    if (typeof onSchedule !== 'function') throw new Error('createScheduler: manca onSchedule');
    if (typeof nextInterval !== 'function') throw new Error('createScheduler: manca nextInterval');

    let timer = null;
    let nextTime = 0; // tempo (ctx.currentTime) del prossimo evento
    let index = 0;    // contatore progressivo degli eventi
    let pending = [];

    function tick() {
        const horizon = ctx.currentTime + lookahead;
        /* un solo accumulo: nextTime += durata. Niente Date.now(), niente
           ricalcolo dall'inizio: cosi' non si accumula deriva. */
        while (nextTime < horizon) {
            const i = index;
            const time = nextTime;
            let data;
            try {
                data = onSchedule(time, i);
            } catch (e) {
                console.warn('[scheduler] onSchedule fallita', e);
            }
            pending.push({ time, i, data });
            index = i + 1;
            const step = nextInterval(i);
            /* passo non valido: meglio fermarsi che riempire la coda a vuoto */
            if (!(step > 0) || !isFinite(step)) { stop(); return; }
            nextTime = time + step;
        }
    }

    function start(at) {
        if (timer !== null) return;
        pending = [];
        index = 0;
        nextTime = (typeof at === 'number' ? at : ctx.currentTime) + START_MARGIN;
        tick();
        timer = setInterval(tick, interval);
    }

    function stop() {
        if (timer !== null) clearInterval(timer);
        timer = null;
        pending = [];
    }

    return {
        start,
        stop,
        running: () => timer !== null,
        queue: () => pending,
        /** Toglie dalla coda gli eventi gia' passati e li restituisce. */
        drain: (now = ctx.currentTime) => {
            const done = [];
            while (pending.length && pending[0].time <= now) done.push(pending.shift());
            return done;
        },
        /** Tempo del prossimo evento non ancora prenotato. */
        next: () => nextTime,
        reset: () => { pending = []; index = 0; }
    };
}
