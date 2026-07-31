<div align="center">

# ✦ Xoleric Portfolio v3 ✦

### Interactive, performant portfolio — pure HTML, CSS & JavaScript, zero dependencies

[![Live Demo](https://img.shields.io/badge/VISIT-SITE-00d4ff?style=for-the-badge&logo=vercel&logoColor=white)](https://xolerc.github.io/mydrime/)
[![GitHub](https://img.shields.io/badge/GITHUB-xolerc-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/xolerc)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](#license)

</div>

---

## What Is This?

The v3 portfolio — a scroll-driven storytelling site with an **Aurora soft-light cursor**, a typed-roles hero, a tech ticker, interactive 3D-tilt case-study cards with modals, a Matrix rain demo, a working contact form, light/dark theming, and a print-ready CV page.

**No frameworks. No dependencies. No build steps.**

---

## v3 Changelog

| Area | What changed |
|------|-------------|
| **Scroll model** | Full-screen wheel-swap replaced with **content-first vertical scroll + scroll-snap** — hero → ticker → about → work → playground → contact → footer |
| **Cursor effect** | Flashlight mask-reveal replaced with an **Aurora soft-light cursor**: two blurred radial gradients on the `#fx` canvas with `lighter` compositing + a CSS `radial-gradient` halo fallback |
| **Creative cuts** | Removed warp streaks, lightning sparks, click splash and long trail; kept tuned-down ambient glow + sparse neural particles (20 desktop / 10 mobile) |
| **Typed hero** | `I build [creative web experiences]` — typing/deleting roles loop with a blinking caret |
| **Tech ticker** | Seamless marquee (`translateX(-50%)`) with an `aria-hidden` duplicated track |
| **Work section** | 6 data-driven case-study cards with cursor-reactive 3D tilt (`--rx`/`--ry`), populated from JS, opened in a **case-study modal** (30s re-open cooldown) |
| **Playground** | Cursor-gravity particle field + **Matrix rain demo** in a wide modal |
| **Contact form** | Validation + Formspree submit with a graceful `mailto:` fallback |
| **Navigation polish** | Scroll progress bar, sticky header `.scrolled` state, scroll-spy active nav link, IntersectionObserver reveals |
| **CV** | New `cv.html` — print-friendly résumé with Print/Save-PDF button |
| **Theming** | Light/dark toggle persisted to `localStorage`, respects `prefers-color-scheme`, flips `color-scheme` |
| **Typography** | Inter (body) + Space Grotesk (display), 8pt spacing scale, motion tokens |
| **Kept** | Real preload loader + 8s failsafe, Konami easter egg, `0000` fullscreen, reduced-motion, visibility pause, debounced resize, DPR-aware canvas |

---

## Features

| Feature | Description |
|---------|-------------|
| **Aurora Cursor** | Soft dual-glow light follows the cursor; CSS halo fallback; `cursor: none` only on fine pointers |
| **Typed Roles** | Hero line cycles through role phrases with type/delete animation |
| **Tech Ticker** | Infinite scrolling stack marquee with masked edges |
| **Case Studies** | 6 projects, 3D-tilt cards, data-driven lightbox with outcome metrics |
| **Gravity Field** | Playground canvas of particles attracted to the cursor |
| **Matrix Demo** | Falling-character rain rendered in a modal |
| **Contact Form** | Validated, Formspree-ready, `mailto:` fallback offline |
| **Theme Toggle** | Persistent light/dark switch |
| **Scroll Progress** | Top progress bar + header shrink on scroll + active nav highlight |
| **Easter Eggs** | Konami code theme swap; type `0000` for fullscreen |
| **Performance** | Single `#fx` canvas, one delta-time master loop, reduced-motion support, battery-friendly pause |

---

## Tech Stack

```
HTML5 ─── Semantic markup, ARIA roles, dialog/modals
CSS3  ─── Custom properties, color-scheme, scroll-snap, backdrop-filter, 3D transforms
JS    ─── Canvas API, single master rAF loop, IntersectionObserver, Fetch API
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
├── cv.html             ← print-friendly résumé
├── css/
│   └── styles.css      ← design tokens + all styling
├── js/
│   └── app.js          ← loader, aurora FX, typed hero, modals, form, theme, easter eggs
├── images/
│   ├── bg.png          ← hero background layer
│   └── main.png        ← hero main art layer
└── README.md
```

---

## How It Works

1. **Loader** preloads `bg.png` + `main.png` with real progress (8s failsafe), then particle-explodes into the scene.
2. **Aurora cursor** draws two blurred radial gradients on `#fx` with `lighter` compositing, lerped after the pointer; a CSS halo is the no-canvas fallback.
3. **One master loop** drives lerp, aurora, neurons and ambient glow on a single canvas.
4. **Typed hero** types/deletes role phrases; the tech ticker duplicates its track for a seamless loop.
5. **Scroll** updates the progress bar, header state and active nav link; `IntersectionObserver` reveals cards and counts stats.
6. **Project cards** tilt in 3D toward the pointer and open a data-driven case-study modal (30s cooldown).
7. **Contact form** validates, posts to Formspree, and falls back to the user's email app when offline.
8. **Theme toggle** persists to `localStorage` and flips `color-scheme`.

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
