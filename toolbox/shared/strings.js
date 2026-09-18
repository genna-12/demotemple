/**
 * Tiny Temple Toolbox - note di riferimento: corda pizzicata.
 *
 * Gli oscillatori sommati "grattavano" all'attacco e finivano subito. Qui
 * la nota si calcola una volta sola dentro un AudioBuffer (Karplus-Strong:
 * un soffio di rumore che gira in una linea di ritardo lunga un periodo,
 * filtrata a ogni giro) e poi si suona: niente da sintetizzare mentre
 * suona, nessun click.
 *
 * - L'eccitazione e' rumore gia' filtrato e sfumato in ingresso: fra due
 *   campioni vicini non ci sono salti, quindi niente "grattata".
 * - Il decadimento dipende dalla frequenza: i gravi durano di piu'.
 * - Sui gravi del basso il loop e' "stirato" (piu' peso al campione
 *   precedente): senza, le note sotto i 60 Hz muoiono in mezzo secondo.
 * - Il violino non si pizzica: e' additivo, attacco 80 ms e vibrato 5,5 Hz.
 * - I buffer restano in cache per (strumento, frequenza, sample rate).
 *
 * createStringVoices(ctx) -> { play(hz, instrument), stop(), dispose() }
 * Catena: buffer -> gain (rampa >= 4 ms) -> master -> compressore -> uscita.
 */

const DURATION = 3.5;          // s di coda della corda pizzicata
const VIOLIN_DURATION = 3;
const ATTACK = 0.005;          // rampa di ingresso: mai un attacco secco
const RELEASE = 0.06;          // rilascio quando arriva la nota dopo
const LEVEL = 0.4;            // livello della voce (picco finale <= -3 dBFS)
const FADE_IN = 0.006;         // sfumatura dentro il buffer (anti-click)
const VIOLIN_ATTACK = 0.08;
const VIBRATO_HZ = 5.5;
const VIBRATO_CENTS = 6;

/* Quanto e' brillante il pizzicato e quanto "stira" il loop sui gravi. */
const VOICES = {
    guitar: { brightness: 2600, stretch: 0.5, level: 1 },
    bass: { brightness: 1400, stretch: 0.62, level: 1 },
    ukulele: { brightness: 3400, stretch: 0.5, level: 0.95 },
    violin: { bowed: true, level: 0.9 }
};

/** Che voce usa uno strumento dell'accordatore. */
export function voiceFor(instrument) {
    if (instrument === 'violin') return 'violin';
    if (instrument === 'bass4' || instrument === 'bass5') return 'bass';
    if (instrument === 'ukulele') return 'ukulele';
    return 'guitar';
}

/* un polo passa-basso: liscia il rumore d'ingresso (niente salti fra campioni) */
function onePole(cut, sr) {
    return Math.exp(-2 * Math.PI * cut / sr);
}

function normalize(data, peak) {
    let max = 0;
    for (let i = 0; i < data.length; i++) max = Math.max(max, Math.abs(data[i]));
    if (max <= 0) return;
    const g = peak / max;
    for (let i = 0; i < data.length; i++) data[i] *= g;
}

/** Sfuma i primi e gli ultimi millisecondi: il buffer non inizia ne' finisce di colpo. */
function fade(data, sr, inSec, outSec) {
    const nIn = Math.max(1, Math.floor(inSec * sr));
    for (let i = 0; i < nIn && i < data.length; i++) {
        data[i] *= 0.5 - 0.5 * Math.cos(Math.PI * i / nIn); // coseno rialzato
    }
    const nOut = Math.max(1, Math.floor(outSec * sr));
    for (let i = 0; i < nOut && i < data.length; i++) {
        const j = data.length - 1 - i;
        data[j] *= 0.5 - 0.5 * Math.cos(Math.PI * i / nOut);
    }
}

/** Corda pizzicata (Karplus-Strong esteso) in un buffer gia' pronto. */
export function pluckBuffer(ctx, hz, kind = 'guitar') {
    const sr = ctx.sampleRate;
    const spec = VOICES[kind] || VOICES.guitar;
    const n = Math.max(2, Math.round(sr / hz));
    const len = Math.floor(DURATION * sr);
    const buf = ctx.createBuffer(1, len, sr);
    const out = buf.getChannelData(0);

    /* eccitazione: rumore filtrato (brillantezza) e sfumato in ingresso */
    const line = new Float32Array(n + 1);
    const a = onePole(spec.brightness, sr);
    let z = 0;
    for (let i = 0; i < n; i++) {
        z = (1 - a) * (Math.random() * 2 - 1) + a * z;
        line[i] = z;
    }
    const ramp = Math.max(1, Math.floor(n * 0.35));
    for (let i = 0; i < ramp; i++) line[i] *= 0.5 - 0.5 * Math.cos(Math.PI * i / ramp);
    /* un mezzo periodo di fondamentale nel soffio iniziale: cosi' la corda
       parte sempre con la sua nota (col solo rumore la coda variava a caso) */
    for (let i = 0; i < n; i++) line[i] += 0.6 * Math.sin(2 * Math.PI * i / n);
    let mean = 0;
    for (let i = 0; i < n; i++) mean += line[i];
    mean /= n;
    for (let i = 0; i < n; i++) line[i] -= mean; // niente componente continua

    /* decadimento: i gravi suonano piu' a lungo, gli acuti si spengono prima */
    /* livello residuo a fine buffer: piu' alto = coda piu' lunga. Tarato
       perche' la nota resti sopra -40 dBFS per oltre 2,5 s a ogni altezza. */
    const target = hz < 100 ? 0.02 : hz < 250 ? 0.035 : 0.1;
    const loops = (DURATION * hz);
    const damp = Math.min(0.9999, Math.pow(target, 1 / Math.max(1, loops)));
    const s = spec.stretch;

    let read = 0;
    let prev = line[n - 1];
    for (let i = 0; i < len; i++) {
        const cur = line[read];
        const y = damp * ((1 - s) * cur + s * prev);
        out[i] = y;
        prev = cur;
        line[read] = y;
        read = (read + 1) % n;
    }
    fade(out, sr, FADE_IN, 0.05);
    normalize(out, 0.95);
    return buf;
}

/** Violino: additivo, arcata lenta e vibrato leggero. */
export function bowedBuffer(ctx, hz) {
    const sr = ctx.sampleRate;
    const len = Math.floor(VIOLIN_DURATION * sr);
    const buf = ctx.createBuffer(1, len, sr);
    const out = buf.getChannelData(0);
    const partials = [1, 0.5, 0.32, 0.2, 0.12, 0.08, 0.05];
    const depth = Math.pow(2, VIBRATO_CENTS / 1200) - 1;
    let phase = 0;
    for (let i = 0; i < len; i++) {
        const tt = i / sr;
        const vib = 1 + depth * Math.sin(2 * Math.PI * VIBRATO_HZ * tt);
        phase += 2 * Math.PI * hz * vib / sr;
        let v = 0;
        for (let p = 0; p < partials.length; p++) v += partials[p] * Math.sin(phase * (p + 1));
        /* arcata: entra in 80 ms, tiene, poi si spegne dolcemente */
        const att = Math.min(1, tt / VIOLIN_ATTACK);
        const rel = Math.min(1, (VIOLIN_DURATION - tt) / 0.4);
        out[i] = v * att * Math.max(0, rel) * 0.25;
    }
    fade(out, sr, FADE_IN, 0.05);
    normalize(out, 0.95);
    return buf;
}

export function createStringVoices(ctx, { destination = null } = {}) {
    const master = ctx.createGain();
    master.gain.value = 1;
    /* stesso compressore leggero del metronomo: tiene i picchi */
    let out = master;
    if (typeof ctx.createDynamicsCompressor === 'function') {
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.setValueAtTime(-12, ctx.currentTime);
        comp.knee.setValueAtTime(6, ctx.currentTime);
        comp.ratio.setValueAtTime(4, ctx.currentTime);
        comp.attack.setValueAtTime(0.003, ctx.currentTime);
        comp.release.setValueAtTime(0.1, ctx.currentTime);
        master.connect(comp);
        out = comp;
    }
    out.connect(destination || ctx.destination);

    const cache = new Map();
    let voice = null;

    function bufferFor(hz, kind) {
        const key = kind + '|' + hz.toFixed(2) + '|' + ctx.sampleRate;
        let buf = cache.get(key);
        if (!buf) {
            buf = (VOICES[kind] && VOICES[kind].bowed) ? bowedBuffer(ctx, hz) : pluckBuffer(ctx, hz, kind);
            cache.set(key, buf);
        }
        return buf;
    }

    function stop(at) {
        if (!voice) return;
        const v = voice;
        voice = null;
        const when = at || ctx.currentTime;
        try {
            /* si tiene il valore gia' raggiunto e si scende da li': leggere
               .value darebbe il livello di ADESSO, non quello a `when`. */
            if (typeof v.gain.gain.cancelAndHoldAtTime === 'function') {
                v.gain.gain.cancelAndHoldAtTime(when);
            } else {
                v.gain.gain.cancelScheduledValues(when);
                v.gain.gain.setValueAtTime(v.level, when);
            }
            v.gain.gain.linearRampToValueAtTime(0, when + RELEASE);
            v.src.stop(when + RELEASE + 0.01);
        } catch (e) { /* voce gia' finita */ }
    }

    /** Suona `hz` con la voce dello strumento; ritorna il tempo d'inizio. */
    function play(hz, instrument = 'guitar', when) {
        if (!(hz > 0)) return 0;
        const kind = VOICES[instrument] ? instrument : voiceFor(instrument);
        const t0 = typeof when === 'number' ? when : ctx.currentTime + 0.02;
        stop(t0);
        const src = ctx.createBufferSource();
        src.buffer = bufferFor(hz, kind);
        const gain = ctx.createGain();
        const level = LEVEL * ((VOICES[kind] && VOICES[kind].level) || 1);
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(level, t0 + ATTACK); // >= 4 ms, mai un gradino
        src.connect(gain).connect(master);
        src.start(t0);
        const v = { src, gain, level };
        voice = v;
        src.onended = () => {
            if (voice === v) voice = null;
            try { src.disconnect(); gain.disconnect(); } catch (e) { /* gia' scollegati */ }
        };
        return t0;
    }

    return {
        play,
        stop,
        playing: () => !!voice,
        /** Durata nominale della voce, per chi ripete la nota. */
        duration: (instrument) => ((VOICES[instrument] && VOICES[instrument].bowed)
            || voiceFor(instrument) === 'violin' ? VIOLIN_DURATION : DURATION),
        dispose() {
            stop();
            cache.clear();
            try { master.disconnect(); } catch (e) { /* gia' scollegato */ }
        }
    };
}
