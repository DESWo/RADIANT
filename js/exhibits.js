/* Exhibit wiring: the interactive rooms, each one plain DOM against markup
   that already exists in index.html.

   The two original models live in reactor-model.js and grid-model.js; what is
   here is only the canvas, the sliders and the readouts. Everything binds by
   id and initialises once, because a room is re-entered every time a visitor
   walks back into its wing. */

import { REDUCE, HAS_GSAP, HAS_DRAW, whenVisible } from './env.js';
import { INCIDENTS } from '../data/incidents.js';
import { FALLBACK_NEWS } from '../data/news.js';
import { CAREERS } from '../data/careers.js';
import { createReactor, BETA, T_IN, T_REF } from './reactor-model.js';

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

