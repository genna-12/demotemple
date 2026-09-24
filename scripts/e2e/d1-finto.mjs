/**
 * Finto binding D1 per la Pages Function del quaderno (spec 18 §4/§8).
 *
 * Erede del finto D1 scritto per la spec 17, con una differenza: niente
 * `better-sqlite3`. Qui si usa `node:sqlite`, che Node 22 porta dentro di
 * se': cosi' `scripts/e2e/` ha UNA sola dipendenza npm (@playwright/test),
 * non serve un compilatore nativo su GitHub e `npm ci` resta di due secondi.
 *
 * Espone la fetta di API D1 che la Function usa davvero:
 *   db.prepare(sql).bind(...valori).first() / .all() / .run()
 *   db.batch([istruzioni])   tutte in UNA transazione, tutto o niente, come D1
 *                            (-> un risultato per istruzione); conta come UNA
 *                            chiamata in `chiamate()` e una query per istruzione
 * I parametri sono `?1 ?2 ...`: sqlite li lega per posizione, quindi
 * `bind()` passa i valori nell'ordine in cui arrivano.
 *
 * Lo schema e' quello DEFINITIVO della spec 18 §4, copiato parola per parola.
 */

import { DatabaseSync } from 'node:sqlite';

export const SCHEMA = `
CREATE TABLE voci (
  quaderno TEXT NOT NULL, collezione TEXT NOT NULL, doc TEXT NOT NULL,
  aggiornato INTEGER NOT NULL, cancellato INTEGER NOT NULL DEFAULT 0,
  blob TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (quaderno, collezione, doc));
CREATE TABLE limiti (
  quaderno TEXT PRIMARY KEY, finestra INTEGER NOT NULL, colpi INTEGER NOT NULL);
`;

/** -> un oggetto con la forma del binding `env.QUADERNO`. */
export function creaD1() {
    const db = new DatabaseSync(':memory:');
    db.exec(SCHEMA);
    let query = 0;
    let batch = 0;

    const d1 = {
        /* utili ai test, non alla Function */
        query: () => query,
        lotti: () => batch,
        azzeraConto() { query = 0; batch = 0; },
        svuota() { db.exec('DELETE FROM voci; DELETE FROM limiti;'); },

        prepare(sql) {
            const st = db.prepare(sql);
            let args = [];
            const eseguibile = {
                bind(...a) { args = a; return eseguibile; },
                async first() {
                    query++;
                    const r = st.get(...args);
                    return r === undefined ? null : r;
                },
                async all() {
                    query++;
                    return { results: st.all(...args), success: true };
                },
                async run() {
                    query++;
                    const i = st.run(...args);
                    return { success: true, meta: { changes: i.changes } };
                },
                /* per batch(): esegue senza contare la chiamata due volte */
                esegui() {
                    query++;
                    if (st.columns().length) return { results: st.all(...args), success: true, meta: {} };
                    const i = st.run(...args);
                    return { results: [], success: true, meta: { changes: i.changes } };
                }
            };
            return eseguibile;
        }
    };
    d1.batch = async (istruzioni) => {
        if (!Array.isArray(istruzioni) || !istruzioni.length) throw new Error('batch vuoto');
        batch++;
        db.exec('BEGIN');
        try {
            const out = istruzioni.map((x) => x.esegui());
            db.exec('COMMIT');
            return out;
        } catch (e) {
            db.exec('ROLLBACK');
            throw e;
        }
    };
    return d1;
}
