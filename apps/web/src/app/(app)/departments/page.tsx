import type { Metadata } from 'next';
import { Building2, Plus, Users } from 'lucide-react';
import { requireRole } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { ROLES_OWNER } from '@/shared/navigation/nav-config';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/feedback';
import { PageHeader } from '@/shared/ui/page-header';
import { StatCard, StatGrid } from '@/shared/ui/stat-card';
import { CreateDepartmentDialog } from '@/features/departments/components/create-department-dialog';
import { listDepartments } from '@/features/departments/services/departments.service';

export const metadata: Metadata = { title: t('departments.title') };

export default async function DepartmentsPage() {
  await requireRole(ROLES_OWNER);
  const departments = await listDepartments();
  const headcount = departments.reduce((sum, d) => sum + d.headcount, 0);

  return (
    <div>
      <PageHeader
        title={t('departments.title')}
        description={t('departments.description')}
        actions={
          <CreateDepartmentDialog
            departments={departments}
            trigger={
              <Button variant="primary">
                <Plus className="size-4" />
                {t('departments.create')}
              </Button>
            }
          />
        }
      />
      <StatGrid cols={2}>
        <StatCard label={t('departments.stat.total')} value={departments.length} icon={<Building2 />} />
        <StatCard label={t('departments.stat.headcount')} value={headcount} icon={<Users />} />
      </StatGrid>
      {departments.length === 0 ? (
        <div className="card-surface mt-4">
          <EmptyState icon={<Building2 />} title={t('departments.empty.title')} body={t('departments.empty.body')} />
        </div>
      ) : null}
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((dept) => (
          <li key={dept.id}>
            <Card className="p-4">
              <h3 className="font-semibold">{dept.name}</h3>
              <p className="mt-1 text-xs text-muted">{dept.path}</p>
              <p className="mt-3 text-sm text-muted">{t('departments.headcount', { count: dept.headcount })}</p>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
