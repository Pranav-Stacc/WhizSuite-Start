import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/forms/validators.dart';
import '../../../core/widgets/forms.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../application/content_controller.dart';
import '../domain/content.dart';

/// Renders [child] only when the member holds every permission in [allOf].
class AllPermissionsGate extends StatelessWidget {
  const AllPermissionsGate({required this.allOf, required this.child, this.fallback, super.key});

  final List<String> allOf;
  final Widget child;
  final Widget? fallback;

  @override
  Widget build(BuildContext context) => allOf.reversed.fold(
        child,
        (inner, permission) => PermissionGate(anyOf: [permission], fallback: fallback, child: inner),
      );
}

/// Picks (or changes) the publish date. With [markScheduled], approved content also moves to scheduled.
Future<bool> showScheduleSheet(BuildContext context, WidgetRef ref, Content content, {required bool markScheduled}) {
  final l10n = AppLocalizations.of(context);
  final now = DateTime.now();
  final initial = content.scheduledAt?.toLocal();
  var when = initial != null && initial.isAfter(now) ? initial : null;
  return showFormSheet(
    context,
    title: markScheduled ? l10n.contentScheduleTitle : l10n.contentRescheduleTitle,
    submitLabel: markScheduled ? l10n.contentActionSchedule : l10n.save,
    fields: (context, setState) => [
      Text(l10n.contentScheduleBody, style: Theme.of(context).textTheme.bodyMedium),
      DateField(
        label: l10n.contentFieldScheduledAt,
        value: when,
        withTime: true,
        required: true,
        firstDate: DateTime(now.year, now.month, now.day),
        onChanged: (value) => setState(() => when = value),
      ),
    ],
    onSubmit: () async {
      final at = when;
      if (at == null) return;
      await ref.read(contentActionsProvider).schedule(content, at, markScheduled: markScheduled);
    },
  );
}

/// Asks for the reviewer's note (required for changes / reject) then records the decision.
Future<bool> showReviewSheet(
  BuildContext context,
  WidgetRef ref, {
  required Content content,
  required String outcome,
  required bool withNote,
}) {
  final l10n = AppLocalizations.of(context);
  final note = TextEditingController();
  final title = content.title.isEmpty ? l10n.contentUntitled : content.title;
  final rejecting = outcome == ContentReviewOutcomes.draft;
  return showFormSheet(
    context,
    title: rejecting ? l10n.contentReviewRejectTitle(title) : l10n.contentReviewChangesTitle(title),
    submitLabel: rejecting ? l10n.contentActionReject : l10n.contentActionRequestChanges,
    fields: (context, _) => [
      Text(
        rejecting ? l10n.contentReviewRejectBody : l10n.contentReviewChangesBody,
        style: Theme.of(context).textTheme.bodyMedium,
      ),
      if (withNote)
        TextFormField(
          controller: note,
          autofocus: true,
          minLines: 3,
          maxLines: 6,
          maxLength: feedbackCommentMaxLengthDefault,
          decoration: InputDecoration(labelText: l10n.contentReviewNote, hintText: l10n.contentReviewNoteHint),
          validator: Validators(l10n).required,
        ),
    ],
    onSubmit: () => ref.read(contentActionsProvider).review(content.id, outcome, note: withNote ? note.text : null),
  );
}
