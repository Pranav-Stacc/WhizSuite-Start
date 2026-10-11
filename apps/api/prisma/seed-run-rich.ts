/**
 * Production ops entrypoint: rich demo org only (assumes base seed already ran).
 * Used by deploy/ops-ssm-production-seed.py with a volume mount — not wired into default seed.ts.
 */
import { PrismaClient } from '@prisma/client';
import { seedDemoRich } from './seed-demo-rich';

const prisma = new PrismaClient();

async function main() {
  const planVersion = await prisma.planVersion.findFirst({
    where: { version: 1 },
    orderBy: { createdAt: 'asc' },
  });
  if (!planVersion) {
    throw new Error('No plan version found — run base prisma seed first');
  }
  await seedDemoRich(prisma, planVersion.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
