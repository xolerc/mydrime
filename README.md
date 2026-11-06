# XOLERIC — rasmiy sayt (v4)

## Tuzilma
- `site/` — tayyor sayt (shuni joylang)
- `src/` — manba kod (index.html, css/main.css, js/*.js, public/)
- `tools/build.cjs` — build: `npm i && npm run build`
- `redirect-stub-mydrime/index.html` — eski `/mydrime/` repo uchun yo'naltirish sahifasi

## Joylash (GitHub Pages)
1. `site/` ichidagi hamma narsani `xolerc.github.io` repo ildiziga qo'ying.
2. Quyidagi fayllarni ham shu yerga qo'shing (zip'larda yo'q edi):
   - `images/bg.webp`, `images/main.webp`
   - `store.html`, `cv.html` (va ularning rasm/skriptlari)
   Keyin `sitemap.xml` ichidagi izohni oching.
3. `mydrime` repo'siga `redirect-stub-mydrime/index.html` ni qo'ying.

## Qidiruv (SEO)
1. Google Search Console'ga `https://xolerc.github.io/` ni qo'shing; tasdiqlash kodini `index.html` dagi izohga qo'ying.
2. `https://xolerc.github.io/sitemap.xml` ni yuboring. Bing Webmaster'da ham xuddi shunday.
3. Kontent o'zgarsa `npm run build` qiling (kesh-hash va sitemap sanasi yangilanadi).

## Qisqa tugmalar
`Esc` / `End` — intro'ni o'tkazish · `Ctrl+K` yoki `/` — buyruqlar paneli · `E` — tahrirlash rejimi
