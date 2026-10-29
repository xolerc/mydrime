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

  function open() {
    if (isOpen) return;
    if (!supportsDialog) return;
    lastFocus = document.activeElement;
    isOpen = true;
    dlg.classList.add('is-open');
    dlg.showModal();
    document.documentElement.classList.add('lb-lock');
    /* matn suzishi effekti ochiq oynada ham ishlamasin */
    try { document.body.setAttribute('data-swim', 'off'); } catch (e) {}
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    dlg.classList.remove('is-open');
    try { dlg.close(); } catch (e) {}
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
