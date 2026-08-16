/* RADIANT — museum runtime.
   Loaded as a module, so it is deferred and runs after the document is parsed.
   GSAP and Lenis are vendored classic scripts loaded before this one; they are
   read off `window` rather than imported. */

import { CHARTS } from '../data/charts.js';
import { SOURCES, DEMAND, balance, solve } from './grid-model.js';
import { WINGS, BOOK_TITLES, WING_CLOTH, LOTS, CASTS, BOOK_MARKS, OPERABLE } from '../data/wings.js';

import { REDUCE, HAS_GSAP, HAS_DRAW, whenVisible, sweepVisible } from './env.js';
import './charts.js';
import './exhibits.js';
import './scenes.js';

'use strict';
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
