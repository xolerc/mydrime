/* ═══════════════════════════════════════════════════════════
   xoleric — BUILD SCROLL (demo uslubi)
   Har bir bo'lim o'z "oynasi" bilan ochiladi: clip-path chap
   burchakdan o'nga/pastga cho'ziladi, atrofida 6 ta kursor
   harakatlanadi. #hero yuklangach 2.4s da avtomatik quriladi,
   shu vaqt ichida scroll qulflangan. Keyin pastga scroll 2x
   sekin; har bo'lim scroll pozitsiyasiga qarab quriladi.
   Qurilish faqat oldinga — yuqoriga qaytishda o'zgarmaydi.
   Hammasi qurilgach scroll odatiy tezlikka qaytadi.
   Har to'liq sahifa yuklanishida (refresh / yangi kirish) ishlaydi.
   SAFETY: prefers-reduced-motion, app.js xatosi yoki 5.6s timeout —
   build o'chadi, sahifa normal ochiladi.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  if (reduce) return;

  var SLOW = 0.5;          /* 2x sekin */
  var HERO_MS = 2400;      /* hero auto-build */
  var N = 6;               /* har bo'limdagi kursorlar soni */
  var ARROW = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2 1l14 8-6 2-3 6z" fill="#fff" stroke="#000" stroke-width="1.2" stroke-linejoin="round"/></svg>';

  var root = document.documentElement;
  var started = false;
  var done = false;
  var heroDone = false;
  var unlocked = false;
  var items = [];
  var t0 = 0;
  var raf = 0;
  var bootTimer = 0;
  var failsafe = 0;
  var lastTouchY = 0;
  var touchOne = false;

  function clamp(v) { return Math.max(0, Math.min(1, v)); }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function docMax() { return Math.max(0, document.documentElement.scrollHeight - window.innerHeight); }

  /* Loader ostida darhol yashiramiz — flash bo'lmasin. */
  root.classList.add('is-building');
  try { history.scrollRestoration = 'manual'; } catch (e) {}
  try { window.scrollTo(0, 0); } catch (e) {}

  function makeItem(el, isFooter) {
    var wrap = document.createElement('div');
    wrap.className = 'build-wrap';
    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(el);

    var layer = document.createElement('div');
    layer.className = 'build-cursors';
    layer.setAttribute('aria-hidden', 'true');
    wrap.appendChild(layer);

    var cs = [];
    for (var k = 0; k < N; k++) {
      var c = document.createElement('div');
      c.className = 'cur';
      c.innerHTML = ARROW;
      layer.appendChild(c);
      cs.push({
        el: c,
        ph: Math.random() * 6.28,
        jx: (Math.random() - .5) * 90,
        jy: (Math.random() - .5) * 90,
        sp: 1 + Math.random()
      });
    }

    el.style.clipPath = 'inset(0 100% 100% 0)';
    return { el: el, wrap: wrap, layer: layer, cs: cs, built: 0, fin: false, footer: !!isFooter };
  }

  function layout(it) {
    var wr = it.wrap.getBoundingClientRect();
    var sr = it.el.getBoundingClientRect();
    it.layer.style.left = (sr.left - wr.left) + 'px';
    it.layer.style.top = (sr.top - wr.top) + 'px';
    it.layer.style.width = sr.width + 'px';
    it.layer.style.height = sr.height + 'px';
  }

  function render(it, p, now) {
    var e = ease(p);
    it.el.style.clipPath = 'inset(0 ' + ((1 - e) * 100) + '% ' + ((1 - e) * 100) + '% 0)';
    layout(it);

    var r = it.el.getBoundingClientRect();
    var W = r.width;
    var H = r.height;
    var viewTop = Math.max(0, -r.top);
    var viewBottom = Math.min(H, -r.top + window.innerHeight);
    if (viewBottom < viewTop) viewBottom = viewTop;
    var band = Math.max(1, viewBottom - viewTop);
    var edgeX = W * e;
    var edgeY = Math.min(viewBottom - 8, Math.max(viewTop + 8, H * e));

    it.cs.forEach(function (c, k) {
      /* Kursorlar o'ng-pastki burchak atrofida "oyna cho'zayotgandek" tebranadi. */
      var s = now / 400 * c.sp + c.ph;
      var x = edgeX + c.jx * Math.sin(s) * (1 - e * .2);
      var y = edgeY + c.jy * Math.cos(s * 1.1) * (1 - e * .2);
      if (k % 3 === 1) { y = viewTop + band * (.2 + .15 * k); }   /* o'ng chet bo'ylab */
      if (k % 3 === 2) { x = W * e * (.2 + .15 * k); }             /* pastki chet bo'ylab */
      x = Math.min(W - 8, Math.max(0, x));
      y = Math.min(viewBottom - 8, Math.max(viewTop + 8, y));
      c.el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      c.el.style.opacity = (p > 0 && p < 1) ? 1 : 0;
    });
  }

  function tick(now) {
    if (!started || done) return;
    var vh = window.innerHeight;
    var y = window.scrollY || 0;
    var max = docMax();
    var atBottom = y >= max - 2;

    items.forEach(function (it, i) {
      var p;
      if (i === 0) {
        p = clamp((now - t0) / HERO_MS);
        if (p >= 1 && !heroDone) {
          heroDone = true;
          root.classList.add('is-hero-built');
        }
        if (atBottom) p = 1;
      } else if (it.footer) {
        var ftop = it.wrap.getBoundingClientRect().top + y;
        var entry = ftop - vh * 0.95;
        p = clamp((y - entry) / Math.max(1, max - entry));
        if (atBottom) p = 1;
      } else {
        var top = it.wrap.getBoundingClientRect().top + y;
        p = clamp((y + vh * 0.95 - top) / (vh * 0.9));
        if (atBottom) p = 1;
      }

      if (p > it.built) {
        it.built = p;
        render(it, p, now);
        if (p >= 1) it.fin = true;
      } else if (it.built < 1) {
        render(it, it.built, now);
      } else if (!it.fin) {
        render(it, 1, now);
        it.fin = true;
        it.el.style.clipPath = 'none';
      }
    });

    var allBuilt = items.every(function (it) { return it.built >= 1; });
    if (allBuilt && !done) {
      done = true;
      unlock();
      finish();
    }
    if (!done) raf = requestAnimationFrame(tick);
  }

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    window.removeEventListener('wheel', onWheel, false);
    window.removeEventListener('touchstart', onTouchStart, false);
    window.removeEventListener('touchmove', onTouchMove, false);
    window.removeEventListener('keydown', onKey, false);
    window.removeEventListener('resize', onResize, false);
    root.classList.remove('is-building');
  }

  function finish() {
    /* 250ms dan keyin kursor qatlamlarini olib tashlab, bo'limlarni
       asl DOM joyiga qaytaramiz — sahifa butunlay normal holatda qoladi. */
    setTimeout(function () {
      items.forEach(function (it) {
        it.el.style.clipPath = 'none';
        if (it.layer && it.layer.parentNode) it.layer.parentNode.removeChild(it.layer);
        if (it.wrap && it.wrap.parentNode) {
          it.wrap.parentNode.insertBefore(it.el, it.wrap);
          it.wrap.parentNode.removeChild(it.wrap);
        }
      });
      items = [];
    }, 250);
  }

  /* ===== 2x sekin scroll ===== */
  function onWheel(e) {
    if (!started || done) return;
    if (root.classList.contains('lb-lock')) return;
    e.preventDefault();
    if (!heroDone) return;
    var d = e.deltaY;
    if (e.deltaMode === 1) d *= 16;
    else if (e.deltaMode === 2) d *= window.innerHeight;
    window.scrollBy(0, d * SLOW);
  }

  function onTouchStart(e) {
    touchOne = !!(e.touches && e.touches.length === 1);
    if (touchOne && e.touches[0]) lastTouchY = e.touches[0].clientY;
  }

  /* Telefon: barmoq bilan pastga surish 2x sekin, yuqoriga — normal (ZIP'dagi yechim). */
  function onTouchMove(e) {
    if (!started || done) return;
    if (root.classList.contains('lb-lock')) return;
    e.preventDefault();
    if (!heroDone) return;
    if (!touchOne || !e.touches || e.touches.length !== 1) return;
    var y = e.touches[0].clientY;
    var d = lastTouchY - y;
    lastTouchY = y;
    if (!d) return;
    window.scrollBy(0, d * (d > 0 ? SLOW : 1));
  }

  function onKey(e) {
    if (!started || done) return;
    if (root.classList.contains('lb-lock')) return;
    var tag = (e.target && e.target.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag) || (e.target && e.target.isContentEditable)) return;
    if ((e.key === ' ' || e.key === 'Spacebar') && /^A$|^BUTTON$/.test(tag)) return;

    var keys = [' ', 'Spacebar', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'End', 'Home'];
    if (keys.indexOf(e.key) < 0) return;
    e.preventDefault();
    if (!heroDone) return;

    if (e.key === 'End') { window.scrollTo(0, docMax()); return; }
    if (e.key === 'Home') { window.scrollTo(0, 0); return; }

    var step = 0;
    if (e.key === 'ArrowDown') step = 20;
    else if (e.key === 'ArrowUp') step = -20;
    else if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'PageDown') step = window.innerHeight * 0.45;
    else if (e.key === 'PageUp') step = -window.innerHeight * 0.45;
    window.scrollBy(0, step);
  }

  function onResize() {
    if (!started || done) return;
    items.forEach(layout);
  }

  function lock() {
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('keydown', onKey, false);
    window.addEventListener('resize', onResize, { passive: true });
  }

  function start() {
    if (started || done) return;
    try {
      started = true;
      try { window.scrollTo(0, 0); } catch (e) {}
      var nodes = document.querySelectorAll('main > .section');
      for (var i = 0; i < nodes.length; i++) items.push(makeItem(nodes[i], false));
      var footer = document.querySelector('body > .site-footer');
      if (footer) items.push(makeItem(footer, true));
      if (!items.length) { abort(); return; }
      lock();
      t0 = performance.now();
      raf = requestAnimationFrame(tick);
    } catch (e) {
      abort();
    }
  }

  function abort() {
    if (done) return;
    done = true;
    try {
      window.removeEventListener('wheel', onWheel, false);
      window.removeEventListener('touchstart', onTouchStart, false);
      window.removeEventListener('touchmove', onTouchMove, false);
      window.removeEventListener('keydown', onKey, false);
      window.removeEventListener('resize', onResize, false);
    } catch (e) {}
    root.classList.remove('is-building');
    items.forEach(function (it) {
      it.el.style.clipPath = 'none';
      if (it.layer && it.layer.parentNode) it.layer.parentNode.removeChild(it.layer);
      if (it.wrap && it.wrap.parentNode) {
        it.wrap.parentNode.insertBefore(it.el, it.wrap);
        it.wrap.parentNode.removeChild(it.wrap);
      }
    });
    items = [];
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
    failsafe = setTimeout(function () {
      if (!started && !done) abort();
    }, 5600);
  }
})();
