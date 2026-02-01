import 'package:flutter/material.dart';
import '../services/auth_service.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  // ========================================
  // CONTRÔLEURS ET SERVICE
  // ========================================
  
  /// Service d'authentification (singleton)
  final _authService = AuthService();
  
  /// Contrôleurs pour les champs de texte
  final _emailController = TextEditingController();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  
  /// Avatar sélectionné (1-9)
  int _selectedAvatar = 1;
  
  /// État de chargement
  bool _isLoading = false;
  
  /// Message d'erreur
  String _errorMessage = '';

  // ========================================
  // MÉTHODES
  // ========================================

  /// Gérer l'inscription (équivalent de handleRegister en Angular)
  Future<void> _handleRegister() async {
    // Validation basique
    if (_emailController.text.trim().isEmpty ||
        _usernameController.text.trim().isEmpty ||
        _passwordController.text.isEmpty) {
      setState(() {
        _errorMessage = 'Veuillez remplir tous les champs';
      });
      return;
    }

    // Réinitialiser l'erreur
    setState(() {
      _errorMessage = '';
      _isLoading = true;
    });

    // Construire le chemin de l'avatar (ex: "assets/avatar-1.png")
    final avatarName = 'avatar-$_selectedAvatar';

    // Appeler le service d'authentification
    final result = await _authService.register(
      username: _usernameController.text.trim(),
      email: _emailController.text.trim(),
      password: _passwordController.text,
      avatar: avatarName,
    );

    // Arrêter le chargement
    setState(() {
      _isLoading = false;
    });

    // Vérifier le résultat
    if (result.isSuccess) {
      // Succès : naviguer vers la page d'accueil
      if (mounted) {
        // TODO: Remplacer '/home' par la route de votre page d'accueil
        Navigator.pushReplacementNamed(context, '/home');
      }
    } else {
      // Erreur : afficher le message
      setState(() {
        _errorMessage = result.error ?? 'Une erreur est survenue';
      });
    }
  }

  @override
  void dispose() {
    // Nettoyer les contrôleurs
    _emailController.dispose();
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const borderBlue = Color(0xFF1E5BB8);

    InputDecoration fieldDecoration(String hint) {
      return InputDecoration(
        hintText: hint,
        filled: true,
        fillColor: Colors.white.withValues(alpha: 0.92),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 18,
          vertical: 14,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: borderBlue, width: 2),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: borderBlue, width: 2.5),
        ),
      );
    }

    return Scaffold(
      body: Stack(
        children: [
          // Background plein écran
          Positioned.fill(
            child: Image.asset('assets/gif_stats.gif', fit: BoxFit.cover),
          ),

          // Flèche retour
          Positioned(
            top: 16,
            left: 16,
            child: IconButton(
              icon: const Icon(Icons.arrow_back),
              color: Colors.white,
              iconSize: 28,
              onPressed: () => Navigator.pop(context),
            ),
          ),

          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(
                  horizontal: 22,
                  vertical: 18,
                ),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 520),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Logo
                      Image.asset(
                        'assets/logo.png',
                        height: 120,
                        fit: BoxFit.contain,
                      ),
                      const SizedBox(height: 14),

                      // Carte principale (comme sur l'image)
                      Container(
                        padding: const EdgeInsets.fromLTRB(18, 18, 18, 14),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.88),
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: borderBlue, width: 3),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            // Afficher le message d'erreur si présent
                            if (_errorMessage.isNotEmpty)
                              Container(
                                padding: const EdgeInsets.all(12),
                                margin: const EdgeInsets.only(bottom: 12),
                                decoration: BoxDecoration(
                                  color: Colors.red.shade50,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: Colors.red.shade300),
                                ),
                                child: Row(
                                  children: [
                                    Icon(Icons.error_outline, color: Colors.red.shade700),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        _errorMessage,
                                        style: TextStyle(
                                          color: Colors.red.shade700,
                                          fontSize: 14,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),

                            // Champ Identifiant (Email)
                            TextField(
                              controller: _emailController,
                              keyboardType: TextInputType.emailAddress,
                              enabled: !_isLoading,
                              decoration: fieldDecoration('Identifiant'),
                            ),
                            const SizedBox(height: 12),

                            // Champ Pseudonyme (Username)
                            TextField(
                              controller: _usernameController,
                              enabled: !_isLoading,
                              decoration: fieldDecoration('Pseudonyme'),
                            ),
                            const SizedBox(height: 12),

                            // Champ Mot de passe
                            TextField(
                              controller: _passwordController,
                              obscureText: true,
                              enabled: !_isLoading,
                              decoration: fieldDecoration('Mot de passe'),
                            ),
                            const SizedBox(height: 16),

                            // Texte avatar
                            const Text(
                              'Choisir un avatar pour le compte:',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 12),

                            // Grille avatars 3x3
                            Center(
                              child: Wrap(
                                spacing: 14,
                                runSpacing: 14,
                                children: List.generate(9, (i) {
                                  final avatarIndex = i + 1;
                                  final isSelected =
                                      avatarIndex == _selectedAvatar;

                                  return GestureDetector(
                                    onTap: () {
                                      setState(
                                        () => _selectedAvatar = avatarIndex,
                                      );
                                    },
                                    child: AnimatedContainer(
                                      duration: const Duration(
                                        milliseconds: 120,
                                      ),
                                      padding: const EdgeInsets.all(6),
                                      decoration: BoxDecoration(
                                        color: Colors.transparent,
                                        borderRadius: BorderRadius.circular(14),
                                        border: Border.all(
                                          color: isSelected
                                              ? borderBlue
                                              : Colors.transparent,
                                          width: 3,
                                        ),
                                      ),
                                      child: Image.asset(
                                        'assets/avatar-$avatarIndex.png',
                                        width: 64,
                                        height: 64,
                                        fit: BoxFit.contain,
                                      ),
                                    ),
                                  );
                                }),
                              ),
                            ),

                            const SizedBox(height: 18),

                            // Bouton "Créer le compte" (connecté au service)
                            SizedBox(
                              height: 54,
                              child: ElevatedButton(
                                onPressed: _isLoading ? null : _handleRegister,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.white,
                                  foregroundColor: Colors.black,
                                  elevation: 0,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(30),
                                    side: const BorderSide(
                                      color: borderBlue,
                                      width: 3,
                                    ),
                                  ),
                                ),
                                child: _isLoading
                                    ? const SizedBox(
                                        height: 20,
                                        width: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                        ),
                                      )
                                    : const Text(
                                        'Créer le compte',
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                              ),
                            ),

                            const SizedBox(height: 10),

                            // Lien "Déjà un compte ? Se connecter"
                            Center(
                              child: GestureDetector(
                                onTap: () => Navigator.pop(context),
                                child: const Text(
                                  'Déjà un compte ? Se connecter',
                                  style: TextStyle(
                                    decoration: TextDecoration.underline,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
