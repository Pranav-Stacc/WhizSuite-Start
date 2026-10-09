import { PrismaClient } from '@prisma/client';
import { Permissions } from '@agency-os/contracts';

const prisma = new PrismaClient();

const permissionCatalog = Object.values(Permissions).map((key) => ({
  key,
  category: key.split('.')[0],
  description: key,
}));

const ownerPermissions = Object.values(Permissions);

async function main() {
  for (const p of permissionCatalog) {
    await prisma.permission.upsert({
      where: { key: p.key },
      create: p,
      update: { category: p.category },
    });
  }

  const starterPlan = await prisma.plan.upsert({
    where: { key: 'starter' },
    create: { key: 'starter', name: 'Starter', description: 'Trial plan' },
    update: {},
  });

  const planVersion = await prisma.planVersion.upsert({
    where: { planId_version: { planId: starterPlan.id, version: 1 } },
    create: { planId: starterPlan.id, version: 1 },
    update: {},
  });

  await prisma.planPrice.upsert({
    where: {
      planVersionId_currency_interval: {
        planVersionId: planVersion.id,
        currency: 'INR',
        interval: 'month',
      },
    },
    create: {
      planVersionId: planVersion.id,
      currency: 'INR',
      interval: 'month',
      amountMinor: 199900,
    },
    update: {},
  });

  await prisma.planEntitlement.upsert({
    where: { planVersionId_key: { planVersionId: planVersion.id, key: 'seats' } },
    create: { planVersionId: planVersion.id, key: 'seats', value: 5 },
    update: { value: 5 },
  });

  const STORAGE_BYTES_50_GB = 50 * 1024 * 1024 * 1024;
  await prisma.planEntitlement.upsert({
    where: {
      planVersionId_key: { planVersionId: planVersion.id, key: 'storage.bytes' },
    },
    create: {
      planVersionId: planVersion.id,
      key: 'storage.bytes',
      value: { max: STORAGE_BYTES_50_GB },
    },
    update: { value: { max: STORAGE_BYTES_50_GB } },
  });

  const integrationProviders = [
    {
      key: 'meta',
      name: 'Meta',
      category: 'social',
      manifest: {
        scopes: [
          'pages_show_list',
          'pages_read_engagement',
          'instagram_basic',
          'instagram_content_publish',
        ],
      },
    },

    { key: 'linkedin', name: 'LinkedIn', category: 'social', manifest: { scopes: ['w_member_social'] } },
    { key: 'google', name: 'Google', category: 'productivity', manifest: {} },
    {
      key: 'google_drive',
      name: 'Google Drive',
      category: 'storage',
      manifest: {
        scopes: [
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/drive.readonly',
        ],
        actions: ['import', 'export', 'list'],
      },
    },
  ];
  for (const provider of integrationProviders) {
    await prisma.integrationProvider.upsert({
      where: { key: provider.key },
      create: provider,
      update: { name: provider.name, category: provider.category, manifest: provider.manifest },
    });
  }

  console.log('Seeded permissions catalog, starter plan, and integration providers');

  // Demo org for local dev (optional — skip if exists)
  const demoSlug = 'demo-agency';
  const existing = await prisma.organization.findUnique({
    where: { slug: demoSlug },
  });
  if (!existing) {
    const org = await prisma.organization.create({
      data: { name: 'Demo Agency', slug: demoSlug, status: 'TRIAL' },
    });
    const user = await prisma.user.create({
      data: {
        email: 'owner@demo.agency',
        passwordHash: '$2b$12$placeholder', // login via register in dev
        firstName: 'Demo',
        lastName: 'Owner',
      },
    });
    await prisma.workspace.create({
      data: {
        organizationId: org.id,
        name: 'Default',
        slug: 'default',
        isDefault: true,
      },
    });
    const membership = await prisma.organizationMembership.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        type: 'OWNER',
        status: 'ACTIVE',
      },
    });
    const perms = await prisma.permission.findMany({
      where: { key: { in: ownerPermissions } },
    });
    const ownerRole = await prisma.role.create({
      data: {
        organizationId: org.id,
        name: 'Owner',
        isSystem: true,
        permissions: {
          create: perms.map((p) => ({
            permissionId: p.id,
            effect: 'ALLOW',
          })),
        },
      },
    });
    await prisma.roleAssignment.create({
      data: {
        organizationId: org.id,
        membershipId: membership.id,
        roleId: ownerRole.id,
        scopes: {
          create: [{ organizationId: org.id, scopeType: 'ORGANIZATION' }],
        },
      },
    });
    await prisma.subscription.create({
      data: {
        organizationId: org.id,
        planVersionId: planVersion.id,
        status: 'TRIALING',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 14 * 86400000),
        trialEndsAt: new Date(Date.now() + 14 * 86400000),
      },
    });
    console.log(`Created demo org: ${demoSlug}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
