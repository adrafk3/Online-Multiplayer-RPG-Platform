/// Modèle de données pour le compte utilisateur
/// Correspond au type AccountType du backend (@common/types.ts)
class AccountType {
  final String username;
  final String email;
  final String avatar;
  final String uid;
  final int? trophies;
  final int? classicWins;
  final int? classicLosses;
  final int? ctfWins;
  final int? ctfLosses;
  final DateTime? createdAt;
  final DateTime? lastLoginAt;

  AccountType({
    required this.username,
    required this.email,
    required this.avatar,
    required this.uid,
    this.trophies,
    this.classicWins,
    this.classicLosses,
    this.ctfWins,
    this.ctfLosses,
    this.createdAt,
    this.lastLoginAt,
  });

  /// Convertir JSON (du serveur) vers AccountType
  /// Équivalent de la désérialisation en Angular
  factory AccountType.fromJson(Map<String, dynamic> json) {
    final uidValue = (json['uid'] ?? json['firebaseUid']) as String?;
    if (uidValue == null) {
      throw ArgumentError('Missing uid/firebaseUid in AccountType JSON');
    }

    return AccountType(
      username: json['username'] as String,
      email: json['email'] as String,
      avatar: json['avatar'] as String,
      uid: uidValue,
      trophies: json['trophies'] as int?,
      classicWins: json['classicWins'] as int?,
      classicLosses: json['classicLosses'] as int?,
      ctfWins: json['ctfWins'] as int?,
      ctfLosses: json['ctfLosses'] as int?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : null,
      lastLoginAt: json['lastLoginAt'] != null
          ? DateTime.parse(json['lastLoginAt'] as String)
          : null,
    );
  }

  /// Convertir AccountType vers JSON (pour envoyer au serveur)
  /// Équivalent de la sérialisation
  Map<String, dynamic> toJson() {
    return {
      'username': username,
      'email': email,
      'avatar': avatar,
      'uid': uid,
      if (trophies != null) 'trophies': trophies,
      if (classicWins != null) 'classicWins': classicWins,
      if (classicLosses != null) 'classicLosses': classicLosses,
      if (ctfWins != null) 'ctfWins': ctfWins,
      if (ctfLosses != null) 'ctfLosses': ctfLosses,
      if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
      if (lastLoginAt != null) 'lastLoginAt': lastLoginAt!.toIso8601String(),
    };
  }

  /// Copier avec modifications (utile pour les mises à jour)
  AccountType copyWith({
    String? username,
    String? email,
    String? avatar,
    String? uid,
    int? trophies,
    int? classicWins,
    int? classicLosses,
    int? ctfWins,
    int? ctfLosses,
    DateTime? createdAt,
    DateTime? lastLoginAt,
  }) {
    return AccountType(
      username: username ?? this.username,
      email: email ?? this.email,
      avatar: avatar ?? this.avatar,
      uid: uid ?? this.uid,
      trophies: trophies ?? this.trophies,
      classicWins: classicWins ?? this.classicWins,
      classicLosses: classicLosses ?? this.classicLosses,
      ctfWins: ctfWins ?? this.ctfWins,
      ctfLosses: ctfLosses ?? this.ctfLosses,
      createdAt: createdAt ?? this.createdAt,
      lastLoginAt: lastLoginAt ?? this.lastLoginAt,
    );
  }
}
