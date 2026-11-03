/* ═══════════════════════════════════════════════════════════
   xoleric — SUPER VIBE EXTRAS
   1) Web Audio: yig'ilish tiklari + yakuniy chuqur chime (default OFF,
      header'dagi tugma bilan yoqiladi, tanlov saqlanadi)
   2) Command palette — Ctrl/Cmd+K (Loyihalar, CV, Store, Telegram…)
      Mobilda pastda dock mavjud
   3) Mascot — suv tomchisi X logo, kursor ortidan yuruvchi,
      Konami'da oltinlashadi
   4) Bento grid kartalar — kursor ergashadigan yorug' chegara,
      3D tilt, birinchi karta ikki ustunli "feature"
   5) Kinetic tipografiya — Space Grotesk variable weight,
      kursorga yaqinlik bo'yicha qalinlashadi/ingichkalashadi
   6) Magnitli tugmalar
   7) Build "selection frame" — har bo'lim qurilganda 8 handle va
      o'lcham yorlig'i miltillaydi (Figma uslubi)
   8) Yorug'/qorong'i mavzu — View Transitions dumaloq to'lqin
   9) Gyroscope (beparda qurilmalarda) — suv yo'nalishi egiladi
   10) Lightbox: portret zarrachalardan yig'ilib "suv ostidan
       chiqqandek" paydo bo'ladi
   SAFETY: hamma narsa reduced-motion / coarse pointer / try-catch ostida.
   Palitra Ctrl/Cmd+K ni build.js klaviatura ishlovi bilan urashtirmaslik
   uchun capture-phase da to'xtatiladi.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var reduceMotion = false;
  try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var finePointer = false;
  try { finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (e) {}

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function on(el, ev, fn, opts) { if (el) el.addEventListener(ev, fn, opts || false); }
  function storeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function storeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  /* ══════════════════════════════════════════
     1) SOUND ENGINE — default o'chiq
     ══════════════════════════════════════════ */
  var soundOn = storeGet('xol_sound') === '1';
  var audioCtx = null;

  function ctx() {
    if (audioCtx) return audioCtx;
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; }
    return audioCtx;
  }

  function env(gain, peak, t0, decay) {
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);
  }

  function tone(freq, peak, decay, type, when) {
    var ac = ctx(); if (!ac) return;
    var t0 = ac.currentTime + (when || 0);
    var o = ac.createOscillator();
    var g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    o.connect(g); g.connect(ac.destination);
    env(g, peak, t0, decay);
    o.start(t0); o.stop(t0 + decay + 0.05);
  }

  var sound = {
    isOn: function () { return soundOn; },
    set: function (v) {
      soundOn = !!v;
      storeSet('xol_sound', soundOn ? '1' : '0');
      updateSoundBtn();
    },
    tick: function (step) {
      if (!soundOn) return;
      var scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
      tone(scale[Math.abs(step || 0) % scale.length], 0.05, 0.09, 'triangle');
    },
    chime: function () {
      if (!soundOn) return;
      tone(174.61, 0.16, 1.6, 'sine');          /* F3 — chuqur asos */
      tone(349.23, 0.10, 1.3, 'sine', 0.07);    /* F4 */
      tone(523.25, 0.06, 1.1, 'sine', 0.16);    /* C5 */
    },
    blip: function () {
      if (!soundOn) return;
      tone(1174.66, 0.05, 0.12, 'sine');
    }
  };
  window.__vibeSound = sound;

  var soundBtn = null;
  var ICON_SND_ON = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" stroke="none"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.4 5.6a9 9 0 0 1 0 12.8"/></svg>';
  var ICON_SND_OFF = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" stroke="none"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>';

  function updateSoundBtn() {
    if (!soundBtn) return;
    soundBtn.innerHTML = soundOn ? ICON_SND_ON : ICON_SND_OFF;
    soundBtn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
    soundBtn.setAttribute('title', soundOn ? "Tovushni o'chirish" : "Tovushni yoqish");
    soundBtn.setAttribute('aria-label', soundOn ? "Tovushni o'chirish" : "Tovushni yoqish");
  }

  function injectSoundBtn() {
    var actions = $('.header-actions');
    if (!actions || $('.vibe-sound-btn')) return;
    soundBtn = document.createElement('button');
    soundBtn.type = 'button';
    soundBtn.className = 'vibe-icon-btn vibe-sound-btn';
    actions.insertBefore(soundBtn, actions.firstChild);
    soundBtn.addEventListener('click', function () {
      sound.set(!sound.isOn());
      if (sound.isOn()) { var ac = ctx(); if (ac && ac.state === 'suspended') ac.resume(); sound.blip(); }
    });
    updateSoundBtn();
  }

  /* ══════════════════════════════════════════
     9) MAVZU — yorug' / qorong'i (View Transitions)
     ══════════════════════════════════════════ */
  function currentTheme() { return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }
  function applyTheme(next) {
    if (next === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
    storeSet('xol_theme', next);
    updateThemeBtn();
  }
  function toggleTheme(originX, originY) {
    var next = currentTheme() === 'light' ? 'dark' : 'light';
    var doc = document.documentElement;
    doc.style.setProperty('--vt-x', (originX != null ? originX : window.innerWidth / 2) + 'px');
    doc.style.setProperty('--vt-y', (originY != null ? originY : 80) + 'px');
    if (typeof document.startViewTransition === 'function' && !reduceMotion) {
      try { document.startViewTransition(function () { applyTheme(next); }); return; } catch (e) { /* pastdagi oddiy usul */ }
    }
    applyTheme(next);
  }

  var themeBtn = null;
  var ICON_SUN = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var ICON_MOON = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

  function updateThemeBtn() {
    if (!themeBtn) return;
    var light = currentTheme() === 'light';
    themeBtn.innerHTML = light ? ICON_MOON : ICON_SUN;
    themeBtn.setAttribute('aria-pressed', light ? 'true' : 'false');
    themeBtn.setAttribute('title', light ? "Qorong'i mavzu" : "Yorug' mavzu");
    themeBtn.setAttribute('aria-label', light ? "Qorong'i mavzuga o'tish" : "Yorug' mavzuga o'tish");
  }

  function injectThemeBtn() {
    var actions = $('.header-actions');
    if (!actions || $('.vibe-theme-btn')) return;
    themeBtn = document.createElement('button');
    themeBtn.type = 'button';
    themeBtn.className = 'vibe-icon-btn vibe-theme-btn';
    themeBtn.addEventListener('click', function (e) { toggleTheme(e.clientX, e.clientY); });
    actions.insertBefore(themeBtn, actions.firstChild);
    updateThemeBtn();
  }

  /* ══════════════════════════════════════════
     2) COMMAND PALETTE — Ctrl/Cmd+K
     ══════════════════════════════════════════ */
  var ICONS = {
    grid: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>',
    file: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></svg>',
    bag: '<svg viewBox="0 0 24 24"><path d="M6 7h12l1.5 13a2 2 0 0 1-2 2H6.5a2 2 0 0 1-2-2L6 7z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>',
    mail: '<svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
    github: '<svg viewBox="0 0 24 24"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-1-2.6c3.3-.4 6.8-1.6 6.8-7.1A5.9 5.9 0 0 0 20.9 4.9 5.5 5.5 0 0 0 20.8 1S19.7.6 17.4 2.2a17.4 17.4 0 0 0-9.2 0C5.9.6 4.8 1 4.8 1a5.5 5.5 0 0 0-.1 3.9A5.9 5.9 0 0 0 2.9 8.4c0 5.5 3.5 6.7 6.8 7.1A3.4 3.4 0 0 0 8.7 18V22"/></svg>',
    at: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>',
    snd: '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4V5z"/></svg>',
    moon: '<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
  };

  var commands = [
    { label: 'Loyihalarni ko‘rish', hint: 'sahifa · ishlar', icon: 'grid', run: function () { goto('#work'); } },
    { label: 'Men haqimda', hint: 'sahifa', icon: 'user', run: function () { goto('#about'); } },
    { label: 'CV / Rezyume', hint: 'yangi sahifa', icon: 'file', run: function () { location.href = 'cv.html'; } },
    { label: 'X Store — APK lar', hint: 'yangi sahifa', icon: 'bag', run: function () { location.href = 'store.html'; } },
    { label: 'Telegram — @Wxoleric', hint: 'tashqi havola', icon: 'send', run: function () { window.open('https://t.me/Wxoleric', '_blank', 'noopener'); } },
    { label: 'Email yozish', hint: 'devxoleric@gmail.com', icon: 'mail', run: function () { location.href = 'mailto:devxoleric@gmail.com'; } },
    { label: 'GitHub — @xolerc', hint: 'tashqi havola', icon: 'github', run: function () { window.open('https://github.com/xolerc', '_blank', 'noopener'); } },
    { label: 'Aloqa', hint: 'sahifa', icon: 'at', run: function () { goto('#contact'); } },
    { label: 'Boshiga qaytish', hint: 'hero', icon: 'up', run: function () { window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); } },
    { label: 'Tovushni yoqish / o‘chirish', hint: 'build tiklari + chime', icon: 'snd', run: function () { sound.set(!sound.isOn()); if (sound.isOn()) sound.blip(); } },
    { label: 'Yorug‘ / qorong‘i mavzu', hint: 'tema almashuvi', icon: 'moon', run: function () { toggleTheme(); } }
  ];

  function goto(hash) {
    var el = $(hash);
    if (el) {
      el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
    }
  }

  var palette = null, paletteInput = null, paletteList = null, paletteIdx = 0, paletteOpen = false;

  function buildPalette() {
    palette = document.createElement('div');
    palette.className = 'cmdk';
    palette.setAttribute('role', 'dialog');
    palette.setAttribute('aria-modal', 'true');
    palette.setAttribute('aria-label', 'Buyruqlar paneli');
    palette.setAttribute('aria-hidden', 'true');
    palette.innerHTML =
      '<div class="cmdk-backdrop" data-close></div>' +
      '<div class="cmdk-panel" role="document">' +
        '<div class="cmdk-head">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="1.8"/><line x1="21" y1="21" x2="16.5" y2="16.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
          '<input class="cmdk-input" type="text" placeholder="Buyruq yoki sahifa yozing…" aria-label="Buyruq qidirish" autocomplete="off" spellcheck="false" enterkeyhint="go">' +
          '<kbd class="cmdk-esc">Esc</kbd>' +
        '</div>' +
        '<ul class="cmdk-list" role="listbox" aria-label="Buyruqlar"></ul>' +
        '<div class="cmdk-foot"><span><kbd>↑</kbd><kbd>↓</kbd> tanlash</span><span><kbd>↵</kbd> ochish</span><span><kbd>esc</kbd> yopish</span></div>' +
      '</div>';
    document.body.appendChild(palette);
    paletteInput = $('.cmdk-input', palette);
    paletteList = $('.cmdk-list', palette);

    palette.addEventListener('click', function (e) {
      if (e.target && e.target.hasAttribute('data-close')) closePalette();
    });
    on(paletteInput, 'input', function () { renderPaletteList(paletteInput.value); });
  }

  function filteredCommands(q) {
    q = (q || '').trim().toLowerCase();
    if (!q) return commands.slice();
    return commands.filter(function (c) { return c.label.toLowerCase().indexOf(q) !== -1 || (c.hint || '').toLowerCase().indexOf(q) !== -1; });
  }

  function renderPaletteList(q) {
    var list = filteredCommands(q);
    paletteIdx = 0;
    if (!list.length) {
      paletteList.innerHTML = '<li class="cmdk-empty">Hech narsa topilmadi — “CV” yoki “Store” deb ko‘ring</li>';
      return;
    }
    paletteList.innerHTML = list.map(function (c, i) {
      return '<li class="cmdk-item' + (i === 0 ? ' is-active' : '') + '" role="option" aria-selected="' + (i === 0) + '" data-i="' + i + '">' +
        '<span class="cmdk-icon">' + ICONS[c.icon] + '</span>' +
        '<span class="cmdk-text"><span class="cmdk-label">' + c.label + '</span><span class="cmdk-hint">' + (c.hint || '') + '</span></span>' +
        '<kbd class="cmdk-go">↵</kbd>' +
      '</li>';
    }).join('');
    $$('.cmdk-item', paletteList).forEach(function (item) {
      on(item, 'pointermove', function () { setPaletteIdx(+item.getAttribute('data-i')); });
      on(item, 'click', function () { runPaletteIdx(+item.getAttribute('data-i')); });
    });
  }

  function setPaletteIdx(i) {
    var items = $$('.cmdk-item', paletteList);
    if (!items.length) return;
    paletteIdx = ((i % items.length) + items.length) % items.length;
    items.forEach(function (el, j) {
      el.classList.toggle('is-active', j === paletteIdx);
      el.setAttribute('aria-selected', j === paletteIdx ? 'true' : 'false');
    });
  }

  function runPaletteIdx(i) {
    var list = filteredCommands(paletteInput.value);
    var cmd = list[i == null ? paletteIdx : i];
    closePalette();
    if (cmd && typeof cmd.run === 'function') { try { cmd.run(); } catch (e) {} }
  }

  function openPalette() {
    if (paletteOpen) return;
    if (!palette) buildPalette();
    paletteOpen = true;
    document.documentElement.classList.add('palette-open');
    palette.setAttribute('aria-hidden', 'false');
    palette.classList.add('is-open');
    paletteInput.value = '';
    renderPaletteList('');
    setTimeout(function () { try { paletteInput.focus(); } catch (e) {} }, 16);
  }

  function closePalette() {
    if (!paletteOpen) return;
    paletteOpen = false;
    document.documentElement.classList.remove('palette-open');
    if (palette) {
      palette.setAttribute('aria-hidden', 'true');
      palette.classList.remove('is-open');
    }
  }

  function togglePalette() { paletteOpen ? closePalette() : openPalette(); }

  /* Capture-phase: build.js / app.js dan oldin tutamiz. */
  window.addEventListener('keydown', function (e) {
    var mod = e.ctrlKey || e.metaKey;
    if (mod && (e.key === 'k' || e.key === 'K' || e.key === 'к' || e.key === 'К')) {
      e.preventDefault();
      e.stopPropagation();
      togglePalette();
      return;
    }
    if (!paletteOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePalette(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); setPaletteIdx(paletteIdx + 1); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); setPaletteIdx(paletteIdx - 1); return; }
    if (e.key === 'Home') { e.preventDefault(); e.stopPropagation(); setPaletteIdx(0); return; }
    if (e.key === 'End') { e.preventDefault(); e.stopPropagation(); setPaletteIdx(1e9); return; }
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); runPaletteIdx(); return; }
    /* matn kirmaydigan boshqa tugmalar sahifa scrollini to'xtatmasin */
    if (e.key === ' ' || e.key === 'PageDown' || e.key === 'PageUp' || e.key === 'Tab') { e.stopPropagation(); }
  }, true);

  /* ══════════════════════════════════════════
     3) DOCK — mobilda pastki qator (CV / Store / Ishlar / Aloqa)
     ══════════════════════════════════════════ */
  function injectDock() {
    if ($('.vibe-dock')) return;
    var dock = document.createElement('nav');
    dock.className = 'vibe-dock';
    dock.setAttribute('aria-label', 'Tezkor havolalar');
    dock.innerHTML =
      '<a href="#work" aria-label="Ishlar"><svg viewBox="0 0 24 24">' + ICONS.grid + '</svg><span>ishlar</span></a>' +
      '<a href="cv.html" aria-label="CV"><svg viewBox="0 0 24 24">' + ICONS.file + '</svg><span>CV</span></a>' +
      '<a href="store.html" aria-label="Store"><svg viewBox="0 0 24 24">' + ICONS.bag + '</svg><span>store</span></a>' +
      '<a href="#contact" aria-label="Aloqa"><svg viewBox="0 0 24 24">' + ICONS.send + '</svg><span>aloqa</span></a>';
    document.body.appendChild(dock);
  }

  /* ══════════════════════════════════════════
     4) MASCOT — X-tomchi, kursor ortidan (lerp), Konami'da oltin
     ══════════════════════════════════════════ */
  var mascot = null, mX = -100, mY = -100, tX = -100, tY = -100, mRaf = 0, mShown = false;

  function buildMascot() {
    mascot = document.createElement('div');
    mascot.className = 'vibe-mascot';
    mascot.setAttribute('aria-hidden', 'true');
    mascot.innerHTML =
      '<svg viewBox="0 0 48 48">' +
        '<defs>' +
          '<radialGradient id="vm-drop" cx="38%" cy="32%" r="75%">' +
            '<stop offset="0%" stop-color="#bfe9ff"/>' +
            '<stop offset="45%" stop-color="#3ec6e8"/>' +
            '<stop offset="100%" stop-color="#0a4d66"/>' +
          '</radialGradient>' +
        '</defs>' +
        '<path class="vm-body" d="M24 3c7.5 10.6 13 18.2 13 26a13 13 0 0 1-26 0c0-7.8 5.5-15.4 13-26z" fill="url(#vm-drop)"/>' +
        '<path class="vm-shine" d="M18.5 22c-2 4-2.6 7.2-1.2 10.4" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="2.4" stroke-linecap="round"/>' +
        '<text class="vm-x" x="24" y="33" text-anchor="middle" font-family="‘Space Grotesk’,sans-serif" font-weight="700" font-size="13" fill="#04121c">X</text>' +
      '</svg>';
    document.body.appendChild(mascot);
  }

  function mascotLoop() {
    mRaf = requestAnimationFrame(mascotLoop);
    mX += (tX - mX) * 0.14;
    mY += (tY - mY) * 0.14;
    if (mascot) mascot.style.transform = 'translate3d(' + mX.toFixed(1) + 'px,' + mY.toFixed(1) + 'px,0)';
  }

  function initMascot() {
    if (reduceMotion || !finePointer) return;
    buildMascot();
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      tX = e.clientX + 18;
      tY = e.clientY + 16;
      if (!mShown) { mShown = true; mX = tX; mY = tY; if (mascot) mascot.classList.add('is-live'); }
    }, { passive: true });
    mascotLoop();

    /* Konami (yuqori-yuqori-past-past-chap-o'ng-chap-o'ng-b-a) — oltin holat */
    var SEQ = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    var idx = 0, goldTimer = 0;
    window.addEventListener('keydown', function (e) {
      var key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      idx = (key === SEQ[idx]) ? idx + 1 : (key === SEQ[0] ? 1 : 0);
      if (idx === SEQ.length) {
        idx = 0;
        if (mascot) {
          mascot.classList.add('is-gold');
          try { clearTimeout(goldTimer); } catch (e2) {}
          goldTimer = setTimeout(function () { mascot.classList.remove('is-gold'); }, 6000);
        }
      }
    });
  }

  /* ══════════════════════════════════════════
     5) MAGNITLI TUGMALAR
     ══════════════════════════════════════════ */
  function initMagnetic() {
    if (reduceMotion || !finePointer) return;
    $$('.btn').forEach(function (btn) {
      var strength = 0.32, max = 7;
      on(btn, 'pointermove', function (e) {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        var r = btn.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) * strength;
        var dy = (e.clientY - (r.top + r.height / 2)) * strength;
        dx = Math.max(-max, Math.min(max, dx));
        dy = Math.max(-max, Math.min(max, dy));
        btn.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
      });
      on(btn, 'pointerleave', function () { btn.style.transform = ''; });
    });
  }

  /* ══════════════════════════════════════════
     6) BENTO + SPOTLIGHT CHEGARA + 3D TILT (kartalar app.js tomonidan
        async render qilinadi — MutationObserver bilan kuzatamiz)
     ══════════════════════════════════════════ */
  function decorateCard(card, i) {
    if (card.dataset.vibe === '1') return;
    card.dataset.vibe = '1';
    if (i === 0) card.classList.add('project-card--feature');
    if (reduceMotion || !finePointer) return;
    on(card, 'pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width;
      var py = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      var rx = (0.5 - py) * 7;
      var ry = (px - 0.5) * 9;
      card.style.setProperty('--rx', rx.toFixed(2) + 'deg');
      card.style.setProperty('--ry', ry.toFixed(2) + 'deg');
    });
    on(card, 'pointerleave', function () {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  }

  function initBento() {
    var grid = document.getElementById('projectsGrid');
    if (!grid) return;
    grid.classList.add('projects-grid--bento');
    var idx = 0;
    var scan = function () {
      $$('.project-card', grid).forEach(function (card) {
        var order = idx; idx += 1;
        decorateCard(card, order);
      });
    };
    scan();
    try {
      var mo = new MutationObserver(function () { scan(); });
      mo.observe(grid, { childList: true });
    } catch (e) {}
  }

  /* ══════════════════════════════════════════
     7) KINETIC TIP — kursorga yaqinlik bo'yicha variable weight
     ══════════════════════════════════════════ */
  function kinetize(el) {
    if (!el || el.dataset.kinetic === '1') return [];
    var text = el.textContent;
    if (!text || !text.trim()) return [];
    el.dataset.kinetic = '1';
    el.setAttribute('aria-label', text.trim());
    el.textContent = '';
    var frag = document.createDocumentFragment();
    var letters = [];
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      var span = document.createElement('span');
      if (ch === ' ') { span.className = 'k-space'; span.innerHTML = '&nbsp;'; }
      else { span.className = 'k-letter'; span.textContent = ch; span.setAttribute('aria-hidden', 'true'); letters.push(span); }
      frag.appendChild(span);
    }
    el.appendChild(frag);
    return letters;
  }

  function initKinetic() {
    if (reduceMotion || !finePointer) return;
    var els = $$('.hero-name, .section-title');
    var letters = [];
    els.forEach(function (el) { letters = letters.concat(kinetize(el)); });
    if (!letters.length) return;

    var last = 0;
    window.addEventListener('pointermove', function (e) {
      var now = performance.now();
      if (now - last < 33) return; /* ~30fps yetadi */
      last = now;
      var mx = e.clientX, my = e.clientY;
      for (var i = 0; i < letters.length; i++) {
        var L = letters[i];
        var r = L.getBoundingClientRect();
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        var dx = cx - mx, dy = cy - my;
        var d = Math.sqrt(dx * dx + dy * dy);
        var f = Math.max(0, 1 - d / 240);
        f = f * f * (3 - 2 * f); /* smoothstep */
        var w = Math.round(300 + 420 * f);
        L.style.fontVariationSettings = "'wght' " + w;
        L.style.opacity = (0.62 + 0.38 * f).toFixed(2);
      }
    }, { passive: true });
  }

  /* ══════════════════════════════════════════
     8) BUILD SELECTION FRAME — 8 handle + o'lcham yorlig'i
        (bo'lim .is-built bo'lganda bir marta miltillaydi)
     ══════════════════════════════════════════ */
  function spawnFrame(el, index) {
    var r = el.getBoundingClientRect();
    if (r.width < 40 || r.height < 40) return;
    var frame = document.createElement('div');
    frame.className = 'build-frame';
    frame.setAttribute('aria-hidden', 'true');
    frame.style.left = r.left + 'px';
    frame.style.top = r.top + 'px';
    frame.style.width = r.width + 'px';
    frame.style.height = r.height + 'px';
    var handles = '';
    var pos = ['tl','tc','tr','mr','br','bc','bl','ml'];
    for (var i = 0; i < 8; i++) handles += '<span class="build-handle build-handle--' + pos[i] + '"></span>';
    frame.innerHTML = handles +
      '<span class="build-size">' + Math.round(r.width) + ' × ' + Math.round(r.height) + '</span>' +
      '<span class="build-tag">xoleric/layer-' + (index + 1) + '</span>';
    document.body.appendChild(frame);
    if (sound.isOn()) sound.tick(index);
    setTimeout(function () { frame.classList.add('is-out'); }, 850);
    setTimeout(function () { if (frame.parentNode) frame.parentNode.removeChild(frame); }, 1250);
  }

  function initSelectionFrames() {
    var count = 0;
    var seen = new WeakSet();
    var targets = $$('.site-header, main > .section, .site-footer');
    targets.forEach(function (el) {
      try {
        var mo = new MutationObserver(function () {
          if (el.classList.contains('is-built') && !seen.has(el)) {
            seen.add(el);
            spawnFrame(el, count);
            count += 1;
            mo.disconnect();
          }
        });
        mo.observe(el, { attributes: true, attributeFilter: ['class'] });
        if (el.classList.contains('is-built') && !seen.has(el)) {
          seen.add(el); spawnFrame(el, count); count += 1; mo.disconnect();
        }
      } catch (e) {}
    });
    /* build yakunida — chuqur chime */
    try {
      var rootMo = new MutationObserver(function () {
        if (document.documentElement.classList.contains('is-build-done')) {
          rootMo.disconnect();
          sound.chime();
        }
      });
      rootMo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      if (document.documentElement.classList.contains('is-build-done')) sound.chime();
    } catch (e) {}
  }

  /* ══════════════════════════════════════════
     10) GYROSCOPE — suv yo'nalishi egiladi (ruxsat so'ralmaydi)
     ══════════════════════════════════════════ */
  function initGyro() {
    try {
      if (typeof window.DeviceOrientationEvent === 'undefined') return;
      if (typeof window.DeviceOrientationEvent.requestPermission === 'function') return; /* iOS — faqat user gesture bilan, ataylab o'tkaziladi */
      window.addEventListener('deviceorientation', function (e) {
        var g = e.gamma;
        if (typeof g !== 'number' || !isFinite(g)) return;
        var v = Math.max(-1, Math.min(1, g / 38)) * 1.1;
        try { if (window.xolericGL && window.xolericGL.tilt) window.xolericGL.tilt(v); } catch (e2) {}
      }, { passive: true });
    } catch (e) {}
  }

  /* ══════════════════════════════════════════
     11) LIGHTBOX — zarrachalardan yig'ilish ("suv ostidan")
     ══════════════════════════════════════════ */
  function initUnderwaterPortrait() {
    document.addEventListener('xoleric:lb-open', function () {
      var figure = $('.lb-figure');
      var img = $('.lb-img');
      if (!figure || !img || reduceMotion) return;

      var canvas = document.createElement('canvas');
      canvas.className = 'lb-particles';
      canvas.setAttribute('aria-hidden', 'true');
      figure.appendChild(canvas);

      var probe = new Image();
      probe.crossOrigin = 'anonymous';
      probe.onload = function () {
        var w = figure.clientWidth, h = figure.clientHeight;
        if (!w || !h) { canvas.remove(); return; }
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';

        var SW = 110, SH = Math.max(40, Math.round(SW * (probe.height / probe.width)));
        var off = document.createElement('canvas');
        off.width = SW; off.height = SH;
        var octx = off.getContext('2d');
        octx.drawImage(probe, 0, 0, SW, SH);
        var data;
        try { data = octx.getImageData(0, 0, SW, SH).data; } catch (e) { canvas.remove(); return; }

        var pts = [];
        for (var i = 0; i < 2600; i++) {
          var x = Math.floor(Math.random() * SW), y = Math.floor(Math.random() * SH);
          var a = data[(y * SW + x) * 4 + 3];
          var r = data[(y * SW + x) * 4], g = data[(y * SW + x) * 4 + 1], b = data[(y * SW + x) * 4 + 2];
          if (a > 60 && r + g + b > 40) {
            pts.push({ tx: (x + 0.5) / SW * canvas.width, ty: (y + 0.5) / SH * canvas.height, r: (r + g + b) / 3 });
          }
        }
        if (pts.length < 30) { canvas.remove(); return; }
        if (pts.length > 900) pts = pts.filter(function (_, k) { return k % 3 === 0; });

        var particles = pts.map(function (p) {
          var side = Math.random() < 0.5 ? -1 : 1;
          return {
            sx: canvas.width / 2 + side * (0.4 + Math.random() * 0.7) * canvas.width,
            sy: canvas.height + 40 + Math.random() * canvas.height * 0.5,
            tx: p.tx, ty: p.ty,
            br: 0.5 + Math.random() * 1.1,
            tw: Math.random() * 6.28,
            shade: p.r
          };
        });

        var ctx2 = canvas.getContext('2d');
        ctx2.scale(1, 1);
        var t0 = performance.now(), DUR = 1050;

        function frame(now) {
          if (!canvas.parentNode) return; /* yopilgan */
          var t = Math.min(1, (now - t0) / DUR);
          var e = 1 - Math.pow(2, -10 * t); if (t >= 1) e = 1; /* easeOutExpo */
          ctx2.clearRect(0, 0, canvas.width, canvas.height);
          for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            var x = p.sx + (p.tx - p.sx) * e;
            var y = p.sy + (p.ty - p.sy) * e;
            var tw = 0.65 + 0.35 * Math.sin(now / 160 + p.tw);
            var gold = p.shade > 150 && t > 0.75;
            ctx2.globalAlpha = (0.35 + 0.65 * e) * tw;
            ctx2.fillStyle = gold ? '#f5c518' : '#dcecf5';
            ctx2.beginPath();
            ctx2.arc(x, y, p.br * (0.7 + 0.6 * e) * dpr, 0, 6.2832);
            ctx2.fill();
          }
          ctx2.globalAlpha = 1;
          if (t < 1) { requestAnimationFrame(frame); return; }
          /* yakun: zarrachalar so'nib, haqiqiy rasm qoladi */
          canvas.classList.add('is-fading');
          setTimeout(function () { if (canvas.parentNode) canvas.parentNode.removeChild(canvas); }, 650);
        }
        requestAnimationFrame(frame);
      };
      probe.onerror = function () { canvas.remove(); };
      probe.src = img.currentSrc || img.src;
    });
  }

  /* ══════════════════════════════════════════
     12) BIR MARTALIK ⌘K HINT (sessiyada bir marta)
     ══════════════════════════════════════════ */
  function maybeShowHint() {
    try { if (sessionStorage.getItem('xol_cmdk_hint')) return; sessionStorage.setItem('xol_cmdk_hint', '1'); } catch (e) { return; }
    setTimeout(function () {
      var toast = document.getElementById('eeToast');
      if (!toast) return;
      toast.textContent = finePointer ? 'Yorliq: ⌘/Ctrl + K — buyruqlar paneli' : "Pastda dock — tezkor bo'limlar";
      toast.classList.add('show');
      setTimeout(function () { toast.classList.remove('show'); }, 3400);
    }, 2600);
  }

  /* ══════════════════════════════════════════
     INIT
     ══════════════════════════════════════════ */
  function init() {
    injectSoundBtn();
    injectThemeBtn();
    injectDock();
    initBento();
    initMagnetic();
    initKinetic();
    initMascot();
    initSelectionFrames();
    initGyro();
    initUnderwaterPortrait();
    maybeShowHint();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
