import 'package:flutter/material.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';

String articleCategoryLabel(AppLocalizations l10n, String category) => l10n.knowledgeCategory(category);

/// Same tones as the web's `CATEGORY_META`.
StatusTone articleCategoryTone(String category) => switch (category) {
      ArticleCategories.sop => StatusTone.neutral,
      ArticleCategories.playbook => StatusTone.warning,
      ArticleCategories.template => StatusTone.info,
      ArticleCategories.policy => StatusTone.violet,
      ArticleCategories.onboarding => StatusTone.pink,
      _ => StatusTone.neutral,
    };

IconData articleCategoryIcon(String category) => switch (category) {
      ArticleCategories.sop => Icons.fact_check_outlined,
      ArticleCategories.playbook => Icons.lightbulb_outline,
      ArticleCategories.template => Icons.description_outlined,
      ArticleCategories.policy => Icons.verified_user_outlined,
      ArticleCategories.onboarding => Icons.school_outlined,
      _ => Icons.article_outlined,
    };
