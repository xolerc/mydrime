/* ═══════════════════════════════════════════════════════════
   xoleric — BUILD SCROLL · AGENT KURSORLAR v2
   Loaderdan keyin sahifa "toza" holatda boshlanadi: faqat fon.
   Pastga scroll qilinganda har bir element oldiga 3 ta agent
   uchib keladi: avval aylanib tahlil qiladi, keyin tasodifiy
   burchakdan eni va bo'yi mustaqil tezlikda tortib ochiladi,
   radius ikki marta almashadi, rang agenti aylanib rang sinaydi,
   matn agenti notekis tezlikda harf-harf yozadi.
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
  /* To'rtta tasodifiy burchak — chapga ham, o'ngga ham tortadi. */
  var CORNERS = [
    { ox: 0, oy: 0 },
    { ox: 1, oy: 0 },
    { ox: 0, oy: 1 },
    { ox: 1, oy: 1 }
  ];

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rand(n) { return Math.random() * n; }
  function pick(a) { return a[Math.random() * a.length | 0]; }
  function jit(n) { return (Math.random() - 0.5) * 2 * n; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* Inson qo'lidek: sekin boshlaydi, tezlashadi, oxirida sekinlashadi. */
  function easeHuman(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /* fn(eased, raw) — raw kerak: radius almashinuvi vaqtlarini bilish uchun. */
  function tween(ms, fn) {
    return new Promise(function (res) {
      var t0 = performance.now();
      (function frame(now) {
        var t = Math.min((now - t0) / ms, 1);
        fn(easeHuman(t), t);
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
    /* Bosish: kursor kichrayadi (tortishdan oldin va keyin). */
    c.press = function (ms) {
      node.classList.add('is-press');
      return sleep(ms || 130).then(function () { node.classList.remove('is-press'); });
    };
    c.fade = function () {
      node.style.transition = 'opacity .4s ease';
      node.style.opacity = '0';
      setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 450);
    };
    place(c);
    return c;
  }

  /* To'g'ri chiziq emas — egri (quadratic bezier) yo'l, yo'lda titrayish. */
  function curveFly(c, get, ms, bend) {
    var sx = c.x, sy = c.y;
    var cx = 0, cy = 0, ready = false;
    return tween(ms, function (e) {
      var p = get();
      if (!ready) {
        var dx = p[0] - sx, dy = p[1] - sy;
        var len = Math.sqrt(dx * dx + dy * dy) || 1;
        cx = (sx + p[0]) / 2 - dy / len * bend;
        cy = (sy + p[1]) / 2 + dx / len * bend;
        ready = true;
      }
      var u = 1 - e;
      var wobble = Math.sin(Math.PI * e);
      c.x = u * u * sx + 2 * u * e * cx + e * e * p[0] + jit(1.3) * wobble;
      c.y = u * u * sy + 2 * u * e * cy + e * e * p[1] + jit(1.3) * wobble;
      place(c);
    });
  }

  function pointAt(r, fx, fy) {
    return [r.left + r.width * fx, r.top + r.height * fy];
  }

  /* Tahlil: agent element atrofida aylanib chiqadi (egri, sekin-tez-sekin). */
  function orbit(c, getRect, rx, ry, ms, turns, phase) {
    var sx = c.x, sy = c.y;
    return tween(ms, function (e, raw) {
      var r = getRect();
      var a = phase + turns * Math.PI * 2 * e;
      var ox = r.left + r.width / 2 + Math.cos(a) * r.width * rx + jit(1.6);
      var oy = r.top + r.height / 2 + Math.sin(a) * r.height * ry + jit(1.6);
      var blend = Math.min(1, raw * 5);
      c.x = sx + (ox - sx) * blend;
      c.y = sy + (oy - sy) * blend;
      place(c);
    });
  }

  /* Rang agenti uchun qisqa aylanish segmenti — to'xtashlar orasida. */
  function orbitSegment(c, getRect, a0, a1, rx, ry, ms) {
    return tween(ms, function (e) {
      var r = getRect();
      var a = a0 + (a1 - a0) * e;
      c.x = r.left + r.width / 2 + Math.cos(a) * r.width * rx + jit(1.4);
      c.y = r.top + r.height / 2 + Math.sin(a) * r.height * ry + jit(1.4);
      place(c);
    });
  }

  function titleInside(el) {
    return el.querySelector('.hero-name, .section-title, .logo, h2, h1, .footer-note');
  }

  /* Harf-harf, notekis tezlik: tinish belgilarida va tasodifan pauza. */
  function typeText(node, text) {
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
        if (!node.parentNode || i >= text.length) {
          typed.classList.remove('is-typing');
          try { node.innerHTML = html; } catch (e) {}
          res();
          return;
        }
        var ch = text.charAt(i++);
        typed.textContent = text.slice(0, i);
        rest.textContent = text.slice(i);
        var per = 24 + rand(52);
        if (/[ .!?,:;—-]/.test(ch)) per += 80 + rand(120);
        if (Math.random() < 0.08) per += 130 + rand(90);
        setTimeout(step, per);
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
      if (titleNode && savedHTML !== null) {
        try { titleNode.innerHTML = savedHTML; } catch (e) {}
      }
      A.fade(); B.fade(); C.fade();
      el.style.clipPath = 'none';
      el.style.willChange = '';
      el.style.transition = '';
      el.classList.add('build-el-done');
      var i = active.indexOf(inst);
      if (i > -1) active.splice(i, 1);
    }
    inst.finish = finish;
    active.push(inst);

    function R() { return el.getBoundingClientRect(); }

    /* Suv foni (canvas#webgl-bg) global bo'lib qoladi — rang faqat matnda. */
    function applyColor(p) {
      el.style.background = 'transparent';
      el.style.color = p[1];
      el.style.borderColor = '';
      el.style.boxShadow = '';
    }

    /* Tortiladigan (harakatlanuvchi) burchak — tanlangan burchakning qarshisi. */
    function moving(corner, r) {
      return [corner.ox ? r.left : r.right, corner.oy ? r.top : r.bottom];
    }

    function insetFor(corner, px, py) {
      var left = corner.ox ? 100 - px : 0;
      var right = corner.ox ? 0 : 100 - px;
      var top = corner.oy ? 100 - py : 0;
      var bottom = corner.oy ? 0 : 100 - py;
      return 'inset(' + top.toFixed(2) + '% ' + right.toFixed(2) + '% ' +
             bottom.toFixed(2) + '% ' + left.toFixed(2) + '%)';
    }

    /* Eni va bo'yi ALOHIDA tezlikda 0 dan to'liq o'lchamgacha o'sadi. */
    function pull(c, corner, radii, ms) {
      var vx = 0.78 + rand(0.22);
      var vy = 0.78 + rand(0.22);
      var step = 0;
      el.style.transition = 'border-radius .42s cubic-bezier(.2,.85,.3,1)';
      return tween(ms, function (e, raw) {
        var px = clamp(e * vx, 0, 1);
        var py = clamp(e * vy, 0, 1);
        el.style.clipPath = insetFor(corner, px * 100, py * 100);
        var m = moving(corner, R());
        c.x = m[0] + jit(1.7);
        c.y = m[1] + jit(1.7);
        place(c);
        /* Tortish paytida radius ikki marta almashtiriladi. */
        if (step < 1 && raw >= 0.34) { el.style.borderRadius = radii[0]; step = 1; }
        if (step < 2 && raw >= 0.68) { el.style.borderRadius = radii[1]; step = 2; }
        if (raw > 0.995 && el.style.borderRadius !== radii[2]) {
          el.style.borderRadius = radii[2];
        }
      });
    }

    async function colorTour(c, stops) {
      c.label('rang');
      var base = rand(Math.PI * 2);
      for (var i = 0; i < stops; i++) {
        var a0 = base + (i / stops) * Math.PI * 2;
        var a1 = base + ((i + 1) / stops) * Math.PI * 2;
        await orbitSegment(c, R, a0, a1, 0.62, 0.62, 230 + rand(90));
        var p = pick(PAL);
        applyColor(p);
        c.label(p[0]);
        await sleep(90 + rand(70));
      }
      var fin = pick(PAL);
      applyColor(fin);
      c.label('rang ' + fin[0]);
      await sleep(120);
    }

    (async function run() {
      try {
        if (delay) await sleep(delay);

        /* 1. Tahlil: 3 agent egri yo'llar bilan kelib, elementni aylanib o'rganadi. */
        await Promise.all([
          curveFly(A, function () { return pointAt(R(), 0.12, 0.18); }, 620, 110),
          curveFly(B, function () { return pointAt(R(), 0.88, 0.24); }, 690, -130),
          curveFly(C, function () { return pointAt(R(), 0.22, 0.86); }, 750, 140)
        ]);
        await Promise.all([
          orbit(A, R, 0.64, 0.60, 950, 1.15, 0),
          orbit(B, R, 0.50, 0.78, 1050, 1.30, 2.1),
          orbit(C, R, 0.78, 0.52, 1150, 1.40, 4.2)
        ]);
        await sleep(140);

        /* 2. Qaror: tasodifiy burchak, ikki oraliq radius va yakuniy radius. */
        var corner = pick(CORNERS);
        var radii = [pick(RAD), pick(RAD), pick(RAD)];

        /* 3. Shakl agenti burchakni bosadi, ushlab tortadi, keyin yana bosadi. */
        await A.press(140);
        A.label('shakl');
        await curveFly(A, function () { return moving(corner, R()); }, 300, 70);
        A.node.classList.add('is-hold');
        var shapeDone = pull(A, corner, radii, 1050);
        var colorDone = colorTour(B, 6);
        await Promise.all([shapeDone, colorDone]);
        A.node.classList.remove('is-hold');
        await A.press(110);
        A.label('tayyor');
        el.style.clipPath = 'none';

        /* 4. Matn agenti boshiga egri yo'l bilan borib, notekis yozadi. */
        await curveFly(C, function () {
          var r = R();
          var t = titleNode ? titleNode.getBoundingClientRect() : r;
          return [t.left + 14, Math.max(r.top + 14, t.top + t.height / 2)];
        }, 400, 80);
        if (titleNode && savedHTML !== null) {
          await C.press(90);
          C.label('yozyapti');
          await typeText(titleNode, titleNode.textContent.trim());
          await C.press(90);
        }
        await sleep(120);

        /* 5. Agentlar so'nadi — rang va shakl elementda qoladi. */
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
    failsafe = setTimeout(function () {
      if (!started && !done) abort();
    }, 5600);
  }
})();
