import 'package:flutter/material.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/lead.dart';

/// Open value, weighted forecast, won value and win rate. Wraps into a grid on wide
/// screens and scrolls horizontally on phones.
class PipelineSummaryView extends StatelessWidget {
  const PipelineSummaryView({required this.summary, super.key});

  static const _minTileWidth = 200.0;
  static const _phoneTileWidth = 172.0;
  static const _tileCount = 4;

  final PipelineSummary summary;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final formats = context.formats;
    final tokens = context.tokens;
    final winRate = summary.winRate;
    String money(int minor) => formats.money(minor, currency: summary.currency, compact: true);
    final tiles = [
      MetricTile(
        label: l10n.leadsStatOpen,
        icon: Icons.account_balance_wallet_outlined,
        value: money(summary.openMinor),
        caption: l10n.leadsStatOpenHint,
      ),
      MetricTile(
        label: l10n.leadsStatForecast,
        icon: Icons.trending_up,
        value: money(summary.weightedMinor),
        caption: l10n.leadsStatForecastHint,
      ),
      MetricTile(
        label: l10n.leadsStatWon,
        icon: Icons.emoji_events_outlined,
        tone: StatusTone.success,
        value: money(summary.wonMinor),
        caption: l10n.leadsStatWonHint(summary[LeadStages.won].count),
      ),
      MetricTile(
        label: l10n.leadsStatWinRate,
        icon: Icons.percent,
        value: winRate == null ? l10n.valueUnknown : formats.percent(winRate),
        caption: l10n.leadsStatWinRateHint,
      ),
    ];
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = gridColumns(constraints.maxWidth, minTileWidth: _minTileWidth, max: _tileCount);
        if (columns < 2) {
          return SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final (i, tile) in tiles.indexed) ...[
                  if (i > 0) SizedBox(width: tokens.md),
                  SizedBox(width: _phoneTileWidth, child: tile),
                ],
              ],
            ),
          );
        }
        final width = (constraints.maxWidth - tokens.md * (columns - 1)) / columns;
        return Wrap(
          spacing: tokens.md,
          runSpacing: tokens.md,
          children: [for (final tile in tiles) SizedBox(width: width, child: tile)],
        );
      },
    );
  }
}
