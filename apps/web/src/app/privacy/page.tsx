import type { Metadata } from 'next';
import type { MessageKey } from '@/shared/i18n/t';
import { t } from '@/shared/i18n/t';
import { LegalDocument } from '@/features/marketing/components/legal-document';

export const metadata: Metadata = { title: t('legal.privacy.meta') };

const SECTIONS: Array<{ title: MessageKey; body: MessageKey }> = [
  { title: 'legal.privacy.s1.title', body: 'legal.privacy.s1.body' },
  { title: 'legal.privacy.s2.title', body: 'legal.privacy.s2.body' },
  { title: 'legal.privacy.s3.title', body: 'legal.privacy.s3.body' },
  { title: 'legal.privacy.s4.title', body: 'legal.privacy.s4.body' },
  { title: 'legal.privacy.s5.title', body: 'legal.privacy.s5.body' },
  { title: 'legal.privacy.s6.title', body: 'legal.privacy.s6.body' },
  { title: 'legal.privacy.s7.title', body: 'legal.privacy.s7.body' },
  { title: 'legal.privacy.s8.title', body: 'legal.privacy.s8.body' },
  { title: 'legal.privacy.s9.title', body: 'legal.privacy.s9.body' },
  { title: 'legal.privacy.s10.title', body: 'legal.privacy.s10.body' },
];

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="legal.privacy.title"
      lead="legal.privacy.lead"
      updated="9 Oct 2026"
      sections={SECTIONS}
    />
  );
}
