/* ═══════════════════════════════════════════════════════════
   xoleric — BUILD SCROLL · AGENT KURSORLAR v3
   Kursorlar namunadagidek: kichik o'q + yorliq, egri yo'l,
   sekin-tez-sekin, yo'lda titroq, bosishda kichrayish.
   Tahlil paytida agentlar element ichida erkin kezadi.
   Elementlar shaffof — global suv foni hech o'zgartirilmaydi.
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

  var PAL = [
    ['#7cf7ff', '#001318'],
    ['#ff5d8f', '#24010d'],
    ['#ffd166', '#1c1400'],
    ['#8b7cff', '#0d0924'],
    ['#3ddc97', '#001a0f'],
    ['#1f2330', '#eceff4']
  ];
  var RAD = ['0px', '10px', '28px', '999px'];
  /* Tasodifiy burchak: chap-tepa / o'ng-tepa / chap-past / o'ng-past. */
  var CORNERS = [
    { ox: 0, oy: 0 }, { ox: 1, oy: 0 },
    { ox: 0, oy: 1 }, { ox: 1, oy: 1 }
  ];

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rand(n) { return Math.random() * n; }
  function pick(a) { return a[Math.random() * a.length | 0]; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function easeHuman(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
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

  /* ── KURSORLAR ─────────────────────────────────────────── */

  function place(c) {
    c.node.style.transform = 'translate(' + c.x.toFixed(1) + 'px,' + c.y.toFixed(1) + 'px)';
  }

  function cursor(label, hue) {
    var node = document.createElement('div');
    node.className = 'build-cursor';
    node.setAttribute('aria-hidden', 'true');
    var color = 'hsl(' + hue + ' 90% 62%)';
    node.innerHTML =
      '<svg viewBox="0 0 18 18" width="18" height="18"><path d="M2 1l13 7-6 1.5L7 16z" fill="' + color + '" stroke="#000" stroke-width="1.2" stroke-linejoin="round"/></svg>' +
      '<i style="background:' + color + '">' + label + '</i>';
    document.body.appendChild(node);
    var c = { node: node, x: rand(window.innerWidth), y: rand(window.innerHeight) };
    c.label = function (text) {
      var i = node.querySelector('i');
      if (i) i.textContent = text;
    };
    c.press = function (ms) {
      node.classList.add('is-press');
      return sleep(ms || 150).then(function () { node.classList.remove('is-press'); });
    };
    c.fade = function () {
      node.style.transition = 'opacity .4s ease';
      node.style.opacity = '0';
      setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 450);
    };
    place(c);
    return c;
  }

  /* Namunadagi fly: sinus egilishi + vaqt o'tishi bilan susayadigan titroq. */
  function fly(c, get, ms) {
    var x0 = c.x, y0 = c.y;
    var bend = (Math.random() < 0.5 ? -1 : 1) * (0.12 + rand(0.2));
    var phase = rand(6.28);
    return tween(ms, function (e) {
      var p = get();
      var dx = p[0] - x0, dy = p[1] - y0;
      var bow = Math.sin(Math.PI * e) * bend;
      var j = Math.sin(e * 40 + phase) * 1.6 * (1 - e);
      c.x = x0 + dx * e - dy * bow + j;
      c.y = y0 + dy * e + dx * bow + j * 0.6;
      place(c);
    });
  }

  function pointAt(r, fx, fy) {
    return [r.left + r.width * fx, r.top + r.height * fy];
  }

  /* Erkin kezish: agent element ichidagi tasodifiy nuqtalarga uchadi. */
  function wander(c, getRect, ms, onStop) {
    var end = performance.now() + ms;
    return (async function () {
      while (performance.now() < end) {
        var u = 0.1 + rand(0.8), v = 0.1 + rand(0.8);
        await fly(c, function () { return pointAt(getRect(), u, v); }, 320 + rand(380));
        if (onStop) onStop();
        await sleep(70 + rand(200));
      }
    })();
  }

  function titleInside(el) {
    return el.querySelector('.hero-name, .section-title, .logo, h2, h1, .footer-note');
  }

  /* Harf-harf, notekis tezlik — pauzalar bilan. */
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

    /* FONGA TA'SIR YO'Q: element shaffof, rang faqat matnda. */
    function applyColor(p) {
      el.style.background = 'transparent';
      el.style.color = p[1];
      el.style.borderColor = '';
      el.style.boxShadow = '';
    }

    /* Kursor ushlab tortadigan nuqta: oyna kengayayotgan qirra. */
    function grip(corner, r, px, py) {
      return [
        corner.ox ? r.right - r.width * px : r.left + r.width * px,
        corner.oy ? r.bottom - r.height * py : r.top + r.height * py
      ];
    }

    function insetFor(corner, px, py) {
      var left = corner.ox ? 100 - px : 0;
      var right = corner.ox ? 0 : 100 - px;
      var top = corner.oy ? 100 - py : 0;
      var bottom = corner.oy ? 0 : 100 - py;
      return 'inset(' + top.toFixed(2) + '% ' + right.toFixed(2) + '% ' +
             bottom.toFixed(2) + '% ' + left.toFixed(2) + '%)';
    }

    /* Eni va bo'yi alohida tezlikda 0 dan to'liq o'lchamgacha. */
    function pull(c, corner, radii, ms) {
      var vx = 0.78 + rand(0.22);
      var vy = 0.78 + rand(0.22);
      var step = 0;
      el.style.transition = 'border-radius .42s cubic-bezier(.2,.85,.3,1)';
      return tween(ms, function (e, raw) {
        var px = clamp(e * vx, 0, 1);
        var py = clamp(e * vy, 0, 1);
        el.style.clipPath = insetFor(corner, px * 100, py * 100);
        var g = grip(corner, R(), px, py);
        var now = performance.now();
        c.x = g[0] + Math.sin(now / 45) * 1.2;
        c.y = g[1] + Math.cos(now / 55) * 1.2;
        place(c);
        if (step < 1 && raw >= 0.45) { el.style.borderRadius = radii[0]; step = 1; }
        if (step < 2 && raw >= 1) { el.style.borderRadius = radii[1]; step = 2; }
      });
    }

    (async function run() {
      try {
        if (delay) await sleep(delay);

        /* 1. Agentlar elementga uchib keladi. */
        await Promise.all([
          fly(A, function () { return pointAt(R(), 0.12, 0.18); }, 620 + rand(220)),
          fly(B, function () { return pointAt(R(), 0.86, 0.24); }, 690 + rand(220)),
          fly(C, function () { return pointAt(R(), 0.22, 0.84); }, 750 + rand(220))
        ]);

        /* 2. Tahlil: element ichida erkin kezib o'rganadi. */
        await Promise.all([
          wander(A, R, 900),
          wander(B, R, 960),
          wander(C, R, 1020)
        ]);

        /* 3. Qaror: tasodifiy burchak, ikki radius, yakuniy rang. */
        var corner = pick(CORNERS);
        var radii = [pick(RAD), pick(RAD)];

        /* 4. Shakl burchakni ushlab tortadi; rang va matn agentlari kezadi. */
        A.label('shakl');
        await fly(A, function () { return grip(corner, R(), 0, 0); }, 450);
        await A.press(150);
        A.node.classList.add('is-hold');
        B.label('rang');
        var shapeDone = pull(A, corner, radii, 1200);
        var colorDone = (async function () {
          await wander(B, R, 1200, function () {
            var p = pick(PAL);
            applyColor(p);
            B.label(p[0]);
          });
          var fin = pick(PAL);
          applyColor(fin);
          B.label('rang ' + fin[0]);
          await B.press(130);
        })();
        var textIdle = wander(C, R, 1050);
        await Promise.all([shapeDone, colorDone, textIdle]);
        A.node.classList.remove('is-hold');
        await A.press(130);
        A.label('tayyor');
        el.style.clipPath = 'none';

        /* 5. Matn agenti boshiga borib, harf-harf yozadi. */
        await fly(C, function () {
          var r = R();
          var t = titleNode ? titleNode.getBoundingClientRect() : r;
          return [t.left + 14, Math.max(r.top + 14, t.top + t.height / 2)];
        }, 420);
        if (titleNode && savedHTML !== null) {
          await C.press(100);
          C.label('yozyapti');
          await typeText(titleNode, titleNode.textContent.trim());
          await C.press(100);
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
        if (r.top < vh * 0.9) buildElement(el, (n++) * 300);
      }
      updateHud(pct, false);
      if (maxReached >= max - 2) complete();
    } catch (e) {
      complete();
    }
  }
  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = 0; sync(); });
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
