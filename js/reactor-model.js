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
      // The prompt population settles instantly against the precursors, so
      // the reactor runs on the delayed neutrons.
      const nq = (DECAY * S.C * LAMBDA) / (BETA - rho);
      S.n = nq > 0 ? nq : 1e-9;
      S.C += ((BETA / LAMBDA) * S.n - DECAY * S.C) * dt;
      if (Math.abs(rho) > 1e-7) period = (BETA - rho) / (DECAY * rho);
    } else {
      const sub = 400, h = dt / sub;
      for (let i = 0; i < sub; i++) {
        const dn = ((rho - BETA) / LAMBDA) * S.n + DECAY * S.C;
        const dC = (BETA / LAMBDA) * S.n - DECAY * S.C;
        S.n += dn * h;
        S.C += dC * h;
        if (S.n > 5e3) { S.n = 5e3; break; }
        if (S.n < 1e-9) { S.n = 1e-9; break; }
        S.T += ((S.n - (S.T - T_IN) / (T_REF - T_IN)) * (T_REF - T_IN) / T_TAU) * h;
        dopRho = ALPHA * (S.T - T_REF);
        rho = rodRho + dopRho;
      }
      period = LAMBDA / Math.max(rho - BETA, 1e-9);
    }

    // Fuel temperature chases power with a lag; heat removal is proportional.
    const Teq = T_IN + (T_REF - T_IN) * S.n;
    S.T += ((Teq - S.T) / T_TAU) * dt;
    if (S.T < T_IN) S.T = T_IN;

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

/* Where the Doppler feedback has to settle for a given rod worth: the negative
   temperature reactivity must cancel it exactly, and the heat balance then
   fixes the power. Used by the exhibit's own notes and by the tests. */
export const equilibriumTemp = (rodPcm) => T_REF - (rodPcm * PCM) / ALPHA;
export const equilibriumPower = (rodPcm) => (equilibriumTemp(rodPcm) - T_IN) / (T_REF - T_IN);

/* The prompt drop a scram produces, before the delayed-neutron tail. */
export const promptDropRatio = (rho = SCRAM_RHO) => BETA / (BETA - rho);
