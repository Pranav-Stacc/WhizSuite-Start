import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/pulse/presentation/pulse_hub_screen.dart';

/// Bottom-nav “Pulse” tab — cross-module updates (sidebar holds the full module grid).
class MoreScreen extends ConsumerWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) => const PulseHubScreen();
}
