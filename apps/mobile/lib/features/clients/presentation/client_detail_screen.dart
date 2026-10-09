import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/theme/theme_settings.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/avatar.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../../directory/application/directory_providers.dart';
import '../../projects/projects_routes.dart';
import '../application/clients_controller.dart';
import '../domain/client.dart';
import 'client_forms.dart';
import 'client_status.dart';

class ClientDetailScreen extends ConsumerWidget {
  const ClientDetailScreen({required this.clientId, super.key});

  final String clientId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final client = ref.watch(clientProvider(clientId));
    final loaded = client.value;

    return DefaultTabController(
      length: 3,
      child: PageScaffold(
        title: loaded?.name ?? l10n.clientsTitle,
        actions: [
          if (loaded != null)
            PermissionGate(
              anyOf: const [Permissions.clientsEdit],
              child: IconButton(
                tooltip: l10n.clientEdit,
                icon: const Icon(Icons.edit_outlined),
                onPressed: () async {
                  final saved = await showClientForm(context, ref, client: loaded);
                  if (saved && context.mounted) showToast(context, l10n.savedToast);
                },
              ),
            ),
        ],
        bottom: TabBar(
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          tabs: [Tab(text: l10n.clientTabOverview), Tab(text: l10n.clientTabBrand), Tab(text: l10n.clientTabProjects)],
        ),
        body: AsyncValueView<Client>(
          value: client,
          onRetry: () => ref.invalidate(clientProvider(clientId)),
          data: (client) {
            Future<void> refresh() => ref.refresh(clientProvider(clientId).future);
            return TabBarView(
              children: [
                _OverviewTab(client: client, onRefresh: refresh),
                _BrandTab(client: client, onRefresh: refresh),
                _ProjectsTab(clientId: client.id),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _OverviewTab extends ConsumerWidget {
  const _OverviewTab({required this.client, required this.onRefresh});

  final Client client;
  final Future<void> Function() onRefresh;

  Future<void> _changeStatus(BuildContext context, WidgetRef ref, String status) async {
    final l10n = AppLocalizations.of(context);
    await runAction(
      context,
      () => ref.read(clientsActionsProvider).setStatus(client.id, status),
      success: l10n.savedToast,
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;
    final website = client.website;

    return ReadableBody(
      onRefresh: onRefresh,
      children: [
        FadeSlideIn(
          child: Row(
            children: [
              InitialsAvatar(name: client.name, seed: client.id, mark: true, size: 56),
              SizedBox(width: tokens.lg),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(client.name, style: text.headlineSmall),
                    if (client.industry != null)
                      Text(client.industry!, style: text.bodyMedium?.copyWith(color: tokens.muted)),
                  ],
                ),
              ),
              _StatusMenu(client: client, onSelected: (status) => _changeStatus(context, ref, status)),
            ],
          ),
        ),
        SizedBox(height: tokens.xl),
        FadeSlideIn(
          index: 1,
          child: LayoutBuilder(
            builder: (context, constraints) {
              final tiles = [
                MetricTile(
                  label: l10n.clientRetainer,
                  icon: Icons.payments_outlined,
                  value: client.retainerMinor > 0
                      ? formats.money(client.retainerMinor, currency: client.currency)
                      : l10n.valueUnknown,
                ),
                MetricTile(label: l10n.clientSince, icon: Icons.event_outlined, value: formats.date(client.createdAt)),
              ];
              final columns = gridColumns(constraints.maxWidth, minTileWidth: 200, max: 2);
              return Wrap(
                spacing: tokens.md,
                runSpacing: tokens.md,
                children: [
                  for (final tile in tiles)
                    SizedBox(width: (constraints.maxWidth - tokens.md * (columns - 1)) / columns, child: tile),
                ],
              );
            },
          ),
        ),
        SizedBox(height: tokens.xl),
        FadeSlideIn(
          index: 2,
          child: SectionCard(
            title: l10n.clientDetails,
            child: Column(
              children: [
                if (client.legalName != null) InfoRow(label: l10n.clientLegalName, value: Text(client.legalName!)),
                InfoRow(label: l10n.clientIndustry, value: Text(client.industry ?? l10n.valueUnknown)),
                InfoRow(
                  label: l10n.clientWebsite,
                  value: website == null
                      ? Text(l10n.valueUnknown)
                      : _LinkText(label: website, uri: Uri.tryParse(website.contains('://') ? website : 'https://$website')),
                ),
                if (client.tier != null) InfoRow(label: l10n.clientTier, value: Text(client.tier!)),
              ],
            ),
          ),
        ),
        SizedBox(height: tokens.xl),
        FadeSlideIn(
          index: 3,
          child: SectionCard(
            title: l10n.clientContacts,
            child: client.contacts.isEmpty
                ? Text(l10n.clientContactsEmpty, style: text.bodyMedium?.copyWith(color: tokens.muted))
                : Column(
                    children: [
                      for (final (i, contact) in client.contacts.indexed) ...[
                        if (i > 0) const Divider(),
                        _ContactRow(contact: contact),
                      ],
                    ],
                  ),
          ),
        ),
      ],
    );
  }
}

class _StatusMenu extends ConsumerWidget {
  const _StatusMenu({required this.client, required this.onSelected});

  final Client client;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final badge = StatusBadge(label: clientStatusLabel(l10n, client.status), tone: clientStatusTone(client.status));
    return PermissionGate(
      anyOf: const [Permissions.clientsEdit],
      fallback: badge,
      child: PopupMenuButton<String>(
        tooltip: l10n.clientStatusChange,
        onSelected: onSelected,
        itemBuilder: (_) => [
          for (final status in ClientStatuses.values)
            CheckedPopupMenuItem(
              value: status,
              checked: status == client.status,
              child: Text(clientStatusLabel(l10n, status)),
            ),
        ],
        child: Row(mainAxisSize: MainAxisSize.min, children: [badge, const Icon(Icons.arrow_drop_down)]),
      ),
    );
  }
}

class _ContactRow extends StatelessWidget {
  const _ContactRow({required this.contact});

  final ClientContact contact;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final email = contact.email;
    final phone = contact.phone;
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: InitialsAvatar(name: contact.name),
      title: Text(contact.name),
      subtitle: Text(
        [contact.role, if (contact.isDecisionMaker) l10n.clientDecisionMaker].whereType<String>().join(' · '),
        style: TextStyle(color: tokens.muted),
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (email != null)
            IconButton(
              tooltip: l10n.clientEmailContact(contact.name),
              icon: const Icon(Icons.mail_outline),
              onPressed: () => launchUrl(Uri(scheme: 'mailto', path: email)),
            ),
          if (phone != null)
            IconButton(
              tooltip: l10n.clientCallContact(contact.name),
              icon: const Icon(Icons.call_outlined),
              onPressed: () => launchUrl(Uri(scheme: 'tel', path: phone)),
            ),
        ],
      ),
    );
  }
}

class _LinkText extends StatelessWidget {
  const _LinkText({required this.label, required this.uri});

  final String label;
  final Uri? uri;

  @override
  Widget build(BuildContext context) {
    final target = uri;
    final style = TextStyle(color: context.tokens.primary, decoration: TextDecoration.underline);
    if (target == null) return Text(label);
    return Semantics(
      link: true,
      child: InkWell(
        onTap: () => launchUrl(target, mode: LaunchMode.externalApplication),
        child: Text(label, style: style, overflow: TextOverflow.ellipsis),
      ),
    );
  }
}

class _BrandTab extends ConsumerWidget {
  const _BrandTab({required this.client, required this.onRefresh});

  final Client client;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final kit = client.brandKit;
    final muted = text.bodyMedium?.copyWith(color: tokens.muted);
    final swatches = [
      (l10n.clientBrandPrimary, kit.primary),
      (l10n.clientBrandSecondary, kit.secondary),
      (l10n.clientBrandAccent, kit.accent),
    ];

    return ReadableBody(
      onRefresh: onRefresh,
      children: [
        FadeSlideIn(
          child: SectionCard(
            title: l10n.clientBrandColours,
            trailing: PermissionGate(
              anyOf: const [Permissions.clientsEdit],
              child: TextButton.icon(
                onPressed: () async {
                  final saved = await showBrandKitForm(context, ref, client);
                  if (saved && context.mounted) showToast(context, l10n.savedToast);
                },
                icon: const Icon(Icons.edit_outlined, size: 18),
                label: Text(l10n.clientBrandEdit),
              ),
            ),
            child: Row(
              children: [
                for (final (i, (label, hex)) in swatches.indexed) ...[
                  if (i > 0) SizedBox(width: tokens.md),
                  Expanded(child: _Swatch(label: label, hex: hex)),
                ],
              ],
            ),
          ),
        ),
        SizedBox(height: tokens.xl),
        FadeSlideIn(
          index: 1,
          child: SectionCard(
            title: l10n.clientBrandVoice,
            child: Text(kit.voice.isEmpty ? l10n.clientBrandVoiceEmpty : kit.voice, style: kit.voice.isEmpty ? muted : text.bodyLarge),
          ),
        ),
        SizedBox(height: tokens.xl),
        FadeSlideIn(
          index: 2,
          child: SectionCard(
            title: l10n.clientBrandPillars,
            child: kit.pillars.isEmpty
                ? Text(l10n.clientBrandNone, style: muted)
                : Wrap(
                    spacing: tokens.sm,
                    runSpacing: tokens.sm,
                    children: [for (final pillar in kit.pillars) Chip(label: Text(pillar))],
                  ),
          ),
        ),
        SizedBox(height: tokens.xl),
        FadeSlideIn(
          index: 3,
          child: SectionCard(
            title: l10n.clientBrandHashtags,
            child: kit.hashtags.isEmpty
                ? Text(l10n.clientBrandNone, style: muted)
                : Wrap(
                    spacing: tokens.sm,
                    runSpacing: tokens.sm,
                    children: [for (final tag in kit.hashtags) TagChip(label: tag)],
                  ),
          ),
        ),
      ],
    );
  }
}

class _Swatch extends StatelessWidget {
  const _Swatch({required this.label, required this.hex});

  static const _height = 72.0;

  final String label;
  final String? hex;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final colour = hex == null ? null : parseHexColor(hex!);
    return Semantics(
      label: '$label ${hex ?? ''}',
      child: ExcludeSemantics(
        child: ClipRRect(
          borderRadius: BorderRadius.circular(tokens.radius + 6),
          child: DecoratedBox(
            decoration: BoxDecoration(
              border: Border.all(color: tokens.border),
              borderRadius: BorderRadius.circular(tokens.radius + 6),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  height: _height,
                  color: colour ?? tokens.subtle,
                  child: colour == null ? Icon(Icons.format_color_reset_outlined, color: tokens.muted) : null,
                ),
                Padding(
                  padding: EdgeInsets.all(tokens.sm),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(label, style: text.labelSmall?.copyWith(color: tokens.muted)),
                      Text(hex?.toUpperCase() ?? '—', style: text.labelMedium),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ProjectsTab extends ConsumerWidget {
  const _ProjectsTab({required this.clientId});

  final String clientId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final projects = ref.watch(projectDirectoryProvider);
    return AsyncValueView(
      value: projects,
      onRetry: () => ref.invalidate(projectDirectoryProvider),
      data: (directory) {
        final own = directory.childrenOf(clientId);
        return ReadableBody(
          onRefresh: () => ref.refresh(projectDirectoryProvider.future),
          children: [
            if (own.isEmpty)
              Padding(
                padding: EdgeInsets.only(top: tokens.xxl),
                child: Text(l10n.clientProjectsEmpty, textAlign: TextAlign.center, style: TextStyle(color: tokens.muted)),
              )
            else
              for (final (i, project) in own.indexed)
                FadeSlideIn(
                  index: i,
                  child: Padding(
                    padding: EdgeInsets.only(bottom: tokens.md),
                    child: SurfaceCard(
                      onTap: () => context.push(ProjectsRoutes.detail(project.id)),
                      child: Row(
                        children: [
                          Icon(Icons.folder_outlined, color: tokens.secondary),
                          SizedBox(width: tokens.md),
                          Expanded(child: Text(project.name, style: Theme.of(context).textTheme.titleSmall)),
                          const Icon(Icons.chevron_right),
                        ],
                      ),
                    ),
                  ),
                ),
          ],
        );
      },
    );
  }
}
