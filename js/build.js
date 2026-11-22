/* ═══════════════════════════════════════════════════════════
   xoleric — BUILD SCROLL v2 (oyna-cho'zish uslubi)
   Loaderdan keyin faqat toza fon. Pastga scroll (2x sekin) paytida
   har bir bo'lim #hero dan boshlab 0 dan "oyna cho'zilgandek" o'sadi
   (chap-yuqoridan o'ng-pastga), kursorlar to'dasi uning burchagi
   va qirralarini sudrab boradi. Hammasi qurilgach effekt butunlay
   o'chadi — yuqoriga qaytganda hech narsa o'zgarmaydi.
   Faqat to'liq sahifa yuklanishida (refresh / yangi kirish).
   SAFETY: reduced-motion, JS xatosi yoki app.js o'lsa — build o'chadi.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  if (reduce) return;

  var SLOW = 0.5;          /* pastga scroll tezligi (0.5 = 2x sekin) */
  var NCUR = 16;           /* kursorlar soni */

  var root = document.documentElement;
  var started = false, done = false, armed = false, forced = false;
  var items = [], header = null, curs = [];
  var layer, hudState, hudPct, hudBar;
  var maxReached = 0, lastPct = -1, lastState = '';
  var raf = 0, bootTimer = 0, failsafe = 0;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function maxScroll() { return Math.max(0, root.scrollHeight - window.innerHeight); }

  /* Loader ostida darhol yashiramiz — flash bo'lmasin. */
  root.classList.add('is-building');
  try { history.scrollRestoration = 'manual'; } catch (e) {}
  try { window.scrollTo(0, 0); } catch (e) {}

  function createLayer() {
    layer = document.createElement('div');
    layer.className = 'build-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML =
      '<div class="build-hud" role="status" aria-live="polite">' +
        '<span class="build-mouse" aria-hidden="true"><i></i></span>' +
        '<span class="build-state">Pastga scroll</span>' +
        '<span class="build-pct">000%</span>' +
        '<span class="build-track"><i></i></span>' +
      '</div>';
    var svg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3l14 8.5-6.2 1.2L9.4 20z"/></svg>';
    for (var i = 0; i < NCUR; i++) {
      var el = document.createElement('span');
      el.className = 'bc';
      el.innerHTML = svg;
      layer.appendChild(el);
      curs.push({ el: el, ph: Math.random() * 6.28, u: 0.12 + Math.random() * 0.8 });
    }
    document.body.appendChild(layer);
    hudState = layer.querySelector('.build-state');
    hudPct = layer.querySelector('.build-pct');
    hudBar = layer.querySelector('.build-track > i');
  }

  function collect() {
    var nodes = document.querySelectorAll('main > .section, .site-footer');
    for (var i = 0; i < nodes.length; i++) {
      items.push({ el: nodes[i], tW: 0, tH: 0, dW: 0, dH: 0, rate: i === 0 ? 0.045 : 0.13, built: false });
    }
    header = document.querySelector('.site-header');
  }

  function updateHud(pct, finished) {
    var n = Math.round(pct * 100);
    if (n !== lastPct) {
      lastPct = n;
      if (hudPct) hudPct.textContent = ('00' + n).slice(-3) + '%';
      if (hudBar) hudBar.style.width = n + '%';
    }
    var text = finished ? 'Tayyor' : (armed ? "Yig'ilmoqda" : 'Pastga scroll');
    if (hudState && text !== lastState) { lastState = text; hudState.textContent = text; }
    if (hudPct) hudPct.classList.toggle('is-live', armed || finished);
  }

  function applyClip(it) {
    var rad = 14 * (1 - Math.min(it.dW, it.dH));
    it.el.style.clipPath = 'inset(0 ' + ((1 - it.dW) * 100).toFixed(2) + '% ' +
      ((1 - it.dH) * 100).toFixed(2) + '% 0 round ' + rad.toFixed(1) + 'px)';
  }

  function moveCursors(act, now) {
    var vw = window.innerWidth, vh = window.innerHeight, t = now / 1000;
    for (var i = 0; i < curs.length; i++) {
      var c = curs[i], it = act.length ? act[i % act.length] : null;
      if (!it) { c.el.style.opacity = 0; continue; }
      var r = it.el.getBoundingClientRect();
      var x = r.left + r.width * it.dW, y = r.top + r.height * it.dH;   /* cho'zilayotgan burchak */
      var k = i % 3;
      if (k === 1) y = r.top + (y - r.top) * c.u;                        /* o'ng qirra bo'ylab */
      else if (k === 2) x = r.left + (x - r.left) * c.u;                 /* pastki qirra bo'ylab */
      x += Math.sin(t * 2.1 + c.ph) * 9;
      y += Math.cos(t * 1.7 + c.ph) * 9;
      x = clamp(x, 6, vw - 24); y = clamp(y, 6, vh - 24);
      c.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
      c.el.style.opacity = '.9';
    }
  }

  function tick(now) {
    raf = 0;
    if (done) return;
    try {
      var vh = window.innerHeight, max = maxScroll();
      var y = clamp(window.scrollY || 0, 0, max);
      maxReached = Math.max(maxReached, y);
      if (!armed && y > 2) armed = true;

      var act = [], all = true;
      if (armed) {
        if (header) header.classList.add('is-built');
        if (maxReached >= max - 2) forced = true;
        for (var i = 0; i < items.length; i++) {
          var it = items[i];
          if (it.built) continue;
          var tW, tH;
          if (forced || i === 0) { tW = tH = 1; }                 /* hero o'zi quriladi */
          else {
            var v = vh * 0.96 - it.el.getBoundingClientRect().top;
            tW = ease(clamp(v / (vh * 0.5), 0, 1));                /* kengayish */
            tH = clamp(v / Math.max(it.el.offsetHeight, 1), 0, 1); /* pastga to'lish */
          }
          it.tW = Math.max(it.tW, tW);                              /* faqat oldinga — orqaga qaytmaydi */
          it.tH = Math.max(it.tH, tH);
          it.dW += (it.tW - it.dW) * it.rate; if (it.tW - it.dW < 0.002) it.dW = it.tW;
          it.dH += (it.tH - it.dH) * it.rate; if (it.tH - it.dH < 0.002) it.dH = it.tH;
          if (it.dW >= 1 && it.dH >= 1) {
            it.built = true;
            it.el.style.clipPath = '';
            it.el.classList.add('is-built');
          } else {
            all = false;
            applyClip(it);
            if (it.dW > 0.001 || it.dH > 0.001) act.push(it);
          }
          if (i === 0 && it.dW > 0.5) root.classList.add('is-hero-built');
        }
      } else { all = false; }

      var pct = max > 0 ? clamp(maxReached / max, 0, 1) : 1;
      updateHud(pct, false);
      moveCursors(act, now || 0);

      if (armed && forced && all) { complete(); return; }
    } catch (e) { abort(); return; }
    raf = requestAnimationFrame(tick);
  }

  function complete() {
    if (done) return;
    done = true;
    unbind();
    items.forEach(function (it) { it.el.style.clipPath = ''; it.el.classList.add('is-built'); });
    if (header) header.classList.add('is-built');
    root.classList.add('is-hero-built');
    curs.forEach(function (c) { c.el.style.opacity = 0; });
    updateHud(1, true);
    setTimeout(function () { if (layer) layer.classList.add('is-done'); root.classList.add('is-build-done'); }, 350);
    setTimeout(function () {
      root.classList.remove('is-building');
      setTimeout(function () { if (layer && layer.parentNode) layer.parentNode.removeChild(layer); layer = null; }, 900);
    }, 1050);
  }

  function abort() {
    if (done) return;
    done = true;
    try { unbind(); } catch (e) {}
    items.forEach(function (it) { it.el.style.clipPath = ''; });
    root.classList.remove('is-building');
    root.classList.add('is-build-done');
    if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
    layer = null;
  }

  /* ── 2x sekin scroll: pastga sekin, yuqoriga normal ── */
  function lbOpen() { return !!document.querySelector('dialog[open]'); }

  function onWheel(e) {
    if (!started || done || e.ctrlKey || lbOpen()) return;
    var max = maxScroll(); if (max <= 0) return;
    var d = e.deltaY;
    if (e.deltaMode === 1) d *= 16; else if (e.deltaMode === 2) d *= window.innerHeight;
    if (!d) return;
    var y = window.scrollY || 0;
    if ((d < 0 && y <= 0) || (d > 0 && y >= max - 1)) return;
    e.preventDefault();
    armed = true;
    window.scrollBy(0, d * (d > 0 ? SLOW : 1));
  }

  var ty = 0, tv = 0, inertia = 0, touching = false;
  function onTS(e) {
    if (e.touches.length !== 1 || lbOpen()) { touching = false; return; }
    touching = true; ty = e.touches[0].clientY; tv = 0;
    cancelAnimationFrame(inertia);
  }
  function onTM(e) {
    if (!touching || done) return;
    var y = e.touches[0].clientY, dy = ty - y; ty = y;
    var d = dy * (dy > 0 ? SLOW : 1);
    e.preventDefault();
    armed = true; tv = d;
    window.scrollBy(0, d);
  }
  function onTE() {
    if (!touching) return;
    touching = false;
    (function glide() {
      tv *= 0.93;
      if (Math.abs(tv) < 0.4 || done) return;
      window.scrollBy(0, tv);
      inertia = requestAnimationFrame(glide);
    })();
  }

  function onKey(e) {
    if (!started || done) return;
    var tag = (e.target && e.target.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag) || (e.target && e.target.isContentEditable)) return;
    if ((e.key === ' ' || e.key === 'Spacebar') && /^A$|^BUTTON$/.test(tag)) return;
    var step = 0;
    if (e.key === 'ArrowDown') step = 20;
    else if (e.key === 'ArrowUp') step = -40;
    else if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'PageDown') step = window.innerHeight * 0.45;
    else if (e.key === 'PageUp') step = -window.innerHeight * 0.9;
    if (!step) return;
    e.preventDefault();
    armed = true;
    window.scrollBy(0, step);
  }

  function bind() {
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTS, { passive: true });
    window.addEventListener('touchmove', onTM, { passive: false });
    window.addEventListener('touchend', onTE, { passive: true });
    window.addEventListener('keydown', onKey, false);
  }
  function unbind() {
    window.removeEventListener('wheel', onWheel, false);
    window.removeEventListener('touchstart', onTS, false);
    window.removeEventListener('touchmove', onTM, false);
    window.removeEventListener('touchend', onTE, false);
    window.removeEventListener('keydown', onKey, false);
  }

  function start() {
    if (started || done) return;
    try {
      started = true;
      try { window.scrollTo(0, 0); } catch (e) {}
      createLayer(); collect(); bind(); updateHud(0, false);
      if (maxScroll() <= 2 || !items.length) { complete(); return; }
      raf = requestAnimationFrame(tick);
    } catch (e) { abort(); }
  }

  function boot() {
    if (started || done || !window.__xolericLoaded) return;
    clearInterval(bootTimer); clearTimeout(failsafe);
    setTimeout(start, 320);
  }

  if (window.__xolericLoaded) {
    setTimeout(start, 320);
  } else {
    bootTimer = setInterval(boot, 80);
    failsafe = setTimeout(function () { if (!started && !done) abort(); }, 5600);
  }
})();
