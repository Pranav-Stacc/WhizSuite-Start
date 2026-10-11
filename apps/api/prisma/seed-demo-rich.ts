import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import type { DefaultRoleTemplate } from '@agency-os/contracts';
import {
  DEFAULT_MEMBERSHIP_ROLES,
  DEFAULT_ROLE_TEMPLATES,
  OWNER_MEMBERSHIP_ROLE,
  Permissions,
} from '@agency-os/contracts';
import type { PrismaClient } from '@prisma/client';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const OWNER_ROLE_NAME = OWNER_MEMBERSHIP_ROLE?.name ?? 'Owner';

type SeedRoleTemplate = {
  name: string;
  permissions: readonly string[];
  kind: string;
  defaultScopeTypes: readonly string[];
};

function normalizeRoleTemplate(template: DefaultRoleTemplate): SeedRoleTemplate {
  return {
    name: template.name,
    permissions: template.permissions,
    kind: template.kind ?? 'ACCESS',
    defaultScopeTypes: template.defaultScopeTypes ?? ['ORGANIZATION'],
  };
}

function accessRoleTemplates(): SeedRoleTemplate[] {
  if (DEFAULT_ROLE_TEMPLATES?.length) {
    return DEFAULT_ROLE_TEMPLATES.map(normalizeRoleTemplate);
  }
  const admin = DEFAULT_MEMBERSHIP_ROLES?.ADMIN;
  const member = DEFAULT_MEMBERSHIP_ROLES?.MEMBER;
  const fromMembership = [admin, member].filter(
    (t): t is DefaultRoleTemplate => Boolean(t),
  );
  if (fromMembership.length > 0) return fromMembership.map(normalizeRoleTemplate);
  const all = Object.values(Permissions);
  return [
    {
      name: 'Admin',
      permissions: all,
      kind: 'ACCESS',
      defaultScopeTypes: ['ORGANIZATION'],
    },
    {
      name: 'Member',
      permissions: all,
      kind: 'ACCESS',
      defaultScopeTypes: ['ORGANIZATION'],
    },
  ];
}

/** Login for local / staging demo (see apps/api/.env.example). */
export const DEMO_ACCOUNT = {
  email: 'demo@whizsuite.com',
  password: 'Demo123!',
  orgSlug: 'whizsuite-demo',
  orgName: 'WhizSuite Demo Agency',
} as const;

const DEMO_CLIENT_TARGET = 18;
const PASSWORD_ROUNDS = 12;

const CLIENT_SEEDS: { name: string; industry: string; color: string }[] = [
  { name: 'Aurora Skincare', industry: 'Beauty', color: '#E8B4B8' },
  { name: 'Peak Fitness Co', industry: 'Health', color: '#7C9EB2' },
  { name: 'Nomad Coffee Roasters', industry: 'F&B', color: '#6F4E37' },
  { name: 'Lumen SaaS', industry: 'Technology', color: '#5B8DEF' },
  { name: 'Verde Homes', industry: 'Real Estate', color: '#2E8B57' },
  { name: 'Pulse Activewear', industry: 'Retail', color: '#FF6B6B' },
  { name: 'Harbor Legal', industry: 'Professional', color: '#4A5568' },
  { name: 'Bloom Weddings', industry: 'Events', color: '#DDA0DD' },
  { name: 'Circuit Auto', industry: 'Automotive', color: '#1A1A2E' },
  { name: 'Kindred NGO', industry: 'Nonprofit', color: '#F4A261' },
  { name: 'Studio Kō', industry: 'Design', color: '#9B5DE5' },
  { name: 'FreshBasket', industry: 'E-commerce', color: '#06D6A0' },
  { name: 'Northwind Travel', industry: 'Travel', color: '#118AB2' },
  { name: 'Craft & Co', industry: 'Retail', color: '#C77DFF' },
  { name: 'Bright Minds EdTech', industry: 'Education', color: '#FFD166' },
  { name: 'Ironclad Security', industry: 'B2B', color: '#495057' },
  { name: 'Petals Florist', industry: 'Local', color: '#F72585' },
  { name: 'SolarGrid India', industry: 'Energy', color: '#F77F00' },
];

const TEAM_MEMBERS: { email: string; first: string; last: string; type: 'ADMIN' | 'MEMBER'; title: string }[] = [
  { email: 'maya.patel@demo.whizsuite.com', first: 'Maya', last: 'Patel', type: 'ADMIN', title: 'Operations Lead' },
  { email: 'jordan.lee@demo.whizsuite.com', first: 'Jordan', last: 'Lee', type: 'MEMBER', title: 'Account Manager' },
  { email: 'sam.ortiz@demo.whizsuite.com', first: 'Sam', last: 'Ortiz', type: 'MEMBER', title: 'Content Strategist' },
  { email: 'priya.nair@demo.whizsuite.com', first: 'Priya', last: 'Nair', type: 'MEMBER', title: 'Designer' },
  { email: 'alex.kim@demo.whizsuite.com', first: 'Alex', last: 'Kim', type: 'MEMBER', title: 'Video Producer' },
];

const CONTENT_STATUSES = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED'] as const;
const PLATFORMS = ['instagram', 'linkedin', 'facebook'] as const;

function daysFromNow(days: number, hour = 10): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
}

function avatarUrl(seed: string): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/256/256`;
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, PASSWORD_ROUNDS);
}

function storageClient(): S3Client | null {
  const endpoint = process.env.STORAGE_ENDPOINT;
  const bucket = process.env.STORAGE_BUCKET;
  if (!endpoint || !bucket) return null;
  return new S3Client({
    endpoint,
    region: process.env.STORAGE_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY ?? 'minioadmin',
      secretAccessKey: process.env.STORAGE_SECRET_KEY ?? 'minioadmin123',
    },
    forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE !== 'false',
  });
}

async function uploadDemoJpeg(
  orgId: string,
  fileKey: string,
  picsumSeed: string,
): Promise<string | null> {
  const bucket = process.env.STORAGE_BUCKET;
  const client = storageClient();
  if (!client || !bucket) return null;
  const storageKey = `orgs/${orgId}/demo/${fileKey}.jpg`;
  try {
    const res = await fetch(`https://picsum.photos/seed/${picsumSeed}/1200/800.jpg`);
    if (!res.ok) return null;
    const body = Buffer.from(await res.arrayBuffer());
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: storageKey,
        Body: body,
        ContentType: 'image/jpeg',
      }),
    );
    return storageKey;
  } catch {
    return null;
  }
}

async function ensureOwnerRole(
  prisma: PrismaClient,
  organizationId: string,
): Promise<string> {
  const existing = await prisma.role.findFirst({
    where: { organizationId, name: OWNER_ROLE_NAME, isSystem: true },
    select: { id: true },
  });
  if (existing) return existing.id;

  const perms = await prisma.permission.findMany({
    where: { key: { in: Object.values(Permissions) } },
    select: { id: true },
  });
  const role = await prisma.role.create({
    data: {
      organizationId,
      name: OWNER_ROLE_NAME,
      isSystem: true,
      permissions: {
        create: perms.map((p) => ({ permissionId: p.id, effect: 'ALLOW' })),
      },
    },
  });
  return role.id;
}

async function ensureDefaultRoles(
  prisma: PrismaClient,
  organizationId: string,
): Promise<Map<string, string>> {
  const permissionByKey = new Map(
    (await prisma.permission.findMany({ select: { id: true, key: true } })).map((p) => [p.key, p.id]),
  );
  const byName = new Map<string, string>();
  for (const template of accessRoleTemplates()) {
    const found = await prisma.role.findFirst({
      where: { organizationId, name: template.name, isSystem: false },
      select: { id: true },
    });
    if (found) {
      byName.set(template.name, found.id);
      continue;
    }
    const permissionIds = template.permissions
      .map((key) => permissionByKey.get(key))
      .filter((id): id is string => Boolean(id));
    const role = await prisma.role.create({
      data: {
        organizationId,
        name: template.name,
        isSystem: false,
        kind: template.kind,
        defaultScopeTypes: template.defaultScopeTypes,
        permissions: {
          create: permissionIds.map((permissionId) => ({
            permissionId,
            effect: 'ALLOW',
          })),
        },
      },
    });
    byName.set(template.name, role.id);
  }
  return byName;
}

async function assignRole(
  prisma: PrismaClient,
  organizationId: string,
  membershipId: string,
  roleId: string,
): Promise<void> {
  const existing = await prisma.roleAssignment.findFirst({
    where: { organizationId, membershipId, roleId },
    select: { id: true },
  });
  if (existing) return;
  await prisma.roleAssignment.create({
    data: {
      organizationId,
      membershipId,
      roleId,
      scopes: { create: [{ organizationId, scopeType: 'ORGANIZATION' }] },
    },
  });
}

export async function seedDemoRich(
  prisma: PrismaClient,
  planVersionId: string,
): Promise<void> {
  const passwordHash = await hashPassword(DEMO_ACCOUNT.password);

  let org = await prisma.organization.findUnique({
    where: { slug: DEMO_ACCOUNT.orgSlug },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: { name: DEMO_ACCOUNT.orgName, slug: DEMO_ACCOUNT.orgSlug, status: 'ACTIVE' },
    });
    await prisma.workspace.create({
      data: {
        organizationId: org.id,
        name: 'Main',
        slug: 'main',
        isDefault: true,
      },
    });
    await prisma.subscription.create({
      data: {
        organizationId: org.id,
        planVersionId,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
      },
    });
  }

  const workspace = await prisma.workspace.findFirst({
    where: { organizationId: org.id, isDefault: true },
  });
  if (!workspace) {
    throw new Error(`Demo org ${DEMO_ACCOUNT.orgSlug} missing default workspace`);
  }

  const ownerRoleId = await ensureOwnerRole(prisma, org.id);
  const defaultRoles = await ensureDefaultRoles(prisma, org.id);

  let ownerUser = await prisma.user.findUnique({ where: { email: DEMO_ACCOUNT.email } });
  if (!ownerUser) {
    ownerUser = await prisma.user.create({
      data: {
        email: DEMO_ACCOUNT.email,
        emailVerified: true,
        passwordHash,
        firstName: 'Demo',
        lastName: 'Owner',
        jobTitle: 'Agency Owner',
        avatarUrl: avatarUrl('demo-owner'),
      },
    });
  } else {
    ownerUser = await prisma.user.update({
      where: { id: ownerUser.id },
      data: {
        passwordHash,
        emailVerified: true,
        avatarUrl: ownerUser.avatarUrl ?? avatarUrl('demo-owner'),
      },
    });
  }

  let ownerMembership = await prisma.organizationMembership.findFirst({
    where: { organizationId: org.id, userId: ownerUser.id },
  });
  if (!ownerMembership) {
    ownerMembership = await prisma.organizationMembership.create({
      data: {
        organizationId: org.id,
        userId: ownerUser.id,
        type: 'OWNER',
        status: 'ACTIVE',
      },
    });
  }
  await assignRole(prisma, org.id, ownerMembership.id, ownerRoleId);

  const membershipIds: string[] = [ownerMembership.id];

  for (const member of TEAM_MEMBERS) {
    const user = await prisma.user.upsert({
      where: { email: member.email },
      create: {
        email: member.email,
        emailVerified: true,
        passwordHash: await hashPassword('Demo123!'),
        firstName: member.first,
        lastName: member.last,
        jobTitle: member.title,
        avatarUrl: avatarUrl(member.email),
      },
      update: {
        firstName: member.first,
        lastName: member.last,
        jobTitle: member.title,
        avatarUrl: avatarUrl(member.email),
      },
    });
    const membership = await prisma.organizationMembership.upsert({
      where: {
        organizationId_userId: { organizationId: org.id, userId: user.id },
      },
      create: {
        organizationId: org.id,
        userId: user.id,
        type: member.type,
        status: 'ACTIVE',
      },
      update: { type: member.type, status: 'ACTIVE' },
    });
    const roleName = member.type === 'ADMIN' ? 'Admin' : 'Member';
    const roleId = defaultRoles.get(roleName);
    if (roleId) await assignRole(prisma, org.id, membership.id, roleId);
    membershipIds.push(membership.id);
  }

  let team = await prisma.team.findFirst({
    where: { organizationId: org.id, name: 'Core Team' },
  });
  if (!team) {
    team = await prisma.team.create({
      data: {
        organizationId: org.id,
        workspaceId: workspace.id,
        name: 'Core Team',
        description: 'Demo agency core team',
      },
    });
  }

  for (const membershipId of membershipIds) {
    await prisma.teamMember.upsert({
      where: { teamId_membershipId: { teamId: team.id, membershipId } },
      create: { organizationId: org.id, teamId: team.id, membershipId },
      update: {},
    });
  }

  const clientCount = await prisma.client.count({
    where: { organizationId: org.id, deletedAt: null },
  });
  if (clientCount >= DEMO_CLIENT_TARGET) {
    console.log(
      `Demo org "${DEMO_ACCOUNT.orgSlug}" already has ${clientCount} clients — skipping bulk demo data`,
    );
    console.log(`Demo login: ${DEMO_ACCOUNT.email} / ${DEMO_ACCOUNT.password}`);
    return;
  }

  const createdClientIds: string[] = [];

  for (const [index, seed] of CLIENT_SEEDS.entries()) {
    const client = await prisma.client.create({
      data: {
        organizationId: org.id,
        workspaceId: workspace.id,
        displayName: seed.name,
        industry: seed.industry,
        status: index % 5 === 0 ? 'ONBOARDING' : 'ACTIVE',
        tier: index % 3 === 0 ? 'ENTERPRISE' : 'GROWTH',
        timezone: 'Asia/Kolkata',
      },
    });
    createdClientIds.push(client.id);

    await prisma.clientBrand.create({
      data: {
        organizationId: org.id,
        clientId: client.id,
        name: seed.name,
        isPrimary: true,
      },
    });

    await prisma.brandKit.create({
      data: {
        organizationId: org.id,
        clientId: client.id,
        colors: { primary: seed.color, secondary: '#0F172A' },
        contentPillars: ['Education', 'Behind the scenes', 'Promo'],
        hashtagSets: { default: ['#brand', '#growth', '#community'] },
      },
    });

    await prisma.clientContact.create({
      data: {
        organizationId: org.id,
        clientId: client.id,
        firstName: 'Primary',
        lastName: 'Contact',
        email: `contact+${index}@example.com`,
        role: 'Marketing Lead',
        isDecisionMaker: true,
      },
    });

    await prisma.retainer.create({
      data: {
        organizationId: org.id,
        clientId: client.id,
        name: `${seed.name} — Monthly`,
        feeMinor: 15000000 + index * 250000,
        currency: 'INR',
        startDate: daysFromNow(-90),
        status: 'ACTIVE',
      },
    });

    const project = await prisma.project.create({
      data: {
        organizationId: org.id,
        workspaceId: workspace.id,
        clientId: client.id,
        name: `${seed.name} — Q4 Campaign`,
        type: 'RETAINER',
        status: 'ACTIVE',
        ownerId: ownerUser.id,
        startDate: daysFromNow(-30),
        endDate: daysFromNow(60),
        budgetMinor: 50000000,
      },
    });

    await prisma.projectMember.create({
      data: {
        organizationId: org.id,
        projectId: project.id,
        membershipId: membershipIds[1 + (index % (membershipIds.length - 1))] ?? ownerMembership.id,
        role: 'LEAD',
      },
    });

    const campaign = await prisma.campaign.create({
      data: {
        organizationId: org.id,
        clientId: client.id,
        projectId: project.id,
        name: `${seed.name} Launch`,
        objective: 'Awareness + engagement',
        startDate: daysFromNow(-14),
        endDate: daysFromNow(45),
        budgetMinor: 8000000,
        status: 'ACTIVE',
      },
    });

    for (let p = 0; p < 6; p++) {
      const status = CONTENT_STATUSES[p % CONTENT_STATUSES.length] ?? 'DRAFT';
      const scheduledAt =
        status === 'SCHEDULED' || status === 'PUBLISHED'
          ? daysFromNow(p + 1, 14 + p)
          : null;
      const content = await prisma.contentItem.create({
        data: {
          organizationId: org.id,
          clientId: client.id,
          projectId: project.id,
          campaignId: campaign.id,
          title: `${seed.name} post ${p + 1}`,
          brief: 'Demo caption brief for review workflow.',
          caption: `Growing with ${seed.name} — post ${p + 1} #demo`,
          contentType: p % 2 === 0 ? 'IMAGE' : 'CAROUSEL',
          status,
          platforms: [PLATFORMS[p % PLATFORMS.length] ?? 'instagram'],
          hashtags: ['demo', seed.industry.toLowerCase()],
          scheduledAt,
          createdById: ownerUser.id,
        },
      });

      const storageKey =
        (await uploadDemoJpeg(org.id, `content-${content.id}`, `${seed.name}-${p}`)) ??
        `orgs/${org.id}/demo/placeholder-${content.id}.jpg`;

      const asset = await prisma.mediaAsset.create({
        data: {
          organizationId: org.id,
          clientId: client.id,
          projectId: project.id,
          name: `${seed.name}-asset-${p + 1}.jpg`,
          mimeType: 'image/jpeg',
          sizeBytes: BigInt(240_000),
          status: 'READY',
          searchText: `${seed.name} demo asset`,
          createdById: ownerUser.id,
        },
      });

      await prisma.mediaAssetVersion.create({
        data: {
          organizationId: org.id,
          assetId: asset.id,
          version: 1,
          storageKey,
          metadata: { demo: true, source: 'seed' },
        },
      });

      await prisma.contentMedia.create({
        data: {
          organizationId: org.id,
          contentItemId: content.id,
          mediaAssetId: asset.id,
          position: 0,
        },
      });
    }

    for (let t = 0; t < 5; t++) {
      const task = await prisma.task.create({
        data: {
          organizationId: org.id,
          projectId: project.id,
          clientId: client.id,
          title: `${seed.name}: task ${t + 1}`,
          description: 'Demo task for kanban and calendar views.',
          type: t === 0 ? 'Shoot' : 'General',
          status: t === 0 ? 'DONE' : t === 1 ? 'IN_PROGRESS' : 'TODO',
          priority: t % 2 === 0 ? 'HIGH' : 'MEDIUM',
          dueDate: daysFromNow(t + 2),
          createdById: ownerUser.id,
        },
      });
      await prisma.taskAssignee.create({
        data: {
          organizationId: org.id,
          taskId: task.id,
          membershipId: membershipIds[2 + (t % 3)] ?? ownerMembership.id,
        },
      });
    }

    const shootId = randomUUID();
    await prisma.calendarItem.create({
      data: {
        organizationId: org.id,
        sourceType: 'SHOOT',
        sourceId: shootId,
        title: `${seed.name} — Product shoot`,
        startsAt: daysFromNow(index % 20 + 3, 9),
        endsAt: daysFromNow(index % 20 + 3, 17),
        clientId: client.id,
        projectId: project.id,
        metadata: { kind: 'shoot', location: 'Studio A' },
        syncToGoogle: false,
      },
    });

    await prisma.meeting.create({
      data: {
        organizationId: org.id,
        clientId: client.id,
        projectId: project.id,
        title: `${seed.name} — Kickoff`,
        startsAt: daysFromNow(-(index % 10), 11),
        endsAt: daysFromNow(-(index % 10), 12),
        joinUrl: 'https://meet.example.com/demo',
      },
    });

    await prisma.calendarItem.create({
      data: {
        organizationId: org.id,
        sourceType: 'MEETING',
        sourceId: randomUUID(),
        title: `${seed.name} — Weekly sync`,
        startsAt: daysFromNow((index % 7) + 1, 15),
        endsAt: daysFromNow((index % 7) + 1, 16),
        clientId: client.id,
        projectId: project.id,
        metadata: { kind: 'meeting' },
      },
    });

    await prisma.clientAssignment.create({
      data: {
        organizationId: org.id,
        clientId: client.id,
        membershipId:
          membershipIds[1 + (index % (membershipIds.length - 1))] ?? ownerMembership.id,
        role: 'ACCOUNT_MANAGER',
      },
    });
  }

  console.log(`Seeded demo org "${DEMO_ACCOUNT.orgSlug}" with ${createdClientIds.length} clients`);
  console.log(`Demo login: ${DEMO_ACCOUNT.email} / ${DEMO_ACCOUNT.password}`);
}
