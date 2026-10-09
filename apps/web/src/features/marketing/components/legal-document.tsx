import Link from 'next/link';
import type { MessageKey } from '@/shared/i18n/t';
import { t } from '@/shared/i18n/t';
import { MarketingFooter } from './marketing-footer';
import { MarketingHeader } from './marketing-header';
import { MarketingShell } from './marketing-shell';

interface LegalSection {
  title: MessageKey;
  body: MessageKey;
}

interface LegalDocumentProps {
  title: MessageKey;
  lead: MessageKey;
  updated: string;
  sections: LegalSection[];
}

export function LegalDocument({ title, lead, updated, sections }: LegalDocumentProps) {
  return (
    <MarketingShell>
      <MarketingHeader />
      <main id="main" className="mx-auto max-w-3xl px-6 py-16 lg:py-24">
        <Link href="/" className="nav-link">
          {t('legal.back')}
        </Link>
        <header className="mt-10 border-b border-border-soft pb-10">
          <p className="eyebrow">{t('legal.updated', { date: updated })}</p>
          <h1 className="display mt-4 text-4xl text-foreground sm:text-5xl">{t(title)}</h1>
          <p className="mt-4 text-base leading-relaxed text-muted">{t(lead)}</p>
        </header>
        <div className="divide-y divide-border-soft">
          {sections.map(({ title: sectionTitle, body }) => (
            <section key={sectionTitle} className="py-10">
              <h2 className="text-lg text-foreground">{t(sectionTitle)}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{t(body)}</p>
            </section>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </MarketingShell>
  );
}
