import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../application/access_controller.dart';

/// Renders [child] only when the member holds any of [anyOf]. Use for actions
/// (create, edit, delete); the API enforces the same permission server-side.
class PermissionGate extends ConsumerWidget {
  const PermissionGate({required this.anyOf, required this.child, this.fallback, super.key});

  final List<String> anyOf;
  final Widget child;
  final Widget? fallback;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final allowed = ref.watch(accessPolicyProvider.select((policy) => policy.canAny(anyOf)));
    return allowed ? child : (fallback ?? const SizedBox.shrink());
  }
}
