import type { Metadata } from 'next';
import type { MessageKey } from '@/shared/i18n/t';
import { t } from '@/shared/i18n/t';
import { LegalDocument } from '@/features/marketing/components/legal-document';

export const metadata: Metadata = { title: t('legal.terms.meta') };

const SECTIONS: Array<{ title: MessageKey; body: MessageKey }> = [
  { title: 'legal.terms.s1.title', body: 'legal.terms.s1.body' },
  { title: 'legal.terms.s2.title', body: 'legal.terms.s2.body' },
  { title: 'legal.terms.s3.title', body: 'legal.terms.s3.body' },
  { title: 'legal.terms.s4.title', body: 'legal.terms.s4.body' },
  { title: 'legal.terms.s5.title', body: 'legal.terms.s5.body' },
  { title: 'legal.terms.s6.title', body: 'legal.terms.s6.body' },
  { title: 'legal.terms.s7.title', body: 'legal.terms.s7.body' },
  { title: 'legal.terms.s8.title', body: 'legal.terms.s8.body' },
  { title: 'legal.terms.s9.title', body: 'legal.terms.s9.body' },
  { title: 'legal.terms.s10.title', body: 'legal.terms.s10.body' },
  { title: 'legal.terms.s11.title', body: 'legal.terms.s11.body' },
  { title: 'legal.terms.s12.title', body: 'legal.terms.s12.body' },
];

export default function TermsPage() {
  return (
    <LegalDocument
      title="legal.terms.title"
      lead="legal.terms.lead"
      updated="9 Oct 2026"
      sections={SECTIONS}
    />
  );
}
