/* One-group point kinetics with a Doppler fuel-temperature feedback.

   Pure arithmetic: no DOM, no timers, no rendering. The exhibit in main.js
   owns the canvas, the slider and the animation frame; this owns the physics,
   which is what makes it testable and what makes the exhibit legible.

   Below prompt critical the prompt term is solved quasi-statically (the
   prompt-jump approximation). That is what keeps a system with
   Lambda = 2e-5 s stable when stepped at 20 Hz; integrating it directly at
   that timestep would blow up. Above prompt critical the prompt branch is
   stepped directly in substeps, where the stiffness is the point.

   A teaching model, not a plant simulator: no xenon, no moderator feedback,
   no burnup, no thermal-hydraulics. */

export const BETA = 0.0065;     // delayed neutron fraction, U-235 thermal fission
export const LAMBDA = 2e-5;     // prompt neutron generation time, s (LWR)
export const DECAY = 0.0784;    // one-group precursor decay constant, 1/s
export const ALPHA = -3e-5;     // fuel temperature coefficient, dk/k per K
export const T_IN = 290;        // coolant inlet temperature, C
export const T_REF = 560;       // reference fuel temperature, C
export const T_TAU = 9.0;       // fuel thermal time constant, s
export const SCRAM_RHO = -0.02; // reactivity inserted by a scram, dk/k

/* Rod worth is carried in pcm because that is the unit an operator reads. */
export const PCM = 1e-5;

export function createReactor() {
  const S = { n: 1, C: 0, T: T_REF, rod: 0 };
  let scrammed = false;

  function reset() {
    S.n = 1;
    S.C = (S.n * BETA) / (LAMBDA * DECAY);  // equilibrium precursors at n = 1
    S.T = T_REF;
    S.rod = 0;
    scrammed = false;
  }
  reset();

  function step(dt) {
    const rodRho = scrammed ? SCRAM_RHO : S.rod * PCM;
    let dopRho = ALPHA * (S.T - T_REF);
    let rho = rodRho + dopRho;
    let period = Infinity;

    if (rho < BETA * 0.97) {
      // The prompt population settles against the precursors, so the reactor
      // runs on the delayed neutrons. Relax onto that equilibrium at the
      // prompt rate rather than snapping to it: the exponential is exact for
      // the fast mode, and it keeps the hand-over smooth when a prompt
      // excursion decays back down through this branch.
      const nq = (DECAY * S.C * LAMBDA) / (BETA - rho);
      const k = Math.exp((-dt * (BETA - rho)) / LAMBDA);
      S.n = nq > 0 ? nq + (S.n - nq) * k : 1e-9;
      S.C += ((BETA / LAMBDA) * S.n - DECAY * S.C) * dt;
      // Fuel temperature chases power with a lag; heat removal is proportional.
      S.T += ((T_IN + (T_REF - T_IN) * S.n - S.T) / T_TAU) * dt;
    } else {
      // The prompt branch owns the whole state here, temperature included:
      // the Doppler term must track the excursion inside the substeps, and a
      // second thermal update outside the loop would integrate the same ODE
      // twice and halve the effective time constant mid-pulse.
      const sub = 400, h = dt / sub;
      for (let i = 0; i < sub; i++) {
        const dn = ((rho - BETA) / LAMBDA) * S.n + DECAY * S.C;
        const dC = (BETA / LAMBDA) * S.n - DECAY * S.C;
        S.n += dn * h;
        S.C += dC * h;
        if (S.n > 5e3) { S.n = 5e3; break; }
        if (S.n < 1e-9) { S.n = 1e-9; break; }
        S.T += ((T_IN + (T_REF - T_IN) * S.n - S.T) / T_TAU) * h;
        dopRho = ALPHA * (S.T - T_REF);
        rho = rodRho + dopRho;
      }
    }
    if (S.T < T_IN) S.T = T_IN;

    // The period readout solves the one-group inhour relation exactly:
    //   Lambda w^2 + (Lambda lambda + beta - rho) w - rho lambda = 0,
    // whose dominant root is the asymptotic 1/T for any rho — it reduces to
    // (beta - rho)/(lambda rho) far below prompt critical and Lambda/(rho -
    // beta) far above, and unlike either limit it is finite and continuous
    // through rho = beta itself.
    if (Math.abs(rho) > 1e-7) {
      const b = LAMBDA * DECAY + BETA - rho;
      const w = (-b + Math.sqrt(b * b + 4 * LAMBDA * rho * DECAY)) / (2 * LAMBDA);
      period = 1 / w;
    }

    return { rho, rodRho, dopRho, period };
  }

  return {
    step,
    reset,
    get state() { return S; },
    get scrammed() { return scrammed; },
    setRod(pcm) { S.rod = pcm; scrammed = false; },
    scram() { scrammed = true; S.rod = -800; },
  };
}

/* The closed-form results this model must reproduce — the Doppler equilibrium
   T = T_REF − ρ_rod/α with n = (T − T_IN)/(T_REF − T_IN), and the prompt drop
   β/(β − ρ) after a scram — are deliberately NOT exported as helpers here:
   the tests re-derive them independently so a change to the model has to be
   re-derived rather than silently re-fitted (see tests/models.mjs). */
