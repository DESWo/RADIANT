#!/usr/bin/env node
/* Runs every check and exits non-zero if any fail, so CI can gate on it.
   Usage:  npm test            all suites
           npm test static     one suite by name */

import { serve } from './lib.mjs';
import * as staticChecks from './static.mjs';
import * as models from './models.mjs';
import * as physics from './physics.mjs';
import * as museum from './museum.mjs';
import * as render from './render.mjs';

const SUITES = [staticChecks, models, physics, museum, render];
const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const chosen = only.length ? SUITES.filter((s) => only.includes(s.NAME)) : SUITES;

if (!chosen.length) {
  console.error(`unknown suite. available: ${SUITES.map((s) => s.NAME).join(', ')}`);
  process.exit(2);
}

/* A suite that opens no page needs no browser and no server URL. */
const browserless = (s) => s.NEEDS_BROWSER === false || s.NAME === 'static';

const server = await serve();
const needsBrowser = chosen.some((s) => !browserless(s));
/* Playwright is imported lazily so the browserless suites can run where it is
   not installed — the news workflow validates news.json with only Node. */
const browser = needsBrowser ? await (await import('playwright')).chromium.launch() : null;
const started = Date.now();
const results = [];

for (const suite of chosen) {
  console.log(`\n=== ${suite.NAME} ===`);
  try {
    results.push(await (browserless(suite) ? suite.run() : suite.run(browser, server.url)));
  } catch (err) {
    console.log(`    FAIL suite threw: ${err.message}`);
    results.push({ name: suite.NAME, passed: 0, failures: [`suite threw: ${err.message}`] });
  }
}

if (browser) await browser.close();
await server.close();

const passed = results.reduce((n, r) => n + r.passed, 0);
const failures = results.flatMap((r) => r.failures.map((f) => `${r.name}: ${f}`));
const secs = ((Date.now() - started) / 1000).toFixed(0);

console.log('\n' + '='.repeat(64));
for (const r of results) {
  console.log(`  ${r.failures.length ? 'FAIL' : 'pass'}  ${r.name.padEnd(9)} ${r.passed} passed${r.failures.length ? `, ${r.failures.length} failed` : ''}`);
}
if (failures.length) {
  console.log('\nfailures:');
  for (const f of failures) console.log(`  - ${f}`);
}
console.log(`\n${passed} checks passed, ${failures.length} failed, in ${secs}s`);
process.exit(failures.length ? 1 : 0);
