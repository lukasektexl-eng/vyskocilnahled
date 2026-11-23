// Ukázkový návrh – vše běží jen v prohlížeči, nic se nikam neodesílá.
(function () {
  'use strict';

  var OPEN_H = 8, CLOSE_H = 16; // OVĚŘIT S MAJITELEM – Po–Pá 8:00–16:00 (Google Maps)
  var DAY_NAMES = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
  var DAY_SHORT = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
  var MONTHS = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];

  var now = new Date();
  var isWeekday = function (d) { var w = d.getDay(); return w >= 1 && w <= 5; };

  /* ---- Stav „otevřeno / zavřeno“ + dnešní den v tabulce ---- */
  var status = document.querySelector('[data-status]');
  if (status) {
    var mins = now.getHours() * 60 + now.getMinutes();
    if (isWeekday(now) && mins >= OPEN_H * 60 && mins < CLOSE_H * 60) {
      status.textContent = 'Teď otevřeno, do 16:00';
      status.classList.add('is-open');
    } else {
      status.textContent = 'Teď zavřeno';
      status.classList.add('is-closed');
    }
  }
  var todayRow = document.querySelector('.hours tr[data-day="' + now.getDay() + '"]');
  if (todayRow) todayRow.classList.add('is-today');

  /* ---- Objednávka (demo) ---- */
  var form = document.getElementById('booking-form');
  var daysEl = document.getElementById('days');
  var timesEl = document.getElementById('times');
  var timesNote = document.getElementById('times-note');
  var summary = document.getElementById('summary');
  var done = document.getElementById('done');
  var doneList = document.getElementById('done-list');
  var state = { day: null, time: null };

  function fmtDay(d) { return DAY_NAMES[d.getDay()] + ' ' + d.getDate() + '. ' + MONTHS[d.getMonth()]; }
  function fmtShort(d) { return DAY_SHORT[d.getDay()] + ' ' + d.getDate() + '. ' + (d.getMonth() + 1) + '.'; }
  function sameDay(a, b) { return a.toDateString() === b.toDateString(); }

  // Nejbližších 10 pracovních dní; dnešek jen pokud zbývá aspoň hodina do zavření.
  function buildDays() {
    daysEl.innerHTML = '';
    var d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var count = 0, lastWeek = null;
    while (count < 10) {
      var ok = isWeekday(d);
      if (ok && sameDay(d, now) && now.getHours() >= CLOSE_H - 1) ok = false;
      if (ok) {
        var monday = new Date(d); monday.setDate(d.getDate() - (d.getDay() - 1));
        var wk = monday.toDateString();
        if (wk !== lastWeek) {
          var lbl = document.createElement('p');
          lbl.className = 'week-label';
          lbl.textContent = count === 0 ? 'Tento týden' : 'Týden od ' + monday.getDate() + '. ' + MONTHS[monday.getMonth()];
          // první týden může začínat uprostřed – zarovnání do sloupců Po–Pá
          daysEl.appendChild(lbl);
          lastWeek = wk;
          for (var pad = 1; pad < d.getDay(); pad++) {
            var sp = document.createElement('span'); sp.setAttribute('aria-hidden', 'true'); daysEl.appendChild(sp);
          }
        }
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'day';
        b.setAttribute('aria-pressed', 'false');
        b.setAttribute('aria-label', fmtDay(d));
        b.dataset.date = d.toISOString();
        b.innerHTML = '<small>' + DAY_SHORT[d.getDay()] + '</small><b>' + d.getDate() + '.</b><small>' + (d.getMonth() + 1) + '.</small>';
        daysEl.appendChild(b);
        count++;
      }
      d.setDate(d.getDate() + 1);
    }
  }

  function buildTimes() {
    timesEl.innerHTML = '';
    state.time = null;
    if (!state.day) { timesNote.hidden = false; return; }
    timesNote.hidden = true;
    var isToday = sameDay(state.day, now);
    for (var h = OPEN_H; h < CLOSE_H; h++) {
      for (var m = 0; m < 60; m += 30) {
        var t = h + ':' + (m ? '30' : '00');
        var lab = document.createElement('label');
        lab.className = 'chip';
        var tooSoon = isToday && (h * 60 + m) < (now.getHours() * 60 + now.getMinutes() + 60);
        lab.innerHTML = '<input type="radio" name="cas" value="' + t + '"' + (tooSoon ? ' disabled' : '') + '><span>' + t + '</span>';
        timesEl.appendChild(lab);
      }
    }
  }

  function selectedService() { var r = form.querySelector('input[name="sluzba"]:checked'); return r ? r.value : null; }

  function updateSummary() {
    var parts = [];
    var s = selectedService(); if (s) parts.push(s);
    if (state.day) parts.push(fmtShort(state.day));
    if (state.time) parts.push(state.time);
    summary.textContent = parts.length ? parts.join(' · ') : 'Zatím nic nevybráno.';
  }

  daysEl.addEventListener('click', function (e) {
    var b = e.target.closest('.day'); if (!b) return;
    daysEl.querySelectorAll('.day').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    state.day = new Date(b.dataset.date);
    document.getElementById('err-den').hidden = true;
    buildTimes();
    updateSummary();
  });

  // šipky mezi dny
  daysEl.addEventListener('keydown', function (e) {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(e.key) < 0) return;
    var all = Array.prototype.slice.call(daysEl.querySelectorAll('.day'));
    var i = all.indexOf(document.activeElement); if (i < 0) return;
    var step = (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 1;
    var n = all[i + step]; if (n) { e.preventDefault(); n.focus(); }
  });

  form.addEventListener('change', function (e) {
    if (e.target.name === 'cas') { state.time = e.target.value; document.getElementById('err-cas').hidden = true; }
    if (e.target.name === 'sluzba') document.getElementById('err-sluzba').hidden = true;
    updateSummary();
  });

  var spz = document.getElementById('spz');
  spz.addEventListener('input', function () { spz.value = spz.value.toUpperCase().replace(/[^0-9A-Z ]/g, ''); });

  function setErr(input, errId, bad) {
    document.getElementById(errId).hidden = !bad;
    if (input) input.setAttribute('aria-invalid', bad ? 'true' : 'false');
    return bad;
  }
  function checkName() { var i = form.jmeno; return setErr(i, 'err-jmeno', i.value.trim().length < 2); }
  function checkPhone() { var i = form.telefon; return setErr(i, 'err-telefon', i.value.replace(/\D/g, '').length < 9); }
  form.jmeno.addEventListener('blur', function () { if (form.jmeno.value) checkName(); });
  form.telefon.addEventListener('blur', function () { if (form.telefon.value) checkPhone(); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var firstBad = null;
    if (setErr(null, 'err-sluzba', !selectedService())) firstBad = firstBad || form.querySelector('input[name="sluzba"]');
    if (setErr(null, 'err-den', !state.day)) firstBad = firstBad || daysEl.querySelector('.day');
    if (setErr(null, 'err-cas', !state.time)) firstBad = firstBad || timesEl.querySelector('input:not(:disabled)') || daysEl.querySelector('.day');
    if (checkName()) firstBad = firstBad || form.jmeno;
    if (checkPhone()) firstBad = firstBad || form.telefon;
    if (firstBad) { firstBad.focus(); return; }

    var rows = [
      ['Služba', selectedService()],
      ['Termín', fmtDay(state.day) + ', ' + state.time],
      ['Jméno', form.jmeno.value.trim()],
      ['Telefon', form.telefon.value.trim()]
    ];
    if (spz.value.trim()) rows.push(['SPZ', spz.value.trim()]);
    doneList.innerHTML = '';
    rows.forEach(function (r) {
      var dt = document.createElement('dt'); dt.textContent = r[0];
      var dd = document.createElement('dd'); dd.textContent = r[1];
      doneList.appendChild(dt); doneList.appendChild(dd);
    });
    form.hidden = true;
    done.hidden = false;
    done.focus();
  });

  document.getElementById('restart').addEventListener('click', function () {
    form.reset();
    state.day = null; state.time = null;
    form.querySelectorAll('[aria-invalid]').forEach(function (i) { i.removeAttribute('aria-invalid'); });
    form.querySelectorAll('.err').forEach(function (p) { p.hidden = true; });
    buildDays(); buildTimes(); updateSummary();
    done.hidden = true; form.hidden = false;
    form.querySelector('input[name="sluzba"]').focus();
  });

  // „Objednat …“ u služeb předvybere službu
  document.querySelectorAll('[data-preselect]').forEach(function (a) {
    a.addEventListener('click', function () {
      var r = form.querySelector('input[name="sluzba"][value="' + a.dataset.preselect + '"]');
      if (r) { r.checked = true; document.getElementById('err-sluzba').hidden = true; updateSummary(); }
    });
  });

  buildDays(); buildTimes(); updateSummary();

  /* ---- Skrýt pevné „Zavolat“, když je vidět kontakt nebo formulář ---- */
  var bar = document.querySelector('.call-bar');
  if (bar && 'IntersectionObserver' in window) {
    var visible = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) visible.add(en.target); else visible.delete(en.target); });
      bar.classList.toggle('is-hidden', visible.size > 0);
    }, { threshold: 0.15 });
    ['kontakt', 'objednat'].forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
  }

  /* ---- Jemné odhalení sekcí ---- */
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var targets = document.querySelectorAll('.service, .step-list li, .sheet, .contact-grid > div');
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); rio.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    targets.forEach(function (t) { t.classList.add('reveal'); rio.observe(t); });
  }
})();
