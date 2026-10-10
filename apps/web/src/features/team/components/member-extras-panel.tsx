'use client';

import { useMemo, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AccessRoleSummary } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { humanizeKey } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import type { PermissionRow } from '@/features/roles/services/permissions.service';
import { syncMemberExtraPermissionsAction } from '../actions/member.actions';
import { PERSONAL_ACCESS_PREFIX } from '../config';

interface MemberExtrasPanelProps {
  memberId: string;
  memberName: string;
  assignedRoleIds: string[];
  /** Permission keys granted by non-personal roles (locked on). */
  lockedKeys: string[];
  /** Permission keys currently on the personal extras role. */
  extraKeys: string[];
  catalog: PermissionRow[];
  assignable: AccessRoleSummary[];
}

/** Toggle individual extra permissions on top of the member's assigned roles. */
export function MemberExtrasPanel({
  memberId,
  memberName,
  assignedRoleIds,
  lockedKeys,
  extraKeys,
  catalog,
  assignable,
}: MemberExtrasPanelProps) {
  const locked = useMemo(() => new Set(lockedKeys), [lockedKeys]);
  const [extras, setExtras] = useState<Set<string>>(() => new Set(extraKeys));
  const [pending, startTransition] = useTransition();

  const grouped = useMemo(() => {
    const map = new Map<string, PermissionRow[]>();
    for (const perm of catalog) {
      const list = map.get(perm.category) ?? [];
      list.push(perm);
      map.set(perm.category, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [catalog]);

  const baseline = useMemo(() => new Set(extraKeys), [extraKeys]);
  const dirty = extras.size !== baseline.size || [...extras].some((key) => !baseline.has(key));

  const toggle = (key: string) => {
    if (locked.has(key)) return;
    setExtras((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const save = () => {
    startTransition(async () => {
      const result = await syncMemberExtraPermissionsAction(memberId, {
        memberName,
        roleIds: assignedRoleIds.filter((id) => {
          const role = assignable.find((r) => r.id === id);
          return !role?.name.startsWith(PERSONAL_ACCESS_PREFIX);
        }),
        permissionKeys: [...extras],
      });
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  };

  if (catalog.length === 0) return null;

  return (
    <div className="space-y-3 border-t border-border-soft pt-4">
      <p className="text-xs text-muted">{t('team.detail.extras.hint')}</p>
      <div className="max-h-[36vh] space-y-3 overflow-y-auto rounded-xl border border-border-soft p-3">
        {grouped.map(([category, perms]) => (
          <section key={category}>
            <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{humanizeKey(category)}</h4>
            <ul className="grid gap-1 sm:grid-cols-2">
              {perms.map((perm) => {
                const isLocked = locked.has(perm.key);
                const checked = isLocked || extras.has(perm.key);
                return (
                  <li key={perm.key}>
                    <label
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs',
                        isLocked ? 'cursor-default opacity-70' : 'cursor-pointer hover:bg-surface-2',
                        checked && 'bg-primary/10',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isLocked}
                        onChange={() => toggle(perm.key)}
                        className="size-3.5 accent-primary"
                      />
                      <span className="truncate">{humanizeKey(perm.key)}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      <Button variant="primary" size="sm" disabled={pending || !dirty} onClick={save}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {t('team.detail.extras.save')}
      </Button>
    </div>
  );
}
