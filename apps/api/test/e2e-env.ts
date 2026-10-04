import fs from 'node:fs';
import path from 'node:path';

export function isE2eDbUnavailable(): boolean {
  return fs.existsSync(path.join(__dirname, '.e2e-db-unavailable'));
}
