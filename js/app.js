/* ═══════════════════════════════════════════════════════════
   xoleric — creative portfolio v3.2
   Corner art (blur reveal) · neon welcome · orbit · live GitHub
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ─────────── ROUTE — open on #hero by default ─────────── */
  try {
    const hash = window.location.hash;
    if (!hash || !document.querySelector(hash)) {
      window.history.replaceState(null, '', '#hero');
    }
  } catch (e) { /* no-op: harmless when history is restricted */ }

  /* ─────────── CONFIG / TOKENS ─────────── */
  const CFG = {
    images: ['images/bg.webp', 'images/main.webp'],
    circle: 200,
    circleMobile: 140,
    githubUser: 'xolerc'
  };

  /* ─────────── DEVICE FLAGS ─────────── */
  const isFine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let coarse = false;
  try { coarse = window.matchMedia('(pointer: coarse)').matches; } catch (e) { /* noop */ }

  /* ─────────── DOM REFS ─────────── */
  const $ = (id) => document.getElementById(id);
  const loaderEl = $('loader');
  const logoContainer = $('logo-container');
  const mainLogo = $('mainLogo');
  const vignette = $('vignette');
  const revealEl = $('reveal');
  const heroEl = document.querySelector('.hero');
  const toastEl = $('eeToast');

  /* ─────────── GLOBAL STATE ─────────── */
  let VW = window.innerWidth;
  let VH = window.innerHeight;

  let rawX = VW / 2, rawY = VH / 2;
  let cursorX = rawX, cursorY = rawY;
  let currentR = 0;
  let hasPointer = false;
  let lastTouchTime = 0;

  let loaded = false;
  let rafId = 0;

  /* ─────────── HELPERS ─────────── */
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  /* ═══════════════════════════════════════
     CONTENT PROTECTION — no select, no copy,
     no screenshots (best effort) — desktop only,
     touch users keep native long-press behavior
     ═══════════════════════════════════════ */

  if (isFine) {
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('copy', (e) => e.preventDefault());
    document.addEventListener('cut', (e) => e.preventDefault());
    document.addEventListener('paste', (e) => e.preventDefault());
    document.addEventListener('selectstart', (e) => e.preventDefault());
    document.addEventListener('dragstart', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      const k = (e.key || '').toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      if (mod && ['c', 'x', 'v', 's', 'p', 'u', 'a'].includes(k)) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (e.key === 'PrintScreen' || k === 'printscreen') {
        e.preventDefault();
        e.stopPropagation();
      }
    });
  }

  /* ═══════════════════════════════════════
     LOADER — qo'lda yozuv (siyoh + qalam ovozi)
     "Xoleric" qo'lyozmadek yoziladi, tagiga imzo
     chizig'i tortiladi, keyin kichikroq
     "frontend dasturchi" qo'shiladi.
     Ovoz WebAudio bilan sintezlanadi (faylsiz):
     harf sari qalam shivirlashi + yakunda chime.
     ═══════════════════════════════════════ */

  let loaderDone = false;
  let handRAF = 0;
  const handCanvas = $('handwrite-canvas');
  const handFallback = $('handwriteFallback');

  function showHandFallback() {
    if (handFallback) handFallback.classList.add('show');
  }

  /* ─────────── LOADER OVOZI (WebAudio, tashqi faylsiz) ─────────── */
  const loaderSound = {
    ctx: null,
    master: null,
    enabled: true,
    stopped: false
  };

  function soundEnsure() {
    if (!loaderSound.enabled || loaderSound.stopped || reduceMotion) return null;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!loaderSound.ctx) {
        loaderSound.ctx = new AC();
        loaderSound.master = loaderSound.ctx.createGain();
        loaderSound.master.gain.value = 0.14;
        loaderSound.master.connect(loaderSound.ctx.destination);
      }
      if (loaderSound.ctx.state === 'suspended') {
        loaderSound.ctx.resume().catch(function () { /* keyingi gestda */ });
        return null;
      }
      return loaderSound.ctx;
    } catch (e) { return null; }
  }

  /* qalam shivirlashi — bitta harf uchun qisqa filtrlangan shovqin */
  function soundScratch() {
    const ctx = soundEnsure();
    if (!ctx) return;
    try {
      const dur = 0.07 + Math.random() * 0.06;
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1700 + Math.random() * 1500;
      bp.Q.value = 1.1;
      const g = ctx.createGain();
      const t = ctx.currentTime;
      g.gain.setValueAtTime(0.001, t);
      g.gain.exponentialRampToValueAtTime(0.35 + Math.random() * 0.3, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(bp);
      bp.connect(g);
      g.connect(loaderSound.master);
      src.start(t);
      src.stop(t + dur + 0.02);
    } catch (e) { /* ovoz bo'lmasa animatsiya davom etadi */ }
  }

  /* yakuniy mayin chime — ikki nota */
  function soundChime() {
    const ctx = soundEnsure();
    if (!ctx) return;
    try {
      const notes = [659.25, 987.77];
      notes.forEach(function (f, i) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const t = ctx.currentTime + i * 0.16;
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.001, t);
        g.gain.exponentialRampToValueAtTime(0.5, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
        o.connect(g);
        g.connect(loaderSound.master);
        o.start(t);
        o.stop(t + 0.75);
      });
    } catch (e) { /* jim davom */ }
  }

  /* brauzer autoplay siyosati: ovoz birinchi gestdan keyin ochiladi */
  window.addEventListener('pointerdown', function () { soundEnsure(); }, { passive: true });
  window.addEventListener('keydown', function () { soundEnsure(); });

  function stopHandwrite() {
    if (handRAF) {
      cancelAnimationFrame(handRAF);
      handRAF = 0;
    }
    loaderSound.stopped = true;
  }

  function startHandwrite() {
    if (!handCanvas || reduceMotion) return;
    let ctx = null;
    try {
      ctx = handCanvas.getContext('2d');
    } catch (e) { showHandFallback(); return; }
    if (!ctx) { showHandFallback(); return; }

    const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    const W = Math.max(320, Math.round(window.innerWidth * DPR));
    const H = Math.max(320, Math.round(window.innerHeight * DPR));
    try {
      handCanvas.width = W;
      handCanvas.height = H;
    } catch (e) { showHandFallback(); return; }

    /* Caveat shrifti yuklanguncha kutish (taym-aut bilan) */
    let fontReady = false;
    try {
      if (document.fonts && document.fonts.load) {
        Promise.race([
          Promise.all([
            document.fonts.load('700 100px Caveat'),
            document.fonts.load('500 100px Caveat')
          ]),
          new Promise(function (res) { setTimeout(res, 1200); })
        ]).then(function () { fontReady = true; });
        setTimeout(function () { fontReady = true; }, 1400);
      } else {
        fontReady = true;
      }
    } catch (e) { fontReady = true; }

    const INK = '#f7f1de';
    const INK_DIM = 'rgba(216, 207, 184, 0.9)';
    const word = 'Xoleric';
    const sub = 'frontend dasturchi';
    const cx = W / 2;
    const baseY = H / 2 - Math.min(H * 0.04, 40 * DPR);
    const mainSize = Math.min(W * 0.17, H * 0.16, 150 * DPR);
    const subSize = Math.min(W * 0.055, 34 * DPR);
    const ROT = -0.06;

    /* vaqt jadvali: asosiy so'z sekin, taglavha tez */
    const t0 = performance.now();
    const WORD_MS = 1000;
    const GAP_MS = 120;
    const SUB_MS = 550;
    const FLOUR_MS = 400;
    const total = WORD_MS + GAP_MS + SUB_MS + FLOUR_MS;

    let prevWn = -1;
    let prevSn = -1;
    let flourishVoiced = false;
    let endVoiced = false;

    function inkFont(size, weight) {
      return weight + ' ' + size + 'px Caveat, "Segoe Script", "Bradley Hand", cursive';
    }

    function drawPen(x, y, r) {
      const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
      glow.addColorStop(0, 'rgba(247, 241, 222, 0.9)');
      glow.addColorStop(1, 'rgba(247, 241, 222, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, r * 3, 0, 6.2832);
      ctx.fill();
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 6.2832);
      ctx.fill();
    }

    (function frame(now) {
      handRAF = 0;
      if (loaderDone) return;
      if (document.hidden) {
        handRAF = requestAnimationFrame(frame);
        return;
      }
      const t = (now || performance.now()) - t0;

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);

      /* mayin markaziy yoritish — siyoh diqqat markazi */
      const vg = ctx.createRadialGradient(cx, baseY, 0, cx, baseY, Math.max(W, H) * 0.45);
      vg.addColorStop(0, 'rgba(247, 241, 222, 0.05)');
      vg.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.translate(cx, baseY);
      ctx.rotate(ROT);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      /* 1-bosqich: asosiy so'z harfma-harf */
      const wp = clamp(t / WORD_MS, 0, 1);
      const wn = Math.floor(wp * word.length);
      ctx.font = inkFont(mainSize, '700');
      ctx.fillStyle = fontReady ? INK : 'rgba(247, 241, 222, 0.85)';
      ctx.shadowColor = 'rgba(247, 241, 222, 0.35)';
      ctx.shadowBlur = 12 * DPR;
      const shown = word.slice(0, wn);
      ctx.fillText(shown, 0, 0);
      ctx.shadowBlur = 0;

      if (wn !== prevWn) {
        prevWn = wn;
        if (wn > 0) soundScratch();
      }

      /* qalam uchi — yozilayotgan harf oxirida */
      if (wn > 0 && wn <= word.length) {
        ctx.font = inkFont(mainSize, '700');
        const wFull = ctx.measureText(word).width;
        const wShown = ctx.measureText(shown).width;
        const px = -wFull / 2 + wShown;
        const jitter = Math.sin(t * 0.05) * 1.5 * DPR;
        drawPen(px, jitter, Math.max(2, mainSize * 0.035));
      }

      /* 2-bosqich: imzo chizig'i (flourish) */
      const fp = clamp((t - WORD_MS - GAP_MS * 0.4) / FLOUR_MS, 0, 1);
      if (fp > 0 && wn >= word.length) {
        ctx.font = inkFont(mainSize, '700');
        const wFull = ctx.measureText(word).width;
        const y0 = mainSize * 0.52;
        ctx.strokeStyle = INK_DIM;
        ctx.lineWidth = Math.max(1.5, mainSize * 0.022);
        ctx.lineCap = 'round';
        ctx.beginPath();
        const x0 = -wFull * 0.55;
        const x1 = wFull * 0.62;
        const ex = x0 + (x1 - x0) * fp;
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo((x0 + x1) / 2, y0 + mainSize * 0.22 * fp, ex, y0 - mainSize * 0.06 * fp);
        ctx.stroke();
        if (fp >= 1 && !flourishVoiced) {
          flourishVoiced = true;
          soundScratch();
        }
      }

      /* 3-bosqich: taglavha */
      const sp = clamp((t - WORD_MS - GAP_MS - FLOUR_MS * 0.4) / SUB_MS, 0, 1);
      if (sp > 0) {
        const sn = Math.floor(sp * sub.length);
        ctx.font = inkFont(subSize, '500');
        ctx.fillStyle = INK_DIM;
        ctx.fillText(sub.slice(0, sn), 0, mainSize * 0.95);
        if (sn !== prevSn) {
          prevSn = sn;
          if (sn > 0 && sn < sub.length) soundScratch();
        }
        if (sp >= 1 && !endVoiced) {
          endVoiced = true;
          soundChime();
        }
      }

      ctx.restore();

      if (t < total + 250) {
        handRAF = requestAnimationFrame(frame);
      }
    })(t0);
  }

  function preloadAssets(onDone) {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onDone();
    };
    /* one overall timeout instead of one per image */
    setTimeout(finish, 2000);
    for (const src of CFG.images) {
      const img = new Image();
      img.onload = finish;
      img.onerror = finish;
      img.src = src;
    }
  }

  function finishLoading() {
    if (loaderDone) return;
    loaderDone = true;
    stopHandwrite();
    if (logoContainer) logoContainer.style.display = 'flex';

    const logoWait = reduceMotion ? 150 : 400;
    const hideWait = reduceMotion ? 300 : 700;
    setTimeout(() => { if (mainLogo) mainLogo.classList.add('stable'); }, logoWait);
    setTimeout(() => {
      loaded = true;
      window.__xolericLoaded = true; /* tells the inline failsafe we're alive */
      loaderEl.classList.add('hidden');
      initMainScene();
    }, hideWait);
  }

  function startLoading() {
    startHandwrite();

    setTimeout(() => {
      if (!loaded) finishLoading();
    }, 6000);

    const minTime = reduceMotion ? 120 : 2300;
    preloadAssets(() => {
      setTimeout(finishLoading, minTime);
    });
  }

  /* ═══════════════════════════════════════
     INPUT — pointer + touch (passive)
     Media-query detection can lie (touch laptops, some WebViews report
     hover:none) — so pointermove is ALWAYS registered and a real mouse
     event permanently flips fineOverride. Self-healing input.
     ═══════════════════════════════════════ */

  function touchActiveRecently() { return Date.now() - lastTouchTime < 700; }
  let lastInputTime = 0;
  let fineOverride = false;
  function inputActiveRecently() {
    return Date.now() - Math.max(lastInputTime, lastTouchTime) < 700;
  }

  window.addEventListener('pointermove', (e) => {
    rawX = e.clientX;
    rawY = e.clientY;
    hasPointer = true;
    lastInputTime = Date.now();
    if (e.pointerType === 'mouse') fineOverride = true;
    if (loaded && heroVisible && !reduceMotion && revealEl && !rafId) startMasterLoop();
  }, { passive: true });

  /* ═══════════════════════════════════════
     CROSSHAIR — kursor joylashuv nishoni.
     Faqat haqiqiy sichqoncha (pointerType mouse) uchun, rAF bilan
     trottle qilingan transform — kompozitor qatlami, arzon.
     ═══════════════════════════════════════ */
  (function initCrosshair() {
    if (reduceMotion) return;
    const ch = document.getElementById('crosshair');
    if (!ch) return;
    const chX = ch.querySelector('.ch-x');
    const chY = ch.querySelector('.ch-y');
    const chDot = ch.querySelector('.ch-dot');
    if (!chX || !chY || !chDot) return;
    let shown = false;
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      /* rAF siz — har bir harakatda darhol transform (nol kechikish) */
      const x = e.clientX, y = e.clientY;
      chX.style.transform = 'translateY(' + y + 'px)';
      chY.style.transform = 'translateX(' + x + 'px)';
      chDot.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      if (!shown) {
        shown = true;
        ch.classList.add('on');
      }
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => {
      shown = false;
      ch.classList.remove('on');
    });
  })();

  if (!isFine) {
    document.addEventListener('touchstart', (e) => {
      const t = e.touches && e.touches[0];
      if (!t) return;
      lastTouchTime = Date.now();
      hasPointer = true;
      rawX = t.clientX;
      rawY = t.clientY;
      if (loaded && heroVisible && !reduceMotion && revealEl) startMasterLoop();
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
      const t = e.touches && e.touches[0];
      if (!t) return;
      lastTouchTime = Date.now();
      hasPointer = true;
      rawX = t.clientX;
      rawY = t.clientY;
      if (loaded && heroVisible && !reduceMotion && revealEl) startMasterLoop();
    }, { passive: true });
    document.addEventListener('touchend', () => {
      lastTouchTime = Date.now();
    }, { passive: true });
  }

  /* ═══════════════════════════════════════
     NEON WELCOME LETTERS
     ═══════════════════════════════════════ */

  const WELCOME_TEXT = 'Men natija beradigan veb-tajribalar yarataman';
  const welcomeEl = $('welcomeText');
  const letterEls = [];

  function buildLetters() {
    if (!welcomeEl) return;
    welcomeEl.textContent = '';
    WELCOME_TEXT.split(/\s+/).forEach((word, wi, arr) => {
      const wordEl = document.createElement('span');
      wordEl.className = 'word';
      word.split('').forEach((char) => {
        const span = document.createElement('span');
        span.textContent = char;
        span.className = 'letter';
        wordEl.appendChild(span);
        letterEls.push(span);
      });
      welcomeEl.appendChild(wordEl);
      if (wi < arr.length - 1) {
        const sp = document.createElement('span');
        sp.className = 'letter space';
        sp.textContent = '\u00A0';
        welcomeEl.appendChild(sp);
        letterEls.push(sp);
      }
    });
  }

  function revealLetters() {
    if (reduceMotion) {
      letterEls.forEach((s) => s.classList.add('visible'));
      return;
    }
    letterEls.forEach((s, i) => {
      setTimeout(() => s.classList.add('visible'), 150 + i * 30);
    });
  }

  /* ═══════════════════════════════════════
     ORBIT — cloned social icons
     ═══════════════════════════════════════ */

  function buildOrbit() {
    const ring = $('orbitRing');
    if (!ring) return;
    const icons = document.querySelectorAll('.footer-social .social-icon');
    icons.forEach((icon, i) => {
      const a = document.createElement('a');
      a.className = 'orbit-icon ' + icon.className.replace('social-icon ', '');
      a.href = icon.getAttribute('href') || '#';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      /* orbit nusxalari dekorativ — footer ikonlarining takrori bo'lgani uchun
         ko'ruvchidan yashirin va tab tartibidan chiqarilgan (fokus takrorlanmaydi) */
      a.setAttribute('aria-hidden', 'true');
      a.tabIndex = -1;
      a.style.setProperty('--a', Math.round(i * (360 / icons.length)) + 'deg');
      const inner = document.createElement('span');
      inner.className = 'icon-inner';
      inner.innerHTML = icon.innerHTML;
      a.appendChild(inner);
      ring.appendChild(a);
    });
  }

  /* ═══════════════════════════════════════
     ORBIT TRAVEL — on ≥1200px the social ring leaves the hero and
     rolls down the page as you scroll. Each frame it picks the lane
     with the fewest content collisions (gutter center → screen edge),
     shrinks to a mini-ring if crowded, and hides completely when
     nothing clear remains — panels and text are never covered.
     Below 1200px (or reduced-motion) it stays inside the hero.
     ═══════════════════════════════════════ */

  function initOrbitTravel() {
    const orbit = $('orbitContainer');
    const ringEl = $('orbitRing');
    const layer = $('orbitLayer');
    const homeParent = orbit ? orbit.parentNode : null;
    if (!orbit || !ringEl || !layer || !homeParent || reduceMotion) return;

    const media = window.matchMedia('(min-width: 1200px)');
    const ICON_INNERS = Array.prototype.slice.call(ringEl.querySelectorAll('.icon-inner'));
    const PAD = 14;           /* minimum distance from the viewport edge */
    let mode = false;
    let rafId = 0, lastT = 0, lastScrollY = -1, collectAt = 0;
    let curX = 0, curY = 0, curOp = 1, tgtX = 0, tgtY = 0, tgtOp = 1, firstFrame = true;
    let blocks = [], widest = null;

    function collectBlocks() {
      collectAt = performance.now() + 4000;
      const sy = window.scrollY;
      blocks = [];
      widest = null;
      document.querySelectorAll('main section, footer').forEach((sec) => {
        const r = sec.getBoundingClientRect();
        if (!widest || r.width > widest.width) widest = { left: r.left, right: r.right };
      });
      /* everything a reader must never lose sight of */
      document.querySelectorAll('.section-title, .eyebrow, .card, .project-card, .stat, .contact-inner p')
        .forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width < 70 || r.height < 26) return;
          blocks.push({ l: r.left, r: r.right, t: r.top + sy, b: r.bottom + sy });
        });
    }

    /* how deeply would a circle at screen-space (cx,cy) overlap content?
       blocks are stored in document coords — convert per query */
    function costOf(cx, cy, rad) {
      let cost = 0;
      const rr = rad * 0.92;
      const sy = window.scrollY;
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        const bt = b.t - sy, bb = b.b - sy;
        if (bb < cy - rr || bt > cy + rr) continue;
        const nx = Math.max(b.l, Math.min(cx, b.r));
        const ny = Math.max(bt, Math.min(cy, bb));
        const dx = cx - nx, dy = cy - ny;
        const d = dx * dx + dy * dy;
        if (d < rr * rr) cost += rr - Math.sqrt(d);
      }
      return cost;
    }

    function pickTarget(rad) {
      const vh = VH;
      const docH = document.documentElement.scrollHeight;
      const prog = Math.min(1, Math.max(0, window.scrollY / Math.max(1, docH - vh)));
      tgtY = vh * (0.38 + 0.24 * prog);

      /* lanes: screen-edge hugs always exist; gutter centers when wide enough */
      const cands = [
        { x: VW - PAD - rad },
        { x: PAD + rad }
      ];
      if (widest) {
        const gl = widest.left, gr = VW - widest.right;
        if (gl > rad * 1.7) cands.push({ x: gl / 2 });
        if (gr > rad * 1.7) cands.push({ x: VW - gr / 2 });
      }
      let best = null;
      for (const c of cands) {
        c.cost = costOf(c.x, tgtY, rad);
        if (!best || c.cost < best.cost) best = c;
      }
      let useRad = rad;
      if (best.cost > 3) {
        /* crowded → try a mini ring hugging the edge before giving up */
        const small = rad * 0.6;
        for (const x of [VW - PAD - small, PAD + small]) {
          const c = costOf(x, tgtY, small);
          if (c < best.cost) { best = { x: x, cost: c }; useRad = small; }
        }
      }
      tgtX = best.x;
      tgtOp = best.cost > 6 ? 0 : 1;
      return useRad;
    }

    /* radius is measured once per adopt/resize — reading offsetWidth every
       frame forces a reflow between style writes and janks the compositor
       (enough to trip the WebGL watchdog on weaker machines) */
    let radCache = 160;
    function measureRad() {
      radCache = Math.max(80, orbit.offsetWidth / 2);
      return radCache;
    }

    function loop(now) {
      rafId = 0;
      if (document.hidden) { lastT = 0; return; }
      const dt = lastT ? Math.min((now - lastT) / 16.666, 3) : 1;
      lastT = now;
      if (now > collectAt) collectBlocks();

      const sc = window.scrollY;
      const rad = pickTarget(radCache);

      if (firstFrame) { curX = tgtX; curY = tgtY; curOp = tgtOp; firstFrame = false; }
      const k = 1 - Math.pow(0.85, dt);
      curX += (tgtX - curX) * k;
      curY += (tgtY - curY) * k;
      curOp += (tgtOp - curOp) * Math.min(1, 0.14 * dt);
      if (curOp < 0.03 && tgtOp === 0) curOp = 0;
      if (curOp > 0.97 && tgtOp === 1) curOp = 1;

      /* scroll-linked roll + slow ambient drift so it never looks dead */
      const ang = sc * 0.18 + now * 0.004;
      orbit.style.transform = 'translate3d(' + (curX - rad).toFixed(1) + 'px,' + (curY - rad).toFixed(1) + 'px,0)';
      orbit.style.opacity = curOp.toFixed(3);
      orbit.style.visibility = curOp <= 0.04 ? 'hidden' : 'visible';
      ringEl.style.transform = 'rotate(' + ang.toFixed(2) + 'deg)';
      for (let i = 0; i < ICON_INNERS.length; i++) {
        ICON_INNERS[i].style.transform = 'rotate(' + (-ang).toFixed(2) + 'deg)';
      }

      lastScrollY = sc;
      /* never park in travel mode: the ambient drift keeps the ring
         spinning even after scrolling stops. Only a hidden tab pauses us,
         and visibilitychange wakes the loop again. */
      rafId = requestAnimationFrame(loop);
    }

    function start() {
      if (!rafId && mode && !document.hidden) {
        lastT = 0;
        rafId = requestAnimationFrame(loop);
      }
    }

    function adopt(on) {
      if (on === mode) return;
      mode = on;
      if (on) {
        layer.classList.add('active');
        layer.appendChild(orbit);
        orbit.classList.add('orbit-travel');
        measureRad();
        collectBlocks();
        firstFrame = true;
        start();
      } else {
        orbit.classList.remove('orbit-travel');
        orbit.style.cssText = '';
        ringEl.style.transform = '';
        for (let i = 0; i < ICON_INNERS.length; i++) ICON_INNERS[i].style.transform = '';
        homeParent.appendChild(orbit);
        layer.classList.remove('active');
      }
    }

    window.addEventListener('scroll', () => { if (mode) start(); }, { passive: true });
    window.addEventListener('resize', () => {
      if (mode) { measureRad(); collectBlocks(); start(); }
    }, { passive: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); }, { passive: true });
    if (media.addEventListener) media.addEventListener('change', () => adopt(media.matches));
    else if (media.addListener) media.addListener(() => adopt(media.matches));
    adopt(media.matches);
  }

  /* ═══════════════════════════════════════
     SCROLL — progress, header, scroll spy, reveals
     ═══════════════════════════════════════ */

  const scrollProgress = $('scrollProgress');
  const siteHeader = $('siteHeader');
  const navLinks = Array.prototype.slice.call(document.querySelectorAll('.site-nav a'));
  const navTargets = [];
  for (const link of navLinks) {
    const sec = document.querySelector(link.getAttribute('href'));
    if (sec) navTargets.push({ link, sec });
  }

  let heroVisible = true;
  let revealRect = { left: 0, top: 0, width: 0, height: 0 };

  function onScroll() {
    const max = document.documentElement.scrollHeight - VH;
    const p = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
    if (scrollProgress) scrollProgress.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    if (siteHeader) siteHeader.classList.toggle('scrolled', window.scrollY > 10);
  }

  function measureReveal() {
    if (!revealEl) return;
    const r = revealEl.getBoundingClientRect();
    revealRect = { left: r.left, top: r.top, width: r.width, height: r.height };
  }

  let scrollRaf = 0;
  window.addEventListener('scroll', () => {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0;
      onScroll();
      if (heroVisible) measureReveal();
      if (heroVisible && !reduceMotion && revealEl && !rafId) startMasterLoop();
    });
  }, { passive: true });

  const hasIO = typeof IntersectionObserver !== 'undefined';

  function setActiveNav(id) {
    for (const t of navTargets) t.link.classList.toggle('active', t.link.getAttribute('href') === id);
  }

  function initNavSpy() {
    if (!navTargets.length || !hasIO) return;
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) setActiveNav('#' + entry.target.id);
      }
    }, { rootMargin: '-45% 0px -50% 0px' });
    for (const t of navTargets) io.observe(t.sec);
    setActiveNav('#hero');
  }

  function initViewportSpy() {
    if (!heroEl || !hasIO) return;
    const io = new IntersectionObserver((entries) => {
      heroVisible = entries.some((e) => e.isIntersecting);
      measureReveal();
      if (heroVisible) startMasterLoop();
    }, { threshold: 0 });
    io.observe(heroEl);
  }

  function initReveal() {
    if (reduceMotion) return;
    const els = document.querySelectorAll('.reveal-up');
    if (!hasIO) {
      els.forEach((el) => el.classList.add('in-view'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      }
    }, { threshold: 0.18 });
    els.forEach((el) => io.observe(el));
  }

  function setStatsFinal() {
    const els = document.querySelectorAll('.stat-number');
    els.forEach((el) => {
      const target = parseInt(el.dataset.count, 10) || 0;
      el.textContent = target + '+';
    });
  }

  let statsDone = false;
  function animateStats() {
    if (statsDone) return;
    statsDone = true;
    if (reduceMotion) { setStatsFinal(); return; }
    const els = document.querySelectorAll('.stat-number');
    const t0 = performance.now();
    const dur = 1400;
    let statFrame = 0;
    let lastT = t0;
    (function step(now) {
      const p = clamp((now - t0) / dur, 0, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      statFrame++;
      if (!coarse || statFrame % 2 === 0) {
        els.forEach((el) => {
          const target = parseInt(el.dataset.count, 10) || 0;
          el.textContent = Math.round(target * ease) + '+';
        });
      }
      if (p < 1) requestAnimationFrame(step);
      else els.forEach((el) => {
        const target = parseInt(el.dataset.count, 10) || 0;
        el.textContent = target + '+';
      });
    })(lastT);
  }

  function initStatsSpy() {
    const about = document.getElementById('about');
    if (!about && !document.querySelector('.about-stats')) { animateStats(); return; }
    if (!hasIO) { animateStats(); return; }
    if (reduceMotion) { setStatsFinal(); return; }

    /* FIX: threshold 0.4 on the tall #about section can never be reached on
       mobile (section height >> viewport height → max ratio < 0.4), so the
       counters stayed at 0 forever. Observe the small .about-stats block
       instead, with a low threshold + bottom rootMargin as a safety net. */
    const statsEl = document.querySelector('.about-stats');
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        animateStats();
        io.disconnect();
      }
    }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
    if (statsEl) io.observe(statsEl);

    const ioAbout = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        animateStats();
        ioAbout.disconnect();
      }
    }, { threshold: 0 });
    ioAbout.observe(about);
  }

  /* ═══════════════════════════════════════
     FLASHLIGHT REVEAL — V1 style, art box only
     ═══════════════════════════════════════ */

  let lastMask = '';
  const ZERO_MASK = 'radial-gradient(circle 0px at 50% 50%, #000 0%, transparent 100%)';
  function setMask(mask) {
    if (mask === lastMask) return;
    lastMask = mask;
    revealEl.style.maskImage = mask;
    revealEl.style.webkitMaskImage = mask;
  }

  /* Delta-time normalized lerp: animation speed is time-based, not FPS-based.
     dt is computed ONCE per frame (frameDt) and shared by every lerp in that
     frame — otherwise the first consumer eats the whole delta and the rest
     see dt=0 and never move. Clamped so background-tab jumps stay safe. */
  let lastLoopT = 0;
  function frameDt(now) {
    if (!lastLoopT) { lastLoopT = now; return 1; }
    const dt = Math.min((now - lastLoopT) / 16.666, 3);
    lastLoopT = now;
    return dt;
  }
  function frameLerp(current, target, base, dt) {
    const k = 1 - Math.pow(1 - base, dt);
    return current + (target - current) * k;
  }

  /* Idle auto-stop: while nothing moves we stop the rAF loop entirely
     (zero CPU/GPU on a static hero) and restart it from input events. */
  const IDLE_STOP_FRAMES = 40;
  let idleFrames = 0;

  function updateReveal(now) {
    if (!revealEl || reduceMotion) return false;
    const dt = frameDt(now);
    cursorX = frameLerp(cursorX, rawX, 0.12, dt);
    cursorY = frameLerp(cursorY, rawY, 0.12, dt);

    if (!heroVisible) {
      currentR = 0;
      setMask(ZERO_MASK);
      return true;
    }

    const mx = cursorX - revealRect.left;
    const my = cursorY - revealRect.top;
    const inside = mx >= -24 && my >= -24 && mx <= revealRect.width + 24 && my <= revealRect.height + 24;

    let targetR = 0;
    if (heroVisible && hasPointer && inside) {
      const fineNow = isFine || fineOverride;
      targetR = fineNow ? CFG.circle : CFG.circleMobile;
      if (!fineNow && !inputActiveRecently()) targetR = 0;
    }

    currentR = frameLerp(currentR, targetR, 0.1, dt);
    if (Math.abs(currentR - targetR) < 0.5) currentR = targetR;

    /* V1 falloff exactly: black core to 40%, smooth fade to the edge */
    const smx = clamp(mx, 0, revealRect.width).toFixed(1);
    const smy = clamp(my, 0, revealRect.height).toFixed(1);

    const mask =
      currentR > 0.5 && revealRect.width > 0
        ? `radial-gradient(circle ${currentR.toFixed(1)}px at ${smx}px ${smy}px, #000 0%, #000 40%, transparent 100%)`
        : ZERO_MASK;

    setMask(mask);

    /* settled? → report idle so the loop can park itself */
    return !(
      Math.abs(rawX - cursorX) < 0.35 &&
      Math.abs(rawY - cursorY) < 0.35 &&
      currentR === targetR
    );
  }

  function startMasterLoop() {
    if (reduceMotion || !revealEl || rafId) return;
    idleFrames = 0;
    lastLoopT = 0;
    rafId = requestAnimationFrame(masterLoop);
  }

  let masterFrame = 0;
  function masterLoop(now) {
    masterFrame++;
    if (coarse && masterFrame % 2 === 0) {
      rafId = requestAnimationFrame(masterLoop);
      return;
    }
    let active = true;
    try {
      active = updateReveal(now);
    } catch (e) {
      rafId = 0;
      return;
    }
    if (!active) {
      idleFrames++;
      if (idleFrames >= IDLE_STOP_FRAMES) {
        rafId = 0; /* parked — any pointer/touch/scroll event restarts us */
        return;
      }
    } else {
      idleFrames = 0;
    }
    if (!heroVisible && currentR === 0) {
      rafId = 0;
      return;
    }
    rafId = requestAnimationFrame(masterLoop);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    } else if (loaded && !reduceMotion) {
      startMasterLoop();
    }
  });

  /* ═══════════════════════════════════════
     PROJECTS — live from GitHub API
     ═══════════════════════════════════════ */

  const LANG_COLORS = {
    JavaScript: '#f1e05a',
    TypeScript: '#3178c6',
    Dart: '#00b4ab',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Python: '#3572A5',
    'C++': '#f34b7d',
    Java: '#b07219',
    Go: '#00ADD8',
    Rust: '#dea584'
  };

  const FALLBACK_PROJECTS = [
    { name: 'Mydrime', language: 'HTML', role: 'Muallif', impact: 'shu portfolio, GitHub Pages’da jonli', description: 'Aynan shu portfolio — kreativ kod, WebGL fon va neon kutib olish.', html_url: 'https://github.com/xolerc/mydrime', stargazers_count: 0, forks_count: 0, updated_at: new Date().toISOString() },
    { name: 'Music', language: 'Dart', role: 'Muallif', impact: 'kross-platforma musiqa prototipi', description: 'Musiqa ilovasi tajribasi.', html_url: 'https://github.com/xolerc/music', stargazers_count: 0, forks_count: 0, updated_at: new Date().toISOString() },
    { name: 'xolericc', language: 'TypeScript', role: 'Muallif', impact: 'TypeScript tajribalar', description: 'Tajribalar va snippetlar.', html_url: 'https://github.com/xolerc/xolericc', stargazers_count: 0, forks_count: 0, updated_at: new Date().toISOString() },
    { name: 'Savodhon', language: 'Python', role: 'Muallif', impact: 'yordamchi uskunalar', description: 'Yordamchi loyiha.', html_url: 'https://github.com/xolerc/Savodhon', stargazers_count: 0, forks_count: 0, updated_at: new Date().toISOString() },
    { name: 'Abdullo-usta', language: 'JavaScript', role: 'Muallif', impact: 'mijoz loyihasi', description: 'Hunarmandchilik loyihasi.', html_url: 'https://github.com/xolerc/Abdullo-usta', stargazers_count: 0, forks_count: 0, updated_at: new Date().toISOString() },
    { name: 'xoleric-globe', language: 'CSS', role: 'Muallif', impact: 'WebGL globus tajribasi', description: 'Globus tajribasi.', html_url: 'https://github.com/xolerc/xoleric-globe', stargazers_count: 0, forks_count: 0, updated_at: new Date().toISOString() }
  ];

  function esc(str) {
    return String(str).replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  function renderCards(list) {
    const grid = $('projectsGrid');
    if (!grid) return;
    grid.textContent = '';
    const frag = document.createDocumentFragment();
    list.forEach((r, i) => {
      const lang = r.language || 'Kod';
      const langColor = LANG_COLORS[r.language] || '#8b949e';
      const desc = esc((r.description || 'Tavsif berilmagan.').slice(0, 130));
      const stars = r.stargazers_count || 0;
      const forks = r.forks_count || 0;
      const date = new Date(r.updated_at || Date.now()).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'short' });
      const role = r.role || '';
      const impact = r.impact || '';
      const impactLine = (role || impact)
        ? '<div class="card-impact">' +
          (role ? '<span>Rol: ' + esc(role) + '</span>' : '') +
          (role && impact ? ' · ' : '') +
          (impact ? '<span>Ta’siri: ' + esc(impact) + '</span>' : '') +
          '</div>'
        : '';

      const card = document.createElement('article');
      card.className = 'project-card reveal-up';
      card.style.setProperty('--d', (i * 0.08).toFixed(2) + 's');
      card.innerHTML =
        '<div class="card-art">' +
        `<span class="card-art-lang" style="background:${langColor};color:${langColor}"></span>` +
        `<span class="card-art-name">${esc(r.name)}</span>` +
        '</div>' +
        '<div class="card-body">' +
        `<span class="card-tag">${esc(lang)}</span>` +
        `<h3>${esc(r.name)}</h3>` +
        `<p>${desc}</p>` +
        impactLine +
        '<div class="card-meta">' +
        `<span class="meta-stars">★ ${stars}</span>` +
        `<span class="meta-forks">⑂ ${forks}</span>` +
        `<span class="meta-updated">${date}</span>` +
        '</div>' +
        `<a class="card-link" href="${esc(r.html_url)}" target="_blank" rel="noopener noreferrer">GitHub'da ochish →</a>` +
        '</div>';
      frag.appendChild(card);
    });
    grid.appendChild(frag);
    initReveal();
  }

  function buildProjectCards() {
    let done = false;
    const finish = (fn) => (...args) => {
      if (done) return;
      done = true;
      fn.apply(null, args);
    };
    const renderFallback = finish(() => renderCards(FALLBACK_PROJECTS));
    /* 24-soatlik localStorage keshi — xato bo'lsa eski oqim ishlayveradi */
    try {
      const cached = JSON.parse(localStorage.getItem('xol_gh_cache') || 'null');
      if (cached && cached.t && (Date.now() - cached.t) < 86400000 && Array.isArray(cached.repos) && cached.repos.length) {
        renderCards(cached.repos);
        return;
      }
    } catch (e) { /* cache miss — tarmoqdan davom etadi */ }
    setTimeout(renderFallback, 6000);

    /* Abort after 5s so a hanging request can't delay the grid */
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    if (ctrl) setTimeout(() => ctrl.abort(), 5000);

    fetch(`https://api.github.com/users/${CFG.githubUser}/repos?sort=updated&per_page=100`, ctrl ? { signal: ctrl.signal } : undefined)
      .then((res) => {
        if (!res.ok) throw new Error('GitHub fetch failed');
        return res.json();
      })
      .then(finish((repos) => {
        const list = (repos || [])
          .filter((r) => !r.fork)
          .slice(0, 6);
        if (!list.length) throw new Error('No repos');
        try { localStorage.setItem('xol_gh_cache', JSON.stringify({ t: Date.now(), repos: list })); } catch (e) { /* quota/xatoda jim o'tadi */ }
        renderCards(list);
      }))
      .catch(renderFallback);
  }

  /* ═══════════════════════════════════════
     EASTER EGGS — Konami + fullscreen
     ═══════════════════════════════════════ */

  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let konamiIdx = 0;
  let eeActive = false;

  window.addEventListener('keydown', (e) => {
    if (e.key === KONAMI[konamiIdx]) {
      konamiIdx++;
      if (konamiIdx === KONAMI.length) {
        konamiIdx = 0;
        toggleEasterEgg();
      }
    } else {
      konamiIdx = 0;
    }
  });

  function toggleEasterEgg() {
    eeActive = !eeActive;
    document.body.classList.toggle('ee-mode', eeActive);
    if (!toastEl) return;
    toastEl.textContent = eeActive ? 'Konami Kodi Faollashdi' : 'Konami Kodi O‘chirildi';
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 2500);
  }

  function toggleFullscreen() {
    try {
      const el = document.documentElement;
      const isFs = document.fullscreenElement || document.webkitFullscreenElement;
      if (!isFs) {
        const p = el.requestFullscreen ? el.requestFullscreen()
          : el.webkitRequestFullscreen && el.webkitRequestFullscreen();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } else {
        const p = document.exitFullscreen ? document.exitFullscreen()
          : document.webkitExitFullscreen && document.webkitExitFullscreen();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
    } catch (e) { /* noop */ }
  }

  let zeroCount = 0;
  let zeroTimer = null;
  document.addEventListener('keydown', (e) => {
    if (e.key === '0') {
      zeroCount++;
      clearTimeout(zeroTimer);
      zeroTimer = setTimeout(() => { zeroCount = 0; }, 1500);
      if (zeroCount >= 4) {
        zeroCount = 0;
        toggleFullscreen();
      }
    }
  });

  /* ═══════════════════════════════════════
      WEBGL WAVE BACKGROUND — the only background.
      Always on when supported; no toggle UI. If it can't run,
      the static body gradient shows instead (invisible fallback).
      ═══════════════════════════════════════ */

  function initBg() {
    const glApi = window.xolericGL || null;
    if (!glApi || !glApi.canRun()) return;
    glApi.enable();
  }

  function initSpotlight() {
    if (reduceMotion) return;
    const sp = $('spotlight');
    if (!sp) return;
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      sp.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
    }, { passive: true });
  }

  /* ═══════════════════════════════════════
     INIT
     ═══════════════════════════════════════ */

  function onResize() {
    VW = window.innerWidth;
    VH = window.innerHeight;
    rawX = clamp(rawX, 0, VW);
    rawY = clamp(rawY, 0, VH);
    measureReveal();
    onScroll();
  }

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(onResize, 150);
  });

  function initMainScene() {
    try { vignette.classList.add('visible'); } catch (e) { /* noop */ }
    if (heroEl) heroEl.classList.add('ready');
    if (siteHeader) siteHeader.classList.add('visible');
    try { buildOrbit(); } catch (e) { /* noop */ }
    try { initOrbitTravel(); } catch (e) { /* noop */ }
    try { buildLetters(); } catch (e) { /* noop */ }
    try { buildProjectCards(); } catch (e) { /* noop */ }
    try { initStatsSpy(); } catch (e) { /* noop */ }
    try { initNavSpy(); } catch (e) { /* noop */ }
    try { initViewportSpy(); } catch (e) { /* noop */ }
    try { measureReveal(); } catch (e) { /* noop */ }
    try { initBg(); } catch (e) { /* noop */ }
    try { initSpotlight(); } catch (e) { /* noop */ }

    if (!reduceMotion && revealEl) {
      startMasterLoop();
    }
    try { revealLetters(); } catch (e) { /* noop */ }

    const yearEl = $('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    try { onScroll(); } catch (e) { /* noop */ }
  }

  startLoading();
})();
