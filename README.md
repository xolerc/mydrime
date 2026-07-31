<div align="center">

# ✦ Xoleric Portfolio v2 ✦

### Immersive interactive portfolio — pure HTML, CSS & JavaScript, now split & performance-tuned

[![Live Demo](https://img.shields.io/badge/VISIT-SITE-00d4ff?style=for-the-badge&logo=vercel&logoColor=white)](https://xolerc.github.io/mydrime/)
[![GitHub](https://img.shields.io/badge/GITHUB-xolerc-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/xolerc)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](#license)

</div>

---

## What Is This?

A single-page portfolio website where your cursor becomes a flashlight — revealing a hidden image behind the visible layer through a smooth radial mask. Neural particles connect and scatter, neon text greets you letter by letter, social icons orbit the screen, and a Konami code unlocks a hidden theme.

**No frameworks. No dependencies. No build steps.**

---

## v2 Changelog

| Area | What changed |
|------|-------------|
| **Architecture** | Split `index.html` + `css/styles.css` + `js/app.js` (was one 2086-line file) |
| **Performance** | 7 canvases + 6 `requestAnimationFrame` loops → **1 effects canvas + 1 master loop** (delta-time based) |
| **Loader** | Real image-preload with true progress bar + percentage (was fake timer) |
| **Sharpness** | DPR-aware canvas sizing — crisp on retina displays |
| **Battery** | Pauses the render loop on `document.hidden`; debounced resize |
| **Accessibility** | `prefers-reduced-motion` support, skip-link, `aria-hidden`/`role="region"`, `focus-visible` rings, semantic `<h1>`/`<nav>` |
| **Mobile** | Pointer-coarse detection, touch-reveal, swipe navigation, mobile orbit size |
| **Theming** | Full CSS custom-property token system in `:root` |

### Bugs fixed in v2

- `filter: scale(1.2)` (invalid CSS) → `transform: scale(1.25)` on orbit icons
- `.reveal` hardcoded `background-position: -45px center` misaligning the revealed layer → `center` matching the bg layer
- Typo `scrroll` → `scroll`
- Stray Chinese character `专注` in the about paragraph → removed
- All 6 orbit icons forced YouTube-red `#e10600` → per-brand hover colors
- Splash ring reading `particles[0]` after particles died → stable `cx/cy` snapshot
- 6 concurrent rAF loops / 7 layered canvases → single loop, single canvas

---

## Features

| Feature | Description |
|---------|-------------|
| **Cursor Reveal** | CSS `mask-image` radial-gradient tracks your mouse — reveals `bg.png` through a 200px hole in `main.png` |
| **Neural Particles** | 40 canvas-drawn dots with gold connecting lines — repel from cursor and reveal circle |
| **Neon Text** | "welcome to xoleric portfolio" — letter-by-letter entry with magnetic repel + glow pulse |
| **Warp Speed** | Rotating streaks inside the reveal circle |
| **Click Splash** | Shockwave ring + particle burst on every click |
| **Orbiting Icons** | 6 social SVG icons rotate on a circular path, each with its brand color on hover |
| **Mobile Touch** | Tap-to-reveal with 140px touch circle + swipe section navigation |
| **Responsive** | Orbit shrinks to 80px radius on mobile, text scales with `clamp()` |
| **Easter Eggs** | Konami code theme-swap; type `0000` for fullscreen |

---

## Tech Stack

```
HTML5 ─── Semantic markup, SVG icons, ARIA roles
CSS3  ─── Custom properties, mask-image, backdrop-filter, keyframes, 3D transforms
JS    ─── Canvas API, single master rAF loop, delta-time interpolation, DPR scaling
```

**Zero dependencies. Open `index.html` and it works.**

---

## Quick Start

```bash
git clone https://github.com/xolerc/mydrime.git
cd mydrime
open index.html
```

Or visit the **[live site](https://xolerc.github.io/mydrime/)** directly.

---

## Project Structure

```
mydrime/
├── index.html          ← semantic markup, no inline CSS/JS
├── css/
│   └── styles.css      ← design tokens + all styling
├── js/
│   └── app.js          ← loader, effects engine, navigation, easter eggs
├── images/
│   ├── bg.png          ← hidden layer (revealed by cursor)
│   └── main.png        ← visible top layer
└── README.md
```

---

## How It Works

1. **Loader** preloads `bg.png` + `main.png` with real progress, then particle-explodes into the scene.
2. **One master loop** runs on a single `#fx` canvas: ambient glow → cursor trail → neural network → warp streaks → lightning sparks → click splashes.
3. **Reveal mask** on `.reveal` follows the cursor via lerp interpolation; background layers get subtle parallax.
4. **Welcome text** splits into `<span>`s with staggered neon entry, then reacts magnetically to the cursor.
5. **Social orbit** uses `rotate()` + `translateX()` + counter-rotation so icons circle while staying upright.
6. **Navigation** (wheel / swipe / arrows / dots) slides between 4 full-screen sections.

---

## Connect

<div align="center">

[![YouTube](https://img.shields.io/badge/YouTube-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://youtube.com/@xolericc)
[![Instagram](https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white)](https://www.instagram.com/xoleric_)
[![Telegram](https://img.shields.io/badge/Telegram-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/Wxoleric)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/xolerc)
[![Pinterest](https://img.shields.io/badge/Pinterest-E60023?style=for-the-badge&logo=pinterest&logoColor=white)](https://pin.it/2BCXGGCba)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/xoleric-undefined-8b689b3a1)

</div>

---

## License

MIT — use it, fork it, learn from it.

---

<div align="center">

**Built with curiosity & caffeine by [xolerc](https://github.com/xolerc)**

</div>
