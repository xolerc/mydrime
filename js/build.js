/* ═══════════════════════════════════════════════════════════
   xoleric — BUILD SCROLL · AGENT KURSORLAR
   Loaderdan keyin sahifa "toza" holatda boshlanadi: faqat fon.
   Pastga scroll qilinganda har bir element oldiga 3 ta agent
   uchib keladi (tahlil / shakl / rang / matn): punktir reja ramka,
   burchakdan oyna tortish + shakl o'zgarishi, rang sinovi va
   harf-harf yozish. Natija (rang + shakl) saqlanadi.
   SAFETY: prefers-reduced-motion, JS xatosi yoki app.js o'lsa —
   build o'chadi va sahifa normal ko'rinadi.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  if (reduce) return;

  var root = document.documentElement;
  var started = false;
  var done = false;
  var armed = false;
  var targets = [];
  var layer = null;
  var hudState = null;
  var hudPct = null;
  var hudBar = null;
  var active = [];
  var maxReached = 0;
  var raf = 0;
  var lastPct = -1;
  var lastState = '';
  var bootTimer = 0;
  var failsafe = 0;
  var resizeTimer = 0;

  /* Demo palitrasi — agentlar shu ranglarni sinab ko'radi. */
  var PAL = [
    ['#7cf7ff', '#001318'],
    ['#ff5d8f', '#24010d'],
    ['#ffd166', '#1c1400'],
    ['#8b7cff', '#0d0924'],
    ['#3ddc97', '#001a0f'],
    ['#1f2330', '#eceff4']
  ];
  var RAD = ['0px', '10px', '28px', '999px'];
  var CORNERS = [
    { ox: 0, oy: 0 },
    { ox: 1, oy: 0 },
    { ox: 0, oy: 1 },
    { ox: 1, oy: 1 }
  ];

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function pick(a) { return a[Math.random() * a.length | 0]; }
  function rand(n) { return Math.random() * n; }

  function tween(ms, fn) {
    return new Promise(function (res) {
      var t0 = performance.now();
      (function frame(now) {
        var t = Math.min((now - t0) / ms, 1);
        fn(ease(t));
        if (t < 1) requestAnimationFrame(frame);
        else res();
      })(t0);
    });
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
      '<div class="build-hud" role="status" aria-live="polite">' +
        '<span class="build-mouse" aria-hidden="true"><i></i></span>' +
        '<span class="build-state">Pastga scroll</span>' +
        '<span class="build-pct">000%</span>' +
        '<span class="build-track"><i></i></span>' +
      '</div>';
    document.body.appendChild(layer);
    hudState = layer.querySelector('.build-state');
    hudPct = layer.querySelector('.build-pct');
    hudBar = layer.querySelector('.build-track > i');
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

  /* ── AGENT KURSORLAR ───────────────────────────────────── */

  function place(c) {
    c.node.style.transform = 'translate3d(' + c.x.toFixed(1) + 'px,' + c.y.toFixed(1) + 'px,0)';
  }

  function cursor(label, hue) {
    var node = document.createElement('div');
    node.className = 'build-cursor';
    node.setAttribute('aria-hidden', 'true');
    var color = 'hsl(' + hue + ' 90% 62%)';
    node.innerHTML =
      '<svg viewBox="0 0 18 18" width="18" height="18"><path d="M2 1l13 7-6 1.5L7 16z" fill="' + color + '" stroke="#05070c" stroke-width="1.2" stroke-linejoin="round"/></svg>' +
      '<i style="background:' + color + '">' + label + '</i>';
    document.body.appendChild(node);
    var c = { node: node, x: rand(window.innerWidth), y: rand(window.innerHeight) };
    c.label = function (text) {
      var i = node.querySelector('i');
      if (i) i.textContent = text;
    };
    c.fade = function () {
      node.style.transition = 'opacity .4s ease';
      node.style.opacity = '0';
      setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 450);
    };
    place(c);
    return c;
  }

  /* Agent ma'lum bir nuqtaga uchadi (get() har kadrda yangi o'lcham oladi). */
  function fly(c, get, ms) {
    var x0 = c.x, y0 = c.y;
    return tween(ms, function (e) {
      var p = get();
      c.x = x0 + (p[0] - x0) * e;
      c.y = y0 + (p[1] - y0) * e;
      place(c);
    });
  }

  function titleInside(el) {
    return el.querySelector('.hero-name, .section-title, .logo, h2, h1, .footer-note');
  }

  /* Matn agenti harf-harf yozadi: ▍ kursori faqat yozilayotgan qismda. */
  function typeText(node, text, per) {
    return new Promise(function (res) {
      var html = node.innerHTML;
      node.textContent = '';
      var typed = document.createElement('span');
      typed.className = 'build-typing is-typing';
      var rest = document.createElement('span');
      rest.className = 'build-typing-rest';
      rest.textContent = text;
      node.appendChild(typed);
      node.appendChild(rest);
      var i = 0;
      (function step() {
        if (node.parentNode && i < text.length) {
          i++;
          typed.textContent = text.slice(0, i);
          rest.textContent = text.slice(i);
          setTimeout(step, per);
        } else {
          typed.classList.remove('is-typing');
          node.innerHTML = html;
          res();
        }
      })();
    });
  }

  function buildElement(el, delay) {
    if (!el || el.dataset.buildStarted) return;
    el.dataset.buildStarted = '1';
    el.classList.add('is-built');
    if (el.id === 'hero') root.classList.add('is-hero-built');

    var rect = el.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;

    var ghost = document.createElement('div');
    ghost.className = 'build-ghost';
    document.body.appendChild(ghost);
    var live = true;
    (function track() {
      if (!live) return;
      var r = el.getBoundingClientRect();
      ghost.style.left = r.left + 'px';
      ghost.style.top = r.top + 'px';
      ghost.style.width = r.width + 'px';
      ghost.style.height = r.height + 'px';
      requestAnimationFrame(track);
    })();

    var hue = rand(360) | 0;
    var A = cursor('tahlil', hue);
    var B = cursor('tahlil', (hue + 120) % 360);
    var C = cursor('tahlil', (hue + 240) % 360);
    var titleNode = titleInside(el);
    var savedHTML = titleNode ? titleNode.innerHTML : null;
    var inst = { finish: null };
    var cleaned = false;

    function finish() {
      if (cleaned) return;
      cleaned = true;
      live = false;
      if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
      if (titleNode && savedHTML !== null) {
        try { titleNode.innerHTML = savedHTML; } catch (e) {}
      }
      A.fade(); B.fade(); C.fade();
      el.style.clipPath = 'none';
      el.style.willChange = '';
      el.classList.add('build-el-done');
      var i = active.indexOf(inst);
      if (i > -1) active.splice(i, 1);
    }
    inst.finish = finish;
    active.push(inst);

    function R() { return el.getBoundingClientRect(); }

    (async function run() {
      try {
        if (delay) await sleep(delay);

        /* 1. Agentlar elementga uchib keladi — o'lchab, o'ylab turadi. */
        var ua = 0.15 + rand(0.7), va = 0.15 + rand(0.7);
        var ub = 0.2 + rand(0.6), vb = 0.2 + rand(0.6);
        var uc = 0.2 + rand(0.6), vc = 0.2 + rand(0.6);
        await Promise.all([
          fly(A, function () { var r = R(); return [r.left + r.width * ua, r.top + r.height * va]; }, 520),
          fly(B, function () { var r = R(); return [r.left + r.width * ub, r.top + r.height * vb]; }, 600),
          fly(C, function () { var r = R(); return [r.left + r.width * uc, r.top + r.height * vc]; }, 680)
        ]);
        await sleep(180);

        /* 2. Shakl agenti: tasodifiy burchakdan oynani tortadi. */
        var corner = pick(CORNERS);
        var ox = corner.ox, oy = corner.oy;
        A.label('shakl');
        await fly(A, function () {
          var r = R();
          return [ox ? r.right : r.left, oy ? r.bottom : r.top];
        }, 320);
        var radius = pick(RAD);
        el.style.borderRadius = '50%';
        el.style.transition = 'border-radius 1s cubic-bezier(.2,.9,.27,1)';
        requestAnimationFrame(function () { el.style.borderRadius = radius; });

        /* 3. Rang agenti: o'rtaga borib bir necha rangni sinaydi. */
        B.label('rang');
        var colorDone = (async function () {
          await fly(B, function () { var r = R(); return [r.left + r.width / 2, r.top + r.height / 2]; }, 300);
          for (var i = 0; i < 6; i++) {
            var p = pick(PAL);
            el.style.background = p[0];
            el.style.color = p[1];
            B.label(p[0]);
            await sleep(110);
          }
          var fin = pick(PAL);
          el.style.background = fin[0];
          el.style.color = fin[1];
          B.label('rang ' + fin[0]);
        })();

        /* 4. Oyna burchakdan ochiladi; shakl agenti uning qirrasini sudraydi. */
        var shapeDone = tween(900, function (e) {
          var r = R(), p = (1 - e) * 100;
          el.style.clipPath = 'inset(' + (oy ? p : 0) + '% ' + (ox ? 0 : p) + '% ' + (oy ? 0 : p) + '% ' + (ox ? p : 0) + '%)';
          A.x = ox ? r.right - r.width * e : r.left + r.width * e;
          A.y = oy ? r.bottom - r.height * e : r.top + r.height * e;
          place(A);
        });
        await Promise.all([colorDone, shapeDone]);
        A.label('tayyor');
        el.style.clipPath = 'none';

        /* 5. Matn agenti boshiga borib, harf-harf yozadi. */
        await fly(C, function () {
          var r = R();
          var t = titleNode ? titleNode.getBoundingClientRect() : r;
          return [t.left + 14, Math.max(r.top + 14, t.top + t.height / 2)];
        }, 380);
        if (titleNode && savedHTML !== null) {
          C.label('yozyapti');
          var text = titleNode.textContent.trim();
          var per = Math.min(40, 1400 / Math.max(text.length, 1));
          await typeText(titleNode, text, per);
        }
        await sleep(120);

        /* 6. Agentlar so'nadi — rang va shakl elementda qoladi. */
        finish();
      } catch (e) {
        finish();
      }
    })();
  }

  function buildAll() {
    for (var i = 0; i < targets.length; i++) {
      targets[i].classList.add('is-built');
      if (targets[i].id === 'hero') root.classList.add('is-hero-built');
    }
  }

  function finishAll() {
    for (var i = active.length - 1; i >= 0; i--) {
      try { active[i].finish(); } catch (e) {}
    }
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
      finishAll();
      root.classList.remove('is-building');
      setTimeout(function () {
        if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
        layer = null;
      }, 900);
    }, 1050);
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

      var vh = window.innerHeight;
      var n = 0;
      for (var t = 0; t < targets.length; t++) {
        var el = targets[t];
        if (el.dataset.buildStarted) continue;
        var r = el.getBoundingClientRect();
        /* Ekranning 90% chizig'idan o'tgan blok quriladi — tez
           scrollda ham o'tkazib yuborilmaydi. */
        if (r.top < vh * 0.9) {
          buildElement(el, (n++) * 300);
        }
      }

      updateHud(pct, false);
      if (maxReached >= max - 2) complete();
    } catch (e) {
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
    window.scrollBy(0, step);
  }

  function onResize() {
    if (!started || done) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(sync, 180);
  }

  function bind() {
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey, false);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
  }

  function unbind() {
    window.removeEventListener('wheel', onWheel, false);
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
    finishAll();
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
