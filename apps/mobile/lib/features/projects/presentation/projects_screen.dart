import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/resource_list.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../../tasks/presentation/filter_menu_chip.dart';
import '../application/projects_controller.dart';
import '../domain/project.dart';
import '../projects_routes.dart';
import 'project_card.dart';
import 'project_forms.dart';
import 'project_status.dart';

class ProjectsScreen extends ConsumerStatefulWidget {
  const ProjectsScreen({super.key});

  static const _minTileWidth = 320.0;
  static const _tileHeight = 224.0;

  @override
  ConsumerState<ProjectsScreen> createState() => _ProjectsScreenState();
}

class _ProjectsScreenState extends ConsumerState<ProjectsScreen> {
  String? _status;
  String? _clientId;

  Future<void> _create() async {
    final l10n = AppLocalizations.of(context);
    final id = await showProjectForm(context, ref, clientId: _clientId);
    if (id == null || !mounted) return;
    showToast(context, l10n.createdToast);
    context.go(ProjectsRoutes.detail(id));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final projects = ref.watch(projectsProvider);
    final progress = ref.watch(projectProgressProvider).value;
    final clients = ref.watch(clientDirectoryProvider).value ?? Directory.empty;
    final items = projects.value ?? const <Project>[];
    final inClient = [for (final p in items) if (_clientId == null || p.clientId == _clientId) p];
    final clientOptions = {for (final p in items) p.clientId}.where((id) => clients[id] != null).toList()
      ..sort((a, b) => (clients.nameOf(a) ?? '').compareTo(clients.nameOf(b) ?? ''));

    return PageScaffold(
      title: l10n.projectsTitle,
      floatingActionButton: PermissionGate(
        anyOf: const [Permissions.projectsCreate],
        child: CreateFab(label: l10n.projectNew, onPressed: _create),
      ),
      body: ResourceList<Project>(
        value: projects,
        onRefresh: () {
          ref.invalidate(projectProgressProvider);
          return ref.refresh(projectsProvider.future);
        },
        minTileWidth: ProjectsScreen._minTileWidth,
        tileHeight: ProjectsScreen._tileHeight,
        searchHint: l10n.projectsSearch,
        matches: (project, query) =>
            project.name.toLowerCase().contains(query) ||
            (project.type?.toLowerCase().contains(query) ?? false) ||
            (clients.nameOf(project.clientId)?.toLowerCase().contains(query) ?? false),
        filter: (project) =>
            (_status == null || project.status == _status) && (_clientId == null || project.clientId == _clientId),
        sort: (a, b) {
          final byStatus = ProjectStatuses.values.indexOf(a.status).compareTo(ProjectStatuses.values.indexOf(b.status));
          return byStatus != 0 ? byStatus : b.createdAt.compareTo(a.createdAt);
        },
        header: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (inClient.isNotEmpty) ...[
              LayoutBuilder(
                builder: (context, constraints) {
                  final tiles = [
                    MetricTile(
                      label: l10n.projectStatAll,
                      icon: Icons.folder_outlined,
                      value: '${inClient.length}',
                      onTap: () => setState(() => _status = null),
                    ),
                    MetricTile(
                      label: l10n.projectStatActive,
                      icon: Icons.play_circle_outline,
                      value: '${inClient.where((p) => p.status == ProjectStatuses.active).length}',
                      onTap: () => setState(() => _status = ProjectStatuses.active),
                    ),
                    MetricTile(
                      label: l10n.projectStatPlanning,
                      icon: Icons.architecture_outlined,
                      value: '${inClient.where((p) => p.status == ProjectStatuses.planning).length}',
                      onTap: () => setState(() => _status = ProjectStatuses.planning),
                    ),
                    MetricTile(
                      label: l10n.projectStatDone,
                      icon: Icons.check_circle_outline,
                      value: '${inClient.where((p) => p.status == ProjectStatuses.completed).length}',
                      onTap: () => setState(() => _status = ProjectStatuses.completed),
                    ),
                  ];
                  final columns = gridColumns(constraints.maxWidth, minTileWidth: 140, max: tiles.length);
                  final width = (constraints.maxWidth - tokens.md * (columns - 1)) / columns;
                  return Wrap(
                    spacing: tokens.md,
                    runSpacing: tokens.md,
                    children: [for (final tile in tiles) SizedBox(width: width, child: tile)],
                  );
                },
              ),
              SizedBox(height: tokens.md),
            ],
            FilterBar<String>(
              options: ProjectStatuses.values,
              selected: _status,
              labelOf: (status) => projectStatusLabel(l10n, status),
              countOf: (status) => status == null ? inClient.length : inClient.where((p) => p.status == status).length,
              onSelected: (status) => setState(() => _status = status),
            ),
            if (clientOptions.length > 1) ...[
              SizedBox(height: tokens.sm),
              FilterMenuChip<String>(
                label: l10n.projectFilterClient,
                icon: Icons.business_outlined,
                value: _clientId,
                options: clientOptions,
                labelOf: (id) => clients.nameOf(id) ?? l10n.valueUnknown,
                onSelected: (id) => setState(() => _clientId = id),
              ),
            ],
          ],
        ),
        empty: EmptyState(
          icon: Icons.folder_outlined,
          title: l10n.projectsEmpty,
          body: l10n.projectsEmptyBody,
          action: PermissionGate(
            anyOf: const [Permissions.projectsCreate],
            child: FilledButton.icon(onPressed: _create, icon: const Icon(Icons.add), label: Text(l10n.projectNew)),
          ),
        ),
        itemBuilder: (context, project) => ProjectCard(
          project: project,
          progress: progress == null ? null : (progress[project.id] ?? ProjectProgress.empty),
          onTap: () => context.go(ProjectsRoutes.detail(project.id)),
        ),
      ),
    );
  }
}
