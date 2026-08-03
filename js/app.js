/* ═══════════════════════════════════════════════════════════
   xoleric — creative portfolio v3.2
   Corner art (blur reveal) · neon welcome · orbit · live GitHub
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ─────────── CONFIG / TOKENS ─────────── */
  const CFG = {
    images: ['images/bg.png', 'images/main.png'],
    circle: 200,
    circleMobile: 140,
    githubUser: 'xolerc'
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
  const revealEl = $('reveal');
  const heroEl = document.querySelector('.hero');
  const toastEl = $('eeToast');

  /* ─────────── GLOBAL STATE ─────────── */
  let VW = window.innerWidth;
  let VH = window.innerHeight;
  let dpr = 1;

  let rawX = VW / 2, rawY = VH / 2;
  let cursorX = rawX, cursorY = rawY;
  let currentR = 0;
  let hasPointer = false;
  let lastTouchTime = 0;

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
     CONTENT PROTECTION — no select, no copy,
     no screenshots (best effort)
     ═══════════════════════════════════════ */

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

  function touchActiveRecently() { return Date.now() - lastTouchTime < 700; }

  if (isFine) {
    window.addEventListener('pointermove', (e) => {
      rawX = e.clientX;
      rawY = e.clientY;
      hasPointer = true;
    }, { passive: true });
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

  /* ═══════════════════════════════════════
     NEON WELCOME LETTERS
     ═══════════════════════════════════════ */

  const WELCOME_TEXT = 'welcome to xoleric portfolio';
  const welcomeEl = $('welcomeText');
  const letterEls = [];

  function buildLetters() {
    if (!welcomeEl) return;
    welcomeEl.textContent = '';
    WELCOME_TEXT.split('').forEach((char) => {
      const span = document.createElement('span');
      span.textContent = char === ' ' ? '\u00A0' : char;
      span.className = char === ' ' ? 'letter space' : 'letter';
      welcomeEl.appendChild(span);
      letterEls.push(span);
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
     FLASHLIGHT REVEAL — V1 style, art box only
     ═══════════════════════════════════════ */

  function heroInView() {
    if (!heroEl) return false;
    const rect = heroEl.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < VH;
  }

  function updateReveal() {
    if (!revealEl || reduceMotion) return;
    cursorX = lerp(cursorX, rawX, 0.12);
    cursorY = lerp(cursorY, rawY, 0.12);

    const rect = revealEl.getBoundingClientRect();
    const mx = cursorX - rect.left;
    const my = cursorY - rect.top;
    const inside = mx >= -24 && my >= -24 && mx <= rect.width + 24 && my <= rect.height + 24;

    let targetR = 0;
    if (heroInView() && hasPointer && inside) {
      targetR = isFine ? CFG.circle : CFG.circleMobile;
      if (!isFine && !touchActiveRecently()) targetR = 0;
    }

    currentR = lerp(currentR, targetR, 0.1);
    if (Math.abs(currentR - targetR) < 0.5) currentR = targetR;

    if (currentR > 0.5) {
      const cx = clamp(mx, 0, rect.width);
      const cy = clamp(my, 0, rect.height);
      const mask =
        `radial-gradient(circle ${currentR.toFixed(1)}px at ${cx.toFixed(1)}px ${cy.toFixed(1)}px, #000 0%, #000 38%, transparent 70%)`;
      revealEl.style.maskImage = mask;
      revealEl.style.webkitMaskImage = mask;
    } else {
      const zero = 'radial-gradient(circle 0px at 50% 50%, #000 0%, transparent 100%)';
      revealEl.style.maskImage = zero;
      revealEl.style.webkitMaskImage = zero;
    }
  }

  function masterLoop() {
    updateReveal();
    rafId = requestAnimationFrame(masterLoop);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
    } else if (loaded) {
      rafId = requestAnimationFrame(masterLoop);
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
    { name: 'Mydrime', language: 'HTML', description: 'This very portfolio — creative coding, WebGL background and a neon welcome.', html_url: 'https://github.com/xolerc/mydrime', stargazers_count: 0, forks_count: 0, updated_at: new Date().toISOString() },
    { name: 'Music', language: 'Dart', description: 'Music application experiment.', html_url: 'https://github.com/xolerc/music', stargazers_count: 0, forks_count: 0, updated_at: new Date().toISOString() },
    { name: 'xolericc', language: 'TypeScript', description: 'Experiments and snippets.', html_url: 'https://github.com/xolerc/xolericc', stargazers_count: 0, forks_count: 0, updated_at: new Date().toISOString() },
    { name: 'Savodhon', language: 'Python', description: 'Utility project.', html_url: 'https://github.com/xolerc/Savodhon', stargazers_count: 0, forks_count: 0, updated_at: new Date().toISOString() },
    { name: 'Abdullo-usta', language: 'JavaScript', description: 'Craft project.', html_url: 'https://github.com/xolerc/Abdullo-usta', stargazers_count: 0, forks_count: 0, updated_at: new Date().toISOString() },
    { name: 'xoleric-globe', language: 'CSS', description: 'Globe experiment.', html_url: 'https://github.com/xolerc/xoleric-globe', stargazers_count: 0, forks_count: 0, updated_at: new Date().toISOString() }
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
      const lang = r.language || 'Code';
      const langColor = LANG_COLORS[r.language] || '#8b949e';
      const desc = esc((r.description || 'No description provided.').slice(0, 130));
      const stars = r.stargazers_count || 0;
      const forks = r.forks_count || 0;
      const date = new Date(r.updated_at || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

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
        '<div class="card-meta">' +
        `<span class="meta-stars">★ ${stars}</span>` +
        `<span class="meta-forks">⑂ ${forks}</span>` +
        `<span class="meta-updated">${date}</span>` +
        '</div>' +
        `<a class="card-link" href="${esc(r.html_url)}" target="_blank" rel="noopener noreferrer">Open on GitHub →</a>` +
        '</div>';
      frag.appendChild(card);
    });
    grid.appendChild(frag);
    initReveal();
  }

  function buildProjectCards() {
    fetch(`https://api.github.com/users/${CFG.githubUser}/repos?sort=updated&per_page=100`)
      .then((res) => {
        if (!res.ok) throw new Error('GitHub fetch failed');
        return res.json();
      })
      .then((repos) => {
        const list = (repos || [])
          .filter((r) => !r.fork)
          .slice(0, 6);
        if (!list.length) throw new Error('No repos');
        renderCards(list);
      })
      .catch(() => renderCards(FALLBACK_PROJECTS));
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
    setupCanvas(lCanvas);
    rawX = clamp(rawX, 0, VW);
    rawY = clamp(rawY, 0, VH);
    onScroll();
  }

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(onResize, 150);
  });

  function initMainScene() {
    vignette.classList.add('visible');
    if (heroEl) heroEl.classList.add('ready');
    if (siteHeader) siteHeader.classList.add('visible');
    buildOrbit();
    buildLetters();
    buildProjectCards();
    initStatsSpy();

    lastFrame = performance.now();
    rafId = requestAnimationFrame(masterLoop);
    revealLetters();

    const yearEl = $('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    onScroll();
  }

  startLoading();
})();
