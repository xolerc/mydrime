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
     LOADER — terminal boot → XOLERIC logo
     Real preload + failsafe
     ═══════════════════════════════════════ */

  const TERMINAL_MAX = 60;
  let bootTimer = 0;
  let loaderProgress = 0;
  let lastPctBucket = -1;
  let loaderDone = false;

  const bootPrefixes = ['SYSTEM', 'KERNEL', 'INIT', 'DAEMON', 'XOLERIC-CORE', 'NETWORK', 'FS-CHECK', 'SECURITY'];
  const bootActions = ['Mounting', 'Initializing', 'Starting', 'Verifying', 'Loading module', 'Unpacking', 'Connecting to', 'Bypassing'];
  const bootTargets = ['/dev/sda1', '/sys/fs/cgroup', '0x8F9A2B', 'socket_buffer', 'local_host', 'encrypted_payload', 'UI_module', 'core_registry'];
  const randHex = (n) => {
    let out = '';
    const chars = '0123456789ABCDEF';
    for (let i = 0; i < n; i++) out += chars[Math.floor(Math.random() * 16)];
    return out;
  };

  function bootLine() {
    if (Math.random() > 0.82) return 'DUMP: ' + randHex(70);
    const pre = bootPrefixes[Math.floor(Math.random() * bootPrefixes.length)];
    const act = bootActions[Math.floor(Math.random() * bootActions.length)];
    const tgt = bootTargets[Math.floor(Math.random() * bootTargets.length)];
    return `[ ${(Math.random() * 2).toFixed(4)} ] ${pre}: ${act} ${tgt} ... <span class="ok">[ OK ]</span> - Hash: <span class="hash">${randHex(8)}</span>`;
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
    const bucket = Math.floor(loaderProgress / 10);
    if (bucket > lastPctBucket) {
      lastPctBucket = bucket;
      appendLog(`<span class="load">[ LOAD ${Math.round(loaderProgress)}% ]</span> unpacking module core_registry`);
    } else {
      appendLog(bootLine());
    }
    bootTimer = setTimeout(bootTick, reduceMotion ? 4 : 10 + Math.random() * 30);
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

  function finishLoading() {
    if (loaderDone) return;
    clearTimeout(bootTimer);
    loaderDone = true;
    if (terminalEl) terminalEl.style.display = 'none';
    if (logoContainer) logoContainer.style.display = 'flex';

    const logoWait = reduceMotion ? 250 : 800;
    const hideWait = reduceMotion ? 500 : 1550;
    setTimeout(() => { if (mainLogo) mainLogo.classList.add('stable'); }, logoWait);
    setTimeout(() => {
      loaded = true;
      loaderEl.classList.add('hidden');
      initMainScene();
    }, hideWait);
  }

  function startLoading() {
    appendLog('<span class="load">[ BOOT ]</span> xoleric core v3.2 — cold start');
    bootTick();

    setTimeout(() => {
      if (!loaded) {
        loaderProgress = 100;
        finishLoading();
      }
    }, 8000);

    const minTime = reduceMotion ? 150 : 1500;
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
    });
  }, { passive: true });

  function setActiveNav(id) {
    for (const t of navTargets) t.link.classList.toggle('active', t.link.getAttribute('href') === id);
  }

  function initNavSpy() {
    if (!navTargets.length) return;
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) setActiveNav('#' + entry.target.id);
      }
    }, { rootMargin: '-45% 0px -50% 0px' });
    for (const t of navTargets) io.observe(t.sec);
    setActiveNav('#hero');
  }

  function initViewportSpy() {
    if (!heroEl) return;
    const io = new IntersectionObserver((entries) => {
      heroVisible = entries.some((e) => e.isIntersecting);
      measureReveal();
    }, { threshold: 0 });
    io.observe(heroEl);
  }

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

  function updateReveal() {
    if (!revealEl || reduceMotion) return;
    cursorX = lerp(cursorX, rawX, 0.12);
    cursorY = lerp(cursorY, rawY, 0.12);

    const mx = cursorX - revealRect.left;
    const my = cursorY - revealRect.top;
    const inside = mx >= -24 && my >= -24 && mx <= revealRect.width + 24 && my <= revealRect.height + 24;

    let targetR = 0;
    if (heroVisible && hasPointer && inside) {
      targetR = isFine ? CFG.circle : CFG.circleMobile;
      if (!isFine && !touchActiveRecently()) targetR = 0;
    }

    currentR = lerp(currentR, targetR, 0.1);
    if (Math.abs(currentR - targetR) < 0.5) currentR = targetR;

    if (currentR > 0.5 && revealRect.width > 0) {
      const cx = clamp(mx, 0, revealRect.width);
      const cy = clamp(my, 0, revealRect.height);
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
    } else if (loaded && !reduceMotion) {
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
    vignette.classList.add('visible');
    if (heroEl) heroEl.classList.add('ready');
    if (siteHeader) siteHeader.classList.add('visible');
    buildOrbit();
    buildLetters();
    buildProjectCards();
    initStatsSpy();
    initNavSpy();
    initViewportSpy();
    measureReveal();

    if (!reduceMotion) {
      rafId = requestAnimationFrame(masterLoop);
    }
    revealLetters();

    const yearEl = $('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    onScroll();
  }

  startLoading();
})();
