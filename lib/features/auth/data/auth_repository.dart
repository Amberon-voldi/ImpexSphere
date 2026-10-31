import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';

import '../../../core/storage/json_store.dart';
import '../domain/app_user.dart';

class AuthException implements Exception {
  const AuthException(this.message);

  final String message;

  @override
  String toString() => message;
}

/// Account contract the UI depends on. [LocalAuthRepository] keeps accounts
/// on-device for the mock phase; replace it with Firebase/Supabase later.
abstract interface class AuthRepository {
  Future<AppUser?> currentUser();
  Future<AppUser> signIn({required String email, required String password});
  Future<AppUser> signUp({
    required String name,
    required String email,
    required String password,
    required UserRole role,
    required String company,
    required String country,
    String? city,
    String? phone,
    String? businessId,
  });
  Future<AppUser> updateProfile(AppUser user);
  Future<void> signOut();
}

class LocalAuthRepository implements AuthRepository {
  LocalAuthRepository(this._store) {
    _seedDemoAccounts();
  }

  static const _accountsKey = 'auth.accounts.v1';
  static const _sessionKey = 'auth.session.v1';

  static const demoBuyerEmail = 'buyer@demo.impexsphere.app';
  static const demoSupplierEmail = 'supplier@demo.impexsphere.app';
  static const demoPassword = 'demo1234';
  static const demoSupplierId = 'u_demo_supplier';
  static const demoBuyerId = 'u_demo_buyer';

  final JsonStore _store;

  List<Map<String, dynamic>> get _accounts => _store.readList(_accountsKey);

  @override
  Future<AppUser?> currentUser() async {
    final id = _store.read(_sessionKey);
    if (id is! String) return null;
    for (final a in _accounts) {
      final user = AppUser.tryParse(a['user']);
      if (user?.id == id) return user;
    }
    return null;
  }

  @override
  Future<AppUser> signIn({required String email, required String password}) async {
    await Future<void>.delayed(const Duration(milliseconds: 450));
    final normalized = email.trim().toLowerCase();
    final account = _accounts.where((a) => (a['email'] as String?) == normalized).firstOrNull;
    if (account == null || account['hash'] != _hash(password, account['salt'] as String)) {
      throw const AuthException('Incorrect email or password.');
    }
    final user = AppUser.tryParse(account['user']);
    if (user == null) throw const AuthException('This account could not be loaded.');
    await _store.write(_sessionKey, user.id);
    return user;
  }

  @override
  Future<AppUser> signUp({
    required String name,
    required String email,
    required String password,
    required UserRole role,
    required String company,
    required String country,
    String? city,
    String? phone,
    String? businessId,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 550));
    final normalized = email.trim().toLowerCase();
    final accounts = _accounts;
    if (accounts.any((a) => a['email'] == normalized)) {
      throw const AuthException('An account with this email already exists.');
    }
    final user = AppUser(
      id: 'u_${DateTime.now().microsecondsSinceEpoch}',
      name: name.trim(),
      email: normalized,
      role: role,
      company: company.trim(),
      country: country.trim(),
      city: city?.trim(),
      phone: phone?.trim(),
      businessId: businessId?.trim(),
      createdAt: DateTime.now(),
    );
    final salt = _newSalt();
    accounts.add({'email': normalized, 'salt': salt, 'hash': _hash(password, salt), 'user': user.toJson()});
    await _store.write(_accountsKey, accounts);
    await _store.write(_sessionKey, user.id);
    return user;
  }

  @override
  Future<AppUser> updateProfile(AppUser user) async {
    final accounts = _accounts;
    for (final a in accounts) {
      if (AppUser.tryParse(a['user'])?.id == user.id) a['user'] = user.toJson();
    }
    await _store.write(_accountsKey, accounts);
    return user;
  }

  @override
  Future<void> signOut() => _store.remove(_sessionKey);

  void _seedDemoAccounts() {
    final accounts = _accounts;
    if (accounts.any((a) => a['email'] == demoBuyerEmail)) return;
    final now = DateTime.now();
    final demo = [
      AppUser(
        id: demoBuyerId,
        name: 'Aisha Rahman',
        email: demoBuyerEmail,
        role: UserRole.buyer,
        company: 'Gulf Fresh Trading LLC',
        country: 'United Arab Emirates',
        city: 'Dubai',
        businessId: 'TRN 100-2384-7712',
        verified: true,
        createdAt: now.subtract(const Duration(days: 220)),
      ),
      AppUser(
        id: demoSupplierId,
        name: 'Rohan Menon',
        email: demoSupplierEmail,
        role: UserRole.supplier,
        company: 'Malabar Coast Spice Exports',
        country: 'India',
        city: 'Kochi, Kerala',
        businessId: 'IEC 0512xxxx41',
        verified: true,
        createdAt: now.subtract(const Duration(days: 410)),
      ),
    ];
    for (final user in demo) {
      final salt = _newSalt();
      accounts.add({'email': user.email, 'salt': salt, 'hash': _hash(demoPassword, salt), 'user': user.toJson()});
    }
    _store.write(_accountsKey, accounts);
  }

  static String _newSalt() {
    final rnd = Random.secure();
    return base64UrlEncode(List.generate(16, (_) => rnd.nextInt(256)));
  }

  static String _hash(String password, String salt) => sha256.convert(utf8.encode('$salt:$password')).toString();
}
