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
    let count = 0;
    for (const src of CFG.images) {
      const img = new Image();
      const resolve = () => {
        count++;
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

    const logoWait = reduceMotion ? 250 : 900;
    const hideWait = reduceMotion ? 500 : 1750;
    setTimeout(() => { if (mainLogo) mainLogo.classList.add('stable'); }, logoWait);
    setTimeout(() => {
      loaded = true;
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
