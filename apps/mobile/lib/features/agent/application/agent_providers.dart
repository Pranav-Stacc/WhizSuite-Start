import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/agent_repository.dart';
import '../domain/agent_models.dart';

final agentSessionsProvider = FutureProvider.autoDispose<List<AgentSession>>(
  (ref) => ref.watch(agentRepositoryProvider).sessions(),
);

final agentPendingProvider = FutureProvider.autoDispose<List<AgentPendingAction>>(
  (ref) => ref.watch(agentRepositoryProvider).pending(),
);

final agentSessionProvider = FutureProvider.autoDispose.family<AgentSessionDetail, String>(
  (ref, sessionId) => ref.watch(agentRepositoryProvider).session(sessionId),
);

final agentSchedulesProvider = FutureProvider.autoDispose<List<AgentSchedule>>(
  (ref) => ref.watch(agentRepositoryProvider).schedules(),
);
