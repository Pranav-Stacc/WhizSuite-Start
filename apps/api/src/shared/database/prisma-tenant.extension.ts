import { Prisma } from '@prisma/client';
import { TenantContext } from '../tenant/tenant.context';

const READ_ACTIONS = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'findUnique',
  'findUniqueOrThrow',
  'count',
  'aggregate',
  'groupBy',
  'delete',
  'deleteMany',
]);

const WRITE_ACTIONS = new Set(['create', 'createMany', 'update', 'updateMany', 'upsert']);

const TENANT_MODELS = new Set(
  Prisma.dmmf.datamodel.models
    .filter((model) => model.fields.some((field) => field.name === 'organizationId'))
    .map((model) => model.name),
);

function mergeOrgWhere<T extends { where?: Record<string, unknown> }>(
  args: T,
  organizationId: string,
): T {
  const where = args.where ?? {};
  return { ...args, where: { ...where, organizationId } };
}

function mergeOrgData<T extends { data: Record<string, unknown> | Record<string, unknown>[] }>(
  args: T,
  organizationId: string,
): T {
  const data = args.data;
  if (Array.isArray(data)) {
    return {
      ...args,
      data: data.map((row) => ({ ...row, organizationId: row.organizationId ?? organizationId })),
    };
  }
  return {
    ...args,
    data: { ...data, organizationId: data.organizationId ?? organizationId },
  };
}

type RlsExecutor = {
  $executeRawUnsafe: (sql: string, ...values: unknown[]) => Promise<number>;
};

export function prismaTenantExtension(rlsExecutor: RlsExecutor) {
  return Prisma.defineExtension({
    name: 'tenant-scope',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!TENANT_MODELS.has(model)) {
            return query(args);
          }

          const ctx = TenantContext.get();
          if (ctx?.skipPrismaTenantScope) {
            return query(args);
          }

          const organizationId = ctx?.organizationId;
          if (!organizationId) {
            return query(args);
          }

          await rlsExecutor.$executeRawUnsafe(
            `SELECT set_config('app.current_org_id', $1, true)`,
            organizationId,
          );

          let nextArgs = args;
          if (READ_ACTIONS.has(operation)) {
            nextArgs = mergeOrgWhere(args as { where?: Record<string, unknown> }, organizationId);
          } else if (WRITE_ACTIONS.has(operation)) {
            if (operation === 'update' || operation === 'updateMany' || operation === 'upsert') {
              nextArgs = mergeOrgWhere(
                mergeOrgData(
                  args as { data: Record<string, unknown>; where?: Record<string, unknown> },
                  organizationId,
                ),
                organizationId,
              );
            } else {
              nextArgs = mergeOrgData(args as { data: Record<string, unknown> }, organizationId);
            }
          }

          return query(nextArgs);
        },
      },
    },
  });
}
