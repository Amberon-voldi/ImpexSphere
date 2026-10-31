import 'package:flutter/material.dart';

/// Brand palette: deep navy surfaces with gold accents.
abstract final class AppColors {
  static const navy950 = Color(0xFF060B16);
  static const navy900 = Color(0xFF0B1426);
  static const navy800 = Color(0xFF111D35);
  static const navy700 = Color(0xFF172643);
  static const navy600 = Color(0xFF203255);
  static const line = Color(0xFF233457);

  static const gold = Color(0xFFD4A54A);
  static const goldLight = Color(0xFFF1D592);
  static const goldDeep = Color(0xFFA2772A);

  static const textPrimary = Color(0xFFEEF1F7);
  static const textSecondary = Color(0xFFA3AEC4);
  static const textMuted = Color(0xFF6B7894);

  static const positive = Color(0xFF2FD8A0);
  static const negative = Color(0xFFFF6370);
  static const warning = Color(0xFFFFB547);
  static const info = Color(0xFF5B9CFF);

  static const goldGradient = LinearGradient(
    colors: [goldLight, gold, goldDeep],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const cardGradient = LinearGradient(
    colors: [navy700, navy800],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const backgroundGradient = LinearGradient(
    colors: [navy900, navy950],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  static Color forChange(double change) {
    if (change > 0) return positive;
    if (change < 0) return negative;
    return textSecondary;
  }
}
