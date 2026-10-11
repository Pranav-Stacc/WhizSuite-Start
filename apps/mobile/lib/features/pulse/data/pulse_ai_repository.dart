import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

class PulseAiRepository {
  PulseAiRepository(this._api);

  final ApiClient _api;

  Future<String> summarizeBriefing(String text, {int maxSentences = 3}) async {
    final raw = await _api.post<Object?>('v1/ai/summarize', body: {'text': text, 'maxSentences': maxSentences});
    return jsonObject(raw).str('summary');
  }
}

final pulseAiRepositoryProvider = Provider<PulseAiRepository>(
  (ref) => PulseAiRepository(ref.watch(apiClientProvider)),
);
