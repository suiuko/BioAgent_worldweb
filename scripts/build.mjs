import { cpSync, mkdirSync, readdirSync, statSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const output = path.resolve('dist');
if (path.resolve(projectRoot) !== process.cwd() || path.dirname(output) !== process.cwd() || path.basename(output) !== 'dist') throw new Error('Run this build from the project root');
// Only the verified, generated output directory is replaced.
rmSync(output, { recursive: true, force: true });
mkdirSync('dist', { recursive: true });
for (const item of ['index.html', 'styles.css', 'app.js', 'assets']) cpSync(item, path.join('dist', item), { recursive: true });
let bytes = 0;
function total(dir) { for (const item of readdirSync(dir)) { const entry = path.join(dir, item); const stat = statSync(entry); if (stat.isDirectory()) total(entry); else bytes += stat.size; } }
total('dist');
console.log(`Built static website: dist/ (${(bytes / 1e6).toFixed(1)} MB)`);
