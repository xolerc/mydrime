/* ═══════════════════════════════════════════════════════════
   xoleric — PORTRAIT LIGHTBOX v2
   Portretga 1 marta bosish → rasm markazga chiqadi.
   Ichida: kursor bilan ochiladigan ORQA RASIM effekti va
   markazga chiqqanda paydo bo'lib yo'qoladigan mayda
   yulduzsimon qumlar.
   Tashqariga bosilsa yoki Esc → yopiladi.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var dlg = document.getElementById('portraitLB');
  var trigger = document.getElementById('heroArt');
  var figure = document.getElementById('lbFigure');
  var reveal = document.getElementById('lbReveal');
  var canvas = document.getElementById('lbSparkles');
  if (!dlg || !trigger) return;

  var supportsDialog = typeof dlg.showModal === 'function';
  var isOpen = false;
  var lastFocus = null;
  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  var sparkRaf = 0;
  var sparkTimer = 0;

  /* ── ORQA RASIM — flashlight reveal (hero bilan bir xil uslub) ── */
  var rv = { tx: 0.5, ty: 0.5, cx: 0.5, cy: 0.5, target: 0, cur: 0, raf: 0 };

  function mask() {
    if (!reveal) return;
    var x = (rv.cx * 100).toFixed(2) + '%';
    var y = (rv.cy * 100).toFixed(2) + '%';
    var m = rv.cur > 0.5
      ? 'radial-gradient(circle ' + rv.cur.toFixed(1) + 'px at ' + x + ' ' + y +
        ', #000 0%, #000 40%, transparent 100%)'
      : 'radial-gradient(circle 0px at 50% 50%, #000 0%, transparent 100%)';
    reveal.style.webkitMaskImage = m;
    reveal.style.maskImage = m;
  }

  function revealLoop() {
    rv.raf = 0;
    rv.cur += (rv.target - rv.cur) * 0.16;
    rv.cx += (rv.tx - rv.cx) * 0.2;
    rv.cy += (rv.ty - rv.cy) * 0.2;
    mask();
    if (Math.abs(rv.target - rv.cur) > 0.4 ||
        Math.abs(rv.tx - rv.cx) > 0.002 ||
        Math.abs(rv.ty - rv.cy) > 0.002) {
      rv.raf = requestAnimationFrame(revealLoop);
    }
  }

  function wakeReveal() {
    if (!rv.raf) rv.raf = requestAnimationFrame(revealLoop);
  }

  function onFigureMove(e) {
    if (!figure || !reveal) return;
    var r = figure.getBoundingClientRect();
    rv.tx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    rv.ty = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    rv.target = Math.min(r.width, r.height) * 0.34;
    wakeReveal();
  }

  function onFigureLeave() {
    rv.target = 0;
    wakeReveal();
  }

  /* ── YULDUZSIMON QUMLAR ─────────────────────────────────── */
  function burstStars() {
    if (!canvas || !figure || reduce) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var w = figure.clientWidth;
    var h = figure.clientHeight;
    if (!w || !h) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var n = Math.round(Math.min(110, w * h / 2600));
    var stars = [];
    for (var i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.55 + Math.random() * 1.7,
        delay: Math.random() * 320,
        life: 700 + Math.random() * 750,
        rot: Math.random() * 6.28,
        tw: Math.random() * 6.28,
        drift: 0.3 + Math.random() * 0.9
      });
    }

    var t0 = performance.now();
    cancelAnimationFrame(sparkRaf);

    function frame(now) {
      var t = now - t0;
      var alive = false;
      ctx.clearRect(0, 0, w, h);
      for (var j = 0; j < stars.length; j++) {
        var s = stars[j];
        var lt = t - s.delay;
        if (lt < 0) { alive = true; continue; }
        if (lt > s.life) continue;
        alive = true;

        var p = lt / s.life;
        var fade = Math.sin(Math.PI * p);
        var twinkle = 0.6 + 0.4 * Math.sin(s.tw + lt / 85);
        var alpha = fade * twinkle * 0.92;
        var size = s.r * (1 + 0.35 * Math.sin(s.tw + lt / 70));
        var x = s.x + Math.sin(lt / 480 + s.rot) * 7 * p;
        var y = s.y - s.drift * 20 * p;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(s.rot + lt / 2200);
        ctx.strokeStyle = 'rgba(236,239,244,' + alpha + ')';
        ctx.lineWidth = Math.max(0.5, size * 0.5);
        ctx.beginPath();
        ctx.moveTo(-size * 3, 0);
        ctx.lineTo(size * 3, 0);
        ctx.moveTo(0, -size * 3);
        ctx.lineTo(0, size * 3);
        ctx.stroke();
        ctx.fillStyle = 'rgba(124,247,255,' + (alpha * 0.95) + ')';
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.75, 0, 6.2832);
        ctx.fill();
        ctx.restore();
      }
      if (alive) sparkRaf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, w, h);
    }
    sparkRaf = requestAnimationFrame(frame);
  }

  function stopStars() {
    cancelAnimationFrame(sparkRaf);
    sparkRaf = 0;
    clearTimeout(sparkTimer);
    sparkTimer = 0;
    if (canvas && canvas.width) {
      var ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  /* ── OPEN / CLOSE ───────────────────────────────────────── */
  function open() {
    if (isOpen || !supportsDialog) return;
    lastFocus = document.activeElement;
    isOpen = true;
    dlg.classList.add('is-open');
    dlg.showModal();
    document.documentElement.classList.add('lb-lock');
    try { document.body.setAttribute('data-swim', 'off'); } catch (e) {}

    rv.cur = 0; rv.target = 0;
    rv.tx = rv.cx = 0.5;
    rv.ty = rv.cy = 0.5;
    mask();

    /* figure markazga kelgach (animatsiya ~380ms) qumlar chaqnaydi. */
    sparkTimer = setTimeout(burstStars, reduce ? 0 : 260);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    dlg.classList.remove('is-open');
    try { dlg.close(); } catch (e) {}
    document.documentElement.classList.remove('lb-lock');
    try { document.body.removeAttribute('data-swim'); } catch (e) {}
    stopStars();
    rv.target = 0;
    rv.cur = 0;
    mask();
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  if (figure) {
    figure.addEventListener('pointermove', onFigureMove, { passive: true });
    figure.addEventListener('pointerleave', onFigureLeave, { passive: true });
  }

  trigger.addEventListener('click', function (e) {
    e.preventDefault();
    open();
  });

  trigger.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      open();
    }
  });

  dlg.addEventListener('click', function (e) {
    if (e.target === dlg) close();
  });

  dlg.addEventListener('close', function () {
    if (!isOpen) return;
    close();
  });

  dlg.addEventListener('pointerdown', function (e) {
    if (e.target === dlg) close();
  }, { passive: true });
})();
