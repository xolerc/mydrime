/* XOLERIC — build: src/ → site/ (minify + kesh-hash). Ishga tushirish:  npm i && npm run build */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const esbuild = require('esbuild');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'src'), out = path.join(root, 'site');
const today = new Date().toISOString().slice(0, 10);

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    e.isDirectory() ? copyDir(a, b) : fs.copyFileSync(a, b);
  }
}
const hash = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8);
const kb = (f) => (fs.statSync(f).size / 1024).toFixed(1) + ' KB';

fs.rmSync(out, { recursive: true, force: true });
copyDir(path.join(src, 'public'), out);
fs.mkdirSync(path.join(out, 'js'), { recursive: true });
fs.mkdirSync(path.join(out, 'css'), { recursive: true });

esbuild.buildSync({
  entryPoints: [path.join(src, 'js/main.js')],
  outfile: path.join(out, 'js/xoleric.min.js'),
  bundle: true, minify: true, format: 'iife', target: ['es2018'], legalComments: 'none',
  banner: { js: '/* XOLERIC */' }
});
esbuild.buildSync({
  entryPoints: [path.join(src, 'css/main.css')],
  outfile: path.join(out, 'css/xoleric.min.css'),
  bundle: false, minify: true, target: ['chrome90', 'safari14', 'firefox90'], legalComments: 'none',
  loader: { '.css': 'css' }
});

const jsH = hash(fs.readFileSync(path.join(out, 'js/xoleric.min.js')));
const cssH = hash(fs.readFileSync(path.join(out, 'css/xoleric.min.css')));

let html = fs.readFileSync(path.join(src, 'index.html'), 'utf8')
  .replace('{{CSS_HASH}}', cssH).replace('{{JS_HASH}}', jsH);
fs.writeFileSync(path.join(out, 'index.html'), html);

const sm = path.join(out, 'sitemap.xml');
fs.writeFileSync(sm, fs.readFileSync(sm, 'utf8').replace(/\{\{DATE\}\}/g, today));

console.log('index.html   ', kb(path.join(out, 'index.html')));
console.log('xoleric.min.css', kb(path.join(out, 'css/xoleric.min.css')), cssH);
console.log('xoleric.min.js ', kb(path.join(out, 'js/xoleric.min.js')), jsH);
