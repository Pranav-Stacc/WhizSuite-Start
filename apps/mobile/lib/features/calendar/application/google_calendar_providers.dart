import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/calendar_repository.dart';
import '../domain/google_calendar_connection.dart';

final googleCalendarConnectionProvider = FutureProvider.autoDispose<GoogleCalendarConnection>(
  (ref) => ref.watch(calendarRepositoryProvider).googleConnection(),
);
