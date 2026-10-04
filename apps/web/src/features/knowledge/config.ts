import { BookCheck, FileText, GraduationCap, Lightbulb, ShieldCheck, type LucideIcon } from 'lucide-react';
import type { ArticleCategory } from '@agency-os/contracts';
import type { BadgeTone } from '@/shared/ui/badge';

export const CATEGORY_META: Record<ArticleCategory, { icon: LucideIcon; tone: BadgeTone }> = {
  SOP: { icon: BookCheck, tone: 'primary' },
  PLAYBOOK: { icon: Lightbulb, tone: 'warning' },
  TEMPLATE: { icon: FileText, tone: 'info' },
  POLICY: { icon: ShieldCheck, tone: 'violet' },
  ONBOARDING: { icon: GraduationCap, tone: 'pink' },
};

export const WORDS_PER_MINUTE = 200;
export const EXCERPT_LENGTH = 130;
