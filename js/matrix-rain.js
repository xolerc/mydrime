/* ═══════════════════════════════════════════════════════════
   xoleric — ambient matrix rain · mydrime v3.3
   Juda kam + juda sekin + tartibsiz + rang-barang.
   - 7-14 ta tomchi (ekran kengligiga qarab), hech qachon zich emas
   - Sekin tushish: 18-55 px/s + sinusoidal chayqalish
   - Har bir tomchi: o'z rangi, o'z shrifti, o'z uzunligi, o'z tezligi
   - Belgilar har kadrda almashadi: raqam + katakana + ramz + shakl
   - Dumili so'nish (head oq, dum rangga erib ketadi) + glow
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

  /* ── Har xil belgilar: raqam + katakana + lotin + ramz + geometrik shakl ── */
  var GLYPHS = (
    '01' +
    'アイウエオカキクケコサシスセソ0123456789' +
    'XOLERIC<>[]{}+×*=:;・.·' +
    '○●□■△▲◇◆☆★◐◑'
  ).split('');

  /* ── Rang palitrasi: saytning oltin/po'lat ruhiga mos, lekin jonli ── */
  var PALETTE = [
    [245, 197, 24],   /* gold #f5c518 */
    [201, 168, 106],  /* champagne #c9a86a */
    [142, 160, 184],  /* steel #8ea0b8 */
    [125, 249, 212],  /* mint */
    [125, 184, 255],  /* sky */
    [255, 122, 217],  /* pink */
    [183, 140, 255],  /* violet */
    [242, 240, 234]   /* warm white */
  ];

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
    if (w < 480) return 7;
    if (w < 900) return 10;
    if (lowEnd) return 11;
    return 14; /* desktop: baribir juda kam */
  }

  function makeDrop(anywhere) {
    var c = pick(PALETTE);
    var fontSize = randInt(12, 22);
    var len = randInt(3, 9);
    var speed = rand(18, 55); /* px/s — ataylab sekin */
    return {
      x: rand(0, Math.max(W, 1)),
      y: anywhere ? rand(-H * 0.4, H) : rand(-H * 0.9, -20),
      len: len,
      font: fontSize,
      speed: speed,
      baseSpeed: speed,
      color: c,
      opacity: rand(0.28, 0.68),
      drift: rand(-9, 9),          /* yon siljish px/s */
      phase: rand(0, Math.PI * 2), /* chayqalish fazasi */
      wobAmp: rand(6, 22),         /* chayqalish amplitudasi */
      wobFreq: rand(0.2, 0.9),     /* chayqalish tezligi */
      pause: 0,                    /* pastga yetganda kutish */
      wait: rand(0, 2.5),          /* boshida kutish — tartibsiz start */
      chars: [],
      changeP: rand(0.12, 0.42),   /* har kadrda belgi almashish ehtimoli */
      glow: rand(4, 12),
      life: rand(0, 1000)
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

  function respawn(d, initial) {
    var fresh = makeDrop(false);
    d.x = rand(0, Math.max(W, 1));
    d.y = fresh.y;
    d.len = fresh.len;
    d.font = fresh.font;
    d.speed = fresh.speed;
    d.baseSpeed = fresh.baseSpeed;
    d.color = fresh.color;
    d.opacity = fresh.opacity;
    d.drift = fresh.drift;
    d.phase = fresh.phase;
    d.wobAmp = fresh.wobAmp;
    d.wobFreq = fresh.wobFreq;
    d.wait = initial ? 0 : rand(1, 6); /* tartibsiz qaytish: 1-6s pauza */
    d.chars = [];
    d.changeP = fresh.changeP;
    d.glow = fresh.glow;
    d.pause = 0;
  }

  function draw(now) {
    if (!running) return;
    var dt = lastT ? Math.min((now - lastT) / 1000, 0.1) : 0.016;
    lastT = now;

    ctx.clearRect(0, 0, W, H);
    ctx.textBaseline = 'top';

    for (var i = 0; i < drops.length; i++) {
      var d = drops[i];

      /* tartibsiz pauza */
      if (d.wait > 0) { d.wait -= dt; continue; }
      if (d.pause > 0) { d.pause -= dt; if (d.pause <= 0) respawn(d, false); continue; }

      d.life += dt;

      /* tezlik nafas oladi: sekin ±20% tebranadi */
      var breathe = 1 + Math.sin(d.life * 0.6 + d.phase) * 0.2;
      d.y += d.baseSpeed * breathe * DPR * dt;

      /* yon chayqalish: drift + sinus */
      d.x += (d.drift * DPR * dt) + Math.sin(d.life * d.wobFreq * 2 + d.phase) * d.wobAmp * DPR * dt * 0.35;

      /* chetdan chiqsa qarama-qarshi tomondan kiradi */
      if (d.x < -30) d.x = W + 20;
      if (d.x > W + 30) d.x = -20;

      var rowH = d.font * DPR * 1.25;

      /* belgilar to'plamini yangilash */
      while (d.chars.length < d.len) d.chars.push(pick(GLYPHS));
      for (var k = 0; k < d.chars.length; k++) {
        if (Math.random() < d.changeP) d.chars[k] = pick(GLYPHS);
      }

      ctx.font = d.font * DPR + 'px ui-monospace, "Hiragino Kaku Gothic Pro", Menlo, Consolas, monospace';
      ctx.shadowBlur = d.glow * DPR;
      ctx.shadowColor = 'rgba(' + d.color[0] + ',' + d.color[1] + ',' + d.color[2] + ',0.8)';

      for (var j = 0; j < d.chars.length; j++) {
        var cy = d.y - j * rowH;
        if (cy < -rowH || cy > H + rowH) continue;
        var headT = 1 - j / d.len; /* 1 = bosh, 0 = dum */
        var a = d.opacity * (0.15 + 0.85 * headT * headT);
        /* bosh harfi deyarli oq — klassik matrix "head" */
        var mix = j === 0 ? 0.75 : headT * 0.25;
        var r = Math.round(d.color[0] + (255 - d.color[0]) * mix);
        var g = Math.round(d.color[1] + (255 - d.color[1]) * mix);
        var b = Math.round(d.color[2] + (255 - d.color[2]) * mix);
        /* miltillash: dum uchlari ba'zan lipillaydi */
        if (j === d.chars.length - 1 && Math.random() < 0.06) a *= 0.3;
        ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + a.toFixed(3) + ')';
        /* har bir qator ozgina x-shift — ideal ustun emas, tirik yomg'ir */
        var jx = d.x + Math.sin(d.life * 1.3 + d.phase + j * 0.7) * 3 * DPR;
        ctx.fillText(d.chars[j], jx, cy);
      }
      ctx.shadowBlur = 0;

      /* pastga yetdi → pauza, keyin tartibsiz qaytish */
      if (d.y - d.len * rowH > H + 20) {
        d.pause = rand(0.8, 5);
        if (d.pause <= 0.01) respawn(d, false);
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
      /* sonni moslash: ko'paysa qo'sh, kamaysa kes */
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

  /* loader yopilgach boshlash — erta chaqirilsa ham xavfsiz */
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
    /* zaxira: baribir 6s da yonadi */
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
  /* load kechiksa ham */
  setTimeout(function () { if (!running) start(); }, 7000);
})();
