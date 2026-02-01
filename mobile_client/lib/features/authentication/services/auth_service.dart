import 'dart:async';
import 'dart:convert';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;
import '../models/account_type.dart';

class AuthService {
  static const String serverBaseUrl = 'http://98.88.78.57:3000/api';
  static const String authUrl = '$serverBaseUrl/auth';

  static AuthService? _instance;

  factory AuthService() {
    _instance ??= AuthService._internal();
    return _instance!;
  }

  AuthService._internal() {
    _firebaseAuth.authStateChanges().listen((user) {
      if (user == null) {
        _sessionToken = null;
        _currentProfile = null;
        _userProfileController.add(null);
      }
    });
  }
  final FirebaseAuth _firebaseAuth = FirebaseAuth.instance;
  final http.Client _http = http.Client();

  final StreamController<AccountType?> _userProfileController =
      StreamController<AccountType?>.broadcast();

  AccountType? _currentProfile;
  String? _sessionToken;

  Stream<AccountType?> get userProfile$ async* {
    yield _currentProfile;
    yield* _userProfileController.stream;
  }

  Stream<AccountType?> get currentUser$ => userProfile$;

  AccountType? get currentUser => _currentProfile;
  String? get sessionToken => _sessionToken;

  Future<Map<String, String>> buildProtectedHeaders() async {
    final token = await getToken();
    final sessionToken = _sessionToken;

    if (token == null) {
      throw Exception('Aucun token Firebase (utilisateur non connecté)');
    }
    if (sessionToken == null) {
      throw Exception('Aucun sessionToken (session serveur non initialisée)');
    }

    return <String, String>{
      'Content-Type': 'application/json',
      'authorization': 'Bearer $token',
      'x-session-token': sessionToken,
    };
  }

  Future<Map<String, String>> buildAuthOnlyHeaders() async {
    final token = await getToken();
    if (token == null) {
      throw Exception('Aucun token Firebase (utilisateur non connecté)');
    }
    return <String, String>{
      'Content-Type': 'application/json',
      'authorization': 'Bearer $token',
    };
  }

  Future<AuthResult> login(String email, String password) async {
    User? signedInUser;
    try {
      final credential = await _firebaseAuth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );

      signedInUser = credential.user;
      if (signedInUser == null) {
        return AuthResult(error: 'Connexion impossible');
      }

      final response = await _http.post(
        Uri.parse('$authUrl/login'),
        headers: const {'Content-Type': 'application/json'},
        body: jsonEncode({'uid': signedInUser.uid}),
      );

      if (response.statusCode != 200 && response.statusCode != 201) {
        String? message;
        try {
          final decoded = jsonDecode(response.body);
          if (decoded is Map<String, dynamic> && decoded['message'] is String) {
            message = decoded['message'] as String;
          }
        } catch (_) {}

        await _firebaseAuth.signOut();
        return AuthResult(
          error: message ?? 'Connexion refusée (${response.statusCode})',
        );
      }

      final decoded = jsonDecode(response.body) as Map<String, dynamic>;
      final userJson = decoded['user'] as Map<String, dynamic>?;
      final sessionToken = decoded['sessionToken'] as String?;

      if (userJson == null || sessionToken == null) {
        await _firebaseAuth.signOut();
        return AuthResult(error: 'Réponse serveur invalide');
      }

      _sessionToken = sessionToken;
      _currentProfile = AccountType.fromJson(userJson);
      _userProfileController.add(_currentProfile);

      return AuthResult(user: signedInUser);
    } on FirebaseAuthException catch (e) {
      return AuthResult(error: _getFirebaseErrorMessage(e.code));
    } catch (e) {
      if (signedInUser != null) {
        try {
          await _firebaseAuth.signOut();
        } catch (_) {}
      }
      return AuthResult(error: 'Une erreur est survenue: ${e.toString()}');
    }
  }

  Future<AuthResult> register({
    required String username,
    required String email,
    required String password,
    required String avatar,
  }) async {
    try {
      final credential = await _firebaseAuth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );

      final user = credential.user;
      if (user == null) {
        return AuthResult(error: 'Création de compte impossible');
      }

      final account = AccountType(
        username: username,
        email: email,
        avatar: avatar,
        uid: user.uid,
      );

      final response = await _http.post(
        Uri.parse(authUrl),
        headers: const {'Content-Type': 'application/json'},
        body: jsonEncode({
          'uid': account.uid,
          'username': account.username,
          'email': account.email,
          'avatar': account.avatar,
        }),
      );

      if (response.statusCode != 200 && response.statusCode != 201) {
        try {
          final decoded = jsonDecode(response.body);
          if (decoded is Map<String, dynamic> && decoded['message'] is String) {
            return AuthResult(error: decoded['message'] as String);
          }
        } catch (_) {}
        return AuthResult(error: 'Erreur serveur (${response.statusCode})');
      }

      final decoded = jsonDecode(response.body) as Map<String, dynamic>;
      final userJson = decoded['user'] as Map<String, dynamic>?;
      final sessionToken = decoded['sessionToken'] as String?;

      if (userJson == null || sessionToken == null) {
        return AuthResult(error: 'Réponse serveur invalide');
      }

      _sessionToken = sessionToken;
      _currentProfile = AccountType.fromJson(userJson);
      _userProfileController.add(_currentProfile);

      return AuthResult(user: credential.user);
    } on FirebaseAuthException catch (e) {
      return AuthResult(error: _getFirebaseErrorMessage(e.code));
    } catch (e) {
      return AuthResult(error: 'Une erreur est survenue: ${e.toString()}');
    }
  }

  Future<void> logout() async {
    if (_sessionToken != null) {
      final headers = await buildProtectedHeaders();
      final response = await _http.post(
        Uri.parse('$authUrl/logout'),
        headers: headers,
        body: jsonEncode({}),
      );

      if (response.statusCode < 200 || response.statusCode >= 300) {
        String? message;
        try {
          final decoded = jsonDecode(response.body);
          if (decoded is Map<String, dynamic> && decoded['message'] is String) {
            message = decoded['message'] as String;
          }
        } catch (_) {}
        throw Exception(message ?? 'Erreur logout serveur (${response.statusCode})');
      }
    }

    _sessionToken = null;
    _currentProfile = null;
    _userProfileController.add(null);

    await _firebaseAuth.signOut();
  }

  Future<String?> getToken() async {
    final user = _firebaseAuth.currentUser;
    return user?.getIdToken();
  }

  void dispose() {
    _userProfileController.close();
    _http.close();
  }

  String _getFirebaseErrorMessage(String code) {
    switch (code) {
      case 'invalid-email':
        return 'Adresse email invalide';
      case 'user-disabled':
        return 'Ce compte a été désactivé';
      case 'user-not-found':
        return 'Aucun compte trouvé avec cet email';
      case 'wrong-password':
      case 'invalid-credential':
        return 'Email ou mot de passe incorrect';
      case 'email-already-in-use':
        return 'Cet email est déjà utilisé';
      case 'weak-password':
        return 'Le mot de passe doit contenir au moins 6 caractères';
      case 'too-many-requests':
        return 'Trop de tentatives. Réessayez plus tard';
      case 'network-request-failed':
        return 'Erreur de connexion. Vérifiez votre internet';
      default:
        return 'Une erreur est survenue. Réessayez';
    }
  }
}

class AuthResult {
  final User? user;
  final String? error;

  AuthResult({this.user, this.error});

  bool get isSuccess => user != null && error == null;
  bool get isError => error != null;
}
