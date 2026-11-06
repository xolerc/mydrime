/* ═══════════════════════════════════════════════════════════
   xoleric — CURSOR AGENTS
   1) BUILD CREW: build.js har bo'limni qurganda "xol:built" yuboradi.
      Ismli kursor-agentlar shu bo'limdagi HAR BIR elementni tayyorlaydi:
        • panel / tugma / karta — burchakdan tortib o'lchamini beradi
          (selection frame + "W × H"), shakli doiradan to'rtburchakka o'zgaradi,
          rang tanlaydi (swatch) va element shu rangda yonib o'chadi;
        • matn — harfma-harf "qo'lda yozilgandek" yoziladi (rang chaqnashi bilan).
      #hero (header) dan footer'gacha. Fon (WebGL) ga tegmaydi.
   2) ORBIT PILOTS: har bir ijtimoiy ikonni doimiy kursor ushlab aylantiradi.
      Qurilish tugagach ham saqlanadi — orbita bor ekan, kursorlar aylantiraveradi.
   SAFETY: prefers-reduced-motion, har qanday xatoda hammasi darhol ko'rsatiladi
   (ag-run olinadi), 6s failsafe, rAF faqat kerak bo'lganda.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var reduce = false, coarse = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  try { coarse = window.matchMedia('(pointer: coarse)').matches; } catch (e) {}
  if (reduce || (window.xolEnv && window.xolEnv.fx === false)) return;

  var root = document.documentElement;
  var ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3l14 8.5-6.2 1.2L9.4 20z"/></svg>';
  var CREW = [['Design', '#ff6bd6'], ['Code', '#7df9ff'], ['Motion', '#ffd166'],
              ['Water', '#8ea0b8'], ['Audio', '#b794ff'], ['Xoleric', '#eceff4']];
  var SWATCH = ['#ff6bd6', '#7df9ff', '#ffd166', '#b794ff', '#6bffb0'];
  var PLAT = { yt: 'YouTube', ig: 'Instagram', tg: 'Telegram', gh: 'GitHub', pin: 'Pinterest', 'in': 'LinkedIn' };
  var TEXT_SEL = 'h1,h2,h3,p,.eyebrow,.section-sub,.logo,.site-nav a,.btn,.card-tag,.card-impact,.card-meta,.card-link,.card-art-name,.footer-note,.footer-top';
  var SHAPE_SEL = '.btn,.project-card,.blurb,.contact-box,.hero-art,.section-head,.site-nav,.footer-social';
  var MAXAG = coarse ? 3 : 5;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  /* ── qatlam ── */
  var layer = null;
  function getLayer() {
    if (layer) return layer;
    layer = document.createElement('div');
    layer.className = 'ag-layer';
    layer.id = 'agentLayer';
    layer.setAttribute('data-swim', 'off');
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
    return layer;
  }

  /* ── kursor (agent yoki pilot) ── */
  function makeAgent(nm, pilot) {
    var el = document.createElement('div');
    el.className = 'ag' + (pilot ? ' ag-pilot' : '');
    el.style.setProperty('--c', nm[1]);
    el.innerHTML = ARROW + '<span class="ag-l"></span>' + (pilot ? '' :
      '<div class="ag-sw">' + SWATCH.map(function (c) { return '<i style="--s:' + c + '"></i>'; }).join('') + '</div>');
    getLayer().appendChild(el);
    var a = {
      el: el, lab: el.querySelector('.ag-l'), sw: el.querySelector('.ag-sw'), nm: nm,
      x: -60, y: -60, tx: -60, ty: -60, task: null, idle: 0, label: '', born: false, rate: pilot ? 11 : 0
    };
    a.setLabel = function (t) {
      var s = nm[0] + (t ? ' · ' + t : '');
      if (s !== a.label) { a.label = s; a.lab.textContent = s; }
    };
    a.setLabel('');
    return a;
  }

  function stepAgent(a, dt) {
    var k = 1 - Math.exp(-dt * (a.rate || (a.task ? 10 : 5)));
    a.x += (a.tx - a.x) * k;
    a.y += (a.ty - a.y) * k;
    a.el.style.transform = 'translate(' + a.x.toFixed(1) + 'px,' + a.y.toFixed(1) + 'px)';
  }

  /* ── selection frame (shape vazifalari uchun) ── */
  function makeFrame(color, dur) {
    var f = document.createElement('div');
    f.className = 'bf';
    f.style.setProperty('--c', color);
    f.style.setProperty('--bf-d', dur + 'ms');
    f.innerHTML = '<div class="bf-box"><i class="tl"></i><i class="tr"></i><i class="bl"></i><i class="br"></i></div><div class="bf-tag"></div>';
    getLayer().appendChild(f);
    return { el: f, tag: f.querySelector('.bf-tag') };
  }
  function placeFrame(fr, r, e) {
    fr.el.style.transform = 'translate(' + r.left.toFixed(1) + 'px,' + r.top.toFixed(1) + 'px)';
    fr.el.style.width = r.width.toFixed(1) + 'px';
    fr.el.style.height = r.height.toFixed(1) + 'px';
    fr.tag.textContent = Math.round(r.width * e) + ' × ' + Math.round(r.height * e);
  }
  function dropFrame(fr) {
    if (!fr) return;
    fr.el.classList.add('out');
    setTimeout(function () { if (fr.el.parentNode) fr.el.parentNode.removeChild(fr.el); }, 520);
  }

  /* ── vazifalar ── */
  var tasks = [], agents = [], running = false, raf = 0, last = 0, endT = 0, spawnN = 0;

  function reveal(c, instant) {
    c.classList.add('tw');
    if (instant) c.classList.add('tw-i');
  }

  function instantTask(t) {
    if (t.type === 'shape') {
      t.el.classList.remove('ag-hold');
      t.el.classList.remove('ag-morph');
    } else {
      for (var i = t.k || 0; i < t.chars.length; i++) reveal(t.chars[i], true);
    }
  }

  function makeTimes(chars) {
    var n = chars.length, dur = clamp(n * 30, 420, 1700), w = [], sum = 0, i;
    for (i = 0; i < n; i++) {
      var wt = 0.5 + Math.random();
      if (/[.,:;!?]/.test(chars[i].textContent)) wt += 2.2;   /* qalam "to'xtab" oladi */
      w.push(wt); sum += wt;
    }
    var acc = 0, times = [];
    for (i = 0; i < n; i++) { times.push(acc / sum * dur); acc += w[i]; }
    return times;
  }

  function startTask(a, t) {
    t.taken = true; t.a = a; t.t = 0; a.task = t; a.idle = 0;
    if (t.type === 'shape') {
      var r = t.el.getBoundingClientRect();
      t.dur = clamp(600 + (r.width + r.height) * 0.35, 700, 1400);
      t.pick = Math.floor(Math.random() * SWATCH.length);
      t.picked = false;
      t.el.style.setProperty('--ag-d', t.dur + 'ms');
      t.el.classList.remove('ag-hold');
      t.el.classList.add('ag-morph');
      t.frame = makeFrame(a.nm[1], t.dur);
      a.x = clamp(r.left - 80, 0, innerWidth); a.y = clamp(r.top - 60, 0, innerHeight);
      a.setLabel('o‘lchamlamoqda');
    } else {
      t.k = 0;
      t.times = makeTimes(t.chars);
      t.el.style.setProperty('--tw-c', a.nm[1]);
      a.setLabel('yozmoqda');
    }
  }

  function endTask(a, t, instant) {
    if (t.type === 'shape') {
      t.el.classList.remove('ag-hold');
      if (instant) t.el.classList.remove('ag-morph');
      else setTimeout(function () { t.el.classList.remove('ag-morph'); }, 120);
      if (t.picked && !instant) {
        t.el.classList.add('ag-flash');
        setTimeout(function () { t.el.classList.remove('ag-flash'); }, 950);
      }
      dropFrame(t.frame);
      if (a.sw) a.sw.classList.remove('on');
    } else if (instant) {
      instantTask(t);
    }
    var i = tasks.indexOf(t);
    if (i > -1) tasks.splice(i, 1);
    a.task = null; a.idle = 0; a.setLabel('');
  }

  function inBand(r) { return r.bottom > -20 && r.top < innerHeight * 0.96; }

  function pickTask(building) {
    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      if (t.taken) continue;
      var r = t.el.getBoundingClientRect();
      var hidden = !r.width && !r.height;
      var above = r.bottom <= -20;
      if (hidden || above || (!building && !inBand(r))) {   /* ko'rinmaydi / o'tib ketgan → darhol */
        instantTask(t); tasks.splice(i, 1); i--; continue;
      }
      if (!inBand(r)) continue;                              /* pastda — scroll kelguncha kutadi */
      if (t.type === 'type' && t.el.closest('.ag-hold')) continue;
      return t;
    }
    return null;
  }

  /* true — vazifa tugadi */
  function updateTask(a, t, dtMs, speed, building) {
    var r = t.el.getBoundingClientRect();
    if (r.bottom <= -20 || (!building && !inBand(r))) { endTask(a, t, true); return true; }
    t.t += dtMs * speed;
    var vw = innerWidth, vh = innerHeight;
    if (t.type === 'shape') {
      var p = clamp(t.t / t.dur, 0, 1.2), e = ease(Math.min(p, 1));
      a.tx = clamp(r.left + r.width * e, 6, vw - 130);
      a.ty = clamp(r.top + r.height * e, 6, vh - 30);
      placeFrame(t.frame, r, e);
      if (p > 0.5 && a.sw) {
        a.sw.classList.add('on');
        a.setLabel('rang tanlamoqda');
        var hi = Math.min(t.pick, Math.floor((p - 0.5) / 0.08));
        var dots = a.sw.children;
        for (var d = 0; d < dots.length; d++) dots[d].classList.toggle('hl', d === hi);
      }
      if (p >= 0.86 && !t.picked) {
        t.picked = true;
        t.el.style.setProperty('--ag-c', SWATCH[t.pick]);
      }
      if (p >= 1.1) { endTask(a, t, false); return true; }
    } else {
      var n = t.chars.length;
      while (t.k < n && t.times[t.k] <= t.t) { reveal(t.chars[t.k], false); t.k++; }
      var c = t.chars[Math.max(0, t.k - 1)];
      var cr = c.getBoundingClientRect();
      a.tx = clamp(cr.right + 2, 6, vw - 130);
      a.ty = clamp(cr.bottom - 2, 6, vh - 30);
      if (t.k >= n && t.t > t.times[n - 1] + 260) { endTask(a, t, false); return true; }
    }
    return false;
  }

  function removeAgent(a) {
    a.el.classList.remove('on');
    setTimeout(function () { if (a.el.parentNode) a.el.parentNode.removeChild(a.el); }, 450);
  }

  function finishAll() {
    try {
      agents.forEach(function (a) { if (a.task) endTask(a, a.task, true); removeAgent(a); });
      tasks.slice().forEach(instantTask);
    } catch (e) {}
    agents = []; tasks = [];
    root.classList.remove('ag-run');
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function tick(now) {
    raf = 0;
    if (!running) return;
    try {
      var dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      var building = root.classList.contains('is-building');
      var speed = building ? 1 : 3;
      var i, a, t;

      /* bo'sh agentlarga vazifa */
      for (i = 0; i < agents.length; i++) {
        a = agents[i];
        if (!a.task) {
          t = pickTask(building);
          if (t) startTask(a, t); else a.idle += dt;
        }
      }
      /* yangi agent chaqirish */
      if (agents.length < MAXAG) {
        t = pickTask(building);
        if (t) {
          a = makeAgent(CREW[spawnN++ % CREW.length], false);
          a.x = Math.random() * innerWidth; a.y = -40;
          agents.push(a);
          setTimeout(function (ag) { return function () { ag.el.classList.add('on'); }; }(a), 16);
          startTask(a, t);
        }
      }
      /* yangilash */
      for (i = agents.length - 1; i >= 0; i--) {
        a = agents[i];
        if (a.task && updateTask(a, a.task, dt * 1000, speed, building)) {
          var nt = pickTask(building);
          if (nt) startTask(a, nt);
        }
        stepAgent(a, dt);
        if (!a.task && a.idle > 1.1) { removeAgent(a); agents.splice(i, 1); }
      }

      if (!building) {
        endT += dt;
        var busy = agents.some(function (x) { return x.task; });
        if ((!tasks.length && !busy) || endT > 6) { finishAll(); return; }
      }
      raf = requestAnimationFrame(tick);
    } catch (err) {
      finishAll();          /* xato bo'lsa — sahifa to'liq ko'rinadi */
    }
  }

  function cmp(a, b) {
    if (a.el === b.el) return a.type === 'shape' ? -1 : 1;
    return (a.el.compareDocumentPosition(b.el) & 4) ? -1 : 1;
  }

  var seen = typeof WeakSet === 'function' ? new WeakSet() : null;

  function plan(sec) {
    if (!running) {
      running = true; endT = 0; last = performance.now();
      root.classList.add('ag-run');
      raf = requestAnimationFrame(tick);
    }
    var i, el;
    var shapes = sec.querySelectorAll(SHAPE_SEL);
    for (i = 0; i < shapes.length; i++) {
      el = shapes[i];
      if (el.__agShape) continue;
      el.__agShape = true;
      el.classList.add('ag-hold');
      tasks.push({ type: 'shape', el: el });
    }
    var texts = sec.querySelectorAll(TEXT_SEL);
    for (i = 0; i < texts.length; i++) {
      el = texts[i];
      if (el.__agText) continue;
      var cs = el.querySelectorAll('.sw-c'), list = [];
      for (var k = 0; k < cs.length; k++) {
        if (seen) { if (seen.has(cs[k])) continue; seen.add(cs[k]); }
        list.push(cs[k]);
      }
      el.__agText = true;
      if (list.length) tasks.push({ type: 'type', el: el, chars: list });
    }
    tasks.sort(cmp);
  }

  document.addEventListener('xol:built', function (e) {
    try {
      var el = e && e.detail && e.detail.el;
      if (el) plan(el);
    } catch (err) { finishAll(); }
  });

  /* failsafe: build.js o'lsa yoki class olib tashlansa */
  setInterval(function () {
    if (running && !root.classList.contains('is-building') && endT === 0) endT = 0.001;
  }, 1000);

  /* ═══════════════════════════════════════
     ORBIT PILOTS — ikonlarni doim kursorlar aylantiradi
     ═══════════════════════════════════════ */
  var pilots = [], pLast = 0;

  function pilotTick(now) {
    requestAnimationFrame(pilotTick);
    var dt = Math.min(0.05, (now - pLast) / 1000 || 0.016);
    pLast = now;
    var orb = document.getElementById('orbitContainer');
    var vis = false;
    if (orb) {
      var cs = getComputedStyle(orb);
      vis = cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.2;
    }
    for (var i = 0; i < pilots.length; i++) {
      var a = pilots[i];
      if (!vis) { a.el.classList.remove('on'); continue; }
      var r = a.icon.getBoundingClientRect();
      if (!r.width) { a.el.classList.remove('on'); continue; }
      a.tx = r.left + r.width * 0.7 + Math.sin(now / 700 + a.ph) * 2.5;
      a.ty = r.top + r.height * 0.62 + Math.cos(now / 830 + a.ph) * 2.5;
      if (!a.born) { a.x = a.tx; a.y = a.ty; a.born = true; }
      a.el.classList.add('on');
      stepAgent(a, dt);
    }
  }

  function initPilots() {
    var icons = document.querySelectorAll('.orbit-icon');
    if (!icons.length) return false;
    var cols = ['#ff6bd6', '#7df9ff', '#ffd166', '#b794ff', '#6bffb0', '#eceff4'];
    for (var i = 0; i < icons.length; i++) {
      var key = '';
      for (var k in PLAT) { if (icons[i].classList.contains(k)) key = k; }
      var a = makeAgent([PLAT[key] || 'Orbit', cols[i % cols.length]], true);
      a.icon = icons[i];
      a.ph = Math.random() * 6.28;
      pilots.push(a);
    }
    pLast = performance.now();
    requestAnimationFrame(pilotTick);
    return true;
  }

  var tries = 0;
  (function wait() {
    try { if (initPilots()) return; } catch (e) { return; }
    if (++tries < 40) setTimeout(wait, 400);
  })();
})();
