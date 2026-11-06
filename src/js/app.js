/* ═══════════════════════════════════════════════════════════
   XOLERIC — core (app.js, v4)
   • Matrix-shamol loader (qisqa, o'tkazib yuboriladi)
   • Header: scroll progress, faol havola
   • Kursor: crosshair, spotlight, portret flashlight
   • Orbit: ijtimoiy ikonlar (footer'dan olinadi) + scroll bilan sayohat
   • Loyihalar: GitHub API (keshlanadi) — xato bo'lsa zaxira karta qoladi
   • Portret lightbox, Konami easter egg
   • three.js — faqat kerak bo'lganda, loader bilan parallel yuklanadi
   SAFETY: robot / JS'siz / reduced-motion → hammasi darhol ko'rinadi.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var X = window.xolEnv || { fx: true, reduce: false, coarse: false, save: false, bot: false };
  var doc = document;
  var root = doc.documentElement;
  var raf = window.requestAnimationFrame.bind(window);

  function $(id) { return doc.getElementById(id); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  var GH_USER = 'xolerc';
  var THREE_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

  /* ═══════════════ three.js (lazy) ═══════════════ */
  var threeReady = false, revealed = false;

  function loadThree() {
    if (!X.fx || X.save || !window.xolericGL || !window.xolericGL.canRun()) return;
    if (window.THREE) { threeReady = true; return; }
    var s = doc.createElement('script');
    s.src = THREE_SRC;
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.onload = function () { threeReady = true; startGL(); };
    doc.head.appendChild(s);
  }

  function startGL() {
    if (!threeReady || !revealed) return;
    try { if (window.xolericGL && !window.xolericGL.isOn()) window.xolericGL.enable(); } catch (e) {}
  }

  /* ═══════════════ REVEAL (loader tugadi) ═══════════════ */
  function reveal() {
    if (revealed) return;
    revealed = true;
    window.__xolericLoaded = true;
    var l = $('loader'), hero = $('hero'), h = $('siteHeader'), v = $('vignette');
    if (l) {
      l.classList.add('hidden');
      setTimeout(function () { if (l.parentNode) l.parentNode.removeChild(l); }, 700);
    }
    if (hero) hero.classList.add('ready');
    if (h) h.classList.add('visible');
    if (v) v.classList.add('visible');
    startGL();
  }

  /* ═══════════════ LOADER — matrix shamol ═══════════════ */
  function runLoader() {
    var L = $('loader'), cv = $('matrix-canvas'), logoWrap = $('logo-container'), logo = $('mainLogo');
    var ctx = cv && cv.getContext ? cv.getContext('2d') : null;
    if (!X.fx || !L || !ctx) { reveal(); return; }

    var T_LOGO = 850, T_STABLE = 1450, T_END = 1950;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var W = 0, H = 0, FS = 16, rows = [], t0 = 0, rafId = 0, finished = false, logoOn = false, stable = false;
    var CH = '0123456789';

    function size() {
      W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      FS = W < 600 ? 14 : 16;
      var n = Math.ceil(H / FS);
      rows = [];
      for (var i = 0; i < n; i++) {
        rows.push({ x: -Math.random() * W * 0.9, v: 5 + Math.random() * 11 });
      }
      ctx.font = FS + 'px "Space Grotesk", monospace';
      ctx.textBaseline = 'top';
    }

    function finish() {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', finish);
      L.removeEventListener('pointerdown', finish);
      window.removeEventListener('resize', size);
      reveal();
    }

    function frame(now) {
      if (finished) return;
      if (!t0) t0 = now;
      var t = now - t0;

      /* iz: yarim shaffof qora qatlam */
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff';
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        r.x += r.v;
        if (r.x > W + 40) { r.x = -Math.random() * 160; r.v = 5 + Math.random() * 11; }
        ctx.globalAlpha = 0.55 + Math.random() * 0.45;
        ctx.fillText(CH.charAt((Math.random() * CH.length) | 0), r.x, i * FS);
      }
      ctx.globalAlpha = 1;

      if (!logoOn && t >= T_LOGO) {
        logoOn = true;
        if (logoWrap) logoWrap.style.display = 'flex';
      }
      if (!stable && t >= T_STABLE) {
        stable = true;
        if (logo) logo.classList.add('stable');
      }
      if (t >= T_END) { finish(); return; }
      rafId = raf(frame);
    }

    size();
    window.addEventListener('resize', size, { passive: true });
    window.addEventListener('keydown', finish);
    L.addEventListener('pointerdown', finish);
    rafId = raf(frame);
    /* ishonchli zaxira: rAF to'xtab qolsa ham ochiladi */
    setTimeout(finish, T_END + 1200);
  }

  /* ═══════════════ HEADER: progress + faol havola ═══════════════ */
  var prog = $('scrollProgress'), header = $('siteHeader');
  var scrollTick = false, travelOn = false;

  function onScroll() {
    if (scrollTick) return;
    scrollTick = true;
    raf(function () {
      scrollTick = false;
      var y = window.scrollY || 0;
      var max = Math.max(1, root.scrollHeight - window.innerHeight);
      if (prog) prog.style.transform = 'scaleX(' + clamp(y / max, 0, 1).toFixed(4) + ')';
      if (header) header.classList.toggle('scrolled', y > 12);
      if (travelOn) orbitTravel();
    });
  }

  function initNavActive() {
    if (!('IntersectionObserver' in window)) return;
    var links = doc.querySelectorAll('.site-nav a[href^="#"]');
    var map = {};
    for (var i = 0; i < links.length; i++) map[links[i].getAttribute('href').slice(1)] = links[i];
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var id = e.target.id;
        for (var k in map) {
          var on = k === id;
          map[k].classList.toggle('active', on);
          if (on) map[k].setAttribute('aria-current', 'location'); else map[k].removeAttribute('aria-current');
        }
        if (id === 'hero') for (var k2 in map) { map[k2].classList.remove('active'); map[k2].removeAttribute('aria-current'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['hero', 'about', 'work', 'contact'].forEach(function (id) { var el = $(id); if (el) io.observe(el); });
  }

  /* ═══════════════ KURSOR: crosshair + spotlight ═══════════════ */
  function initCursorFx() {
    if (!X.fx || X.coarse) return;
    var ch = $('crosshair'), spot = $('spotlight');
    if (!ch) return;
    var hx = ch.querySelector('.ch-x'), hy = ch.querySelector('.ch-y'), dot = ch.querySelector('.ch-dot');
    var px = -100, py = -100, tick = false;
    function paint() {
      tick = false;
      if (hx) hx.style.transform = 'translateY(' + py + 'px)';
      if (hy) hy.style.transform = 'translateX(' + px + 'px)';
      if (dot) dot.style.transform = 'translate(' + px + 'px,' + py + 'px)';
      if (spot) spot.style.transform = 'translate3d(' + px + 'px,' + py + 'px,0)';
    }
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      px = e.clientX; py = e.clientY;
      if (!ch.classList.contains('on')) ch.classList.add('on');
      if (!tick) { tick = true; raf(paint); }
    }, { passive: true });
    doc.addEventListener('pointerleave', function () { ch.classList.remove('on'); });
    doc.documentElement.addEventListener('mouseleave', function () { ch.classList.remove('on'); });
    window.addEventListener('blur', function () { ch.classList.remove('on'); });
  }

  /* ═══════════════ HERO ART: flashlight + parallax + lightbox ═══════════════ */
  function initHeroArt() {
    var art = $('heroArt'), rev = $('reveal'), lm = $('layerMain');
    if (!art) return;

    if (X.fx && !X.coarse && rev) {
      var st = { x: 0, y: 0, r: 0, tr: 0, run: false, pxx: 0, pyy: 0 };
      var loop = function () {
        st.r += (st.tr - st.r) * 0.2;
        var m = 'radial-gradient(circle ' + st.r.toFixed(1) + 'px at ' + st.x.toFixed(1) + 'px ' + st.y.toFixed(1) + 'px,#000 0%,transparent 100%)';
        rev.style.webkitMaskImage = m; rev.style.maskImage = m;
        if (lm) lm.style.transform = 'translate3d(' + (-st.pxx * 8).toFixed(2) + 'px,' + (-st.pyy * 8).toFixed(2) + 'px,0) scale(1.04)';
        if (Math.abs(st.tr - st.r) > 0.4 || st.tr > 0) raf(loop); else { st.run = false; rev.style.webkitMaskImage = ''; rev.style.maskImage = ''; }
      };
      art.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch') return;
        var b = art.getBoundingClientRect();
        st.x = e.clientX - b.left; st.y = e.clientY - b.top;
        st.tr = Math.min(b.width, b.height) * 0.34;
        st.pxx = (st.x / b.width - 0.5) * 2; st.pyy = (st.y / b.height - 0.5) * 2;
        art.style.setProperty('--mx', (st.x / b.width * 100).toFixed(0) + '%');
        art.style.setProperty('--my', (st.y / b.height * 100).toFixed(0) + '%');
        if (!st.run) { st.run = true; raf(loop); }
      }, { passive: true });
      art.addEventListener('pointerleave', function () {
        st.tr = 0; st.pxx = 0; st.pyy = 0;
        if (!st.run) { st.run = true; raf(loop); }
      });
    }

    /* lightbox */
    var dlg = $('portraitLB');
    if (!dlg) return;
    function open() {
      if (dlg.open) return;
      try { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); } catch (e) { dlg.setAttribute('open', ''); }
      root.classList.add('lb-lock');
    }
    function close() { if (dlg.open) { try { dlg.close(); } catch (e) { dlg.removeAttribute('open'); } } root.classList.remove('lb-lock'); }
    art.addEventListener('click', open);
    art.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
    dlg.addEventListener('click', function (e) {
      if (!e.target.closest || !e.target.closest('.lb-figure')) close();
    });
    dlg.addEventListener('close', function () { root.classList.remove('lb-lock'); try { art.focus({ preventScroll: true }); } catch (e) {} });
    dlg.addEventListener('cancel', function () { root.classList.remove('lb-lock'); });
  }

  /* ═══════════════ ORBIT ═══════════════ */
  var orb = null, orbRing = null, orbLayer = null, orbHome = null;

  function initOrbit() {
    orb = $('orbitContainer'); orbRing = $('orbitRing'); orbLayer = $('orbitLayer');
    if (!orb || !orbRing) return;
    var src = doc.querySelectorAll('.footer-social .social-icon');
    var n = src.length;
    if (!n) return;
    for (var i = 0; i < n; i++) {
      var a = src[i];
      var key = '';
      ['yt', 'ig', 'tg', 'gh', 'pin', 'in'].forEach(function (k) { if (a.classList.contains(k)) key = k; });
      var o = doc.createElement('a');
      o.className = 'orbit-icon ' + key;
      o.href = a.href;
      o.target = '_blank';
      o.rel = 'noopener noreferrer';
      o.tabIndex = -1;
      o.style.setProperty('--a', (360 / n * i - 90).toFixed(2) + 'deg');
      var inner = doc.createElement('span');
      inner.className = 'icon-inner';
      var svg = a.querySelector('svg');
      if (svg) inner.appendChild(svg.cloneNode(true));
      o.appendChild(inner);
      orbRing.appendChild(o);
    }
    orbHome = orb.parentNode;
    if (X.fx && !X.coarse && orbLayer) {
      travelOn = true;
      orbitTravel();
      window.addEventListener('resize', orbitTravel, { passive: true });
    }
  }

  /* ≥1200px: orbit hero'dan chiqib, scroll bilan bo'sh yon zonada sayohat qiladi */
  var travelState = false;
  function orbitTravel() {
    if (!orb || !orbLayer || !travelOn) return;
    var vw = window.innerWidth, vh = window.innerHeight, y = window.scrollY || 0;
    var want = vw >= 1200 && y > vh * 0.55;

    if (want !== travelState) {
      travelState = want;
      if (want) {
        orbLayer.appendChild(orb);
        orb.classList.add('orbit-travel');
        orbLayer.classList.add('active');
      } else {
        orb.classList.remove('orbit-travel');
        orb.style.transform = ''; orb.style.opacity = '';
        orbLayer.classList.remove('active');
        if (orbHome) orbHome.appendChild(orb);
        if (orbRing) orbRing.style.transform = '';
        var ic = orb.querySelectorAll('.icon-inner');
        for (var i = 0; i < ic.length; i++) ic[i].style.transform = '';
      }
    }
    if (!want) return;

    var D = vw >= 1500 ? 240 : 200;
    orb.style.setProperty('--orbit-d', D + 'px');
    orb.style.setProperty('--orbit-r', (D / 2) + 'px');
    var gutter = (vw - 1200) / 2 + 36;          /* kontent yonidagi bo'sh zona */
    var x, op;
    if (gutter >= D + 24) { x = vw - gutter / 2 - D / 2; op = 1; }
    else if (gutter >= D * 0.55) { x = vw - D * 0.62; op = 0.5; }
    else { x = vw + D; op = 0; }
    var yy = vh * 0.5 - D / 2 + Math.sin(y * 0.0022) * vh * 0.14;
    orb.style.opacity = String(op);
    orb.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + yy.toFixed(1) + 'px,0)';
    var deg = (y * 0.12) % 360;
    if (orbRing) orbRing.style.transform = 'rotate(' + deg.toFixed(2) + 'deg)';
    var inn = orb.querySelectorAll('.icon-inner');
    for (var j = 0; j < inn.length; j++) inn[j].style.transform = 'rotate(' + (-deg).toFixed(2) + 'deg)';
  }

  /* ═══════════════ LOYIHALAR (GitHub) ═══════════════ */
  var LANG = {
    JavaScript: '#f1e05a', TypeScript: '#3178c6', HTML: '#e34c26', CSS: '#563d7c', Python: '#3572a5',
    Dart: '#00b4ab', Kotlin: '#a97bff', Java: '#b07219', 'C++': '#f34b7d', C: '#aab6c9', Go: '#00add8',
    Rust: '#dea584', PHP: '#4f5d95', Shell: '#89e051', Lua: '#51a0ff', Swift: '#f05138', GLSL: '#5686a5'
  };

  function ago(iso) {
    var d = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
    if (isNaN(d)) return '';
    if (d < 1) return 'bugun yangilangan';
    if (d < 30) return d + ' kun oldin';
    var m = Math.floor(d / 30);
    if (m < 12) return m + ' oy oldin';
    return Math.floor(m / 12) + ' yil oldin';
  }

  function el(tag, cls, text) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function renderProjects(list) {
    var grid = $('projectsGrid');
    if (!grid || !list || !list.length) return false;
    var frag = doc.createDocumentFragment();
    list.forEach(function (r, i) {
      var card = el('article', 'project-card' + (X.fx ? ' rv' : ''));
      card.style.setProperty('--rd', (i % 3) * 90 + 'ms');

      var art = el('div', 'card-art');
      var bar = el('span', 'card-art-lang');
      var col = LANG[r.language] || '#8ea0b8';
      bar.style.color = col; bar.style.background = col;
      art.appendChild(bar);
      art.appendChild(el('span', 'card-art-name', r.name));

      var body = el('div', 'card-body');
      body.appendChild(el('span', 'card-tag', r.language || 'Kod'));
      body.appendChild(el('h3', null, r.name));
      body.appendChild(el('p', null, r.description || 'GitHub loyihasi.'));

      var meta = el('div', 'card-meta');
      if (r.stars) meta.appendChild(el('span', 'meta-stars', '★ ' + r.stars));
      if (r.forks) meta.appendChild(el('span', null, '⑂ ' + r.forks));
      var when = ago(r.pushed);
      if (when) meta.appendChild(el('span', null, when));
      body.appendChild(meta);

      var a = el('a', 'card-link', 'Ko‘rish →');
      a.href = r.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.setAttribute('aria-label', r.name + ' — GitHub’da ochish');
      body.appendChild(a);

      card.appendChild(art);
      card.appendChild(body);
      frag.appendChild(card);
    });
    grid.textContent = '';
    grid.appendChild(frag);

    if (X.fx && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          e.target.classList.add('in');
          setTimeout(function (t) { return function () { t.classList.remove('rv', 'in'); }; }(e.target), 1300);
        });
      }, { rootMargin: '0px 0px -8% 0px' });
      var cs = grid.querySelectorAll('.project-card');
      for (var k = 0; k < cs.length; k++) io.observe(cs[k]);
    } else {
      var all = grid.querySelectorAll('.project-card');
      for (var q = 0; q < all.length; q++) all[q].classList.remove('rv');
    }
    return true;
  }

  function loadProjects() {
    var KEY = 'xol-repos-v3', TTL = 60 * 60 * 1000;
    var cached = null;
    try { cached = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (cached && cached.t && Date.now() - cached.t < TTL && cached.d && cached.d.length) {
      renderProjects(cached.d);
      return;
    }
    if (!window.fetch) return;
    fetch('https://api.github.com/users/' + GH_USER + '/repos?per_page=100&sort=pushed', {
      headers: { Accept: 'application/vnd.github+json' }
    }).then(function (res) {
      if (!res.ok) throw new Error('gh ' + res.status);
      return res.json();
    }).then(function (all) {
      var d = (all || []).filter(function (r) {
        return !r.fork && !r.archived && !r.private && !/\.github\.io$/i.test(r.name);
      }).sort(function (a, b) {
        return (b.stargazers_count - a.stargazers_count) || (new Date(b.pushed_at) - new Date(a.pushed_at));
      }).slice(0, 8).map(function (r) {
        return {
          name: r.name, url: r.html_url, description: r.description, language: r.language,
          stars: r.stargazers_count, forks: r.forks_count, pushed: r.pushed_at
        };
      });
      if (!d.length) return;
      try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), d: d })); } catch (e) {}
      renderProjects(d);
    }).catch(function () {
      /* eski kesh bo'lsa — uni ko'rsatamiz, bo'lmasa HTML'dagi zaxira karta qoladi */
      if (cached && cached.d && cached.d.length) renderProjects(cached.d);
    });
  }

  /* ═══════════════ KONAMI ═══════════════ */
  function initKonami() {
    var seq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    var pos = 0, toast = $('eeToast'), tT = 0;
    doc.addEventListener('keydown', function (e) {
      if (!e.key) return;
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === seq[pos]) {
        pos++;
        if (pos === seq.length) {
          pos = 0;
          doc.body.classList.toggle('ee-mode');
          if (toast) {
            toast.textContent = doc.body.classList.contains('ee-mode') ? 'Konami Kodi Faollashdi' : 'Konami Kodi O‘chirildi';
            toast.classList.add('show');
            clearTimeout(tT);
            tT = setTimeout(function () { toast.classList.remove('show'); }, 2400);
          }
        }
      } else {
        pos = k === seq[0] ? 1 : 0;
      }
    });
  }

  /* ═══════════════ START ═══════════════ */
  function init() {
    var y = $('year');
    if (y) y.textContent = String(new Date().getFullYear());

    loadProjects();
    initOrbit();
    initHeroArt();
    initNavActive();
    initCursorFx();
    initKonami();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();

    loadThree();      /* loader bilan parallel */
    runLoader();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
