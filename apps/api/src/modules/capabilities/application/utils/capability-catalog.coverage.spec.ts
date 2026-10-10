import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CAPABILITY_CATALOG } from '@agency-os/contracts';

describe('capability handler coverage', () => {
  it('implements a switch case for every catalog tool id', () => {
    const handlerPath = join(
      __dirname,
      '..',
      'services',
      'capability-handlers.service.ts',
    );
    const source = readFileSync(handlerPath, 'utf8');
    const caseIds = new Set(
      [...source.matchAll(/case\s+'([^']+)'/g)]
        .map((m) => m[1])
        .filter((id): id is string => Boolean(id)),
    );
    const catalogIds = CAPABILITY_CATALOG.map((t) => t.id);
    const missing = catalogIds.filter((id) => !caseIds.has(id));
    const catalogSet = new Set(catalogIds);
    const unknownCases = [...caseIds].filter((id) => !catalogSet.has(id));

    expect(missing).toEqual([]);
    expect(CAPABILITY_CATALOG).toHaveLength(140);
    expect(caseIds.size).toBe(140);
    expect(unknownCases).toEqual([]);
  });
});
