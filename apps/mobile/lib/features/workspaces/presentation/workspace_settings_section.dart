import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/forms/validators.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/forms.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../application/workspace_providers.dart';

Future<void> _createWorkspace(BuildContext context, WidgetRef ref) async {
  final l10n = AppLocalizations.of(context);
  final name = TextEditingController();
  final slug = TextEditingController();
  var slugEdited = false;
  final slugPattern = RegExp(organizationSlugPattern);
  final slugSanitizer = RegExp('[^a-z0-9-]+');
  final validators = Validators(l10n);
  final actions = ref.read(workspaceActionsProvider);

  await showFormSheet(
    context,
    title: l10n.workspaceCreateTitle,
    submitLabel: l10n.create,
    fields: (context, setState) => [
      TextFormField(
        controller: name,
        autofocus: true,
        decoration: InputDecoration(labelText: l10n.workspaceNameField, hintText: l10n.workspaceNameHint),
        maxLength: 200,
        validator: validators.minLength(2),
        onChanged: (value) {
          if (slugEdited) return;
          setState(() {
            slug.text = value.trim().toLowerCase().replaceAll(slugSanitizer, '-').replaceAll(RegExp('^-+|-+\$'), '');
          });
        },
      ),
      TextFormField(
        controller: slug,
        decoration: InputDecoration(labelText: l10n.workspaceSlugField, hintText: l10n.authSlug),
        validator: validators.matches(slugPattern, l10n.validationSlug),
        onChanged: (_) => slugEdited = true,
      ),
    ],
    onSubmit: () => actions.create(name: name.text.trim(), slug: slug.text.trim().toLowerCase()),
  );
}

/// Lists workspaces and lets the member switch or create one.
class WorkspaceSettingsSection extends ConsumerWidget {
  const WorkspaceSettingsSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final workspaces = ref.watch(workspacesProvider);
    final activeId = ref.watch(activeWorkspaceIdProvider);

    return PermissionGate(
      anyOf: const [Permissions.workspacesView],
      child: Card(
        child: Padding(
          padding: EdgeInsets.symmetric(vertical: tokens.sm),
          child: AsyncValueView(
            value: workspaces,
            data: (entries) {
              if (entries.isEmpty) {
                return ListTile(
                  leading: const Icon(Icons.apartment_outlined),
                  title: Text(l10n.workspaceEmptyTitle),
                  subtitle: Text(l10n.workspaceEmptyBody, style: TextStyle(color: tokens.muted)),
                );
              }
              final selected = activeId.value;
              return Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.apartment_outlined),
                    title: Text(l10n.workspaceActiveTitle),
                    subtitle: Text(l10n.workspaceActiveBody, style: TextStyle(color: tokens.muted)),
                  ),
                  for (final entry in entries)
                    RadioListTile<String>(
                      value: entry.id,
                      groupValue: selected,
                      title: Text(entry.name),
                      onChanged: selected == entry.id
                          ? null
                          : (_) => runAction(
                                context,
                                () => ref.read(workspaceActionsProvider).select(entry.id),
                                success: l10n.workspaceSwitched(entry.name),
                              ),
                    ),
                  PermissionGate(
                    anyOf: const [Permissions.workspacesCreate],
                    child: Align(
                      alignment: AlignmentDirectional.centerStart,
                      child: TextButton.icon(
                        onPressed: () => _createWorkspace(context, ref),
                        icon: const Icon(Icons.add),
                        label: Text(l10n.workspaceCreateTitle),
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}
