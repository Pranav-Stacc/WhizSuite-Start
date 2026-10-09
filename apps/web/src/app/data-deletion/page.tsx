import type { Metadata } from 'next';
import type { MessageKey } from '@/shared/i18n/t';
import { t } from '@/shared/i18n/t';
import { LegalDocument } from '@/features/marketing/components/legal-document';

export const metadata: Metadata = { title: t('legal.dataDeletion.meta') };

const SECTIONS: Array<{ title: MessageKey; body: MessageKey }> = [
  { title: 'legal.dataDeletion.s1.title', body: 'legal.dataDeletion.s1.body' },
  { title: 'legal.dataDeletion.s2.title', body: 'legal.dataDeletion.s2.body' },
  { title: 'legal.dataDeletion.s3.title', body: 'legal.dataDeletion.s3.body' },
  { title: 'legal.dataDeletion.s4.title', body: 'legal.dataDeletion.s4.body' },
];

export default function DataDeletionPage() {
  return (
    <LegalDocument
      title="legal.dataDeletion.title"
      lead="legal.dataDeletion.lead"
      updated="9 Oct 2026"
      sections={SECTIONS}
    />
  );
}
