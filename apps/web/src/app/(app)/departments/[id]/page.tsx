import { Permissions } from '@agency-os/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Building2, Plus, Users } from 'lucide-react';
import { requirePermission } from '@/shared/auth/permissions';
import { t } from '@/shared/i18n/t';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { PageHeader } from '@/shared/ui/page-header';
import { CreateDesignationDialog } from '@/features/departments/components/create-designation-dialog';
import { getDepartment, listDepartments } from '@/features/departments/services/departments.service';
import { listMembers } from '@/features/team/services/members.service';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const dept = await getDepartment((await params).id);
  return { title: dept?.name ?? t('departments.title') };
}

export default async function DepartmentDetailPage({ params }: PageProps) {
  await requirePermission(Permissions.ORG_VIEW);
  const { id } = await params;
  const department = await getDepartment(id);
  if (!department) notFound();

  const [members, allDepartments] = await Promise.all([listMembers(), listDepartments()]);
  const designationIds = new Set(department.designations.map((d) => d.id));
  const membersHere = members.filter((member) =>
    member.positions?.some((position) => designationIds.has(position.designationId)),
  );

  const parent = department.parentId ? allDepartments.find((d) => d.id === department.parentId) : undefined;

  return (
    <div className="space-y-8">
      <PageHeader
        title={department.name}
        description={parent ? `${parent.name} › ${department.name}` : department.path.replaceAll('/', ' › ')}
        eyebrow={
          <Link href="/departments" className="inline-flex items-center gap-1.5 text-muted hover:text-foreground">
            <ArrowLeft className="size-3.5" />
            {t('departments.detail.back')}
          </Link>
        }
        actions={
          <CreateDesignationDialog
            departmentId={department.id}
            trigger={
              <Button variant="primary">
                <Plus />
                {t('departments.designation.create')}
              </Button>
            }
          />
        }
      />

      <section className="card-surface space-y-4 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Building2 className="size-4" />
          {t('departments.designations')}
        </h2>
        {department.designations.length === 0 ? (
          <p className="text-sm text-muted">{t('departments.designations.empty')}</p>
        ) : (
          <ul className="divide-y divide-border">
            {department.designations.map((designation) => (
              <li key={designation.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-medium">{designation.name}</p>
                  <p className="text-xs text-muted">{t('departments.headcount', { count: designation.memberCount })}</p>
                </div>
                {designation.isHead ? <Badge tone="info">{t('departments.designation.head')}</Badge> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card-surface space-y-4 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Users className="size-4" />
          {t('departments.members')}
        </h2>
        {membersHere.length === 0 ? (
          <p className="text-sm text-muted">{t('departments.members.empty')}</p>
        ) : (
          <ul className="divide-y divide-border">
            {membersHere.map((member) => (
              <li key={member.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <Link href={`/team/${member.id}`} className="font-medium hover:underline">
                    {member.name}
                  </Link>
                  <p className="text-xs text-muted">{member.email}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-1">
                  {member.positions
                    ?.filter((p) => designationIds.has(p.designationId))
                    .map((p) => (
                      <Badge key={p.designationId} tone="neutral">{p.name}</Badge>
                    ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
