/* ═══════════════════════════════════════════════════════════
   xoleric — creative portfolio v3
   Aurora cursor · scroll-snap storytelling · case studies ·
   typed hero · ticker · theme toggle · matrix demo · contact
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ─────────── CONFIG / TOKENS ─────────── */
  const CFG = {
    images: ['images/bg.png', 'images/main.png'],
    neuronCount: 20,
    connectDist: 170,
    cursorRepel: 200,
    auroraColors: [
      [74, 144, 226],   // blue
      [168, 85, 247]    // violet
    ],
    typedWords: [
      'creative web experiences',
      'performance-first interfaces',
      'interactive brands',
      'digital art'
    ],
    typedSpeed: 46,
    typedPause: 1900,
    caseCooldown: 30 * 1000,
    matrixFont: 14,
    tickerDuration: 28
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
  const toastEl = $('eeToast');

  /* ─────────── GLOBAL STATE ─────────── */
  let VW = window.innerWidth;
  let VH = window.innerHeight;
  let dpr = 1;

  let rawX = VW / 2, rawY = VH / 2;
  let cursorX = rawX, cursorY = rawY;
  let haloX = rawX, haloY = rawY;
  let active = false;

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

  const HOVER_SELECTOR = 'a, button, .project-card, .play-card.clickable, input, textarea, .modal-close';

  if (isFine) {
    window.addEventListener('pointermove', (e) => {
      rawX = e.clientX;
      rawY = e.clientY;
      cursorDot.style.left = rawX + 'px';
      cursorDot.style.top = rawY + 'px';
      if (!active) { active = true; }
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
      active = true;
      const t = e.touches[0];
      rawX = t.clientX;
      rawY = t.clientY;
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
      active = true;
      const t = e.touches[0];
      rawX = t.clientX;
      rawY = t.clientY;
    }, { passive: true });
  }

  /* ═══════════════════════════════════════
     TYPED HERO
     ═══════════════════════════════════════ */

  const typedEl = $('typed');
  let typedState = { word: 0, char: 0, deleting: false, delay: 0, run: false };

  function typedStep(now) {
    if (!typedEl || reduceMotion) return;
    if (!typedState.run) {
      typedEl.textContent = CFG.typedWords[0];
      typedState.run = true;
      typedState.char = CFG.typedWords[0].length;
    }
    if (now < typedState.delay) {
      requestAnimationFrame(typedStep);
      return;
    }
    const word = CFG.typedWords[typedState.word];
    if (!typedState.deleting) {
      typedState.char++;
      if (typedState.char > word.length) {
        typedState.char = word.length;
        typedState.deleting = true;
        typedState.delay = now + CFG.typedPause;
        requestAnimationFrame(typedStep);
        return;
      }
      typedEl.textContent = word.slice(0, typedState.char);
      typedState.delay = now + CFG.typedSpeed;
    } else {
      typedState.char--;
      if (typedState.char < 0) {
        typedState.char = 0;
        typedState.deleting = false;
        typedState.word = (typedState.word + 1) % CFG.typedWords.length;
        typedState.delay = now + 300;
        requestAnimationFrame(typedStep);
        return;
      }
      typedEl.textContent = word.slice(0, typedState.char);
      typedState.delay = now + Math.round(CFG.typedSpeed * 0.6);
    }
    requestAnimationFrame(typedStep);
  }

  /* ═══════════════════════════════════════
     TECH TICKER — seamless duplicate
     ═══════════════════════════════════════ */

  function buildTicker() {
    const track = $('tickerTrack');
    if (!track) return;
    const clone = track.cloneNode(true);
    clone.removeAttribute('id');
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
  }

  /* ═══════════════════════════════════════
     SCROLL — progress, header, scroll spy
     ═══════════════════════════════════════ */

  const scrollProgress = $('scrollProgress');
  const siteHeader = $('siteHeader');

  function onScroll() {
    const doc = document.documentElement;
    const max = doc.scrollHeight - VH;
    const p = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
    if (scrollProgress) scrollProgress.style.width = p * 100 + '%';
    if (siteHeader) siteHeader.classList.toggle('scrolled', window.scrollY > 10);

    const spy = document.querySelector('.site-nav a.active');
    let current = spy ? spy.getAttribute('href') : '#hero';
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

  /* ── Reveal on scroll ── */
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

  /* ── Stats counters ── */
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
     EFFECTS ENGINE — aurora + ambient + neurons
     ═══════════════════════════════════════ */

  const neurons = [];
  const neuronCount = reduceMotion ? 0 : (isMobile ? 10 : CFG.neuronCount);

  function makeNeuron() {
    return {
      x: Math.random() * VW,
      y: Math.random() * VH,
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
          fctx.strokeStyle = `rgba(168, 85, 247, ${t * 0.28})`;
          fctx.lineWidth = t;
          fctx.stroke();
        }
      }
    }
    for (const n of neurons) {
      const alpha = n.opacity * (0.6 + Math.sin(n.pulse) * 0.4);
      fctx.beginPath();
      fctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
      fctx.fillStyle = `rgba(190, 160, 255, ${alpha * 0.8})`;
      fctx.fill();
    }
  }

  /* Aurora soft-light cursor — blurred radial gradients, 'lighter' */
  const aurora = [
    { cx: 0, cy: 0, r: 0, hue: 0 },
    { cx: 0, cy: 0, r: 0, hue: 1 }
  ];

  function updateAurora(dt) {
    const c = Math.min(0.12, dt * 8);
    aurora[0].cx = lerp(aurora[0].cx, cursorX, c);
    aurora[0].cy = lerp(aurora[0].cy, cursorY - 40, c);
    aurora[1].cx = lerp(aurora[1].cx, cursorX - 70, c);
    aurora[1].cy = lerp(aurora[1].cy, cursorY + 60, c);
    const R = clamp(VW * 0.14, 120, 280);
    aurora[0].r = lerp(aurora[0].r, R, c);
    aurora[1].r = lerp(aurora[1].r, R * 0.8, c);
  }

  function drawAurora() {
    if (!active && !reduceMotion) return;
    const [A, B] = CFG.auroraColors;
    fctx.save();
    fctx.globalCompositeOperation = 'lighter';

    const g1 = fctx.createRadialGradient(aurora[0].cx, aurora[0].cy, 0, aurora[0].cx, aurora[0].cy, aurora[0].r);
    g1.addColorStop(0, `rgba(${A[0]}, ${A[1]}, ${A[2]}, 0.16)`);
    g1.addColorStop(0.55, `rgba(${A[0]}, ${A[1]}, ${A[2]}, 0.05)`);
    g1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    fctx.fillStyle = g1;
    fctx.fillRect(0, 0, VW, VH);

    const g2 = fctx.createRadialGradient(aurora[1].cx, aurora[1].cy, 0, aurora[1].cx, aurora[1].cy, aurora[1].r);
    g2.addColorStop(0, `rgba(${B[0]}, ${B[1]}, ${B[2]}, 0.12)`);
    g2.addColorStop(0.55, `rgba(${B[0]}, ${B[1]}, ${B[2]}, 0.04)`);
    g2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    fctx.fillStyle = g2;
    fctx.fillRect(0, 0, VW, VH);

    fctx.restore();
  }

  /* Tuned-down ambient glow that follows the aurora */
  function drawAmbient() {
    const gx = cursorX, gy = cursorY;
    const grad = fctx.createRadialGradient(gx, gy, 0, gx, gy, 460);
    grad.addColorStop(0, 'rgba(74, 144, 226, 0.05)');
    grad.addColorStop(0.6, 'rgba(0, 100, 200, 0.015)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    fctx.fillStyle = grad;
    fctx.fillRect(0, 0, VW, VH);
  }

  /* ═══════════════════════════════════════
     MASTER LOOP
     ═══════════════════════════════════════ */

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

    if (reduceMotion) return;
    updateAurora(dt);
    updateNeurons();
  }

  function draw() {
    resetCtx(fctx);
    if (reduceMotion) return;
    drawAmbient();
    drawNeurons();
    drawAurora();
  }

  function masterLoop(now) {
    const dt = clamp((now - lastFrame) / 1000, 0, 0.05);
    lastFrame = now;
    if (dt > 0) {
      update(dt);
      draw();
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
     PROJECTS — render, tilt, case studies
     ═══════════════════════════════════════ */

  const PROJECTS = [
    {
      title: 'Nebula Finance',
      tag: 'fintech · web app',
      desc: 'Real-time dashboard with animated charts, dark-mode trading UI and sub-100ms interactions.',
      image: 'images/bg.png',
      outcome: '+38% conversion',
      outcomeLabel: 'faster checkout flow',
      stack: ['React', 'TypeScript', 'GSAP', 'Tailwind'],
      role: 'Lead Frontend Engineer',
      overview: 'A trading platform needed a dashboard that felt alive under live market data without jank. I owned the interface from design tokens to shipped micro-interactions.',
      approach: 'Design tokens → component library → canvas sparklines → reduced-motion fallbacks. Every animation is GPU-friendly and driven by a single rAF loop.',
      links: [
        { label: 'Live demo', href: '#' },
        { label: 'Source', href: 'https://github.com/xolerc' }
      ]
    },
    {
      title: 'Aurora Studio',
      tag: 'creative · marketing',
      desc: 'Scroll-driven product story with WebGL hero, 60fps on mid-range phones.',
      image: 'images/main.png',
      outcome: '+52% time on page',
      outcomeLabel: 'longer storytelling sessions',
      stack: ['JavaScript', 'Canvas', 'GSAP ScrollTrigger'],
      role: 'Creative Developer',
      overview: 'A studio needed an immersive launch page that told a brand story without a single heavy asset. I built a scroll-driven narrative with a custom canvas engine.',
      approach: 'Choreographed scroll segments, preloaded hero art, and a single fixed canvas for all effects to keep the main thread quiet.',
      links: [
        { label: 'Case study', href: '#' }
      ]
    },
    {
      title: 'Pulse Fitness',
      tag: 'mobile · PWA',
      desc: 'Installable workout tracker with offline mode, Haptics API and shareable progress.',
      image: 'images/bg.png',
      outcome: '4.8★ rating',
      outcomeLabel: 'after app-store relaunch',
      stack: ['React', 'Service Worker', 'IndexedDB'],
      role: 'Frontend + PWA',
      overview: 'A fitness brand wanted a lightweight trainer that worked on a subway connection. I shipped an installable PWA with full offline workouts.',
      approach: 'App-shell first, optimistic UI, IndexedDB sync, and a checklist-driven Lighthouse budget under 200KB of JS.',
      links: [
        { label: 'Open app', href: '#' }
      ]
    },
    {
      title: 'Mono Marketplace',
      tag: 'e-commerce · web app',
      desc: 'Headless storefront with instant search, cart optimistic updates and 90+ Lighthouse.',
      image: 'images/main.png',
      outcome: '-41% checkout time',
      outcomeLabel: 'fewer steps to purchase',
      stack: ['React', 'Node.js', 'Stripe', 'Tailwind'],
      role: 'Full-Stack Frontend',
      overview: 'Rebuilt a legacy storefront into a headless commerce experience with instant search and seamless cart updates.',
      approach: 'Edge-side rendering, optimistic mutations, and a component system that cut page weight by half.',
      links: [
        { label: 'Storefront', href: '#' }
      ]
    },
    {
      title: 'Synth City',
      tag: 'experiment · generative',
      desc: 'Generative audio-visual toy — mouse plays a synth, canvas paints the sound.',
      image: 'images/bg.png',
      outcome: '3.2k plays',
      outcomeLabel: 'first week on launch',
      stack: ['Web Audio', 'Canvas', 'Vanilla JS'],
      role: 'Solo Creative Coder',
      overview: 'A self-initiated toy that maps cursor motion to Web Audio oscillators while a canvas interprets the waveform as light.',
      approach: 'One analyser node, one canvas loop, zero libraries. Pure joy engineering.',
      links: [
        { label: 'Play it', href: '#' }
      ]
    },
    {
      title: 'Carbon Notes',
      tag: 'tool · productivity',
      desc: 'Privacy-first local-first notes with keyboard-first UX and instant fuzzy search.',
      image: 'images/main.png',
      outcome: '0 servers',
      outcomeLabel: 'everything stays on-device',
      stack: ['TypeScript', 'IndexedDB', 'Web Crypto'],
      role: 'Product Engineer',
      overview: 'Notes that never touch a server. I built a fast local database layer with encryption and a keyboard-first editor.',
      approach: 'Schema versioning, debounced persistence, and command-palette navigation for power users.',
      links: [
        { label: 'Docs', href: '#' }
      ]
    }
  ];

  const projectsGrid = $('projectsGrid');

  function buildProjectCards() {
    if (!projectsGrid) return;
    const frag = document.createDocumentFragment();
    PROJECTS.forEach((p, i) => {
      const card = document.createElement('article');
      card.className = 'project-card reveal-up';
      card.style.setProperty('--d', (i * 0.08).toFixed(2) + 's');
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `Open case study: ${p.title}`);
      card.innerHTML =
        '<div class="card-media">' +
        `<img src="${p.image}" alt="${p.title}" loading="lazy" width="640" height="400">` +
        '</div>' +
        '<div class="card-body">' +
        `<span class="card-tag">${p.tag}</span>` +
        `<h3>${p.title}</h3>` +
        `<p>${p.desc}</p>` +
        '<span class="card-link">Read case study →</span>' +
        '</div>';
      frag.appendChild(card);
    });
    projectsGrid.appendChild(frag);

    projectsGrid.querySelectorAll('.project-card').forEach((card, i) => {
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
      const openCase = () => openCaseStudy(i);
      card.addEventListener('click', openCase);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openCase();
        }
      });
    });
  }

  /* ── Case study modal ── */
  const caseModal = $('caseModal');
  const caseBody = $('caseBody');
  const demoModal = $('demoModal');
  let lastCaseOpen = 0;

  function caseStudyHTML(p) {
    return (
      `<img class="modal-media" src="${p.image}" alt="${p.title}">` +
      '<div class="modal-content">' +
      `<span class="card-tag case-tag">${p.tag}</span>` +
      `<h2 id="caseTitle">${p.title}</h2>` +
      `<div class="case-outcome">${p.outcome}<span style="font-size:14px;color:var(--muted);font-weight:500">· ${p.outcomeLabel}</span></div>` +
      '<div class="case-section"><h3>Overview</h3>' + `<p>${p.overview}</p>` + '</div>' +
      '<div class="case-section"><h3>Approach</h3>' + `<p>${p.approach}</p>` + '</div>' +
      '<div class="case-section"><h3>Role</h3>' + `<p>${p.role}</p>` + '</div>' +
      '<div class="case-section"><h3>Stack</h3>' +
      '<div class="case-stack">' + p.stack.map((s) => `<span>${s}</span>`).join('') + '</div>' +
      '</div>' +
      '<div class="case-links">' +
      p.links.map((l) => `<a class="btn btn-primary btn-sm" href="${l.href}" target="_blank" rel="noopener noreferrer">${l.label} →</a>`).join('') +
      '</div>' +
      '</div>'
    );
  }

  function openCaseStudy(i) {
    if (!caseModal || !caseBody) return;
    const p = PROJECTS[i];
    if (!p) return;
    if (Date.now() - lastCaseOpen < CFG.caseCooldown) return;
    lastCaseOpen = Date.now();
    caseBody.innerHTML = caseStudyHTML(p);
    caseModal.classList.add('open');
    caseModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    caseBody.scrollTop = 0;
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    if (modal === demoModal) stopMatrix();
  }

  function initModals() {
    document.querySelectorAll('.modal').forEach((modal) => {
      modal.querySelectorAll('[data-close]').forEach((el) => {
        el.addEventListener('click', () => closeModal(modal));
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal(caseModal);
        closeModal(demoModal);
      }
    });
    caseModal.addEventListener('click', (e) => {
      if (e.target === caseModal) closeModal(caseModal);
    });
    demoModal.addEventListener('click', (e) => {
      if (e.target === demoModal) closeModal(demoModal);
    });
  }

  /* ═══════════════════════════════════════
     DEMO — Matrix rain in modal
     ═══════════════════════════════════════ */

  const matrixCanvas = $('matrixCanvas');
  let matrixCtx = null;
  let matrixRaf = 0;
  let matrixDrops = [];
  let matrixOn = false;

  function startMatrix() {
    if (!matrixCanvas || reduceMotion) return;
    matrixCtx = matrixCanvas.getContext('2d');
    const cols = Math.floor(matrixCanvas.clientWidth / CFG.matrixFont);
    matrixDrops = new Array(cols).fill(0).map(() => Math.floor(Math.random() * -40));
    matrixOn = true;
    matrixLoop();
  }

  function matrixLoop() {
    if (!matrixOn) return;
    if (matrixCanvas.width !== matrixCanvas.clientWidth * dpr ||
        matrixCanvas.height !== matrixCanvas.clientHeight * dpr) {
      matrixCanvas.width = matrixCanvas.clientWidth * dpr;
      matrixCanvas.height = matrixCanvas.clientHeight * dpr;
      matrixCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const chars = 'アカサタナハマヤラワ0123456789$#@%&*!?アイウエオ';
    matrixCtx.fillStyle = 'rgba(2, 6, 4, 0.08)';
    matrixCtx.fillRect(0, 0, matrixCanvas.clientWidth, matrixCanvas.clientHeight);
    matrixCtx.fillStyle = '#00ff9c';
    matrixCtx.font = CFG.matrixFont + 'px monospace';
    for (let i = 0; i < matrixDrops.length; i++) {
      const text = chars.charAt(Math.floor(Math.random() * chars.length));
      matrixCtx.fillText(text, i * CFG.matrixFont, matrixDrops[i] * CFG.matrixFont);
      if (matrixDrops[i] * CFG.matrixFont > matrixCanvas.clientHeight && Math.random() > 0.975) {
        matrixDrops[i] = 0;
      }
      matrixDrops[i]++;
    }
    matrixRaf = requestAnimationFrame(matrixLoop);
  }

  function stopMatrix() {
    matrixOn = false;
    cancelAnimationFrame(matrixRaf);
    if (matrixCtx) {
      matrixCtx.setTransform(1, 0, 0, 1, 0, 0);
      matrixCtx.clearRect(0, 0, matrixCanvas.clientWidth, matrixCanvas.clientHeight);
    }
  }

  function initPlayground() {
    const gravity = $('playGravity');
    const gCanvas = $('gravityCanvas');
    if (gravity && gCanvas) initGravity(gCanvas, gravity);

    const matrixTrigger = document.querySelector('[data-open-demo="matrix"]');
    if (matrixTrigger) {
      matrixTrigger.addEventListener('click', () => {
        if (!demoModal) return;
        demoModal.classList.add('open');
        demoModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        requestAnimationFrame(() => {
          setTimeout(startMatrix, 40);
        });
      });
      matrixTrigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          matrixTrigger.click();
        }
      });
    }
  }

  function initGravity(canvas, wrap) {
    const ctx = canvas.getContext('2d');
    let gW = 0, gH = 0;
    let gMouse = { x: 0, y: 0 };
    const parts = [];
    const COUNT = isMobile ? 34 : 60;

    function size() {
      const rect = canvas.getBoundingClientRect();
      gW = rect.width || canvas.clientWidth;
      gH = rect.height || canvas.clientHeight || 220;
      canvas.width = Math.round(gW * dpr);
      canvas.height = Math.round(gH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      while (parts.length < COUNT) {
        parts.push({
          x: Math.random() * gW,
          y: Math.random() * gH,
          vx: 0, vy: 0,
          size: rand(1.5, 3.5),
          hue: rand(190, 270)
        });
      }
    }
    size();

    canvas.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      gMouse.x = e.clientX - rect.left;
      gMouse.y = e.clientY - rect.top;
    }, { passive: true });
    canvas.addEventListener('pointerleave', () => {
      gMouse.x = -9999;
      gMouse.y = -9999;
    });

    function gStep() {
      for (const p of parts) {
        const dx = gMouse.x - p.x, dy = gMouse.y - p.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 0.1 && d < 260) {
          const f = (1 - d / 260) * 0.06;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) { p.x = 0; p.vx *= -0.5; }
        if (p.x > gW) { p.x = gW; p.vx *= -0.5; }
        if (p.y < 0) { p.y = 0; p.vy *= -0.5; }
        if (p.y > gH) { p.y = gH; p.vy *= -0.5; }
      }
      ctx.clearRect(0, 0, gW, gH);
      for (const p of parts) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 90%, 70%, 0.85)`;
        ctx.fill();
      }
      requestAnimationFrame(gStep);
    }
    requestAnimationFrame(gStep);

    window.addEventListener('resize', () => { size(); });
  }

  /* ═══════════════════════════════════════
     CONTACT FORM
     ═══════════════════════════════════════ */

  const contactForm = $('contactForm');
  const formStatus = $('formStatus');
  const submitBtn = $('submitBtn');
  const FORMSPREE = 'https://formspree.io/f/mzzbkwdg';

  function setFormStatus(msg, kind) {
    if (!formStatus) return;
    formStatus.textContent = msg;
    formStatus.classList.remove('ok', 'error');
    if (kind) formStatus.classList.add(kind);
  }

  function initContact() {
    if (!contactForm) return;
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('cf-name');
      const email = $('cf-email');
      const msg = $('cf-msg');
      const data = {
        name: name.value.trim(),
        email: email.value.trim(),
        message: msg.value.trim()
      };
      if (!data.name || !data.message) {
        setFormStatus('Please fill in your name and message.', 'error');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        setFormStatus('Please enter a valid email address.', 'error');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
      }
      setFormStatus('Sending…', null);

      const fallback = () => {
        const subject = encodeURIComponent('Project inquiry from ' + data.name);
        const body = encodeURIComponent(data.message + '\n\n— ' + data.name + ' (' + data.email + ')');
        window.location.href = 'mailto:hello@xoleric.dev?subject=' + subject + '&body=' + body;
        setFormStatus('Opening your email app — thanks for reaching out!', 'ok');
        contactForm.reset();
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Message';
        }
      };

      fetch(FORMSPREE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data)
      }).then((res) => {
        if (res.ok) {
          setFormStatus('Message sent — I\'ll get back to you soon!', 'ok');
          contactForm.reset();
        } else {
          throw new Error('formspree error');
        }
      }).catch(fallback).finally(() => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Message';
        }
      });
    });
  }

  /* ═══════════════════════════════════════
     THEME TOGGLE
     ═══════════════════════════════════════ */

  const themeToggle = $('themeToggle');

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    try { localStorage.setItem('xoleric-theme', theme); } catch (e) {}
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#f4f6fb' : '#05060a');
  }

  function initTheme() {
    let saved = 'dark';
    try { saved = localStorage.getItem('xoleric-theme') || 'dark'; } catch (e) {}
    if (window.matchMedia('(prefers-color-scheme: light)').matches) saved = saved === 'dark' && !localStorage.getItem('xoleric-theme') ? 'light' : saved;
    applyTheme(saved);
    if (!themeToggle) return;
    themeToggle.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      applyTheme(next);
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
    const heroEl = document.querySelector('.hero');
    if (heroEl) heroEl.classList.add('ready');
    if (siteHeader) siteHeader.classList.add('visible');
    buildTicker();
    buildProjectCards();
    initReveal();
    initStatsSpy();
    initModals();
    initPlayground();
    initContact();

    lastFrame = performance.now();
    rafId = requestAnimationFrame(masterLoop);
    requestAnimationFrame(typedStep);

    const yearEl = $('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    onScroll();
  }

  setupCanvas(fxCanvas);
  cursorDot.style.left = VW / 2 + 'px';
  cursorDot.style.top = VH / 2 + 'px';
  cursorHalo.style.left = VW / 2 + 'px';
  cursorHalo.style.top = VH / 2 + 'px';
  initTheme();
  startLoading();
})();
