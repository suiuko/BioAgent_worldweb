import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const html = readFileSync('index.html', 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
const errors = [];
if (new Set(ids).size !== ids.length) errors.push('Duplicate HTML IDs');
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const value = match[1];
  if (value.startsWith('#')) { if (value.length > 1 && !ids.includes(value.slice(1))) errors.push(`Broken anchor: ${value}`); }
  else if (!/^(https?:|mailto:|data:)/.test(value) && !existsSync(path.resolve(value))) errors.push(`Missing asset: ${value}`);
}
for (const filename of readdirSync('assets')) {
  const asset = path.join('assets', filename);
  if (statSync(asset).size >= 32 * 1024 * 1024) errors.push(`Asset exceeds source hosting limit: ${asset}`);
}
if (/Stanford|Caltech|Movement Lab/.test(html)) errors.push('Unexpected reference-site identity');
execFileSync(process.execPath, ['--check', 'app.js']);
execFileSync(process.execPath, ['--check', 'scene/viewer.mjs']);
execFileSync(process.execPath, ['--check', 'scene/math.mjs']);
execFileSync(process.execPath, ['scripts/check-scene.mjs'], {stdio:'inherit'});
const sceneHtml = readFileSync('scene/index.html', 'utf8');
const sceneIds = [...sceneHtml.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
if (new Set(sceneIds).size !== sceneIds.length) errors.push('Duplicate scene HTML IDs');
for (const match of sceneHtml.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const value=match[1];
  if (value.startsWith('#') || /^(https?:|data:)/.test(value)) continue;
  if (!existsSync(path.resolve('scene', value.split(/[?#]/)[0]))) errors.push(`Missing scene asset: ${value}`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Checked local assets, ${ids.length} unique anchors, JavaScript syntax, and media sizes.`);
