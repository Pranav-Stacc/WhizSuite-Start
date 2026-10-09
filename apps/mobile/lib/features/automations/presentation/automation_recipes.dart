import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../application/automations_controller.dart';
import '../domain/automation.dart';
import '../domain/automation_recipe.dart';

/// Recipes whose trigger/action pair is not automated yet.
List<AutomationRecipe> availableRecipes(List<Automation> existing) {
  final taken = {for (final a in existing) '${a.trigger}>${a.action}'};
  return automationRecipes.where((r) => !taken.contains('${r.trigger}>${r.action}')).toList();
}

/// Horizontally scrolling gallery of one-tap automation recipes.
class AutomationRecipeStrip extends StatelessWidget {
  const AutomationRecipeStrip({required this.recipes, super.key});

  static const _cardWidth = 260.0;
  static const _height = 168.0;

  final List<AutomationRecipe> recipes;

  @override
  Widget build(BuildContext context) {
    if (recipes.isEmpty) return const SizedBox.shrink();
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    return PermissionGate(
      anyOf: const [Permissions.automationsManage],
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SectionHeader(title: l10n.automationRecipesTitle),
          SizedBox(
            height: _height,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: recipes.length,
              separatorBuilder: (_, _) => SizedBox(width: tokens.md),
              itemBuilder: (context, index) => SizedBox(width: _cardWidth, child: _RecipeCard(recipe: recipes[index])),
            ),
          ),
        ],
      ),
    );
  }
}

class _RecipeCard extends ConsumerStatefulWidget {
  const _RecipeCard({required this.recipe});

  final AutomationRecipe recipe;

  @override
  ConsumerState<_RecipeCard> createState() => _RecipeCardState();
}

class _RecipeCardState extends ConsumerState<_RecipeCard> {
  bool _adding = false;

  Future<void> _add() async {
    final l10n = AppLocalizations.of(context);
    final recipe = widget.recipe;
    setState(() => _adding = true);
    await runAction(
      context,
      () => ref.read(automationsActionsProvider).create(
            AutomationInput(
              name: l10n.automationRecipeName(recipe.id),
              trigger: recipe.trigger,
              action: recipe.action,
              enabled: true,
            ),
          ),
      success: l10n.createdToast,
    );
    if (mounted) setState(() => _adding = false);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final recipe = widget.recipe;
    return SurfaceCard(
      padding: EdgeInsets.all(tokens.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(l10n.automationRecipeName(recipe.id), maxLines: 2, overflow: TextOverflow.ellipsis, style: text.titleSmall),
          SizedBox(height: tokens.xs),
          Expanded(
            child: Text(
              l10n.automationRecipeDescription(recipe.id),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: text.bodySmall?.copyWith(color: tokens.muted),
            ),
          ),
          Row(
            children: [
              Icon(Icons.bolt, size: 16, color: tokens.muted),
              const Spacer(),
              TextButton.icon(
                onPressed: _adding ? null : _add,
                icon: _adding
                    ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.add, size: 18),
                label: Text(l10n.automationRecipeAdd),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
