import type { ReactNode } from 'react';
import { ArticleCategories } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { FormDialog, type FieldDef } from '@/shared/forms/form-dialog';
import { ConfirmButton } from '@/shared/ui/confirm-button';
import { createArticleAction, deleteArticleAction, updateArticleAction } from '../actions/article.actions';
import type { Article } from '../data/knowledge.repository';

interface ArticleDialogProps {
  article?: Article;
  trigger?: ReactNode;
  defaultOpen?: boolean;
}

export function ArticleDialog({ article, trigger, defaultOpen }: ArticleDialogProps) {
  const fields: FieldDef[] = [
    { name: 'title', label: t('knowledge.field.title'), placeholder: t('knowledge.field.title.placeholder'), required: true, span: 2 },
    {
      name: 'category',
      label: t('knowledge.field.category'),
      type: 'select',
      required: true,
      options: ArticleCategories.map((value) => ({ value, label: t(`knowledge.category.${value}`) })),
      span: 2,
    },
    { name: 'body', label: t('knowledge.field.body'), type: 'textarea', rows: 10, required: true, hint: t('knowledge.field.body.hint'), placeholder: t('knowledge.field.body.placeholder'), span: 2 },
  ];

  return (
    <FormDialog
      key={article?.id ?? 'new'}
      schema="article"
      title={article ? t('knowledge.edit') : t('knowledge.create.title')}
      description={article ? t('knowledge.edit.desc') : t('knowledge.create.desc')}
      submitLabel={article ? t('common.save') : t('knowledge.publish')}
      fields={fields}
      defaults={article ? { title: article.title, category: article.category, body: article.body } : { title: '', category: 'SOP', body: '' }}
      action={article ? updateArticleAction.bind(null, article.id) : createArticleAction}
      trigger={trigger}
      defaultOpen={defaultOpen}
      footerExtra={article ? <ConfirmButton action={deleteArticleAction.bind(null, article.id)} label={t('knowledge.delete')} redirectTo="/knowledge" /> : undefined}
    />
  );
}
