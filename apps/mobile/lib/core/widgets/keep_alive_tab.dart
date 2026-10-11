import 'package:flutter/material.dart';

/// Keeps a [TabBarView] child mounted so switching tabs does not flash white or reload.
class KeepAliveTab extends StatefulWidget {
  const KeepAliveTab({required this.child, super.key});

  final Widget child;

  @override
  State<KeepAliveTab> createState() => _KeepAliveTabState();
}

class _KeepAliveTabState extends State<KeepAliveTab> with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return widget.child;
  }
}
