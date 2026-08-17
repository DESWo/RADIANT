/* The museum as a navigation system: the wings match the registry, every hash
   the site writes can be read back, the dosimeter is scaled to the museum that
   exists, and a room paginates the same way every time it is opened. */

import { museumPage, openBook, toLobby, tracker } from './lib.mjs';

export const NAME = 'museum';

export async function run(browser, url) {
  const t = tracker(NAME);

  // --- wings and rooms -----------------------------------------------------
  const { page, errors } = await museumPage(browser, { url });
  await page.evaluate(() => document.getElementById('go-lobby').click());
  await page.waitForTimeout(1700);

  const shelves = await page.evaluate(() =>
    [...document.querySelectorAll('.shelf')].map((s) => [...s.querySelectorAll('.book')].map((b) => b.innerText.trim())));
  const roomCount = shelves.flat().length;
  shelves.length === 5 ? t.ok(`five wings on the shelves`) : t.fail(`${shelves.length} wings, expected 5`);
  shelves.forEach((books, i) => console.log(`         wing ${i + 1}: ${books.join(' | ')}`));

  // Each room labels itself with its own address, from the same registry the
  // walkbar uses, so the two can never disagree.
  const mismatched = [];
  for (const books of shelves) {
    for (const title of books) {
      await toLobby(page); await page.waitForTimeout(700);
      await openBook(page, title); await page.waitForTimeout(3400);
      const r = await page.evaluate(() => {
        const live = document.querySelector('.view.in-wing.is-page');
        const ov = live?.querySelector('.overline');
        return {
          id: live?.id,
          addr: ov ? getComputedStyle(ov, '::before').content.replace(/^"|"$/g, '') : '',
          walkbar: document.getElementById('wb-where')?.textContent?.trim() || '',
        };
      });
      if (!r.addr || r.addr === 'none') mismatched.push(`${r.id}: no address`);
      else if (r.walkbar && r.addr.toLowerCase() !== r.walkbar.toLowerCase())
        mismatched.push(`${r.id}: head "${r.addr}" vs walkbar "${r.walkbar}"`);
      if (/^\s*\d/.test(r.addr)) mismatched.push(`${r.id}: address still starts with a number`);
    }
  }
  mismatched.length ? t.fail(`room addresses: ${mismatched.join('; ')}`)
                    : t.ok(`all ${roomCount} rooms address themselves consistently with the walkbar`);
  errors.length && t.fail(`console: ${[...new Set(errors)].join(' | ')}`);
  await page.close();

  // --- deep links ----------------------------------------------------------
  // The site writes hashes about itself from three places; all must read back.
  {
    const { page: p2 } = await museumPage(browser, { url });
    await p2.evaluate(() => document.getElementById('go-lobby').click());
    await p2.waitForTimeout(1700);
    await openBook(p2, 'Accidents'); await p2.waitForTimeout(3400);
    await p2.keyboard.press('ArrowRight'); await p2.waitForTimeout(900);
    const written = await p2.evaluate(() => location.hash);
    /^#[a-z-]+\/[a-z-]+$/.test(written)
      ? t.ok(`the pager writes a room-level hash (${written})`)
      : t.fail(`the pager wrote "${written}", expected #wing/room`);
    await p2.close();
  }

  const cases = [
    ['#record/incidents', 'wing', 'incidents'],
    ['#record', 'wing', 'data'],
    ['#exposure', 'wing', 'exposure'],       // bare room: what the nav rail writes
    ['#reading/students', 'wing', 'students'],
    ['#lobby', 'lobby', null],
    ['#not-a-real-room', 'title', null],
  ];
  for (const [hash, wantScreen, wantRoom] of cases) {
    const { page: p3, errors: e3 } = await museumPage(browser, { url, hash });
    await p3.waitForTimeout(wantScreen === 'wing' ? 3200 : 1400);
    const r = await p3.evaluate(() => ({
      screen: document.body.dataset.screen,
      room: document.querySelector('.view.in-wing.is-page')?.id || null,
    }));
    const good = r.screen === wantScreen && (wantRoom === null || r.room === wantRoom);
    good ? t.ok(`${hash.padEnd(18)} -> ${r.screen}${r.room ? ' / ' + r.room : ''}`)
         : t.fail(`${hash} -> ${r.screen}/${r.room}, wanted ${wantScreen}${wantRoom ? '/' + wantRoom : ''}`);
    e3.length && t.fail(`${hash} console: ${[...new Set(e3)].join(' | ')}`);
    await p3.close();
  }

  // --- dosimeter -----------------------------------------------------------
  // It must be scaled to the rooms that exist, or it reads full before the end.
  {
    const { page: p4 } = await museumPage(browser, { url });
    await p4.evaluate(() => document.getElementById('go-lobby').click());
    await p4.waitForTimeout(1700);
    const denom = await p4.evaluate(() => window.__DOSE_ROOMS);
    t.is(denom, roomCount, 'dosimeter denominator equals the number of rooms');

    const titles = shelves.flat();
    const readings = [];
    for (const title of titles) {
      // 3400ms like every other open in this file: the book-opening animation
      // runs ~2.9s, and reading the badge before enterWing fires undercounts.
      await toLobby(p4); await p4.waitForTimeout(700);
      await openBook(p4, title); await p4.waitForTimeout(3400);
      readings.push(await p4.evaluate(() =>
        +getComputedStyle(document.getElementById('dosimeter')).getPropertyValue('--f')));
    }
    const early = readings.findIndex((v) => v >= 1);
    if (early !== -1 && early < readings.length - 1)
      t.fail(`dosimeter reached 100% at room ${early + 1} of ${readings.length}`);
    else if (readings[readings.length - 1] < 0.999)
      t.fail(`dosimeter ends at ${(readings[readings.length - 1] * 100).toFixed(0)}%, never full`);
    else t.ok(`dosimeter reaches 100% at room ${readings.length} of ${readings.length}`);
    await p4.close();
  }

  // --- deep link into the news room, then walk it --------------------------
  // A shared link into the Frontier wing paginates over the fallback news
  // cards before news.json lands; the upgrade then detaches those exact
  // nodes. Walking onto that leaf used to throw mid page-turn.
  {
    const { page: p6, errors: e6 } = await museumPage(browser, { url, hash: '#frontier/news' });
    await p6.waitForTimeout(3200);
    for (let i = 0; i < 14; i++) {
      await p6.keyboard.press('ArrowRight');
      await p6.waitForTimeout(500);
    }
    const end = await p6.evaluate(() => document.getElementById('wb-count')?.textContent || '');
    e6.length ? t.fail(`deep-linked news walk threw: ${[...new Set(e6)].join(' | ')}`)
              : t.ok(`deep link into the news room pages cleanly through the upgrade (${end})`);
    await p6.close();
  }

  // --- pagination is deterministic ----------------------------------------
  // A room used to paginate differently on its second visit, which silently
  // collapsed multi-page content into one over-tall scrolling page.
  {
    const { page: p5 } = await museumPage(browser, { url });
    await p5.evaluate(() => document.getElementById('go-lobby').click());
    await p5.waitForTimeout(1700);
    const drifted = [];
    for (const title of ['Sources', 'Careers', 'Right Now', 'Death Rates']) {
      const counts = [];
      for (let visit = 0; visit < 3; visit++) {
        await toLobby(p5); await p5.waitForTimeout(700);
        await openBook(p5, title); await p5.waitForTimeout(3400);
        counts.push(await p5.evaluate(() => document.getElementById('wb-count')?.textContent || ''));
      }
      const stable = counts.every((c) => c === counts[0]);
      if (!stable) drifted.push(`${title}: ${counts.join(' then ')}`);
    }
    drifted.length ? t.fail(`pagination changes between visits: ${drifted.join('; ')}`)
                   : t.ok('rooms paginate identically on every visit');
    await p5.close();
  }

  return t;
}
