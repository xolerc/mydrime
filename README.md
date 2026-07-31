<div align="center">

# ✦ Xoleric Portfolio v3.1 ✦

### Interactive, performant portfolio — pure HTML, CSS & JavaScript, zero dependencies

[![Live Demo](https://img.shields.io/badge/VISIT-SITE-00d4ff?style=for-the-badge&logo=vercel&logoColor=white)](https://xolerc.github.io/mydrime/)
[![GitHub](https://img.shields.io/badge/GITHUB-xolerc-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/xolerc)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](#license)

</div>

---

## What Is This?

The v3.1 portfolio — **V1 spirit restored on the V3 skeleton**: a flashlight mask-reveal hero with neon welcome letters and orbiting social icons, rebuilt around a content-first vertical scroll layout, one shared canvas and a single delta-time loop.

**No frameworks. No dependencies. No build steps.**

---

## v3.1 Changelog

| Area | What changed |
|------|-------------|
| **Hero reveal** | Restored the V1 **flashlight mask-reveal** — a CSS `radial-gradient` mask on the `.reveal` layer that follows the cursor (radius lerped, `200px` desktop / `140px` touch within 700ms of a touch) |
| **Welcome text** | Neon **`welcome to xoleric portfolio`** letters: staggered pop-in (45ms steps), cursor-repel with glow/scale/3D tilt, hover glitch |
| **Orbit** | The footer's 6 social icons are cloned into an **orbiting ring** behind the hero (`--a` per-icon angle, CSS `orbitSpin`) |
| **Creative FX** | Warp streaks clipped inside the flashlight circle + click **splash burst** + gold/dark neural particles with cursor repel |
| **Scroll model** | Content-first vertical scroll + scroll-snap — hero → about → work → contact → footer |
| **Work section** | 6 static professional cards (no modals) with cursor-reactive 3D tilt (`--rx`/`--ry`) |
| **Contact** | Simple **Telegram / Email** buttons — no form |
| **Removed from v3** | Aurora cursor, typed-roles hero, tech ticker, case-study modals, playground / Matrix demo, contact form, light/dark theme toggle, CV link |
| **Kept from v3** | Real preload loader + 8s failsafe, scroll progress, sticky header + scroll-spy, IntersectionObserver reveals, stat counters, Konami easter egg, `0000` fullscreen, reduced-motion, visibility pause, debounced resize, DPR-aware canvas |

---

## Features

| Feature | Description |
|---------|-------------|
| **Flashlight Reveal** | Mask-revealed hero layer that lights up around the cursor |
| **Neon Welcome** | Cursor-reactive neon letters with repel, glow and glitch |
| **Orbit Icons** | Social icons orbiting the hero, cloned from the footer |
| **Warp + Splash** | Light-speed streaks inside the reveal circle; click bursts |
| **Neural Field** | Sparse gold/dark particles with connections, pushed by the cursor |
| **Static Work Grid** | 6 clean project cards with 3D tilt |
| **Scroll Progress** | Top progress bar + header shrink on scroll + active nav highlight |
| **Easter Eggs** | Konami code sparks; type `0000` for fullscreen |
| **Performance** | Single `#fx` canvas, one delta-time master loop, reduced-motion support, battery-friendly pause |

---

## Tech Stack

```
HTML5 ─── Semantic markup, ARIA roles, skip link
CSS3  ─── Custom properties, color-scheme, scroll-snap, mask-image, 3D transforms
JS    ─── Canvas API, single master rAF loop, IntersectionObserver
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
│   └── app.js          ← loader, flashlight reveal, neon letters, orbit, FX, easter eggs
├── images/
│   ├── bg.png          ← hero background layer
│   └── main.png        ← hero main art layer
└── README.md
```

---

## How It Works

1. **Loader** preloads `bg.png` + `main.png` with real progress (8s failsafe), then particle-explodes into the scene.
2. **Flashlight reveal** sets `mask-image: radial-gradient(circle …)` on the `.reveal` layer each frame; the radius lerps to a target only while the hero is on screen.
3. **Neon letters** pop in one by one, then repel/glow/tilt away from the cursor within a 150px radius.
4. **One master loop** drives the cursor lerp, reveal mask, letters, warp streaks, splashes and neurons on a single canvas.
5. **Scroll** updates the progress bar, header state and active nav link; `IntersectionObserver` reveals cards and counts stats.
6. **Project cards** tilt in 3D toward the pointer and reset on leave.
7. **Easter eggs**: Konami code spawns a splash storm; typing `0000` toggles fullscreen.

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
