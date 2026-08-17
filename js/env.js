/* Shared runtime facts and the visibility helper every exhibit uses.

   `whenVisible` exists because charts and count-ups should animate when they
   are reached, not on load. It falls back to firing immediately under reduced
   motion or without IntersectionObserver. In the museum the pager lights the
   open page directly (litPiece), so the observer is the degraded-document
   path and needs no polling. */

export const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (REDUCE) document.documentElement.classList.add('reduced'); // engage static fallbacks

export const HAS_GSAP = typeof gsap !== 'undefined';
if (HAS_GSAP) gsap.ticker.lagSmoothing(0);
export const HAS_DRAW = !REDUCE && HAS_GSAP && typeof DrawSVGPlugin !== 'undefined';
if (HAS_DRAW) gsap.registerPlugin(DrawSVGPlugin);

var VIS = [], VIS_IO = null;
function fireFor(el) {
  VIS.forEach(function (v) {
    if (v.el === el && !v.done) {
      v.done = true;
      v.fire();
      if (VIS_IO) VIS_IO.unobserve(el);
    }
  });
}
export function whenVisible(el, fire) {
  if (REDUCE || !('IntersectionObserver' in window)) { fire(); return; }
  if (!VIS_IO) {
    VIS_IO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) fireFor(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
  }
  VIS.push({ el: el, fire: fire, done: false });
  VIS_IO.observe(el);
}

