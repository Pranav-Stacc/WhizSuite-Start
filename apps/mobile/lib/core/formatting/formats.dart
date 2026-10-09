import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

import '../../l10n/app_localizations.dart';
import '../widgets/status_badge.dart';

/// App-wide formatting defaults, provided once above the router.
class FormatDefaults extends InheritedWidget {
  const FormatDefaults({required this.currency, required super.child, super.key});

  final String currency;

  static FormatDefaults of(BuildContext context) {
    final defaults = context.dependOnInheritedWidgetOfExactType<FormatDefaults>();
    assert(defaults != null, 'FormatDefaults is missing above this context');
    return defaults!;
  }

  @override
  bool updateShouldNotify(FormatDefaults oldWidget) => currency != oldWidget.currency;
}

/// Due-date wording and tone for a deadline.
typedef DueLabel = ({String label, StatusTone tone});

/// Locale-aware formatting for money (stored in minor units), numbers, dates and durations.
class AppFormats {
  AppFormats._(this._l10n, this._locale, this._currency);

  factory AppFormats.of(BuildContext context) => AppFormats._(
        AppLocalizations.of(context),
        Localizations.localeOf(context).toLanguageTag(),
        FormatDefaults.of(context).currency,
      );

  static const minorUnitsPerMajor = 100;
  static const _bytesPerKb = 1024;
  static const _minutesPerHour = 60;
  static const _hoursPerDay = 24;
  static const _daysPerWeek = 7;
  static const _relativeDayLimit = 30;

  final AppLocalizations _l10n;
  final String _locale;
  final String _currency;

  String get currency => _currency;

  String money(int minor, {String? currency, bool compact = false}) {
    final code = currency ?? _currency;
    final format = compact
        ? NumberFormat.compactSimpleCurrency(locale: _locale, name: code)
        : NumberFormat.simpleCurrency(locale: _locale, name: code, decimalDigits: 0);
    return format.format(minor / minorUnitsPerMajor);
  }

  String number(num value, {bool compact = false}) =>
      (compact ? NumberFormat.compact(locale: _locale) : NumberFormat.decimalPattern(_locale)).format(value);

  String percent(double ratio) => NumberFormat.percentPattern(_locale).format(ratio);

  String date(DateTime value) => DateFormat.yMMMd(_locale).format(value.toLocal());

  String shortDate(DateTime value) => DateFormat.MMMd(_locale).format(value.toLocal());

  String dateTime(DateTime value) => DateFormat.yMMMd(_locale).add_jm().format(value.toLocal());

  String time(DateTime value) => DateFormat.jm(_locale).format(value.toLocal());

  String weekday(DateTime value) => DateFormat.EEEE(_locale).format(value.toLocal());

  String monthYear(DateTime value) => DateFormat.yMMMM(_locale).format(value.toLocal());

  /// "3h 20m" style duration from minutes.
  String duration(int minutes) {
    final hours = minutes ~/ _minutesPerHour;
    final rest = minutes % _minutesPerHour;
    if (hours == 0) return _l10n.durationMinutes(rest);
    if (rest == 0) return _l10n.durationHours(hours);
    return _l10n.durationHoursMinutes(hours, rest);
  }

  /// Elapsed stopwatch text: `1:05:09`.
  String stopwatch(Duration elapsed) {
    String two(int n) => n.toString().padLeft(2, '0');
    final hours = elapsed.inHours;
    final minutes = elapsed.inMinutes % _minutesPerHour;
    final seconds = elapsed.inSeconds % Duration.secondsPerMinute;
    return '$hours:${two(minutes)}:${two(seconds)}';
  }

  String fileSize(int bytes) {
    if (bytes <= 0) return _l10n.valueUnknown;
    final kb = bytes / _bytesPerKb;
    if (kb < _bytesPerKb) return _l10n.fileSizeKb(kb.ceil());
    return _l10n.fileSizeMb(NumberFormat('0.0', _locale).format(kb / _bytesPerKb));
  }

  /// "just now", "5m ago", "in 3d" — falls back to a date beyond a month.
  String relative(DateTime value, {DateTime? now}) {
    final diff = value.difference(now ?? DateTime.now());
    final future = !diff.isNegative;
    final abs = diff.abs();
    if (abs.inMinutes < 1) return _l10n.timeJustNow;
    if (abs.inHours < 1) return future ? _l10n.timeInMinutes(abs.inMinutes) : _l10n.timeMinutesAgo(abs.inMinutes);
    if (abs.inDays < 1) return future ? _l10n.timeInHours(abs.inHours) : _l10n.timeHoursAgo(abs.inHours);
    if (abs.inDays < _relativeDayLimit) return future ? _l10n.timeInDays(abs.inDays) : _l10n.timeDaysAgo(abs.inDays);
    return date(value);
  }

  /// Deadline wording with urgency tone; completed work reads as its date.
  DueLabel due(DateTime value, {bool done = false, DateTime? now}) {
    if (done) return (label: shortDate(value), tone: StatusTone.success);
    final today = _day(now ?? DateTime.now());
    final days = (_day(value).difference(today).inHours / _hoursPerDay).round();
    if (days < 0) return (label: _l10n.dueOverdue(-days), tone: StatusTone.danger);
    if (days == 0) return (label: _l10n.dueToday, tone: StatusTone.warning);
    if (days == 1) return (label: _l10n.dueTomorrow, tone: StatusTone.warning);
    if (days <= _daysPerWeek) return (label: _l10n.dueInDays(days), tone: StatusTone.neutral);
    return (label: shortDate(value), tone: StatusTone.neutral);
  }

  static DateTime _day(DateTime value) {
    final local = value.toLocal();
    return DateTime(local.year, local.month, local.day);
  }
}

extension FormatsContext on BuildContext {
  AppFormats get formats => AppFormats.of(this);
}
