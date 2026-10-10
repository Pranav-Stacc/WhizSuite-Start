import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/contracts/contracts.g.dart';
import '../../core/theme/app_tokens.dart';
import '../../core/widgets/fade_slide_in.dart';
import '../../core/widgets/feedback.dart';
import '../../core/widgets/surfaces.dart';
import '../../features/access/application/access_controller.dart';
import '../../features/calendar/presentation/plan_shoot_sheet.dart';
import '../../features/clients/presentation/client_forms.dart';
import '../../features/content/content_routes.dart';
import '../../features/invoices/invoices_routes.dart';
import '../../features/leads/presentation/lead_forms.dart';
import '../../features/projects/presentation/project_forms.dart';
import '../../features/tasks/presentation/task_forms.dart';
import '../../l10n/app_localizations.dart';

typedef _QuickAction = ({
  String permission,
  IconData icon,
  Color Function(AppTokens) tint,
  String Function(AppLocalizations) label,
  Future<void> Function(BuildContext context, WidgetRef ref) run,
});

/// Permission-gated create shortcuts matching web QUICK_CREATE (+ Plan shoot).
Future<void> showQuickCreateSheet(BuildContext context, WidgetRef ref) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    useSafeArea: true,
    builder: (_) => const _QuickCreateSheet(),
  );
}

class _QuickCreateSheet extends ConsumerWidget {
  const _QuickCreateSheet();

  static List<_QuickAction> _actions(AppLocalizations l10n) => [
        (
          permission: Permissions.tasksCreate,
          icon: Icons.check_box_outlined,
          tint: (t) => t.primary,
          label: (l) => l.quickCreateTask,
          run: (context, ref) async {
            final created = await showTaskForm(context, ref);
            if (created && context.mounted) showToast(context, l10n.createdToast);
          },
        ),
        (
          permission: Permissions.contentCreate,
          icon: Icons.auto_awesome_outlined,
          tint: (t) => t.secondary,
          label: (l) => l.quickCreateContent,
          run: (context, ref) async {
            final router = GoRouter.of(context);
            Navigator.pop(context);
            router.push(ContentRoutes.compose());
          },
        ),
        (
          permission: Permissions.projectsCreate,
          icon: Icons.folder_outlined,
          tint: (t) => t.primary,
          label: (l) => l.quickCreateProject,
          run: (context, ref) async {
            final id = await showProjectForm(context, ref);
            if (id != null && context.mounted) showToast(context, l10n.createdToast);
          },
        ),
        (
          permission: Permissions.clientsCreate,
          icon: Icons.business_outlined,
          tint: (t) => t.secondary,
          label: (l) => l.quickCreateClient,
          run: (context, ref) async {
            final created = await showClientForm(context, ref);
            if (created && context.mounted) showToast(context, l10n.createdToast);
          },
        ),
        (
          permission: Permissions.leadsCreate,
          icon: Icons.gps_fixed_outlined,
          tint: (t) => t.primary,
          label: (l) => l.quickCreateLead,
          run: (context, ref) async {
            final created = await showLeadForm(context, ref);
            if (created && context.mounted) showToast(context, l10n.createdToast);
          },
        ),
        (
          permission: Permissions.invoicesCreate,
          icon: Icons.receipt_long_outlined,
          tint: (t) => t.secondary,
          label: (l) => l.quickCreateInvoice,
          run: (context, ref) async {
            final router = GoRouter.of(context);
            Navigator.pop(context);
            router.push(InvoicesRoutes.create);
          },
        ),
        (
          permission: Permissions.projectsCreate,
          icon: Icons.camera_alt_outlined,
          tint: (t) => t.primary,
          label: (l) => l.quickCreateShoot,
          run: (context, ref) async {
            final created = await showPlanShootSheet(context, ref);
            if (created && context.mounted) showToast(context, l10n.createdToast);
          },
        ),
      ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final policy = ref.watch(accessPolicyProvider);
    final actions = [for (final action in _actions(l10n)) if (policy.can(action.permission)) action];

    return Padding(
      padding: EdgeInsets.fromLTRB(tokens.lg, 0, tokens.lg, tokens.xl),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          FadeSlideIn(
            child: Text(l10n.quickCreateTitle, style: Theme.of(context).textTheme.titleLarge),
          ),
          SizedBox(height: tokens.xs),
          FadeSlideIn(
            index: 1,
            child: Text(
              l10n.quickCreateSubtitle,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: tokens.muted),
            ),
          ),
          SizedBox(height: tokens.lg),
          if (actions.isEmpty)
            Padding(
              padding: EdgeInsets.symmetric(vertical: tokens.xl),
              child: Text(
                l10n.quickCreateEmpty,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: tokens.muted),
              ),
            )
          else
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: actions.length,
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: MediaQuery.sizeOf(context).width >= 560 ? 4 : 3,
                mainAxisSpacing: tokens.md,
                crossAxisSpacing: tokens.md,
                childAspectRatio: 0.95,
              ),
              itemBuilder: (context, index) {
                final action = actions[index];
                final tint = action.tint(tokens);
                return FadeSlideIn(
                  index: index + 2,
                  child: SurfaceCard(
                    onTap: () async {
                      // Content/invoice navigate themselves after popping this sheet.
                      final navigatesAway = action.permission == Permissions.contentCreate ||
                          action.permission == Permissions.invoicesCreate;
                      await action.run(context, ref);
                      if (!navigatesAway && context.mounted) Navigator.pop(context);
                    },
                    padding: EdgeInsets.all(tokens.md),
                    semanticLabel: action.label(l10n),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        CircleAvatar(
                          backgroundColor: tint.withValues(alpha: 0.12),
                          child: Icon(action.icon, color: tint),
                        ),
                        SizedBox(height: tokens.sm),
                        Text(
                          action.label(l10n),
                          textAlign: TextAlign.center,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.labelLarge,
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
        ],
      ),
    );
  }
}

/// App-bar entry that opens [showQuickCreateSheet] when the member can create anything.
class QuickCreateAction extends ConsumerWidget {
  const QuickCreateAction({super.key});

  static const _permissions = [
    Permissions.tasksCreate,
    Permissions.contentCreate,
    Permissions.projectsCreate,
    Permissions.clientsCreate,
    Permissions.leadsCreate,
    Permissions.invoicesCreate,
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final allowed = ref.watch(accessPolicyProvider.select((p) => p.canAny(_permissions)));
    if (!allowed) return const SizedBox.shrink();
    return IconButton(
      tooltip: AppLocalizations.of(context).quickCreateTitle,
      icon: const Icon(Icons.add_circle_outline),
      onPressed: () => showQuickCreateSheet(context, ref),
    );
  }
}
