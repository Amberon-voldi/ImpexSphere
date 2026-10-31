import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Thin JSON persistence over SharedPreferences, shared by the local
/// repositories. Swap repositories for a real backend without touching UI.
class JsonStore {
  JsonStore(this._prefs);

  final SharedPreferences _prefs;

  Object? read(String key) {
    final raw = _prefs.getString(key);
    if (raw == null) return null;
    try {
      return jsonDecode(raw);
    } on FormatException {
      return null;
    }
  }

  List<Map<String, dynamic>> readList(String key) {
    final value = read(key);
    if (value is! List) return [];
    return value.whereType<Map<String, dynamic>>().toList();
  }

  Future<void> write(String key, Object? value) => _prefs.setString(key, jsonEncode(value));

  Future<void> remove(String key) => _prefs.remove(key);

  bool flag(String key) => _prefs.getBool(key) ?? false;

  Future<void> setFlag(String key, bool value) => _prefs.setBool(key, value);
}

/// Overridden in `main()` once SharedPreferences has loaded.
final jsonStoreProvider = Provider<JsonStore>(
  (ref) => throw UnimplementedError('jsonStoreProvider must be overridden'),
);
