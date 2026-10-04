'use client';

import { useTransition, type ReactNode } from 'react';
import { ChevronDown, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ActionResult } from '@/shared/data/action-result';
import { Button } from './button';
import { Menu } from './overlays';

interface StatusMenuProps {
  current: string;
  label: string;
  options: Array<{ value: string; label: string; color: string }>;
  action: (value: string) => Promise<ActionResult>;
  /** Visible trigger content; defaults to the label of the current option. */
  children?: ReactNode;
}

/** Dropdown for changing a record's status in one click, with toast feedback. */
export function StatusMenu({ current, label, options, action, children }: StatusMenuProps) {
  const [pending, startTransition] = useTransition();
  const active = options.find((o) => o.value === current);

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button variant="secondary" size="sm" aria-label={label} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <span className="size-2 rounded-full" style={{ background: active?.color }} />}
          {children ?? active?.label}
          <ChevronDown />
        </Button>
      </Menu.Trigger>
      <Menu.Content>
        <Menu.Label>{label}</Menu.Label>
        {options.map((option) => (
          <Menu.Item
            key={option.value}
            onSelect={() =>
              startTransition(async () => {
                if (option.value === current) return;
                const result = await action(option.value);
                if (result.ok) toast.success(result.message ?? option.label);
                else toast.error(result.message);
              })
            }
          >
            <span className="size-2 rounded-full" style={{ background: option.color }} />
            <span className="flex-1">{option.label}</span>
            {option.value === current ? <Check className="!text-primary" /> : null}
          </Menu.Item>
        ))}
      </Menu.Content>
    </Menu.Root>
  );
}
