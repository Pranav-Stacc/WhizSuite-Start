import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../l10n/app_localizations.dart';
import '../theme/app_tokens.dart';

bool _hasNetwork(List<ConnectivityResult> results) => results.any((r) => r != ConnectivityResult.none);

/// Whether the device currently has a network interface. Assumes online until told otherwise.
final isOnlineProvider = StreamProvider<bool>((ref) async* {
  final connectivity = Connectivity();
  yield _hasNetwork(await connectivity.checkConnectivity());
  yield* connectivity.onConnectivityChanged.map(_hasNetwork).distinct();
});

/// Thin banner shown above content while offline; data comes from caches meanwhile.
class OfflineBanner extends ConsumerWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final online = ref.watch(isOnlineProvider).value ?? true;
    final tokens = context.tokens;
    return AnimatedSize(
      duration: AppMotion.medium,
      curve: AppMotion.standard,
      child: online
          ? const SizedBox(width: double.infinity)
          : Semantics(
              liveRegion: true,
              child: Container(
                width: double.infinity,
                color: tokens.fg,
                padding: EdgeInsets.symmetric(horizontal: tokens.lg, vertical: tokens.sm),
                child: Row(
                  children: [
                    Icon(Icons.cloud_off_outlined, size: 16, color: tokens.bg),
                    SizedBox(width: tokens.sm),
                    Text(
                      AppLocalizations.of(context).offlineBanner,
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(color: tokens.bg),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
