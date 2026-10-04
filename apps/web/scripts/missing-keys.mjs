// Lists message keys referenced via t('...') that are absent from the catalog. Template keys (with ${}) are expanded by hand.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../src/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const catalogDir = join(root, 'shared/i18n/messages');

const defined = new Set();
for (const file of readdirSync(catalogDir)) {
  const text = readFileSync(join(catalogDir, file), 'utf8');
  for (const m of text.matchAll(/^\s*'([^']+)':/gm)) defined.add(m[1]);
}

const used = new Map();
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry) && !full.includes('messages')) {
      const text = readFileSync(full, 'utf8');
      for (const m of text.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) {
        if (!used.has(m[1])) used.set(m[1], full.replace(root, ''));
      }
    }
  }
}
walk(root);

const filter = process.argv[2];
const missing = [...used.entries()].filter(([key]) => !defined.has(key) && (!filter || key.startsWith(filter)));
for (const [key, file] of missing.sort()) console.log(`${key}  <- ${file}`);
console.log(`missing: ${missing.length}`);
