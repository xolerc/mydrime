/* ═══════════════════════════════════════════════════════════
   xoleric — LIVE EDITOR (haqiqiy kursor bilan tahrirlash)
   E tugmasi yoki Ctrl/Cmd+K → "Tahrirlash rejimi".
   Element tanla (bosish) → sudrab ko'chir, 8 handle bilan o'lchamini
   o'zgartir, matn/fon rangi, shakl (radius), shrift o'lchami,
   ikki marta bosib matnni yoz, yashir, orqaga (Ctrl+Z), CSS nusxa.
   Fon (WebGL) ga tegmaydi. O'zgarishlar sessiya uchun (yangilansa tiklanadi);
   "CSS" tugmasi ularni styles.css ga ko'chirish uchun nusxalaydi.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var root = document.documentElement;
  var ED_SEL = '.btn,.project-card,.blurb,.contact-box,.hero-art,.section-head,.card-body,.card-art,' +
    'h1,h2,h3,p,.eyebrow,.logo,.site-nav a,.site-nav,.hero-content,.footer-social,.social-icon,section.section';
  var SW_TXT = ['#eceff4', '#ffd166', '#ff6bd6', '#7df9ff', '#b794ff', '#6bffb0', '#05070c'];
  var SW_BG = ['transparent', '#111921', '#2a1233', '#0f3d3e', '#3d2f0f', '#eceff4'];
  var DIRS = { nw: [0, 0], n: [50, 0], ne: [100, 0], e: [100, 50], se: [100, 100], s: [50, 100], sw: [0, 100], w: [0, 50] };

  var on = false, sel = null, editing = null, ui = null, frame = null, hovBox = null, bar = null;
  var raf = 0, hist = [], touched = [], toastEl = null, toastT = 0, hoverEl = null;

  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'ed-toast';
      toastEl.setAttribute('data-swim', 'off');
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 2200);
  }

  /* ── tarix / tiklash ── */
  function track(el) {
    if (el.__edO === undefined) { el.__edO = el.getAttribute('style'); touched.push(el); }
  }
  function snap(el) {
    track(el);
    hist.push({ el: el, s: el.getAttribute('style') });
    if (hist.length > 80) hist.shift();
  }
  function setS(el, prop, val) { el.style.setProperty(prop, val, 'important'); }
  function undo() {
    var h = hist.pop();
    if (!h) { toast('Orqaga qaytariladigan narsa yo‘q'); return; }
    if (h.s === null) h.el.removeAttribute('style'); else h.el.setAttribute('style', h.s);
  }
  function resetAll() {
    touched.forEach(function (el) {
      if (el.__edO === null) el.removeAttribute('style'); else el.setAttribute('style', el.__edO);
      delete el.__edO;
    });
    touched = []; hist = [];
    toast('Hammasi asl holatiga qaytdi');
  }

  /* ── UI ── */
  function sw(arr, k) {
    return arr.map(function (c) {
      return '<i class="sw" data-k="' + k + '" data-v="' + c + '" style="--s:' + c + '"></i>';
    }).join('');
  }
  function buildUI() {
    ui = document.createElement('div');
    ui.className = 'ed-ui';
    ui.setAttribute('data-swim', 'off');
    var h = '';
    for (var d in DIRS) {
      h += '<i class="ed-h" data-d="' + d + '" style="left:' + DIRS[d][0] + '%;top:' + DIRS[d][1] + '%"></i>';
    }
    ui.innerHTML =
      '<div class="ed-hov"></div><div class="ed-frame">' + h + '</div>' +
      '<div class="ed-bar" role="toolbar" aria-label="Tahrirlash paneli">' +
        '<b class="ed-t">Tahrir</b>' +
        '<span class="ed-g">Matn ' + sw(SW_TXT, 'color') + '</span>' +
        '<span class="ed-g">Fon ' + sw(SW_BG, 'background') + '</span>' +
        '<label class="ed-g">Shakl <input type="range" min="0" max="60" value="12" data-k="radius"></label>' +
        '<span class="ed-g"><button data-a="fs-">A−</button><button data-a="fs+">A+</button></span>' +
        '<button data-a="text">Matn yozish</button><button data-a="hide">Yashirish</button>' +
        '<button data-a="undo">Orqaga</button><button data-a="css">CSS</button>' +
        '<button data-a="reset">Tiklash</button><button data-a="exit" class="ed-x">Chiqish</button>' +
      '</div>';
    document.body.appendChild(ui);
    frame = ui.querySelector('.ed-frame');
    hovBox = ui.querySelector('.ed-hov');
    bar = ui.querySelector('.ed-bar');
    ui.addEventListener('pointerdown', onUIDown);
    bar.addEventListener('click', onBar);
    bar.addEventListener('input', onRange);
  }

  function onRange(e) {
    var t = e.target;
    if (!sel || t.getAttribute('data-k') !== 'radius') return;
    if (!t.__snapped) { snap(sel); t.__snapped = true; }
    setS(sel, 'border-radius', t.value + 'px');
    setS(sel, 'overflow', 'hidden');
  }
  bindChange();
  function bindChange() { /* range snap reset */
    document.addEventListener('change', function (e) {
      if (e.target && e.target.__snapped) e.target.__snapped = false;
    });
  }

  function onBar(e) {
    var t = e.target;
    var k = t.getAttribute && t.getAttribute('data-k');
    if (k === 'color' || k === 'background') {
      if (!sel) return;
      snap(sel);
      setS(sel, k === 'color' ? 'color' : 'background', t.getAttribute('data-v'));
      if (k === 'color') setS(sel, '-webkit-text-fill-color', t.getAttribute('data-v'));
      return;
    }
    var a = t.getAttribute && t.getAttribute('data-a');
    if (!a) return;
    if (a === 'exit') { toggle(false); return; }
    if (a === 'undo') { undo(); return; }
    if (a === 'reset') { resetAll(); return; }
    if (a === 'css') { copyCSS(); return; }
    if (!sel) { toast('Avval elementni tanlang'); return; }
    if (a === 'hide') { snap(sel); setS(sel, 'display', 'none'); select(null); return; }
    if (a === 'text') { startText(sel); return; }
    if (a === 'fs+' || a === 'fs-') {
      snap(sel);
      var fs = parseFloat(getComputedStyle(sel).fontSize) || 16;
      setS(sel, 'font-size', Math.max(8, fs + (a === 'fs+' ? 2 : -2)) + 'px');
    }
  }

  /* ── tanlash ── */
  function pick(t) { return t && t.closest ? t.closest(ED_SEL) : null; }
  function select(el) {
    sel = el;
    frame.style.display = el ? 'block' : 'none';
  }

  function trOf(el) {
    var m = (el.style.translate || '').match(/(-?[\d.]+)px\s+(-?[\d.]+)px/);
    return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : { x: 0, y: 0 };
  }

  function drag(e, dir) {
    var el = sel;
    if (!el) return;
    var r = el.getBoundingClientRect(), tr = trOf(el);
    var x0 = e.clientX, y0 = e.clientY, moved = false;
    function mv(ev) {
      var dx = ev.clientX - x0, dy = ev.clientY - y0;
      if (!moved) {
        if (Math.abs(dx) + Math.abs(dy) < 3) return;
        moved = true; snap(el);
      }
      if (!dir) {
        setS(el, 'translate', (tr.x + dx) + 'px ' + (tr.y + dy) + 'px');
        return;
      }
      var nw = r.width, nh = r.height, tx = tr.x, ty = tr.y;
      if (dir.indexOf('e') > -1) nw += dx;
      if (dir.indexOf('w') > -1) { nw -= dx; tx += dx; }
      if (dir.indexOf('s') > -1) nh += dy;
      if (dir.indexOf('n') > -1) { nh -= dy; ty += dy; }
      setS(el, 'box-sizing', 'border-box');
      setS(el, 'max-width', 'none');
      setS(el, 'width', Math.max(24, nw) + 'px');
      setS(el, 'height', Math.max(16, nh) + 'px');
      setS(el, 'translate', tx + 'px ' + ty + 'px');
    }
    function up() {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    }
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  function onUIDown(e) {
    var h = e.target.closest && e.target.closest('.ed-h');
    if (h) { e.preventDefault(); e.stopPropagation(); drag(e, h.getAttribute('data-d')); }
  }

  /* ── matn tahriri ── */
  function unswim(el) {
    var ws = el.querySelectorAll('.sw-w');
    for (var i = 0; i < ws.length; i++) ws[i].replaceWith(document.createTextNode(ws[i].textContent));
    el.normalize();
  }
  function startText(el) {
    if (editing) stopText();
    snap(el);
    unswim(el);
    el.setAttribute('data-swim', 'off');
    el.contentEditable = 'true';
    editing = el;
    frame.classList.add('typing');
    el.focus();
    try {
      var rg = document.createRange(); rg.selectNodeContents(el); rg.collapse(false);
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(rg);
    } catch (e) {}
  }
  function stopText() {
    if (!editing) return;
    editing.contentEditable = 'false';
    editing.removeAttribute('contenteditable');
    editing = null;
    frame.classList.remove('typing');
  }

  /* ── CSS eksport ── */
  function path(el) {
    var p = [];
    while (el && el.nodeType === 1 && el !== document.body) {
      if (el.id) { p.unshift('#' + el.id); break; }
      var i = 1, s = el;
      while ((s = s.previousElementSibling)) i++;
      p.unshift(el.tagName.toLowerCase() + ':nth-child(' + i + ')');
      el = el.parentElement;
    }
    return p.join(' > ');
  }
  function copyCSS() {
    var out = touched.map(function (el) {
      var st = (el.getAttribute('style') || '').split(';').map(function (x) { return x.trim(); })
        .filter(Boolean).join(';\n  ');
      return st ? path(el) + ' {\n  ' + st + ';\n}' : '';
    }).filter(Boolean).join('\n\n');
    if (!out) { toast('Hali o‘zgarish yo‘q'); return; }
    try {
      navigator.clipboard.writeText(out).then(function () { toast('CSS nusxalandi · ' + touched.length + ' ta element'); },
        function () { toast('Nusxalab bo‘lmadi'); });
    } catch (e) { toast('Nusxalab bo‘lmadi'); }
  }

  /* ── hodisalar ── */
  function inUI(t) { return ui && ui.contains(t); }

  function onDown(e) {
    if (!on || inUI(e.target)) return;
    if (editing && editing.contains(e.target)) return;
    if (editing) stopText();
    var el = pick(e.target);
    e.preventDefault(); e.stopPropagation();
    if (!el) { select(null); return; }
    select(el);
    drag(e, null);
  }
  function onClick(e) {
    if (!on || inUI(e.target)) return;
    if (editing && editing.contains(e.target)) return;
    e.preventDefault(); e.stopPropagation();
  }
  function onDbl(e) {
    if (!on || inUI(e.target)) return;
    var el = pick(e.target);
    if (el && /^(H[1-6]|P|A|BUTTON|SPAN|DIV)$/.test(el.tagName)) { e.preventDefault(); select(el); startText(el); }
  }
  function onMove(e) {
    if (!on || inUI(e.target)) { hoverEl = null; return; }
    hoverEl = pick(e.target);
  }
  function typing(e) {
    var t = e.target, tag = (t && t.tagName) || '';
    return /INPUT|TEXTAREA|SELECT/.test(tag) || (t && t.isContentEditable);
  }
  function onKey(e) {
    if (e.key === 'Escape' && on) {
      if (editing) stopText(); else if (sel) select(null); else toggle(false);
      return;
    }
    if (typing(e)) return;
    if (on && (e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); undo(); return; }
    if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'e' || e.key === 'E')) toggle();
  }

  function place(box, el) {
    if (!el || !el.isConnected) { box.style.display = 'none'; return; }
    var r = el.getBoundingClientRect();
    box.style.display = 'block';
    box.style.transform = 'translate(' + r.left.toFixed(1) + 'px,' + r.top.toFixed(1) + 'px)';
    box.style.width = r.width.toFixed(1) + 'px';
    box.style.height = r.height.toFixed(1) + 'px';
  }
  function loop() {
    if (!on) { raf = 0; return; }
    place(frame, sel);
    if (hoverEl && hoverEl !== sel) place(hovBox, hoverEl); else hovBox.style.display = 'none';
    raf = requestAnimationFrame(loop);
  }

  function toggle(force) {
    var want = force === undefined ? !on : !!force;
    if (want === on) return on;
    if (want) {
      if (root.classList.contains('is-building')) { toast('Avval sahifa qurilib bo‘lsin ↓'); return false; }
      if (!ui) buildUI();
      on = true;
      root.classList.add('ed-on');
      ui.style.display = 'block';
      document.addEventListener('pointerdown', onDown, true);
      document.addEventListener('click', onClick, true);
      document.addEventListener('dblclick', onDbl, true);
      document.addEventListener('pointermove', onMove, { capture: true, passive: true });
      select(null);
      raf = requestAnimationFrame(loop);
      toast('Tahrirlash rejimi · E yoki Esc — chiqish');
    } else {
      stopText();
      on = false;
      root.classList.remove('ed-on');
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('dblclick', onDbl, true);
      document.removeEventListener('pointermove', onMove, true);
      sel = null; hoverEl = null;
      if (ui) ui.style.display = 'none';
    }
    return on;
  }

  document.addEventListener('keydown', onKey);
  window.xolEditor = { toggle: toggle, isOn: function () { return on; } };
})();
