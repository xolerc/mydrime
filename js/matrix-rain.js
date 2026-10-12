/* ═══════════════════════════════════════════════════════════
   xoleric — ambient matrix rain · mydrime v3.4 DONA-DONA
   Zanjir YO'Q — yakka-yakka donalar. Har bir dona tushguncha
   o'zgaradi: belgisi almashadi (morph) + rangi aylanadi (hue).
   - 9-18 ta dona (ekran kengligiga qarab), hech qachon zich emas
   - Sekin tushish: 15-50 px/s + sinusoidal chayqalish
   - Har dona: o'z o'lchami, o'z tezligi, o'z rangi (HSL aylanish)
   - Belgilar: raqam + katakana + ramz + geometrik shakl
   - Pastga yetganda so'nib, tepada yangidan tug'iladi
   - prefers-reduced-motion, hidden tab, low-end himoyalari bor
   Exposed as window.xolericRain = { start, stop, isOn }
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var canvas = document.getElementById('matrix-rain');
  if (!canvas) return;

  var reduceMotion = false;
  try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* noop */ }
  if (reduceMotion) {
    try { canvas.style.display = 'none'; } catch (e) { /* noop */ }
    window.xolericRain = { start: function () {}, stop: function () {}, isOn: function () { return false; } };
    return;
  }

  var ctx = null;
  try { ctx = canvas.getContext('2d'); } catch (e) { return; }
  if (!ctx) return;

  /* ── Har xil belgilar: dona har tushishda qiyofasini almashtiradi ── */
  var GLYPHS = (
    '01' +
    'アイウエオカキクケコサシスセソ0123456789' +
    'XOLERIC<>[]{}+×*=:;・.·' +
    '○●□■△▲◇◆☆★◐◑'
  ).split('');

  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function rand(min, max) { return min + Math.random() * (max - min); }
  function randInt(min, max) { return Math.floor(rand(min, max + 1)); }

  var DPR = 1;
  var W = 0, H = 0;
  var drops = [];
  var rafId = 0;
  var running = false;
  var lastT = 0;
  var started = false;

  var coarse = false;
  try { coarse = window.matchMedia('(pointer: coarse)').matches; } catch (e) { /* noop */ }
  var smallScreen = (window.innerWidth || 800) < 768;
  var lowEnd = coarse || smallScreen || (navigator.hardwareConcurrency || 4) <= 4;

  function targetCount() {
    var w = window.innerWidth || 800;
    if (w < 480) return 9;
    if (w < 900) return 13;
    if (lowEnd) return 14;
    return 18; /* yakka donalar — baribir siyrak */
  }

  /* Bitta dona: zanjirsiz, mustaqil */
  function makeDrop(anywhere) {
    return {
      x: rand(0, Math.max(W, 1)),
      y: anywhere ? rand(-H * 0.3, H) : rand(-H * 0.7, -20),
      baseFont: randInt(13, 24),
      speed: rand(15, 50),              /* px/s — ataylab sekin */
      opacity: rand(0.32, 0.75),
      drift: rand(-10, 10),
      phase: rand(0, Math.PI * 2),
      wobAmp: rand(6, 24),
      wobFreq: rand(0.2, 0.9),
      hue: rand(0, 360),                /* boshlang'ich rang */
      hueShift: rand(6, 28) * (Math.random() < 0.5 ? -1 : 1), /* rang aylanishi °/s */
      sat: randInt(70, 100),
      light: randInt(55, 70),
      ch: pick(GLYPHS),
      morphP: rand(1.5, 5),             /* sekundiga o'rtacha belgi almashuvi */
      pulseFreq: rand(0.5, 1.5),        /* o'lcham nafas olishi */
      glow: rand(6, 14),
      wait: anywhere ? rand(0, 2) : 0,  /* tartibsiz start */
      pause: 0,
      life: rand(0, 1000),
      flash: 0
    };
  }

  function refill() {
    var n = targetCount();
    drops = [];
    for (var i = 0; i < n; i++) drops.push(makeDrop(true));
  }

  function resize() {
    try {
      DPR = Math.min(window.devicePixelRatio || 1, 1.25);
      W = Math.round(window.innerWidth * DPR);
      H = Math.round(window.innerHeight * DPR);
      canvas.width = W;
      canvas.height = H;
    } catch (e) { /* noop */ }
  }

  function respawn(d) {
    var fresh = makeDrop(false);
    d.x = fresh.x;
    d.y = fresh.y;
    d.baseFont = fresh.baseFont;
    d.speed = fresh.speed;
    d.opacity = fresh.opacity;
    d.drift = fresh.drift;
    d.phase = fresh.phase;
    d.wobAmp = fresh.wobAmp;
    d.wobFreq = fresh.wobFreq;
    d.hue = fresh.hue;
    d.hueShift = fresh.hueShift;
    d.sat = fresh.sat;
    d.light = fresh.light;
    d.ch = fresh.ch;
    d.morphP = fresh.morphP;
    d.pulseFreq = fresh.pulseFreq;
    d.glow = fresh.glow;
    d.wait = rand(0.5, 5); /* tartibsiz qaytish */
    d.pause = 0;
    d.flash = 0;
  }

  function draw(now) {
    if (!running) return;
    var dt = lastT ? Math.min((now - lastT) / 1000, 0.1) : 0.016;
    lastT = now;

    ctx.clearRect(0, 0, W, H);
    ctx.textBaseline = 'top';

    for (var i = 0; i < drops.length; i++) {
      var d = drops[i];

      if (d.wait > 0) { d.wait -= dt; continue; }
      if (d.pause > 0) { d.pause -= dt; if (d.pause <= 0) respawn(d); continue; }

      d.life += dt;

      /* ── harakat: sekin + nafas + chayqalish ── */
      var breathe = 1 + Math.sin(d.life * 0.6 + d.phase) * 0.2;
      d.y += d.speed * breathe * DPR * dt;
      d.x += (d.drift * DPR * dt) + Math.sin(d.life * d.wobFreq * 2 + d.phase) * d.wobAmp * DPR * dt * 0.35;
      if (d.x < -30) d.x = W + 20;
      if (d.x > W + 30) d.x = -20;

      /* ── O'ZI o'zgaradi: belgi morph ── */
      if (Math.random() < d.morphP * dt) d.ch = pick(GLYPHS);

      /* ── RANGI o'zgaradi: hue to'xtovsiz aylanadi ── */
      d.hue = (d.hue + d.hueShift * dt + 360) % 360;

      /* ── o'lcham nafas oladi ── */
      var scale = 1 + 0.22 * Math.sin(d.life * d.pulseFreq * 2 + d.phase);
      var fontPx = d.baseFont * scale * DPR;

      /* ── chekkalarda yumshoq so'nish ── */
      var edge = Math.min(1, d.y / (70 * DPR), (H - d.y) / (130 * DPR));
      if (edge < 0) edge = 0;
      var a = d.opacity * edge;
      /* ba'zan oq chaqnash — jonli lipillash */
      if (Math.random() < 0.015) d.flash = 0.18;
      if (d.flash > 0) d.flash -= dt;

      var col;
      if (d.flash > 0) {
        col = 'rgba(255,255,255,' + a.toFixed(3) + ')';
      } else {
        col = 'hsla(' + d.hue.toFixed(1) + ',' + d.sat + '%,' + d.light + '%,' + a.toFixed(3) + ')';
      }

      ctx.font = fontPx.toFixed(1) + 'px ui-monospace, "Hiragino Kaku Gothic Pro", Menlo, Consolas, monospace';
      ctx.shadowBlur = d.glow * DPR;
      ctx.shadowColor = 'hsla(' + d.hue.toFixed(1) + ',' + d.sat + '%,60%,0.8)';
      ctx.fillStyle = col;
      ctx.fillText(d.ch, d.x, d.y);
      ctx.shadowBlur = 0;

      /* pastga yetdi → qisqa pauza, keyin tepada yangi qiyofada tug'iladi */
      if (d.y > H + 30) {
        d.pause = rand(0.5, 4);
        if (d.pause <= 0.01) respawn(d);
      }
    }

    rafId = requestAnimationFrame(draw);
  }

  function start() {
    if (running || reduceMotion) return;
    if (!started) { resize(); refill(); started = true; }
    running = true;
    lastT = 0;
    if (!rafId) rafId = requestAnimationFrame(draw);
  }

  function stop() {
    running = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    try { ctx.clearRect(0, 0, W, H); } catch (e) { /* noop */ }
  }

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resize();
      var n = targetCount();
      while (drops.length < n) drops.push(makeDrop(true));
      if (drops.length > n) drops.length = n;
    }, 180);
  }, { passive: true });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      lastT = 0;
    } else if (running && !rafId) {
      rafId = requestAnimationFrame(draw);
    }
  });

  function autoStart() {
    if (window.__xolericLoaded) { start(); return; }
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      var loaderHidden = false;
      try {
        var l = document.getElementById('loader');
        loaderHidden = !l || l.classList.contains('hidden');
      } catch (e) { loaderHidden = true; }
      if (window.__xolericLoaded || loaderHidden || tries > 40) {
        clearInterval(iv);
        start();
      }
    }, 250);
    setTimeout(function () { try { clearInterval(iv); } catch (e) {} start(); }, 6000);
  }

  resize();
  refill();
  started = true;

  window.xolericRain = {
    start: start,
    stop: stop,
    isOn: function () { return running; }
  };

  if (document.readyState === 'complete') autoStart();
  else window.addEventListener('load', autoStart, { once: true });
  setTimeout(function () { if (!running) start(); }, 7000);
})();
