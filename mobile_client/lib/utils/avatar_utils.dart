String getAvatarPath(String? avatarName) {
  if (avatarName == null || avatarName.isEmpty) {
    return 'assets/avatar-1.png';
  }
  
  // Si c'est déjà un chemin complet, le retourner tel quel (rétrocompatibilité)
  if (avatarName.contains('/')) {
    return avatarName;
  }
  
  // Sinon, construire le chemin
  return 'assets/$avatarName.png';
}
