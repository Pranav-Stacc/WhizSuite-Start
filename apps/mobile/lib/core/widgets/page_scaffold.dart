import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

/// App-bar actions every page shows (e.g. the notification bell), injected by the app shell
/// so shared widgets never depend on feature code.
class ShellActions extends InheritedWidget {
  const ShellActions({required this.actions, required super.child, super.key});

  final List<Widget> actions;

  static List<Widget> of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<ShellActions>()?.actions ?? const [];

  @override
  bool updateShouldNotify(ShellActions oldWidget) => actions != oldWidget.actions;
}

/// Standard page frame: title bar with page + shell actions, optional FAB and bottom area.
class PageScaffold extends StatelessWidget {
  const PageScaffold({
    required this.title,
    required this.body,
    this.actions = const [],
    this.floatingActionButton,
    this.bottom,
    this.showShellActions = true,
    super.key,
  });

  final String title;
  final Widget body;
  final List<Widget> actions;
  final Widget? floatingActionButton;
  final PreferredSizeWidget? bottom;
  final bool showShellActions;

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: Text(title),
          bottom: bottom,
          actions: [...actions, if (showShellActions) ...ShellActions.of(context)],
        ),
        floatingActionButton: floatingActionButton,
        body: body,
      );
}

/// Centered, width-capped scrolling body for detail and form-like screens.
class ReadableBody extends StatelessWidget {
  const ReadableBody({required this.children, this.onRefresh, super.key});

  static const maxWidth = 960.0;

  final List<Widget> children;
  final Future<void> Function()? onRefresh;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final list = ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: EdgeInsets.fromLTRB(tokens.lg, tokens.lg, tokens.lg, tokens.xxl * 2),
      children: [
        Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: maxWidth),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children),
          ),
        ),
      ],
    );
    return onRefresh == null ? list : RefreshIndicator(onRefresh: onRefresh!, child: list);
  }
}

/// Extended FAB for the primary create action of a page.
class CreateFab extends StatelessWidget {
  const CreateFab({required this.label, required this.onPressed, this.icon = Icons.add, super.key});

  final String label;
  final VoidCallback onPressed;
  final IconData icon;

  @override
  Widget build(BuildContext context) =>
      FloatingActionButton.extended(onPressed: onPressed, icon: Icon(icon), label: Text(label));
}
