/* Checks that need no browser: markup integrity, citation integrity, and the
   project's own house rules (no CDN links, self-hosted fonts). */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { html, ROOT, tracker } from './lib.mjs';

export const NAME = 'static';

export async function run() {
  const t = tracker(NAME);
  const src = await html();

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
  const cdn = [...src.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)]
    .map((m) => m[1])
    .filter((u) => !/^https?:\/\/(www\.)?(ourworldindata|ipcc|unece|eia|nrc|iaea|bls|ans|energy|neup|naygn|winus|pris|umich|mit|berkeley|tamu|psu|gatech|wisc|utk|ncsu|purdue|oregonstate|pexels|ember)/i.test(u))
    .filter((u) => /cdn|unpkg|jsdelivr|googleapis|gstatic|cdnjs/i.test(u));
  cdn.length ? t.fail(`external asset links found: ${cdn.join(', ')}`) : t.ok('no CDN or hosted-font links');

  const swap = (src.match(/font-display:\s*swap/g) || []).length;
  swap > 0 ? t.ok(`self-hosted fonts declare font-display: swap (${swap} faces)`)
           : t.fail('no font-display: swap found');

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
