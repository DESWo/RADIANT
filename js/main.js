/* RADIANT — museum runtime.
   Loaded as a module, so it is deferred and runs after the document is parsed.
   GSAP and Lenis are vendored classic scripts loaded before this one; they are
   read off `window` rather than imported. */

import { CHARTS } from '../data/charts.js';
import { createReactor, BETA, T_IN, T_REF } from './reactor-model.js';
import { SOURCES, DEMAND, balance, solve } from './grid-model.js';
import { INCIDENTS } from '../data/incidents.js';
import { FALLBACK_NEWS } from '../data/news.js';
import { CAREERS } from '../data/careers.js';
import { PLANT_STEPS, FISSION_STEPS, BUILD_STEPS } from '../data/scenes.js';
import { WINGS, BOOK_TITLES, WING_CLOTH, LOTS, CASTS, BOOK_MARKS, OPERABLE } from '../data/wings.js';

import { REDUCE, HAS_GSAP, HAS_DRAW, whenVisible, sweepVisible } from './env.js';
import './charts.js';

'use strict';
/* ============ INCIDENT TABS ============ */

var tabsEl = document.getElementById('incident-tabs');
var panelEl = document.getElementById('incident-panel');

function renderIncident(inc) {
  while (panelEl.firstChild) panelEl.removeChild(panelEl.firstChild);

  var head = document.createElement('div');
  head.className = 'incident-panel__head';
  var h3 = document.createElement('h3');
  h3.textContent = inc.name + ' · ' + inc.year;
  var chip = document.createElement('span');
  chip.className = 'chip';
  chip.textContent = inc.severity;
  head.appendChild(h3); head.appendChild(chip);
  panelEl.appendChild(head);

  var desc = document.createElement('p');
  desc.style.fontSize = '0.95rem';
  desc.textContent = inc.description;
  panelEl.appendChild(desc);

  var perc = document.createElement('div');
  perc.className = 'perception';
  var pBox = document.createElement('div');
  var pl = document.createElement('div'); pl.className = 'p-label'; pl.textContent = 'Public perception';
  var pv = document.createElement('div'); pv.className = 'p-value'; pv.textContent = inc.feared;
  pBox.appendChild(pl); pBox.appendChild(pv);
  var cBox = document.createElement('div');
  cBox.className = 'confirmed';
  var cl = document.createElement('div'); cl.className = 'p-label'; cl.textContent = 'Confirmed deaths from radiation';
  var cv = document.createElement('div'); cv.className = 'p-value'; cv.textContent = inc.confirmed;
  cBox.appendChild(cl); cBox.appendChild(cv);
  perc.appendChild(pBox); perc.appendChild(cBox);
  panelEl.appendChild(perc);

  var doseP = document.createElement('p');
  doseP.style.fontSize = '0.85rem';
  doseP.style.color = 'var(--muted)';
  doseP.textContent = inc.dose + '.';
  panelEl.appendChild(doseP);

  var cols = document.createElement('div');
  cols.className = 'incident-cols';
  [['What happened', inc.happened], ['Long-term reality', inc.longterm]].forEach(function (pair) {
    var col = document.createElement('div');
    var h4 = document.createElement('h4');
    h4.textContent = pair[0];
    col.appendChild(h4);
    var ul = document.createElement('ul');
    pair[1].forEach(function (item) {
      var li = document.createElement('li');
      li.textContent = item;
      ul.appendChild(li);
    });
    col.appendChild(ul);
    cols.appendChild(col);
  });
  panelEl.appendChild(cols);
}

INCIDENTS.forEach(function (inc, i) {
  var tab = document.createElement('button');
  tab.className = 'tab';
  tab.setAttribute('role', 'tab');
  tab.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
  var strong = document.createElement('span');
  strong.textContent = inc.name;
  var small = document.createElement('small');
  small.textContent = inc.year + ' · ' + inc.location;
  tab.appendChild(strong); tab.appendChild(small);
  tab.addEventListener('click', function () {
    tabsEl.querySelectorAll('.tab').forEach(function (t) { t.setAttribute('aria-selected', 'false'); });
    tab.setAttribute('aria-selected', 'true');
    renderIncident(inc);
  });
  tabsEl.appendChild(tab);
});
renderIncident(INCIDENTS[0]);

/* ============ NEWS CARDS ============ */
// Baked-in fallback: shown if news.json is missing or unreachable
var newsGrid = document.getElementById('news-grid');
function renderNews(items) {
  while (newsGrid.firstChild) newsGrid.removeChild(newsGrid.firstChild);
  items.forEach(function (n) {
    var a = document.createElement('a');
    a.className = 'news-card reveal in';
    a.href = n.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    var meta = document.createElement('div');
    meta.className = 'meta';
    var chip = document.createElement('span');
    chip.className = 'cat-chip'; chip.textContent = n.cat;
    var date = document.createElement('span'); date.textContent = n.date;
    meta.appendChild(chip); meta.appendChild(date);
    var h3 = document.createElement('h3'); h3.textContent = n.title;
    var p = document.createElement('p'); p.textContent = n.summary || '';
    var src = document.createElement('span'); src.className = 'src'; src.textContent = n.source + ' ↗';
    a.appendChild(meta); a.appendChild(h3); a.appendChild(p); a.appendChild(src);
    newsGrid.appendChild(a);
  });
}
renderNews(FALLBACK_NEWS);
fetch('news.json', { cache: 'no-store' })
  .then(function (r) { if (!r.ok) throw new Error('no news.json'); return r.json(); })
  .then(function (d) {
    if (d && d.items && d.items.length) {
      renderNews(d.items);
      var upd = document.getElementById('news-updated');
      if (upd && d.generated_at) {
        var when = new Date(d.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        upd.textContent = 'Headlines refresh automatically several times a day. Last updated ' + when + '.';
      }
    }
  })
  .catch(function () { /* fallback cards already rendered */ });

/* ============ CAREER ACCORDIONS ============ */
var careerList = document.getElementById('career-list');
CAREERS.forEach(function (c) {
  var acc = document.createElement('div');
  acc.className = 'acc reveal';
  var head = document.createElement('button');
  head.className = 'acc-head';
  head.setAttribute('aria-expanded', 'false');
  var title = document.createElement('span');
  title.className = 'acc-title';
  var text = document.createElement('span');
  text.className = 'acc-text'; text.textContent = c.title;
  var sub = document.createElement('span');
  sub.className = 'acc-sub';
  sub.textContent = c.salary + ' · ' + c.education + ' · ' + c.outlook;
  title.appendChild(text); title.appendChild(sub);
  var caret = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  caret.setAttribute('class', 'acc-caret'); caret.setAttribute('width', '18'); caret.setAttribute('height', '18');
  caret.setAttribute('viewBox', '0 0 24 24'); caret.setAttribute('fill', 'none'); caret.setAttribute('aria-hidden', 'true');
  var poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  poly.setAttribute('points', '6 9 12 15 18 9');
  poly.setAttribute('stroke', 'currentColor'); poly.setAttribute('stroke-width', '2.2');
  poly.setAttribute('stroke-linecap', 'round'); poly.setAttribute('stroke-linejoin', 'round');
  caret.appendChild(poly);
  head.appendChild(title); head.appendChild(caret);

  var panel = document.createElement('div');
  panel.className = 'acc-panel';
  var inner = document.createElement('div');
  var bodyDiv = document.createElement('div');
  bodyDiv.className = 'acc-body';
  var dp = document.createElement('p');
  dp.style.fontSize = '0.92rem';
  dp.textContent = c.detail;
  bodyDiv.appendChild(dp);
  var ul = document.createElement('ul');
  ul.style.cssText = 'list-style:none;margin-top:0.8rem';
  c.points.forEach(function (pt) {
    var li = document.createElement('li');
    li.style.cssText = 'font-size:0.93rem;color:var(--body);padding:0.25rem 0 0.25rem 1rem;border-left:2px solid var(--hair);margin-bottom:0.35rem';
    li.textContent = pt;
    ul.appendChild(li);
  });
  bodyDiv.appendChild(ul);
  inner.appendChild(bodyDiv);
  panel.appendChild(inner);
  acc.appendChild(head); acc.appendChild(panel);
  careerList.appendChild(acc);
});

/* ============ GRID-MIX SIMULATOR ============ */
(function () {
  var cityEl = document.getElementById('sim-city');
  if (!cityEl) return;

  var SVGNS = 'http://www.w3.org/2000/svg';
  var COLORS = { nuclear: '#F2C46B', solar: '#FBBF24', wind: '#49D6E8', hydro: '#34D399', gas: '#A9A18B' };
  var VARIABLE = { solar: 1, wind: 1 };
  var WIN_OFF = '#0c1626';

  // build the skyline once; collect every window rect
  var wins = [];
  (function buildCity() {
    var GROUND = 232;
    var buildings = [
      {x:16,w:66,h:150},{x:90,w:50,h:104},{x:148,w:62,h:196},{x:218,w:44,h:86},
      {x:270,w:78,h:214},{x:356,w:52,h:126},{x:416,w:68,h:168},{x:492,w:46,h:98},
      {x:546,w:44,h:140},{x:598,w:34,h:78}
    ];
    // faint stars
    var seed = 7;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (var st = 0; st < 34; st++) {
      var star = document.createElementNS(SVGNS, 'circle');
      star.setAttribute('cx', (rnd() * 640).toFixed(0));
      star.setAttribute('cy', (rnd() * 150).toFixed(0));
      star.setAttribute('r', (0.4 + rnd() * 0.9).toFixed(2));
      star.setAttribute('fill', '#40392C');
      cityEl.appendChild(star);
    }
    var winW = 8, winH = 10, gapX = 6, gapY = 7, pad = 8;
    buildings.forEach(function (b) {
      var body = document.createElementNS(SVGNS, 'rect');
      body.setAttribute('x', b.x); body.setAttribute('y', GROUND - b.h);
      body.setAttribute('width', b.w); body.setAttribute('height', b.h);
      body.setAttribute('rx', 3);
      body.setAttribute('fill', '#2A2418'); body.setAttribute('stroke', '#433C2F'); body.setAttribute('stroke-width', '1');
      cityEl.appendChild(body);
      var cols = Math.max(1, Math.floor((b.w - 2 * pad + gapX) / (winW + gapX)));
      var rows = Math.max(1, Math.floor((b.h - 2 * pad + gapY) / (winH + gapY)));
      var gridW = cols * (winW + gapX) - gapX;
      var offx = b.x + (b.w - gridW) / 2;
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
        var w = document.createElementNS(SVGNS, 'rect');
        w.setAttribute('class', 'win');
        w.setAttribute('x', (offx + c * (winW + gapX)).toFixed(1));
        w.setAttribute('y', (GROUND - b.h + pad + r * (winH + gapY)).toFixed(1));
        w.setAttribute('width', winW); w.setAttribute('height', winH); w.setAttribute('rx', 1);
        w.setAttribute('fill', WIN_OFF);
        cityEl.appendChild(w); wins.push(w);
      }
    });
    var ground = document.createElementNS(SVGNS, 'rect');
    ground.setAttribute('x', 0); ground.setAttribute('y', GROUND); ground.setAttribute('width', 640); ground.setAttribute('height', 250 - GROUND);
    ground.setAttribute('fill', '#0a1220');
    cityEl.appendChild(ground);
  })();

  // deterministic shuffle so each source's windows sprinkle across the city
  var order = wins.map(function (_, i) { return i; });
  (function () { var s = 4321; for (var i = order.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; var j = Math.floor(s / 233280 * (i + 1)); var t = order[i]; order[i] = order[j]; order[j] = t; } })();

  function paintCity(shares) {
    var total = wins.length, seq = ['nuclear', 'solar', 'wind', 'hydro', 'gas'];
    var counts = {}, assigned = 0;
    seq.forEach(function (k, idx) {
      if (idx === seq.length - 1) counts[k] = total - assigned;
      else { counts[k] = Math.round((shares[k] || 0) / 100 * total); assigned += counts[k]; }
    });
    if (counts.gas < 0) counts.gas = 0;
    var ptr = 0;
    seq.forEach(function (k) {
      for (var n = 0; n < counts[k] && ptr < total; n++) {
        var w = wins[order[ptr++]];
        w.setAttribute('fill', COLORS[k]);
        w.style.filter = 'drop-shadow(0 0 3px ' + COLORS[k] + ')';
        if (VARIABLE[k]) { w.classList.add('win-var'); w.style.animationDelay = (order[ptr] % 26) / 10 + 's'; }
        else { w.classList.remove('win-var'); w.style.animationDelay = ''; }
      }
    });
    for (; ptr < total; ptr++) { var wo = wins[order[ptr]]; wo.setAttribute('fill', WIN_OFF); wo.style.filter = 'none'; wo.classList.remove('win-var'); }
  }

  function el(id) { return document.getElementById(id); }

  function update(movedId) {
    var raw = {};
    SOURCES.forEach(function (s) { if (s.slider) raw[s.id] = parseInt(el('sim-' + s.id).value, 10); });
    var shares = balance(raw, movedId);
    // write the balanced values back to the sliders that were squeezed
    SOURCES.forEach(function (s) {
      if (s.slider && +el('sim-' + s.id).value !== shares[s.id]) el('sim-' + s.id).value = shares[s.id];
    });

    var solved = solve(shares);
    var co2 = solved.co2, totalCap = solved.capacity, caps = solved.caps, firm = solved.firm;

    SOURCES.forEach(function (s) {
      if (s.slider) el('sim-' + s.id + '-out').textContent = shares[s.id] + '%';
    });
    el('sim-gas').textContent = shares.gas + '%';
    el('sim-co2').textContent = Math.round(co2) + ' g/kWh';
    el('sim-cap').textContent = Math.round(totalCap).toLocaleString('en-US') + ' MW';
    el('sim-firm').textContent = firm + '%';
    el('sim-firm-sub').textContent = firm < 40
      ? 'low: a real grid this weather-dependent needs major storage or backup'
      : 'supply that does not depend on the weather';

    paintCity(shares);
  }

  SOURCES.forEach(function (s) {
    if (!s.slider) return;
    el('sim-' + s.id).addEventListener('input', function () { update(s.id); });
  });
  update(null);
})();

/* ============ ACCORDION BEHAVIOR (myths + careers) ============ */
document.querySelectorAll('.acc-head').forEach(function (head) {
  head.addEventListener('click', function () {
    var acc = head.closest('.acc');
    var open = acc.classList.toggle('open');
    head.setAttribute('aria-expanded', String(open));
  });
});

/* ============ REVEAL ON SCROLL ============ */

document.querySelectorAll('.reveal').forEach(function (el) {
  var idx = 0, sibs = el.parentElement ? el.parentElement.children : [];
  for (var j = 0; j < sibs.length; j++) {
    if (sibs[j] === el) break;
    if (sibs[j].classList && sibs[j].classList.contains('reveal')) idx++;
  }
  el.style.transitionDelay = Math.min(idx, 5) * 80 + 'ms';
  whenVisible(el, function () { el.classList.add('in'); });
});

/* ============ KINETIC MASTHEAD ============ */

(function () {
  var h1 = document.querySelector('.hero h1');
  if (!h1 || REDUCE || typeof SplitText === 'undefined') return;
  gsap.registerPlugin(SplitText);
  SplitText.create(h1, {
    type: 'words',
    mask: 'words',        // each word gets its own clip box
    autoSplit: true,      // re-split when the font loads or the line wraps
    onSplit: function (self) {
      return gsap.from(self.words, {
        yPercent: 118, duration: 0.85, stagger: 0.07,
        ease: 'expo.out', delay: 0.12
      });
    }
  });
})();

/* ============ READING PROGRESS ============ */
var progress = document.getElementById('progress');
if (progress) {
  var setProgress = function () {
    var de = document.documentElement;
    var max = de.scrollHeight - de.clientHeight;
    progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(window.scrollY / max, 1) : 0) + ')';
  };
  window.addEventListener('scroll', setProgress, { passive: true });
  window.addEventListener('resize', setProgress);
  window.addEventListener('hashchange', setProgress); // view switches change page height
  setProgress();
}

/* DOSIMETER (signature instrument) */
(function () {
  var el = document.getElementById('dosimeter');
  var valEl = document.getElementById('dose-val');
  var hallEl = document.getElementById('dose-hall');
  if (!el || !valEl) return;
  /* 0.040 mSv for the whole building, which is one round-trip New York to Los Angeles by air. It used to be read off the scrollbar; */
  var DOSE_FULL = 0.040, DOSE_ROOMS = 18;
  /* Counted from WINGS once it exists, so adding or retiring a room can
     never leave the badge reading 100% before the museum ends. */
  function totalRooms() { return window.__DOSE_ROOMS || DOSE_ROOMS; }
  var seen = Object.create(null), seenCount = 0;
  var shown = 0, target = 0, raf = 0;
  function frac() { return Math.min(seenCount / totalRooms(), 1); }
  function render(v) {
    valEl.textContent = v.toFixed(3);
    el.style.setProperty('--f', frac().toFixed(4));
  }
  function tick() {
    shown += (target - shown) * 0.18;
    if (Math.abs(target - shown) < 0.00004) { shown = target; raf = 0; }
    render(shown);
    if (raf) raf = requestAnimationFrame(tick);
  }
  function update() {
    target = DOSE_FULL * frac();
    if (REDUCE) { shown = target; render(shown); return; }
    if (!raf) raf = requestAnimationFrame(tick);
  }
  /* The pager calls this on every page it opens. A room you have already stood in adds nothing, which is what makes the badge mean anything. */
  /* 0.040 mSv is a number almost nobody can size. Say what it is worth. */
  window.__doseSay = function () {
    var mSv = DOSE_FULL * frac();
    var pct = Math.round(frac() * 100);
    if (!pct) return '';
    return 'You have taken ' + mSv.toFixed(3) + ' mSv walking this museum: about '
      + pct + '% of one New York to Los Angeles flight.';
  };
  window.__doseWalk = function (roomId, label) {
    if (roomId && !seen[roomId]) { seen[roomId] = 1; seenCount++; }
    if (hallEl && label) hallEl.textContent = label;
    update();
  };
  window.addEventListener('resize', update);
  update();
  if (REDUCE) el.classList.add('lit');
  else setTimeout(function () { el.classList.add('lit'); }, 100);
})();

/* ============ SCROLL-SCRUBBED ACCENTS (GSAP) ============ */

if (!REDUCE && HAS_GSAP) {
  /* Two scroll tweens used to live here, on the masthead lead and on the plant footage. Neither can run: `.hero` is not part of any wing and is never displayed, and the footage arrives by. */

  /* THE WALK: scroll-driven zoom between rooms (2.5D depth) */

}

/* ============ PINNED SCROLL SCENES ============ */



(function () {
  var scenes = [
    { el: document.getElementById('plant-scene'), steps: PLANT_STEPS, listId: 'plant-scene-steps', build: buildPlantTl },
    { el: document.getElementById('build-scene'), steps: BUILD_STEPS, listId: 'build-scene-steps', build: buildBuildTl },
    { el: document.getElementById('fission-scene'), steps: FISSION_STEPS, listId: 'fission-scene-steps', build: buildFissionTl }
  ];

  scenes.forEach(function (sc) {
    if (!sc.el) return;
    // always render the plain-list fallback from the same copy
    var list = document.getElementById(sc.listId);
    if (list) {
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
    document.documentElement.classList.add('motion-ok');

    // Backdrop footage is preload="none"; only fetch and play it while the
    // scene is actually on screen, and never fight the reader for attention.
    // the backdrop is hidden in a wing, so it is never fetched or played

    var rail = sc.el.querySelector('[data-role="rail"]');
    if (rail) { rail.innerHTML = ''; sc.steps.forEach(function () { rail.appendChild(document.createElement('span')); }); }

    var n = sc.steps.length, shown = -1;
    // Scroll runway: one viewport-ish of travel per beat, plus a screen so
    // the last beat can be read before the stage releases.
    sc.el.style.setProperty('--runway', (n * 62 + 70) + 'vh');
    /* This was a scroll-scrubbed timeline. The page turn drives it now, one beat per screen, so it is simply paused and addressed by beat. */
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

    /* The same timeline, addressable by beat. In a wing there is no scroll to scrub it, so the page turn drives it instead: one beat per page, which keeps every bit of the camera work that the. */
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
    /* The frame is far taller than the drawing now, and it covers rather than letterboxes, so the horizontal field of view is narrower than the one these camera moves were composed for. Scale. */
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

/* ============ REACTOR KINETICS ============
   One-group point kinetics with Doppler feedback. Below prompt critical the
   prompt term is solved quasi-statically (the prompt-jump approximation),
   which is what keeps a stiff system with Lambda = 2e-5 s stable at 20 Hz;
   above it the prompt branch is stepped directly in substeps. */
(function () {
  var host = document.getElementById('rk');
  if (!host) return;
  var cv = document.getElementById('rk-canvas');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');

  var P_TAU = 6.0;
  var el = function (id) { return document.getElementById(id); };
  var out = { state: el('rk-state'), pow: el('rk-power'), temp: el('rk-temp'), per: el('rk-period'),
              rod: el('rk-rodpos'), rhoRod: el('rk-rho-rod'), rhoDop: el('rk-rho-dop'),
              rho: el('rk-rho'), bar: el('rk-bar'), beta: el('rk-beta'), live: el('rk-live') };
  var slider = el('rk-rods');

  var core = createReactor();
  var S = core.state;
  var hist, last = 0, raf = 0;
  function reset() {
    core.reset();
    hist = []; slider.value = 0; slider.disabled = false;
    out.live.textContent = '';
  }
  reset();

  var step = core.step;

  function paint(r) {
    var pct = S.n * 100;
    out.pow.textContent = pct < 10 ? pct.toFixed(2) : pct.toFixed(1);
    out.temp.textContent = Math.round(S.T);
    var pRho = Math.round(r.rho * 1e5), pRod = Math.round(r.rodRho * 1e5), pDop = Math.round(r.dopRho * 1e5);
    out.rhoRod.textContent = (pRod >= 0 ? '+' : '') + pRod;
    out.rhoDop.textContent = (pDop >= 0 ? '+' : '−') + Math.abs(pDop);
    out.rho.textContent = (pRho >= 0 ? '+' : '−') + Math.abs(pRho);
    out.rod.textContent = S.rod;
    var per = r.period;
    out.per.textContent = !isFinite(per) ? '∞' : Math.abs(per) > 999 ? '∞'
      : Math.abs(per) < 0.01 ? per.toExponential(1) : per.toFixed(1);

    var st = 'Critical', tag = '';
    if (core.scrammed) { st = 'Scrammed'; tag = 'scram'; }
    else if (r.rho >= BETA * 0.97) { st = 'Prompt critical'; tag = 'prompt'; }
    else if (r.rho > 2e-5) st = 'Supercritical';
    else if (r.rho < -2e-5) { st = 'Subcritical'; tag = 'sub'; }
    out.state.textContent = st; out.state.setAttribute('data-s', tag);

    var w = Math.min(Math.abs(pRho) / 1000, 1) * 50;
    out.bar.style.left = pRho >= 0 ? '50%' : (50 - w) + '%';
    out.bar.style.width = w + '%';
    out.beta.style.left = (50 + 650 / 1000 * 50) + '%';

    // the message that teaches the exhibit
    if (core.scrammed) out.live.textContent = 'Rods in. The chain reaction stops in seconds; decay heat does not.';
    else if (r.rho >= BETA * 0.97 && S.n > 1.5)
      out.live.textContent = 'Prompt critical — and the fuel, not the operator, is what pulls it back.';
    else if (S.n > 1.6 && r.dopRho < -1e-4)
      out.live.textContent = 'Fuel is hot: Doppler is subtracting ' + Math.abs(pDop) + ' pcm and levelling the power.';
    else if (Math.abs(pRho) < 5 && Math.abs(S.n - 1) < 0.08) out.live.textContent = 'Steady. Reactivity balanced at zero.';
    else out.live.textContent = '';
  }

  function draw() {
    var W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(228,220,201,0.10)'; ctx.lineWidth = 1;
    for (var g = 1; g < 4; g++) { var y = H * g / 4; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    // rated power line
    ctx.strokeStyle = 'rgba(242,196,107,0.32)'; ctx.setLineDash([4, 4]);
    var y1 = H - (1 / 3) * H; ctx.beginPath(); ctx.moveTo(0, y1); ctx.lineTo(W, y1); ctx.stroke(); ctx.setLineDash([]);
    if (hist.length < 2) return;
    var n = hist.length, dx = W / Math.max(n - 1, 1);
    // temperature
    ctx.strokeStyle = 'rgba(242,196,107,0.55)'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (var i = 0; i < n; i++) {
      var ty = H - Math.min((hist[i].T - T_IN) / (T_REF * 1.6 - T_IN), 1) * H;
      i ? ctx.lineTo(i * dx, ty) : ctx.moveTo(i * dx, ty);
    }
    ctx.stroke();
    // power
    ctx.strokeStyle = '#49D6E8'; ctx.lineWidth = 2; ctx.beginPath();
    for (var j = 0; j < n; j++) {
      var py = H - Math.min(hist[j].n / 3, 1) * H;
      j ? ctx.lineTo(j * dx, py) : ctx.moveTo(j * dx, py);
    }
    ctx.stroke();
  }

  var acc = 0, FRAME = REDUCE ? 0.25 : 0;   // seconds between repaints
  function tick(t) {
    if (!last) last = t;
    var dt = Math.min((t - last) / 1000, 0.1); last = t;
    var r = step(dt);
    acc += dt;
    if (acc >= FRAME) {
      acc = 0;
      hist.push({ n: S.n, T: S.T });
      if (hist.length > 420) hist.shift();
      paint(r); draw();
    }
    raf = requestAnimationFrame(tick);
  }

  slider.addEventListener('input', function () { core.setRod(+slider.value); slider.disabled = false; });
  el('rk-scram').addEventListener('click', function () { core.scram(); slider.value = -800; });
  el('rk-reset').addEventListener('click', function () { reset(); core.setRod(0); hist = []; });

  /* Only run while it is on screen: a 20 Hz integrator behind a hidden page
     is work nobody can see. */
  var running = false;
  function start() { if (running) return; running = true; last = 0; raf = requestAnimationFrame(tick); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.isIntersecting ? start() : stop(); });
    }, { threshold: 0.15 }).observe(host);
  } else start();
})();

/* ============ COUNT-UP NUMBERS ============ */
var counters = document.querySelectorAll('[data-count]');
function runCount(el) {
  var target = parseFloat(el.dataset.count);
  var dec = parseInt(el.dataset.decimals || '0', 10);
  function fmtCount(v) { return dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US'); }
  if (REDUCE) { el.textContent = fmtCount(target); return; }
  var dur = 1100, t0 = null;
  function step(ts) {
    if (!t0) t0 = ts;
    var p = Math.min((ts - t0) / dur, 1);
    var eased = 1 - Math.pow(1 - p, 3);
    el.textContent = fmtCount(target * eased);
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
counters.forEach(function (el) {
  whenVisible(el, function () { runCount(el); });
});

/* ============ HERO FISSION FIELD ============ */
(function () {
  var cv = document.getElementById('hero-bg');
  if (!cv || !cv.getContext) return;
  var hero = cv.parentElement;
  // The masthead belongs to the no-JS reading order. In the museum it is
  // never displayed, and an animation loop for a hidden canvas is a loop
  // that runs for the life of the page and paints nothing.
  if (!hero || !hero.offsetHeight) return;
  var ctx = cv.getContext('2d');
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0;
  function size() {
    W = hero.clientWidth; H = hero.clientHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  size();

  var parts = [];
  for (var i = 0; i < 34; i++) {
    parts.push({
      x: Math.random(), y: Math.random(),
      r: 1.3 + Math.random() * 1.9,
      vx: (Math.random() - 0.5) * 0.00024,
      vy: (Math.random() - 0.5) * 0.00024,
      amber: Math.random() < 0.14,
      tw: Math.random() * Math.PI * 2
    });
  }
  var mx = 0.5, my = 0.45, tx = 0.5, ty = 0.45;

  function frame(t) {
    ctx.clearRect(0, 0, W, H);
    // blueprint grid (light lines on the dark stage)
    ctx.strokeStyle = 'rgba(255,255,255,0.045)';
    ctx.lineWidth = 1;
    for (var x = 0.5; x < W; x += 56) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (var y = 0.5; y < H; y += 56) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    // atom rings with gentle mouse parallax
    var px = (mx - 0.5) * 14, py = (my - 0.45) * 10;
    var cx = W * 0.74 + px, cy = H * 0.36 + py;
    ctx.strokeStyle = 'rgba(242,196,107,0.16)';
    ctx.lineWidth = 1.2;
    [H * 0.16, H * 0.24, H * 0.33].forEach(function (r, i) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * (0.55 + i * 0.12), (i * Math.PI) / 3.2, 0, Math.PI * 2);
      ctx.stroke();
    });
    // core glow
    var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, H * 0.2);
    grad.addColorStop(0, 'rgba(242,196,107,0.14)');
    grad.addColorStop(1, 'rgba(242,196,107,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - H * 0.25, cy - H * 0.25, H * 0.5, H * 0.5);
    // drifting neutrons
    parts.forEach(function (p) {
      var a = 0.28 + 0.22 * Math.sin(p.tw + t * 0.0012);
      ctx.fillStyle = p.amber ? 'rgba(251,191,36,' + (a + 0.1).toFixed(3) + ')' : 'rgba(125,185,255,' + a.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(p.x * W + px * (p.r / 3), p.y * H + py * (p.r / 3), p.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  if (REDUCE) {
    frame(0);
    window.addEventListener('resize', function () { size(); frame(0); });
    return;
  }
  window.addEventListener('resize', size);
  hero.addEventListener('pointermove', function (e) {
    tx = e.clientX / Math.max(W, 1);
    ty = e.clientY / Math.max(H, 1);
  });
  function loop(t) {
    if (!document.hidden && window.scrollY < H * 1.05) {
      mx += (tx - mx) * 0.04; my += (ty - my) * 0.04;
      parts.forEach(function (p) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -0.02) p.x = 1.02; else if (p.x > 1.02) p.x = -0.02;
        if (p.y < -0.02) p.y = 1.02; else if (p.y > 1.02) p.y = -0.02;
      });
      frame(t);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

/* ============ PLANT EXPLORER (click a part of the diagram) ============ */
(function () {
  var svg = document.getElementById('plant-svg');
  if (!svg) return;
  var tabs = [].slice.call(document.querySelectorAll('.ptab'));
  var steps = [].slice.call(document.querySelectorAll('.pstep-list li'));
  var titleEl = document.querySelector('.pd-title');
  var textEl = document.querySelector('.pd-text');
  var nEl = document.querySelector('.pd-n');

  function select(n) {
    n = Math.max(1, Math.min(n, steps.length || 6));
    svg.setAttribute('data-active', n);
    tabs.forEach(function (t) { t.setAttribute('aria-selected', String(parseInt(t.dataset.part, 10) === n)); });
    var li = steps[n - 1];
    if (li) {
      titleEl.textContent = li.dataset.title;
      var strong = li.querySelector('strong');
      textEl.textContent = li.textContent.replace(strong ? strong.textContent : '', '').trim();
    }
    if (nEl) nEl.textContent = n;

    if (HAS_DRAW) {
      var hl = svg.querySelectorAll('.hl-' + n);
      if (hl.length) {
        var undash = function () { gsap.set(hl, { clearProps: 'strokeDasharray,strokeDashoffset' }); };
        gsap.fromTo(hl,
          { drawSVG: '0%' },
          { drawSVG: '100%', duration: 0.65, ease: 'power2.out', overwrite: 'auto', onComplete: undash }
        );
        
        clearTimeout(select._t);
        select._t = setTimeout(undash, 900);
      }
    }
  }

  tabs.forEach(function (t) { t.addEventListener('click', function () { select(parseInt(t.dataset.part, 10)); }); });
  svg.querySelectorAll('.hotspot').forEach(function (h) {
    var go = function () { select(parseInt(h.dataset.part, 10)); };
    h.addEventListener('click', go);
    h.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });
  select(1);
})();

/* ============ FISSION CHAIN-REACTION LAB ============ */
(function () {
  var cv = document.getElementById('fz-canvas');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0, nuclei = [], neutrons = [], fissions = 0;
  var rodEl = document.getElementById('fz-rods');
  var kEl = document.getElementById('fz-k'), stateEl = document.getElementById('fz-state');
  var fissEl = document.getElementById('fz-fissions'), neuEl = document.getElementById('fz-neutrons');
  var rodOut = document.getElementById('fz-rods-out');

  function size() {
    var w = cv.clientWidth || 600, h = Math.round(Math.max(220, Math.min(w * 0.62, 340)));
    cv.width = w * DPR; cv.height = h * DPR; cv.style.height = h + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); W = w; H = h; layout();
  }
  function layout() {
    nuclei = []; var cols = 9, rows = 6, mx = W / (cols + 1), my = H / (rows + 1);
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      nuclei.push({ x: mx * (c + 1) + (Math.random() - 0.5) * mx * 0.5, y: my * (r + 1) + (Math.random() - 0.5) * my * 0.5, spent: false, flash: 0, refuel: 0 });
    }
  }

  function kValue() { return Math.max(0.15, 1.7 - (parseInt(rodEl.value, 10) / 100) * 1.5); }

  function randomUnspent(not) {
    var pool = nuclei.filter(function (n) { return !n.spent && n !== not; });
    return pool.length ? pool[(Math.random() * pool.length) | 0] : null;
  }
  function makeNeutron(from, target) {
    var ang = Math.random() * Math.PI * 2, sp = 1.4 + Math.random() * 0.8;
    if (target) { var dx = target.x - from.x, dy = target.y - from.y, d = Math.hypot(dx, dy) || 1; return { x: from.x, y: from.y, vx: dx / d * sp, vy: dy / d * sp, target: target, life: 1 }; }
    return { x: from.x, y: from.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, target: null, life: 1 };
  }
  function fission(n) {
    if (n.spent) return;
    n.spent = true; n.flash = 1; n.refuel = 260; fissions++;
    var k = kValue(), cause = 0, i;
    for (i = 0; i < 3; i++) if (Math.random() < k / 3) cause++;
    for (i = 0; i < cause; i++) { var t = randomUnspent(n); if (t) neutrons.push(makeNeutron(n, t)); }
    var waste = 1 + Math.round((1 - k / 1.7) * 2); // rods absorb more when inserted
    for (i = 0; i < waste; i++) neutrons.push(makeNeutron(n, null));
  }
  function fire() { var t = randomUnspent(null); if (t) fission(t); updateStats(); if (REDUCE) { runStatic(); draw(); } }

  function stepOnce() {
    for (var i = neutrons.length - 1; i >= 0; i--) {
      var p = neutrons[i]; p.x += p.vx; p.y += p.vy;
      if (p.target) {
        if (Math.hypot(p.target.x - p.x, p.target.y - p.y) < 9) { fission(p.target); neutrons.splice(i, 1); continue; }
      } else { p.life -= 0.012; }
      if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20 || p.life <= 0) neutrons.splice(i, 1);
    }
    for (var j = 0; j < nuclei.length; j++) {
      var nu = nuclei[j];
      if (nu.flash > 0) nu.flash -= 0.04;
      if (nu.spent && nu.refuel > 0 && --nu.refuel === 0) nu.spent = false;
    }
  }
  function runStatic() { for (var s = 0; s < 400 && neutrons.length; s++) stepOnce(); }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < nuclei.length; i++) {
      var n = nuclei[i];
      if (n.flash > 0) { ctx.fillStyle = 'rgba(251,191,36,' + (0.5 * n.flash) + ')'; ctx.beginPath(); ctx.arc(n.x, n.y, 16, 0, 6.283); ctx.fill(); }
      ctx.beginPath(); ctx.arc(n.x, n.y, 6, 0, 6.283);
      if (n.spent) { ctx.fillStyle = '#474033'; ctx.fill(); }
      else { ctx.fillStyle = 'rgba(251,191,36,0.18)'; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = '#FBBF24'; ctx.stroke(); }
    }
    for (var m = 0; m < neutrons.length; m++) {
      var p = neutrons[m]; ctx.fillStyle = p.target ? '#F1EADB' : 'rgba(148,166,194,0.6)';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.target ? 2.6 : 2, 0, 6.283); ctx.fill();
    }
  }
  function updateStats() {
    fissEl.textContent = fissions; neuEl.textContent = neutrons.length;
    var k = kValue(); kEl.textContent = k.toFixed(1);
    var label, bg, fg;
    // Plain words here on purpose: the reactivity vocabulary belongs to the
    // Control exhibit, which can actually demonstrate it.
    if (k < 0.95) { label = 'Dies out'; bg = 'rgba(73,214,232,0.16)'; fg = '#8FE4F0'; }
    else if (k <= 1.06) { label = 'Self-sustaining'; bg = 'rgba(52,211,153,0.18)'; fg = '#6ee7b7'; }
    else { label = 'Runaway'; bg = 'rgba(248,113,113,0.2)'; fg = '#fca5a5'; }
    stateEl.textContent = label; stateEl.style.background = bg; stateEl.style.color = fg;
    rodOut.textContent = rodEl.value;
  }

  var raf = null;
  function loop() { stepOnce(); draw(); neuEl.textContent = neutrons.length; raf = requestAnimationFrame(loop); }

  rodEl.addEventListener('input', updateStats);
  document.getElementById('fz-fire').addEventListener('click', fire);
  document.getElementById('fz-reset').addEventListener('click', function () { neutrons = []; fissions = 0; layout(); updateStats(); draw(); });
  window.addEventListener('resize', function () { size(); draw(); });

  size(); updateStats(); draw();
  if (!REDUCE) { raf = requestAnimationFrame(loop); }
})();

/* ============ TOUR VIDEO (autoplay while in view) ============ */
(function () {
  var video = document.querySelector('.tour-video');
  if (!video) return;
  video.muted = true; video.playsInline = true;
  if (REDUCE) return; // reduced motion: leave paused; user plays via controls
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { video.play().catch(function () {}); }
        else { video.pause(); }
      });
    }, { threshold: 0.25 }).observe(video);
  } else {
    video.play().catch(function () {});
  }
})();

/* THE MUSEUM: title -> lobby -> walk a wing */

var body = document.body;
var htmlEl = document.documentElement;
// looked up on demand: the walk bar is markup that comes after this script
var $ = function (id) { return document.getElementById(id); };
var walkbar, wbWhere, wbCount, wbPrev, wbNext;
function bindWalkbar() {
  walkbar = $('walkbar'); wbWhere = $('wb-where'); wbCount = $('wb-count');
  wbPrev = $('wb-prev'); wbNext = $('wb-next');
  var l = $('wb-lobby');
  if (l && !l._bound) { l._bound = 1; l.addEventListener('click', function () { screenTo('lobby'); }); }
}
var wing = null, step = 0;

function screenTo(name) {
  bindWalkbar();
  body.setAttribute('data-screen', name);
  // a canvas sized while hidden measures 0; resize once it is on screen
  // the atrium must not keep rendering once you have left it: a WebGL loop
  // running behind a scrolling page is exactly what makes scrolling stutter
  if (walkbar) walkbar.hidden = (name !== 'wing');
  window.scrollTo(0, 0);
}

function wingById(id) {
  for (var i = 0; i < WINGS.length; i++) if (WINGS[i].id === id) return WINGS[i];
  return null;
}

var pieceObserver = null;

function markPieces(root) {
  // an exhibit's own top-level blocks are its pieces
  var wrap = root.querySelector('.wrap') || root;
  var kids = wrap.children, n = 0;
  for (var i = 0; i < kids.length; i++) {
    var k = kids[i];
    if (k.classList.contains('piece')) continue;
    k.classList.add('piece');
    k.style.setProperty('--p', (n++ % 4));
  }
}

function litPiece(el) {
  if (el.classList.contains('lit')) return;
  el.classList.add('lit');
  // charts draw themselves the moment their piece arrives
  Object.keys(CHARTS).forEach(function (key) {
    if (el.querySelector('#' + key + '-chart') && CHARTS[key]._setWidths) CHARTS[key]._setWidths();
  });
  // numbers count up on arrival
  el.querySelectorAll('[data-count]').forEach(function (nEl) {
    if (nEl._counted) return;
    nEl._counted = 1;
    if (typeof runCount === 'function') runCount(nEl);
  });
}

function watchPieces() {
  if (pieceObserver) pieceObserver.disconnect();
  var pieces = document.querySelectorAll('body[data-screen="wing"] .view.in-wing .piece');
  if (!('IntersectionObserver' in window)) {
    pieces.forEach(litPiece);
    return;
  }
  pieceObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { litPiece(en.target); pieceObserver.unobserve(en.target); } });
  }, { root: document.getElementById('main'), rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
  pieces.forEach(function (p) { pieceObserver.observe(p); });
  // fail open: anything already on screen lights immediately
  pieces.forEach(function (p) {
    var r = p.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) litPiece(p);
  });
  // scroll-snap moves the panel, not the window, so watch the panel too
  var panel = document.getElementById('main');
  if (panel && !panel._pieceScroll) {
    panel._pieceScroll = 1;
    panel.addEventListener('scroll', function () {
      document.querySelectorAll('.view.in-wing .piece:not(.lit)').forEach(function (p) {
        var r = p.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.92 && r.bottom > 0) litPiece(p);
      });
    }, { passive: true });
  }
}

/* A wing is a book, and an exhibit is not one page of it but a short stack. Each block of an exhibit gets its own screen unless two are small enough to share one, and a pinned scene. */
var pageIdx = 0, turning = false, leaves = [];

function blocksOf(view) {
  var out = [];
  [].forEach.call(view.children, function (c) {
    if (c.classList.contains('wrap')) [].forEach.call(c.children, function (g) { out.push(g); });
    else out.push(c);
  });
  return out;
}

/* Things that are one exhibit piece, however tall: never split these across screens, or a chart loses its placard and a room name loses its lede. */
var UNIT = '.section-head, .exhibit, .chart-card, .sim-card, .incident-panel,' +
           '.about-grid, .tour-figure, .plant-explorer, .duo, .callout, .tiles,' +
           '.pathway, .bento, .incident-case, .fission-lab, .rk,' +
           '.seq-scene, .seq-sticky, .pin-scene, .pin-sticky, .pin-stage,' +
           'figure, table, details';

var UNIT_NARROW = '.section-head, .chart-card, .sim-card, .incident-panel,' +
                  '.about-grid, .tour-figure, .plant-explorer, .callout,' +
                  '.incident-case, .fission-lab, .rk,' +
                  '.seq-scene, .seq-sticky, .pin-scene, .pin-sticky, .pin-stage,' +
                  'figure, table, details';
/* A short laptop screen is under the same constraint as a phone: there is not enough height for a case and its label together. What matters is the room available, not whether the device is. */
function unitsFor() {
  return (window.innerWidth <= 820 || window.innerHeight < 800) ? UNIT_NARROW : UNIT;
}

/* Heights can only be read while the page is laid out, and every page but the open one is display:none. */
function buildLeaves() {
  var views = wing.rooms.map(function (id) { return document.getElementById(id); }).filter(Boolean);
  // a live sequence needs a scroll runway it will never get here
  views.forEach(function (v) {
    v.querySelectorAll('.seq-scene.is-live').forEach(function (sq) { sq.classList.remove('is-live'); });
    v.classList.add('is-page', 'is-measuring');
    v.querySelectorAll('.leaf-off').forEach(function (c) { c.classList.remove('leaf-off'); });
  });

  var room = window.innerHeight * 0.74;   // leaves headroom for margins between blocks
  var units = unitsFor();
  var open = null;
  leaves = [];

  function feed(view, el, depth) {
    // a pinned scene: the stage stays put and the beat advances
    if (el._sceneGo && el.classList.contains('is-live')) {
      for (var i = 0; i < el._sceneSteps; i++) leaves.push({ view: view, els: [el], scene: el, step: i });
      open = null;
      return;
    }
    // its written-out steps belong to the scene, and are hidden while it is live
    var prev = el.previousElementSibling;
    if (el.classList.contains('pin-steps') && prev && prev.classList.contains('is-live')) return;

    var h = el.getBoundingClientRect().height;
    if (h < 4) return;                                    // nothing to look at

    // A block taller than the screen is paged by its own parts, or the
    // reference list would be one unreadable page instead of three. Designed
    // units are never taken apart: a vitrine's placard belongs with its
    // chart, and a room name is one card, not three lines on three screens.
    if (h > room && depth < 4 && el.children.length && !el.matches(units)) {
      open = null;
      [].forEach.call(el.children, function (c) { feed(view, c, depth + 1); });
      open = null;
      return;
    }

    var alone = false;
    if (open && !alone && !open.alone && open.view === view && open.h + h <= room) {
      open.els.push(el); open.h += h;
    } else {
      open = { view: view, els: [el], scene: null, step: 0, h: h, alone: alone };
      leaves.push(open);
    }
  }

  views.forEach(function (view) {
    open = null;
    var top = [];
    [].forEach.call(view.children, function (c) {
      if (c.classList.contains('wrap')) [].forEach.call(c.children, function (g) { top.push(g); });
      else top.push(c);
    });
    var was = leaves.length;
    top.forEach(function (el) { feed(view, el, 0); });
    if (leaves.length === was) leaves.push({ view: view, els: top, scene: null, step: 0 });  // never unreachable
  });

  /* A heading is not a page. Anything that is only a heading joins what it
     introduces. */
  for (var k = leaves.length - 2; k >= 0; k--) {
    var lk = leaves[k];
    if (lk.scene || lk.els.length !== 1) continue;
    if (!/^H[1-4]$/.test(lk.els[0].tagName)) continue;
    var nx = leaves[k + 1];
    if (!nx || nx.scene || nx.view !== lk.view) continue;
    nx.els = lk.els.concat(nx.els);
    leaves.splice(k, 1);
  }

  for (var i = 0; i < leaves.length; i++) {
    var lf = leaves[i];
    if (lf.scene) continue;
    
    if (lf.els.length === 1) {
      lf.view.classList.add('leaf-solo');
      applyLeaf(lf.view, lf.els);
      var el = lf.els[0], k = 1;
      el.style.zoom = '';
      /* Step it down and look again, rather than computing a ratio once and trusting it: padding does not shrink with the object, and a figure with a fixed aspect gives back less height than the. */
      while (k > 0.84 && lf.view.scrollHeight > lf.view.clientHeight + 4) {
        k = Math.round(k * 96) / 100;
        el.style.zoom = k;
      }
      lf.fit = lf.view.scrollHeight <= lf.view.clientHeight + 4 && k < 1 ? k : 0;
      el.style.zoom = '';
      continue;
    }
    var fits = function () {
      lf.view.classList.toggle('leaf-solo', lf.els.length === 1);
      applyLeaf(lf.view, lf.els);
      return lf.view.scrollHeight <= lf.view.clientHeight + 4;
    };
    if (fits()) continue;
    var spill = [];
    while (lf.els.length > 1 && !fits()) spill.unshift(lf.els.pop());
    if (spill.length) leaves.splice(i + 1, 0, { view: lf.view, els: spill, scene: null, step: 0 });
  }

  views.forEach(function (v) {
    v.classList.remove('is-page', 'is-measuring', 'leaf-solo', 'leaf-full');
    v.querySelectorAll('.leaf-off').forEach(function (c) { c.classList.remove('leaf-off'); });
  });
  var end = document.getElementById('wing-end');
  if (end) leaves.push({ view: end, els: [], scene: null, step: 0 });
}

function applyLeaf(view, els) {
  view.querySelectorAll('.leaf-off').forEach(function (c) { c.classList.remove('leaf-off'); });
  view.querySelectorAll('.is-part').forEach(function (c) { c.classList.remove('is-part'); });
  if (!els.length) return;
  var keep = [];
  els.forEach(function (el) {
    for (var p = el; p && p !== view; p = p.parentNode) if (keep.indexOf(p) < 0) keep.push(p);
  });
  keep.forEach(function (node) {
    var parent = node.parentNode, cut = false;
    [].forEach.call(parent.children, function (c) {
      if (keep.indexOf(c) < 0) { c.classList.add('leaf-off'); cut = true; }
    });
    /* A container showing only some of its children is no longer the layout it was designed as. A two-column case with its label hidden would drop the object into the label's narrow column,. */
    if (cut && parent !== view && parent.classList) parent.classList.add('is-part');
  });
}

function showPage(i, instant) {
  if (!leaves.length) return;
  var was = leaves[pageIdx];
  pageIdx = Math.max(0, Math.min(i, leaves.length - 1));
  var lf = leaves[pageIdx];
  // one exhibit is the open page
  var seen = [];
  leaves.forEach(function (l) { if (seen.indexOf(l.view) < 0) seen.push(l.view); });
  seen.forEach(function (v) { v.classList.toggle('is-page', v === lf.view); });
  applyLeaf(lf.view, lf.els);   // and within it, one leaf
  
  var bleed = !!lf.scene ||
    (lf.els.length === 1 && lf.els[0].classList && lf.els[0].classList.contains('tour-figure'));
  lf.view.classList.toggle('leaf-full', bleed);
  lf.view.classList.toggle('leaf-solo', !bleed && lf.els.length === 1);
  if (lf.els.length === 1) lf.els[0].style.zoom = lf.fit || '';
  lf.view.scrollTop = 0;
  if (lf.view.id !== 'wing-end') {
    markPieces(lf.view);
    /* Light the whole path, not just the blocks. When a page is part of a longer list its container is the .reveal, and a container left at opacity 0 renders a page that measures full and. */
    lf.els.forEach(function (el) {
      for (var p = el; p && p !== lf.view.parentNode; p = p.parentNode) {
        if (!p.classList) continue;
        if (p.classList.contains('reveal')) p.classList.add('in');
        if (p.classList.contains('piece')) litPiece(p);
      }
      el.querySelectorAll('.reveal').forEach(function (r) { r.classList.add('in'); });
      // everything on the open page lights up, charts draw, numbers count
      el.querySelectorAll('.piece').forEach(litPiece);
    });
    htmlEl.setAttribute('data-view', lf.view.id);
  }
  
  if (lf.scene && lf.scene._measureFit) lf.scene._measureFit();
  if (lf.scene && lf.scene._sceneGo) {
    var oneBeat = was && was.scene === lf.scene && Math.abs(was.step - lf.step) === 1;
    lf.scene._sceneGo(lf.step, instant || !oneBeat);
  }

  lf.view.setAttribute('tabindex', '-1');
  if (!instant && document.activeElement !== document.body) {
    try { lf.view.focus({ preventScroll: true }); } catch (err) { lf.view.focus(); }
  }
  // where you are, counted in screens rather than exhibits
  if (wbCount) wbCount.textContent = 'Page ' + (pageIdx + 1) + ' of ' + leaves.length;
  if (window.__doseWalk) {
    window.__doseWalk(lf.view.id === 'wing-end' ? '' : lf.view.id,
                      lf.view.id === 'wing-end' ? wing.name : (BOOK_TITLES[lf.view.id] || wing.name));
    var dEl = document.getElementById('wing-end-dose');
    if (dEl && lf.view.id === 'wing-end' && window.__doseSay) dEl.textContent = window.__doseSay();
  }
  sizeWalkbar();
  markLong(lf.view);
  var say = document.getElementById('page-say');
  if (say) {
    var what = lf.view.id === 'wing-end' ? 'End of ' + wing.name
      : (BOOK_TITLES[lf.view.id] || lf.view.id);
    say.textContent = what + '. Page ' + (pageIdx + 1) + ' of ' + leaves.length + '.';
  }
  if (wbWhere) {
    var name = lf.view.id === 'wing-end' ? wing.name : (BOOK_TITLES[lf.view.id] || wing.name);
    wbWhere.textContent = wing.name + (lf.view.id === 'wing-end' ? '' : ' · ' + name);
  }
  step = wing.rooms.indexOf(lf.view.id);
  if (step < 0) step = wing.rooms.length - 1;
  // the address bar names the room, so a shared link reopens this page
  if (history.replaceState) {
    history.replaceState(null, '', '#' + wing.id +
      (lf.view.id === 'wing-end' ? '' : '/' + lf.view.id));
  }
}

/* Two fixed elements share the bottom edge on a phone. The bar measures itself so the badge can sit exactly on top of it. */
function sizeWalkbar() {
  var bar = document.getElementById('walkbar');
  if (!bar || bar.hidden) return;
  document.documentElement.style.setProperty('--walkbar-h', bar.offsetHeight + 'px');
}
window.addEventListener('resize', sizeWalkbar);

function markLong(view) {
  var bar = document.getElementById('walkbar');
  if (!bar) return;
  var show = function () {
    var room = view.scrollHeight - view.clientHeight;
    // a stray pixel or two is not "more on this page"
    bar.classList.toggle('is-long', room > 28 && view.scrollTop < room - 8);
  };
  show();
  // fonts, charts and canvases settle a frame or two after the page opens,
  // and the first measurement is taken before they do
  requestAnimationFrame(show);
  setTimeout(show, 400);
  if (!view._longWatch) {
    view._longWatch = 1;
    view.addEventListener('scroll', show, { passive: true });
  }
}

/* Turn the page: a leaf sweeps across, and the next screen is beneath it. */
function turnPage(dir) {
  if (turning) return;
  var next = pageIdx + dir;
  if (next < 0 || next >= leaves.length) return;
  var stage = document.getElementById('pageflip');
  if (REDUCE || !HAS_GSAP || !stage) { showPage(next); return; }

  // page: let the camera carry it rather than throwing a sheet over it
  var here = leaves[pageIdx], there = leaves[next];
  if (here.scene && there.scene === here.scene) { showPage(next); return; }
  var sheet = document.getElementById('pf-sheet'),
      front = document.getElementById('pf-front'),
      shade = document.getElementById('pf-shade');
  turning = true;

  /* Photograph the page you are leaving and put it on the front of the sheet. A clone is the only way to have the old page and the new one on screen at once, because most turns move between. */
  front.innerHTML = '';
  var snap = leaves[pageIdx].view.cloneNode(true);
  snap.removeAttribute('id');
  snap.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
  // media does not survive a clone, and a second copy would fight for bandwidth
  snap.querySelectorAll('video, iframe').forEach(function (n) { n.remove(); });
  // a cloned canvas comes back blank, so the picture is copied across
  var src = leaves[pageIdx].view.querySelectorAll('canvas'),
      dst = snap.querySelectorAll('canvas');
  for (var c = 0; c < dst.length; c++) {
    if (!src[c] || !src[c].width) continue;
    dst[c].width = src[c].width; dst[c].height = src[c].height;
    try { dst[c].getContext('2d').drawImage(src[c], 0, 0); } catch (err) { /* tainted; leave it */ }
  }
  front.appendChild(snap);
  stage.classList.add('is-on');

  // forward, the sheet lifts off the screen and turns to the left; back, it
  // comes in from the left and lands flat
  var from = dir > 0 ? 0 : -180, to = dir > 0 ? -180 : 0;
  gsap.set(sheet, { rotateY: from, transformOrigin: 'left center' });
  gsap.set(shade, { opacity: 0 });
  gsap.set(front, { '--sh': 0 });

  gsap.timeline({
    onComplete: function () {
      stage.classList.remove('is-on');
      front.innerHTML = '';
      turning = false;
    }
  })
    // the new page is already there, under the sheet, from the first frame
    .add(function () { showPage(next); }, 0)
    .to(shade, { opacity: 0.8, duration: 0.34, ease: 'power1.in' }, 0.1)
    .to(sheet, { rotateY: to, duration: 0.66, ease: 'power2.in' }, 0)
    .to(front, { '--sh': 0.7, duration: 0.34, ease: 'power1.in' }, 0.08)
    .to(shade, { opacity: 0, duration: 0.3, ease: 'power1.out' }, 0.38);
}

/* Lay the wing out and open it at the chosen exhibit. */
function showExhibit() {
  bindWalkbar();
  var rooms = wing.rooms;
  step = Math.max(0, Math.min(step, rooms.length - 1));
  document.querySelectorAll('.view.in-wing').forEach(function (v) { v.classList.remove('in-wing', 'is-page'); });
  rooms.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('in-wing');
  });
  var end = document.getElementById('wing-end');
  if (end) {
    end.hidden = false;
    end.classList.remove('is-page');
    var last = document.getElementById(rooms[rooms.length - 1]);
    if (last && last.parentNode) last.parentNode.insertBefore(end, last.nextSibling);
    var t = document.getElementById('wing-end-title');
    if (t) t.textContent = 'That is ' + wing.name + '.';
    
    var seenEl = document.getElementById('wing-end-seen');
    if (seenEl) {
      var titles = rooms.map(function (id) { return BOOK_TITLES[id] || id; });
      seenEl.textContent = titles.length === 1
        ? 'One volume: ' + titles[0] + '.'
        : titles.length + ' volumes: ' + titles.slice(0, -1).join(', ') + ', and ' + titles[titles.length - 1] + '.';
    }
    var out = document.getElementById('wing-end-lobby');
    if (out && !out._bound) {
      out._bound = 1;
      out.addEventListener('click', function () { screenTo('lobby'); });
    }
  }
  if (history.replaceState) history.replaceState(null, '', '#' + wing.id);
  /* The numbered references belong to the Sources exhibit. Move the footer inside it once, so the pager treats it as that exhibit's last blocks rather than page furniture that nothing can reach. */
  var about = document.getElementById('about'), foot = document.getElementById('sources');
  if (about && foot && !about.contains(foot)) {
    (about.querySelector('.wrap') || about).appendChild(foot);
    
    var n = 0;
    foot.querySelectorAll('.ref-list > li').forEach(function (li) { li.value = ++n; });
  }
  buildLeaves();
  
  rooms.forEach(function (id) {
    var v = document.getElementById(id);
    if (!v) return;
    v.querySelectorAll('.pin-scene').forEach(function (sc) {
      if (sc._sceneGo) sc._sceneGo(0, true);
    });
  });
  // open at the first screen of the exhibit that was asked for
  var want = rooms[step], at = 0;
  for (var i = 0; i < leaves.length; i++) { if (leaves[i].view.id === want) { at = i; break; } }
  showPage(at, true);
}

/* the wheel, arrow keys and touch all turn pages */
(function () {
  
  var acc = 0, lastWheel = 0, lockUntil = 0;
  /* STEP is the distance a trackpad has to glide to turn a page. A mouse wheel does not glide: it arrives in discrete notches of about 100 to 120, or in `deltaMode` lines, and one notch is. */
  var STEP = 240, NOTCH = 100, GESTURE_GAP = 1500, LOCK = 820, QUIET = 180, LOCK_MAX = 1150;
  var lockFrom = 0;

  function atEdge(dy) {
    var pg = document.querySelector('.view.in-wing.is-page, .wing-end.is-page');
    if (!pg) return true;
    var room = pg.scrollHeight - pg.clientHeight;
    if (room <= 4) return true;
    return dy > 0 ? pg.scrollTop >= room - 2 : pg.scrollTop <= 2;
  }
  window.addEventListener('wheel', function (e) {
    if (body.getAttribute('data-screen') !== 'wing') return;
    var now = Date.now();
    if (now - lastWheel > GESTURE_GAP) acc = 0;   // a long pause starts the count over
    lastWheel = now;
    
    if (turning || now < lockUntil) {
      acc = 0;
      // hold until the wheel is quiet, but never past LOCK_MAX from the turn:
      // otherwise carrying on scrolling keeps the lock alive indefinitely
      lockUntil = Math.min(lockFrom + LOCK_MAX, Math.max(lockUntil, now + QUIET));
      return;
    }
    if (!atEdge(e.deltaY)) { acc = 0; return; }
    var notched = e.deltaMode !== 0 || Math.abs(e.deltaY) >= NOTCH;
    acc += e.deltaY;
    if (!notched && Math.abs(acc) < STEP) return;
    var dir = (notched ? e.deltaY : acc) > 0 ? 1 : -1;
    acc = 0; lockFrom = now; lockUntil = now + LOCK;
    turnPage(dir);
  }, { passive: true });
  window.addEventListener('keydown', function (e) {
    if (body.getAttribute('data-screen') !== 'wing') return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    // left/right always turn; up/down read a tall page first, then turn
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); turnPage(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); turnPage(-1); }
    else if (e.key === 'ArrowDown' && atEdge(1)) { e.preventDefault(); turnPage(1); }
    else if (e.key === 'ArrowUp' && atEdge(-1)) { e.preventDefault(); turnPage(-1); }
    else if (e.key === 'Escape') { e.preventDefault(); screenTo('lobby'); }
  });
  var ty = null;
  window.addEventListener('touchstart', function (e) { ty = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchend', function (e) {
    if (body.getAttribute('data-screen') !== 'wing' || ty === null) return;
    var dy = ty - (e.changedTouches[0] ? e.changedTouches[0].clientY : ty);
    if (Math.abs(dy) > 70 && atEdge(dy) && Date.now() > lockUntil) {
      lockUntil = Date.now() + LOCK;
      turnPage(dy > 0 ? 1 : -1);
    }
    ty = null;
  }, { passive: true });
})();

function enterWing(id, atStep) {
  var w = wingById(id);
  if (!w) return;
  wing = w; step = atStep || 0;
  screenTo('wing');
  showExhibit();
}

/* ---- build the library: a shelf per wing, a book per exhibit ---- */
// Titles for the spines. Falls back to the exhibit's own heading if missing.

/* Stamp each room with its own address so the section head, the walkbar and
   the shelf can never disagree about where the visitor is. */
WINGS.forEach(function (w) {
  w.rooms.forEach(function (id) {
    var sec = document.getElementById(id);
    var ov = sec && sec.querySelector('.section-head .overline');
    if (ov) ov.setAttribute('data-room', w.name + ' \u00b7 ' + (BOOK_TITLES[id] || ''));
  });
});

window.__DOSE_ROOMS = WINGS.reduce(function (n, w) { return n + w.rooms.length; }, 0);


function dyeLot(hex, k, cast) {
  var n = parseInt(hex.slice(1), 16);
  var bias = [1 + (cast || 0) * 0.07, 1, 1 - (cast || 0) * 0.09];   // R, G, B
  var ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v, j) {
    return Math.max(0, Math.min(255, Math.round(v * k * bias[j])));
  });
  return '#' + ch.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('');
}



/* The three volumes that are instruments rather than reading. A visitor
   should be able to see from the shelf that this is not only a report. */

function bookTitle(id) {
  if (BOOK_TITLES[id]) return BOOK_TITLES[id];
  var el = document.getElementById(id);
  var h = el && el.querySelector('h2');
  return h ? h.textContent.trim() : id;
}

var shelvesEl = document.getElementById('shelves');
if (shelvesEl) {
  WINGS.forEach(function (w, wi) {
    var shelf = document.createElement('section');
    shelf.className = 'shelf';
    var count = w.rooms.length;
    shelf.style.setProperty('--wing', dyeLot(WING_CLOTH[w.id] || '#6E6653', 1.55));
    shelf.innerHTML =
      '<div class="shelf__label"><span class="shelf__n">' + w.n + '</span>' + w.name +
      '<span class="shelf__of">' + count + (count === 1 ? ' volume' : ' volumes') + '</span></div>' +
      '<div class="shelf__board"></div>';
    var board = shelf.querySelector('.shelf__board');
    w.rooms.forEach(function (id, i) {
      var b = document.createElement('button');
      b.type = 'button';
      var t = bookTitle(id);
      // by position, not by title length: two titles of similar length used to
      // land on the same variant and the volumes read as one book twice
      var hVar = i % 3;
      var wVar = (i * 3 + wi) % 4;
      b.className = 'book'
        + (hVar === 0 ? ' book--tall' : hVar === 2 ? ' book--short' : '')
        + (wVar === 0 ? ' book--wide' : wVar === 3 ? ' book--thin' : '');
      var cloth = WING_CLOTH[w.id] || '#6E6653';
      b.style.setProperty('--book', dyeLot(cloth, LOTS[i % LOTS.length], CASTS[i % CASTS.length]));
      if (OPERABLE[id]) b.classList.add('book--live');
      b.setAttribute('aria-label', 'Open ' + bookTitle(id) + ', in ' + w.name
        + (OPERABLE[id] ? '. An interactive model you can operate.' : ''));
      b.innerHTML = '<span class="book__spine">' + t + '</span>'
        + (BOOK_MARKS[id]
            ? '<svg class="book__mark" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
              + ' stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"'
              + ' aria-hidden="true">' + BOOK_MARKS[id] + '</svg>'
            : '');
      b.addEventListener('click', function () { openBook(b, w.id, i, t); });
      board.appendChild(b);
    });
    shelvesEl.appendChild(shelf);
  });
}

var RIFFLE = 6, riffled = null;
function riffleLeaves() {
  if (riffled) return riffled;
  var first = document.getElementById('bo-leaf');
  if (!first) return [];
  for (var i = 1; i < RIFFLE; i++) {
    var c = first.cloneNode(true);
    c.id = 'bo-leaf-' + i;
    first.parentNode.insertBefore(c, first);   // earlier in the DOM = deeper in the stack
  }
  riffled = [].slice.call(document.querySelectorAll('.bo__leaf')).reverse();
  return riffled;
}

function openBook(bookEl, wingId, atStep, title) {
  var stage = document.getElementById('bookopen');
  if (REDUCE || !HAS_GSAP || !stage) { enterWing(wingId, atStep); return; }
  stage.classList.add('is-on');           // laid out before it is measured
  var book  = document.getElementById('bo-book'),
      left  = document.getElementById('bo-left'),
      leaf  = riffleLeaves(),
      ttl   = document.getElementById('bo-title'),
      ctl   = document.getElementById('bo-ctitle'),
      wng   = document.getElementById('bo-wing'),
      flood = document.getElementById('bo-flood'),
      scrim = document.getElementById('bo-scrim'),
      edges = [document.getElementById('bo-edge-l'), document.getElementById('bo-edge-r')].filter(Boolean),
      gutter = document.getElementById('bo-gutter');

  stage.style.setProperty('--book', getComputedStyle(bookEl).getPropertyValue('--book') || '#6E6653');
  if (ttl) ttl.textContent = title || '';
  if (ctl) ctl.textContent = title || '';
  var wg = wingById(wingId);
  if (wng && wg) wng.innerHTML = wg.n + '<b>' + wg.name + '</b>';

  var q = book.offsetWidth / 4;
  var r = bookEl.getBoundingClientRect();
  var fromX = (r.left + r.width / 2 - window.innerWidth / 2) - q;
  var fromY = r.top + r.height / 2 - window.innerHeight / 2;

  gsap.set(book, { x: fromX, y: fromY, scale: 0.1, rotateY: 26, rotateX: 0, transformOrigin: '50% 50%', opacity: 1 });
  gsap.set(edges.concat(gutter ? [gutter] : []), { opacity: 0 });
  gsap.set(left, { rotateY: 180, z: 6 });   // shut: folded over the right half, cover out
  // the block of pages sits on the right, front sheet nearest you
  leaf.forEach(function (lf, i) { gsap.set(lf, { rotateY: 0, z: 3 - i * 0.35, opacity: 0 }); });
  gsap.set([ttl, flood, scrim], { opacity: 0 });

  gsap.timeline({
    onComplete: function () {
      enterWing(wingId, atStep);
      stage.classList.remove('is-on');
      gsap.set([book, left, ttl, flood, scrim, gutter].concat(leaf, edges), { clearProps: 'all' });
    }
  })
    // 1. off the shelf, still shut, turning to face you
    .to(scrim, { opacity: 0.95, duration: 0.38, ease: 'power1.out' }, 0)
    .to(book, { x: -q, y: 0, scale: 1, duration: 0.55, ease: 'power3.out' }, 0)
    // 2. both covers swing apart and the spread settles flat and centred
    .set(leaf, { opacity: 1 }, 0.42)
    .to(left, { rotateY: 0, z: 0, duration: 0.7, ease: 'power2.inOut' }, 0.42)

    .to(book, { x: 0, rotateY: 0, rotateX: 9, duration: 0.7, ease: 'power2.inOut' }, 0.42)
    // and settles, because paper and board have weight
    .to(book, { rotateX: 6.4, duration: 0.26, ease: 'power2.out' }, 1.12)
    .to(edges, { opacity: 1, duration: 0.4, ease: 'power1.out' }, 0.72)
    .to(gutter, { opacity: 1, duration: 0.45, ease: 'power1.out' }, 0.66)
    // 3. it riffles: the sheets go over in quick succession, about a second
    //    of pages, and the last one uncovers the page you were looking for
    
    .to(leaf, {
      keyframes: [
        { rotateY: -88, filter: 'brightness(0.74)', duration: 0.27, ease: 'power1.in' },
        { rotateY: -172, filter: 'brightness(1)', duration: 0.31, ease: 'power2.out' }
      ],
      rotateZ: function (i) { return i % 2 ? 0.9 : -0.7; },
      stagger: { each: 0.085, from: 'start' }
    }, 1.05)
    // 4. what the last sheet uncovers is the exhibit, and the camera goes in
    .to(ttl, { opacity: 1, duration: 0.4, ease: 'power1.out' }, 1.86)
    .set(book, { transformOrigin: '75% 50%' }, 2.24)

    // reading a page
    .to(book, { scale: 8, rotateX: 0, duration: 0.6, ease: 'power2.in' }, 2.26)
    .to(edges.concat(gutter ? [gutter] : []), { opacity: 0, duration: 0.3 }, 2.3)
    .to(flood, { opacity: 1, duration: 0.48, ease: 'power2.in' }, 2.4);
}

(function () {
  var title = document.getElementById('screen-title');
  if (!title) return;
  var inner = title.querySelector('.entry__inner');
  var acc = 0, busy = false;

  function walkIn() {
    if (busy) return;
    busy = true;
    var finish = function () {
      screenTo('lobby');
      if (inner) { inner.style.transform = ''; inner.style.opacity = ''; inner.style.filter = ''; }
      acc = 0; busy = false;
    };
    if (inner && !REDUCE && HAS_GSAP) {
      gsap.to(inner, { scale: 1.7, opacity: 0, filter: 'blur(7px)', duration: 0.8,
                       ease: 'power2.in', onComplete: finish });
    } else { finish(); }
  }

  window.addEventListener('wheel', function (e) {
    if (document.body.getAttribute('data-screen') !== 'title' || busy) return;
    if (e.deltaY <= 0) { acc = Math.max(0, acc + e.deltaY); return; }
    acc += e.deltaY;
    if (inner && !REDUCE) {
      var p = Math.min(acc / 260, 1);
      inner.style.transform = 'scale(' + (1 + p * 0.12) + ')';
      inner.style.opacity = String(1 - p * 0.35);
    }
    if (acc > 260) walkIn();
  }, { passive: true });

  var y0 = null;
  window.addEventListener('touchstart', function (e) { y0 = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    if (document.body.getAttribute('data-screen') !== 'title' || y0 === null) return;
    if (y0 - e.touches[0].clientY > 90) { y0 = null; walkIn(); }
  }, { passive: true });

  window.addEventListener('keydown', function (e) {
    if (document.body.getAttribute('data-screen') !== 'title') return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); walkIn(); }
  });
})();

var goLobby = document.getElementById('go-lobby');
if (goLobby) goLobby.addEventListener('click', function () { screenTo('lobby'); });

// page: the entrance is #screen-title, and a screen change is not a hash jump
var backIn = document.getElementById('back-to-entrance');
if (backIn) backIn.addEventListener('click', function (e) { e.preventDefault(); screenTo('title'); });

/* any in-page link to a room jumps into whichever wing holds it */
document.addEventListener('click', function (e) {
  var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
  if (!a) return;
  var id = a.getAttribute('href').slice(1);
  if (!id) return;
  for (var i = 0; i < WINGS.length; i++) {
    var k = WINGS[i].rooms.indexOf(id);
    if (k !== -1) { e.preventDefault(); enterWing(WINGS[i].id, k); return; }
  }
});

/* Deep links. Accepts every shape the site itself produces: #wing/room from
   the pager, a bare #wing, #lobby, and a bare #room because that is what the
   nav rail and the hero index write. Anything else opens at the doors. */
(function () {
  var h = '';
  try { h = decodeURIComponent((location.hash || '').slice(1)); }
  catch (e) { h = (location.hash || '').slice(1); }
  if (!h) { screenTo('title'); return; }
  if (h === 'lobby') { screenTo('lobby'); return; }

  var wingId = h, roomId = '';
  if (h.indexOf('/') !== -1) { var parts = h.split('/'); wingId = parts[0]; roomId = parts[1]; }
  var w = wingById(wingId);
  if (w) {
    var k = roomId ? w.rooms.indexOf(roomId) : 0;
    enterWing(w.id, k === -1 ? 0 : k); return;
  }
  for (var i = 0; i < WINGS.length; i++) {
    var j = WINGS[i].rooms.indexOf(h);
    if (j !== -1) { enterWing(WINGS[i].id, j); return; }
  }
  screenTo('title');
})();

var navRail = document.querySelector('.nav__links');
if (navRail) {
  var syncRail = function () {
    var overflowing = navRail.scrollWidth - navRail.clientWidth > 1;
    navRail.classList.toggle('is-overflowing', overflowing);
    var atEnd = navRail.scrollLeft + navRail.clientWidth >= navRail.scrollWidth - 2;
    navRail.classList.toggle('at-end', atEnd);
  };
  
  var pending = null, settle = null;
  var syncSoon = function () {
    if (pending) cancelAnimationFrame(pending);
    pending = requestAnimationFrame(function () { pending = null; syncRail(); });
    
    clearTimeout(settle);
    settle = setTimeout(syncRail, 150);
  };
  syncRail();
  navRail.addEventListener('scroll', syncRail, { passive: true }); // no reflow
  window.addEventListener('resize', syncSoon);
  window.addEventListener('load', syncSoon); // re-measure once webfonts settle
  /* Also observe the rail directly: it can change size without a window resize (webfonts landing, browser zoom). */
  if (window.ResizeObserver) new ResizeObserver(syncSoon).observe(navRail);
}
