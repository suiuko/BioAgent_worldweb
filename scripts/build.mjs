import { cpSync, mkdirSync, readdirSync, statSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const output = path.resolve('dist');
if (path.resolve(projectRoot) !== process.cwd() || path.dirname(output) !== process.cwd() || path.basename(output) !== 'dist') throw new Error('Run this build from the project root');
// Only the verified, generated output directory is replaced.
rmSync(output, { recursive: true, force: true });
mkdirSync('dist', { recursive: true });
for (const item of ['index.html', 'styles.css', 'app.js', 'assets', 'scene']) cpSync(item, path.join('dist', item), { recursive: true });
// New releases must not reuse a browser's cached stylesheet or application script.
let html = readFileSync('dist/index.html', 'utf8');
for (const file of ['styles.css', 'app.js']) {
  const hash = createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 12);
  html = html.replace(`"${file}"`, `"${file}?v=${hash}"`);
}
writeFileSync('dist/index.html', html);
let sceneHtml = readFileSync('dist/scene/index.html', 'utf8');
for (const file of ['scene.css', 'viewer.mjs']) {
  const hash = createHash('sha256').update(readFileSync(path.join('scene', file))).digest('hex').slice(0, 12);
  sceneHtml = sceneHtml.replace(`"${file}"`, `"${file}?v=${hash}"`);
}
writeFileSync('dist/scene/index.html', sceneHtml);
let bytes = 0;
function total(dir) { for (const item of readdirSync(dir)) { const entry = path.join(dir, item); const stat = statSync(entry); if (stat.isDirectory()) total(entry); else bytes += stat.size; } }
total('dist');
console.log(`Built static website: dist/ (${(bytes / 1e6).toFixed(1)} MB)`);
