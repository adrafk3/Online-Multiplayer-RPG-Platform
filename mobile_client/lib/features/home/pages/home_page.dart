import 'package:flutter/material.dart';
import 'package:mobile_client/features/home/models/chat_type.dart';
import 'package:mobile_client/features/home/services/chat_service.dart';
import 'package:mobile_client/utils/avatar_utils.dart';

import '../../authentication/services/auth_service.dart';

/// Page d'accueil (menu principal)
class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    const borderBlue = Color(0xFF1E5BB8);
    final authService = AuthService();
    final chatService = ChatService();

    return Scaffold(
      body: Stack(
        children: [
          Positioned.fill(
            child: Image.asset('assets/gif_stats.gif', fit: BoxFit.cover),
          ),

          SafeArea(
            child: Stack(
              children: [
                // Contenu principal (logo + boutons)
                Center(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 24,
                      vertical: 24,
                    ),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 520),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Logo
                          Image.asset(
                            'assets/logo.png',
                            height: 220,
                            fit: BoxFit.contain,
                          ),

                          const SizedBox(height: 28),

                          // Boutons (pas d'action pour l'instant)
                          const _MenuButton(
                            label: 'Joindre une partie',
                            borderColor: borderBlue,
                          ),
                          const SizedBox(height: 18),
                          const _MenuButton(
                            label: 'Créer une partie',
                            borderColor: borderBlue,
                          ),
                          const SizedBox(height: 18),
                          const _MenuButton(
                            label: 'Administrer les jeux',
                            borderColor: borderBlue,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                // Icônes en haut à droite
                Positioned(
                  top: 8,
                  right: 8,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _TopIconButton(
                        icon: Icons.chat_bubble_outline,
                        onPressed: () async {
                          chatService.connect();
                          await showChatDialog(
                            context: context,
                            authService: authService,
                            borderBlue: borderBlue,
                            chatService: chatService,
                          );
                        },
                      ),
                      const SizedBox(width: 10),
                      _TopIconButton(
                        icon: Icons.volume_off_outlined,
                        onPressed: () {
                          // Intentionnellement vide (audio à brancher plus tard)
                        },
                      ),
                      const SizedBox(width: 10),
                      StreamBuilder(
                        stream: authService.currentUser$,
                        builder: (context, snapshot) {
                          final profile = snapshot.data;

                          return _AvatarIconButton(
                            avatarAssetPath: profile?.avatar,
                            onPressed: () {
                              _showProfileMenu(
                                context: context,
                                authService: authService,
                                borderBlue: borderBlue,
                              );
                            },
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MenuButton extends StatelessWidget {
  final String label;
  final Color borderColor;

  const _MenuButton({required this.label, required this.borderColor});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 64,
      child: ElevatedButton(
        onPressed: () {
          // Intentionnellement vide (l'utilisateur définira la navigation ensuite)
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.white,
          foregroundColor: Colors.black,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(36),
            side: BorderSide(color: borderColor, width: 3),
          ),
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
        ),
      ),
    );
  }
}

class _TopIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onPressed;

  const _TopIconButton({required this.icon, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 40,
      height: 40,
      child: Material(
        color: Colors.white.withValues(alpha: 0.92),
        shape: const CircleBorder(),
        child: IconButton(
          padding: EdgeInsets.zero,
          icon: Icon(icon, size: 20, color: Colors.black87),
          onPressed: onPressed,
          tooltip: '',
        ),
      ),
    );
  }
}

class _AvatarIconButton extends StatelessWidget {
  final String? avatarAssetPath;
  final VoidCallback onPressed;

  const _AvatarIconButton({
    required this.avatarAssetPath,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    final avatarPath = getAvatarPath(avatarAssetPath);

    return SizedBox(
      width: 40,
      height: 40,
      child: Material(
        color: Colors.white.withValues(alpha: 0.92),
        shape: const CircleBorder(),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onPressed,
          child: Padding(
            padding: const EdgeInsets.all(4),
            child: ClipOval(
              child: avatarPath.isEmpty
                  ? const Icon(Icons.person, size: 20, color: Colors.black87)
                  : Image.asset(
                      avatarPath,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => const Icon(
                        Icons.person,
                        size: 20,
                        color: Colors.black87,
                      ),
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

Future<void> _showProfileMenu({
  required BuildContext context,
  required AuthService authService,
  required Color borderBlue,
}) async {
  await showGeneralDialog<void>(
    context: context,
    barrierDismissible: true,
    barrierLabel: 'Fermer',
    barrierColor: Colors.black.withValues(alpha: 0.35),
    pageBuilder: (dialogContext, animation, secondaryAnimation) {
      return SafeArea(
        child: Stack(
          children: [
            Align(
              alignment: Alignment.topRight,
              child: Padding(
                padding: const EdgeInsets.only(top: 56, right: 12),
                child: Material(
                  color: Colors.transparent,
                  child: StreamBuilder(
                    stream: authService.currentUser$,
                    builder: (context, snapshot) {
                      final profile = snapshot.data;
                      final username = profile?.username ?? 'Utilisateur';
                      final email = profile?.email ?? '';
                      final avatarPath = getAvatarPath(profile?.avatar);

                      return Container(
                        width: 260,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.96),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: borderBlue, width: 2),
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Row(
                              children: [
                                Container(
                                  width: 44,
                                  height: 44,
                                  decoration: BoxDecoration(
                                    border: Border.all(
                                      color: borderBlue,
                                      width: 2,
                                    ),
                                  ),
                                  child: avatarPath.isEmpty
                                      ? const Icon(Icons.person)
                                      : Image.asset(
                                          avatarPath,
                                          fit: BoxFit.cover,
                                          errorBuilder:
                                              (context, error, stackTrace) =>
                                                  const Icon(Icons.person),
                                        ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        username,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        email,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: Colors.black54,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Divider(height: 1, color: borderBlue, thickness: 2),
                            SizedBox(
                              height: 44,
                              width: double.infinity,
                              child: TextButton(
                                onPressed: () async {
                                  try {
                                    await authService.logout();
                                    if (dialogContext.mounted) {
                                      Navigator.of(dialogContext).pop();
                                    }
                                    if (context.mounted) {
                                      Navigator.pushNamedAndRemoveUntil(
                                        context,
                                        '/login',
                                        (_) => false,
                                      );
                                    }
                                  } catch (e) {
                                    if (!context.mounted) return;
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text(
                                          'Déconnexion impossible: ${e.toString()}',
                                        ),
                                      ),
                                    );
                                  }
                                },
                                child: const Text(
                                  'Déconnexion',
                                  style: TextStyle(
                                    color: Colors.red,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
              ),
            ),
          ],
        ),
      );
    },
    transitionDuration: const Duration(milliseconds: 140),
    transitionBuilder: (context, animation, secondaryAnimation, child) {
      final curved = CurvedAnimation(
        parent: animation,
        curve: Curves.easeOutCubic,
      );
      return FadeTransition(
        opacity: curved,
        child: ScaleTransition(
          scale: Tween<double>(begin: 0.98, end: 1).animate(curved),
          child: child,
        ),
      );
    },
  );
}

Future<void> showChatDialog({
  required BuildContext context,
  required AuthService authService,
  required Color borderBlue,
  required ChatService chatService,
}) async {
  await showGeneralDialog<void>(
    context: context,

    // ✅ Le tap dehors NE FERME JAMAIS le dialog
    barrierDismissible: false,

    // Important: on garde un label (accessibilité)
    barrierLabel: 'Chat',

    barrierColor: Colors.black.withOpacity(0.35),

    pageBuilder: (dialogContext, _, __) {
      return SafeArea(
        child: Stack(
          children: [
            // Fond du dialog: tap dehors => ferme seulement le clavier
            Positioned.fill(
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => FocusScope.of(dialogContext).unfocus(),
                child: const SizedBox.expand(),
              ),
            ),

            // Fenêtre de chat (interactive)
            Positioned(
              top: 56,
              right: 12,
              left: null,
              bottom: 0,
              child: Material(
                color: Colors.transparent,
                child: _ChatDialogBody(
                  borderBlue: borderBlue,
                  authService: authService,
                  chatService: chatService,
                ),
              ),
            ),
          ],
        ),
      );
    },

    transitionDuration: const Duration(milliseconds: 140),
    transitionBuilder: (context, animation, _, child) {
      final curved = CurvedAnimation(
        parent: animation,
        curve: Curves.easeOutCubic,
      );
      return FadeTransition(
        opacity: curved,
        child: ScaleTransition(
          scale: Tween<double>(begin: 0.98, end: 1).animate(curved),
          child: child,
        ),
      );
    },
  );
}

/// Widget séparé pour éviter des closures qui se déclenchent après pop
class _ChatDialogBody extends StatefulWidget {
  final Color borderBlue;
  final AuthService authService;
  final ChatService chatService;

  const _ChatDialogBody({
    required this.borderBlue,
    required this.authService,
    required this.chatService,
  });

  @override
  State<_ChatDialogBody> createState() => _ChatDialogBodyState();
}

class _ChatDialogBodyState extends State<_ChatDialogBody> {
  late final TextEditingController _controller;
  late final ScrollController _scrollController;
  late final FocusNode _inputFocusNode;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController();
    _scrollController = ScrollController();
    _inputFocusNode = FocusNode();
  }

  @override
  void dispose() {
    // ✅ Dispose ici pour être synchronisé avec la route du dialog
    // (évite "FocusNode used after being disposed" pendant l'animation de fermeture)
    _inputFocusNode.unfocus();
    _controller.dispose();
    _scrollController.dispose();
    _inputFocusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final viewInsets = MediaQuery.of(context).viewInsets;

    return AnimatedPadding(
      duration: const Duration(milliseconds: 200),
      curve: Curves.easeOut,
      padding: EdgeInsets.only(bottom: viewInsets.bottom),
      child: Container(
        width: 400,
        height: double.infinity,
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.98),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: widget.borderBlue, width: 3),
        ),
        child: Column(
          children: [
            // Header
            Container(
              width: double.infinity,
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border(
                  bottom: BorderSide(color: widget.borderBlue, width: 3),
                ),
              ),
              child: Row(
                children: [
                  const Expanded(
                    child: Text(
                      'CHAT GLOBAL',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.2,
                      ),
                    ),
                  ),
                  SizedBox(
                    width: 34,
                    height: 34,
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        padding: EdgeInsets.zero,
                        side: BorderSide(color: widget.borderBlue, width: 3),
                        shape: const RoundedRectangleBorder(),
                      ),
                      onPressed: () {
                      // ✅ Seul moyen de fermer
                      // Utiliser le context du dialog (pas un context capturé) évite
                      // des crashs pendant le démontage.
                      FocusScope.of(context).unfocus();
                      Navigator.of(context).pop();
                      },
                      child: const Icon(
                        Icons.close,
                        size: 18,
                        color: Colors.black,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Messages
            Expanded(
              child: Container(
                color: Colors.black,
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                child: ValueListenableBuilder<List<GlobalChatMessage>>(
                  valueListenable: widget.chatService.messages,
                  builder: (context, messages, child) {
                    // ✅ auto-scroll safe avec vérifications multiples
                    WidgetsBinding.instance.addPostFrameCallback((_) {
                      if (!mounted) return;
                      if (!_scrollController.hasClients) return;
                      try {
                        final position = _scrollController.position;
                        if (position.maxScrollExtent > position.pixels) {
                          _scrollController.jumpTo(
                            position.maxScrollExtent,
                          );
                        }
                      } catch (_) {
                        // Ignore les erreurs si le controller est déjà disposé
                      }
                    });

                    final ordered = [...messages]
                      ..sort((a, b) => a.timestamp.compareTo(b.timestamp));

                    return ListView.builder(
                      controller: _scrollController,
                      itemCount: ordered.length,
                      itemBuilder: (context, index) {
                        final msg = ordered[index];
                        final isMe = msg.username ==
                            (widget.authService.currentUser?.username ?? '');
                        return _chatBubble(
                          msg,
                          isMe: isMe,
                          borderBlue: widget.borderBlue,
                        );
                      },
                    );
                  },
                ),
              ),
            ),

            // Input
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border(
                  top: BorderSide(color: widget.borderBlue, width: 3),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      focusNode: _inputFocusNode,
                      decoration: InputDecoration(
                        hintText: 'Écrivez votre message...',
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(2),
                          borderSide: BorderSide(
                            color: widget.borderBlue,
                            width: 3,
                          ),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(2),
                          borderSide: BorderSide(
                            color: widget.borderBlue,
                            width: 3,
                          ),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 10,
                        ),
                      ),
                      textInputAction: TextInputAction.done,
                      onSubmitted: (value) {
                        _sendMessage(
                          value,
                          widget.chatService,
                          widget.authService,
                          _controller,
                        );
                        FocusScope.of(context).unfocus();
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  SizedBox(
                    width: 44,
                    height: 44,
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        padding: EdgeInsets.zero,
                        side: BorderSide(color: widget.borderBlue, width: 3),
                        shape: const RoundedRectangleBorder(),
                      ),
                      onPressed: () {
                        _sendMessage(
                          _controller.text,
                          widget.chatService,
                          widget.authService,
                          _controller,
                        );
                        if (!mounted) return;
                        _inputFocusNode.requestFocus();
                      },
                      child: Icon(
                        Icons.send,
                        size: 18,
                        color: widget.borderBlue,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

void _sendMessage(
  String content,
  ChatService chatService,
  AuthService authService,
  TextEditingController controller,
) {
  if (content.trim().isEmpty) return;
  chatService.sendMessage(content);

  controller.clear();
}

String _formatElapsed(DateTime timestamp) {
  // Affiche l'heure exacte d'envoi (locale) au format HH:mm:ss.
  final local = timestamp.toLocal();
  String two(int n) => n.toString().padLeft(2, '0');

  final hours = local.hour;
  final minutes = local.minute;
  final seconds = local.second;

  return '${two(hours)}:${two(minutes)}:${two(seconds)}';
}

Widget _chatBubble(
  GlobalChatMessage msg, {
  required bool isMe,
  required Color borderBlue,
}) {
  return Align(
    alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
    child: Container(
      constraints: const BoxConstraints(maxWidth: 280),
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: isMe ? borderBlue : Colors.white,
        border: Border.all(color: borderBlue, width: 3),
        borderRadius: BorderRadius.circular(2),
      ),
      child: Column(
        crossAxisAlignment:
            isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          Text(
            '${msg.username}  ${_formatElapsed(msg.timestamp)}',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.2,
              color: isMe ? Colors.white : Colors.black,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            msg.content,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: isMe ? Colors.white : Colors.black,
            ),
          ),
        ],
      ),
    ),
  );
}
