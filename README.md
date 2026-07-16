<div align="center">

# ✦ Xoleric Portfolio ✦

### Immersive interactive portfolio — pure HTML, CSS & JavaScript

[![Live Demo](https://img.shields.io/badge/VISIT-SITE-00d4ff?style=for-the-badge&logo=vercel&logoColor=white)](https://xolerc.github.io/mydrime/)
[![GitHub](https://img.shields.io/badge/GITHUB-xolerc-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/xolerc)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](#license)

</div>

---

## What Is This?

A multi-section portfolio website with an immersive flashlight-reveal hero, neural particle system, smooth scroll-triggered animations, and a professional dark aesthetic.

**No frameworks. No dependencies. Just raw web magic.**

---

## Features

| Feature | Description |
|---------|-------------|
| **Loading Screen** | Animated dual-ring loader with progress bar — brand identity from the first frame |
| **Cursor Reveal** | CSS `mask-image` radial-gradient tracks your mouse — reveals `bg.png` through `main.png` |
| **Custom Cursor** | Glowing cyan dot + outer ring with 8-particle trailing effect — expands on interactive elements |
| **Neural Particles** | 50 canvas-drawn dots with hue-shifted connections — repel from cursor |
| **Typing Effect** | Dynamic subtitle types character-by-character with blinking cursor |
| **Scroll Reveal** | Staggered entrance animations on every section via IntersectionObserver-style scroll detection |
| **Counter Animation** | Stats count up from 0 when scrolled into view |
| **Navigation** | Fixed glassmorphism navbar with active-section highlighting — appears after scroll |
| **Orbiting Icons** | 6 social media SVG icons rotating on a circular path with counter-rotation |
| **Ambient Effects** | Dual gradient glows + subtle noise overlay for depth |
| **Responsive** | Fully responsive — cursor disabled on mobile, orbit hidden on tablet, sections stack vertically |
| **Accessibility** | ARIA labels, semantic HTML, `noscript` fallback, `rel="noopener noreferrer"` on external links |

---

## Tech Stack

```
HTML5  ─── Semantic markup, SVG icons, ARIA attributes
CSS3   ─── mask-image, backdrop-filter, keyframe animations, 3D transforms, CSS variables
JS     ─── Canvas API, requestAnimationFrame, lerp interpolation, scroll-driven animations
```

**Zero dependencies. Zero build steps. Open `index.html` and it works.**

---

## Quick Start

```bash
git clone https://github.com/xolerc/mydrime.git
cd mydrime
open index.html
```

Or just visit the **[live site](https://xolerc.github.io/mydrime/)** directly.

---

## Project Structure

```
mydrime/
├── index.html          ← everything lives here (HTML + CSS + JS)
├── images/
│   ├── bg.png          ← hidden layer (revealed by cursor)
│   └── main.png        ← visible top layer
├── README.md
└── .git/
```

---

## How It Works

1. **Loading screen** shows animated rings + progress bar while images load
2. **Two image layers** stack — `bg.png` (hidden) and `main.png` (visible)
3. **CSS mask** on `.hero-reveal` creates a radial-gradient circle following the cursor via `lerp(0.25)`
4. **Canvas particles** drawn per-frame — dots repel from cursor, draw hue-shifted connections
5. **Custom cursor** with outer ring + 8 trailing particles, all lerped smoothly
6. **Typing effect** types the subtitle character-by-character after hero entrance
7. **Scroll reveals** — elements fade in with staggered delays as you scroll
8. **Counter animation** — stat numbers count up when scrolled into view
9. **Social orbit** uses CSS `rotate()` + `translateX()` + counter-`rotate()`

---

## What Was Fixed (v2)

| Issue | Fix |
|-------|-----|
| "TEGING" typo | Replaced with proper "Scroll" indicator |
| Double RAF loops | Merged into single unified `mainLoop()` |
| Invisible particles | Changed from black to hue-shifted visible colors |
| No loading screen | Added animated dual-ring loader with progress bar |
| No accessibility | Added ARIA labels, semantic HTML, noscript fallback |
| Broken LinkedIn URL | Fixed URL (removed "undefined") |
| Social hover `filter: scale()` | Fixed to use proper CSS transitions |
| `left: 40%` centering | Fixed to `left: 50%` + `translateX(-50%)` |
| Mobile overflow | Orbit hidden on tablet, proper responsive breakpoints |
| No nav / sections | Added full 5-section portfolio with smooth scrolling |
| No cursor effects | Added cursor trail, hover states, outer ring |
| No scroll animations | Added reveal-on-scroll with staggered delays |
| No noise/ambient | Added subtle noise texture + ambient gradient glows |
| Hardcoded magic numbers | Moved to CSS custom properties |
| No mobile nav | Added hamburger toggle for mobile |

---

## Connect

<div align="center">

[![YouTube](https://img.shields.io/badge/YouTube-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://youtube.com/@xolericc)
[![Instagram](https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white)](https://www.instagram.com/xoleric_)
[![Telegram](https://img.shields.io/badge/Telegram-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/Wxoleric)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/xolerc)
[![Pinterest](https://img.shields.io/badge/Pinterest-E60023?style=for-the-badge&logo=pinterest&logoColor=white)](https://pin.it/2BCXGGCba)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/xoleric)

</div>

---

## License

MIT — use it, fork it, learn from it.

---

<div align="center">

**Built with curiosity & caffeine by [xolerc](https://github.com/xoleric)**

</div>
