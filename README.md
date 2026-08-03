<div align="center">

# ✦ Xoleric Portfolio v3.2 ✦

### Interactive, performant portfolio — pure HTML, CSS & JavaScript, zero dependencies

[![Live Demo](https://img.shields.io/badge/VISIT-SITE-00d4ff?style=for-the-badge&logo=vercel&logoColor=white)](https://xolerc.github.io/mydrime/)
[![GitHub](https://img.shields.io/badge/GITHUB-xolerc-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/xolerc)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](#license)

</div>

---

## What Is This?

The v3.2 portfolio — **clean, content-first**: corner hero art with a V1-style **flashlight reveal** confined to the art box (a clear circle of `bg.png` opens over `main.png` only while the cursor is over the image), neon welcome letters, orbiting social icons, a WebGL liquid-chrome background and a **live GitHub projects grid** fed from the GitHub API.

**No frameworks. No dependencies. No build steps.**

---

## v3.2 Changelog

| Area | What changed |
|------|-------------|
| **Hero art** | Corner 2-layer image: `main.png` fully visible; **V1 flashlight reveal** — a clear circle of `bg.png` opens over it only while the cursor is inside the art box |
| **Layout** | Hero texts (eyebrow, welcome title, CTAs) moved **below** the art box; styled with the UI palette + contrast shadows |
| **Welcome text** | Neon **`welcome to xoleric portfolio`** letters: staggered pop-in (45ms steps) — no cursor scattering |
| **Cursor** | Custom cursor dot/halo, click splash, warp streaks and neural particles all **removed**; native cursor restored |
| **Projects** | **Live from GitHub API** — top 6 non-fork repos of `xolerc`, auto-updating, with language/stars/forks meta; graceful offline fallback |
| **Orbit** | The footer's 6 social icons cloned into an **orbiting ring** behind the hero |
| **Background** | Global WebGL **Mercury liquid-chrome** shader (`webgl-bg.js`) + accent glow + film grain; static reduced-motion fallback |
| **Scroll model** | Content-first vertical scroll + scroll-snap — hero → about → work → contact → footer |
| **Contact** | Simple **Telegram / Email** buttons — no form |
| **Kept from v3** | Real preload loader + 8s failsafe, scroll progress, sticky header + scroll-spy, IntersectionObserver reveals, stat counters, Konami easter egg, `0000` fullscreen, reduced-motion, visibility pause, debounced resize |

---

## Features

| Feature | Description |
|---------|-------------|
| **Flashlight Reveal** | Clear circle of `bg.png` opens over `main.png` only while the cursor is over the art box |
| **Neon Welcome** | Staggered neon `welcome to xoleric portfolio` letters |
| **Orbit Icons** | Social icons orbiting the hero, cloned from the footer |
| **Live GitHub Grid** | Project cards fetched in real time from `api.github.com/users/xolerc/repos` |
| **WebGL Background** | Cursor-reactive "ship on the sea" — the Mercury liquid-chrome shader drifts, ripples and re-tints slowly toward the cursor while the pointer stays 1:1 |
| **Scroll Progress** | Top progress bar + header shrink on scroll + active nav highlight |
| **Easter Eggs** | Konami code; type `0000` for fullscreen |
| **Performance** | Lightweight master loop, reduced-motion support, battery-friendly pause |

---

## Tech Stack

```
HTML5 ─── Semantic markup, ARIA roles, skip link
CSS3  ─── Custom properties, color-scheme, scroll-snap, blur reveal, gradient art cards
JS    ─── Fetch API (GitHub), WebGL shader, IntersectionObserver, single rAF loop
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
│   └── app.js          ← loader, flashlight reveal, neon letters, orbit, live GitHub, easter eggs
├── js/
│   └── webgl-bg.js     ← Mercury liquid-chrome background shader
├── images/
│   ├── bg.png          ← hero background layer
│   └── main.png        ← hero main art layer
└── README.md
```

---

## How It Works

1. **Loader** preloads `bg.png` + `main.png` with real progress (8s failsafe), then particle-explodes into the scene.
2. **Flashlight reveal** sets `mask-image: radial-gradient(circle …)` on the `.reveal` layer (clear `bg.png`) each frame; the circle radius lerps to `200px` desktop / `140px` touch only while the cursor is inside the art box — it never touches the rest of the UI.
3. **Neon letters** pop in one by one with a 45ms stagger.
4. **Live GitHub grid** fetches `users/xolerc/repos` (non-fork, top 6 by updated) and renders cards with language/stars/forks; falls back to static cards offline.
5. **Scroll** updates the progress bar, header state and active nav link; `IntersectionObserver` reveals cards and counts stats.
6. **WebGL background** renders the Mercury liquid-chrome shader behind everything (skipped under reduced motion).
7. **Easter eggs**: Konami code toggles the theme; typing `0000` toggles fullscreen.

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
