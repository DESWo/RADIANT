/* Checks that need no browser: markup integrity, citation integrity, and the
   project's own house rules (no CDN links, self-hosted fonts). */

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { html, ROOT, tracker } from './lib.mjs';

/* Everything the browser is served, concatenated. The site is split across
   index.html plus css/ and js/, so a rule like "no CDN links" has to be
   checked against all of it, not just the page. */
async function allSource() {
  const parts = [await html()];
  for (const dir of ['css', 'js', 'data']) {
    let names = [];
    try { names = await readdir(join(ROOT, dir)); } catch { continue; }
    for (const n of names.filter((f) => /\.(css|js|mjs)$/.test(f))) {
      parts.push(await readFile(join(ROOT, dir, n), 'utf8'));
    }
  }
  return parts.join('\n');
}

export const NAME = 'static';

export async function run() {
  const t = tracker(NAME);
  const src = await html();
  const shipped = await allSource();

  // --- duplicate ids -------------------------------------------------------
  const ids = [...src.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dupes = [...new Set(ids.filter((v, i) => ids.indexOf(v) !== i))];
  dupes.length ? t.fail(`duplicate ids: ${dupes.join(', ')}`) : t.ok(`no duplicate ids (${ids.length} unique)`);

  // --- internal anchors and aria references --------------------------------
  const idSet = new Set(ids);
  const anchors = [...new Set([...src.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]))];
  const deadAnchors = anchors.filter((a) => a && !idSet.has(a));
  deadAnchors.length ? t.fail(`anchors with no target: ${deadAnchors.join(', ')}`)
                     : t.ok(`all ${anchors.length} internal anchors resolve`);

  const ariaRefs = [...new Set(
    [...src.matchAll(/aria-(?:labelledby|controls|describedby)="([^"]+)"/g)]
      .flatMap((m) => m[1].split(/\s+/)).filter(Boolean))];
  const deadAria = ariaRefs.filter((a) => !idSet.has(a));
  deadAria.length ? t.fail(`aria references with no target: ${deadAria.join(', ')}`)
                  : t.ok(`all ${ariaRefs.length} aria references resolve`);

  // --- citation integrity --------------------------------------------------
  // Every figure on this site is meant to carry a primary source, and the
  // simulator cites references by hard-coded number, so a renumber is silent.
  const refBlock = src.match(/<ol class="ref-list">([\s\S]*?)<\/ol>/);
  if (!refBlock) {
    t.fail('reference list not found');
  } else {
    const count = (refBlock[1].match(/<li/g) || []).length;
    count > 0 ? t.ok(`reference list has ${count} numbered sources`) : t.fail('reference list is empty');
    const markers = [...new Set([...src.matchAll(/\(reference (\d+)\)/g)].map((m) => +m[1]))];
    const dangling = markers.filter((n) => n < 1 || n > count);
    dangling.length
      ? t.fail(`hard-coded "(reference N)" markers point past the list: ${dangling.join(', ')}`)
      : t.ok(`all ${markers.length} hard-coded reference markers are in range 1..${count}`);
  }

  // A count-up animation reads its target from the attribute; if the attribute
  // and the printed digits disagree, the number changes as it animates.
  const counters = [...src.matchAll(/data-count="([\d.]+)"[^>]*>([^<]*)</g)];
  const drifted = counters.filter(([, attr, text]) => {
    const shown = parseFloat(text.replace(/,/g, ''));
    return Number.isFinite(shown) && Math.abs(shown - parseFloat(attr)) > 0.001;
  });
  drifted.length
    ? t.fail(`data-count disagrees with printed digits: ${drifted.map(([, a, x]) => `${a} vs ${x.trim()}`).join('; ')}`)
    : t.ok(`all ${counters.length} count-up figures match their printed value`);

  // --- house rules ---------------------------------------------------------
  // Libraries and fonts are vendored on purpose; a CDN link breaks that.
  // Anything the browser would fetch at runtime from another host: a script or
  // stylesheet reference, a CSS @import, or a url() inside a stylesheet.
  const remote = [...shipped.matchAll(
    /(?:src|href)="(https?:\/\/[^"]+)"|@import\s+(?:url\()?['"]?(https?:\/\/[^'")]+)|url\(['"]?(https?:\/\/[^'")]+)/g,
  )].map((m) => m[1] || m[2] || m[3]).filter(Boolean);
  const hosted = [...new Set(remote)].filter((u) => /cdn|unpkg|jsdelivr|googleapis|gstatic|cdnjs|typekit|fontawesome/i.test(u));
  hosted.length ? t.fail(`assets fetched from another host: ${hosted.join(', ')}`)
                : t.ok(`no CDN or hosted-font requests (${remote.length} external URLs, all citation links)`);

  // Match the rule, not the words: "@font-face" also appears in prose comments.
  const faceRules = [...shipped.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]);
  const noSwap = faceRules.filter((b) => !/font-display:\s*swap/.test(b)).length;
  faceRules.length && !noSwap
    ? t.ok(`all ${faceRules.length} self-hosted faces declare font-display: swap`)
    : t.fail(`${noSwap} of ${faceRules.length} @font-face rules lack font-display: swap`);

  // --- the old global numbering must not come back -------------------------
  const oldNumbering = [...src.matchAll(/<span class="overline"><span class="n">\d+<\/span>/g)];
  oldNumbering.length
    ? t.fail(`${oldNumbering.length} section overlines still carry a hard-coded number`)
    : t.ok('no hard-coded section numbers in the overlines');

  // --- news.json -----------------------------------------------------------
  let news;
  try {
    news = JSON.parse(await readFile(join(ROOT, 'news.json'), 'utf8'));
    t.ok('news.json is valid JSON');
  } catch (e) {
    t.fail(`news.json does not parse: ${e.message}`);
  }
  if (news) {
    Array.isArray(news.items) && news.items.length
      ? t.ok(`news.json carries ${news.items.length} items`)
      : t.fail('news.json has no items array');
    const REQUIRED = ['title', 'url', 'source', 'date', 'cat'];
    const bad = (news.items || []).filter((it) => REQUIRED.some((k) => !it[k]));
    bad.length ? t.fail(`${bad.length} news items missing required fields (${REQUIRED.join(', ')})`)
               : t.ok(`every news item has ${REQUIRED.join(', ')}`);
    const badUrl = (news.items || []).filter((it) => !/^https?:\/\//.test(it.url || ''));
    badUrl.length ? t.fail(`${badUrl.length} news items have a non-http url`) : t.ok('every news url is absolute http(s)');
  }

  return t;
}
