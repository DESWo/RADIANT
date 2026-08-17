/* Exhibit wiring: the interactive rooms, each one plain DOM against markup
   that already exists in index.html.

   The two original models live in reactor-model.js and grid-model.js; what is
   here is only the canvas, the sliders and the readouts. Everything binds by
   id and initialises once, because a room is re-entered every time a visitor
   walks back into its wing. */

import { REDUCE, HAS_GSAP, HAS_DRAW, whenVisible } from './env.js';
import { INCIDENTS } from '../data/incidents.js';
import { FALLBACK_NEWS, FALLBACK_DATE } from '../data/news.js';
import { CAREERS } from '../data/careers.js';
import { createReactor, BETA, T_IN, T_REF, SCRAM_RHO, PCM } from './reactor-model.js';

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

/* The standard tabs pattern: one tab stop for the set, arrows move within
   it, and the panel names its tab so a screen reader hears the incident. */
function selectIncident(i, focus) {
  var tabs = tabsEl.querySelectorAll('.tab');
  tabs.forEach(function (tab, j) {
    tab.setAttribute('aria-selected', String(j === i));
    tab.tabIndex = j === i ? 0 : -1;
  });
  panelEl.setAttribute('aria-labelledby', 'incident-tab-' + i);
  renderIncident(INCIDENTS[i]);
  if (focus) tabs[i].focus();
}

INCIDENTS.forEach(function (inc, i) {
  var tab = document.createElement('button');
  tab.className = 'tab';
  tab.id = 'incident-tab-' + i;
  tab.setAttribute('role', 'tab');
  tab.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
  tab.setAttribute('aria-controls', 'incident-panel');
  tab.tabIndex = i === 0 ? 0 : -1;
  var strong = document.createElement('span');
  strong.textContent = inc.name;
  var small = document.createElement('small');
  small.textContent = inc.year + ' · ' + inc.location;
  tab.appendChild(strong); tab.appendChild(small);
  tab.addEventListener('click', function () { selectIncident(i); });
  tabsEl.appendChild(tab);
});
tabsEl.addEventListener('keydown', function (e) {
  var tabs = tabsEl.querySelectorAll('.tab');
  var at = [].indexOf.call(tabs, document.activeElement);
  if (at < 0) return;
  var to = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (at + 1) % tabs.length
         : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (at - 1 + tabs.length) % tabs.length
         : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1;
  if (to < 0) return;
  e.preventDefault();
  selectIncident(to, true);
});
selectIncident(0);

/* ============ NEWS CARDS ============ */
// The room renders the baked-in snapshot first, then upgrades to news.json if
// the fetch succeeds. If it does not, the snapshot stays up and the note under
// the grid says so, dated — stale headlines are never passed off as live.
var newsGrid = document.getElementById('news-grid');
function renderNews(items) {
  while (newsGrid.firstChild) newsGrid.removeChild(newsGrid.firstChild);
  items.forEach(function (n) {
    // Feed content is third-party; never let it name a URL scheme.
    if (!/^https?:\/\//.test(n.url || '')) return;
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
function noteNews(text) {
  var upd = document.getElementById('news-updated');
  if (upd) upd.textContent = text;
}
renderNews(FALLBACK_NEWS);
fetch('news.json', { cache: 'no-store' })
  .then(function (r) { if (!r.ok) throw new Error('no news.json'); return r.json(); })
  .then(function (d) {
    if (!d || !Array.isArray(d.items) || !d.items.length) throw new Error('empty news.json');
    renderNews(d.items);
    var when = d.generated_at && new Date(d.generated_at);
    noteNews(when && !isNaN(when)
      ? 'Headlines refresh automatically several times a day. Last updated '
        + when.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + '.'
      : 'Headlines refresh automatically several times a day.');
    /* A deep link into the Frontier wing paginates before this fetch settles,
       so the pager may be holding the fallback cards this render just
       detached. The pager owns that state, so tell it to re-measure. */
    document.dispatchEvent(new CustomEvent('radiant:content-replaced', { detail: { room: 'news' } }));
  })
  .catch(function () {
    noteNews('Live headlines are unavailable right now; showing the saved set from ' + FALLBACK_DATE + '.');
  });

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


/* ============ ACCORDION BEHAVIOR (myths + careers) ============ */
/* The panel collapses visually via grid-template-rows, which leaves its
   contents in the reading order and the tab order; inert removes them so a
   closed accordion reads closed. */
document.querySelectorAll('.acc-head').forEach(function (head, i) {
  var acc = head.closest('.acc');
  var panel = acc && acc.querySelector('.acc-panel');
  if (panel) {
    if (!panel.id) panel.id = 'acc-panel-' + i;
    head.setAttribute('aria-controls', panel.id);
    panel.inert = true;
  }
  head.addEventListener('click', function () {
    var open = acc.classList.toggle('open');
    head.setAttribute('aria-expanded', String(open));
    if (panel) panel.inert = !open;
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

/* DOSIMETER (signature instrument) */
(function () {
  var el = document.getElementById('dosimeter');
  var valEl = document.getElementById('dose-val');
  var hallEl = document.getElementById('dose-hall');
  if (!el || !valEl) return;
  /* 0.040 mSv for the whole building — about one New York to Los Angeles
     round-trip by air. Accrued per room visited, so the badge tracks the
     walk itself rather than a scrollbar position. */
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
  /* 0.040 mSv is a number almost nobody can size. Say what it is worth. */
  window.__doseSay = function () {
    var mSv = DOSE_FULL * frac();
    var pct = Math.round(frac() * 100);
    if (!pct) return '';
    return 'You have taken ' + mSv.toFixed(3) + ' mSv walking this museum: about '
      + pct + '% of one New York to Los Angeles round-trip by air.';
  };
  /* The pager calls this on every page it opens. A room you have already
     stood in adds nothing, which is what makes the badge mean anything. */
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

  /* Backing store scaled to the device so the trace stays sharp on high-DPI
     screens; drawing code works in CSS pixels via the transform. Falls back
     to the markup's 900x280 while the room is hidden and measures 0. */
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var CW = 900, CH = 280;
  function sizeCanvas() {
    var w = cv.clientWidth;
    if (!w) return;
    CW = w; CH = Math.round(w * 280 / 900);
    cv.width = Math.round(CW * DPR); cv.height = Math.round(CH * DPR);
    cv.style.height = CH + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', sizeCanvas);

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
    // A scram inserts more worth than the slider's bottom stop, so show the
    // reactivity actually applied rather than the slider's resting position.
    out.rod.textContent = core.scrammed ? Math.round(SCRAM_RHO / PCM) : S.rod;
    var per = r.period;
    out.per.textContent = !isFinite(per) ? '∞' : Math.abs(per) > 999 ? '∞'
      : Math.abs(per) < 1 ? per.toPrecision(2) : per.toFixed(1);

    // Prompt critical is rho >= beta by definition; the model's 0.97*beta
    // threshold is only its internal integrator switch.
    var st = 'Critical', tag = '';
    if (core.scrammed) { st = 'Scrammed'; tag = 'scram'; }
    else if (r.rho >= BETA) { st = 'Prompt critical'; tag = 'prompt'; }
    else if (r.rho > 2e-5) st = 'Supercritical';
    else if (r.rho < -2e-5) { st = 'Subcritical'; tag = 'sub'; }
    out.state.textContent = st; out.state.setAttribute('data-s', tag);

    var w = Math.min(Math.abs(pRho) / 1000, 1) * 50;
    out.bar.style.left = pRho >= 0 ? '50%' : (50 - w) + '%';
    out.bar.style.width = w + '%';
    out.beta.style.left = (50 + 650 / 1000 * 50) + '%';

    // The message that teaches the exhibit. It is a polite live region, so
    // write it only when it actually changes: paint() runs every frame, and
    // an unguarded write would queue a screen-reader announcement 60x/s.
    var msg;
    if (core.scrammed) msg = 'Rods in: the reaction collapses to its delayed-neutron tail in seconds. A real core would still make decay heat, which this model omits.';
    else if (r.rho >= BETA && S.n > 1.5)
      msg = 'Prompt critical — and the fuel, not the operator, is what pulls it back.';
    else if (S.n > 1.6 && r.dopRho < -1e-4)
      msg = 'Fuel is hot: Doppler feedback is pushing back and levelling the power.';
    else if (Math.abs(pRho) < 5 && Math.abs(S.n - 1) < 0.08) msg = 'Steady. Reactivity balanced at zero.';
    else msg = '';
    if (msg !== paint._msg) { paint._msg = msg; out.live.textContent = msg; }
  }

  function draw() {
    var W = CW, H = CH;
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
  function start() { if (running) return; running = true; last = 0; sizeCanvas(); raf = requestAnimationFrame(tick); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.isIntersecting ? start() : stop(); });
    }, { threshold: 0.15 }).observe(host);
  } else start();
})();

/* ============ COUNT-UP NUMBERS ============ */
var counters = document.querySelectorAll('[data-count]');
/* Exported because the pager lights a page's numbers directly when it opens
   the leaf: the IntersectionObserver path alone cannot see an element that
   was display:none until the moment the page turned. */
export function runCount(el) {
  // Both arrival systems (whenVisible and the pager's litPiece) can reach the
  // same element; the guard lives here so it can never animate twice at once.
  if (el._counted) return;
  el._counted = 1;
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

/* ============ PLANT EXPLORER (click a part of the diagram) ============ */
(function () {
  var svg = document.getElementById('plant-svg');
  if (!svg) return;
  var tabs = [].slice.call(document.querySelectorAll('.ptab'));
  var steps = [].slice.call(document.querySelectorAll('.pstep-list li'));
  var titleEl = document.querySelector('.pd-title');
  var textEl = document.querySelector('.pd-text');
  var nEl = document.querySelector('.pd-n');

  function select(n, focus) {
    n = Math.max(1, Math.min(n, steps.length || 6));
    svg.setAttribute('data-active', n);
    tabs.forEach(function (t) {
      var on = parseInt(t.dataset.part, 10) === n;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    var panel = document.getElementById('plant-detail');
    if (panel) panel.setAttribute('aria-labelledby', 'ptab-' + n);
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
  var tablist = document.getElementById('plant-tablist');
  if (tablist) tablist.addEventListener('keydown', function (e) {
    var at = tabs.indexOf(document.activeElement);
    if (at < 0) return;
    var to = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (at + 1) % tabs.length
           : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (at - 1 + tabs.length) % tabs.length
           : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1;
    if (to < 0) return;
    e.preventDefault();
    select(to + 1, true);
  });
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
    // While the lab's page is closed the canvas is display:none and measures
    // 0; sizing from a guessed width would bake in the wrong aspect until the
    // next resize. Bail, and re-measure when the exhibit comes on screen.
    var w = cv.clientWidth;
    if (!w) return;
    var h = Math.round(Math.max(220, Math.min(w * 0.62, 340)));
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
  function fire() {
    var t = randomUnspent(null);
    if (t) fission(t);
    // under reduced motion the whole cascade resolves synchronously, so the
    // stats must be read after it, not before
    if (REDUCE) { runStatic(); draw(); }
    updateStats();
  }

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
  /* One debounced sentence for screen readers; announcing every slider tick
     or every frame's counters would flood the queue. */
  var say = document.getElementById('fz-say'), sayT = null;
  function announce() {
    if (!say || !W) return;   // W is 0 until the exhibit has been on screen
    clearTimeout(sayT);
    sayT = setTimeout(function () {
      say.textContent = 'k = ' + kValue().toFixed(1) + ': ' + stateEl.textContent + '. '
        + fissions + ' splits, ' + neutrons.length + ' free neutrons.';
    }, 700);
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
    announce();
  }

  /* Only run while on screen, like the reactor above: the counters update
     from the frame loop so the Splits readout ticks during a cascade. */
  var raf = null, running = false;
  function loop() {
    stepOnce(); draw();
    fissEl.textContent = fissions;
    neuEl.textContent = neutrons.length;
    raf = requestAnimationFrame(loop);
  }
  function start() {
    if (!W || cv.clientWidth !== W) { size(); draw(); }
    if (REDUCE || running) return;
    running = true; raf = requestAnimationFrame(loop);
  }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

  rodEl.addEventListener('input', updateStats);
  document.getElementById('fz-fire').addEventListener('click', fire);
  document.getElementById('fz-reset').addEventListener('click', function () { neutrons = []; fissions = 0; layout(); updateStats(); draw(); });
  window.addEventListener('resize', function () { size(); draw(); });

  size(); updateStats(); draw();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.isIntersecting ? start() : stop(); });
    }, { threshold: 0.15 }).observe(cv);
  } else start();
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

