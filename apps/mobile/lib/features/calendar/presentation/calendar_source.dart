import 'package:flutter/material.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';

String calendarSourceLabel(AppLocalizations l10n, String type) => l10n.calendarSource(type);

StatusTone calendarSourceTone(String type) => switch (type) {
      CalendarSourceTypes.content => StatusTone.violet,
      CalendarSourceTypes.task => StatusTone.info,
      CalendarSourceTypes.meeting => StatusTone.success,
      CalendarSourceTypes.deadline => StatusTone.danger,
      _ => StatusTone.neutral,
    };

IconData calendarSourceIcon(String type) => switch (type) {
      CalendarSourceTypes.content => Icons.campaign_outlined,
      CalendarSourceTypes.task => Icons.task_alt_outlined,
      CalendarSourceTypes.meeting => Icons.groups_outlined,
      CalendarSourceTypes.deadline => Icons.flag_outlined,
      _ => Icons.event_outlined,
    };
