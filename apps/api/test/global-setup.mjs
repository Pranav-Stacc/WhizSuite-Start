import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(testDir, '..');
const flagFile = path.join(testDir, '.e2e-db-unavailable');

export default async function globalSetup() {
  process.env.NODE_ENV = 'test';
  process.env.OUTBOX_RELAY_ENABLED = 'false';
  fs.rmSync(flagFile, { force: true });

  try {
    execSync('pnpm --filter @agency-os/contracts build', {
      cwd: path.resolve(apiRoot, '../..'),
      stdio: 'inherit',
      env: process.env,
    });
    execSync('npx prisma generate', { cwd: apiRoot, stdio: 'inherit', env: process.env });
    execSync('npx prisma db push --accept-data-loss --skip-generate', {
      cwd: apiRoot,
      stdio: 'inherit',
      env: process.env,
    });
    execSync('npx tsx prisma/seed.ts', { cwd: apiRoot, stdio: 'inherit', env: process.env });
  } catch (error) {
    console.warn(
      'E2E global setup: database unavailable. Start Docker (`docker compose up -d`) and re-run tests.',
      error?.message ?? error,
    );
    fs.writeFileSync(flagFile, '1');
  }
}
