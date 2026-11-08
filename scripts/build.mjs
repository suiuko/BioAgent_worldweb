import { cpSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
mkdirSync('dist', { recursive: true });
for (const item of ['index.html', 'styles.css', 'app.js', 'assets']) cpSync(item, path.join('dist', item), { recursive: true });
let bytes = 0;
function total(dir) { for (const item of readdirSync(dir)) { const entry = path.join(dir, item); const stat = statSync(entry); if (stat.isDirectory()) total(entry); else bytes += stat.size; } }
total('dist');
console.log(`Built static website: dist/ (${(bytes / 1e6).toFixed(1)} MB)`);
