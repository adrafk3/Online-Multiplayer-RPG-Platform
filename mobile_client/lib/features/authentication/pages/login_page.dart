import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import 'register_page.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  // ========================================
  // CONTRÔLEURS ET SERVICE
  // ========================================
  
  /// Service d'authentification (singleton)
  final _authService = AuthService();
  
  /// Contrôleurs pour les champs de texte (comme [(ngModel)] en Angular)
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  
  /// État de chargement (pour afficher un spinner)
  bool _isLoading = false;
  
  /// Message d'erreur à afficher
  String _errorMessage = '';

  // ========================================
  // MÉTHODES
  // ========================================

  /// Gérer la connexion (équivalent de handleLoginButton en Angular)
  Future<void> _handleLogin() async {
    // Réinitialiser l'erreur
    setState(() {
      _errorMessage = '';
      _isLoading = true;
    });

    // Appeler le service d'authentification
    final result = await _authService.login(
      _emailController.text.trim(),
      _passwordController.text,
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
    // Nettoyer les contrôleurs (éviter les fuites mémoire)
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const borderBlue = Color(0xFF1E5BB8);

    return Scaffold(
      body: Stack(
        children: [
          // 1) Full screen background
          Positioned.fill(
            child: Image.asset('assets/gif_stats.gif', fit: BoxFit.cover),
          ),

          // 2) Content on top
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 24,
                ),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // 3) Logo
                      Image.asset(
                        'assets/logo.png',
                        height: 140,
                        fit: BoxFit.contain,
                      ),
                      const SizedBox(height: 18),

                      // 4) Form box (desktop style)
                      Container(
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.88),
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: borderBlue, width: 2),
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

                            // Input Identifier (Email)
                            TextField(
                              controller: _emailController,
                              keyboardType: TextInputType.emailAddress,
                              enabled: !_isLoading,
                              decoration: InputDecoration(
                                labelText: 'Identifiant',
                                filled: true,
                                fillColor: Colors.white,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  borderSide: const BorderSide(
                                    color: borderBlue,
                                    width: 1.5,
                                  ),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  borderSide: const BorderSide(
                                    color: borderBlue,
                                    width: 2,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),

                            // Input Password
                            TextField(
                              controller: _passwordController,
                              obscureText: true,
                              enabled: !_isLoading,
                              onSubmitted: (_) => _handleLogin(),
                              decoration: InputDecoration(
                                labelText: 'Mot de passe',
                                filled: true,
                                fillColor: Colors.white,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  borderSide: const BorderSide(
                                    color: borderBlue,
                                    width: 1.5,
                                  ),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  borderSide: const BorderSide(
                                    color: borderBlue,
                                    width: 2,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 10),

                            // "Mot de passe oublié ?" (juste visuel)
                            const Align(
                              alignment: Alignment.centerRight,
                              child: Text(
                                'Mot de passe oublié ?',
                                style: TextStyle(
                                  decoration: TextDecoration.underline,
                                ),
                              ),
                            ),

                            const SizedBox(height: 14),

                            // Login button (connecté au service)
                            SizedBox(
                              height: 52,
                              child: ElevatedButton(
                                onPressed: _isLoading ? null : _handleLogin,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.white,
                                  foregroundColor: Colors.black,
                                  elevation: 0,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(26),
                                    side: const BorderSide(
                                      color: borderBlue,
                                      width: 2,
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
                                        'Se connecter',
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                              ),
                            ),

                            const SizedBox(height: 12),

                            // "Create an account" (visual only)
                            Center(
                              child: GestureDetector(
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => const RegisterPage(),
                                    ),
                                  );
                                },
                                child: const Text(
                                  'Nouveau ? Créer un compte',
                                  style: TextStyle(
                                    decoration: TextDecoration.underline,
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
