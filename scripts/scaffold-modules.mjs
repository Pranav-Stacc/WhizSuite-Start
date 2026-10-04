#!/usr/bin/env node
/**
 * Scaffolds domain module structure per architecture rules.
 * Run: node scripts/scaffold-modules.mjs
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_SRC = join(__dirname, '..', 'apps', 'api', 'src', 'modules');

const MODULES = [
  'tenancy',
  'identity',
  'access',
  'invitations',
  'crm',
  'clients',
  'social',
  'engagement',
  'work',
  'workflow-engine',
  'approvals',
  'feedback',
  'media',
  'automation',
  'notifications',
  'analytics',
  'reporting',
  'finance',
  'time',
  'customization',
  'templates',
  'calendar',
  'search',
  'activity',
  'audit',
  'integrations',
  'ai',
  'billing',
  'knowledge',
  'realtime',
];

const toPascal = (s) =>
  s
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');

const toCamel = (s) => {
  const p = toPascal(s);
  return p.charAt(0).toLowerCase() + p.slice(1);
};

for (const mod of MODULES) {
  const base = join(API_SRC, mod);
  const dirs = [
    'application/ports',
    'application/services',
    'application/commands',
    'application/queries',
    'domain/entities',
    'domain/events',
    'domain/policies',
    'infrastructure/repositories',
    'infrastructure/adapters',
    'interface/http/controllers',
    'interface/http/dto',
    'interface/http/guards',
    'interface/http/decorators',
    'interface/validators',
    'config',
    'events',
    'jobs',
    'tests',
  ];

  for (const d of dirs) {
    mkdirSync(join(base, d), { recursive: true });
  }

  const pascal = toPascal(mod);
  const camel = toCamel(mod);
  const moduleFile = join(base, `${mod}.module.ts`);

  if (!existsSync(moduleFile)) {
    writeFileSync(
      moduleFile,
      `import { Module } from '@nestjs/common';
import { ${pascal}Controller } from './interface/http/controllers/${mod}.controller.js';
import { ${pascal}Service } from './application/services/${mod}.service.js';
import { ${pascal}Repository } from './infrastructure/repositories/${mod}.repository.js';

@Module({
  controllers: [${pascal}Controller],
  providers: [${pascal}Service, ${pascal}Repository],
  exports: [${pascal}Service],
})
export class ${pascal}Module {}
`,
    );
  }

  const portFile = join(base, 'application/ports', `${mod}.port.ts`);
  if (!existsSync(portFile)) {
    writeFileSync(
      portFile,
      `export const ${camel}PortToken = Symbol('${camel}Port');

export interface ${pascal}Port {
  readonly moduleName: '${mod}';
}
`,
    );
  }

  const serviceFile = join(base, 'application/services', `${mod}.service.ts`);
  if (!existsSync(serviceFile)) {
    writeFileSync(
      serviceFile,
      `import { Injectable } from '@nestjs/common';
import { ${pascal}Repository } from '../../infrastructure/repositories/${mod}.repository.js';

@Injectable()
export class ${pascal}Service {
  constructor(private readonly repository: ${pascal}Repository) {}

  getHealth() {
    return { module: '${mod}', status: 'ok' };
  }
}
`,
    );
  }

  const repoFile = join(
    base,
    'infrastructure/repositories',
    `${mod}.repository.ts`,
  );
  if (!existsSync(repoFile)) {
    writeFileSync(
      repoFile,
      `import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service.js';

@Injectable()
export class ${pascal}Repository {
  constructor(private readonly prisma: PrismaService) {}
}
`,
    );
  }

  const ctrlFile = join(
    base,
    'interface/http/controllers',
    `${mod}.controller.ts`,
  );
  if (!existsSync(ctrlFile)) {
    writeFileSync(
      ctrlFile,
      `import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ${pascal}Service } from '../../../application/services/${mod}.service.js';

@ApiTags('${mod}')
@Controller('v1/${mod}')
export class ${pascal}Controller {
  constructor(private readonly service: ${pascal}Service) {}

  @Get('health')
  health() {
    return this.service.getHealth();
  }
}
`,
    );
  }
}

console.log(`Scaffolded ${MODULES.length} modules in ${API_SRC}`);
