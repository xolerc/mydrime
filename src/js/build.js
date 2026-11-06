/* ═══════════════════════════════════════════════════════════
   xoleric — BUILD SCROLL
   Loaderdan keyin sahifa "toza" holatda boshlanadi: faqat fon.
   Pastga scroll (2x sekin) davomida kursorlar to'r bo'lib
   ko'rinadi va bo'limlar pastdan yuqoriga quriladi.
   To'liq pastga tushilgach qurilish tugaydi; yuqoriga qaytishda
   hech narsa o'zgarmaydi. Har bir to'liq sahifa yuklanishida
   (refresh / yangi kirish) ishlaydi — loader kabi.
   SAFETY: prefers-reduced-motion, JS xatosi yoki app.js o'lsa —
   build o'chadi va sahifa normal ko'rinadi.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  /* v4: robotlar va JS'siz muhitda bo'limlar yashirilmaydi — kontent darhol ochiq */
  if (reduce || (window.xolEnv && window.xolEnv.fx === false)) return;

  var root = document.documentElement;
  var started = false;
  var done = false;
  var armed = false;
  var targets = [];
  var layer = null;
  var grid = null;
  var hudState = null;
  var hudPct = null;
  var hudBar = null;
  var cursors = [];
  var activeCount = 0;
  var maxReached = 0;
  var raf = 0;
  var lastPct = -1;
  var lastState = '';
  var bootTimer = 0;
  var failsafe = 0;
  var resizeTimer = 0;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  var NAMES = [['Xoleric', '#eceff4'], ['Design', '#ff6bd6'], ['Code', '#7df9ff'],
               ['Motion', '#ffd166'], ['Water', '#8ea0b8'], ['Audio', '#b794ff']];
  var frameN = 0;

  /* agents.js ga xabar: bo'lim qurildi → kursor-agentlar ichini tayyorlaydi */
  function fire(el) {
    try { document.dispatchEvent(new CustomEvent('xol:built', { detail: { el: el } })); } catch (e) {}
  }

  function maxScroll() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  /* Loader ostida darhol yashiramiz — flash bo'lmasin. */
  root.classList.add('is-building');
  try { history.scrollRestoration = 'manual'; } catch (e) {}
  try { window.scrollTo(0, 0); } catch (e) {}

  function createLayer() {
    layer = document.createElement('div');
    layer.className = 'build-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML =
      '<div class="build-grid"></div>' +
      '<div class="build-hud" role="status" aria-live="polite">' +
        '<span class="build-mouse" aria-hidden="true"><i></i></span>' +
        '<span class="build-state">Pastga scroll</span>' +
        '<span class="build-pct">000%</span>' +
        '<span class="build-track"><i></i></span>' +
      '</div>';
    document.body.appendChild(layer);
    grid = layer.querySelector('.build-grid');
    hudState = layer.querySelector('.build-state');
    hudPct = layer.querySelector('.build-pct');
    hudBar = layer.querySelector('.build-track > i');
  }

  function makeCursors() {
    if (!grid) return;
    grid.innerHTML = '';
    cursors = [];
    activeCount = 0;

    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var cols = clamp(Math.ceil(vw / 104), 4, 14);
    var rows = clamp(Math.ceil(vh / 96), 4, 10);
    var cellW = vw / cols;
    var cellH = vh / rows;
    var list = [];
    var max = 112;

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if (list.length >= max) break;
        list.push({
          x: (c + 0.5) * cellW + (Math.random() - 0.5) * cellW * 0.36,
          y: (r + 0.5) * cellH + (Math.random() - 0.5) * cellH * 0.36
        });
      }
    }

    /* Yuqoridan pastga to'lqin — #hero dan boshlanadi. */
    list.sort(function (a, b) { return (a.y - b.y) || (a.x - b.x); });

    var frag = document.createDocumentFragment();
    var named = 0;
    var every = Math.max(7, Math.round(list.length / 6));
    list.forEach(function (p, i) {
      var el = document.createElement('span');
      el.className = 'bc';
      el.style.setProperty('--x', p.x.toFixed(1) + 'px');
      el.style.setProperty('--y', p.y.toFixed(1) + 'px');
      el.style.setProperty('--r', (Math.random() * 28 - 14).toFixed(1) + 'deg');
      el.style.setProperty('--d', ((i % 7) * 22) + 'ms');
      el.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3l14 8.5-6.2 1.2L9.4 20z"/></svg>';
      /* Figma multiplayer uslubi: ba'zi kursorlar ismli va rangli */
      if (named < 6 && i % every === 3) {
        var nm = NAMES[named++];
        el.classList.add('has-name');
        el.style.setProperty('--c', nm[1]);
        el.insertAdjacentHTML('beforeend', '<b class="bn">' + nm[0] + '</b>');
      }
      frag.appendChild(el);
      cursors.push(el);
    });
    grid.appendChild(frag);
  }

  function activate(i, quiet) {
    var el = cursors[i];
    if (!el || el.classList.contains('on')) return;
    el.classList.add('on');
    if (quiet) el.classList.add('quiet');
  }

  function updateHud(pct, finished) {
    var n = Math.round(pct * 100);
    if (n !== lastPct) {
      lastPct = n;
      if (hudPct) hudPct.textContent = ('00' + n).slice(-3) + '%';
      if (hudBar) hudBar.style.width = n + '%';
    }
    var text = finished ? 'Tayyor' : (armed ? "Yig'ilmoqda" : 'Pastga scroll');
    if (hudState && text !== lastState) {
      lastState = text;
      hudState.textContent = text;
    }
    if (hudPct) hudPct.classList.toggle('is-live', armed || finished);
  }

  function buildAll() {
    for (var i = 0; i < targets.length; i++) {
      var fresh = !targets[i].classList.contains('is-built');
      targets[i].classList.add('is-built');
      if (fresh) fire(targets[i]);
    }
    root.classList.add('is-hero-built');
    for (var j = 0; j < cursors.length; j++) activate(j, false);
    activeCount = cursors.length;
  }

  function complete() {
    if (done) return;
    done = true;
    buildAll();
    updateHud(1, true);
    unbind();

    setTimeout(function () {
      if (layer) layer.classList.add('is-done');
      root.classList.add('is-build-done');
    }, 350);

    setTimeout(function () {
      root.classList.remove('is-building');
      setTimeout(function () {
        if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
        layer = null;
      }, 2000);
    }, 1050);
  }

  /* Selection frame: bo'lim qurilganda burchakdan tortilib, 8 handle va
     "W × H" yorlig'i bilan ismli kursor cho'zadi (Figma resize hissi).
     Hammasi fixed qatlamda, bo'lim layoutiga tegmaydi. */
  function showFrame(el) {
    try {
      if (!layer || el.classList.contains('site-header')) return;
      var r0 = el.getBoundingClientRect();
      if (r0.width < 80 || r0.height < 80) return;
      var nm = NAMES[frameN++ % NAMES.length];
      var f = document.createElement('div');
      f.className = 'bf';
      f.style.setProperty('--c', nm[1]);
      f.innerHTML =
        '<div class="bf-box"><i class="tl"></i><i class="tr"></i><i class="bl"></i><i class="br"></i></div>' +
        '<div class="bf-cur"><svg viewBox="0 0 24 24"><path d="M5 3l14 8.5-6.2 1.2L9.4 20z"/></svg>' +
        '<span><b>' + nm[0] + '</b> <em></em></span></div>';
      layer.appendChild(f);
      var box = f.querySelector('.bf-box');
      var cur = f.querySelector('.bf-cur');
      var lab = f.querySelector('em');
      var t0 = performance.now();
      var dead = false;
      setTimeout(function () { f.classList.add('out'); }, 1500);
      setTimeout(function () { dead = true; if (f.parentNode) f.parentNode.removeChild(f); }, 2100);
      (function step(now) {
        if (dead || !f.parentNode) return;
        var r = el.getBoundingClientRect();
        var p = clamp((now - t0) / 950, 0, 1);
        var e = 1 - Math.pow(1 - p, 3);
        f.style.transform = 'translate(' + r.left.toFixed(1) + 'px,' + r.top.toFixed(1) + 'px)';
        f.style.width = r.width.toFixed(1) + 'px';
        f.style.height = r.height.toFixed(1) + 'px';
        var cx = clamp(r.width * e, 0, r.width);
        var cy = clamp(r.height * e, 0, r.height);
        /* kursor viewport ichida qolsin */
        var ax = clamp(r.left + cx, 10, window.innerWidth - 150) - r.left;
        var ay = clamp(r.top + cy, 10, window.innerHeight - 40) - r.top;
        cur.style.transform = 'translate(' + ax.toFixed(1) + 'px,' + ay.toFixed(1) + 'px)';
        if (p < 1) lab.textContent = Math.round(r.width * e) + ' × ' + Math.round(r.height * e);
        else lab.textContent = Math.round(r.width) + ' × ' + Math.round(r.height);
        requestAnimationFrame(step);
      })(t0);
    } catch (err) { /* dekor — xato sahifani buzmasin */ }
  }

  function sync() {
    if (!started || done) return;
    try {
      var max = maxScroll();
      var y = clamp(window.scrollY || 0, 0, max);
      maxReached = Math.max(maxReached, y);
      var pct = max > 0 ? clamp(maxReached / max, 0, 1) : 1;

      if (!armed) {
        if ((window.scrollY || 0) > 2) armed = true;
        else { updateHud(0, false); return; }
      }

      var want = Math.round(pct * cursors.length);
      if (want > activeCount) {
        for (var i = activeCount; i < want; i++) activate(i, false);
        activeCount = want;
      }

      var vh = window.innerHeight;
      for (var t = 0; t < targets.length; t++) {
        var el = targets[t];
        if (el.classList.contains('is-built')) continue;
        var r = el.getBoundingClientRect();
        /* Ekranning 90% chizig'idan o'tgan (yoki undan yuqorida qolgan)
           har bir blok qurilgan hisoblanadi — tez scrollda ham
           o'tkazib yuborilmaydi. */
        if (r.top < vh * 0.9) {
          el.classList.add('is-built');
          if (el.id === 'hero') root.classList.add('is-hero-built');
          showFrame(el);
          fire(el);
        }
      }

      updateHud(pct, false);

      if (maxReached >= max - 2) complete();
    } catch (e) {
      /* Har qanday xatoda sahifani ochib yuboramiz. */
      complete();
    }
  }

  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      sync();
    });
  }

  function onWheel(e) {
    if (!started || done || e.ctrlKey) return;
    if (root.classList.contains('lb-lock')) return;
    var max = maxScroll();
    if (max <= 0) return;
    var d = e.deltaY;
    if (e.deltaMode === 1) d *= 16;
    else if (e.deltaMode === 2) d *= window.innerHeight;
    if (!d) return;
    var y = window.scrollY || 0;
    if ((d < 0 && y <= 0) || (d > 0 && y >= max - 1)) return;
    e.preventDefault();
    /* Pastga — 2x sekin (qurilish); yuqoriga — normal tezlik. */
    window.scrollBy(0, d * (d > 0 ? 0.5 : 1));
  }

  /* Telefon: barmoq bilan pastga surish ham 2x sekin; yuqoriga — normal. */
  var touchY = 0, touchOne = false;
  function onTouchStart(e) {
    if (!started || done) return;
    touchOne = e.touches.length === 1;
    if (touchOne) touchY = e.touches[0].clientY;
  }
  function onTouchMove(e) {
    if (!started || done || !touchOne || e.touches.length !== 1) return;
    if (root.classList.contains('lb-lock')) return;
    var y = e.touches[0].clientY;
    var d = touchY - y;
    touchY = y;
    if (!d) return;
    var max = maxScroll();
    if (max <= 0) return;
    var sy = window.scrollY || 0;
    if ((d < 0 && sy <= 0) || (d > 0 && sy >= max - 1)) return;
    if (e.cancelable) e.preventDefault();
    window.scrollBy(0, d * (d > 0 ? 0.5 : 1));
  }

  function onKey(e) {
    if (!started || done) return;
    var tag = (e.target && e.target.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag) || (e.target && e.target.isContentEditable)) return;
    if ((e.key === ' ' || e.key === 'Spacebar') && /^A$|^BUTTON$/.test(tag)) return;

    /* v4: Esc / End — introni o'tkazib yuborish */
    if (e.key === 'Escape' || e.key === 'End') {
      e.preventDefault();
      complete();
      if (e.key === 'End') window.scrollTo(0, maxScroll());
      return;
    }

    var step = 0;
    if (e.key === 'ArrowDown') step = 20;
    else if (e.key === 'ArrowUp') step = -40;
    else if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'PageDown') step = window.innerHeight * 0.45;
    else if (e.key === 'PageUp') step = -window.innerHeight * 0.9;
    if (!step) return;
    e.preventDefault();
    window.scrollBy(0, step);
  }

  function onResize() {
    if (!started || done) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      try {
        var keep = activeCount;
        makeCursors();
        for (var i = 0; i < keep && i < cursors.length; i++) activate(i, true);
        activeCount = Math.min(keep, cursors.length);
        sync();
      } catch (e) { complete(); }
    }, 180);
  }

  function bind() {
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('keydown', onKey, false);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
  }

  function unbind() {
    window.removeEventListener('wheel', onWheel, false);
    window.removeEventListener('touchstart', onTouchStart, false);
    window.removeEventListener('touchmove', onTouchMove, false);
    window.removeEventListener('keydown', onKey, false);
    window.removeEventListener('scroll', onScroll, false);
    window.removeEventListener('resize', onResize, false);
  }

  function collect() {
    targets = [];
    var nodes = document.querySelectorAll('.site-header, main > .section, .site-footer');
    for (var i = 0; i < nodes.length; i++) targets.push(nodes[i]);
  }

  function start() {
    if (started || done) return;
    try {
      started = true;
      try { window.scrollTo(0, 0); } catch (e) {}
      createLayer();
      collect();
      makeCursors();
      bind();
      updateHud(0, false);
      if (maxScroll() <= 2) { complete(); return; }
      requestAnimationFrame(sync);
    } catch (e) {
      abort();
    }
  }

  function abort() {
    if (done) return;
    done = true;
    try { unbind(); } catch (e) {}
    root.classList.remove('is-building');
    root.classList.add('is-build-done');
    if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
    layer = null;
  }

  function boot() {
    if (started || done) return;
    if (!window.__xolericLoaded) return;
    clearInterval(bootTimer);
    clearTimeout(failsafe);
    setTimeout(start, 320);
  }

  if (window.__xolericLoaded) {
    setTimeout(start, 320);
  } else {
    bootTimer = setInterval(boot, 80);
    /* app.js o'lib qolsa, inline failsafe sahifani ochadi — biz ham qo'shilamiz. */
    failsafe = setTimeout(function () {
      if (!started && !done) abort();
    }, 5600);
  }
})();
