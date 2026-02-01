import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

class SocketService {
  static SocketService? _instance;

  factory SocketService({String? url}) {
    _instance ??= SocketService._internal(url: url);
    return _instance!;
  }

  SocketService._internal({String? url}) {
    final effectiveUrl = (url == null || url.isEmpty) ? _defaultUrl : url;
    _socket = io.io(
      effectiveUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .build(),
    );

    _setupSocketListeners();
  }

  static const String _defaultUrl = 'http://98.88.78.57:3000';

  late final io.Socket _socket;

  final ValueNotifier<bool> isConnected = ValueNotifier<bool>(false);

  void connect() {
    if (!_socket.connected) {
      _socket.connect();
    }
  }

  void disconnect() {
    _socket.disconnect();
  }

  void on<T>(String event, void Function(T data) callback) {
    _socket.on(event, (data) => callback(data as T));
  }

  void off(String event) {
    _socket.off(event);
  }

  void sendMessage<T>(String event, T message) {
    if (!_socket.connected) {
      _socket.connect();
    }
    if (kDebugMode) {
      debugPrint('socket emit: $event -> $message');
    }
    _socket.emit(event, message);
  }

  String? getSocketId() => _socket.id;

  void dispose() {
    _socket.dispose();
    isConnected.dispose();
  }

  void _setupSocketListeners() {
    _socket.onConnect((_) => isConnected.value = true);
    _socket.onDisconnect((_) => isConnected.value = false);
    _socket.onConnectError((_) => isConnected.value = false);
  }
}

