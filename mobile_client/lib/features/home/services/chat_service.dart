import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:mobile_client/features/home/models/chat_type.dart';
import 'package:mobile_client/shared/services/socket_service.dart';

import '../../authentication/services/auth_service.dart';

class ChatService {
  static ChatService? _instance;

  factory ChatService() {
    _instance ??= ChatService._internal();
    return _instance!;
  }

  ChatService._internal() {
    _setupListeners();

    // Comme Angular: attendre la connexion puis récupérer l'historique
    socketService.isConnected.addListener(() {
      if (socketService.isConnected.value) {
        retrieveMessages();
      }
    });
  }

  final SocketService socketService = SocketService();
  final AuthService authService = AuthService();

  final ValueNotifier<List<GlobalChatMessage>> messages =
      ValueNotifier<List<GlobalChatMessage>>(<GlobalChatMessage>[]);

  static const String _sendGlobalMessage = 'sendGlobalMessage';
  static const String _receiveGlobalMessage = 'receiveGlobalMessage';
  static const String _retrieveGlobalMessages = 'retrieveGlobalMessages';
  static const String _giveGlobalMessages = 'giveGlobalMessages';

  void connect() {
    socketService.connect();
  }

  void disconnect() {
    socketService.disconnect();
  }

  void sendMessage(String content) {
    final username = authService.currentUser?.username;
    if (username == null || content.trim().isEmpty) return;

    final message = GlobalChatMessage(
      username: username,
      content: content.trim(),
      timestamp: DateTime.now(),
    );

    socketService.sendMessage<Map<String, dynamic>>(
      _sendGlobalMessage,
      message.toMap(),
    );
  }

  void retrieveMessages() {
    socketService.sendMessage<Map<String, dynamic>>(_retrieveGlobalMessages, {});
  }

  void dispose() {
    socketService.off(_receiveGlobalMessage);
    socketService.off(_giveGlobalMessages);
    messages.dispose();
  }

  void _setupListeners() {
    socketService.on<dynamic>(_receiveGlobalMessage, (data) {
      try {
        final msg = GlobalChatMessage.fromMap(data as Map<String, dynamic>);
        messages.value = [...messages.value, msg];
      } catch (e) {
        if (kDebugMode) {
          debugPrint('chat receive parse error: $e');
        }
      }
    });

    socketService.on<dynamic>(_giveGlobalMessages, (data) {
      try {
        final list = (data as List)
            .map((e) => GlobalChatMessage.fromMap(e as Map<String, dynamic>))
            .toList();
        messages.value = list;
      } catch (e) {
        if (kDebugMode) {
          debugPrint('chat history parse error: $e');
        }
      }
    });
  }
}

