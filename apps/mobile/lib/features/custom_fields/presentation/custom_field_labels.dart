import 'package:flutter/material.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../l10n/app_localizations.dart';

String customFieldEntityLabel(AppLocalizations l10n, String entityType) => l10n.customFieldEntity(entityType);

String customFieldTypeLabel(AppLocalizations l10n, String type) => l10n.customFieldType(type);

IconData customFieldTypeIcon(String type) => switch (type) {
      CustomFieldTypes.text => Icons.short_text,
      CustomFieldTypes.number => Icons.numbers,
      CustomFieldTypes.date => Icons.event_outlined,
      CustomFieldTypes.select => Icons.radio_button_checked,
      CustomFieldTypes.multiSelect => Icons.checklist,
      CustomFieldTypes.boolean => Icons.toggle_on_outlined,
      CustomFieldTypes.url => Icons.link,
      _ => Icons.tune,
    };

IconData customFieldEntityIcon(String entityType) => switch (entityType) {
      CustomFieldEntityTypes.client => Icons.business_outlined,
      CustomFieldEntityTypes.project => Icons.folder_outlined,
      CustomFieldEntityTypes.task => Icons.check_box_outlined,
      CustomFieldEntityTypes.content => Icons.photo_library_outlined,
      CustomFieldEntityTypes.lead => Icons.person_search_outlined,
      _ => Icons.tune,
    };
