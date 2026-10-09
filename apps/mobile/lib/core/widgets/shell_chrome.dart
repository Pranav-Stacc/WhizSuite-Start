import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';

/// Opens the shell sidebar from nested page scaffolds without a core→app import cycle.
class ShellChrome extends InheritedWidget {
  const ShellChrome({required this.openSidebar, required super.child, super.key});

  final VoidCallback openSidebar;

  static ShellChrome? maybeOf(BuildContext context) => context.dependOnInheritedWidgetOfExactType<ShellChrome>();

  @override
  bool updateShouldNotify(ShellChrome oldWidget) => openSidebar != oldWidget.openSidebar;
}

/// Menu control shown in page app bars when a shell sidebar is available.
class SidebarMenuButton extends StatelessWidget {
  const SidebarMenuButton({super.key});

  @override
  Widget build(BuildContext context) {
    final chrome = ShellChrome.maybeOf(context);
    if (chrome == null) return const SizedBox.shrink();
    return IconButton(
      tooltip: AppLocalizations.of(context).navMenu,
      icon: const Icon(Icons.menu_rounded),
      onPressed: chrome.openSidebar,
    );
  }
}
