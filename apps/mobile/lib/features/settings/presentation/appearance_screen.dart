import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/theme/theme_controller.dart';
import '../../../core/theme/theme_settings.dart';
import '../../../core/widgets/app_dialog.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../l10n/app_localizations.dart';

/// Live theme editor matching the web customiser; changes apply instantly and persist per device.
class AppearanceScreen extends ConsumerWidget {
  const AppearanceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final theme = ref.watch(themeControllerProvider);
    final controller = ref.read(themeControllerProvider.notifier);

    Widget section(String title, Widget child, int index) => FadeSlideIn(
          index: index,
          child: Padding(
            padding: EdgeInsets.only(bottom: tokens.xl),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Semantics(header: true, child: Text(title, style: text.titleSmall)),
                SizedBox(height: tokens.md),
                child,
              ],
            ),
          ),
        );

    return Scaffold(
      appBar: AppBar(title: Text(l10n.themeTitle)),
      body: ListView(
        padding: EdgeInsets.all(tokens.lg),
        children: [
          Text(l10n.themeDescription, style: text.bodyMedium?.copyWith(color: tokens.muted)),
          SizedBox(height: tokens.xl),
          section(
            l10n.themePresets,
            _PresetGrid(current: theme, onSelected: controller.applyPreset),
            0,
          ),
          section(
            l10n.themeColors,
            Card(
              child: Column(
                children: [
                  for (final key in ThemeColorKeys.values)
                    _ColorRow(
                      label: _colorLabel(l10n, key),
                      color: theme.colorFor(key),
                      onChanged: (color) => controller.setColor(key, color),
                    ),
                ],
              ),
            ),
            1,
          ),
          section(
            l10n.themeShape,
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: Text(l10n.themeRadius)),
                    Text('${theme.radius.round()}px', style: text.bodySmall),
                  ],
                ),
                Slider(
                  value: theme.radius,
                  min: themeRadiusMin.toDouble(),
                  max: themeRadiusMax.toDouble(),
                  divisions: themeRadiusMax - themeRadiusMin,
                  label: '${theme.radius.round()}px',
                  onChanged: controller.setRadius,
                ),
                SizedBox(height: tokens.md),
                Text(l10n.themeDensity),
                SizedBox(height: tokens.sm),
                SegmentedButton<ThemeDensity>(
                  showSelectedIcon: false,
                  segments: [
                    ButtonSegment(value: ThemeDensity.comfortable, label: Text(l10n.themeDensityComfortable)),
                    ButtonSegment(value: ThemeDensity.compact, label: Text(l10n.themeDensityCompact)),
                  ],
                  selected: {theme.density},
                  onSelectionChanged: (selection) => controller.setDensity(selection.first),
                ),
              ],
            ),
            2,
          ),
          OutlinedButton.icon(
            onPressed: controller.reset,
            icon: const Icon(Icons.restart_alt),
            label: Text(l10n.themeReset),
          ),
        ],
      ),
    );
  }

  static String _colorLabel(AppLocalizations l10n, String key) => switch (key) {
        ThemeColorKeys.primary => l10n.themeColorPrimary,
        ThemeColorKeys.secondary => l10n.themeColorSecondary,
        ThemeColorKeys.bg => l10n.themeColorBg,
        ThemeColorKeys.surface => l10n.themeColorSurface,
        ThemeColorKeys.border => l10n.themeColorBorder,
        ThemeColorKeys.fg => l10n.themeColorFg,
        ThemeColorKeys.muted => l10n.themeColorMuted,
        _ => key,
      };
}

String presetLabel(AppLocalizations l10n, String id) => switch (id) {
      'editorial' => l10n.themePresetEditorial,
      'chalk' => l10n.themePresetChalk,
      'porcelain' => l10n.themePresetPorcelain,
      'mist' => l10n.themePresetMist,
      'daylight' => l10n.themePresetDaylight,
      'sage' => l10n.themePresetSage,
      'sky' => l10n.themePresetSky,
      'linen' => l10n.themePresetLinen,
      'noir' => l10n.themePresetNoir,
      'mono' => l10n.themePresetMono,
      'aurora' => l10n.themePresetAurora,
      'ocean' => l10n.themePresetOcean,
      'sunset' => l10n.themePresetSunset,
      'rose' => l10n.themePresetRose,
      _ => id,
    };

class _PresetGrid extends StatelessWidget {
  const _PresetGrid({required this.current, required this.onSelected});

  static const _minTileWidth = 104.0;
  static const _tileAspect = 1.25;
  static const _swatch = 14.0;

  final ThemeSettings current;
  final ValueChanged<ThemePreset> onSelected;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final l10n = AppLocalizations.of(context);
    final light = themePresetList.where((p) => p.isLight).toList();
    final dark = themePresetList.where((p) => !p.isLight).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(l10n.themePresetsLight, style: Theme.of(context).textTheme.labelLarge),
        SizedBox(height: tokens.sm),
        _grid(context, light, l10n),
        SizedBox(height: tokens.lg),
        Text(l10n.themePresetsDark, style: Theme.of(context).textTheme.labelLarge),
        SizedBox(height: tokens.sm),
        _grid(context, dark, l10n),
      ],
    );
  }

  Widget _grid(BuildContext context, List<ThemePreset> presets, AppLocalizations l10n) {
    final tokens = context.tokens;
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = (constraints.maxWidth / _minTileWidth).floor().clamp(2, 6);
        return GridView.count(
          crossAxisCount: columns,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: tokens.sm,
          crossAxisSpacing: tokens.sm,
          childAspectRatio: _tileAspect,
          children: [
            for (final preset in presets)
              _PresetTile(
                label: presetLabel(l10n, preset.id),
                preset: preset.settings,
                selected: preset.settings == current,
                swatch: _swatch,
                onTap: () => onSelected(preset),
              ),
          ],
        );
      },
    );
  }
}

class _PresetTile extends StatelessWidget {
  const _PresetTile({
    required this.label,
    required this.preset,
    required this.selected,
    required this.swatch,
    required this.onTap,
  });

  final String label;
  final ThemeSettings preset;
  final bool selected;
  final double swatch;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final radius = BorderRadius.circular(tokens.radius + 6);
    Widget dot(Color color, {Color? border}) => Container(
          width: swatch,
          height: swatch,
          margin: EdgeInsets.only(right: tokens.xs),
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            border: border == null ? null : Border.all(color: border),
          ),
        );

    return Semantics(
      button: true,
      selected: selected,
      label: label,
      child: Material(
        color: preset.bg,
        shape: RoundedRectangleBorder(
          borderRadius: radius,
          side: BorderSide(color: selected ? tokens.primary : tokens.border, width: selected ? 2 : 1),
        ),
        child: InkWell(
          borderRadius: radius,
          onTap: onTap,
          child: Padding(
            padding: EdgeInsets.all(tokens.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    dot(preset.primary),
                    dot(preset.secondary),
                    dot(preset.surface, border: preset.border),
                    const Spacer(),
                    AnimatedScale(
                      scale: selected ? 1 : 0,
                      duration: AppMotion.fast,
                      child: Icon(Icons.check, size: swatch, color: preset.primary),
                    ),
                  ],
                ),
                const Spacer(),
                ExcludeSemantics(
                  child: Text(
                    label,
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(color: preset.fg),
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

class _ColorRow extends StatelessWidget {
  const _ColorRow({required this.label, required this.color, required this.onChanged});

  static const _swatch = 28.0;

  final String label;
  final Color color;
  final ValueChanged<Color> onChanged;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final hex = toHex(color);
    return ListTile(
      title: Text(label),
      subtitle: Text(hex, style: Theme.of(context).textTheme.bodySmall?.copyWith(fontFeatures: const [FontFeature.tabularFigures()])),
      trailing: Container(
        width: _swatch,
        height: _swatch,
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(tokens.radius + 2),
          border: Border.all(color: tokens.border),
        ),
      ),
      onTap: () async {
        final picked = await showAppDialog<Color>(
          context,
          builder: (_) => _HexColorDialog(title: label, initial: color),
        );
        if (picked != null) onChanged(picked);
      },
    );
  }
}

class _HexColorDialog extends StatefulWidget {
  const _HexColorDialog({required this.title, required this.initial});

  static const _previewHeight = 56.0;
  static const _hexLength = 7;

  final String title;
  final Color initial;

  @override
  State<_HexColorDialog> createState() => _HexColorDialogState();
}

class _HexColorDialogState extends State<_HexColorDialog> {
  late final _controller = TextEditingController(text: toHex(widget.initial));
  late Color? _preview = widget.initial;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    return AppDialog(
      title: widget.title,
      actions: [
        TextButton(onPressed: () => Navigator.of(context).pop(), child: Text(l10n.cancel)),
        FilledButton(
          onPressed: _preview == null ? null : () => Navigator.of(context).pop(_preview),
          child: Text(l10n.themeApply),
        ),
      ],
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AnimatedContainer(
            duration: AppMotion.fast,
            height: _HexColorDialog._previewHeight,
            decoration: BoxDecoration(
              color: _preview ?? widget.initial,
              borderRadius: tokens.borderRadius,
              border: Border.all(color: tokens.border),
            ),
          ),
          SizedBox(height: tokens.lg),
          TextField(
            controller: _controller,
            autofocus: true,
            maxLength: _HexColorDialog._hexLength,
            inputFormatters: [FilteringTextInputFormatter.allow(RegExp('[#0-9a-fA-F]'))],
            decoration: InputDecoration(
              labelText: l10n.themeHexLabel,
              errorText: _preview == null ? l10n.themeHexInvalid : null,
            ),
            onChanged: (value) => setState(() => _preview = parseHexColor(value.toUpperCase())),
          ),
        ],
      ),
    );
  }
}
