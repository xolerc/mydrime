/* ═══════════════════════════════════════════════════════════
   xoleric — creative portfolio v2
   Single effects canvas + one master requestAnimationFrame loop
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ─────────── CONFIG / TOKENS ─────────── */
  const CFG = {
    circle: 200,
    circleMobile: 140,
    sections: ['welcome-section', 'about-section', 'projects-section', 'contact-section'],
    images: ['images/bg.png', 'images/main.png'],
    neuronCount: 40,
    connectDist: 200,
    cursorRepel: 250,
    revealRepel: 220,
    letterRadius: 150,
    letterForce: 35
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
  const welcomeEl = $('welcome');
  const orbitEl = $('orbitContainer');
  const navDotsEl = $('navDots');
  const toastEl = $('eeToast');

  /* ─────────── GLOBAL STATE ─────────── */
  let VW = window.innerWidth;
  let VH = window.innerHeight;
  let dpr = 1;

  let rawX = VW / 2, rawY = VH / 2;
  let cursorX = rawX, cursorY = rawY;
  let haloX = rawX, haloY = rawY;
  let targetR = 0, currentR = 0;
  let active = false;

  let loaded = false;
  let currentSection = 0;
  let isTransitioning = false;
  let scrollCooldown = false;

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
     LOADER — real image preload + particles
     ═══════════════════════════════════════ */

  const lCanvas = $('loaderCanvas');
  const lctx = lCanvas.getContext('2d');
  setupCanvas(lCanvas);

  const loaderParticles = [];
  const LOADER_COUNT = reduceMotion ? 0 : 140;

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

  let loaderProgress = 0;   // true progress (0-100)
  let loaderShown = 0;      // displayed progress

  function updateLoaderParticles() {
    for (const p of loaderParticles) {
      if (!p.exploded) {
        p.x += (p.tx - p.x) * p.speed;
        p.y += (p.ty - p.y) * p.speed;
      } else {
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.98; p.vy *= 0.98;
        p.alpha *= 0.97;
      }
    }
  }

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
      lctx.beginPath();
      lctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      lctx.fillStyle = p.color + Math.max(p.alpha, 0) + ')';
      lctx.fill();
    }
  }

  function loaderLoop() {
    if (!loaded) requestAnimationFrame(loaderLoop);
    updateLoaderParticles();
    drawLoader();
    loaderShown = lerp(loaderShown, loaderProgress, 0.12);
    if (loaderShown < 0.5) loaderShown = 0;
    loaderFill.style.width = clamp(loaderShown, 0, 100) + '%';
    loaderPct.textContent = Math.round(clamp(loaderShown, 0, 100)) + '%';
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
    loaderLoop();

    const minTime = reduceMotion ? 150 : 1500;
    preloadAssets(() => {
      setTimeout(finishLoading, minTime);
    });
  }

  /* ═══════════════════════════════════════
     INPUT — pointer + touch (sampled, passive)
     ═══════════════════════════════════════ */

  const HOVER_SELECTOR = 'a, button, .project-card, .contact-link';

  if (isFine) {
    window.addEventListener('pointermove', (e) => {
      rawX = e.clientX;
      rawY = e.clientY;
      cursorDot.style.left = rawX + 'px';
      cursorDot.style.top = rawY + 'px';
    }, { passive: true });

    window.addEventListener('pointerdown', (e) => {
      if (!loaded) return;
      createSplash(e.clientX, e.clientY);
    });

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
      active = true;
      const t = e.touches[0];
      rawX = t.clientX;
      rawY = t.clientY;
      targetR = CFG.circleMobile;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      active = true;
      const t = e.touches[0];
      rawX = t.clientX;
      rawY = t.clientY;
    }, { passive: true });

    document.addEventListener('touchend', () => {
      setTimeout(() => {
        if (!touchActiveRecently()) {
          targetR = 0;
          active = false;
        }
      }, 600);
    });
  }

  let lastTouchTime = 0;
  document.addEventListener('touchstart', () => { lastTouchTime = Date.now(); }, { passive: true });
  function touchActiveRecently() { return Date.now() - lastTouchTime < 600; }

  /* ═══════════════════════════════════════
     SECTION NAVIGATION
     ═══════════════════════════════════════ */

  function setSectionA11y() {
    document.querySelectorAll('.section').forEach((sec, i) => {
      sec.setAttribute('aria-hidden', i === currentSection ? 'false' : 'true');
    });
  }

  function navigateTo(index) {
    if (isTransitioning || index === currentSection) return;
    if (index < 0 || index >= CFG.sections.length) return;

    isTransitioning = true;
    const oldSec = document.getElementById(CFG.sections[currentSection]);
    const newSec = document.getElementById(CFG.sections[index]);
    const dir = index > currentSection ? 'up' : 'down';

    oldSec.classList.remove('active');
    oldSec.classList.add(dir === 'up' ? 'exit-up' : 'exit-down');

    setTimeout(() => {
      oldSec.classList.remove('exit-up', 'exit-down');
      newSec.classList.add('active');
      currentSection = index;
      setSectionA11y();
      updateNavDots();
      if (index === 1) animateStats();
      setTimeout(() => { isTransitioning = false; }, 400);
    }, 300);
  }

  function updateNavDots() {
    document.querySelectorAll('.nav-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === currentSection);
    });
  }

  document.querySelectorAll('.nav-dot').forEach((dot, i) => {
    dot.addEventListener('click', () => navigateTo(i));
  });

  document.querySelectorAll('.section-nav button').forEach((btn) => {
    btn.addEventListener('click', () => navigateTo(parseInt(btn.dataset.target, 10)));
  });

  window.addEventListener('wheel', (e) => {
    if (!loaded || scrollCooldown) return;
    scrollCooldown = true;
    setTimeout(() => { scrollCooldown = false; }, 1200);
    if (e.deltaY > 30) navigateTo(currentSection + 1);
    else if (e.deltaY < -30) navigateTo(currentSection - 1);
  }, { passive: true });

  let touchStartY = 0;
  window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    const diff = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 50) {
      navigateTo(currentSection + (diff > 0 ? 1 : -1));
    }
  }, { passive: true });

  window.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
      case 'PageDown':
      case ' ':
        e.preventDefault();
        navigateTo(currentSection + 1);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
      case 'PageUp':
        e.preventDefault();
        navigateTo(currentSection - 1);
        break;
      case 'Home':
        e.preventDefault();
        navigateTo(0);
        break;
      case 'End':
        e.preventDefault();
        navigateTo(CFG.sections.length - 1);
        break;
    }
  });

  /* ═══════════════════════════════════════
     STAT COUNTERS
     ═══════════════════════════════════════ */

  let statsDone = false;
  function animateStats() {
    if (statsDone) return;
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

  /* ═══════════════════════════════════════
     WELCOME LETTERS + MAGNETIC EFFECT
     ═══════════════════════════════════════ */

  const WELCOME_TEXT = 'welcome to xoleric portfolio';
  const letterEls = [];
  const letterStates = [];

  (function buildLetters() {
    const baseDelay = reduceMotion ? 0 : 2600;
    WELCOME_TEXT.split('').forEach((char, i) => {
      const span = document.createElement('span');
      span.textContent = char;
      span.className = 'letter';
      welcomeEl.appendChild(span);
      letterEls.push(span);
      if (reduceMotion) {
        span.classList.add('visible', 'ready');
      } else {
        setTimeout(() => span.classList.add('visible'), baseDelay + i * 80);
      }
    });
    if (!reduceMotion) {
      setTimeout(() => {
        letterEls.forEach((s) => s.classList.add('ready'));
      }, baseDelay + WELCOME_TEXT.length * 80 + 1200);
    }
  })();

  function initLetterStates() {
    letterStates.length = 0;
    for (let i = 0; i < letterEls.length; i++) {
      letterStates.push({ x: 0, y: 0, vx: 0, vy: 0, glow: 0, scale: 0, rx: 0, ry: 0 });
    }
  }
  initLetterStates();

  function updateLetters() {
    if (reduceMotion || currentSection !== 0) return;
    for (let i = 0; i < letterEls.length; i++) {
      const span = letterEls[i];
      if (!span.classList.contains('ready')) continue;
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
        scale = power * 0.15;
        rx = -(dy / dist) * 20 * power;
        ry = (dx / dist) * 20 * power;
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
        : 'rgba(230, 230, 230, 0.9)';
    }
  }

  /* ── Glitch on hover over letters ── */
  document.addEventListener('mouseover', (e) => {
    if (reduceMotion) return;
    const letter = e.target.closest && e.target.closest('.letter');
    if (letter && letter.classList.contains('visible')) {
      letter.classList.add('glitch');
      const siblings = letter.parentElement.children;
      const idx = Array.prototype.indexOf.call(siblings, letter);
      for (let i = Math.max(0, idx - 2); i <= Math.min(siblings.length - 1, idx + 2); i++) {
        if (siblings[i] !== letter && Math.random() > 0.5) {
          setTimeout(() => siblings[i].classList.add('glitch'), Math.random() * 100);
        }
      }
      setTimeout(() => {
        document.querySelectorAll('.letter.glitch').forEach((l) => l.classList.remove('glitch'));
      }, 300);
    }
  });

  /* ═══════════════════════════════════════
     EFFECTS ENGINE — one canvas, one loop
     ═══════════════════════════════════════ */

  /* Splash */
  let splashes = [];
  function createSplash(x, y) {
    if (reduceMotion) return;
    const count = 20 + Math.floor(Math.random() * 15);
    const particles = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + rand(-0.25, 0.25);
      const speed = rand(2, 8);
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: rand(1, 3.5),
        alpha: rand(0.8, 1),
        decay: rand(0.015, 0.03),
        hue: 190 + Math.random() * 40
      });
    }
    splashes.push({ particles, ringRadius: 0, ringAlpha: 0.8, cx: x, cy: y });
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
        fctx.lineWidth = 1.5;
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

  /* Trail */
  let trail = [];
  function updateTrail() {
    if (isFine && active) {
      trail.push({ x: rawX, y: rawY, alpha: 0.6, size: 3 });
    }
    for (let i = trail.length - 1; i >= 0; i--) {
      const p = trail[i];
      p.alpha -= 0.025;
      p.size *= 0.97;
      if (p.alpha <= 0) trail.splice(i, 1);
    }
    if (trail.length > 50) trail.splice(0, trail.length - 50);
  }

  function drawTrail() {
    for (const p of trail) {
      fctx.beginPath();
      fctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      fctx.fillStyle = `rgba(74, 144, 226, ${p.alpha * 0.4})`;
      fctx.fill();
    }
  }

  /* Ambient glow */
  function drawAmbient() {
    const gx = cursorX, gy = cursorY;
    const grad = fctx.createRadialGradient(gx, gy, 0, gx, gy, 420);
    grad.addColorStop(0, 'rgba(74, 144, 226, 0.06)');
    grad.addColorStop(0.5, 'rgba(0, 100, 200, 0.02)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    fctx.fillStyle = grad;
    fctx.fillRect(0, 0, VW, VH);
  }

  /* Neural particles */
  const neurons = [];
  const neuronCount = reduceMotion ? 0 : (isMobile ? 24 : CFG.neuronCount);

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
      size: rand(3, 7),
      opacity: rand(0.3, 0.9),
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: rand(0.001, 0.004),
      drift: Math.random() * Math.PI * 2,
      driftSpeed: rand(0.0001, 0.0005),
      driftRadius: rand(0.004, 0.016)
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

      const dxr = cursorX - n.x, dyr = cursorY - n.y;
      const dReveal = Math.sqrt(dxr * dxr + dyr * dyr);
      if (dReveal < CFG.revealRepel && dReveal > 0) {
        const f = (1 - dReveal / CFG.revealRepel) * 0.25;
        n.vx -= (dxr / dReveal) * f;
        n.vy -= (dyr / dReveal) * f;
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

  /* Warp speed inside reveal */
  function drawWarp(now) {
    if (currentR < 0.5) return;
    fctx.save();
    fctx.beginPath();
    fctx.arc(cursorX, cursorY, currentR, 0, Math.PI * 2);
    fctx.clip();

    const starCount = 35;
    for (let i = 0; i < starCount; i++) {
      const a = (i / starCount) * Math.PI * 2 + now * 0.001;
      const speed = (now * 0.5 + i * 17) % currentR;
      const sx = cursorX + Math.cos(a) * speed;
      const sy = cursorY + Math.sin(a) * speed;
      const len = speed * 0.18;
      const alpha = (1 - speed / currentR) * 0.5;
      fctx.beginPath();
      fctx.moveTo(sx, sy);
      fctx.lineTo(sx - Math.cos(a) * len, sy - Math.sin(a) * len);
      fctx.strokeStyle = `rgba(200, 220, 255, ${alpha})`;
      fctx.lineWidth = 1.5;
      fctx.stroke();
    }
    fctx.restore();
  }

  /* Lightning sparks */
  let sparks = [];
  function updateSparks() {
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.alpha -= s.decay;
      if (s.alpha <= 0) sparks.splice(i, 1);
    }
  }

  function drawSparks() {
    for (const s of sparks) {
      const ex = s.x + Math.cos(s.angle) * s.len;
      const ey = s.y + Math.sin(s.angle) * s.len;
      fctx.beginPath();
      fctx.moveTo(s.x, s.y);
      fctx.lineTo(ex, ey);
      fctx.strokeStyle = `rgba(180, 200, 255, ${s.alpha * 0.3})`;
      fctx.lineWidth = 4;
      fctx.shadowColor = 'rgba(100, 150, 255, 0.5)';
      fctx.shadowBlur = 10;
      fctx.stroke();
      fctx.shadowBlur = 0;
      fctx.beginPath();
      fctx.moveTo(s.x, s.y);
      fctx.lineTo(ex, ey);
      fctx.strokeStyle = `rgba(255, 255, 255, ${s.alpha * 0.7})`;
      fctx.lineWidth = 1;
      fctx.stroke();
    }
  }

  setInterval(() => {
    if (!reduceMotion && isFine && active && Math.random() < 0.4) {
      const angle = Math.random() * Math.PI * 2;
      const dist = rand(15, 45);
      sparks.push({
        x: rawX + Math.cos(angle) * dist,
        y: rawY + Math.sin(angle) * dist,
        len: rand(8, 23),
        angle: angle + rand(-0.6, 0.6),
        alpha: rand(0.6, 1),
        decay: rand(0.04, 0.08)
      });
    }
  }, 100);

  /* ═══════════════════════════════════════
     MASTER LOOP — update + draw per frame
     ═══════════════════════════════════════ */

  function update(dt, now) {
    if (reduceMotion) {
      cursorX = VW / 2;
      cursorY = VH / 2;
    } else {
      cursorX = lerp(cursorX, rawX, Math.min(0.25, dt * 16));
      cursorY = lerp(cursorY, rawY, Math.min(0.25, dt * 16));
    }
    currentR = lerp(currentR, targetR, Math.min(0.1, dt * 6));
    haloX = lerp(haloX, rawX, Math.min(0.18, dt * 12));
    haloY = lerp(haloY, rawY, Math.min(0.18, dt * 12));

    if (currentR > 0.5) {
      const mask = `radial-gradient(circle ${currentR}px at ${cursorX}px ${cursorY}px, black 0%, black 40%, transparent 100%)`;
      revealEl.style.maskImage = mask;
      revealEl.style.webkitMaskImage = mask;
    } else {
      const zero = `radial-gradient(circle 0px at 50% 50%, black 0%, transparent 100%)`;
      revealEl.style.maskImage = zero;
      revealEl.style.webkitMaskImage = zero;
    }

    const px = (rawX - VW / 2) * 0.01;
    const py = (rawY - VH / 2) * 0.01;
    layerMain.style.transform = `translate(${-px}px, ${-py}px)`;

    cursorHalo.style.left = haloX + 'px';
    cursorHalo.style.top = haloY + 'px';

    if (reduceMotion) return;
    updateLetters();
    updateNeurons();
    updateSplashes();
    updateTrail();
    updateSparks();
  }

  function draw(now) {
    resetCtx(fctx);
    if (reduceMotion) return;
    drawAmbient();
    drawTrail();
    drawNeurons();
    drawWarp(now);
    drawSparks();
    drawSplashes();
  }

  function masterLoop(now) {
    const dt = clamp((now - lastFrame) / 1000, 0, 0.05);
    lastFrame = now;
    if (dt > 0) {
      update(dt, now);
      draw(now);
    }
    rafId = requestAnimationFrame(masterLoop);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
    } else {
      lastFrame = performance.now();
      rafId = requestAnimationFrame(masterLoop);
    }
  });

  /* ═══════════════════════════════════════
     PROJECT CARD GLOW TRACKING
     ═══════════════════════════════════════ */

  document.querySelectorAll('.project-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', ((e.clientX - rect.left) / rect.width) * 100 + '%');
      card.style.setProperty('--my', ((e.clientY - rect.top) / rect.height) * 100 + '%');
    });
  });

  /* ═══════════════════════════════════════
     EASTER EGGS — Konami code + fullscreen
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
  }

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(onResize, 150);
  });

  function initMainScene() {
    vignette.classList.add('visible');
    fxCanvas.classList.add('visible');
    navDotsEl.classList.add('visible');
    orbitEl.classList.add('visible');
    setSectionA11y();

    if (!isMobile) {
      targetR = CFG.circle;
      active = true;
    }

    if (currentSection === 1) animateStats();
  }

  setupCanvas(fxCanvas);
  cursorDot.style.left = VW / 2 + 'px';
  cursorDot.style.top = VH / 2 + 'px';
  cursorHalo.style.left = VW / 2 + 'px';
  cursorHalo.style.top = VH / 2 + 'px';
  setSectionA11y();
  startLoading();
  lastFrame = performance.now();
  rafId = requestAnimationFrame(masterLoop);
})();
