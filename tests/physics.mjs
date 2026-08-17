/* The two original models, checked against results derived independently of
   the code under test.

   The reactor exhibit solves point kinetics with one delayed group and a fuel
   temperature feedback. Those have closed-form answers at steady state and in
   the asymptotic period, so the simulation is compared against arithmetic
   rather than against a recorded snapshot of its own past output.

   The grid model is a weighted mean, so it is checked term by term. */

import { museumPage, openBook, pageToVisible, toLobby, tracker } from './lib.mjs';

export const NAME = 'physics';

// Constants declared by the reactor exhibit. Kept here deliberately: if the
// exhibit changes one, these tests must be re-derived, not silently re-fitted.
const BETA = 0.0065;   // delayed neutron fraction, U-235 thermal
const DECAY = 0.0784;  // one-group precursor decay constant, 1/s
const ALPHA = -3e-5;   // fuel temperature coefficient, dk/k per K
const T_REF = 560;     // reference fuel temperature, degrees C
const T_IN = 290;      // coolant inlet temperature, degrees C

// The grid model, from the exhibit's own source table.
const SOURCES = {
  nuclear: { cf: 0.908, ef: 12 },
  solar:   { cf: 0.232, ef: 48 },
  wind:    { cf: 0.340, ef: 11 },
  hydro:   { cf: 0.346, ef: 24 },
  gas:     { cf: 0.605, ef: 490 },
};
const DEMAND = 1000; // MW

const num = (s) => parseFloat(String(s).replace(/[^0-9.eE+-]/g, ''));

export async function run(browser, url) {
  const t = tracker(NAME);
  await reactor(browser, url, t);
  await grid(browser, url, t);
  return t;
}

/* ---------------------------------------------------------------- reactor */
async function reactor(browser, url, t) {
  const { page, errors } = await museumPage(browser, { url });
  await page.evaluate(() => document.getElementById('go-lobby').click());
  await page.waitForTimeout(1700);
  await openBook(page, 'Control');
  await page.waitForTimeout(3600);

  if (!(await pageToVisible(page, '#rk-canvas'))) {
    t.fail('reactor exhibit never became visible');
    await page.close();
    return;
  }

  const read = () => page.evaluate(() => ({
    power: parseFloat((document.getElementById('rk-power').textContent || '').replace(/[^0-9.eE+-]/g, '')),
    temp: parseFloat((document.getElementById('rk-temp').textContent || '').replace(/[^0-9.eE+-]/g, '')),
    period: document.getElementById('rk-period').textContent,
    rho: parseFloat((document.getElementById('rk-rho').textContent || '').replace(/[^0-9.eE+-]/g, '')),
    rhoRod: parseFloat((document.getElementById('rk-rho-rod').textContent || '').replace(/[^0-9.eE+-]/g, '')),
    state: document.getElementById('rk-state').textContent.trim(),
  }));
  const setRods = async (v) => {
    await page.evaluate((x) => {
      const el = document.getElementById('rk-rods');
      el.value = String(x);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, v);
  };
  const reset = async () => {
    await page.evaluate(() => document.getElementById('rk-reset')?.click());
    await page.waitForTimeout(1200);
  };

  // Note on what is NOT tested here: the panel's own "period" readout is the
  // model's inhour-relation root, so comparing it against that formula would
  // assert nothing. Everything below compares the simulation against a result
  // the code never evaluates.

  // 1. A critical reactor holds its power. rho = 0 => dn/dt = 0.
  await reset();
  const start = await read();
  await page.waitForTimeout(4000);
  const held = await read();
  t.near(held.power, start.power, 0.05, 'critical reactor holds power over 4 s');

  // 2. Doppler feedback settles at its own fixed point. The negative
  //    temperature reactivity has to cancel the rod worth exactly, so
  //        T_eq = T_REF - rho_rod / ALPHA
  //    and the heat balance T_eq = T_IN + (T_REF - T_IN) * n then fixes power:
  //        n   = (T_eq - T_IN) / (T_REF - T_IN)
  //    Neither expression appears anywhere in the exhibit; the simulation has
  //    to arrive there on its own. The 800 pcm case reproduces the exact
  //    figures the exhibit's methodology note claims (198.8% at 827 C).
  for (const rods of [400, 800]) {
    await reset();
    await setRods(rods);
    await page.waitForTimeout(26000);
    const eq = await read();
    const rho = rods / 1e5;
    const analyticTemp = T_REF - rho / ALPHA;
    const analyticPower = ((analyticTemp - T_IN) / (T_REF - T_IN)) * 100;
    t.near(eq.temp, analyticTemp, 0.02, `Doppler equilibrium temperature at ${rods} pcm`);
    t.near(eq.power, analyticPower, 0.02, `Doppler equilibrium power at ${rods} pcm`);
    Math.abs(eq.rho) < 40
      ? t.ok(`net reactivity returns to zero at ${rods} pcm (${Math.round(eq.rho)} pcm)`)
      : t.fail(`net reactivity did not settle at ${rods} pcm: ${Math.round(eq.rho)} pcm`);
  }

  // 3. Prompt drop. A scram inserts -2000 pcm; below prompt critical the
  //    prompt population settles instantly against unchanged precursors, so
  //    power falls to beta / (beta - rho) of where it was before it then
  //    begins the slower delayed-neutron decay.
  await reset();
  await page.waitForTimeout(1500);
  const preScram = await read();
  await page.evaluate(() => document.getElementById('rk-scram')?.click());
  await page.waitForTimeout(700);
  const promptDrop = await read();
  const SCRAM_RHO = -0.02;
  const analyticRatio = BETA / (BETA - SCRAM_RHO);
  t.near(promptDrop.power / preScram.power, analyticRatio, 0.12, 'prompt drop ratio after scram');

  // 4. And it decays from there rather than falling to zero, because the
  //    precursors are still there.
  await page.waitForTimeout(6000);
  const later = await read();
  later.power > 0 && later.power < promptDrop.power
    ? t.ok(`delayed neutrons leave a decaying tail, not a cliff (${promptDrop.power.toFixed(1)}% -> ${later.power.toFixed(1)}%)`)
    : t.fail(`no delayed tail after scram: ${promptDrop.power} -> ${later.power}`);

  errors.length && t.fail(`reactor console: ${[...new Set(errors)].join(' | ')}`);
  await page.close();
}

/* ------------------------------------------------------------------- grid */
async function grid(browser, url, t) {
  const { page, errors } = await museumPage(browser, { url });
  await page.evaluate(() => document.getElementById('go-lobby').click());
  await page.waitForTimeout(1700);
  await openBook(page, 'Build a Grid');
  await page.waitForTimeout(3600);

  if (!(await pageToVisible(page, '.sim-card'))) {
    t.fail('grid simulator never became visible');
    await page.close();
    return;
  }

  const setMix = async (mix) => {
    // Set the sliders low-to-high so the model's own rebalancing (which
    // squeezes the others when the total exceeds 100) does not fight us.
    for (const id of ['nuclear', 'solar', 'wind', 'hydro']) {
      await page.evaluate(([k, v]) => {
        const el = document.getElementById('sim-' + k);
        el.value = String(v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, [id, mix[id] ?? 0]);
      await page.waitForTimeout(160);
    }
    await page.waitForTimeout(350);
    return page.evaluate(() => ({
      shares: {
        nuclear: +document.getElementById('sim-nuclear').value,
        solar: +document.getElementById('sim-solar').value,
        wind: +document.getElementById('sim-wind').value,
        hydro: +document.getElementById('sim-hydro').value,
      },
      co2: document.getElementById('sim-co2').textContent,
      cap: document.getElementById('sim-cap').textContent,
      firm: document.getElementById('sim-firm').textContent,
    }));
  };

  for (const mix of [{ nuclear: 80, solar: 0, wind: 0, hydro: 0 },
                     { nuclear: 20, solar: 40, wind: 20, hydro: 10 },
                     { nuclear: 0, solar: 0, wind: 0, hydro: 0 }]) {
    const r = await setMix(mix);
    const s = { ...r.shares, gas: 100 - (r.shares.nuclear + r.shares.solar + r.shares.wind + r.shares.hydro) };
    const label = Object.entries(s).filter(([, v]) => v).map(([k, v]) => `${k} ${v}%`).join(', ') || 'all gas';

    const co2 = Object.entries(s).reduce((a, [k, v]) => a + (v / 100) * SOURCES[k].ef, 0);
    t.near(num(r.co2), Math.round(co2), 0.02, `carbon intensity (${label})`);

    const cap = Object.entries(s).reduce((a, [k, v]) => a + (v / 100) * DEMAND / SOURCES[k].cf, 0);
    t.near(num(r.cap.replace(/,/g, '')), Math.round(cap), 0.02, `capacity to build (${label})`);

    // Firm supply is everything that does not follow the weather.
    t.is(num(r.firm), s.nuclear + s.hydro + s.gas, `firm share (${label})`);
  }

  // The trade-off the exhibit exists to show must actually hold.
  const heavySolar = await setMix({ nuclear: 0, solar: 80, wind: 0, hydro: 0 });
  const heavyNuclear = await setMix({ nuclear: 80, solar: 0, wind: 0, hydro: 0 });
  num(heavyNuclear.cap.replace(/,/g, '')) < num(heavySolar.cap.replace(/,/g, ''))
    ? t.ok('a nuclear-heavy grid needs less nameplate capacity than a solar-heavy one')
    : t.fail('capacity trade-off inverted');
  num(heavyNuclear.co2) < num(heavySolar.co2)
    ? t.ok('a nuclear-heavy grid has lower carbon intensity than a solar-heavy one')
    : t.fail('carbon trade-off inverted');

  errors.length && t.fail(`simulator console: ${[...new Set(errors)].join(' | ')}`);
  await page.close();
}
