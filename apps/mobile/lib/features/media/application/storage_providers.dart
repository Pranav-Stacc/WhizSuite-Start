import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/storage_repository.dart';
import '../domain/storage_models.dart';

final storageUsageProvider = FutureProvider.autoDispose<StorageUsage>(
  (ref) => ref.watch(storageRepositoryProvider).usage(),
);

final dataSourcesProvider = FutureProvider.autoDispose<List<MediaDataSource>>(
  (ref) => ref.watch(storageRepositoryProvider).dataSources(),
);
