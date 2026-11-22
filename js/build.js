/* ═══════════════════════════════════════════════════════════
   xoleric — BUILD SCROLL · NAMUNA STRATEGIYASI
   Asosiy suv foni (canvas#webgl-bg) hech qachon o'zgarishsiz.

   Namuna bilan bir xil tartib:
   1) Elementdagi HAQIQIY matn yashiriladi (faqat qurilish paytida).
   2) 3 agent egri yo'l bilan kelib, 900 ms erkin kezib tahlil qiladi.
   3) Qaror: tasodifiy burchak, boshlang'ich rang, oraliq va oxirgi radius.
   4) Shakl agenti burchakka boradi, BOSADI (kichrayadi).
   5) Rang agenti to'xtashlarda yangi rang sinaydi (hex yorliq),
      matn agenti kutib turadi.
   6) Radius 450 va 1000 ms da ikki marta almashadi.
   7) Oyna eni 1200 ms, bo'yi 1500 ms — alohida tezliklarda ochiladi,
      kursor harakatlanayotgan qirrali ushlab boradi.
   8) Yana BOSADI → "tayyor", yakuniy rang tanlanadi.
   9) Matn agenti sarlavha o'rniga kelib, ▍ bilan harf-harf YOZADI —
      shundan keyingina haqiqiy UI matni ko'rinadi (ikki marta yozilmaydi).
  10) Agentlar so'nadi, haqiqiy UI qaytadi, tanlangan shakl qoladi.

   SAFETY: reduced-motion, JS xatosi, app.js o'lmagani, ctx fail —
   hammasida sahifa normal ko'rinishga qaytadi.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  if (reduce) return;

  var root = document.documentElement;
  var started = false;
  var done = false;
  var finalizing = false;
  var cleanedAll = false;
  var cleanupTimer = 0;
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

  /* [yorliqdagi hex, suv fonida o'qiladigan matn rangi].
     FON RANGLANMAYDI — faqat yozilayotgan matn rangi sinaladi. */
  var PAL = [
    ['#7cf7ff', '#dffcff'],
    ['#ff5d8f', '#ffd9e6'],
    ['#ffd166', '#fff2c9'],
    ['#8b7cff', '#e2dcff'],
    ['#3ddc97', '#d3ffe9'],
    ['#eceff4', '#eceff4']
  ];
  var RAD = ['0px', '10px', '28px', '999px'];
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
        fn(easeHuman(t));
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

  function cursor(text, hue) {
    var node = document.createElement('div');
    node.className = 'build-cursor';
    node.setAttribute('aria-hidden', 'true');
    var color = 'hsl(' + hue + ' 90% 62%)';
    node.innerHTML =
      '<svg viewBox="0 0 18 18" width="18" height="18"><path d="M2 1l13 7-6 1.5L7 16z" fill="' + color + '" stroke="#000" stroke-width="1.2" stroke-linejoin="round"/></svg>' +
      '<i style="background:' + color + '">' + text + '</i>';
    document.body.appendChild(node);
    var c = { node: node, x: rand(window.innerWidth), y: rand(window.innerHeight) };
    c.label = function (t) {
      var i = node.querySelector('i');
      if (i) i.textContent = t;
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

  function wander(c, getRect, isOn, onStop) {
    return (async function () {
      while (isOn()) {
        var u = rand(1), v = rand(1);
        await fly(c, function () { return pointAt(getRect(), u, v); }, 350 + rand(450));
        if (onStop) onStop();
        await sleep(80 + rand(250));
      }
    })();
  }

  function titleInside(el) {
    return el.querySelector('.hero-name, .section-title, .logo, h2, h1, .footer-note');
  }

  /* Namunadagi yozish: min(45, 1600/len) ms, 0.6–1.4 notekislik. */
  function typeText(typed, rest, text) {
    return new Promise(function (res) {
      var per = Math.min(45, 1600 / Math.max(text.length, 1));
      var i = 0;
      (function step() {
        if (i >= text.length) {
          typed.classList.remove('is-typing');
          res();
          return;
        }
        typed.textContent = text.slice(0, ++i);
        rest.textContent = text.slice(i);
        setTimeout(step, per * (0.6 + rand(0.8)));
      })();
    });
  }

  function buildElement(el, delay) {
    if (!el || el.dataset.buildStarted) return;
    el.dataset.buildStarted = '1';

    var rect = el.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;
    var W = rect.width, H = rect.height;
    var titleNode = titleInside(el);
    var text = titleNode ? titleNode.textContent.trim() : '';
    if (!text) text = (el.textContent || '').trim().slice(0, 80);

    var oldPos = el.style.position;
    var csPos = window.getComputedStyle(el).position;
    if (csPos === 'static') el.style.position = 'relative';

    /* 1 — HAQIQIY UI MATNINI YASHIRAMIZ (faqat shu element ichida). */
    var kids = [];
    var vis = [];
    for (var k = 0; k < el.children.length; k++) {
      kids.push(el.children[k]);
      vis.push(el.children[k].style.visibility);
      el.children[k].style.visibility = 'hidden';
    }
    /* build.js o'zi boshqaradi — CSS clip endi aralashmaydi. */
    el.style.clipPath = 'inset(0% 0% 0% 0%)';
    el.classList.add('is-built');
    if (el.id === 'hero') root.classList.add('is-hero-built');

    /* 2 — Namunadagi "skin": shaffof, faqat element ichidagi vaqtinchalik
       oyna. U hech qanday rang bermaydi — global suv foni o'zgarishsiz. */
    var skin = document.createElement('div');
    skin.className = 'build-skin';
    el.appendChild(skin);

    /* Matn qatlami sarlavha o'rnida, faqat yozish boshlanganda ko'rinadi. */
    var textLayer = document.createElement('div');
    textLayer.className = 'build-text-layer';
    textLayer.style.visibility = 'hidden';
    if (titleNode) {
      var tr = titleNode.getBoundingClientRect();
      var tc = window.getComputedStyle(titleNode);
      textLayer.style.left = (tr.left - rect.left) + 'px';
      textLayer.style.top = (tr.top - rect.top) + 'px';
      textLayer.style.fontFamily = tc.fontFamily;
      textLayer.style.fontSize = tc.fontSize;
      textLayer.style.fontWeight = tc.fontWeight;
      textLayer.style.lineHeight = tc.lineHeight;
      textLayer.style.letterSpacing = tc.letterSpacing;
      textLayer.style.maxWidth = Math.max(60, W - (tr.left - rect.left) - 12) + 'px';
    } else {
      textLayer.style.left = '24px';
      textLayer.style.top = '24px';
      textLayer.style.fontSize = '16px';
    }
    var typed = document.createElement('span');
    typed.className = 'build-typing is-typing';
    var rest = document.createElement('span');
    rest.className = 'build-typing-rest';
    rest.textContent = text;
    textLayer.appendChild(typed);
    textLayer.appendChild(rest);
    el.appendChild(textLayer);

    var hue = rand(360) | 0;
    var A = cursor('tahlil', hue);
    var B = cursor('tahlil', (hue + 120) % 360);
    var C = cursor('tahlil', (hue + 240) % 360);
    var inst = { finish: null };
    var cleaned = false;
    var finalRadius = '0px';
    var rTimer1 = 0, rTimer2 = 0;

    function finish() {
      if (cleaned) return;
      cleaned = true;
      clearTimeout(rTimer1);
      clearTimeout(rTimer2);

      /* Oynani olib, haqiqiy UI ni qaytaramiz — matn ikki marta chiqmaydi. */
      if (skin.parentNode) skin.parentNode.removeChild(skin);
      if (textLayer.parentNode) textLayer.parentNode.removeChild(textLayer);
      for (var i = 0; i < kids.length; i++) kids[i].style.visibility = vis[i];
      el.style.position = oldPos;

      A.fade(); B.fade(); C.fade();
      el.style.clipPath = 'inset(0% 0% 0% 0% round ' + finalRadius + ')';
      el.style.willChange = '';
      el.classList.add('build-el-done');
      var ix = active.indexOf(inst);
      if (ix > -1) active.splice(ix, 1);
      if (finalizing && active.length === 0) finalCleanup();
    }
    inst.finish = finish;
    active.push(inst);

    function R() { return el.getBoundingClientRect(); }

    /* Fonga hech narsa berilmaydi: suv har doimgidek qoladi.
       Rang faqat yozilayotgan matnda va kursor yorlig'ida sinaladi. */
    function colorize(p) {
      textLayer.style.color = p[1];
    }

    /* Oyna burchakdan ochiladi: chapga ham, o'ngga ham. */
    function anchor(corner) {
      skin.style[corner.ox ? 'right' : 'left'] = '0';
      skin.style[corner.ox ? 'left' : 'right'] = 'auto';
      skin.style[corner.oy ? 'bottom' : 'top'] = '0';
      skin.style[corner.oy ? 'top' : 'bottom'] = 'auto';
    }

    /* Eni va bo'yi alohida vaqt o'qlarida 0 → to'liq o'lcham. */
    function pull(c, corner, msW, msH) {
      return new Promise(function (res) {
        var t0 = performance.now();
        (function frame(now) {
          var t = now - t0;
          var a = Math.min(t / msW, 1), b = Math.min(t / msH, 1);
          var ea = easeHuman(a), eb = easeHuman(b);
          var r = R();
          skin.style.width = (W * ea).toFixed(1) + 'px';
          skin.style.height = (H * eb).toFixed(1) + 'px';
          c.x = (corner.ox ? r.right - W * ea : r.left + W * ea) + Math.sin(now / 45) * 1.2;
          c.y = (corner.oy ? r.bottom - H * eb : r.top + H * eb) + Math.cos(now / 55) * 1.2;
          place(c);
          if (a < 1 || b < 1) requestAnimationFrame(frame);
          else res();
        })(t0);
      });
    }

    (async function run() {
      try {
        if (delay) await sleep(delay);

        /* 1 — UCHIB KELISH */
        await Promise.all([
          fly(A, function () { return pointAt(R(), rand(1), rand(1)); }, 700 + rand(400)),
          fly(B, function () { return pointAt(R(), rand(1), rand(1)); }, 700 + rand(400)),
          fly(C, function () { return pointAt(R(), rand(1), rand(1)); }, 700 + rand(400))
        ]);

        /* 2 — 900 ms TAHLIL */
        var on = true;
        var study = [A, B, C].map(function (c) {
          return wander(c, R, function () { return on; });
        });
        await sleep(900);
        on = false;
        await Promise.all(study);

        /* 3 — QAROR */
        var corner = pick(CORNERS);
        var fin = pick(PAL);
        var rad = pick(RAD);
        var radMid = pick(RAD);
        anchor(corner);
        colorize(pick(PAL));
        A.label('shakl'); B.label('rang'); C.label('matn');

        /* 4 — BURCHAKNI BOSISH */
        await fly(A, function () {
          var r = R();
          return [corner.ox ? r.right : r.left, corner.oy ? r.bottom : r.top];
        }, 450);
        await A.press(150);

        /* 5 — RANG SINOVI + MATN KUTISHI; radius ikki marta */
        on = true;
        var tour = wander(B, R, function () { return on; }, function () {
          var p = pick(PAL);
          colorize(p);
          B.label(p[0]);
        });
        var waiting = wander(C, R, function () { return on; });
        rTimer1 = setTimeout(function () { skin.style.borderRadius = radMid; }, 450);
        rTimer2 = setTimeout(function () {
          skin.style.borderRadius = rad;
          finalRadius = rad;
        }, 1000);

        /* 6 — HAQIQIY O'LCHAM O'ZGARISHI */
        await pull(A, corner, 1200, 1500);
        await A.press(150);
        A.label('tayyor');

        /* 7 — YAKUNIY RANG */
        on = false;
        await Promise.all([tour, waiting]);
        colorize(fin);
        B.label('rang ' + fin[0]);
        B.press(150);

        /* 8 — MATN: faqat hozir yoziladi, oldindan ko'rinmaydi */
        await fly(C, function () {
          var r = R();
          var t = textLayer.getBoundingClientRect();
          return [t.left + 12, Math.max(r.top + 12, t.top + t.height / 2)];
        }, 450);
        C.label('yozyapti');
        textLayer.style.visibility = 'visible';
        await typeText(typed, rest, text);
        await sleep(120);

        /* 9 — AGENTLAR SO'NADI, HAQIQIY UI QAYTADI */
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
  function finalCleanup() {
    if (cleanedAll) return;
    cleanedAll = true;
    clearTimeout(cleanupTimer);
    buildAll();
    if (layer) layer.classList.add('is-done');
    root.classList.add('is-build-done');
    setTimeout(function () {
      root.classList.remove('is-building');
      setTimeout(function () {
        if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
        layer = null;
      }, 900);
    }, 350);
  }
  function complete() {
    if (done) return;
    done = true;
    updateHud(1, true);
    unbind();
    if (active.length === 0) {
      finalCleanup();
    } else {
      /* Hamma agentlar o'z ishini tugatmaguncha UI ochilmaydi.
         Xavfsizlik: 14 s dan keyin majburan ochamiz. */
      finalizing = true;
      cleanupTimer = setTimeout(finalCleanup, 14000);
    }
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
        if (r.top < vh * 0.9) buildElement(el, (n++) * 450);
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
    window.scrollBy(0, d * 0.5);
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
