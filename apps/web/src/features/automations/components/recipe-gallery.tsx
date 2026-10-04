import { Sparkles } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { ActionButton } from '@/shared/ui/action-button';
import { Card } from '@/shared/ui/card';
import { createAutomationFromRecipeAction } from '../actions/automation.actions';
import type { AutomationRecipe } from '../config';

export function RecipeGallery({ recipes }: { recipes: AutomationRecipe[] }) {
  if (recipes.length === 0) return null;
  return (
    <section aria-label={t('automations.recipes.title')} className="mb-6">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="size-4 text-primary" />
        {t('automations.recipes.title')}
      </h2>
      <p className="mb-3 text-[13px] text-muted">{t('automations.recipes.desc')}</p>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {recipes.map((recipe) => (
          <li key={recipe.id}>
            <Card className="flex h-full items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">{t(recipe.nameKey)}</p>
                <p className="text-xs text-muted">{t(recipe.descriptionKey)}</p>
              </div>
              <ActionButton action={createAutomationFromRecipeAction.bind(null, recipe.id)} label={t('common.add')} size="sm" variant="secondary" />
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
