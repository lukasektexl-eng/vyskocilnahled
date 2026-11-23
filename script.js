// Ukázkový návrh – vše běží jen v prohlížeči, nic se nikam neodesílá.
(function () {
  'use strict';

  var OPEN_H = 8, CLOSE_H = 16; // OVĚŘIT S MAJITELEM – Po–Pá 8:00–16:00 (Google Maps)
  var TL_FROM = 6, TL_TO = 18;
  var DAY_NAMES = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
  var DAY_SHORT = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
  var MONTHS_GEN = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
  var MONTHS_NOM = ['leden', 'únor', 'březen', 'duben', 'květen', 'červen', 'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'];
  var MONTHS_LOC = ['lednu', 'únoru', 'březnu', 'dubnu', 'květnu', 'červnu', 'červenci', 'srpnu', 'září', 'říjnu', 'listopadu', 'prosinci'];

  /* ---- Aktuální čas v Praze (nezávisle na časovém pásmu návštěvníka) ---- */
  function pragueNow() {
    var parts = {};
    try {
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Prague', year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', hourCycle: 'h23'
      }).formatToParts(new Date()).forEach(function (p) { parts[p.type] = +p.value; });
    } catch (e) {
      var d = new Date();
      parts = { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours(), minute: d.getMinutes() };
    }
    var date = new Date(parts.year, parts.month - 1, parts.day);
    return { date: date, dow: date.getDay(), h: parts.hour, m: parts.minute, y: parts.year, mo: parts.month - 1 };
  }
  var now = pragueNow();
  var nowMin = now.h * 60 + now.m;
  var isWeekday = function (dow) { return dow >= 1 && dow <= 5; };
  var openNow = isWeekday(now.dow) && nowMin >= OPEN_H * 60 && nowMin < CLOSE_H * 60;

  /* ---- Stav + časová osa dne + dnešní řádek tabulky ---- */
  var status = document.querySelector('[data-status]');
  if (status) {
    var txt;
    if (openNow) txt = 'Teď otevřeno, dnes do 16:00';
    else if (isWeekday(now.dow) && nowMin < OPEN_H * 60) txt = 'Teď zavřeno, dnes otevíráme v 8:00';
    else txt = 'Teď zavřeno';
    status.textContent = txt;
    status.classList.add(openNow ? 'is-open' : 'is-closed');
  }
  var tl = document.querySelector('[data-timeline]');
  if (tl) {
    if (!isWeekday(now.dow)) tl.classList.add('is-closed-day');
    var marker = tl.querySelector('.tl-now');
    var pos = (nowMin / 60 - TL_FROM) / (TL_TO - TL_FROM);
    if (pos < 0 || pos > 1) marker.hidden = true; else marker.style.left = (pos * 100).toFixed(2) + '%';
  }
  var todayRow = document.querySelector('.hours tr[data-day="' + now.dow + '"]');
  if (todayRow) todayRow.classList.add('is-today');

  /* ---- Sezónní tip (podle měsíce, jen ze služeb, které servis uvádí) ---- */
  var season = document.querySelector('[data-season]');
  if (season) {
    var mo = now.mo, s;
    if (mo >= 9 || mo <= 1) s = ['Pneuservis', 'Sezóna zimních pneumatik', 'Přezutí si domluvte včas.'];
    else if (mo <= 4) s = ['Pneuservis', 'Jaro: přezutí na letní pneumatiky', 'Domluvte si termín předem.'];
    else s = ['Plnění klimatizace', 'Léto: klimatizace', 'Když nechladí, přijeďte na plnění.'];
    season.dataset.preselect = s[0];
    season.innerHTML = '<b>' + s[1] + '</b><small>' + s[2] + ' <span>Vybrat termín</span></small>';
    season.hidden = false;
  }

  /* ====================================================================
     Objednávka (demo) + živý zakázkový list
     ==================================================================== */
  var form = document.getElementById('booking-form');
  var daysEl = document.getElementById('days');
  var timesEl = document.getElementById('times');
  var timesNote = document.getElementById('times-note');
  var summary = document.getElementById('summary');
  var ticket = document.getElementById('ticket');
  var ticketCol = document.querySelector('.ticket-col');
  var done = document.getElementById('done');
  var spz = document.getElementById('spz');
  var state = { day: null, time: null };

  function fmtDay(d) { return DAY_NAMES[d.getDay()] + ' ' + d.getDate() + '. ' + MONTHS_GEN[d.getMonth()]; }
  function fmtShort(d) { return DAY_SHORT[d.getDay()] + ' ' + d.getDate() + '. ' + (d.getMonth() + 1) + '.'; }
  function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function buildDays() {
    daysEl.innerHTML = '';
    var d = new Date(now.date);
    var count = 0, lastWeek = null;
    var lastDow = 0;
    while (count < 10 || lastDow !== 5) {
      var ok = isWeekday(d.getDay());
      if (ok && sameDay(d, now.date) && nowMin > (CLOSE_H - 1) * 60 - 30) ok = false;
      if (ok) {
        var monday = new Date(d); monday.setDate(d.getDate() - (d.getDay() - 1));
        var wk = monday.toDateString();
        if (wk !== lastWeek) {
          var lbl = document.createElement('p');
          lbl.className = 'week-label';
          lbl.textContent = monday <= now.date ? 'Tento týden' : 'Týden od ' + monday.getDate() + '. ' + MONTHS_GEN[monday.getMonth()];
          daysEl.appendChild(lbl);
          lastWeek = wk;
          for (var p = 1; p < d.getDay(); p++) { var sp = document.createElement('span'); sp.setAttribute('aria-hidden', 'true'); daysEl.appendChild(sp); }
        }
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'day';
        b.setAttribute('aria-pressed', 'false');
        b.setAttribute('aria-label', fmtDay(d));
        b.dataset.y = d.getFullYear(); b.dataset.m = d.getMonth(); b.dataset.d = d.getDate();
        b.innerHTML = '<small>' + DAY_SHORT[d.getDay()] + '</small><b>' + d.getDate() + '.</b><small>' + (d.getMonth() + 1) + '.</small>';
        daysEl.appendChild(b);
        count++; lastDow = d.getDay();
      }
      d.setDate(d.getDate() + 1);
    }
  }

  function buildTimes() {
    timesEl.innerHTML = '';
    state.time = null;
    if (!state.day) { timesNote.hidden = false; return; }
    timesNote.hidden = true;
    var isToday = sameDay(state.day, now.date);
    for (var h = OPEN_H; h < CLOSE_H; h++) {
      for (var m = 0; m < 60; m += 30) {
        var t = h + ':' + (m ? '30' : '00');
        var tooSoon = isToday && (h * 60 + m) < nowMin + 60;
        var lab = document.createElement('label');
        lab.className = 'chip';
        lab.innerHTML = '<input type="radio" name="cas" value="' + t + '"' + (tooSoon ? ' disabled' : '') + '><span>' + t + '</span>';
        timesEl.appendChild(lab);
      }
    }
  }

  function selectedService() { var r = form.querySelector('input[name="sluzba"]:checked'); return r ? r.value : ''; }

  var lastTicket = {};
  function setTicket(key, val) {
    var el = ticket.querySelector('[data-t="' + key + '"]');
    if (!el || lastTicket[key] === val) return;
    lastTicket[key] = val;
    el.textContent = val;
    var dd = el.closest('dd');
    dd.classList.remove('is-new'); void dd.offsetWidth; if (val) dd.classList.add('is-new');
  }

  function update() {
    var s = selectedService();
    var parts = [];
    if (s) parts.push(s);
    if (state.day) parts.push(fmtShort(state.day));
    if (state.time) parts.push(state.time);
    summary.textContent = parts.length ? parts.join(' · ') : 'Zatím nic nevybráno.';
    setTicket('sluzba', s);
    setTicket('den', state.day ? fmtDay(state.day) : '');
    setTicket('cas', state.time || '');
    setTicket('jmeno', form.jmeno.value.trim());
    setTicket('telefon', form.telefon.value.trim());
    setTicket('spz', spz.value.trim());
  }

  daysEl.addEventListener('click', function (e) {
    var b = e.target.closest('.day'); if (!b) return;
    daysEl.querySelectorAll('.day').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    state.day = new Date(+b.dataset.y, +b.dataset.m, +b.dataset.d);
    document.getElementById('err-den').hidden = true;
    buildTimes();
    update();
  });
  daysEl.addEventListener('keydown', function (e) {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(e.key) < 0) return;
    var all = Array.prototype.slice.call(daysEl.querySelectorAll('.day'));
    var i = all.indexOf(document.activeElement); if (i < 0) return;
    var n = all[i + ((e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 1)];
    if (n) { e.preventDefault(); n.focus(); }
  });

  form.addEventListener('change', function (e) {
    if (e.target.name === 'cas') { state.time = e.target.value; document.getElementById('err-cas').hidden = true; }
    if (e.target.name === 'sluzba') document.getElementById('err-sluzba').hidden = true;
    update();
  });
  form.addEventListener('input', update);
  spz.addEventListener('input', function () { spz.value = spz.value.toUpperCase().replace(/[^0-9A-Z ]/g, ''); update(); });

  function setErr(input, errId, bad) {
    document.getElementById(errId).hidden = !bad;
    if (input) input.setAttribute('aria-invalid', bad ? 'true' : 'false');
    return bad;
  }
  function checkName() { return setErr(form.jmeno, 'err-jmeno', form.jmeno.value.trim().length < 2); }
  function checkPhone() { return setErr(form.telefon, 'err-telefon', form.telefon.value.replace(/\D/g, '').length < 9); }
  form.jmeno.addEventListener('blur', function () { if (form.jmeno.value) checkName(); });
  form.telefon.addEventListener('blur', function () { if (form.telefon.value) checkPhone(); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var bad = null;
    if (setErr(null, 'err-sluzba', !selectedService())) bad = bad || form.querySelector('input[name="sluzba"]');
    if (setErr(null, 'err-den', !state.day)) bad = bad || daysEl.querySelector('.day');
    if (setErr(null, 'err-cas', !state.time)) bad = bad || timesEl.querySelector('input:not(:disabled)') || daysEl.querySelector('.day');
    if (checkName()) bad = bad || form.jmeno;
    if (checkPhone()) bad = bad || form.telefon;
    if (bad) { bad.focus(); return; }

    update();
    form.hidden = true;
    ticketCol.classList.add('is-done');
    done.hidden = false;
    ticket.focus();
    ticket.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });

  document.getElementById('restart').addEventListener('click', function () {
    form.reset();
    state.day = null; state.time = null;
    form.querySelectorAll('[aria-invalid]').forEach(function (i) { i.removeAttribute('aria-invalid'); });
    form.querySelectorAll('.err').forEach(function (p) { p.hidden = true; });
    buildDays(); buildTimes(); update();
    done.hidden = true; form.hidden = false; ticketCol.classList.remove('is-done');
    form.querySelector('input[name="sluzba"]').focus();
  });

  /* ---- .ics soubory (vše v prohlížeči) ---- */
  function icsEscape(s) { return String(s).replace(/[\\;,]/g, function (c) { return '\\' + c; }); }
  function downloadIcs(name, lines) {
    var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    var body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ukazka//Autoservis Vyskocil//CS', 'BEGIN:VEVENT',
      'UID:' + Date.now() + '@ukazka', 'DTSTAMP:' + stamp].concat(lines, ['END:VEVENT', 'END:VCALENDAR']).join('\r\n');
    var url = URL.createObjectURL(new Blob([body], { type: 'text/calendar;charset=utf-8' }));
    var a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  document.getElementById('book-ics').addEventListener('click', function () {
    var d = state.day, hm = state.time.split(':');
    var start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), +hm[0], +hm[1]);
    var end = new Date(start.getTime() + 30 * 60000);
    var f = function (x) { return x.getFullYear() + pad(x.getMonth() + 1) + pad(x.getDate()) + 'T' + pad(x.getHours()) + pad(x.getMinutes()) + '00'; };
    downloadIcs('autoservis-vyskocil.ics', [
      'DTSTART;TZID=Europe/Prague:' + f(start), 'DTEND;TZID=Europe/Prague:' + f(end),
      'SUMMARY:' + icsEscape(selectedService() + ' – Autoservis Pavel Vyskočil'),
      'LOCATION:' + icsEscape('Potoční 767, 251 64 Mnichovice'),
      'DESCRIPTION:' + icsEscape('Ukázka – termín nebyl nikam odeslán. Tel. 603 149 151.')
    ]);
  });

  /* ====================================================================
     STK hlídač – kulatá známka
     ==================================================================== */
  var mSel = document.getElementById('stk-month');
  var ySel = document.getElementById('stk-year');
  var segs = document.getElementById('dial-segs');
  var yearText = document.getElementById('dial-year');
  var stkOut = document.getElementById('stk-result');
  var SVGNS = 'http://www.w3.org/2000/svg';

  MONTHS_NOM.forEach(function (n, i) { var o = document.createElement('option'); o.value = i; o.textContent = n; mSel.appendChild(o); });
  for (var y = now.y - 1; y <= now.y + 2; y++) { var o = document.createElement('option'); o.value = y; o.textContent = y; ySel.appendChild(o); }
  var def = now.mo + 2; mSel.value = def % 12; ySel.value = now.y + Math.floor(def / 12);

  function polar(r, a) { return [150 + r * Math.sin(a), 150 - r * Math.cos(a)]; }
  for (var i = 0; i < 12; i++) {
    var a0 = i * Math.PI / 6, a1 = (i + 1) * Math.PI / 6, R = 138, r = 76;
    var p0 = polar(R, a0), p1 = polar(R, a1), p2 = polar(r, a1), p3 = polar(r, a0);
    var path = document.createElementNS(SVGNS, 'path');
    path.setAttribute('d', 'M' + p0 + 'A' + R + ' ' + R + ' 0 0 1 ' + p1 + 'L' + p2 + 'A' + r + ' ' + r + ' 0 0 0 ' + p3 + 'Z');
    path.setAttribute('class', 'dial-seg'); path.dataset.m = i;
    segs.appendChild(path);
    var c = polar(107, (i + .5) * Math.PI / 6);
    var t = document.createElementNS(SVGNS, 'text');
    t.setAttribute('x', c[0]); t.setAttribute('y', c[1] + 8); t.setAttribute('text-anchor', 'middle');
    t.setAttribute('class', 'dial-num'); t.dataset.m = i; t.textContent = i + 1;
    segs.appendChild(t);
  }
  segs.addEventListener('click', function (e) { var m = e.target.dataset && e.target.dataset.m; if (m != null) { mSel.value = m; renderStk(); } });

  function plural(n) { return n === 1 ? 'měsíc' : (n >= 2 && n <= 4 ? 'měsíce' : 'měsíců'); }
  function renderStk() {
    var m = +mSel.value, yy = +ySel.value;
    segs.querySelectorAll('[data-m]').forEach(function (el) { el.classList.toggle('is-on', +el.dataset.m === m); });
    yearText.textContent = yy;
    var diff = (yy * 12 + m) - (now.y * 12 + now.mo);
    var head;
    if (diff < 0) head = 'Platnost podle zadání už skončila';
    else if (diff === 0) head = 'Platnost končí tento měsíc';
    else head = 'Zbývá ' + diff + ' ' + plural(diff);
    stkOut.innerHTML = '<strong>' + head + '</strong>Známka: ' + MONTHS_NOM[m] + ' ' + yy + '.';
  }
  mSel.addEventListener('change', renderStk);
  ySel.addEventListener('change', renderStk);
  renderStk();

  document.getElementById('stk-ics').addEventListener('click', function () {
    var m = +mSel.value, yy = +ySel.value;
    var r = new Date(yy, m - 1, 1); // připomínka měsíc předem
    if (r < now.date) r = new Date(now.date.getTime() + 864e5);
    var nx = new Date(r.getTime() + 864e5);
    var f = function (x) { return x.getFullYear() + pad(x.getMonth() + 1) + pad(x.getDate()); };
    downloadIcs('pripominka-stk.ics', [
      'DTSTART;VALUE=DATE:' + f(r), 'DTEND;VALUE=DATE:' + f(nx),
      'SUMMARY:' + icsEscape('Příprava na STK – zavolat 603 149 151'),
      'DESCRIPTION:' + icsEscape('Platnost STK: ' + MONTHS_NOM[m] + ' ' + yy + '. Autoservis Pavel Vyskočil, Potoční 767, Mnichovice.')
    ]);
  });

  /* ====================================================================
     „Co s autem máte?“ + předvýběr služby
     ==================================================================== */
  var symOut = document.getElementById('symptom-out');
  var CARD_NAMES = { servis: 'Autoservis a pneuservis', diag: 'Diagnostika a STK', klima: 'Klimatizace' };
  document.querySelectorAll('.symptom').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.symptom').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      document.querySelectorAll('.service').forEach(function (c) { c.classList.toggle('is-hit', c.id === 'card-' + b.dataset.card); });
      preselect(b.dataset.service);
      symOut.innerHTML = 'Patří to do: <strong>' + CARD_NAMES[b.dataset.card] + '</strong> → ' + b.dataset.service + '. <a href="#objednat">Vybrat termín</a>';
      symOut.hidden = false;
    });
  });

  function preselect(val) {
    var r = form.querySelector('input[name="sluzba"][value="' + val + '"]');
    if (r) { r.checked = true; document.getElementById('err-sluzba').hidden = true; update(); }
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-preselect]');
    if (a) preselect(a.dataset.preselect);
  });

  buildDays(); buildTimes(); update();

  /* ---- Pevné „Zavolat“ schovat, když je vidět objednávka nebo kontakt ---- */
  var bar = document.querySelector('.call-bar');
  if (bar && 'IntersectionObserver' in window) {
    var visible = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) visible.add(en.target); else visible.delete(en.target); });
      bar.classList.toggle('is-hidden', visible.size > 0);
    }, { threshold: 0.1 });
    ['kontakt', 'objednat'].forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
    var sign = document.querySelector('.sign'); if (sign) io.observe(sign);
  }

  /* ---- Jemné odhalení ---- */
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); rio.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.service, .step-list li, .stk-dial-wrap, .contact-grid > div').forEach(function (t) { t.classList.add('reveal'); rio.observe(t); });
  }
})();
