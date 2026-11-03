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
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    dlg.classList.remove('is-open');
    try { dlg.close(); } catch (e) {}
    unmountCrosshair();
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
