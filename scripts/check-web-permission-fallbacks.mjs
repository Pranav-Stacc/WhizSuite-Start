#!/usr/bin/env node
/**
 * Guards against live-mode permission over-grant patterns in apps/web.
 * Run: node scripts/check-web-permission-fallbacks.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', 'apps', 'web', 'src');
const ALLOWLIST_SUFFIXES = [
  'shared/auth/resolve-session-permissions.ts',
  'features/roles/config.ts',
  'features/roles/data/roles.repository.ts',
];

const PATTERNS = [
  {
    name: 'DEFAULT_MEMBERSHIP_ROLES used outside demo resolver',
    re: /DEFAULT_MEMBERSHIP_ROLES/,
  },
  {
    name: 'effectivePermissions fallback to roleGrantedKeys',
    re: /effectivePermissions\s*\?\?\s*roleGrantedKeys/,
  },
  {
    name: 'effectivePermissions.length ternary to roleGrantedKeys',
    re: /effectivePermissions\.length\s*\?\s*memberAccess\.effectivePermissions\s*:\s*roleGrantedKeys/,
  },
];

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, files);
    else if (path.endsWith('.ts') || path.endsWith('.tsx')) files.push(path);
  }
  return files;
}

const violations = [];
for (const file of walk(ROOT)) {
  const normalized = file.replace(/\\/g, '/');
  if (ALLOWLIST_SUFFIXES.some((suffix) => normalized.endsWith(suffix))) continue;
  const text = readFileSync(file, 'utf8');
  for (const { name, re } of PATTERNS) {
    if (re.test(text)) violations.push({ file, rule: name });
  }
}

if (violations.length > 0) {
  console.error('Web permission fallback check failed:\n');
  for (const v of violations) console.error(`  ${v.rule}\n    ${v.file}`);
  process.exit(1);
}

console.log('Web permission fallback check passed.');
