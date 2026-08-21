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
  const terminalEl = $('terminal-container');
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
     LOADER — BIOS boot → XOLERIC logo
     Real preload + failsafe
     ═══════════════════════════════════════ */

  const TERMINAL_MAX = 24;
  let bootTimer = 0;
  let bootIdx = 0;
  let fillIdx = 0;
  let loaderDone = false;

  const bootScript = [
    'BIOS version 3.3.0',
    'Copyright (C) 2026 XOLERIC SYSTEMS',
    '',
    'CPU : XOLERIC-CORE @ 5.2GHz',
    'Memory Test : 65536K ... <span class="ok">OK</span>',
    'SATA : /dev/sda1 AHCI',
    'USB : 3 devices detected',
    'NETWORK : initialized ... <span class="ok">OK</span>',
    'MOUNT /sys/fs/cgroup ... <span class="ok">OK</span>',
    'DAEMON XOLERIC-CORE ... <span class="ok">OK</span>',
    'UI_MODULE : loaded',
    'Booting xoleric portfolio ...'
  ];

  const bootFillers = [
    'validating core registry ... <span class="ok">OK</span>',
    'synchronizing clock ... <span class="ok">OK</span>',
    'scanning socket_buffer ... <span class="ok">OK</span>',
    'checking encrypted_payload ... <span class="ok">OK</span>',
    'reloading security policies ... <span class="ok">OK</span>'
  ];

  function nextBootLine() {
    if (bootIdx < bootScript.length) return bootScript[bootIdx++];
    const line = bootFillers[fillIdx % bootFillers.length];
    fillIdx++;
    return line;
  }

  function appendLog(html) {
    if (!terminalEl) return;
    const div = document.createElement('div');
    div.className = 'log-line';
    div.innerHTML = html;
    terminalEl.appendChild(div);
    while (terminalEl.childNodes.length > TERMINAL_MAX) {
      terminalEl.removeChild(terminalEl.firstChild);
    }
  }

  function bootTick() {
    if (loaderDone) return;
    appendLog(nextBootLine());
    bootTimer = setTimeout(bootTick, reduceMotion ? 5 : 130 + Math.random() * 140);
  }

  function preloadAssets(onDone) {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onDone();
    };
    /* one overall timeout instead of one per image */
    setTimeout(finish, 3000);
    for (const src of CFG.images) {
      const img = new Image();
      img.onload = finish;
      img.onerror = finish;
      img.src = src;
    }
  }

  function finishLoading() {
    if (loaderDone) return;
    clearTimeout(bootTimer);
    loaderDone = true;
    if (terminalEl) terminalEl.style.display = 'none';
    if (logoContainer) logoContainer.style.display = 'flex';

    const logoWait = reduceMotion ? 250 : 900;
    const hideWait = reduceMotion ? 500 : 1750;
    setTimeout(() => { if (mainLogo) mainLogo.classList.add('stable'); }, logoWait);
    setTimeout(() => {
      loaded = true;
      window.__xolericLoaded = true; /* tells the inline failsafe we're alive */
      loaderEl.classList.add('hidden');
      initMainScene();
    }, hideWait);
  }

  function startLoading() {
    appendLog('XOLERIC BIOS v3.3.0');
    appendLog('Copyright (C) 2026 xoleric systems');
    appendLog('');
    bootTick();

    setTimeout(() => {
      if (!loaded) finishLoading();
    }, 8000);

    const minTime = reduceMotion ? 150 : 2600;
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
      if (loaded && heroVisible && !reduceMotion && revealEl && !rafId) startMasterLoop();
    }, { passive: true });
  } else {
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

  const WELCOME_TEXT = 'I build web experiences that drive real results';
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

  /* Delta-time normalized lerp: animation speed is time-based, not FPS-based
     (a 120Hz screen no longer plays the reveal 2x faster; a dropped frame
     no longer makes it jump). dt is clamped so background tab jumps are safe. */
  let lastLoopT = 0;
  function frameLerp(current, target, base, now) {
    const dt = lastLoopT ? Math.min((now - lastLoopT) / 16.666, 3) : 1;
    const k = 1 - Math.pow(1 - base, dt);
    return current + (target - current) * k;
  }

  /* Idle auto-stop: while nothing moves we stop the rAF loop entirely
     (zero CPU/GPU on a static hero) and restart it from input events. */
  const IDLE_STOP_FRAMES = 40;
  let idleFrames = 0;

  function updateReveal(now) {
    if (!revealEl || reduceMotion) return false;
    cursorX = frameLerp(cursorX, rawX, 0.12, now);
    cursorY = frameLerp(cursorY, rawY, 0.12, now);

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
      targetR = isFine ? CFG.circle : CFG.circleMobile;
      if (!isFine && !touchActiveRecently()) targetR = 0;
    }

    currentR = frameLerp(currentR, targetR, 0.1, now);
    if (Math.abs(currentR - targetR) < 0.5) currentR = targetR;

    /* Quantized to whole pixels: fewer unique strings → less GC churn */
    const qmx = clamp(Math.round(mx), 0, Math.round(revealRect.width));
    const qmy = clamp(Math.round(my), 0, Math.round(revealRect.height));
    const qr = Math.round(currentR);

    const mask =
      qr > 0 && revealRect.width > 0
        ? `radial-gradient(circle ${qr}px at ${qmx}px ${qmy}px, #000 0%, #000 38%, transparent 70%)`
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
    lastLoopT = now;
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
    { name: 'Mydrime', language: 'HTML', role: 'Creator', impact: 'this portfolio, live on GitHub Pages', description: 'This very portfolio — creative coding, WebGL background and a neon welcome.', html_url: 'https://github.com/xolerc/mydrime', stargazers_count: 0, forks_count: 0, updated_at: new Date().toISOString() },
    { name: 'Music', language: 'Dart', role: 'Creator', impact: 'cross-platform music app prototype', description: 'Music application experiment.', html_url: 'https://github.com/xolerc/music', stargazers_count: 0, forks_count: 0, updated_at: new Date().toISOString() },
    { name: 'xolericc', language: 'TypeScript', role: 'Creator', impact: 'TypeScript experiments', description: 'Experiments and snippets.', html_url: 'https://github.com/xolerc/xolericc', stargazers_count: 0, forks_count: 0, updated_at: new Date().toISOString() },
    { name: 'Savodhon', language: 'Python', role: 'Creator', impact: 'utility tooling', description: 'Utility project.', html_url: 'https://github.com/xolerc/Savodhon', stargazers_count: 0, forks_count: 0, updated_at: new Date().toISOString() },
    { name: 'Abdullo-usta', language: 'JavaScript', role: 'Creator', impact: 'client project', description: 'Craft project.', html_url: 'https://github.com/xolerc/Abdullo-usta', stargazers_count: 0, forks_count: 0, updated_at: new Date().toISOString() },
    { name: 'xoleric-globe', language: 'CSS', role: 'Creator', impact: 'WebGL globe experiment', description: 'Globe experiment.', html_url: 'https://github.com/xolerc/xoleric-globe', stargazers_count: 0, forks_count: 0, updated_at: new Date().toISOString() }
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
      const role = r.role || '';
      const impact = r.impact || '';
      const impactLine = (role || impact)
        ? '<div class="card-impact">' +
          (role ? '<span>Role: ' + esc(role) + '</span>' : '') +
          (role && impact ? ' · ' : '') +
          (impact ? '<span>Impact: ' + esc(impact) + '</span>' : '') +
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
        `<a class="card-link" href="${esc(r.html_url)}" target="_blank" rel="noopener noreferrer">Open on GitHub →</a>` +
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
    toastEl.textContent = eeActive ? 'Konami Code Activated' : 'Konami Code Deactivated';
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
     WEBGL BG TOGGLE — off by default; opt-in
     ═══════════════════════════════════════ */

  const bgToggle = $('bgToggle');
  const glApi = window.xolericGL || null;
  let glOn = false;

  function applyBgToggle() {
    if (!bgToggle) return;
    bgToggle.classList.toggle('on', glOn);
    bgToggle.setAttribute('aria-pressed', String(glOn));
    bgToggle.textContent = 'background: ' + (glOn ? 'on' : 'off');
    try { localStorage.setItem('xoleric-gl', glOn ? '1' : '0'); } catch (e) { /* noop */ }
  }

  function initBgToggle() {
    if (!glApi || !glApi.canRun()) {
      if (bgToggle) bgToggle.style.display = 'none';
      return;
    }
    if (!bgToggle) return;
    bgToggle.hidden = false;

    let pref = null;
    try { pref = localStorage.getItem('xoleric-gl'); } catch (e) { /* noop */ }
    if (pref === '1') {
      glOn = true;
      if (!glApi.enable()) glOn = false;
    }

    bgToggle.addEventListener('click', () => {
      glOn = !glOn;
      if (glOn) {
        if (!glApi.enable()) glOn = false;
      } else {
        glApi.disable();
      }
      applyBgToggle();
    });
    glApi.onDisable = () => {
      glOn = false;
      applyBgToggle();
    };
    applyBgToggle();
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
    try { buildLetters(); } catch (e) { /* noop */ }
    try { buildProjectCards(); } catch (e) { /* noop */ }
    try { initStatsSpy(); } catch (e) { /* noop */ }
    try { initNavSpy(); } catch (e) { /* noop */ }
    try { initViewportSpy(); } catch (e) { /* noop */ }
    try { measureReveal(); } catch (e) { /* noop */ }
    try { initBgToggle(); } catch (e) { /* noop */ }

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
