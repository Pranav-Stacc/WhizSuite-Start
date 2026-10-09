import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../auth/token_store.dart';
import '../config/app_config.dart';
import '../contracts/contracts.g.dart';

typedef RealtimeEvent = ({String name, Object? payload});

/// Authenticated Socket.IO connection to the API's realtime namespace.
/// Reconnects with the latest access token whenever tokens rotate.
class RealtimeClient {
  RealtimeClient(this._config, this._tokens);

  static const _serverDisconnect = 'io server disconnect';

  final AppConfig _config;
  final TokenStore _tokens;
  final _events = StreamController<RealtimeEvent>.broadcast();
  final _rejected = StreamController<void>.broadcast();
  io.Socket? _socket;
  StreamSubscription<AuthTokens?>? _tokenChanges;

  Stream<RealtimeEvent> get events => _events.stream;

  /// Fires when the server drops the connection (usually an expired token);
  /// the owner should refresh the session, which triggers a reconnect.
  Stream<void> get rejected => _rejected.stream;

  void connect() {
    _tokenChanges ??= _tokens.onChanged.listen((tokens) {
      _disconnect();
      if (tokens != null) _open(tokens.accessToken);
    });
    final token = _tokens.current?.accessToken;
    if (_socket == null && token != null) _open(token);
  }

  void _open(String accessToken) {
    final socket = io.io(
      _config.realtimeUrl.resolve(realtimeNamespace).toString(),
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': accessToken})
          .disableAutoConnect()
          .enableReconnection()
          .build(),
    );
    for (final name in RealtimeEvents.values) {
      socket.on(name, (payload) => _events.add((name: name, payload: payload)));
    }
    socket.onDisconnect((reason) {
      if (reason == _serverDisconnect) _rejected.add(null);
    });
    _socket = socket..connect();
  }

  void _disconnect() {
    _socket
      ?..clearListeners()
      ..dispose();
    _socket = null;
  }

  void close() {
    _tokenChanges?.cancel();
    _tokenChanges = null;
    _disconnect();
  }

  void dispose() {
    close();
    _events.close();
    _rejected.close();
  }
}

final realtimeClientProvider = Provider<RealtimeClient>((ref) {
  final client = RealtimeClient(ref.watch(appConfigProvider), ref.watch(tokenStoreProvider));
  ref.onDispose(client.dispose);
  return client;
});
