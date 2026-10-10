import 'package:flutter/material.dart';

import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/avatar.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/client.dart';
import 'client_status.dart';

class ClientCard extends StatelessWidget {
  const ClientCard({required this.client, required this.onTap, super.key});

  final Client client;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    final formats = context.formats;
    final contact = client.primaryContact;

    return Semantics(
      button: true,
      label: '${client.name}, ${clientStatusLabel(l10n, client.status)}',
      child: SurfaceCard(
        onTap: onTap,
        padding: EdgeInsets.all(tokens.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Header row ──────────────────────────────────────────
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                InitialsAvatar(name: client.name, seed: client.id, mark: true, size: 44),
                SizedBox(width: tokens.sm + 2),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        client.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: text.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                      ),
                      if (client.industry != null)
                        Text(
                          client.industry!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: text.labelSmall?.copyWith(color: tokens.muted),
                        ),
                    ],
                  ),
                ),
                SizedBox(width: tokens.xs),
                StatusBadge(
                  label: clientStatusLabel(l10n, client.status),
                  tone: clientStatusTone(client.status),
                ),
              ],
            ),

            SizedBox(height: tokens.md),

            // ── Stats row ───────────────────────────────────────────
            IntrinsicHeight(
              child: Row(
                children: [
                  _StatPill(
                    icon: Icons.payments_outlined,
                    label: l10n.clientRetainer,
                    value: client.retainerMinor > 0
                        ? formats.money(client.retainerMinor, currency: client.currency, compact: true)
                        : '—',
                  ),
                  SizedBox(
                    width: 1,
                    child: VerticalDivider(color: tokens.border),
                  ),
                  _StatPill(
                    icon: Icons.calendar_today_outlined,
                    label: l10n.clientSince,
                    value: formats.shortDate(client.createdAt),
                  ),
                  if (client.tier != null) ...[
                    SizedBox(
                      width: 1,
                      child: VerticalDivider(color: tokens.border),
                    ),
                    _StatPill(
                      icon: Icons.workspace_premium_outlined,
                      label: 'Tier',
                      value: client.tier!,
                    ),
                  ],
                ],
              ),
            ),

            // ── Primary contact ─────────────────────────────────────
            if (contact != null) ...[
              Divider(height: tokens.md + tokens.sm, color: tokens.border),
              Row(
                children: [
                  InitialsAvatar(name: contact.name, size: 20),
                  SizedBox(width: tokens.xs + 2),
                  Expanded(
                    child: Text(
                      contact.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: text.bodySmall?.copyWith(color: tokens.muted),
                    ),
                  ),
                  if (contact.isDecisionMaker) ...[
                    Icon(Icons.star_rounded, size: 14, color: tokens.secondary),
                    SizedBox(width: tokens.xs),
                  ],
                  if (contact.email != null)
                    Icon(Icons.mail_outline, size: 14, color: tokens.muted),
                  if (contact.phone != null) ...[
                    SizedBox(width: tokens.xs),
                    Icon(Icons.call_outlined, size: 14, color: tokens.muted),
                  ],
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _StatPill extends StatelessWidget {
  const _StatPill({
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
      child: Padding(
        padding: EdgeInsets.symmetric(horizontal: tokens.xs + 2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 12, color: tokens.muted),
                SizedBox(width: 3),
                Text(
                  label,
                  style: text.labelSmall?.copyWith(color: tokens.muted, fontSize: 10),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
            SizedBox(height: 2),
            Text(
              value,
              style: text.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
                fontSize: 13,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
