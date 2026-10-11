#!/usr/bin/env node
/**
 * CI guard: org-scoped HTTP controllers must declare @RequirePermissions.
 * Public/AllowAuthenticated routes are exempt via separate controllers.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const API_SRC = path.join(process.cwd(), 'apps', 'api', 'src');

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (entry.name.endsWith('.controller.ts')) files.push(full);
  }
  return files;
}

const files = await walk(API_SRC);
const violations = [];

for (const file of files) {
  const content = await readFile(file, 'utf8');
  if (!content.includes('organizations/:organizationId')) continue;
  if (content.includes('@Public()')) continue;
  if (content.includes('@AllowAuthenticated()') && !content.includes('RequirePermissions')) {
    continue;
  }
  if (!content.includes('RequirePermissions')) {
    violations.push(path.relative(process.cwd(), file));
  }
}

if (violations.length > 0) {
  console.error('Controllers missing @RequirePermissions for org-scoped routes:\n');
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log('All org-scoped controllers declare @RequirePermissions.');
