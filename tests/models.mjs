/* The two models tested directly as modules, without a browser.

   The browser physics suite checks what a visitor reads off the panel; this
   suite checks the arithmetic underneath at speeds a keystroke can wait for.
   Two rules, same as everywhere else in the checks:

   - Nothing is compared against the expression that produced it. The
     constants and expectations are re-declared here from the documented
     model, so a change to the source has to be re-derived, not re-fitted.
   - The integrator is compared against a fine-step RK4 reference of the same
     stated ODE system. That is not circular: it catches the class of bug
     where the right equations are integrated the wrong way (double-applied
     terms, wrong timestep splits), which point checks at equilibrium miss. */

import { createReactor } from '../js/reactor-model.js';
import { SOURCES, DEMAND, balance, solve } from '../js/grid-model.js';
import { CHARTS } from '../data/charts.js';
import { tracker } from './lib.mjs';

export const NAME = 'models';
export const NEEDS_BROWSER = false;

// The documented reactor model, re-declared (see index.html's model note).
const BETA = 0.0065, LAMBDA = 2e-5, DECAY = 0.0784, ALPHA = -3e-5;
const T_IN = 290, T_REF = 560, T_TAU = 9.0, SCRAM_RHO = -0.02;

/* dy/dt of the full nonlinear system: one-group point kinetics plus the
   fuel-temperature lag, with Doppler feedback closing the loop. */
function deriv([n, C, T], rodRho) {
  const rho = rodRho + ALPHA * (T - T_REF);
  return [
    ((rho - BETA) / LAMBDA) * n + DECAY * C,
    (BETA / LAMBDA) * n - DECAY * C,
    (T_IN + (T_REF - T_IN) * n - T) / T_TAU,
  ];
}

/* Classic RK4 at a step far below every timescale in the system. */
function rk4(rodRho, tEnd, h = 2e-5) {
  let y = [1, BETA / (LAMBDA * DECAY), T_REF];
  let peak = 1;
  const steps = Math.round(tEnd / h);
  const add = (a, b, k) => a.map((v, i) => v + b[i] * k);
  for (let i = 0; i < steps; i++) {
    const k1 = deriv(y, rodRho);
    const k2 = deriv(add(y, k1, h / 2), rodRho);
    const k3 = deriv(add(y, k2, h / 2), rodRho);
    const k4 = deriv(add(y, k3, h), rodRho);
    y = y.map((v, j) => v + (h / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
    if (y[0] > peak) peak = y[0];
  }
  return { n: y[0], C: y[1], T: y[2], peak };
}

function runReactor(rodPcm, tEnd, dt = 1 / 60) {
  const core = createReactor();
  core.setRod(rodPcm);
  let peak = core.state.n;
  for (let t = 0; t < tEnd; t += dt) {
    core.step(dt);
    if (core.state.n > peak) peak = core.state.n;
  }
  return { core, peak };
}

export async function run() {
  const t = tracker(NAME);

  // --- reactor: prompt-supercritical excursion against the RK4 reference ---
  // A +900 pcm step goes past prompt critical, spikes, and is caught by the
  // Doppler feedback. The PEAK of that pulse is the discriminating check: the
  // Fuchs-Nordheim result makes the post-pulse temperature nearly independent
  // of the heating rate, so integrating the thermal ODE twice per step (a
  // real former bug) leaves equilibria and end-state temperature almost
  // untouched while halving the peak. Measured at dt = 2 ms because the pulse
  // is narrower than a display frame; at dt = 1/60 the frame-boundary
  // sampling misses the true maximum even when the integration is right.
  {
    const ref = rk4(900e-5, 2.0);
    const fine = runReactor(900, 2.0, 2e-3);
    t.near(fine.peak, ref.peak, 0.05, 'prompt excursion: peak power vs RK4 (dt = 2 ms)');
    t.near(fine.core.state.T, ref.T, 0.03, 'prompt excursion: fuel temperature at t = 2 s vs RK4');
    const frame = runReactor(900, 2.0);
    t.near(frame.core.state.T, ref.T, 0.03, 'prompt excursion at display dt: temperature still tracks');
  }

  // --- reactor: a slow transient in the quasi-static branch ----------------
  // Below prompt critical the model uses the prompt-jump approximation, which
  // must track the exact system closely when the transient is slow.
  {
    const ref = rk4(300e-5, 8.0);
    const sim = runReactor(300, 8.0);
    t.near(sim.core.state.n, ref.n, 0.03, 'quasi-static branch: power at t = 8 s vs RK4');
    t.near(sim.core.state.T, ref.T, 0.02, 'quasi-static branch: temperature at t = 8 s vs RK4');
  }

  // --- reactor: Doppler equilibrium from arithmetic the code never runs ----
  // The feedback has to cancel the rod worth exactly: T = T_REF − ρ/α, and
  // the heat balance then fixes n = (T − T_IN)/(T_REF − T_IN).
  for (const rods of [400, 800]) {
    const rho = rods * 1e-5;
    const wantT = T_REF - rho / ALPHA;
    const wantN = (wantT - T_IN) / (T_REF - T_IN);
    const { core } = runReactor(rods, 90);
    t.near(core.state.T, wantT, 0.01, `Doppler equilibrium temperature at ${rods} pcm`);
    t.near(core.state.n, wantN, 0.01, `Doppler equilibrium power at ${rods} pcm`);
  }

  // --- reactor: the period readout through prompt critical -----------------
  // The readout solves the inhour relation, so it must be finite, positive,
  // and strictly falling as reactivity rises across beta (650 pcm) — the two
  // naive asymptotic formulas both blow up or go non-monotonic in that band.
  {
    const periods = [500, 630, 650, 670, 800].map((pcm) => {
      const core = createReactor();
      core.setRod(pcm);
      return { pcm, period: core.step(1e-4).period };
    });
    const bad = periods.filter((p) => !isFinite(p.period) || p.period <= 0);
    const rising = periods.slice(1).filter((p, i) => p.period >= periods[i].period);
    bad.length || rising.length
      ? t.fail(`period readout across prompt critical: ${periods.map((p) => `${p.pcm}pcm=${p.period.toExponential(2)}`).join(', ')}`)
      : t.ok(`period falls monotonically through prompt critical (${periods.map((p) => p.period.toPrecision(2) + 's').join(' > ')})`);
  }

  // --- reactor: scram ------------------------------------------------------
  // The prompt jump drops power to β/(β − ρ) of its pre-scram value against
  // unchanged precursors, then the delayed tail decays rather than cliffs.
  {
    const core = createReactor();
    core.step(0.05);
    const before = core.state.n;
    core.scram();
    core.step(0.05);
    t.near(core.state.n / before, BETA / (BETA - SCRAM_RHO), 0.02, 'prompt drop ratio after scram');
    let prev = core.state.n, monotone = true;
    for (let i = 0; i < 100; i++) {
      core.step(0.05);
      if (core.state.n > prev + 1e-12) monotone = false;
      prev = core.state.n;
    }
    monotone && prev > 1e-6
      ? t.ok(`delayed tail decays without a cliff (n = ${prev.toFixed(4)} at 5 s)`)
      : t.fail(`after scram: monotone=${monotone}, n=${prev}`);
  }

  // --- grid: solve() term by term ------------------------------------------
  // Independently re-declared factors (EIA capacity factors, IPCC medians).
  {
    const EF = { nuclear: 12, solar: 48, wind: 11, hydro: 24, gas: 490 };
    const CF = { nuclear: 0.908, solar: 0.232, wind: 0.340, hydro: 0.346, gas: 0.605 };
    const mix = { nuclear: 50, solar: 20, wind: 10, hydro: 10, gas: 10 };
    const want = Object.entries(mix).reduce((acc, [k, v]) => ({
      co2: acc.co2 + (v / 100) * EF[k],
      cap: acc.cap + ((v / 100) * DEMAND) / CF[k],
    }), { co2: 0, cap: 0 });
    const got = solve(mix);
    t.near(got.co2, want.co2, 1e-9, 'carbon intensity, share-weighted mean');
    t.near(got.capacity, want.cap, 1e-9, 'nameplate capacity, Σ share·demand/cf');
    t.is(got.firm, 70, 'firm share excludes solar and wind only');
  }

  // --- grid: balance() edge cases ------------------------------------------
  {
    const zero = balance({ nuclear: 0, solar: 0, wind: 0, hydro: 0 });
    t.is(zero.gas, 100, 'no sliders set leaves gas at 100%');

    const simple = balance({ nuclear: 80, solar: 0, wind: 0, hydro: 0 });
    t.is(simple.gas, 20, 'gas is the remainder of a valid mix');

    const moved = balance({ nuclear: 80, solar: 40, wind: 0, hydro: 0 }, 'solar');
    t.is(moved.solar, 40, 'the slider being moved keeps its value in a squeeze');
    moved.nuclear < 80
      ? t.ok(`the other sliders are squeezed instead (nuclear ${80} -> ${moved.nuclear})`)
      : t.fail(`nuclear was not squeezed: ${moved.nuclear}`);

    const maxed = balance({ nuclear: 100, solar: 100, wind: 100, hydro: 100 }, 'wind');
    t.is(maxed.wind, 100, 'a slider pushed to 100 wins the whole grid');

    // Invariants that must hold for any input the sliders can produce.
    let s = 987654321;
    const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
    const ids = ['nuclear', 'solar', 'wind', 'hydro'];
    let violations = [];
    for (let i = 0; i < 500; i++) {
      const raw = Object.fromEntries(ids.map((id) => [id, Math.floor(rnd() * 101)]));
      const movedId = ids[Math.floor(rnd() * ids.length)];
      const out = balance(raw, movedId);
      const sum = ids.reduce((n, id) => n + out[id], 0) + out.gas;
      if (sum !== 100) violations.push(`sum ${sum} for ${JSON.stringify(raw)}`);
      if (out.gas < 0) violations.push(`negative gas for ${JSON.stringify(raw)}`);
      for (const id of ids) {
        if (out[id] < 0) violations.push(`negative ${id} for ${JSON.stringify(raw)}`);
        if (out[id] > raw[id]) violations.push(`${id} grew ${raw[id]} -> ${out[id]}`);
      }
    }
    violations.length
      ? t.fail(`balance() invariants: ${violations.slice(0, 3).join('; ')}${violations.length > 3 ? ` (+${violations.length - 3} more)` : ''}`)
      : t.ok('500 random mixes: shares + gas always total 100, nothing negative, nothing grows');
  }

  // --- the same figure must be the same number everywhere it appears -------
  // Capacity factors live in the grid model AND the Uptime chart; if one is
  // updated without the other, the museum quietly contradicts itself.
  {
    const CHART_NAME = {
      nuclear: 'Nuclear', solar: 'Solar (PV)', wind: 'Wind',
      hydro: 'Hydropower', gas: 'Gas (combined cycle)',
    };
    const rows = Object.fromEntries(CHARTS.capacity.data.map((d) => [d.name, d.v]));
    // A renamed chart row must fail loudly, not fall out of the comparison.
    const missing = SOURCES.filter((s) => !(CHART_NAME[s.id] in rows)).map((s) => s.id);
    const drift = SOURCES
      .filter((s) => CHART_NAME[s.id] in rows)
      .filter((s) => Math.abs(rows[CHART_NAME[s.id]] - s.cf * 100) > 0.05)
      .map((s) => `${s.id}: model ${s.cf * 100} vs chart ${rows[CHART_NAME[s.id]]}`);
    missing.length
      ? t.fail(`grid sources missing from the Uptime chart (renamed?): ${missing.join(', ')}`)
      : drift.length
        ? t.fail(`capacity factors disagree between grid-model and the Uptime chart: ${drift.join('; ')}`)
        : t.ok('every grid source appears in the Uptime chart with the same capacity factor');
  }

  return t;
}
