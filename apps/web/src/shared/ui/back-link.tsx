import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Button } from './button';

export function BackLink({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <Button variant="ghost" size="sm" asChild className={cn('print:hidden', className)}>
      <Link href={href}>
        <ArrowLeft />
        {label}
      </Link>
    </Button>
  );
}
