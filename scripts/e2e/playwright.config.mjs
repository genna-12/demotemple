/**
 * Tiny Temple Toolbox - configurazione dei test end-to-end (spec 18 §8).
 *
 * Due progetti, gli stessi due dell'audit del 21/09:
 *   mobile   390x844, isMobile, hasTouch, deviceScaleFactor 2  (iPhone 12/13/14)
 *   desktop  1366x768, puntatore fine
 * I test che riguardano il dito girano SOLO in `mobile` (lo dicono da soli,
 * con `test.skip`), tutti gli altri girano in tutti e due.
 *
 * Il server e' `serve.mjs` sulla 4321: statico da `toolbox/` con `_headers`
 * e clean URL, piu' lo stub in memoria di `/api/quaderno/*`.
 *
 * Traccia e screenshot SOLO sui fallimenti (spec 18 §8): un giro verde non
 * lascia niente sul disco.
 */

import { defineConfig, devices } from '@playwright/test';

const CI = !!process.env.CI;
const BASE = 'http://127.0.0.1:4321';

export default defineConfig({
    testDir: './tests',
    testMatch: '**/*.spec.mjs',
    fullyParallel: true,
    forbidOnly: CI,
    retries: CI ? 1 : 0,
    workers: CI ? 2 : undefined,
    timeout: 60000,
    expect: { timeout: 7000 },
    reporter: [['list'], ['html', { outputFolder: 'report', open: 'never' }]],
    outputDir: 'test-results',

    use: {
        baseURL: BASE,
        locale: 'it-IT',
        timezoneId: 'Europe/Rome',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'off',
        /* l'app registra un service worker: l'offline dopo il primo
           caricamento non si puo' provare senza (spec 18 §8) */
        serviceWorkers: 'allow'
    },

    projects: [
        {
            name: 'mobile',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 390, height: 844 },
                deviceScaleFactor: 2,
                isMobile: true,
                hasTouch: true
            }
        },
        {
            name: 'desktop',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1366, height: 768 },
                deviceScaleFactor: 1,
                isMobile: false,
                hasTouch: false
            }
        }
    ],

    webServer: {
        command: 'node serve.mjs',
        url: BASE + '/',
        cwd: new URL('.', import.meta.url).pathname,
        reuseExistingServer: !CI,
        timeout: 30000,
        stdout: 'ignore',
        stderr: 'pipe'
    }
});
