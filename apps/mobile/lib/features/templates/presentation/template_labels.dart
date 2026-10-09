import 'package:flutter/material.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';

String templateTypeLabel(AppLocalizations l10n, String type) => l10n.templateType(type);

String templateScopeLabel(AppLocalizations l10n, String scope) => l10n.templateScope(scope);

/// What the template's checklist items represent for its type ("Tasks", "Sections"…).
String templateItemsLabel(AppLocalizations l10n, String type) => l10n.templateItems(type);

StatusTone templateTypeTone(String type) => switch (type) {
      TemplateTypes.project => StatusTone.info,
      TemplateTypes.task => StatusTone.success,
      TemplateTypes.content => StatusTone.pink,
      TemplateTypes.report => StatusTone.violet,
      TemplateTypes.message => StatusTone.warning,
      _ => StatusTone.neutral,
    };

IconData templateTypeIcon(String type) => switch (type) {
      TemplateTypes.project => Icons.folder_outlined,
      TemplateTypes.task => Icons.check_box_outlined,
      TemplateTypes.content => Icons.photo_library_outlined,
      TemplateTypes.report => Icons.insert_chart_outlined,
      TemplateTypes.message => Icons.chat_bubble_outline,
      _ => Icons.dashboard_customize_outlined,
    };
