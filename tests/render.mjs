/* What a visitor actually gets: every page paints, nothing overflows
   sideways, the keyboard works, reduced motion still shows the content, and
   nothing throws along the way.

   The paint check exists because content can be present in the DOM and still
   be invisible: pages have shipped blank while passing a presence test. */

import { museumPage, openBook, toLobby, tracker } from './lib.mjs';

export const NAME = 'render';

const VIEWPORTS = [
  { width: 390, height: 844, label: 'phone' },
  { width: 820, height: 1180, label: 'tablet' },
  { width: 1440, height: 900, label: 'desktop' },
];

export async function run(browser, url) {
  const t = tracker(NAME);

  for (const vp of VIEWPORTS) {
    const { page, errors } = await museumPage(browser, { url, width: vp.width, height: vp.height });
    await page.evaluate(() => document.getElementById('go-lobby').click());
    await page.waitForTimeout(1700);

    const firstOfEachWing = await page.evaluate(() =>
      [...document.querySelectorAll('.shelf')].map((s) => s.querySelector('.book').innerText.trim()));

    let screens = 0, overflow = 0, blank = 0;
    const offenders = [];
    for (const title of firstOfEachWing) {
      await toLobby(page); await page.waitForTimeout(650);
      await openBook(page, title); await page.waitForTimeout(3400);
      for (let i = 0; i < 14; i++) {
        const r = await page.evaluate(() => {
          // The end-of-wing screen is a real page too; without it in the
          // selector, walking off the last exhibit reads as a blank screen.
          const live = document.querySelector('.view.in-wing.is-page, #wing-end.is-page');
          // "Painted" means cumulative opacity actually reaches the eye.
          let paint = 0;
          if (live) {
            for (const el of live.querySelectorAll('*')) {
              const rect = el.getBoundingClientRect();
              if (rect.height < 4 || rect.top > innerHeight || rect.bottom < 0) continue;
              let o = 1, n = el;
              while (n && n !== document.body) { o *= +getComputedStyle(n).opacity; n = n.parentElement; }
              if (o > 0.05 && (el.textContent || '').trim().length > 1) paint += 1;
            }
          }
          return {
            room: live?.id,
            wide: document.documentElement.scrollWidth > innerWidth + 1,
            paint,
          };
        });
        screens++;
        if (r.wide) { overflow++; offenders.push(`${r.room} (h-scroll)`); }
        if (r.paint === 0) { blank++; offenders.push(`${r.room} (blank)`); }
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(600);
      }
    }
    overflow ? t.fail(`${vp.label} ${vp.width}px: horizontal overflow on ${overflow}/${screens} screens`)
             : t.ok(`${vp.label} ${vp.width}px: ${screens} screens, no horizontal overflow`);
    blank ? t.fail(`${vp.label} ${vp.width}px: ${blank} screens painted nothing (${[...new Set(offenders)].join(', ')})`)
          : t.ok(`${vp.label} ${vp.width}px: every screen painted content`);
    errors.length && t.fail(`${vp.label} console: ${[...new Set(errors)].join(' | ')}`);
    await page.close();
  }

  // --- keyboard ------------------------------------------------------------
  {
    const { page, errors } = await museumPage(browser, { url });
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);
    const focused = await page.evaluate(() => document.activeElement && (document.activeElement.id || document.activeElement.tagName));
    focused ? t.ok(`tab reaches a focusable element (${focused})`) : t.fail('tab reaches nothing');

    await page.evaluate(() => document.getElementById('go-lobby').click());
    await page.waitForTimeout(1700);
    await openBook(page, 'Fission'); await page.waitForTimeout(3400);
    const before = await page.evaluate(() => document.getElementById('wb-count')?.textContent);
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(900);
    const after = await page.evaluate(() => document.getElementById('wb-count')?.textContent);
    before !== after ? t.ok(`arrow keys turn pages (${before} -> ${after})`) : t.fail('arrow keys do not turn pages');

    await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(900);
    const back = await page.evaluate(() => document.getElementById('wb-count')?.textContent);
    back === before ? t.ok('arrow keys page backwards too') : t.fail(`back paging landed on ${back}, expected ${before}`);
    errors.length && t.fail(`keyboard console: ${[...new Set(errors)].join(' | ')}`);
    await page.close();
  }

  // --- reduced motion ------------------------------------------------------
  {
    const { page, errors } = await museumPage(browser, { url, reducedMotion: 'reduce' });
    await page.evaluate(() => document.getElementById('go-lobby').click());
    await page.waitForTimeout(1600);
    await openBook(page, 'Control'); await page.waitForTimeout(3200);
    const r = await page.evaluate(() => ({
      reduced: document.documentElement.classList.contains('reduced'),
      text: (document.querySelector('.view.in-wing.is-page')?.innerText || '').trim().length,
    }));
    r.reduced ? t.ok('reduced motion is detected') : t.fail('reduced-motion class not applied');
    r.text > 40 ? t.ok(`reduced motion still paints content (${r.text} chars)`)
                : t.fail('reduced motion leaves the room blank');
    errors.length && t.fail(`reduced-motion console: ${[...new Set(errors)].join(' | ')}`);
    await page.close();
  }

  // --- interactives survive re-entry --------------------------------------
  {
    const { page, errors } = await museumPage(browser, { url });
    await page.evaluate(() => document.getElementById('go-lobby').click());
    await page.waitForTimeout(1700);
    for (const title of ['Build a Grid', 'Control', 'Accidents']) {
      for (let visit = 0; visit < 2; visit++) {
        await toLobby(page); await page.waitForTimeout(650);
        await openBook(page, title); await page.waitForTimeout(3200);
      }
      const dup = await page.evaluate(() => {
        const live = document.querySelector('.view.in-wing.is-page');
        if (!live) return null;
        const ids = [...live.querySelectorAll('[id]')].map((e) => e.id);
        return ids.filter((v, i) => ids.indexOf(v) !== i);
      });
      dup && dup.length ? t.fail(`${title}: duplicated ids after re-entry (${dup.join(', ')})`)
                        : t.ok(`${title}: initialises once across repeat visits`);
    }
    errors.length && t.fail(`re-entry console: ${[...new Set(errors)].join(' | ')}`);
    await page.close();
  }

  return t;
}
