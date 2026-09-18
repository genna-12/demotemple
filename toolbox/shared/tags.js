/**
 * Tiny Temple Toolbox - tag dei file audio (titolo, artista, album, anno,
 * copertina). Nessuna libreria: si leggono solo i byte che servono.
 *
 * Formati: ID3v2.3/2.4 (MP3 e affini), MP4/M4A (atomi moov > udta > meta >
 * ilst) e FLAC (VORBIS_COMMENT + PICTURE). Di un file si legge l'inizio
 * (dove stanno i tag) e, per l'MP4, si segue la catena degli atomi con
 * `File.slice`: non si carica mai il brano intero.
 *
 * readTags(file) -> Promise<{ title, artist, album, year, cover }>
 *   cover = { blob, type } oppure null; oltre COVER_MAX non si tiene.
 * Le funzioni `parse*` prendono un ArrayBuffer e si provano in Node.
 */

export const COVER_MAX = 300 * 1024;   // 300 KB: oltre e' una copertina da PC
const SNIFF_BYTES = 16;                // bastano a capire che file e'
const FLAC_BYTES = 512 * 1024;         // blocchi di metadati, copertina compresa
const MP4_SCAN = 4 * 1024 * 1024;      // quanto si scorre al massimo per gli atomi

const EMPTY = { title: '', artist: '', album: '', year: '', cover: null };

const ascii = (view, from, len) => {
    let s = '';
    for (let i = 0; i < len; i++) s += String.fromCharCode(view.getUint8(from + i));
    return s;
};

/* ISO-8859-1, UTF-16 (con BOM) e UTF-8: i tre casi di ID3. */
function decodeText(bytes, encoding) {
    if (!bytes.length) return '';
    try {
        if (encoding === 1 || encoding === 2) {
            const le = bytes[0] === 0xff && bytes[1] === 0xfe;
            const be = bytes[0] === 0xfe && bytes[1] === 0xff;
            const body = le || be ? bytes.subarray(2) : bytes;
            const label = encoding === 2 || be ? 'utf-16be' : 'utf-16le';
            return new TextDecoder(label).decode(body).replace(/\0+$/, '');
        }
        const label = encoding === 3 ? 'utf-8' : 'iso-8859-1';
        return new TextDecoder(label).decode(bytes).replace(/\0+$/, '');
    } catch (e) {
        let s = '';
        for (let i = 0; i < bytes.length; i++) if (bytes[i]) s += String.fromCharCode(bytes[i]);
        return s;
    }
}

const syncsafe = (view, at) => (view.getUint8(at) << 21) | (view.getUint8(at + 1) << 14)
    | (view.getUint8(at + 2) << 7) | view.getUint8(at + 3);

/** ID3v2.3 / 2.4 in testa al file. */
export function parseId3(buffer) {
    const view = new DataView(buffer);
    if (buffer.byteLength < 10 || ascii(view, 0, 3) !== 'ID3') return null;
    const major = view.getUint8(3);
    const flags = view.getUint8(5);
    const size = syncsafe(view, 6);
    let at = 10;
    if (flags & 0x40) at += view.getUint32(at) + 4; // header esteso
    const end = Math.min(buffer.byteLength, 10 + size);
    const out = { ...EMPTY };
    while (at + 10 <= end) {
        const id = ascii(view, at, 4);
        if (!/^[A-Z0-9]{4}$/.test(id)) break;
        const frameSize = major >= 4 ? syncsafe(view, at + 4) : view.getUint32(at + 4);
        const body = at + 10;
        if (frameSize <= 0 || body + frameSize > end) break;
        const bytes = new Uint8Array(buffer, body, frameSize);
        if (id === 'APIC') {
            const encoding = bytes[0];
            let i = 1;
            while (i < bytes.length && bytes[i] !== 0) i++;          // mime
            const type = decodeText(bytes.subarray(1, i), 0) || 'image/jpeg';
            i += 2;                                                   // 0 + picture type
            /* descrizione: termina con 0 (o 00 00 in UTF-16) */
            if (encoding === 1 || encoding === 2) {
                while (i + 1 < bytes.length && !(bytes[i] === 0 && bytes[i + 1] === 0)) i += 2;
                i += 2;
            } else {
                while (i < bytes.length && bytes[i] !== 0) i++;
                i += 1;
            }
            const data = bytes.subarray(i);
            if (data.length && data.length <= COVER_MAX) out.cover = { bytes: data.slice(), type };
        } else if (id[0] === 'T') {
            const text = decodeText(bytes.subarray(1), bytes[0]).split('\0')[0].trim();
            if (id === 'TIT2') out.title = text;
            else if (id === 'TPE1') out.artist = text;
            else if (id === 'TALB') out.album = text;
            else if (id === 'TYER' || id === 'TDRC') out.year = (text.match(/\d{4}/) || [''])[0];
        }
        at = body + frameSize;
    }
    return out;
}

/** Dove finiscono i tag ID3 (serve a sapere quanti byte leggere). */
export function id3Length(buffer) {
    const view = new DataView(buffer);
    if (buffer.byteLength < 10 || ascii(view, 0, 3) !== 'ID3') return 0;
    return 10 + syncsafe(view, 6);
}

const MP4_TEXT = { '©nam': 'title', '©ART': 'artist', '©alb': 'album', '©day': 'year' };

/** ilst di un MP4/M4A: le voci che interessano. */
export function parseMp4Ilst(buffer) {
    const view = new DataView(buffer);
    const out = { ...EMPTY };
    let at = 0;
    while (at + 8 <= buffer.byteLength) {
        const size = view.getUint32(at);
        const name = ascii(view, at + 4, 4);
        if (size < 8 || at + size > buffer.byteLength) break;
        /* dentro ogni voce c'e' un atomo "data": 8 byte di intestazione,
           4 di tipo, 4 di locale, poi il valore */
        if (at + 16 <= buffer.byteLength && ascii(view, at + 12, 4) === 'data') {
            const dataSize = view.getUint32(at + 8);
            const type = view.getUint32(at + 16);
            const from = at + 24;
            const len = Math.max(0, dataSize - 16);
            const bytes = new Uint8Array(buffer, from, Math.min(len, buffer.byteLength - from));
            if (MP4_TEXT[name]) {
                const text = decodeText(bytes, 3).trim();
                out[MP4_TEXT[name]] = MP4_TEXT[name] === 'year' ? (text.match(/\d{4}/) || [''])[0] : text;
            } else if (name === 'covr' && bytes.length && bytes.length <= COVER_MAX) {
                out.cover = { bytes: bytes.slice(), type: type === 13 ? 'image/jpeg' : 'image/png' };
            }
        }
        at += size;
    }
    return out;
}

/** VORBIS_COMMENT e PICTURE di un FLAC. */
export function parseFlac(buffer) {
    const view = new DataView(buffer);
    if (buffer.byteLength < 8 || ascii(view, 0, 4) !== 'fLaC') return null;
    const out = { ...EMPTY };
    let at = 4;
    let last = false;
    while (!last && at + 4 <= buffer.byteLength) {
        const header = view.getUint8(at);
        last = (header & 0x80) !== 0;
        const type = header & 0x7f;
        const size = (view.getUint8(at + 1) << 16) | (view.getUint8(at + 2) << 8) | view.getUint8(at + 3);
        const body = at + 4;
        if (body + size > buffer.byteLength) break;
        if (type === 4) { // VORBIS_COMMENT: little endian
            let p = body;
            const vendor = view.getUint32(p, true);
            p += 4 + vendor;
            const count = view.getUint32(p, true);
            p += 4;
            for (let i = 0; i < count && p + 4 <= body + size; i++) {
                const len = view.getUint32(p, true);
                p += 4;
                const text = decodeText(new Uint8Array(buffer, p, len), 3);
                p += len;
                const eq = text.indexOf('=');
                if (eq < 0) continue;
                const field = text.slice(0, eq).toUpperCase();
                const value = text.slice(eq + 1).trim();
                if (field === 'TITLE') out.title = value;
                else if (field === 'ARTIST') out.artist = value;
                else if (field === 'ALBUM') out.album = value;
                else if (field === 'DATE' || field === 'YEAR') out.year = (value.match(/\d{4}/) || [''])[0];
            }
        } else if (type === 6) { // PICTURE
            let p = body + 4;
            const mimeLen = view.getUint32(p);
            p += 4;
            const mime = ascii(view, p, mimeLen);
            p += mimeLen;
            const descLen = view.getUint32(p);
            p += 4 + descLen + 16; // descrizione + larghezza/altezza/profondita'/colori
            const dataLen = view.getUint32(p);
            p += 4;
            if (dataLen && dataLen <= COVER_MAX && p + dataLen <= buffer.byteLength) {
                out.cover = { bytes: new Uint8Array(buffer, p, dataLen).slice(), type: mime || 'image/jpeg' };
            }
        }
        at = body + size;
    }
    return out;
}

/* Scorre gli atomi MP4 fino a ilst leggendo solo le intestazioni. */
async function mp4Ilst(file) {
    const read = async (from, to) => (await file.slice(from, Math.min(to, file.size)).arrayBuffer());
    const CONTAINERS = ['moov', 'udta', 'meta', 'ilst'];
    let start = 0;
    let end = Math.min(file.size, MP4_SCAN);
    for (let depth = 0; depth < CONTAINERS.length; depth++) {
        const want = CONTAINERS[depth];
        let at = start;
        let found = null;
        while (at + 8 <= end) {
            const head = new DataView(await read(at, at + 8));
            const size = head.getUint32(0);
            const name = String.fromCharCode(head.getUint8(4), head.getUint8(5), head.getUint8(6), head.getUint8(7));
            if (size < 8) break;
            if (name === want) { found = { at, size }; break; }
            at += size;
        }
        if (!found) return null;
        start = found.at + 8;
        if (want === 'meta') start += 4; // 'meta' ha 4 byte di versione
        end = Math.min(file.size, found.at + found.size);
        if (want === 'ilst') return read(start, end);
    }
    return null;
}

/** Legge i tag di un File/Blob: solo i byte necessari, mai tutto il brano. */
export async function readTags(file) {
    if (!file || typeof file.slice !== 'function') return { ...EMPTY };
    try {
        /* prima si annusa: sedici byte dicono gia' di che file si tratta,
           poi si legge SOLO la parte che contiene i tag */
        const sniff = await file.slice(0, Math.min(SNIFF_BYTES, file.size)).arrayBuffer();
        const view = new DataView(sniff);
        if (sniff.byteLength >= 4 && ascii(view, 0, 4) === 'fLaC') {
            const head = await file.slice(0, Math.min(FLAC_BYTES, file.size)).arrayBuffer();
            return parseFlac(head) || { ...EMPTY };
        }
        if (sniff.byteLength >= 10 && ascii(view, 0, 3) === 'ID3') {
            const need = Math.max(10, id3Length(sniff));
            const head = await file.slice(0, Math.min(need, file.size)).arrayBuffer();
            return parseId3(head) || { ...EMPTY };
        }
        if (sniff.byteLength >= 12 && ascii(view, 4, 4) === 'ftyp') {
            const ilst = await mp4Ilst(file);
            return ilst ? parseMp4Ilst(ilst) : { ...EMPTY };
        }
    } catch (e) { /* file strano: si va avanti senza tag */ }
    return { ...EMPTY };
}

/** La copertina come Blob pronto per un <img> (non si salva mai). */
export function coverBlob(cover) {
    if (!cover || !cover.bytes || typeof Blob === 'undefined') return null;
    return new Blob([cover.bytes], { type: cover.type || 'image/jpeg' });
}
