/* ============================================
   بناء النسخة التجريبية لـ Vercel (عرض فقط):
   بيجمع صفحات الموقع ولوحة الإدارة ونقطة البيع في demo-dist، وبيبني تطبيق
   الموبايل تحت /app، وبيحط demo/demo-api.js في أول <head> في كل صفحة.
   السكريبت ده بيعترض طلبات api/*.php وبيرد من بيانات وهمية في المتصفح،
   فمفيش PHP ولا SQLite على الاستضافة، ومن غير أي تعديل في كود المشروع.

   التشغيل:  node demo/build.mjs        (محتاج npm ci جوه mobile-app الأول)
   ============================================ */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'demo-dist');

// اللي بيتنشر بس: الصفحات والأصول — مفيش api/ ولا data/ ولا .env ولا فيديوهات الدعاية
const SITE = ['assets', 'icons', 'CarWash-POS', 'favicon.ico', 'manifest.json', 'sw.js'];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const file of fs.readdirSync(root)) {
  if (file.endsWith('.html')) fs.copyFileSync(path.join(root, file), path.join(out, file));
}
for (const entry of SITE) {
  const from = path.join(root, entry);
  if (fs.existsSync(from)) fs.cpSync(from, path.join(out, entry), { recursive: true });
}

console.log('… بيبني تطبيق الموبايل');
execSync('npm run build', { cwd: path.join(root, 'mobile-app'), stdio: 'inherit' });
fs.cpSync(path.join(root, 'mobile-app', 'dist'), path.join(out, 'app'), { recursive: true });

fs.copyFileSync(path.join(root, 'demo', 'demo-api.js'), path.join(out, 'demo-api.js'));

// من غير defer ولا type=module عمدًا: لازم يشتغل قبل سكريبتات الصفحة
const TAG = '<script src="/demo-api.js"></script>';
let pages = 0;
const inject = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { inject(full); continue; }
    if (!entry.name.endsWith('.html')) continue;
    const html = fs.readFileSync(full, 'utf8');
    if (html.includes(TAG) || !/<head[^>]*>/i.test(html)) continue;
    fs.writeFileSync(full, html.replace(/<head[^>]*>/i, (tag) => `${tag}\n    ${TAG}`));
    pages += 1;
  }
};
inject(out);
console.log(`✅ النسخة التجريبية جاهزة في demo-dist (${pages} صفحة)`);
