import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/formatting/formats.dart';
import '../../../../core/theme/app_tokens.dart';
import '../../../../core/widgets/state_views.dart';
import '../../../../l10n/app_localizations.dart';
import '../../../time/application/time_controller.dart';
import '../../../time/domain/time_entry.dart';
import '../../domain/member.dart';

class MemberTimeTab extends ConsumerWidget {
  const MemberTimeTab({required this.member, super.key});

  final Member member;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final formats = context.formats;
    final entries = ref.watch(timeEntriesProvider);
    return entries.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => ErrorState(error: e, onRetry: () => ref.invalidate(timeEntriesProvider)),
      data: (all) {
        final mine = all.where((e) => e.userId == member.userId).toList()
          ..sort((a, b) => b.startedAt.compareTo(a.startedAt));
        if (mine.isEmpty) {
          return EmptyState(icon: Icons.schedule_outlined, title: l10n.memberTimeEmpty);
        }
        final totalMinutes = mine.fold<int>(0, (sum, e) => sum + e.minutes);
        return ListView(
          padding: EdgeInsets.all(tokens.lg),
          children: [
            Text(
              l10n.memberHoursLogged(formats.duration(totalMinutes)),
              style: Theme.of(context).textTheme.titleMedium,
            ),
            SizedBox(height: tokens.md),
            for (final (i, entry) in mine.indexed) ...[
              if (i > 0) Divider(height: 1, color: tokens.border),
              _TimeRow(entry: entry, formats: formats),
            ],
          ],
        );
      },
    );
  }
}

class _TimeRow extends StatelessWidget {
  const _TimeRow({required this.entry, required this.formats});

  final TimeEntry entry;
  final AppFormats formats;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(Icons.timer_outlined, color: tokens.muted),
      title: Text(formats.duration(entry.minutes)),
      subtitle: Text(formats.dateTime(entry.startedAt)),
      trailing: entry.billable ? const Icon(Icons.paid_outlined, size: 18) : null,
    );
  }
}
