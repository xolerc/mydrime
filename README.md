<div align="center">

# Xoleric Portfolio

### An immersive interactive experience built with pure HTML, CSS & JavaScript

[![Live Demo](https://img.shields.io/badge/LIVE-DEMO-00d4ff?style=for-the-badge&logo=vercel&logoColor=white)](https://xolerc.github.io/mydrime/)
[![GitHub Stars](https://img.shields.io/github/stars/xolerc/mydrime?style=for-the-badge&color=yellow)](https://github.com/xolerc/mydrime)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

</div>

---

## What Is This?

A single-page portfolio website where your cursor becomes a flashlight — revealing a hidden image behind the visible layer through a smooth radial mask. Neural particles connect and scatter. Neon text greets you letter by letter. Social icons orbit the screen.

**No frameworks. No dependencies. Just raw web magic.**

---

## Preview

```
  ╔══════════════════════════════════════════════╗
  ║                                              ║
  ║    ██████████     [Orbit Icons]              ║
  ║    █ MAIN  █                                  ║
  ║    █  ████  █  ← cursor reveals hidden img   ║
  ║    █ BG.png █                                 ║
  ║    ██████████                                 ║
  ║                                              ║
  ║         ✦ WELCOME TO XOLERIC PORTFOLIO ✦     ║
  ║         ● ● ● ● (neural particles) ● ● ●    ║
  ╚══════════════════════════════════════════════╝
```

---

## Features

| Feature | Description |
|---------|-------------|
| **Cursor Reveal** | CSS `mask-image` radial-gradient tracks your mouse — reveals `bg.png` through a 200px hole in `main.png` |
| **Neural Particles** | 40 canvas-drawn dots with gold connecting lines — repel from cursor (250px) and reveal circle (220px) |
| **Neon Text** | "welcome to xoleric portfolio" — letter-by-letter entry with 3D rotateX + cyan glow pulse animation |
| **Orbiting Icons** | 6 social media SVG icons rotating on a circular path — always face upright via counter-rotation |
| **Mobile Touch** | Tap-to-reveal on mobile with 140px touch circle + cursor dot disabled |
| **Responsive** | Orbit shrinks to 80px radius on mobile, text scales with `vw` units |

---

## Tech Stack

```
HTML5 ─── Semantic markup, SVG icons
CSS3  ─── mask-image, backdrop-filter, keyframe animations, 3D transforms
JS    ─── Canvas API, requestAnimationFrame, lerp interpolation
```

**Zero dependencies. Zero build steps. Open `index.html` and it works.**

---

## Quick Start

```bash
# Clone
git clone https://github.com/xolerc/mydrime.git

# Open
cd mydrime
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
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

1. **Two image layers** stack on top of each other — `bg.png` (hidden) and `main.png` (visible)
2. **CSS mask** on `.reveal` div creates a `radial-gradient` circle that follows the cursor via `lerp(0.25)` smoothing
3. **Canvas particles** are drawn on every frame — each dot checks distance to cursor and reveal center, repels if within range, draws gold lines between nearby dots
4. **Welcome text** is split into `<span>` elements with staggered `setTimeout` for letter-by-letter neon animation
5. **Social orbit** uses CSS `rotate()` + `translateX()` + counter-`rotate()` so icons circle while staying upright

---

## Social Links

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
