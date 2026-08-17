/* Chart datasets. Every value carries its source in the reference list
   in index.html; see DESIGN.md on why references are appended, never renumbered. */

export const CHARTS = {
  deaths: {
    unit: 'deaths / TWh', labelW: '8.5rem',
    caption: 'Death rates from energy production, per terawatt-hour of electricity',
    cols: ['Energy source', 'Deaths per TWh', 'Category'],
    data: [
      { name: 'Coal',       v: 24.6, cat: 'Fossil',     note: '≈820× the death rate of nuclear' },
      { name: 'Oil',        v: 18.4, cat: 'Fossil',     note: '≈613× the death rate of nuclear' },
      { name: 'Gas',        v: 2.8,  cat: 'Fossil',     note: '≈93× the death rate of nuclear' },
      { name: 'Hydropower', v: 1.3,  cat: 'Low-carbon', note: '≈43× the death rate of nuclear' },
      { name: 'Wind',       v: 0.04, cat: 'Low-carbon', note: '≈1.3× the death rate of nuclear' },
      { name: 'Nuclear',    v: 0.03, cat: 'Low-carbon', note: 'the benchmark', hero: true },
      { name: 'Solar',      v: 0.02, cat: 'Low-carbon', note: '≈0.7× the death rate of nuclear' }
    ],
    fmt: function (v) { return v < 0.1 ? v.toFixed(2) : String(v); }
  },
  capacity: {
    unit: '% of the year at full power', labelW: '9.5rem',
    caption: 'Average capacity factor by energy source, U.S. 2024 (EIA, Electric Power Monthly, Tables 6.07.A/B)',
    cols: ['Energy source', 'Capacity factor'],
    data: [
      { name: 'Nuclear',              v: 90.8, note: 'about 332 days a year at full power', hero: true },
      { name: 'Geothermal',           v: 64.6, note: 'baseload, geography-limited' },
      { name: 'Gas (combined cycle)', v: 60.5, note: 'often throttled to follow demand' },
      { name: 'Coal',                 v: 42.6, note: 'baseload, increasingly retired' },
      { name: 'Hydropower',           v: 34.6, note: 'seasonal water levels' },
      { name: 'Wind',                 v: 34.0, note: 'runs when the wind blows' },
      { name: 'Solar (PV)',           v: 23.2, note: 'runs when the sun shines' }
    ],
    fmt: function (v) { return v.toFixed(1) + '%'; }
  },
  costs: {
    unit: '$ / MWh', labelW: '11rem',
    caption: 'Operating expenses (fuel + operation + maintenance), major U.S. investor-owned utilities, 2024 (EIA, Electric Power Annual, Table 8.4)',
    cols: ['Plant type', 'Operating expense ($/MWh)'],
    data: [
      { name: 'Hydroelectric',            v: 15.07, note: 'cheapest to run where geography allows' },
      { name: 'Gas turbine, small scale', v: 22.95, note: 'fuel is most of the cost, and prices swing' },
      { name: 'Nuclear',                  v: 23.08, note: 'low and stable; fuel is only about a quarter of it', hero: true },
      { name: 'Fossil steam',             v: 41.32, note: 'mostly coal; fuel dominates the cost' }
    ],
    fmt: function (v) { return '$' + v.toFixed(2); }
  },
  exposure: {
    unit: 'mSv', labelW: '13rem',
    caption: 'Everyday radiation doses in millisieverts, effective-dose estimates (U.S. NRC, Doses in Our Daily Lives; EPA). Recurring sources are labelled per year; the others are one-time events.',
    cols: ['Source of dose', 'Dose (mSv)'],
    data: [
      { name: 'Eating a banana',                     v: 0.0001, note: 'one banana; potassium-40 (yes, really)' },
      { name: 'Living near a nuclear plant (per year)', v: 0.001, note: 'NRC estimate for nearby residents', hero: true },
      { name: 'Flight, NYC to LA round-trip',        v: 0.04,   note: 'one round-trip; cosmic rays, varies with route and altitude' },
      { name: 'Chest X-ray',                         v: 0.1,    note: 'one diagnostic image' },
      { name: 'Natural background (per year)',       v: 3.0,    note: 'radon, soil, cosmic rays' }
    ],
    fmt: function (v) { return String(v); }
  }
};
