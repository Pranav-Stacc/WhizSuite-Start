import 'package:go_router/go_router.dart';

import '../../features/integrations/integrations_routes.dart';
import '../navigation/app_routes.dart';

/// Maps `whizsuite://oauth?…` (Meta / Drive / Calendar mobile OAuth) to in-app routes.
///
/// Android also delivers this URI to [GoRouter] after [FlutterWebAuth2] completes;
/// without a redirect, GoRouter throws "no route for location".
String? redirectMetaOAuthDeepLink(GoRouterState state, {required String scheme}) {
  final uri = _oauthCallbackUri(state, scheme);
  if (uri == null) return null;

  final drive = uri.queryParameters['drive'];
  if (drive != null && drive.isNotEmpty) {
    return Uri(
      path: AppRoutes.storage,
      queryParameters: {'drive': drive},
    ).toString();
  }

  final gcal = uri.queryParameters['gcal'];
  if (gcal != null && gcal.isNotEmpty) {
    return Uri(
      path: AppRoutes.storage,
      queryParameters: {'gcal': gcal},
    ).toString();
  }

  final meta = uri.queryParameters['meta'];
  final client = uri.queryParameters['client'];
  return Uri(
    path: IntegrationsRoutes.root,
    queryParameters: {
      if (meta != null && meta.isNotEmpty) IntegrationsRoutes.metaQuery: meta,
      if (client != null && client.isNotEmpty) IntegrationsRoutes.clientQuery: client,
    },
  ).toString();
}

Uri? _oauthCallbackUri(GoRouterState state, String scheme) {
  final normalized = scheme.toLowerCase();
  final candidates = <Uri>[state.uri];
  final location = state.uri.toString();
  if (location.contains('://')) {
    final parsed = Uri.tryParse(location);
    if (parsed != null) candidates.add(parsed);
  }
  final matched = state.matchedLocation;
  if (matched.contains('://')) {
    final parsed = Uri.tryParse(matched);
    if (parsed != null) candidates.add(parsed);
  }

  for (final uri in candidates) {
    if (uri.scheme.toLowerCase() == normalized && uri.host == 'oauth') return uri;
    if (uri.host.isEmpty && (uri.path == '/oauth' || uri.path.endsWith('/oauth'))) return uri;
  }
  return null;
}
