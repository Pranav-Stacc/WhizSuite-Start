import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';
import 'shell_chrome.dart';

/// App-bar actions every page shows (e.g. the notification bell), injected by the app shell
/// so shared widgets never depend on feature code.
class ShellActions extends InheritedWidget {
  const ShellActions({
    required this.actions,
    required this.showInAppBar,
    required super.child,
    super.key,
  });

  final List<Widget> actions;

  /// When false, hub actions stay out of nested/detail app bars.
  final bool showInAppBar;

  static ShellActions? _maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<ShellActions>();

  static List<Widget> of(BuildContext context) => _maybeOf(context)?.actions ?? const [];

  static bool showInAppBarOf(BuildContext context) => _maybeOf(context)?.showInAppBar ?? false;

  @override
  bool updateShouldNotify(ShellActions oldWidget) =>
      actions != oldWidget.actions || showInAppBar != oldWidget.showInAppBar;
}

/// Standard page frame: title bar with page + shell actions, optional FAB and bottom area.
class PageScaffold extends StatelessWidget {
  const PageScaffold({
    required this.title,
    required this.body,
    this.actions = const [],
    this.floatingActionButton,
    this.bottom,
    this.endDrawer,
    this.scaffoldKey,
    this.showShellActions,
    super.key,
  });

  final String title;
  final Widget body;
  final List<Widget> actions;
  final Widget? floatingActionButton;
  final PreferredSizeWidget? bottom;
  final Widget? endDrawer;
  final GlobalKey<ScaffoldState>? scaffoldKey;

  /// When null, follows [ShellActions.showInAppBar] from the app shell (hub screens only).
  final bool? showShellActions;

  @override
  Widget build(BuildContext context) {
    final canPop = ModalRoute.of(context)?.canPop ?? false;
    final showMenu = !canPop && ShellChrome.maybeOf(context) != null;
    final tokens = context.tokens;
    final includeShell = showShellActions ?? ShellActions.showInAppBarOf(context);
    return Scaffold(
      key: scaffoldKey,
      backgroundColor: tokens.bg,
      endDrawer: endDrawer,
      appBar: AppBar(
        leading: showMenu ? const SidebarMenuButton() : null,
        title: Text(title),
        bottom: bottom,
        actions: [...actions, if (includeShell) ...ShellActions.of(context)],
      ),
      floatingActionButton: floatingActionButton,
      body: body,
    );
  }
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
      padding: EdgeInsets.fromLTRB(tokens.md, tokens.md, tokens.md, tokens.xxl),
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
  Widget build(BuildContext context) => FloatingActionButton.extended(
        heroTag: null,
        onPressed: onPressed,
        icon: Icon(icon),
        label: Text(label),
      );
}
