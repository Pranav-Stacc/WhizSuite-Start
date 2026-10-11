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
import '../../../core/forms/validators.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/forms.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/application/access_controller.dart';
import '../../access/domain/access_policy.dart';
import '../../access/presentation/permission_gate.dart';
import '../../calendar/calendar_routes.dart';
import '../../content/content_routes.dart';
import '../../reports/reports_routes.dart';
import '../../directory/application/directory_providers.dart';
import '../../integrations/integrations_routes.dart';
import '../../invoices/invoices_routes.dart';
import '../../media/media_routes.dart';
import '../../messages/messages_routes.dart';
import '../../projects/projects_routes.dart';
import '../application/clients_controller.dart';
import '../domain/client.dart';
import 'agreements_tab.dart';
import '../../team/presentation/portal_forms.dart';
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

    return PageScaffold(
      title: loaded?.name ?? l10n.clientsTitle,
      actions: [
        if (loaded != null) ...[
          PermissionGate(
            anyOf: const [Permissions.membersInvite],
            child: PopupMenuButton<String>(
              tooltip: l10n.portalShareMenu,
              icon: const Icon(Icons.share_outlined),
              onSelected: (value) async {
                switch (value) {
                  case 'link':
                    await showPortalAccessLinkForm(context, ref, clientId: loaded.id, clientName: loaded.name);
                  case 'invite':
                    await showPortalInviteForm(context, ref, clientId: loaded.id, clientName: loaded.name);
                }
              },
              itemBuilder: (context) => [
                PopupMenuItem(value: 'link', child: Text(l10n.portalLinkOpen)),
                PopupMenuItem(value: 'invite', child: Text(l10n.portalInviteOpen)),
              ],
            ),
          ),
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
      ],
      body: AsyncValueView<Client>(
        value: client,
        onRetry: () => ref.invalidate(clientProvider(clientId)),
        data: (client) {
          Future<void> refresh() => ref.refresh(clientProvider(clientId).future);
          return _ClientDetailBody(client: client, onRefresh: refresh);
        },
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main scrollable body
// ─────────────────────────────────────────────────────────────────────────────

class _ClientDetailBody extends ConsumerWidget {
  const _ClientDetailBody({required this.client, required this.onRefresh});

  final Client client;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tokens = context.tokens;
    final policy = ref.watch(accessPolicyProvider);
    final canAgreements = policy.can(Permissions.invoicesView);

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        padding: EdgeInsets.fromLTRB(tokens.md, tokens.md, tokens.md, tokens.xxl),
        children: [
          // ── Hero client card ──────────────────────────────────────────────
          FadeSlideIn(child: _HeroCard(client: client, ref: ref)),

          SizedBox(height: tokens.lg),

          // ── 4 Quick-actions ───────────────────────────────────────────────
          FadeSlideIn(index: 1, child: _QuickActions(client: client, policy: policy)),

          SizedBox(height: tokens.lg),

          // ── Manage sections (4 options) ───────────────────────────────────
          if (policy.can(Permissions.contentView)) ...[
            FadeSlideIn(index: 2, child: _ManageSection(client: client, policy: policy)),
            SizedBox(height: tokens.lg),
          ],

          // ── Client details ────────────────────────────────────────────────
          FadeSlideIn(index: 3, child: _DetailsSection(client: client)),

          SizedBox(height: tokens.lg),

          // ── Contacts ──────────────────────────────────────────────────────
          FadeSlideIn(index: 4, child: _ContactsSection(client: client)),

          SizedBox(height: tokens.lg),

          // ── Brand kit ─────────────────────────────────────────────────────
          FadeSlideIn(index: 5, child: _BrandSection(client: client, ref: ref)),

          SizedBox(height: tokens.lg),

          // ── Projects ──────────────────────────────────────────────────────
          FadeSlideIn(index: 6, child: _ProjectsSection(clientId: client.id)),

          // ── Agreements (if permitted) ─────────────────────────────────────
          if (canAgreements) ...[
            SizedBox(height: tokens.lg),
            FadeSlideIn(index: 7, child: _AgreementsSection(client: client)),
          ],
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero card — name, status, metrics (theme-aligned, no color bars)
// ─────────────────────────────────────────────────────────────────────────────

class _HeroCard extends ConsumerWidget {
  const _HeroCard({required this.client, required this.ref});

  final Client client;
  final WidgetRef ref;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;

    return SurfaceCard(
      padding: EdgeInsets.all(tokens.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              InitialsAvatar(name: client.name, seed: client.id, mark: true, size: 56),
              SizedBox(width: tokens.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      client.name,
                      style: text.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    if (client.industry != null)
                      Text(
                        client.industry!,
                        style: text.bodyMedium?.copyWith(color: tokens.muted),
                      ),
                    if (client.website != null)
                      _LinkText(
                        label: client.website!,
                        uri: Uri.tryParse(
                          client.website!.contains('://') ? client.website! : 'https://${client.website!}',
                        ),
                      ),
                  ],
                ),
              ),
              _StatusMenu(
                client: client,
                onSelected: (status) async {
                  final l = AppLocalizations.of(context);
                  await runAction(
                    context,
                    () => ref.read(clientsActionsProvider).setStatus(client.id, status),
                    success: l.savedToast,
                  );
                },
              ),
            ],
          ),

          SizedBox(height: tokens.lg),

          Row(
            children: [
              _HeroMetric(
                icon: Icons.payments_outlined,
                label: l10n.clientRetainer,
                value: client.retainerMinor > 0
                    ? formats.money(client.retainerMinor, currency: client.currency)
                    : '—',
              ),
              _Divider(),
              _HeroMetric(
                icon: Icons.calendar_today_outlined,
                label: l10n.clientSince,
                value: formats.date(client.createdAt),
              ),
              if (client.tier != null) ...[
                _Divider(),
                _HeroMetric(
                  icon: Icons.workspace_premium_outlined,
                  label: 'Tier',
                  value: client.tier!,
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class _HeroMetric extends StatelessWidget {
  const _HeroMetric({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 13, color: tokens.muted),
              SizedBox(width: 4),
              Expanded(
                child: Text(
                  label,
                  style: text.labelSmall?.copyWith(color: tokens.muted, fontSize: 10),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          SizedBox(height: 3),
          Text(
            value,
            style: text.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

class _Divider extends StatelessWidget {
  @override
  Widget build(BuildContext context) => SizedBox(
        height: 36,
        child: VerticalDivider(color: context.tokens.border, width: 24),
      );
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick-action row (4 actions: Message, Create Post, Invoice, Assets)
// ─────────────────────────────────────────────────────────────────────────────

class _QuickActions extends StatelessWidget {
  const _QuickActions({required this.client, required this.policy});

  final Client client;
  final AccessPolicy policy;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    final actions = <({IconData icon, String label, String route})>[
      if (policy.can(Permissions.chatView))
        (
          icon: Icons.forum_outlined,
          label: 'Message',
          route: MessagesRoutes.clientRoom(client.id),
        ),
      if (policy.can(Permissions.contentCreate))
        (
          icon: Icons.edit_note_outlined,
          label: 'Create Post',
          route: ContentRoutes.compose(clientId: client.id),
        ),
      if (policy.can(Permissions.invoicesView))
        (
          icon: Icons.receipt_long_outlined,
          label: 'Invoice',
          route: InvoicesRoutes.withClient(client.id),
        ),
      if (policy.can(Permissions.filesView))
        (
          icon: Icons.perm_media_outlined,
          label: 'Assets',
          route: MediaRoutes.withClient(client.id),
        ),
    ];

    if (actions.isEmpty) return const SizedBox.shrink();

    return SurfaceCard(
      padding: EdgeInsets.symmetric(vertical: tokens.md),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          for (final action in actions)
            _QuickActionButton(
              icon: action.icon,
              label: action.label,
              onTap: () => context.push(action.route),
            ),
        ],
      ),
    );
  }
}

class _QuickActionButton extends StatelessWidget {
  const _QuickActionButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(tokens.radius + 4),
      child: Padding(
        padding: EdgeInsets.symmetric(horizontal: tokens.sm, vertical: tokens.xs),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: tokens.primary.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: tokens.primary, size: 20),
            ),
            SizedBox(height: tokens.xs + 2),
            Text(
              label,
              style: text.labelSmall?.copyWith(color: tokens.fg, fontWeight: FontWeight.w600, fontSize: 11),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Manage section — Content, Analytics, Calendar, Integrations
// Clean, theme-aligned cards (no color stripe on the side)
// ─────────────────────────────────────────────────────────────────────────────

class _ManageSection extends ConsumerWidget {
  const _ManageSection({required this.client, required this.policy});

  final Client client;
  final AccessPolicy policy;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);

    final items = <_ManageItem>[
      if (policy.can(Permissions.contentView))
        _ManageItem(
          icon: Icons.auto_awesome_mosaic_outlined,
          title: l10n.clientManageContent,
          subtitle: l10n.clientManageContentBody,
          route: ContentRoutes.home(clientId: client.id),
        ),
      if (policy.can(Permissions.reportsView))
        _ManageItem(
          icon: Icons.insights_outlined,
          title: l10n.clientManageAnalytics,
          subtitle: l10n.clientManageAnalyticsBody,
          route: ReportsRoutes.home(clientId: client.id, tab: ReportsRoutes.analyticsTab),
        ),
      if (policy.can(Permissions.projectsView))
        _ManageItem(
          icon: Icons.calendar_month_outlined,
          title: l10n.clientManageCalendar,
          subtitle: l10n.clientManageCalendarBody,
          route: CalendarRoutes.withClient(client.id),
        ),
      if (policy.can(Permissions.integrationsManage))
        _ManageItem(
          icon: Icons.hub_outlined,
          title: l10n.clientManageIntegrations,
          subtitle: l10n.clientManageIntegrationsBody,
          route: IntegrationsRoutes.withClient(client.id),
        ),
    ];

    if (items.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionHeader(title: 'Manage'),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.6,
          ),
          itemCount: items.length,
          itemBuilder: (context, i) => _ManageCard(item: items[i]),
        ),
      ],
    );
  }
}

class _ManageItem {
  const _ManageItem({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.route,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final String route;
}

class _ManageCard extends StatelessWidget {
  const _ManageCard({required this.item});

  final _ManageItem item;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;

    return SurfaceCard(
      onTap: () => context.push(item.route),
      padding: EdgeInsets.all(tokens.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: tokens.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(tokens.radius),
                ),
                child: Icon(item.icon, size: 18, color: tokens.primary),
              ),
              const Spacer(),
              Icon(Icons.arrow_outward_rounded, size: 14, color: tokens.muted),
            ],
          ),
          const Spacer(),
          Text(
            item.title,
            style: text.labelMedium?.copyWith(fontWeight: FontWeight.w600),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          SizedBox(height: 2),
          Text(
            item.subtitle,
            style: text.labelSmall?.copyWith(color: tokens.muted, fontSize: 10),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Details section
// ─────────────────────────────────────────────────────────────────────────────

class _DetailsSection extends StatelessWidget {
  const _DetailsSection({required this.client});

  final Client client;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final website = client.website;

    return SectionCard(
      title: l10n.clientDetails,
      child: Column(
        children: [
          if (client.legalName != null) InfoRow(label: l10n.clientLegalName, value: Text(client.legalName!)),
          InfoRow(label: l10n.clientIndustry, value: Text(client.industry ?? l10n.valueUnknown)),
          InfoRow(
            label: l10n.clientWebsite,
            value: website == null
                ? Text(l10n.valueUnknown)
                : _LinkText(
                    label: website,
                    uri: Uri.tryParse(website.contains('://') ? website : 'https://$website'),
                  ),
          ),
          if (client.tier != null) InfoRow(label: l10n.clientTier, value: Text(client.tier!)),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Contacts section
// ─────────────────────────────────────────────────────────────────────────────

class _ContactsSection extends ConsumerWidget {
  const _ContactsSection({required this.client});

  final Client client;

  Future<void> _addContact(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context);
    final firstName = TextEditingController();
    final lastName = TextEditingController();
    final email = TextEditingController();
    final role = TextEditingController();
    final validators = Validators(l10n);
    final actions = ref.read(clientsActionsProvider);

    await showFormSheet(
      context,
      title: l10n.clientContactAdd,
      submitLabel: l10n.create,
      fields: (context, setState) => [
        TextFormField(
          controller: firstName,
          autofocus: true,
          decoration: InputDecoration(labelText: l10n.clientContactFirstName),
          validator: validators.minLength(1),
        ),
        TextFormField(
          controller: lastName,
          decoration: InputDecoration(labelText: l10n.clientContactLastName),
        ),
        TextFormField(
          controller: email,
          decoration: InputDecoration(labelText: l10n.teamEmail),
          keyboardType: TextInputType.emailAddress,
        ),
        TextFormField(
          controller: role,
          decoration: InputDecoration(labelText: l10n.clientContactRole),
        ),
      ],
      onSubmit: () => actions.addContact(
        clientId: client.id,
        firstName: firstName.text.trim(),
        lastName: lastName.text.trim().isEmpty ? null : lastName.text.trim(),
        email: email.text.trim().isEmpty ? null : email.text.trim(),
        role: role.text.trim().isEmpty ? null : role.text.trim(),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final text = Theme.of(context).textTheme;
    final tokens = context.tokens;

    return SectionCard(
      title: l10n.clientContacts,
      trailing: PermissionGate(
        anyOf: const [Permissions.clientsEdit],
        child: TextButton.icon(
          onPressed: () => _addContact(context, ref),
          icon: const Icon(Icons.person_add_outlined, size: 18),
          label: Text(l10n.clientContactAdd),
        ),
      ),
      child: client.contacts.isEmpty
          ? Text(l10n.clientContactsEmpty, style: text.bodyMedium?.copyWith(color: tokens.muted))
          : Column(
              children: [
                for (final (i, contact) in client.contacts.indexed) ...[
                  if (i > 0) const Divider(),
                  _ContactRow(clientId: client.id, contact: contact),
                ],
              ],
            ),
    );
  }
}

class _ContactRow extends ConsumerWidget {
  const _ContactRow({required this.clientId, required this.contact});

  final String clientId;
  final ClientContact contact;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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
          PermissionGate(
            anyOf: const [Permissions.clientsEdit],
            child: IconButton(
              tooltip: l10n.delete,
              icon: Icon(Icons.delete_outline, color: Theme.of(context).colorScheme.error),
              onPressed: () async {
                final confirmed = await confirmAction(
                  context,
                  title: l10n.delete,
                  body: l10n.clientContactDeleteConfirm(contact.name),
                  confirmLabel: l10n.delete,
                );
                if (!confirmed) return;
                await ref.read(clientsActionsProvider).removeContact(clientId, contact.id);
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand kit section
// ─────────────────────────────────────────────────────────────────────────────

class _BrandSection extends ConsumerWidget {
  const _BrandSection({required this.client, required this.ref});

  final Client client;
  final WidgetRef ref;

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

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionCard(
          title: l10n.clientBrandColours,
          trailing: PermissionGate(
            anyOf: const [Permissions.clientsEdit],
            child: TextButton.icon(
              onPressed: () async {
                final saved = await showBrandKitForm(context, ref, client);
                if (saved && context.mounted) showToast(context, l10n.savedToast);
              },
              icon: const Icon(Icons.edit_outlined, size: 16),
              label: Text(l10n.clientBrandEdit),
            ),
          ),
          child: Row(
            children: [
              for (final (i, (label, hex)) in swatches.indexed) ...[
                if (i > 0) SizedBox(width: tokens.sm),
                Expanded(child: _Swatch(label: label, hex: hex)),
              ],
            ],
          ),
        ),
        SizedBox(height: tokens.lg),
        SectionCard(
          title: l10n.clientBrandVoice,
          child: Text(
            kit.voice.isEmpty ? l10n.clientBrandVoiceEmpty : kit.voice,
            style: kit.voice.isEmpty ? muted : text.bodyLarge,
          ),
        ),
        if (kit.pillars.isNotEmpty) ...[
          SizedBox(height: tokens.lg),
          SectionCard(
            title: l10n.clientBrandPillars,
            child: Wrap(
              spacing: tokens.sm,
              runSpacing: tokens.sm,
              children: [for (final pillar in kit.pillars) Chip(label: Text(pillar))],
            ),
          ),
        ],
        if (kit.hashtags.isNotEmpty) ...[
          SizedBox(height: tokens.lg),
          SectionCard(
            title: l10n.clientBrandHashtags,
            child: Wrap(
              spacing: tokens.sm,
              runSpacing: tokens.sm,
              children: [for (final tag in kit.hashtags) TagChip(label: tag)],
            ),
          ),
        ],
      ],
    );
  }
}

class _Swatch extends StatelessWidget {
  const _Swatch({required this.label, required this.hex});

  static const _height = 64.0;

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
          borderRadius: BorderRadius.circular(tokens.radius + 4),
          child: DecoratedBox(
            decoration: BoxDecoration(
              border: Border.all(color: tokens.border),
              borderRadius: BorderRadius.circular(tokens.radius + 4),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  height: _height,
                  color: colour ?? tokens.subtle,
                  child: colour == null
                      ? Icon(Icons.format_color_reset_outlined, color: tokens.muted)
                      : null,
                ),
                Padding(
                  padding: EdgeInsets.all(tokens.xs + 2),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(label, style: text.labelSmall?.copyWith(color: tokens.muted, fontSize: 9)),
                      Text(hex?.toUpperCase() ?? '—', style: text.labelSmall?.copyWith(fontWeight: FontWeight.w700)),
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

// ─────────────────────────────────────────────────────────────────────────────
// Projects section
// ─────────────────────────────────────────────────────────────────────────────

class _ProjectsSection extends ConsumerWidget {
  const _ProjectsSection({required this.clientId});

  final String clientId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final projects = ref.watch(projectDirectoryProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionHeader(title: l10n.clientTabProjects),
        AsyncValueView(
          value: projects,
          onRetry: () => ref.invalidate(projectDirectoryProvider),
          data: (directory) {
            final own = directory.childrenOf(clientId);
            if (own.isEmpty) {
              return SurfaceCard(
                child: Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: tokens.lg),
                    child: Text(
                      l10n.clientProjectsEmpty,
                      style: TextStyle(color: tokens.muted),
                    ),
                  ),
                ),
              );
            }
            return Column(
              children: [
                for (final (i, project) in own.indexed)
                  Padding(
                    padding: EdgeInsets.only(bottom: i < own.length - 1 ? tokens.sm : 0),
                    child: SurfaceCard(
                      onTap: () => context.push(ProjectsRoutes.detail(project.id)),
                      padding: EdgeInsets.symmetric(horizontal: tokens.md, vertical: tokens.sm + 2),
                      child: Row(
                        children: [
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: tokens.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(tokens.radius),
                            ),
                            child: Icon(Icons.folder_outlined, color: tokens.primary, size: 20),
                          ),
                          SizedBox(width: tokens.md),
                          Expanded(
                            child: Text(
                              project.name,
                              style: Theme.of(context).textTheme.titleSmall,
                            ),
                          ),
                          Icon(Icons.chevron_right, color: tokens.muted),
                        ],
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Agreements section wrapper
// ─────────────────────────────────────────────────────────────────────────────

class _AgreementsSection extends StatelessWidget {
  const _AgreementsSection({required this.client});

  final Client client;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionHeader(title: l10n.clientTabAgreements),
        AgreementsTab(client: client),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Status menu
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

class _LinkText extends StatelessWidget {
  const _LinkText({required this.label, required this.uri});

  final String label;
  final Uri? uri;

  @override
  Widget build(BuildContext context) {
    final target = uri;
    final style = TextStyle(
      color: context.tokens.primary,
      decoration: TextDecoration.underline,
      fontSize: 13,
    );
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
