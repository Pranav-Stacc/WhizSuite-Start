import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/application/session_controller.dart';
import '../../features/dashboard/presentation/staff_dashboard.dart';
import '../../features/portal/presentation/portal_home.dart';

/// Landing screen: the agency dashboard for staff, the portal home for client members.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider).value;
    if (session == null) return const SizedBox.shrink();
    return session.isClientPortal ? const PortalHome() : const StaffDashboard();
  }
}
