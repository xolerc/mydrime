/* ═══════════════════════════════════════════════════════════
   xoleric — PORTRAIT LIGHTBOX (QR uslubi)
   Portretga 1 marta bosish (yoki Enter/Space) → rasm ekran
   markazida, atrofi blur. Rasm tashqarisidagi blur qismga
   bosilsa yoki Esc bosilsa — orqaga qaytadi.
   Fon (WebGL suv) va matn suzishi effektiga ta'sir qilmaydi.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var dlg = document.getElementById('portraitLB');
  var trigger = document.getElementById('heroArt');
  if (!dlg || !trigger) return;

  var supportsDialog = typeof dlg.showModal === 'function';
  var isOpen = false;
  var lastFocus = null;

  /* Kursor effektlari (crosshair nishon + spotlight nuri) top-layer dialog
     ostida qolib ketadi. Ochiq payt dialog ichiga ko'chiramiz — effektlar
     kattalashtirilgan rasm ustida ham davom etadi. */
  var fxEls = [
    document.getElementById('crosshair'),
    document.getElementById('spotlight')
  ].filter(Boolean);
  var fxHomes = [];

  function mountCrosshair() {
    fxHomes = [];
    for (var i = 0; i < fxEls.length; i++) {
      var el = fxEls[i];
      if (!el || el.parentNode === dlg) continue;
      fxHomes.push({ node: el, parent: el.parentNode, next: el.nextSibling });
      dlg.appendChild(el);
    }
  }

  function unmountCrosshair() {
    for (var i = fxHomes.length - 1; i >= 0; i--) {
      var h = fxHomes[i];
      if (h.node.parentNode !== dlg) continue;
      if (h.next && h.next.parentNode === h.parent) {
        h.parent.insertBefore(h.node, h.next);
      } else {
        h.parent.appendChild(h.node);
      }
    }
    fxHomes = [];
  }

  /* ══════════════════════════════════════════
     REVEAL — hero'dagidek "flashlight": ortidagi rasim
     (bg.webp) kursor ostida ochiladi, atrofi to'q qoladi.
     Faqat ochiq lightbox ichida ishlaydi; yopilganda to'xtaydi.
     ══════════════════════════════════════════ */
  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var coarse = false;
  try { coarse = window.matchMedia('(pointer: coarse)').matches; } catch (e) {}

  var figure = dlg.querySelector('.lb-figure');
  var revealEl = dlg.querySelector('.lb-reveal');
  var rawX = null, rawY = null, curX = 0, curY = 0, radius = 0, revealRaf = 0, rawSnapped = false;
  var REVEAL_R = coarse ? 130 : 185, MARGIN = 40;

  function clampN(v, a, b) { return Math.max(a, Math.min(b, v)); }

  var ZERO_MASK = 'radial-gradient(circle 0px at 50% 50%, #000 0%, transparent 100%)';

  function revealFrame() {
    if (!isOpen) { revealRaf = 0; return; }
    /* har frame'da yangi rect — lbIn animatsiyasi davomida ham to'g'ri */
    if (!figure) { revealRaf = 0; return; }
    var figRect = figure.getBoundingClientRect();
    if (rawX == null) {
      radius = 0;
      if (revealEl && revealEl.style.webkitMaskImage !== ZERO_MASK) {
        revealEl.style.webkitMaskImage = ZERO_MASK;
        revealEl.style.maskImage = ZERO_MASK;
      }
      revealRaf = requestAnimationFrame(revealFrame);
      return;
    }
    if (curX === null || rawSnapped !== true) { curX = rawX; curY = rawY; rawSnapped = true; }
    curX += (rawX - curX) * 0.14;
    curY += (rawY - curY) * 0.14;
    var target = 0;
    var inX = rawX >= figRect.left - MARGIN && rawX <= figRect.left + figRect.width + MARGIN;
    var inY = rawY >= figRect.top - MARGIN && rawY <= figRect.top + figRect.height + MARGIN;
    if (inX && inY) target = REVEAL_R;
    radius += (target - radius) * 0.11;
    if (Math.abs(radius - target) < 0.6) radius = target;
    if (revealEl) {
      if (radius > 0.5) {
        var px = clampN(curX - figRect.left, 0, figRect.width).toFixed(1);
        var py = clampN(curY - figRect.top, 0, figRect.height).toFixed(1);
        var m = 'radial-gradient(circle ' + radius.toFixed(1) + 'px at ' + px + 'px ' + py + 'px, #000 0%, #000 40%, transparent 100%)';
        revealEl.style.webkitMaskImage = m;
        revealEl.style.maskImage = m;
      } else {
        revealEl.style.webkitMaskImage = ZERO_MASK;
        revealEl.style.maskImage = ZERO_MASK;
      }
    }
    revealRaf = requestAnimationFrame(revealFrame);
  }

  function onRevealPointer(e) {
    rawX = e.clientX; rawY = e.clientY;
  }

  function startReveal() {
    if (reduce || !revealEl || !figure) return;
    rawX = null; rawY = null; radius = 0; rawSnapped = false; curX = null; curY = null;
    window.addEventListener('pointermove', onRevealPointer, { passive: true });
    if (!revealRaf) revealRaf = requestAnimationFrame(revealFrame);
  }

  function stopReveal() {
    window.removeEventListener('pointermove', onRevealPointer);
    if (revealRaf) { cancelAnimationFrame(revealRaf); revealRaf = 0; }
    if (revealEl) {
      revealEl.style.webkitMaskImage = ZERO_MASK;
      revealEl.style.maskImage = ZERO_MASK;
    }
    radius = 0; rawX = null; rawY = null; rawSnapped = false;
  }

  function open() {
    if (isOpen) return;
    if (!supportsDialog) return;
    lastFocus = document.activeElement;
    isOpen = true;
    dlg.classList.add('is-open');
    dlg.showModal();
    mountCrosshair();
    document.documentElement.classList.add('lb-lock');
    /* matn suzishi effekti ochiq oynada ham ishlamasin */
    try { document.body.setAttribute('data-swim', 'off'); } catch (e) {}
    /* rasm to'liq chizilgandan keyin o'lchaymiz */
    startReveal();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    dlg.classList.remove('is-open');
    try { dlg.close(); } catch (e) {}
    unmountCrosshair();
    stopReveal();
    document.documentElement.classList.remove('lb-lock');
    try { document.body.removeAttribute('data-swim'); } catch (e) {}
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  /* 1 klik / tap → ochish */
  trigger.addEventListener('click', function (e) {
    e.preventDefault();
    open();
  });

  /* klaviatura: Enter / Space */
  trigger.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      open();
    }
  });

  /* tashqi (blur) qismga bosish → yopish.
     dialog to'liq ekran, ichidagi figure bosilsa yopilmaydi. */
  dlg.addEventListener('click', function (e) {
    if (e.target === dlg) close();
  });

  /* Esc — brauzer o'zi yopadi, holatni sinxronlaymiz */
  dlg.addEventListener('close', function () {
    if (!isOpen) return;
    isOpen = false;
    dlg.classList.remove('is-open');
    unmountCrosshair();
    stopReveal();
    document.documentElement.classList.remove('lb-lock');
    try { document.body.removeAttribute('data-swim'); } catch (e) {}
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  });

  /* iOS: dialog backdrop bosilganda click eventi ishonchsiz —
     pointerdown bilan ham tekshiramiz */
  dlg.addEventListener('pointerdown', function (e) {
    if (e.target === dlg) close();
  }, { passive: true });
})();
