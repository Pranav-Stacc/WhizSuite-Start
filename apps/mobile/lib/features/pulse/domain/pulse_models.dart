import 'package:flutter/material.dart';

/// Cross-module signal shown on the Pulse hub.
enum PulseKind {
  task,
  approval,
  content,
  invoice,
  calendar,
  notification,
}

class PulseItem {
  const PulseItem({
    required this.id,
    required this.kind,
    required this.title,
    required this.route,
    this.subtitle,
    this.at,
    this.allDay = false,
    this.urgent = false,
  });

  final String id;
  final PulseKind kind;
  final String title;
  final String? subtitle;
  final String route;

  /// Local time for sorting; null means "anytime today".
  final DateTime? at;
  final bool allDay;
  final bool urgent;
}

class PulseDigest {
  const PulseDigest({
    required this.now,
    required this.today,
    required this.weekAhead,
    required this.inbox,
    required this.moduleCounts,
    required this.ready,
  });

  final DateTime now;
  final List<PulseItem> today;
  final List<PulseItem> weekAhead;
  final List<PulseItem> inbox;
  final Map<PulseKind, int> moduleCounts;
  final bool ready;

  int get todayCount => today.length;
  int get urgentCount => today.where((i) => i.urgent).length;
  int get unreadCount => inbox.length;

  bool get isClear => ready && today.isEmpty && weekAhead.isEmpty && inbox.isEmpty;
}

IconData pulseKindIcon(PulseKind kind) => switch (kind) {
      PulseKind.task => Icons.check_circle_outline,
      PulseKind.approval => Icons.fact_check_outlined,
      PulseKind.content => Icons.layers_outlined,
      PulseKind.invoice => Icons.receipt_long_outlined,
      PulseKind.calendar => Icons.event_outlined,
      PulseKind.notification => Icons.notifications_none_outlined,
    };
