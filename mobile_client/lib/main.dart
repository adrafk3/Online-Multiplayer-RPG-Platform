import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';
import 'app/app.dart';

/// Point d'entrée de l'application Flutter
/// Initialise Firebase avant de lancer l'app
void main() async {
  // Nécessaire pour utiliser les plugins Flutter avant runApp()
  WidgetsFlutterBinding.ensureInitialized();

  // Initialiser Firebase avec la configuration appropriée pour la plateforme
  // Utilise le même projet Firebase que le client Angular (log3900-equipe-206)
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  runApp(const MyApp());
}