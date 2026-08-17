/* The pinned scenes: the plant tour, the fission sequence and the nine-stage
   construction.

   Each is a GSAP timeline driven by page turns rather than by scroll. The
   museum parks the playhead exactly on beat i, so every camera move and reveal
   is authored to COMPLETE at i, not to start there; anything keyed to start on
   the beat has not happened yet when the reader is looking at it.

   The interface back to the museum is a set of properties hung on the scene
   element: _sceneSteps (how many pages this scene needs), _sceneGo(i, instant)
   (park on a beat), _runTo(n) (advance the CSS run-state) and _measureFit()
   (re-measure the camera after a resize). No shared JS state. */

import { REDUCE, HAS_GSAP, HAS_DRAW } from './env.js';
import { PLANT_STEPS, FISSION_STEPS, BUILD_STEPS } from '../data/scenes.js';

/* ============ PINNED SCENES ============ */

(function () {
  var scenes = [
    { el: document.getElementById('plant-scene'), steps: PLANT_STEPS, listId: 'plant-scene-steps', build: buildPlantTl },
    { el: document.getElementById('build-scene'), steps: BUILD_STEPS, listId: 'build-scene-steps', build: buildBuildTl },
    { el: document.getElementById('fission-scene'), steps: FISSION_STEPS, listId: 'fission-scene-steps', build: buildFissionTl }
  ];

  scenes.forEach(function (sc) {
    if (!sc.el) return;
    // The plain-list fallback is baked into the markup for the no-JS reading
    // order (tests/static.mjs holds it to data/scenes.js); rebuild it here
    // only if the two have somehow fallen out of step.
    var list = document.getElementById(sc.listId);
    if (list && list.children.length !== sc.steps.length) {
      while (list.firstChild) list.removeChild(list.firstChild);
      sc.steps.forEach(function (st) {
        var li = document.createElement('li');
        var b = document.createElement('strong'); b.textContent = st.title + '. ';
        li.appendChild(b); li.appendChild(document.createTextNode(st.text));
        list.appendChild(li);
      });
    }
    // seed the first caption so the static stage still reads correctly
    setCaption(sc.el, sc.steps, 0);
  });

  if (REDUCE || !HAS_GSAP) return; // static diagram + list is the whole experience

  // clone the plant diagram into the scene so the two can never drift apart
  (function () {
    var src = document.getElementById('plant-svg');
    var fig = document.getElementById('plant-scene-fig');
    if (!src || !fig) return;
    var clone = src.cloneNode(true);
    clone.id = 'plant-cam-svg';
    clone.removeAttribute('data-active');
    clone.removeAttribute('role');
    clone.removeAttribute('aria-label');
    clone.setAttribute('aria-hidden', 'true');
    // fill the frame rather than sitting in a letterboxed band inside it;
    // every beat of this scene is already a zoomed camera on one component,
    // so cropping the margins costs nothing
    clone.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    // drop interactive hotspots and every duplicated id
    Array.prototype.forEach.call(clone.querySelectorAll('.hotspot'), function (n) { n.parentNode.removeChild(n); });
    Array.prototype.forEach.call(clone.querySelectorAll('[id]'), function (n) { n.removeAttribute('id'); });
    var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('id', 'plant-cam-g');
    while (clone.firstChild) g.appendChild(clone.firstChild);
    clone.appendChild(g);
    fig.appendChild(clone);
  })();

  scenes.forEach(function (sc) {
    if (!sc.el) return;
    if (sc.steps === PLANT_STEPS && !document.getElementById('plant-cam-svg')) return; // clone failed; keep the list
    sc.el.classList.add('is-live');

    var rail = sc.el.querySelector('[data-role="rail"]');
    if (rail) { rail.innerHTML = ''; sc.steps.forEach(function () { rail.appendChild(document.createElement('span')); }); }

    var n = sc.steps.length, shown = -1;
    // Scroll runway: one viewport-ish of travel per beat, plus a screen so
    // the last beat can be read before the stage releases.
    sc.el.style.setProperty('--runway', (n * 62 + 70) + 'vh');
    /* Originally a scroll-scrubbed timeline; the page turn drives it now, so
       it stays paused and the pager addresses it beat by beat. */
    var tl = gsap.timeline({ paused: true });
    
    var copy = sc.el.querySelector('.pin-copy');
    var swapTo = function (i) { return function () { setCaption(sc.el, sc.steps, i); }; };
    for (var i = 1; i < n; i++) {
      tl.to(copy, { opacity: 0, y: -16, duration: 0.26, ease: 'power2.in',
        onComplete: swapTo(i), onReverseComplete: swapTo(i - 1) }, i - 0.34);
      // immediateRender:false, or the "from" state would paint at build
      // time and leave the first caption invisible before any scrolling.
      tl.fromTo(copy, { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.34, ease: 'power2.out', immediateRender: false }, i - 0.06);
    }

    sc.build(tl, sc.steps);
    tl.set({}, {}, n); // normalize total duration so progress maps to steps
    tl.progress(0);    // and it opens on its first beat, not its last
    paintRail();       // progress(0) on a timeline already at 0 fires nothing

    /* The same timeline, addressable by beat: one beat per page, which keeps
       the camera work intact without needing a scroll runway. */
    sc.el._sceneSteps = n;
    
    function paintRail() {
      if (!rail) return;
      var p = tl.progress() * n;
      for (var j = 0; j < rail.children.length; j++) {
        rail.children[j].style.setProperty('--fill', Math.max(0, Math.min(1, p - j + 1)));
      }
    }
    tl.eventCallback('onUpdate', paintRail);
    sc.el._sceneGo = function (i, instant) {
      if (sc.el._runTo) sc.el._runTo(i + 1);
      if (instant) { tl.progress(Math.min(i / n, 1)); return; }
      gsap.killTweensOf(tl);
      tl.tweenTo(Math.max(0, Math.min(i, n)), { duration: 0.75, ease: 'power2.inOut' });
    };
  });

  function buildPlantTl (tl, steps) {
    var cam = document.getElementById('plant-cam-g');
    if (!cam) return;
    var VB_CX = 480, VB_CY = 240;                 // centre of viewBox "-46 -34 1052 548"
    var state = { s: 1, cx: VB_CX, cy: VB_CY };
    /* The frame is taller than the drawing and covers rather than letterboxes,
       so the horizontal field of view is narrower than the one these camera
       moves were composed for. measureFit scales the camera back until every
       framed shot fits the narrower field. */
    var SRC_ASPECT = 1052 / 548, fit = 1;
    function measureFit() {
      var svg = document.getElementById('plant-cam-svg');
      if (!svg) return;
      var r = svg.getBoundingClientRect();
      if (!r.width || !r.height) return;
      fit = Math.min(1, (r.width / r.height) / SRC_ASPECT);
      apply();
    }
    var apply = function () {
      var s = state.s * fit;
      cam.setAttribute('transform',
        'translate(' + (VB_CX - s * state.cx) + ',' + (VB_CY - s * state.cy) + ') scale(' + s + ')');
    };
    apply();
    window.addEventListener('resize', measureFit);
    // buildPlantTl runs outside the scenes loop, so reach the element by id
    var host = document.getElementById('plant-scene');
    if (host) host._measureFit = measureFit;
    var camSvg = document.getElementById('plant-cam-svg');
    function runTo(k) {
      if (!camSvg) return;
      camSvg.setAttribute('data-beat', k);   // the highlight follows the beat
      for (var r = 1; r <= steps.length; r++) camSvg.classList.toggle('run-' + r, r <= k);
    }
    runTo(0);
    // one source of truth: the pager sets the beat, so the pager starts the
    // plant. A timeline callback at position 0 never fires on an instant seek.
    var runHost = document.getElementById('plant-scene');
    if (runHost) runHost._runTo = runTo;

    steps.forEach(function (st, i) {
      // The move has to ARRIVE at beat i. The pager parks the playhead exactly
      // on i, so a move that starts there leaves the reader looking at the
      // previous component while the copy describes this one.
      if (i === 0) { state.s = st.s; state.cx = st.cx; state.cy = st.cy; apply(); }
      else tl.to(state, { s: st.s, cx: st.cx, cy: st.cy, duration: 0.8, ease: 'power2.inOut', onUpdate: apply }, i - 0.8);
    });
  }

  function buildBuildTl (tl) {
    if (!document.getElementById('bd-svg')) return;
    var groups = ['#bd-1','#bd-2','#bd-3','#bd-4','#bd-5','#bd-6','#bd-7','#bd-8','#bd-9'];
    if (!HAS_DRAW) { gsap.set(groups.join(',') + ',#bd-steam', { opacity: 1 }); return; }

    var cam = document.getElementById('bd-cam');
    var far = document.getElementById('bd-far');
    var near = document.getElementById('bd-near');
    var VB_CX = 450, VB_CY = 235;
    var shot = { s: 1.7, cx: 326, cy: 400, drift: 0 };
    
    var layer = function (el, depth) {
      if (!el) return;
      var s = 1 + (shot.s - 1) * depth;
      var cx = VB_CX + (shot.cx - VB_CX) * depth + shot.drift * depth;
      var cy = VB_CY + (shot.cy - VB_CY) * depth;
      el.setAttribute('transform',
        'translate(' + (VB_CX - s * cx) + ',' + (VB_CY - s * cy) + ') scale(' + s + ')');
    };
    var applyCam = function () {
      layer(far, 0.42);
      layer(cam, 1);
      layer(near, 1.32);
    };
    applyCam();
    
    tl.fromTo(shot, { drift: -26 }, { drift: 30, duration: 9, ease: 'none', onUpdate: applyCam }, 0);
    
    var shots = [
      { s: 1.70, cx: 326, cy: 400 },  // 1 clearing: down at the ground
      { s: 1.60, cx: 326, cy: 410 },  // 2 excavation: the pit
      { s: 1.55, cx: 326, cy: 400 },  // 3 base mat
      { s: 1.35, cx: 326, cy: 340 },  // 4 walls climbing
      { s: 1.25, cx: 326, cy: 300 },  // 5 dome on top
      { s: 1.22, cx: 330, cy: 310 },  // 6 reactor inside
      { s: 1.12, cx: 400, cy: 320 },  // 7 turbine hall joins
      { s: 1.00, cx: 470, cy: 300 },  // 8 tower rises
      { s: 0.95, cx: 450, cy: 290 }   // 9 wide on the finished plant
    ];
    shots.forEach(function (sh, i) {
      if (i === 0) { shot.s = sh.s; shot.cx = sh.cx; shot.cy = sh.cy; applyCam(); return; }
      tl.to(shot, { s: sh.s, cx: sh.cx, cy: sh.cy,
        duration: 0.95, ease: 'power1.inOut', onUpdate: applyCam }, i - 0.95);
    });

    gsap.set('#bd-ground > *', { drawSVG: '0%' });
    tl.to('#bd-ground > *', { drawSVG: '100%', duration: 0.6, ease: 'power2.out', stagger: 0.1 }, 0);

    groups.forEach(function (g, i) {
      // Select drawable leaf shapes, not direct children: several stages
      // wrap their contents in a group to grow them, and DrawSVG cannot
      // draw a <g>.
      var parts = document.querySelectorAll(g + ' path, ' + g + ' ellipse, ' + g + ' rect, ' + g + ' circle, ' + g + ' line');
      if (i === 0) { gsap.set(parts, { drawSVG: '100%' }); gsap.set(g, { opacity: 1 }); return; }
      gsap.set(parts, { drawSVG: '0%' });
      tl.to(parts, { drawSVG: '100%', duration: 0.7, ease: 'power2.out', stagger: 0.06 }, i - 0.8);
      tl.fromTo(g, { opacity: 0.7 }, { opacity: 1, duration: 0.3, ease: 'none', immediateRender: false }, i - 0.3);
    });

    [['#bd-4-grow', '326 424', 3], ['#bd-7-grow', '540 392', 6], ['#bd-8-grow', '770 392', 7]].forEach(function (it) {
      tl.fromTo(it[0], { scaleY: 0.04, svgOrigin: it[1] },
        { scaleY: 1, duration: 0.85, ease: 'power2.out', immediateRender: false }, it[2] - 0.85);
    });
    // the dome is craned down onto the walls
    tl.fromTo('#bd-5', { y: -96, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.75, ease: 'power2.out', immediateRender: false }, 3.25);
    // steam once the towers stand
    tl.fromTo('#bd-steam', { opacity: 0, y: 14 },
      { opacity: 0.85, y: 0, duration: 0.7, ease: 'power2.out', immediateRender: false }, 7.3);
  }

  function buildFissionTl (tl) {
    if (!document.getElementById('fs-svg')) return;
    var hidden = '#fs-fa, #fs-fb, #fs-r1, #fs-r2, #fs-r3, #fs-rod, #fs-halo, #fs-ring';
    gsap.set(hidden, { opacity: 0 });
    gsap.set('#fs-nuc', { opacity: 1 });

    // 0 · the neutron drifts in (origin x = 70)
    tl.fromTo('#fs-n0', { x: 70 }, { x: 320, duration: 0.95, ease: 'none' }, 0);
    // 1 · absorbed; the nucleus swells and wobbles
    tl.to('#fs-n0', { x: 392, duration: 0.35, ease: 'power2.in' }, 1);
    tl.to('#fs-n0', { opacity: 0, duration: 0.2 }, 1.3);
    tl.to('#fs-nuc', { scale: 1.16, duration: 0.4, ease: 'power2.out', svgOrigin: '400 236' }, 1.2);
    tl.to('#fs-nuc', { scaleX: 1.3, scaleY: 0.88, duration: 0.45, ease: 'sine.inOut', svgOrigin: '400 236' }, 1.55);
    // 2 · the split
    tl.to('#fs-nuc', { opacity: 0, duration: 0.2 }, 2.05);
    tl.fromTo('#fs-ring', { opacity: 0.95, scale: 0.6 }, { opacity: 0, scale: 3.4, duration: 0.8, ease: 'power2.out', svgOrigin: '400 236' }, 2);
    tl.fromTo('#fs-halo', { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1.4, duration: 0.5, ease: 'power2.out', svgOrigin: '400 236' }, 2);
    tl.to('#fs-halo', { opacity: 0, duration: 0.45 }, 2.35);
    tl.fromTo('#fs-fa', { opacity: 0, x: 400, y: 236 }, { opacity: 1, x: 282, y: 132, duration: 0.75, ease: 'power2.out' }, 2.15);
    tl.fromTo('#fs-fb', { opacity: 0, x: 400, y: 236 }, { opacity: 1, x: 296, y: 348, duration: 0.75, ease: 'power2.out' }, 2.15);
    // 3 · fresh neutrons leave
    tl.fromTo('#fs-r1', { opacity: 0, x: 0, y: 0 }, { opacity: 1, x: 120, y: -70, duration: 0.7, ease: 'power1.out' }, 3);
    tl.fromTo('#fs-r2', { opacity: 0, x: 0, y: 0 }, { opacity: 1, x: 140, y: 4, duration: 0.7, ease: 'power1.out' }, 3.1);
    tl.fromTo('#fs-r3', { opacity: 0, x: 0, y: 0 }, { opacity: 1, x: 118, y: 78, duration: 0.7, ease: 'power1.out' }, 3.2);
    
    // 4 · they reach the next nuclei, which light up
    tl.to('#fs-r1', { x: 300, y: -128, duration: 0.7, ease: 'none' }, 4);
    tl.to('#fs-r2', { x: 344, y: 0, duration: 0.7, ease: 'none' }, 4);
    tl.to('#fs-r3', { x: 300, y: 126, duration: 0.7, ease: 'none' }, 4);
    tl.to('#fs-gen2 .fs-g2', { opacity: 1, scale: 1.12, duration: 0.45, stagger: 0.08, ease: 'power2.out', svgOrigin: '740 236' }, 4.5);
    // 5 · control rods take up the slack
    tl.fromTo('#fs-rod', { opacity: 0, y: 0 }, { opacity: 1, y: 168, duration: 0.7, ease: 'power2.out' }, 4.55);
    tl.to('#fs-r2', { opacity: 0.25, duration: 0.4 }, 5.4);
    tl.to('#fs-gen2 .fs-g2', { opacity: 0.55, duration: 0.4 }, 5.5);
  }
})();

function setCaption (sceneEl, steps, i) {
  var st = steps[i];
  var pad = function (v) { return (v < 10 ? '0' : '') + v; };
  var stepEl = sceneEl.querySelector('[data-role="step"]');
  var titleEl = sceneEl.querySelector('[data-role="title"]');
  var textEl = sceneEl.querySelector('[data-role="text"]');
  if (stepEl) stepEl.textContent = 'Step ' + pad(i + 1) + ' / ' + pad(steps.length);
  if (titleEl) titleEl.textContent = st.title;
  if (textEl) textEl.textContent = st.text;
}

