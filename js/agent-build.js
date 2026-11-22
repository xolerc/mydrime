/*! AgentBuild 1.0 — XOLERIC ∞
 *  Sahifa birinchi yuklanganda agent-kursorlar elementlarni "o'zlari yaratgandek" quradi.
 *  Saytning O'Z DOM'i, O'Z matni, O'Z ranglari ishlatiladi — hech narsa qo'shilmaydi, hammasi oxirida qayta tiklanadi.
 *  Foydalanish: AgentBuild.init({ targets:'[data-ab]' })   (saytning loader'i tugagach chaqiring)
 */
(function () {
'use strict';
const eio = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pick = a => a[Math.random() * a.length | 0];
const tween = (ms, fn) => new Promise(res => { const t0 = performance.now();
  (function f(n){ const t = Math.min((n - t0) / ms, 1); fn(eio(t)); t < 1 ? requestAnimationFrame(f) : res(); })(t0); });
const DEF = { targets: '[data-ab]', slow: .5, trigger: .9, stagger: 450, palette: null, radii: null, resetScroll: true,
  labels: { think: 'tahlil', shape: 'shakl', color: 'rang', text: 'matn', write: 'yozyapti', ready: 'tayyor' } };
const opaque = c => { const m = (c || '').match(/[\d.]+/g); return !!m && (m.length < 4 || +m[3] > .05); };
const place = c => c.style.transform = `translate(${c.x}px,${c.y}px)`;
const label = (c, t) => c.querySelector('i').textContent = t;
const press = async c => { c.classList.add('ab-press'); await sleep(150); c.classList.remove('ab-press'); };

function cursor(t, hue) {
  const c = document.createElement('div'), col = `hsl(${hue} 90% 62%)`; c.className = 'ab-cur';
  c.innerHTML = `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M2 1l13 7-6 1.5L7 16z" fill="${col}" stroke="#000" stroke-width="1.2"/></svg><i style="background:${col}">${t}</i>`;
  c.x = Math.random() * innerWidth; c.y = Math.random() * innerHeight; place(c); document.body.appendChild(c); return c;
}
// inson qo'lidek: egri yo'l + sekin-tez-sekin + titroq
function fly(c, get, ms) {
  const x0 = c.x, y0 = c.y, s = (Math.random() < .5 ? -1 : 1) * (.12 + Math.random() * .2), ph = Math.random() * 6;
  return tween(ms, e => { const [x, y] = get(), dx = x - x0, dy = y - y0, bow = Math.sin(Math.PI * e) * s, j = Math.sin(e * 40 + ph) * 1.6 * (1 - e);
    c.x = x0 + dx * e - dy * bow + j; c.y = y0 + dy * e + dx * bow + j * .6; place(c); });
}
async function idle(c, R, on, hop) {
  while (on()) { const u = Math.random(), v = Math.random();
    await fly(c, () => { const r = R(); return [r.left + r.width * u, r.top + r.height * v]; }, 350 + Math.random() * 450);
    hop && hop(); await sleep(80 + Math.random() * 250); }
}

function init(opts) {
  const O = Object.assign({}, DEF, opts, { labels: Object.assign({}, DEF.labels, opts && opts.labels) });
  const root = document.documentElement, els = [...document.querySelectorAll(O.targets)];
  const reveal = e => { e.classList.add('ab-done'); e.classList.remove('ab-reveal'); };
  if (!els.length || matchMedia('(prefers-reduced-motion: reduce)').matches) { els.forEach(reveal); root.classList.remove('ab-on'); return; }
  if (O.resetScroll) { history.scrollRestoration = 'manual'; scrollTo(0, 0); }

  // ranglar va radiuslar — saytning o'z elementlaridan olinadi
  const pal = new Set(), rad = new Set(['0px']);
  els.forEach(e => { const c = getComputedStyle(e); [c.backgroundColor, c.color].forEach(x => opaque(x) && pal.add(x)); rad.add(c.borderTopLeftRadius); });
  const PAL = O.palette || [...pal]; if (!PAL.length) PAL.push('#7cf7ff', '#ff5d8f', '#ffd166');
  const RAD = O.radii || [...rad, '12px', '999px'];

  let started = false, done = 0, ty = 0;
  const finishOne = e => { reveal(e); if (++done === els.length) { stopSlow(); document.dispatchEvent(new CustomEvent('agentbuild:done')); } };

  function prepText(el) {                       // matn tugunlarini layout buzmasdan vaqtincha o'raydi
    const items = [], tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: n =>
      !n.nodeValue.trim() || /^(SCRIPT|STYLE|TEXTAREA|NOSCRIPT)$/.test(n.parentNode.nodeName) || n.parentNode.closest(O.targets) !== el ? 2 : 1 });
    const nodes = []; while (tw.nextNode()) nodes.push(tw.currentNode);
    nodes.forEach(n => { const s = document.createElement('span'), w = document.createElement('span'), g = document.createElement('span');
      s.className = 'ab-t'; w.className = 'ab-w'; g.className = 'ab-g'; g.textContent = n.nodeValue; s.append(w, g); n.replaceWith(s); items.push({ n, s, w, g, t: n.nodeValue }); });
    return items;
  }

  async function build(el) {
    const R = () => el.getBoundingClientRect(), cs = getComputedStyle(el), W = el.clientWidth, H = el.clientHeight;
    if (W < 2 || H < 2) return finishOne(el);
    const realBg = cs.backgroundColor, realRad = cs.borderRadius, prevPos = el.style.position;
    if (cs.position === 'static') el.style.position = 'relative';
    const sk = document.createElement('div'); sk.className = 'ab-skin'; el.appendChild(sk);
    const ghost = document.createElement('div'); ghost.className = 'ab-ghost'; document.body.appendChild(ghost);
    let live = true; (function k() { if (!live) return; const r = R(); Object.assign(ghost.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' }); requestAnimationFrame(k); })();
    const L = O.labels, hue = Math.random() * 360 | 0, A = cursor(L.think, hue), B = cursor(L.think, (hue + 120) % 360), C = cursor(L.think, (hue + 240) % 360);
    const col = c => sk.style.backgroundColor = c;
    try {
      await Promise.all([A, B, C].map(c => { const u = Math.random(), v = Math.random(); return fly(c, () => { const r = R(); return [r.left + r.width * u, r.top + r.height * v]; }, 700 + Math.random() * 400); }));
      let on = true; const t1 = [A, B, C].map(c => idle(c, R, () => on)); await sleep(900); on = false; await Promise.all(t1);
      const ox = Math.random() < .5 ? 0 : 1, oy = Math.random() < .5 ? 0 : 1;
      sk.style[ox ? 'right' : 'left'] = 0; sk.style[oy ? 'bottom' : 'top'] = 0; col(pick(PAL));
      label(A, L.shape); label(B, L.color); label(C, L.text);
      await fly(A, () => { const r = R(); return [ox ? r.right : r.left, oy ? r.bottom : r.top]; }, 450); await press(A);
      on = true;
      const tb = idle(B, R, () => on, () => { const p = pick(PAL); col(p); label(B, L.color + ' ' + p); }), tc = idle(C, R, () => on);
      setTimeout(() => sk.style.borderRadius = pick(RAD), 450);
      const t0 = performance.now(), dW = 1200, dH = 1500;                         // haqiqiy eni/bo'yi o'zgarishi
      await new Promise(res => { (function f(n) { const a = Math.min((n - t0) / dW, 1), b = Math.min((n - t0) / dH, 1), ea = eio(a), eb = eio(b), r = R();
        sk.style.width = W * ea + 'px'; sk.style.height = H * eb + 'px';
        A.x = (ox ? r.right - W * ea : r.left + W * ea) + Math.sin(n / 45) * 1.2; A.y = (oy ? r.bottom - H * eb : r.top + H * eb) + Math.cos(n / 55) * 1.2; place(A);
        a < 1 || b < 1 ? requestAnimationFrame(f) : res(); })(t0); });
      await press(A); label(A, L.ready); on = false; await Promise.all([tb, tc]);
      // sayt o'zining haqiqiy rangi va shakliga qo'nadi
      col(opaque(realBg) ? realBg : 'transparent'); sk.style.borderRadius = realRad; label(B, L.color + ' ✓'); press(B); await sleep(450);
      const items = prepText(el); el.classList.add('ab-reveal'); sk.style.opacity = 0; await sleep(320);
      label(C, L.write); const total = items.reduce((s, i) => s + i.t.length, 0), per = Math.min(40, 1800 / Math.max(total, 1)), step = Math.max(1, Math.ceil(12 / per));
      for (const it of items) { it.w.classList.add('ab-typing');
        for (let i = step; i < it.t.length + step; i += step) { const k = Math.min(i, it.t.length); it.w.textContent = it.t.slice(0, k); it.g.textContent = it.t.slice(k);
          const rs = it.w.getClientRects(), r = rs[rs.length - 1]; if (r) { C.x = r.right + 4; C.y = r.top + r.height / 2; place(C); }
          await sleep(per * step * (.6 + Math.random() * .8)); }
        it.w.classList.remove('ab-typing'); it.s.replaceWith(it.n); }                  // asl DOM qaytariladi
    } finally {
      live = false; ghost.remove(); sk.remove(); el.style.position = prevPos;
      [A, B, C].forEach(c => { c.style.transition = 'opacity .4s'; c.style.opacity = 0; setTimeout(() => c.remove(), 450); });
      el.querySelectorAll('.ab-t').forEach(s => s.replaceWith(document.createTextNode(s.textContent.replace(/\u200b/g, ''))));
      finishOne(el);
    }
  }

  function check() { if (!started) return; let n = 0;
    els.forEach(el => { if (el.dataset.abS) return;
      if (el.getBoundingClientRect().top < innerHeight * O.trigger) { el.dataset.abS = 1; setTimeout(() => build(el).catch(() => finishOne(el)), n++ * O.stagger); } }); }
  const onWheel = e => { e.preventDefault(); started = true; scrollBy({ top: e.deltaY * (e.deltaMode ? 16 : 1) * O.slow, behavior: 'instant' }); };
  const onTS = e => { ty = e.touches[0].clientY; };
  const onTM = e => { e.preventDefault(); started = true; const y = e.touches[0].clientY; scrollBy({ top: (ty - y) * O.slow, behavior: 'instant' }); ty = y; };
  function stopSlow() { removeEventListener('wheel', onWheel); removeEventListener('touchstart', onTS); removeEventListener('touchmove', onTM); }
  if (O.slow) {   // slow:0 — o'zining smooth-scroll kutubxonasi (Lenis va h.k.) bo'lsa o'chiriladi
    addEventListener('wheel', onWheel, { passive: false });
    addEventListener('touchstart', onTS, { passive: true });
    addEventListener('touchmove', onTM, { passive: false });
  }
  addEventListener('scroll', () => { started = true; check(); }, { passive: true });
}
window.AgentBuild = { init };
})();
