/* Shared helpers for the RADIANT checks.
   Every test file exports `run(t)` and reports through this tiny harness, so
   the runner can total them up and set a non-zero exit code for CI. */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};

/* The site has no build step, so the tests serve the folder as-is. */
export function serve(root = ROOT) {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        const url = decodeURIComponent((req.url || '/').split('?')[0]);
        let path = join(root, normalize(url).replace(/^(\.\.[/\\])+/, ''));
        if ((await stat(path)).isDirectory()) path = join(path, 'index.html');
        const body = await readFile(path);
        res.writeHead(200, { 'content-type': MIME[extname(path)] || 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(404).end('not found');
      }
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ url: `http://127.0.0.1:${port}`, close: () => new Promise((r) => server.close(r)) });
    });
  });
}

export function tracker(name) {
  const t = {
    name, passed: 0, failures: [],
    ok(msg) { t.passed++; console.log(`    ok   ${msg}`); },
    fail(msg) { t.failures.push(msg); console.log(`    FAIL ${msg}`); },
    is(actual, expected, msg) {
      actual === expected ? t.ok(`${msg} (${actual})`)
                          : t.fail(`${msg}: got ${actual}, wanted ${expected}`);
    },
    /* Physics compares against analytic values, so it needs a tolerance. */
    near(actual, expected, tolFrac, msg) {
      const diff = Math.abs(actual - expected);
      const lim = Math.abs(expected) * tolFrac;
      diff <= lim
        ? t.ok(`${msg}: ${fmt(actual)} vs analytic ${fmt(expected)} (${pct(diff, expected)})`)
        : t.fail(`${msg}: ${fmt(actual)} vs analytic ${fmt(expected)}, off by ${pct(diff, expected)} (limit ${(tolFrac * 100).toFixed(1)}%)`);
    },
  };
  return t;
}

const fmt = (v) => (Math.abs(v) >= 1000 || (Math.abs(v) < 0.01 && v !== 0) ? v.toExponential(3) : v.toFixed(4).replace(/0+$/, '').replace(/\.$/, ''));
const pct = (d, e) => (e === 0 ? `${fmt(d)} abs` : `${((d / Math.abs(e)) * 100).toFixed(2)}%`);

export async function html() {
  return readFile(join(ROOT, 'index.html'), 'utf8');
}

/* Opens the museum and returns a page plus the console/page errors it emitted. */
export async function museumPage(browser, { width = 1440, height = 900, url, hash = '', ...opts } = {}) {
  const page = await browser.newPage({ viewport: { width, height }, ...opts });
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  await page.goto(url + '/index.html' + hash, { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  return { page, errors };
}

export const toLobby = (page) =>
  page.evaluate(() => (document.getElementById('wb-lobby') || document.getElementById('go-lobby'))?.click());

export const openBook = (page, title) =>
  page.evaluate((t) => [...document.querySelectorAll('.book')].find((b) => b.innerText.trim() === t)?.click(), title);

/* A room's content is in the DOM before it is on screen, so anything that
   asserts about what a visitor sees has to require paint, not presence. */
export async function pageToVisible(page, selector, tries = 18) {
  for (let i = 0; i < tries; i++) {
    const seen = await page.evaluate((s) => {
      const el = document.querySelector('.view.in-wing.is-page ' + s);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.height > 30 && r.top < innerHeight && r.bottom > 0 && +getComputedStyle(el).opacity > 0.5;
    }, selector);
    if (seen) return true;
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(650);
  }
  return false;
}
