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
// Version the embedded document as well as its scripts and styles: an iframe
// navigation can otherwise retain an older scene/index.html after a release.
const viewerVersion = createHash('sha256');
for (const file of ['scene/index.html', 'scene/scene.css', 'scene/viewer.mjs', 'scene/math.mjs', 'scene/data/scene.json', 'styles.css']) viewerVersion.update(readFileSync(file));
writeFileSync('dist/app.js', readFileSync('dist/app.js', 'utf8').replace('__LAB_VIEWER_VERSION__', viewerVersion.digest('hex').slice(0, 12)));
// New releases must not reuse a browser's cached stylesheet or application script.
let html = readFileSync('dist/index.html', 'utf8');
for (const file of ['styles.css', 'app.js']) {
  const hash = createHash('sha256').update(readFileSync(path.join('dist', file))).digest('hex').slice(0, 12);
  html = html.replace(`"${file}"`, `"${file}?v=${hash}"`);
}
writeFileSync('dist/index.html', html);
let sceneHtml = readFileSync('dist/scene/index.html', 'utf8');
const sharedStyleHash = createHash('sha256').update(readFileSync('styles.css')).digest('hex').slice(0, 12);
sceneHtml = sceneHtml.replace('"../styles.css"', `"../styles.css?v=${sharedStyleHash}"`);
for (const file of ['scene.css', 'viewer.mjs']) {
  const hash = createHash('sha256').update(readFileSync(path.join('scene', file))).digest('hex').slice(0, 12);
  sceneHtml = sceneHtml.replace(`"${file}"`, `"${file}?v=${hash}"`);
}
writeFileSync('dist/scene/index.html', sceneHtml);
let bytes = 0;
function total(dir) { for (const item of readdirSync(dir)) { const entry = path.join(dir, item); const stat = statSync(entry); if (stat.isDirectory()) total(entry); else bytes += stat.size; } }
total('dist');
console.log(`Built static website: dist/ (${(bytes / 1e6).toFixed(1)} MB)`);
