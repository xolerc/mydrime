/* ═══════════════════════════════════════════════════════════
   xoleric — EXTRAS
   1) Command palette: Ctrl/Cmd+K yoki "/" — bo'limlar, sahifalar, havolalar,
      Tahrirlash rejimi. Mobilda pastki o'ng burchakda tugma.
   2) Spotlight: loyiha kartalarida kursor ergashadigan yorug' nur.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || '');
  var coarse = false;
  try { coarse = window.matchMedia('(pointer: coarse)').matches; } catch (e) {}

  var CMDS = [
    { t: 'Bosh sahifa', s: 'bo‘lim', k: 'hero home bosh yuqori', go: '#hero' },
    { t: 'Men haqimda', s: 'bo‘lim', k: 'about haqida', go: '#about' },
    { t: 'Loyihalar', s: 'bo‘lim', k: 'work ishlar projects', go: '#work' },
    { t: 'Aloqa', s: 'bo‘lim', k: 'contact bog‘lanish', go: '#contact' },
    { t: 'APK Store', s: 'sahifa', k: 'store apk ilova', href: 'store.html' },
    { t: 'CV / Rezyume', s: 'sahifa', k: 'cv resume rezyume', href: 'cv.html' },
    { t: 'Tahrirlash rejimi', s: 'E', k: 'edit tahrir dizayn editor', fn: function () { if (window.xolEditor) window.xolEditor.toggle(true); } },
    { t: 'Telegram', s: 'havola', k: 'telegram tg', ext: 'https://t.me/Wxoleric' },
    { t: 'GitHub', s: 'havola', k: 'github git', ext: 'https://github.com/xolerc' },
    { t: 'Email', s: 'havola', k: 'email pochta mail', ext: 'mailto:devxoleric@gmail.com' },
    { t: 'Instagram', s: 'havola', k: 'instagram ig', ext: 'https://www.instagram.com/ixoleric' },
    { t: 'YouTube', s: 'havola', k: 'youtube yt', ext: 'https://youtube.com/@xoleric' }
  ];

  var kp = null, input = null, list = null, items = [], idx = 0, lastFocus = null;

  function build() {
    kp = document.createElement('div');
    kp.className = 'kp';
    kp.setAttribute('data-swim', 'off');
    kp.setAttribute('role', 'dialog');
    kp.setAttribute('aria-modal', 'true');
    kp.setAttribute('aria-label', 'Buyruqlar paneli');
    kp.innerHTML =
      '<div class="kp-bg"></div><div class="kp-box">' +
      '<input class="kp-in" type="text" placeholder="Qayerga boramiz? (yozing…)" autocomplete="off" spellcheck="false" aria-label="Buyruq qidirish">' +
      '<ul class="kp-list" role="listbox"></ul>' +
      '<div class="kp-foot"><span>↑↓ tanlash</span><span>Enter — ochish</span><span>Esc — yopish</span></div></div>';
    document.body.appendChild(kp);
    input = kp.querySelector('.kp-in');
    list = kp.querySelector('.kp-list');
    kp.querySelector('.kp-bg').addEventListener('click', close);
    input.addEventListener('input', render);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); run(items[idx]); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'Tab') { e.preventDefault(); }
    });
    list.addEventListener('click', function (e) {
      var li = e.target.closest && e.target.closest('.kp-it');
      if (li) run(items[+li.getAttribute('data-i')]);
    });
  }

  function render() {
    var q = input.value.trim().toLowerCase();
    items = CMDS.filter(function (c) { return !q || (c.t + ' ' + c.k).toLowerCase().indexOf(q) > -1; });
    idx = 0;
    list.textContent = '';
    if (!items.length) {
      var e = document.createElement('li');
      e.className = 'kp-empty'; e.textContent = 'Hech narsa topilmadi';
      list.appendChild(e);
      return;
    }
    items.forEach(function (c, i) {
      var li = document.createElement('li');
      li.className = 'kp-it' + (i === 0 ? ' on' : '');
      li.setAttribute('role', 'option');
      li.setAttribute('data-i', i);
      var a = document.createElement('span'); a.textContent = c.t;
      var b = document.createElement('small'); b.textContent = c.s;
      li.appendChild(a); li.appendChild(b);
      list.appendChild(li);
    });
  }

  function move(d) {
    if (!items.length) return;
    var els = list.querySelectorAll('.kp-it');
    els[idx].classList.remove('on');
    idx = (idx + d + items.length) % items.length;
    els[idx].classList.add('on');
    els[idx].scrollIntoView({ block: 'nearest' });
  }

  function run(c) {
    if (!c) return;
    close();
    if (c.fn) { c.fn(); return; }
    if (c.ext) { window.open(c.ext, '_blank', 'noopener'); return; }
    if (c.href) { window.location.href = c.href; return; }
    if (c.go) {
      if (c.go === '#hero') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      var el = document.querySelector(c.go);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function open() {
    if (!kp) build();
    if (window.xolEditor && window.xolEditor.isOn()) return;
    lastFocus = document.activeElement;
    kp.classList.add('open');
    input.value = '';
    render();
    input.focus();
  }
  function close() {
    if (!kp || !kp.classList.contains('open')) return;
    kp.classList.remove('open');
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }
  function isOpen() { return kp && kp.classList.contains('open'); }

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      if (isOpen()) close(); else open();
      return;
    }
    var t = e.target, tag = (t && t.tagName) || '';
    if (e.key === '/' && !isOpen() && !/INPUT|TEXTAREA|SELECT/.test(tag) && !(t && t.isContentEditable)) {
      e.preventDefault(); open();
    }
  });

  /* header'dagi kichik tugma (desktop) + mobil fab */
  function addHint() {
    var ha = document.querySelector('.header-actions');
    if (ha && !ha.querySelector('.kp-hint')) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'kp-hint';
      b.setAttribute('data-swim', 'off');
      b.setAttribute('aria-label', 'Buyruqlar panelini ochish');
      b.textContent = isMac ? '⌘K' : 'Ctrl K';
      b.addEventListener('click', open);
      ha.insertBefore(b, ha.firstChild);
    }
    if (coarse && !document.querySelector('.kp-fab')) {
      var f = document.createElement('button');
      f.type = 'button';
      f.className = 'kp-fab';
      f.setAttribute('data-swim', 'off');
      f.setAttribute('aria-label', 'Menyu');
      f.textContent = 'Menyu';
      f.addEventListener('click', open);
      document.body.appendChild(f);
    }
  }
  addHint();

  /* ── spotlight ── */
  document.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    var c = e.target.closest && e.target.closest('.project-card');
    if (!c) return;
    var r = c.getBoundingClientRect();
    c.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
    c.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
  }, { passive: true });
})();
