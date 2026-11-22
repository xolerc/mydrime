/* ═══════════════════════════════════════════════════════════
   xoleric — TEXT SWIM (XOLERIC ∞ SO'Z demosidan ko'chirma)
   Harflar kursor atrofida "suzadi": yaqin harflar itariladi,
   yaylovdan chiqqach prujina bilan joyiga qaytadi.
   MUHIM: faqat DOM matnlar (inline-block span) — fon canvasiga
   (WebGL suv) hech qanday ta'sir yo'q. Layout siljimaydi:
   faqat transform ishlatiladi.
   SAFETY: prefers-reduced-motion, char cap, rAF faqat aktiv
   harflar bo'lganda, MutationObserver bilan dinamik kartalar.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  if (reduce) return;

  var coarse = false;
  try { coarse = window.matchMedia('(pointer: coarse)').matches; } catch (e) {}

  /* ── sozlamalar ── */
  var RADIUS = coarse ? 88 : 132;      /* kursor ta'sir radiusi (px) */
  var AMP_MIN = 5;                     /* minimal siljish (px) */
  var AMP_MAX = coarse ? 11 : 18;      /* maksimal siljish (px) */
  var FOLLOW = 0.16;                   /* nishonga ergashish prujinasi */
  var DAMP = 0.82;                     /* ishqalanish */
  var SWIRL = 0.22;                    /* girdob (tangensial) komponenti */
  var CELL = 150;                      /* spatial grid katagi */
  var MAXCHARS = 16000;                /* xotira himoyasi */

  var SKIP_TAGS = {
    SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, INPUT: 1,
    SELECT: 1, OPTION: 1, CODE: 1, PRE: 1, SVG: 1, CANVAS: 1, IFRAME: 1
  };
  var SKIP_SEL = '[data-swim="off"], .sw-w, .sw-c, #loader, .grain-top, .skip-link';

  var chars = [];
  var grid = new Map();
  var active = new Set();
  var total = 0;
  var raf = 0;
  var px = -1e5, py = -1e5;            /* pointer (viewport) */
  var hasPointer = false;
  var measuring = false;
  var splitTimer = 0, measureTimer = 0;

  /* ── DOM bo'lish ── */
  function skipNode(node) {
    var p = node.parentNode;
    if (!p || p.nodeType !== 1) return true;
    if (SKIP_TAGS[p.nodeName]) return true;
    if (p.closest && p.closest(SKIP_SEL)) return true;
    if (!node.nodeValue || !node.nodeValue.trim()) return true;
    return false;
  }

  function splitNode(node) {
    if (total > MAXCHARS) return;
    var text = node.nodeValue;
    if (!text || !text.trim()) return;
    var parent = node.parentNode;
    if (!parent) return;

    var frag = document.createDocumentFragment();
    var parts = text.split(/(\s+)/);
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        frag.appendChild(document.createTextNode(part));
        continue;
      }
      var word = document.createElement('span');
      word.className = 'sw-w';
      var glyphs = Array.from ? Array.from(part) : part.split('');
      for (var g = 0; g < glyphs.length; g++) {
        var ch = document.createElement('span');
        ch.className = 'sw-c';
        ch.textContent = glyphs[g];
        word.appendChild(ch);
        chars.push({ el: ch, ox: 0, oy: 0, dx: 0, dy: 0, vx: 0, vy: 0, dead: false });
        total++;
      }
      frag.appendChild(word);
    }
    parent.replaceChild(frag, node);
  }

  function splitAll(root) {
    if (!root || total > MAXCHARS) return;
    var walker;
    try {
      walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          return skipNode(n) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
        }
      });
    } catch (e) { return; }
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (var i = 0; i < nodes.length; i++) splitNode(nodes[i]);
  }

  /* ── o'lchash (doc koordinatalari) ── */
  function key(cx, cy) {
    return (cx / CELL | 0) + ':' + (cy / CELL | 0);
  }

  function measure() {
    if (measuring) return;
    measuring = true;
    /* aktiv transformlarni tozalab, toza joylashuvni o'lchaymiz */
    active.forEach(function (c) {
      c.dx = c.dy = c.vx = c.vy = 0;
      c.el.style.transform = '';
    });
    active.clear();
    grid.clear();
    var sx = window.scrollX || 0;
    var sy = window.scrollY || 0;
    var ampCache = new Map();
    for (var i = 0; i < chars.length; i++) {
      var c = chars[i];
      var r = c.el.getBoundingClientRect();
      if (!r.width && !r.height) { c.dead = true; continue; }
      c.dead = false;
      var par = c.el.parentNode;
      var amp = ampCache.get(par);
      if (amp === undefined) {
        var fs = 16;
        try {
          fs = parseFloat(window.getComputedStyle(par).fontSize) || 16;
        } catch (e) {}
        amp = Math.max(AMP_MIN, Math.min(AMP_MAX, fs * 0.6));
        ampCache.set(par, amp);
      }
      c.amp = amp;
      c.ox = r.left + r.width * 0.5 + sx;
      c.oy = r.top + r.height * 0.5 + sy;
      var k = key(c.ox, c.oy);
      var bucket = grid.get(k);
      if (!bucket) { bucket = []; grid.set(k, bucket); }
      bucket.push(c);
    }
    measuring = false;
  }

  function scheduleMeasure(delay) {
    if (measureTimer) clearTimeout(measureTimer);
    measureTimer = setTimeout(function () {
      measureTimer = 0;
      requestAnimationFrame(measure);
    }, delay || 120);
  }

  /* ── fizika ── */
  function kick() {
    if (!raf && !document.hidden) raf = requestAnimationFrame(tick);
  }

  function splash(clientX, clientY) {
    var sx = window.scrollX || 0, sy = window.scrollY || 0;
    var cx = clientX + sx, cy = clientY + sy;
    var gx = Math.floor(cx / CELL), gy = Math.floor(cy / CELL);
    for (var j = -1; j <= 1; j++) {
      for (var i = -1; i <= 1; i++) {
        var b = grid.get((gx + i) + ':' + (gy + j));
        if (!b) continue;
        for (var n = 0; n < b.length; n++) {
          var c = b[n];
          var kx = c.ox + c.dx - cx, ky = c.oy + c.dy - cy;
          var d = Math.sqrt(kx * kx + ky * ky) + 0.001;
          if (d > RADIUS) continue;
          var w = 1 - d / RADIUS;
          c.vx += (kx / d) * w * (coarse ? 2.2 : 4.5);
          c.vy += (ky / d) * w * (coarse ? 2.2 : 4.5);
          active.add(c);
        }
      }
    }
    kick();
  }

  function tick() {
    raf = 0;
    if (document.hidden) return;

    var sx = window.scrollX || 0, sy = window.scrollY || 0;
    var cx = px + sx, cy = py + sy;

    if (hasPointer && !measuring) {
      var gx = Math.floor(cx / CELL), gy = Math.floor(cy / CELL);
      for (var j = -1; j <= 1; j++) {
        for (var i = -1; i <= 1; i++) {
          var b = grid.get((gx + i) + ':' + (gy + j));
          if (!b) continue;
          for (var n = 0; n < b.length; n++) {
            var cc = b[n];
            var ddx = cc.ox + cc.dx - cx, ddy = cc.oy + cc.dy - cy;
            if (ddx * ddx + ddy * ddy < RADIUS * RADIUS) active.add(cc);
          }
        }
      }
    }

    var R2 = RADIUS * RADIUS;
    active.forEach(function (c) {
      if (c.dead) { active.delete(c); return; }
      /* nishon siljishi — harf o'lchamiga moslab cheklangan (amp) */
      var tx = 0, ty = 0;
      if (hasPointer) {
        var kx = c.ox + c.dx - cx, ky = c.oy + c.dy - cy;
        var d2 = kx * kx + ky * ky;
        if (d2 < R2) {
          var d = Math.sqrt(d2) + 0.001;
          var w = 1 - d / RADIUS;
          var amp = c.amp || 16;
          var s = w * w * amp;
          tx = (kx / d) * s - (ky / d) * s * SWIRL;
          ty = (ky / d) * s + (kx / d) * s * SWIRL;
        }
      }
      c.vx = (c.vx + (tx - c.dx) * FOLLOW) * DAMP;
      c.vy = (c.vy + (ty - c.dy) * FOLLOW) * DAMP;
      c.dx += c.vx;
      c.dy += c.vy;

      var still = Math.abs(c.dx) < 0.05 && Math.abs(c.dy) < 0.05 &&
                  Math.abs(c.vx) < 0.05 && Math.abs(c.vy) < 0.05 &&
                  tx === 0 && ty === 0;
      if (still) {
        c.dx = c.dy = c.vx = c.vy = 0;
        c.el.style.transform = '';
        active.delete(c);
        return;
      }
      var rot = c.dx * 0.08;
      if (rot > 3) rot = 3; else if (rot < -3) rot = -3;
      c.el.style.transform =
        'translate(' + c.dx.toFixed(2) + 'px,' + c.dy.toFixed(2) + 'px) rotate(' + rot.toFixed(2) + 'deg)';
    });

    if (active.size) kick();
  }

  /* ── pointer ── */
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;      /* barmoq bilan surash — matnni buzmaymiz */
    px = e.clientX; py = e.clientY;
    hasPointer = true;
    kick();
  }, { passive: true });

  window.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch') return;
    px = e.clientX; py = e.clientY;
    hasPointer = true;
    splash(px, py);
  }, { passive: true });

  window.addEventListener('pointerleave', function () { hasPointer = false; }, { passive: true });
  window.addEventListener('blur', function () { hasPointer = false; });

  window.addEventListener('scroll', function () {
    if (active.size) kick();      /* scroll paytida faqat aktivlar qaytadi */
  }, { passive: true });

  var rzT = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rzT);
    rzT = setTimeout(function () { measure(); }, 220);
  }, { passive: true });

  document.addEventListener('transitionend', function () { scheduleMeasure(160); }, true);

  /* ── dinamik kontent (GitHub kartalari) ── */
  var mo = null;
  function watch() {
    if (!mo || !document.body) return;
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  function resplit() {
    if (mo) mo.disconnect();
    splitAll(document.body);
    measure();
    watch();
  }
  function scheduleSplit() {
    if (splitTimer) clearTimeout(splitTimer);
    splitTimer = setTimeout(function () {
      splitTimer = 0;
      resplit();
    }, 320);
  }

  /* ── start ── */
  function boot() {
    splitAll(document.body);
    measure();
    if (window.MutationObserver) {
      mo = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var m = muts[i];
          if (m.type === 'childList' && (m.addedNodes.length || m.removedNodes.length)) { scheduleSplit(); return; }
          if (m.type === 'characterData') { scheduleSplit(); return; }
        }
      });
      watch();
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { scheduleMeasure(80); });
    }
    window.addEventListener('load', function () { scheduleMeasure(200); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
