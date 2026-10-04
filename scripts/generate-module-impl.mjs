#!/usr/bin/env node
/**
 * Generates full CRUD service/repository/controller for scaffolded modules.
 * Run: node scripts/generate-module-impl.mjs
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = join(__dirname, '..', 'apps', 'api', 'src', 'modules');

const toPascal = (s) =>
  s.split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
const toCamel = (s) => {
  const p = toPascal(s);
  return p.charAt(0).toLowerCase() + p.slice(1);
};

/** module -> { prismaModel, routeSegment, permissions, orgScoped } */
const MODULES = {
  invitations: {
    model: 'invitation',
    route: 'invitations',
    permView: 'MEMBERS_INVITE',
    permCreate: 'MEMBERS_INVITE',
    skipList: false,
  },
  crm: {
    model: 'lead',
    route: 'leads',
    permView: 'LEADS_VIEW',
    permCreate: 'LEADS_CREATE',
  },
  work: {
    model: 'project',
    route: 'projects',
    permView: 'PROJECTS_VIEW',
    permCreate: 'PROJECTS_CREATE',
  },
  'workflow-engine': {
    model: 'workflowDefinition',
    route: 'workflows',
    permView: 'WORKFLOWS_MANAGE',
    permCreate: 'WORKFLOWS_MANAGE',
  },
  social: {
    model: 'contentItem',
    route: 'content',
    permView: 'CONTENT_VIEW',
    permCreate: 'CONTENT_CREATE',
  },
  engagement: {
    model: 'inboxConversation',
    route: 'inbox/conversations',
    permView: 'INBOX_VIEW',
    permCreate: 'INBOX_REPLY',
  },
  approvals: {
    model: 'approvalRequest',
    route: 'approvals',
    permView: 'APPROVALS_VIEW',
    permCreate: 'APPROVALS_CREATE',
  },
  feedback: {
    model: 'feedbackThread',
    route: 'feedback/threads',
    permView: 'FEEDBACK_VIEW',
    permCreate: 'FEEDBACK_CREATE',
  },
  media: {
    model: 'mediaAsset',
    route: 'media/assets',
    permView: 'FILES_VIEW',
    permCreate: 'FILES_UPLOAD',
  },
  automation: {
    model: 'automation',
    route: 'automations',
    permView: 'AUTOMATIONS_MANAGE',
    permCreate: 'AUTOMATIONS_MANAGE',
  },
  notifications: {
    model: 'notification',
    route: 'notifications',
    permView: 'ORG_VIEW',
    permCreate: 'ORG_VIEW',
    listOnly: true,
  },
  analytics: {
    model: 'metricSnapshot',
    route: 'analytics/metrics',
    permView: 'REPORTS_VIEW',
    permCreate: 'REPORTS_VIEW',
    listOnly: true,
  },
  reporting: {
    model: 'report',
    route: 'reports',
    permView: 'REPORTS_VIEW',
    permCreate: 'REPORTS_VIEW',
  },
  finance: {
    model: 'invoice',
    route: 'invoices',
    permView: 'INVOICES_VIEW',
    permCreate: 'INVOICES_CREATE',
  },
  time: {
    model: 'timeEntry',
    route: 'time/entries',
    permView: 'TIME_TRACK',
    permCreate: 'TIME_TRACK',
  },
  customization: {
    model: 'customFieldDefinition',
    route: 'custom-fields',
    permView: 'ORG_SETTINGS_MANAGE',
    permCreate: 'ORG_SETTINGS_MANAGE',
  },
  templates: {
    model: 'template',
    route: 'templates',
    permView: 'ORG_SETTINGS_MANAGE',
    permCreate: 'ORG_SETTINGS_MANAGE',
  },
  calendar: {
    model: 'calendarItem',
    route: 'calendar/items',
    permView: 'PROJECTS_VIEW',
    permCreate: 'PROJECTS_CREATE',
    listOnly: true,
  },
  activity: {
    model: 'activityEvent',
    route: 'activity',
    permView: 'ORG_VIEW',
    permCreate: 'ORG_VIEW',
    listOnly: true,
  },
  integrations: {
    model: 'integrationConnection',
    route: 'integrations/connections',
    permView: 'INTEGRATIONS_MANAGE',
    permCreate: 'INTEGRATIONS_MANAGE',
  },
  billing: {
    model: 'subscription',
    route: 'billing/subscription',
    permView: 'ORG_BILLING_MANAGE',
    permCreate: 'ORG_BILLING_MANAGE',
    singleResource: true,
  },
  knowledge: {
    model: 'kbSpace',
    route: 'knowledge/spaces',
    permView: 'ORG_VIEW',
    permCreate: 'ORG_SETTINGS_MANAGE',
  },
  ai: { skip: true },
  realtime: { skip: true },
  search: { skip: true },
};

for (const [mod, cfg] of Object.entries(MODULES)) {
  if (cfg.skip) continue;
  const pascal = toPascal(mod);
  const camel = toCamel(mod);
  const base = join(API, mod);

  const repoFile = join(base, 'infrastructure/repositories', `${mod}.repository.ts`);
  writeFileSync(
    repoFile,
    `import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';

@Injectable()
export class ${pascal}Repository {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, limit = 50) {
    return this.prisma.${cfg.model}.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  findById(organizationId: string, id: string) {
    return this.prisma.${cfg.model}.findFirst({
      where: { id, organizationId },
    });
  }

  create(organizationId: string, data: Record<string, unknown>) {
    return this.prisma.${cfg.model}.create({
      data: { ...data, organizationId } as never,
    });
  }

  update(organizationId: string, id: string, data: Record<string, unknown>) {
    return this.prisma.${cfg.model}.updateMany({
      where: { id, organizationId },
      data: data as never,
    });
  }
}
`,
  );

  const serviceFile = join(base, 'application/services', `${mod}.service.ts`);
  writeFileSync(
    serviceFile,
    `import { Injectable } from '@nestjs/common';
import { ErrorCodes } from '@agency-os/contracts';
import { ProblemDetailsException } from '../../../../shared/errors/problem-details.exception';
import { ${pascal}Repository } from '../../infrastructure/repositories/${mod}.repository';
import { AuditService } from '../../../audit/application/services/audit.service';

@Injectable()
export class ${pascal}Service {
  constructor(
    private readonly repository: ${pascal}Repository,
    private readonly audit: AuditService,
  ) {}

  list(organizationId: string) {
    return this.repository.list(organizationId);
  }

  async get(organizationId: string, id: string) {
    const item = await this.repository.findById(organizationId, id);
    if (!item) {
      throw new ProblemDetailsException(
        { type: 'about:blank', title: 'Not Found', status: 404, code: ErrorCodes.NOT_FOUND },
        404,
      );
    }
    return item;
  }

  async create(organizationId: string, actorId: string, data: Record<string, unknown>) {
    const item = await this.repository.create(organizationId, data);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: '${cfg.route}.create',
      entityType: '${cfg.model}',
      entityId: (item as { id: string }).id,
      after: item as Record<string, unknown>,
    });
    return item;
  }

  async update(organizationId: string, actorId: string, id: string, data: Record<string, unknown>) {
    await this.get(organizationId, id);
    await this.repository.update(organizationId, id, data);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: '${cfg.route}.update',
      entityType: '${cfg.model}',
      entityId: id,
      after: data,
    });
    return this.get(organizationId, id);
  }
}
`,
  );

  const ctrlName = cfg.singleResource ? `${pascal}BillingController` : `${pascal}ResourceController`;
  const ctrlFile = join(base, 'interface/http/controllers', `${mod}-resource.controller.ts`);
  if (!existsSync(ctrlFile)) {
    const createRoute = cfg.listOnly
      ? ''
      : `
  @Post()
  @RequirePermissions(Permissions.${cfg.permCreate})
  create(
    @Param('organizationId') organizationId: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(requireOrganizationId(organizationId), user.userId, body);
  }

  @Get(':id')
  @RequirePermissions(Permissions.${cfg.permView})
  getOne(@Param('organizationId') organizationId: string, @Param('id') id: string) {
    return this.service.get(requireOrganizationId(organizationId), id);
  }

  @Patch(':id')
  @RequirePermissions(Permissions.${cfg.permCreate})
  update(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(requireOrganizationId(organizationId), user.userId, id, body);
  }`;

    const idParam = cfg.singleResource ? '' : createRoute;

    writeFileSync(
      ctrlFile,
      `import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@agency-os/contracts';
import { CurrentUser, type AuthenticatedUser } from '../../../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../../../shared/auth/permissions.decorator';
import { requireOrganizationId } from '../../../../../shared/http/org-context';
import { ${pascal}Service } from '../../../application/services/${mod}.service';

@ApiTags('${mod}')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/${cfg.route}')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ${ctrlName} {
  constructor(private readonly service: ${pascal}Service) {}

  @Get()
  @RequirePermissions(Permissions.${cfg.permView})
  list(@Param('organizationId') organizationId: string) {
    return this.service.list(requireOrganizationId(organizationId));
  }
${idParam}
}
`,
    );
  }

  const modFile = join(base, `${mod}.module.ts`);
  writeFileSync(
    modFile,
    `import { Module } from '@nestjs/common';
import { ${pascal}Service } from './application/services/${mod}.service';
import { ${pascal}Repository } from './infrastructure/repositories/${mod}.repository';
import { ${ctrlName} } from './interface/http/controllers/${mod}-resource.controller';

@Module({
  controllers: [${ctrlName}],
  providers: [${pascal}Service, ${pascal}Repository],
  exports: [${pascal}Service, ${pascal}Repository],
})
export class ${pascal}Module {}
`,
  );
}

console.log('Generated module implementations');
