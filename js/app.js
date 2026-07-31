/* ═══════════════════════════════════════════════════════════
   xoleric — creative portfolio v3.1 (V1 spirit + V3 skeleton)
   Flashlight mask-reveal · neon welcome · orbit · single loop
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ─────────── CONFIG / TOKENS ─────────── */
  const CFG = {
    images: ['images/bg.png', 'images/main.png'],
    circle: 200,
    circleMobile: 140,
    neuronCount: 20,
    connectDist: 170,
    cursorRepel: 210,
    letterRadius: 150,
    letterForce: 34,
    warpStars: 30,
    splashCount: 16
  };

  /* ─────────── DEVICE FLAGS ─────────── */
  const isMobile = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  const isFine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ─────────── DOM REFS ─────────── */
  const $ = (id) => document.getElementById(id);
  const loaderEl = $('loader');
  const loaderText = $('loaderText');
  const loaderBar = $('loaderBar');
  const loaderFill = $('loaderFill');
  const loaderPct = $('loaderPct');
  const vignette = $('vignette');
  const fxCanvas = $('fx');
  const fctx = fxCanvas.getContext('2d');
  const cursorDot = $('cursorDot');
  const cursorHalo = $('cursorHalo');
  const layerMain = $('layerMain');
  const revealEl = $('reveal');
  const heroEl = document.querySelector('.hero');
  const toastEl = $('eeToast');

  /* ─────────── GLOBAL STATE ─────────── */
  let VW = window.innerWidth;
  let VH = window.innerHeight;
  let dpr = 1;

  let rawX = VW / 2, rawY = VH / 2;
  let cursorX = rawX, cursorY = rawY;
  let haloX = rawX, haloY = rawY;
  let targetR = 0, currentR = 0;
  let hasPointer = false;

  let loaded = false;
  let lastFrame = 0;
  let rafId = 0;

  /* ─────────── HELPERS ─────────── */
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const rand = (min, max) => Math.random() * (max - min) + min;

  function setupCanvas(canvas) {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(VW * dpr);
    canvas.height = Math.round(VH * dpr);
  }
  const resetCtx = (ctx) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, VW, VH);
  };

  /* ═══════════════════════════════════════
     LOADER — real preload + failsafe
     ═══════════════════════════════════════ */

  const lCanvas = $('loaderCanvas');
  const lctx = lCanvas.getContext('2d');
  setupCanvas(lCanvas);

  const loaderParticles = [];
  const LOADER_COUNT = reduceMotion ? 0 : 110;
  for (let i = 0; i < LOADER_COUNT; i++) {
    loaderParticles.push({
      x: Math.random() * VW,
      y: Math.random() * VH,
      tx: VW / 2, ty: VH / 2,
      size: rand(1, 3.5),
      alpha: rand(0.2, 0.8),
      speed: rand(0.005, 0.025),
      color: `rgba(${Math.round(rand(100, 200))}, ${Math.round(rand(150, 250))}, 255, `,
      exploded: false, vx: 0, vy: 0
    });
  }

  let loaderProgress = 0;
  let loaderShown = 0;

  function drawLoader() {
    resetCtx(lctx);
    for (let i = 0; i < loaderParticles.length; i++) {
      for (let j = i + 1; j < loaderParticles.length; j++) {
        const a = loaderParticles[i], b = loaderParticles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 80) {
          lctx.beginPath();
          lctx.moveTo(a.x, a.y);
          lctx.lineTo(b.x, b.y);
          lctx.strokeStyle = `rgba(74, 144, 226, ${(1 - dist / 80) * 0.3})`;
          lctx.lineWidth = 0.5;
          lctx.stroke();
        }
      }
    }
    for (const p of loaderParticles) {
      if (!p.exploded) {
        p.x += (p.tx - p.x) * p.speed;
        p.y += (p.ty - p.y) * p.speed;
      } else {
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.98; p.vy *= 0.98;
        p.alpha *= 0.97;
      }
      lctx.beginPath();
      lctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      lctx.fillStyle = p.color + Math.max(p.alpha, 0) + ')';
      lctx.fill();
    }
    loaderShown = lerp(loaderShown, loaderProgress, 0.12);
    if (loaderShown < 0.5) loaderShown = 0;
    loaderFill.style.width = clamp(loaderShown, 0, 100) + '%';
    loaderPct.textContent = Math.round(clamp(loaderShown, 0, 100)) + '%';
    if (!loaded) requestAnimationFrame(drawLoader);
  }

  function preloadAssets(onDone) {
    let count = 0;
    for (const src of CFG.images) {
      const img = new Image();
      const resolve = () => {
        count++;
        loaderProgress = (count / CFG.images.length) * 100;
        if (count === CFG.images.length) onDone();
      };
      img.onload = resolve;
      img.onerror = resolve;
      img.src = src;
    }
  }

  function explodeLoader() {
    for (const p of loaderParticles) {
      if (!p.exploded) {
        p.exploded = true;
        const angle = Math.atan2(p.y - VH / 2, p.x - VW / 2);
        const power = rand(5, 15);
        p.vx = Math.cos(angle) * power;
        p.vy = Math.sin(angle) * power;
      }
    }
  }

  function finishLoading() {
    explodeLoader();
    setTimeout(() => {
      loaded = true;
      loaderEl.classList.add('hidden');
      initMainScene();
    }, 550);
  }

  function startLoading() {
    loaderText.classList.add('visible');
    loaderBar.classList.add('visible');
    loaderPct.classList.add('visible');
    drawLoader();

    setTimeout(() => {
      if (!loaded) {
        loaderProgress = 100;
        finishLoading();
      }
    }, 8000);

    const minTime = reduceMotion ? 150 : 1400;
    preloadAssets(() => {
      setTimeout(finishLoading, minTime);
    });
  }

  /* ═══════════════════════════════════════
     INPUT — pointer + touch (passive)
     ═══════════════════════════════════════ */

  const HOVER_SELECTOR = 'a, button, .project-card, .blurb';

  if (isFine) {
    window.addEventListener('pointermove', (e) => {
      rawX = e.clientX;
      rawY = e.clientY;
      hasPointer = true;
      cursorDot.style.left = rawX + 'px';
      cursorDot.style.top = rawY + 'px';
    }, { passive: true });

    window.addEventListener('pointerdown', (e) => {
      if (!loaded || reduceMotion) return;
      createSplash(e.clientX, e.clientY);
    }, { passive: true });

    document.addEventListener('pointerover', (e) => {
      if (e.target.closest && e.target.closest(HOVER_SELECTOR)) {
        cursorDot.classList.add('hovering');
        cursorHalo.classList.add('hovering');
      }
    });
    document.addEventListener('pointerout', (e) => {
      if (e.target.closest && e.target.closest(HOVER_SELECTOR)) {
        cursorDot.classList.remove('hovering');
        cursorHalo.classList.remove('hovering');
      }
    });
  } else {
    document.addEventListener('touchstart', (e) => {
      lastTouchTime = Date.now();
      const t = e.touches[0];
      rawX = t.clientX;
      rawY = t.clientY;
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
      lastTouchTime = Date.now();
      const t = e.touches[0];
      rawX = t.clientX;
      rawY = t.clientY;
    }, { passive: true });
    document.addEventListener('touchend', () => {
      lastTouchTime = Date.now();
    }, { passive: true });
  }

  let lastTouchTime = 0;
  function touchActiveRecently() { return Date.now() - lastTouchTime < 700; }

  /* ═══════════════════════════════════════
     NEON WELCOME LETTERS
     ═══════════════════════════════════════ */

  const WELCOME_TEXT = 'welcome to xoleric portfolio';
  const welcomeEl = $('welcomeText');
  const letterEls = [];
  const letterStates = [];

  function buildLetters() {
    if (!welcomeEl) return;
    welcomeEl.textContent = '';
    WELCOME_TEXT.split('').forEach((char, i) => {
      const span = document.createElement('span');
      span.textContent = char === ' ' ? '\u00A0' : char;
      span.className = char === ' ' ? 'letter space' : 'letter';
      welcomeEl.appendChild(span);
      letterEls.push(span);
      letterStates.push({ x: 0, y: 0, vx: 0, vy: 0, glow: 0, scale: 0, rx: 0, ry: 0 });
    });
  }

  function revealLetters() {
    if (reduceMotion) {
      letterEls.forEach((s) => s.classList.add('visible'));
      return;
    }
    letterEls.forEach((s, i) => {
      setTimeout(() => s.classList.add('visible'), 150 + i * 45);
    });
  }

  function updateLetters(heroInView) {
    if (reduceMotion || !heroInView || !isFine || !hasPointer) return;
    for (let i = 0; i < letterEls.length; i++) {
      const span = letterEls[i];
      if (!span.classList.contains('visible')) continue;
      const rect = span.getBoundingClientRect();
      const lx = rect.left + rect.width / 2;
      const ly = rect.top + rect.height / 2;
      const dx = rawX - lx;
      const dy = rawY - ly;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const s = letterStates[i];

      let fx = 0, fy = 0, glow = 0, scale = 0, rx = 0, ry = 0;
      if (dist < CFG.letterRadius && dist > 0) {
        const power = Math.pow(1 - dist / CFG.letterRadius, 2);
        fx = -(dx / dist) * CFG.letterForce * power;
        fy = -(dy / dist) * CFG.letterForce * power;
        glow = power;
        scale = power * 0.12;
        rx = -(dy / dist) * 18 * power;
        ry = (dx / dist) * 18 * power;
      }

      s.vx += fx; s.vy += fy;
      s.vx *= 0.88; s.vy *= 0.88;
      s.x += s.vx + -s.x * 0.12;
      s.y += s.vy + -s.y * 0.12;
      s.glow = lerp(s.glow, glow, 0.15);
      s.scale = lerp(s.scale, scale, 0.15);
      s.rx = lerp(s.rx, rx, 0.1);
      s.ry = lerp(s.ry, ry, 0.1);

      const k = 1 + s.scale;
      const g = s.glow;
      const hue = 190 + g * 60;
      span.style.transform =
        `translate(${s.x}px, ${s.y}px) scale(${k}) perspective(500px) rotateX(${s.rx}deg) rotateY(${s.ry}deg)`;
      span.style.textShadow =
        `0 0 ${10 + g * 30}px hsla(${hue}, 100%, 70%, ${0.3 + g * 0.7}),` +
        `0 0 ${20 + g * 50}px hsla(${hue}, 100%, 60%, ${0.1 + g * 0.5}),` +
        `0 0 ${5 + g * 15}px rgba(255,255,255,${g * 0.4})`;
      span.style.color = g > 0.3
        ? `hsl(${hue}, ${60 + g * 40}%, ${80 + g * 15}%)`
        : 'rgba(230, 230, 230, 0.92)';
    }
  }

  document.addEventListener('mouseover', (e) => {
    if (reduceMotion) return;
    const letter = e.target.closest && e.target.closest('.hero-title .letter');
    if (!letter) return;
    letter.classList.remove('glitch');
    void letter.offsetWidth;
    letter.classList.add('glitch');
    setTimeout(() => letter.classList.remove('glitch'), 600);
  });

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
     SCROLL — progress, header, scroll spy, reveals
     ═══════════════════════════════════════ */

  const scrollProgress = $('scrollProgress');
  const siteHeader = $('siteHeader');

  function onScroll() {
    const doc = document.documentElement;
    const max = doc.scrollHeight - VH;
    const p = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
    if (scrollProgress) scrollProgress.style.width = p * 100 + '%';
    if (siteHeader) siteHeader.classList.toggle('scrolled', window.scrollY > 10);

    let current = '#hero';
    document.querySelectorAll('.site-nav a').forEach((link) => {
      const sec = document.querySelector(link.getAttribute('href'));
      if (!sec) return;
      const rect = sec.getBoundingClientRect();
      if (rect.top <= VH * 0.5 && rect.bottom > VH * 0.5) current = link.getAttribute('href');
    });
    document.querySelectorAll('.site-nav a').forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === current);
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  function initReveal() {
    if (reduceMotion) return;
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      }
    }, { threshold: 0.18 });
    document.querySelectorAll('.reveal-up').forEach((el) => io.observe(el));
  }

  let statsDone = false;
  function animateStats() {
    if (statsDone || reduceMotion) return;
    statsDone = true;
    const els = document.querySelectorAll('.stat-number');
    const t0 = performance.now();
    const dur = 1400;
    (function step(now) {
      const p = clamp((now - t0) / dur, 0, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      els.forEach((el) => {
        const target = parseInt(el.dataset.count, 10) || 0;
        el.textContent = Math.round(target * ease) + '+';
      });
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  function initStatsSpy() {
    if (reduceMotion) return;
    const about = document.getElementById('about');
    if (!about) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        animateStats();
        io.disconnect();
      }
    }, { threshold: 0.4 });
    io.observe(about);
  }

  /* ═══════════════════════════════════════
     EFFECTS ENGINE — neural + warp + splash
     ═══════════════════════════════════════ */

  const neurons = [];
  const neuronCount = reduceMotion ? 0 : (isMobile ? 10 : CFG.neuronCount);

  function makeNeuron() {
    let x, y;
    do {
      x = Math.random() * VW;
      y = Math.random() * VH;
    } while (Math.sqrt((x - rawX) ** 2 + (y - rawY) ** 2) < CFG.cursorRepel);
    return {
      x, y,
      vx: rand(-0.01, 0.01),
      vy: rand(-0.01, 0.01),
      size: rand(2, 4),
      opacity: rand(0.25, 0.7),
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: rand(0.001, 0.004),
      drift: Math.random() * Math.PI * 2,
      driftSpeed: rand(0.0001, 0.0005),
      driftRadius: rand(0.004, 0.014)
    };
  }
  for (let i = 0; i < neuronCount; i++) neurons.push(makeNeuron());

  function updateNeurons() {
    for (const n of neurons) {
      const dx = rawX - n.x, dy = rawY - n.y;
      const dCursor = Math.sqrt(dx * dx + dy * dy);
      if (dCursor < CFG.cursorRepel && dCursor > 0) {
        const f = (1 - dCursor / CFG.cursorRepel) * 0.4;
        n.vx -= (dx / dCursor) * f;
        n.vy -= (dy / dCursor) * f;
      }
      n.vx *= 0.96;
      n.vy *= 0.96;
      n.drift += n.driftSpeed;
      n.vx += Math.sin(n.drift) * n.driftRadius;
      n.vy += Math.cos(n.drift * 0.7) * n.driftRadius;
      n.x += n.vx;
      n.y += n.vy;
      n.pulse += n.pulseSpeed;
      if (n.x < -30) n.x = VW + 30;
      if (n.x > VW + 30) n.x = -30;
      if (n.y < -30) n.y = VH + 30;
      if (n.y > VH + 30) n.y = -30;
    }
  }

  function drawNeurons() {
    for (let i = 0; i < neurons.length; i++) {
      for (let j = i + 1; j < neurons.length; j++) {
        const a = neurons[i], b = neurons[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CFG.connectDist) {
          const t = 1 - dist / CFG.connectDist;
          fctx.beginPath();
          fctx.moveTo(a.x, a.y);
          fctx.lineTo(b.x, b.y);
          fctx.strokeStyle = `rgba(210, 170, 0, ${t * 0.5})`;
          fctx.lineWidth = t * 1.5;
          fctx.stroke();
        }
      }
    }
    for (const n of neurons) {
      const alpha = n.opacity * (0.6 + Math.sin(n.pulse) * 0.4);
      fctx.beginPath();
      fctx.arc(n.x, n.y, n.size * 2, 0, Math.PI * 2);
      fctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.1})`;
      fctx.fill();
      fctx.beginPath();
      fctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
      fctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      fctx.fill();
      fctx.beginPath();
      fctx.arc(n.x, n.y, n.size * 0.5, 0, Math.PI * 2);
      fctx.fillStyle = `rgba(20, 18, 0, ${alpha * 0.8})`;
      fctx.fill();
    }
  }

  /* Warp streaks clipped inside the flashlight circle */
  function drawWarp(now) {
    if (currentR < 0.5) return;
    fctx.save();
    fctx.beginPath();
    fctx.arc(cursorX, cursorY, currentR, 0, Math.PI * 2);
    fctx.clip();

    const starCount = CFG.warpStars;
    for (let i = 0; i < starCount; i++) {
      const a = (i / starCount) * Math.PI * 2 + now * 0.001;
      const speed = (now * 0.4 + i * 19) % currentR;
      const sx = cursorX + Math.cos(a) * speed;
      const sy = cursorY + Math.sin(a) * speed;
      const len = speed * 0.16;
      const alpha = (1 - speed / currentR) * 0.4;
      fctx.beginPath();
      fctx.moveTo(sx, sy);
      fctx.lineTo(sx - Math.cos(a) * len, sy - Math.sin(a) * len);
      fctx.strokeStyle = `rgba(200, 220, 255, ${alpha})`;
      fctx.lineWidth = 1.4;
      fctx.stroke();
    }
    fctx.restore();
  }

  /* Click splash */
  let splashes = [];
  function createSplash(x, y) {
    const count = CFG.splashCount;
    const particles = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + rand(-0.25, 0.25);
      const speed = rand(2, 7);
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: rand(1, 3),
        alpha: rand(0.7, 1),
        decay: rand(0.02, 0.04),
        hue: 190 + Math.random() * 40
      });
    }
    splashes.push({ particles, ringRadius: 0, ringAlpha: 0.7, cx: x, cy: y });
  }

  function updateSplashes() {
    for (let i = splashes.length - 1; i >= 0; i--) {
      const sp = splashes[i];
      sp.ringRadius += 3;
      sp.ringAlpha -= 0.02;
      for (let j = sp.particles.length - 1; j >= 0; j--) {
        const p = sp.particles[j];
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.97; p.vy *= 0.97;
        p.alpha -= p.decay;
        if (p.alpha <= 0) sp.particles.splice(j, 1);
      }
      if (!sp.particles.length) splashes.splice(i, 1);
    }
  }

  function drawSplashes() {
    for (const sp of splashes) {
      if (sp.ringAlpha > 0) {
        fctx.beginPath();
        fctx.arc(sp.cx, sp.cy, sp.ringRadius, 0, Math.PI * 2);
        fctx.strokeStyle = `rgba(74, 144, 226, ${Math.max(sp.ringAlpha, 0)})`;
        fctx.lineWidth = 1.4;
        fctx.stroke();
      }
      for (const p of sp.particles) {
        fctx.beginPath();
        fctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        fctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${Math.max(p.alpha, 0)})`;
        fctx.fill();
      }
    }
  }

  /* Ambient glow */
  function drawAmbient() {
    const gx = cursorX, gy = cursorY;
    const grad = fctx.createRadialGradient(gx, gy, 0, gx, gy, 420);
    grad.addColorStop(0, 'rgba(74, 144, 226, 0.05)');
    grad.addColorStop(0.6, 'rgba(0, 100, 200, 0.015)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    fctx.fillStyle = grad;
    fctx.fillRect(0, 0, VW, VH);
  }

  /* ═══════════════════════════════════════
     MASTER LOOP
     ═══════════════════════════════════════ */

  function heroInView() {
    if (!heroEl) return false;
    const rect = heroEl.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < VH;
  }

  function updateRevealMask() {
    if (!revealEl) return;
    if (currentR > 0.5) {
      const rect = revealEl.getBoundingClientRect();
      const mx = cursorX - rect.left;
      const my = cursorY - rect.top;
      const mask = `radial-gradient(circle ${currentR}px at ${mx}px ${my}px, #000 0%, #000 38%, transparent 70%)`;
      revealEl.style.maskImage = mask;
      revealEl.style.webkitMaskImage = mask;
    } else {
      const zero = 'radial-gradient(circle 0px at 50% 50%, #000 0%, transparent 100%)';
      revealEl.style.maskImage = zero;
      revealEl.style.webkitMaskImage = zero;
    }
  }

  function update(dt) {
    if (reduceMotion) {
      cursorX = VW / 2;
      cursorY = VH / 2;
    } else {
      cursorX = lerp(cursorX, rawX, Math.min(0.25, dt * 16));
      cursorY = lerp(cursorY, rawY, Math.min(0.25, dt * 16));
    }
    haloX = lerp(haloX, rawX, Math.min(0.18, dt * 12));
    haloY = lerp(haloY, rawY, Math.min(0.18, dt * 12));

    cursorHalo.style.left = haloX + 'px';
    cursorHalo.style.top = haloY + 'px';

    const px = (rawX - VW / 2) * 0.01;
    const py = (rawY - VH / 2) * 0.01;
    layerMain.style.transform = `translate(${-px}px, ${-py}px)`;

    const inView = heroInView();
    if (isFine) targetR = inView ? CFG.circle : 0;
    else targetR = inView && touchActiveRecently() ? CFG.circleMobile : 0;
    currentR = lerp(currentR, targetR, Math.min(0.1, dt * 6));
    updateRevealMask();

    if (reduceMotion) return;
    updateLetters(inView);
    updateNeurons();
    updateSplashes();
  }

  function draw(now) {
    resetCtx(fctx);
    if (reduceMotion) return;
    drawAmbient();
    drawNeurons();
    drawWarp(now);
    drawSplashes();
  }

  function masterLoop(now) {
    const dt = clamp((now - lastFrame) / 1000, 0, 0.05);
    lastFrame = now;
    if (dt > 0) {
      update(dt);
      draw(now);
    }
    rafId = requestAnimationFrame(masterLoop);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
    } else if (loaded) {
      lastFrame = performance.now();
      rafId = requestAnimationFrame(masterLoop);
    }
  });

  /* ═══════════════════════════════════════
     PROJECTS — static professional cards
     ═══════════════════════════════════════ */

  const PROJECTS = [
    { title: 'Nebula Finance', tag: 'fintech · web app', desc: 'Real-time dashboard with animated charts, dark-mode trading UI and sub-100ms interactions.', image: 'images/bg.png' },
    { title: 'Aurora Studio', tag: 'creative · marketing', desc: 'Scroll-driven product story with WebGL hero, 60fps on mid-range phones.', image: 'images/main.png' },
    { title: 'Pulse Fitness', tag: 'mobile · PWA', desc: 'Installable workout tracker with offline mode, Haptics API and shareable progress.', image: 'images/bg.png' },
    { title: 'Mono Marketplace', tag: 'e-commerce · web app', desc: 'Headless storefront with instant search, cart optimistic updates and 90+ Lighthouse.', image: 'images/main.png' },
    { title: 'Synth City', tag: 'experiment · generative', desc: 'Generative audio-visual toy — mouse plays a synth, canvas paints the sound.', image: 'images/bg.png' },
    { title: 'Carbon Notes', tag: 'tool · productivity', desc: 'Privacy-first local-first notes with keyboard-first UX and instant fuzzy search.', image: 'images/main.png' }
  ];

  function buildProjectCards() {
    const grid = $('projectsGrid');
    if (!grid) return;
    const frag = document.createDocumentFragment();
    PROJECTS.forEach((p, i) => {
      const card = document.createElement('article');
      card.className = 'project-card reveal-up';
      card.style.setProperty('--d', (i * 0.08).toFixed(2) + 's');
      card.innerHTML =
        '<div class="card-media">' +
        `<img src="${p.image}" alt="${p.title}" loading="lazy" width="640" height="400">` +
        '</div>' +
        '<div class="card-body">' +
        `<span class="card-tag">${p.tag}</span>` +
        `<h3>${p.title}</h3>` +
        `<p>${p.desc}</p>` +
        '</div>';
      frag.appendChild(card);
    });
    grid.appendChild(frag);

    grid.querySelectorAll('.project-card').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        if (reduceMotion) return;
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        card.style.setProperty('--rx', ((py - 0.5) * -6).toFixed(2) + 'deg');
        card.style.setProperty('--ry', ((px - 0.5) * 6).toFixed(2) + 'deg');
        card.style.transform = `perspective(1100px) rotateX(${((py - 0.5) * -6).toFixed(2)}deg) rotateY(${((px - 0.5) * 6).toFixed(2)}deg)`;
      });
      card.addEventListener('pointerleave', () => {
        card.style.removeProperty('--rx');
        card.style.removeProperty('--ry');
        card.style.removeProperty('transform');
      });
    });
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
    toastEl.textContent = eeActive ? 'Konami Code Activated' : 'Konami Code Deactivated';
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 2500);
    if (eeActive && !reduceMotion) {
      for (let i = 0; i < 5; i++) {
        setTimeout(() => createSplash(Math.random() * VW, Math.random() * VH), i * 100);
      }
    }
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
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }
    }
  });

  /* ═══════════════════════════════════════
     INIT
     ═══════════════════════════════════════ */

  function onResize() {
    VW = window.innerWidth;
    VH = window.innerHeight;
    setupCanvas(fxCanvas);
    setupCanvas(lCanvas);
    rawX = clamp(rawX, 0, VW);
    rawY = clamp(rawY, 0, VH);
    if (!reduceMotion && neuronCount > 0) {
      neurons.length = 0;
      for (let i = 0; i < neuronCount; i++) neurons.push(makeNeuron());
    }
    onScroll();
  }

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(onResize, 150);
  });

  function initMainScene() {
    vignette.classList.add('visible');
    fxCanvas.classList.add('visible');
    if (heroEl) heroEl.classList.add('ready');
    if (siteHeader) siteHeader.classList.add('visible');
    buildOrbit();
    buildLetters();
    buildProjectCards();
    initReveal();
    initStatsSpy();

    lastFrame = performance.now();
    rafId = requestAnimationFrame(masterLoop);
    revealLetters();

    const yearEl = $('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    onScroll();
  }

  setupCanvas(fxCanvas);
  cursorDot.style.left = VW / 2 + 'px';
  cursorDot.style.top = VH / 2 + 'px';
  cursorHalo.style.left = VW / 2 + 'px';
  cursorHalo.style.top = VH / 2 + 'px';
  startLoading();
})();
