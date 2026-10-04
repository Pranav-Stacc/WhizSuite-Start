'use client';

import type { ReactNode } from 'react';
import { Dialog, DropdownMenu, Popover as RadixPopover, Tooltip as RadixTooltip } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/i18n/t';

const overlayClass =
  'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-fade-in';

const MODAL_SIZES = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' } as const;

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: keyof typeof MODAL_SIZES;
  footer?: ReactNode;
}

export function Modal({ open, onOpenChange, title, description, children, size = 'md', footer }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlayClass} />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[calc(100vw-1.5rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl data-[state=open]:animate-pop',
            MODAL_SIZES[size],
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border-soft px-6 py-4">
            <div>
              <Dialog.Title className="text-lg font-semibold tracking-tight">{title}</Dialog.Title>
              {description ? <Dialog.Description className="mt-0.5 text-sm text-muted">{description}</Dialog.Description> : <Dialog.Description className="sr-only">{title}</Dialog.Description>}
            </div>
            <Dialog.Close className="rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-foreground" aria-label={t('common.close')}>
              <X className="size-4" />
            </Dialog.Close>
          </div>
          <div className="overflow-y-auto px-6 py-5">{children}</div>
          {footer ? <div className="flex justify-end gap-2 border-t border-border-soft bg-surface-2/50 px-6 py-3">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  width?: string;
}

/** Right-hand drawer for detail views that should not lose page context. */
export function Sheet({ open, onOpenChange, title, description, children, width = 'max-w-lg' }: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlayClass} />
        <Dialog.Content
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border bg-surface shadow-2xl data-[state=open]:animate-fade-in',
            width,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border-soft px-6 py-4">
            <div className="min-w-0">
              <Dialog.Title className="truncate text-lg font-semibold tracking-tight">{title}</Dialog.Title>
              {description ? <Dialog.Description className="mt-0.5 text-sm text-muted">{description}</Dialog.Description> : <Dialog.Description className="sr-only">{title}</Dialog.Description>}
            </div>
            <Dialog.Close className="rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-foreground" aria-label={t('common.close')}>
              <X className="size-4" />
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const menuContent =
  'z-50 min-w-48 overflow-hidden rounded-xl border border-border bg-surface/95 p-1.5 shadow-2xl backdrop-blur-xl data-[state=open]:animate-pop';
const menuItem =
  'flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground outline-none transition-colors data-[highlighted]:bg-primary/12 data-[highlighted]:text-primary data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:text-muted data-[highlighted]:[&_svg]:text-primary';

export const Menu = {
  Root: DropdownMenu.Root,
  Trigger: DropdownMenu.Trigger,
  Content: ({ className, ...props }: DropdownMenu.DropdownMenuContentProps) => (
    <DropdownMenu.Portal>
      <DropdownMenu.Content sideOffset={8} align="end" className={cn(menuContent, className)} {...props} />
    </DropdownMenu.Portal>
  ),
  Item: ({ className, ...props }: DropdownMenu.DropdownMenuItemProps) => <DropdownMenu.Item className={cn(menuItem, className)} {...props} />,
  Label: ({ className, ...props }: DropdownMenu.DropdownMenuLabelProps) => (
    <DropdownMenu.Label className={cn('px-2.5 py-1.5 text-xs font-medium uppercase tracking-wider text-muted', className)} {...props} />
  ),
  Separator: () => <DropdownMenu.Separator className="my-1.5 h-px bg-border-soft" />,
};

export const Popover = {
  Root: RadixPopover.Root,
  Trigger: RadixPopover.Trigger,
  Content: ({ className, ...props }: RadixPopover.PopoverContentProps) => (
    <RadixPopover.Portal>
      <RadixPopover.Content sideOffset={10} align="end" className={cn(menuContent, 'p-0', className)} {...props} />
    </RadixPopover.Portal>
  ),
};

export function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
  return (
    <RadixTooltip.Provider delayDuration={250}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            sideOffset={8}
            className="z-50 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground shadow-xl data-[state=delayed-open]:animate-pop"
          >
            {content}
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
