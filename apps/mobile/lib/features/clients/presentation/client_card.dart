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
    final subtitle = client.industry ?? client.website;
    final contact = client.primaryContact;
    return SurfaceCard(
      onTap: onTap,
      padding: EdgeInsets.all(tokens.md),
      semanticLabel: '${client.name}, ${clientStatusLabel(l10n, client.status)}',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              InitialsAvatar(name: client.name, seed: client.id, mark: true, size: 40),
              SizedBox(width: tokens.sm + tokens.xs),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(client.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.titleSmall),
                    if (subtitle != null)
                      Text(
                        subtitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: text.labelSmall?.copyWith(color: tokens.muted),
                      ),
                  ],
                ),
              ),
              SizedBox(width: tokens.sm),
              StatusBadge(label: clientStatusLabel(l10n, client.status), tone: clientStatusTone(client.status)),
            ],
          ),
          SizedBox(height: tokens.sm + tokens.xs),
          Row(
            children: [
              Expanded(
                child: _Stat(
                  label: l10n.clientRetainer,
                  value: client.retainerMinor > 0
                      ? formats.money(client.retainerMinor, currency: client.currency, compact: true)
                      : l10n.valueUnknown,
                ),
              ),
              Expanded(child: _Stat(label: l10n.clientSince, value: formats.shortDate(client.createdAt))),
            ],
          ),
          if (contact != null) ...[
            SizedBox(height: tokens.sm),
            Row(
              children: [
                InitialsAvatar(name: contact.name, size: 22),
                SizedBox(width: tokens.sm),
                Expanded(
                  child: Text(
                    contact.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: text.bodySmall?.copyWith(color: tokens.secondary),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: text.labelSmall?.copyWith(color: tokens.muted)),
        SizedBox(height: 2),
        Text(value, style: text.titleSmall?.copyWith(fontFeatures: const [FontFeature.tabularFigures()])),
      ],
    );
  }
}
