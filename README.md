# mydrime — xoleric portfolio

Jonli: https://xolerc.github.io/mydrime/

Mahsulotga yo'naltirilgan frontend portfolio — tez, qulay, kreativ kod bilan.

## Stek
- Statik `HTML + CSS + vanilla JS` — buildsiz, bog'liqliksiz
- `js/webgl-bg.js` — Mercury Liquid Chrome WebGL foni (fullscreen quad, simplex noise, kursorga sezgir, DPR cheklov, FPS pog'onalari, software-renderer himoyasi, watchdog) + **to'q sariq / gold glow**
- `js/app.js` — loader (xoleric-ai chat uslubi, input qolgan holda yozilgandek), neon sarlavha, flashlight reveal, orbit ijtimoiy halqa + travel rejimi (≥1200px), GitHub jonli loyihalar, scroll spy, statistika, Konami sirli rejimi
- `css/styles.css` — dizayn-tokenlar, tungi mavzu, gold aksentlar, responsiv (960px / 768px / 380px), `prefers-reduced-motion` qo'llab-quvvatlash
- `cv.html` — chop etiladigan CV / rezyume (yorug' + tungi, chop CSS)
- Rasmlar: `images/bg.webp`, `images/main.webp` (oldindan yuklanadi)

## Tuzilma
```text
index.html       # portfolio (hero, men haqimda, loyihalar, aloqa, footer)
cv.html          # chop etiladigan CV
css/styles.css   # to'liq dizayn tizimi
js/app.js        # barcha interaksiyalar
js/webgl-bg.js   # WebGL fon (window.xolericGL)
images/          # bg.webp, main.webp
```

## Lokal ishga tushirish
```bash
cd mydrime
python3 -m http.server 8000
# http://localhost:8000 ni oching
```

`npm install` ham, build ham kerak emas. Istalgan statik server bo'ladi (VS Code Live Server, `npx serve`, GitHub Pages).

## Nashr (deploy)
`main` ga push qiling — GitHub Pages ildizdan xizmat qiladi. Kesh `?v=20260927uz` orqali yangilanadi.

## Loyihalar bo'limi
`https://api.github.com/users/xolerc/repos` dan jonli (eng so'nggi 6 ta, forklarsiz). Oflayn / API xatoda — zaxira kartalar chiqadi. Token kerak emas. GitHub'dagi tavsiflar asl tilda keladi, karta interfeysi (Rol, Ta'siri, tugma) o'zbekcha.

## Tezlik eslatmalari
- WebGL DPR cheklangan (mobil 1.25, desktop 1.5, katta tomon 1800px)
- FPS pog'onalari + 500ms watchdog + `visibilitychange` pauza
- Hero statik bo'lganda rAF avto-to'xtaydi (40 kadr)
- Mobil / coarse pointerlarda `backdrop-filter` olib tashlangan
- Shriftlar Google Fonts (preconnect), rasmlar preloaded

## Qulaylik (a11y)
- Skip link, semantik regionlar, focus-visible halqalar
- `prefers-reduced-motion` da loader animatsiya, WebGL va reveal o'chadi
- Toast `role=status aria-live=polite` bilan
- Sayt tili: `lang="uz"`, barcha interfeys matnlari o'zbekcha
