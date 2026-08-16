/* Shared runtime facts and the visibility helper every exhibit uses.

   `whenVisible` exists because charts and count-ups should animate when they
   are reached, not on load. It falls back to firing immediately under reduced
   motion or without IntersectionObserver, and sweeps on a timer as well as on
   intersection, because a page-turn can move an element into view without a
   scroll event ever firing. */

export const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (REDUCE) document.documentElement.classList.add('reduced'); // engage static fallbacks

/* ============ SMOOTH SCROLL + SCROLL-SCRUB PLUMBING ============ */

var lenis = null;
export const HAS_GSAP = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';

if (HAS_GSAP) { gsap.registerPlugin(ScrollTrigger); gsap.ticker.lagSmoothing(0); }
export const HAS_DRAW = !REDUCE && typeof gsap !== 'undefined' && typeof DrawSVGPlugin !== 'undefined';
if (HAS_DRAW) gsap.registerPlugin(DrawSVGPlugin);

var VIS = [], VIS_IO = null, VIS_TIMER = null;
function fireFor(el) {
  VIS.forEach(function (v) {
    if (v.el === el && !v.done) {
      v.done = true;
      v.fire();
      if (VIS_IO) VIS_IO.unobserve(el);
    }
  });
}
export function sweepVisible() {
  var vh = window.innerHeight, pending = false;
  VIS.forEach(function (v) {
    if (v.done) return;
    var r = v.el.getBoundingClientRect();
    if (r.top < vh * 0.95 && r.bottom > 0) { fireFor(v.el); } else { pending = true; }
  });
  if (!pending && VIS_TIMER) { clearInterval(VIS_TIMER); VIS_TIMER = null; }
}
export function whenVisible(el, fire) {
  if (REDUCE || !('IntersectionObserver' in window)) { fire(); return; }
  if (!VIS_IO) {
    VIS_IO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) fireFor(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    window.addEventListener('scroll', sweepVisible, { passive: true });
    VIS_TIMER = setInterval(sweepVisible, 1000);
  }
  VIS.push({ el: el, fire: fire, done: false });
  VIS_IO.observe(el);
}

