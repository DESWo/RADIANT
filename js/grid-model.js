/* Grid-mix model: what it takes to keep a city supplied around the clock.

   Pure arithmetic, no DOM. The exhibit in main.js owns the sliders and the
   skyline; this owns the numbers.

   Capacity factors and lifecycle emission factors are the same cited figures
   used elsewhere in the museum — EIA for capacity factors, IPCC AR5 medians
   for emissions. See the reference list in index.html. */

export const DEMAND = 1000; // MW, delivered continuously

export const SOURCES = [
  { id: 'nuclear', label: 'Nuclear',     cf: 0.908, ef: 12,  slider: true, hero: true },
  { id: 'solar',   label: 'Solar',       cf: 0.232, ef: 48,  slider: true, variable: true },
  { id: 'wind',    label: 'Wind',        cf: 0.340, ef: 11,  slider: true, variable: true },
  { id: 'hydro',   label: 'Hydropower',  cf: 0.346, ef: 24,  slider: true },
  { id: 'gas',     label: 'Natural gas', cf: 0.605, ef: 490 },
];

const byId = Object.fromEntries(SOURCES.map((s) => [s.id, s]));

/* Gas is the remainder rather than a slider: it is what a real grid falls back
   on when the chosen clean mix does not add up to the demand. */
export function balance(shares, movedId) {
  const out = {};
  let sliderSum = 0;
  for (const s of SOURCES) {
    if (!s.slider) continue;
    out[s.id] = Math.max(0, Math.round(shares[s.id] || 0));
    sliderSum += out[s.id];
  }

  if (sliderSum > 100) {
    // Honour the slider being moved and squeeze the others proportionally.
    const excess = sliderSum - 100;
    const othersSum = sliderSum - (movedId ? out[movedId] : 0);
    for (const s of SOURCES) {
      if (!s.slider || s.id === movedId) continue;
      out[s.id] = othersSum > 0 ? Math.max(0, Math.floor((out[s.id] * (othersSum - excess)) / othersSum)) : 0;
    }
    if (movedId && out[movedId] > 100) out[movedId] = 100;
    sliderSum = SOURCES.reduce((n, s) => (s.slider ? n + out[s.id] : n), 0);
  }

  out.gas = 100 - sliderSum;
  return out;
}

/* Given percentage shares that already sum to 100, what the grid costs. */
export function solve(shares) {
  let co2 = 0, capacity = 0;
  const caps = {};
  for (const s of SOURCES) {
    const share = (shares[s.id] || 0) / 100;
    co2 += share * s.ef;
    caps[s.id] = (share * DEMAND) / s.cf;
    capacity += caps[s.id];
  }
  // Firm supply is everything that does not follow the weather.
  const firm = SOURCES.reduce((n, s) => (s.variable ? n : n + (shares[s.id] || 0)), 0);
  return { co2, capacity, caps, firm };
}

export const isVariable = (id) => Boolean(byId[id] && byId[id].variable);
