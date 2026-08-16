/* The bar charts. One renderer for every dataset in data/charts.js: the
   nuclear bar is marked so it can be highlighted, values print beside their
   units, and each chart has a table view for the same numbers. */

import { whenVisible } from './env.js';
import { CHARTS } from '../data/charts.js';


Object.keys(CHARTS).forEach(function (key) {
  var cfg = CHARTS[key];
  var chartWrap = document.getElementById(key + '-chart');
  if (!chartWrap) return;
  var plot = chartWrap.querySelector('.chart-plot');
  var rows = chartWrap.querySelector('.chart-rows');
  var tip = chartWrap.querySelector('.chart-tip');
  var max = Math.max.apply(null, cfg.data.map(function (d) { return d.v; }));

  cfg.data.forEach(function (d) {
    var row = document.createElement('div');
    row.className = 'crow' + (d.hero ? ' crow--hero' : '');
    row.tabIndex = 0;
    row.style.setProperty('--label-w', cfg.labelW);

    var label = document.createElement('div');
    label.className = 'crow__label';
    label.appendChild(document.createTextNode(d.name));
    if (d.cat) {
      var cat = document.createElement('span');
      cat.className = 'cat';
      cat.textContent = d.cat;
      label.appendChild(cat);
    }

    var track = document.createElement('div');
    track.className = 'crow__track';
    var bar = document.createElement('div');
    bar.className = 'crow__bar';
    // linear scale at 86% of track so tip labels fit; 0.5% floor keeps
    // the smallest bars visible; their tininess IS the story
    bar.dataset.w = Math.max((d.v / max) * 86, 0.5);
    var val = document.createElement('span');
    val.className = 'crow__val';
    val.textContent = cfg.fmt(d.v);
    track.appendChild(bar);
    track.appendChild(val);

    row.appendChild(label);
    row.appendChild(track);
    row.setAttribute('aria-label', d.name + ': ' + cfg.fmt(d.v) + ' ' + cfg.unit + (d.note ? ', ' + d.note : ''));
    rows.appendChild(row);

    function showTip(clientX, clientY) {
      while (tip.firstChild) tip.removeChild(tip.firstChild);
      var strong = document.createElement('strong');
      strong.textContent = cfg.fmt(d.v) + ' ' + cfg.unit;
      var name = document.createElement('span');
      name.className = 'tipname';
      name.textContent = d.name + (d.note ? ' · ' + d.note : '');
      tip.appendChild(strong);
      tip.appendChild(name);
      tip.style.display = 'block';
      var pr = plot.getBoundingClientRect();
      var x = clientX - pr.left + 14;
      var y = clientY - pr.top - 10;
      if (x + tip.offsetWidth > pr.width - 4) x = pr.width - tip.offsetWidth - 4;
      tip.style.left = Math.max(0, x) + 'px';
      tip.style.top = y + 'px';
    }
    row.addEventListener('pointermove', function (e) { showTip(e.clientX, e.clientY); });
    row.addEventListener('pointerleave', function () { tip.style.display = 'none'; });
    row.addEventListener('focus', function () {
      var r = row.getBoundingClientRect();
      showTip(r.left + Math.min(r.width * 0.4, 260), r.top + 4);
    });
    row.addEventListener('blur', function () { tip.style.display = 'none'; });
  });

  // table twin
  var tableWrap = document.getElementById(key + '-table');
  var table = document.createElement('table');
  table.className = 'data-table';
  var capEl = document.createElement('caption');
  capEl.textContent = cfg.caption;
  table.appendChild(capEl);
  var thead = document.createElement('thead');
  var hr = document.createElement('tr');
  cfg.cols.forEach(function (c, i) {
    var th = document.createElement('th');
    th.scope = 'col';
    th.textContent = c;
    if (i === 1) th.className = 'num';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);
  var tbody = document.createElement('tbody');
  cfg.data.forEach(function (d) {
    var tr = document.createElement('tr');
    if (d.hero) tr.className = 'hero-row';
    var td1 = document.createElement('td'); td1.textContent = d.name;
    var td2 = document.createElement('td'); td2.className = 'num'; td2.textContent = cfg.fmt(d.v);
    tr.appendChild(td1); tr.appendChild(td2);
    if (cfg.cols.length > 2) {
      var td3 = document.createElement('td'); td3.textContent = d.cat || '';
      tr.appendChild(td3);
    }
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  tableWrap.appendChild(table);

  // brightens a beat after the one above it, then its number fades in.
  // Fails open via whenVisible, and --i drives the stagger from CSS.
  function setWidths() {
    rows.querySelectorAll('.crow').forEach(function (row, i) {
      var b = row.querySelector('.crow__bar');
      if (!b) return;
      row.style.setProperty('--i', i);
      b.style.setProperty('--i', i);
      b.style.width = b.dataset.w + '%';
      b.classList.add('lit');
      row.classList.add('is-lit');
    });
  }
  whenVisible(rows, setWidths);
  cfg._setWidths = setWidths;
});

// chart/table toggles
document.querySelectorAll('.table-toggle').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var key = btn.dataset.chart;
    var chartWrap = document.getElementById(key + '-chart');
    var tableWrap = document.getElementById(key + '-table');
    var showTable = tableWrap.hidden;
    tableWrap.hidden = !showTable;
    chartWrap.hidden = showTable;
    btn.setAttribute('aria-pressed', String(showTable));
    btn.textContent = showTable ? 'View as chart' : 'View as table';
    if (showTable) CHARTS[key]._setWidths();
  });
});

