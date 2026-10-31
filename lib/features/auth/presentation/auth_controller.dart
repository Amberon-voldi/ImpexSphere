import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/storage/json_store.dart';
import '../data/auth_repository.dart';
import '../domain/app_user.dart';

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => LocalAuthRepository(ref.watch(jsonStoreProvider)),
);

class AuthController extends AsyncNotifier<AppUser?> {
  AuthRepository get _repo => ref.read(authRepositoryProvider);

  @override
  Future<AppUser?> build() => _repo.currentUser();

  Future<void> signIn(String email, String password) async {
    state = AsyncData(await _repo.signIn(email: email, password: password));
  }

  Future<void> signUp({
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
    state = AsyncData(
      await _repo.signUp(
        name: name,
        email: email,
        password: password,
        role: role,
        company: company,
        country: country,
        city: city,
        phone: phone,
        businessId: businessId,
      ),
    );
  }

  Future<void> updateProfile(AppUser user) async {
    state = AsyncData(await _repo.updateProfile(user));
  }

  Future<void> signOut() async {
    await _repo.signOut();
    state = const AsyncData(null);
  }
}

final authControllerProvider = AsyncNotifierProvider<AuthController, AppUser?>(AuthController.new);

/// The signed-in user. Only read this inside the authenticated shell.
final currentUserProvider = Provider<AppUser?>((ref) => ref.watch(authControllerProvider).value);

class OnboardingNotifier extends Notifier<bool> {
  static const _key = 'onboarding.done';

  @override
  bool build() => ref.read(jsonStoreProvider).flag(_key);

  void complete() {
    state = true;
    ref.read(jsonStoreProvider).setFlag(_key, true);
  }
}

final onboardingDoneProvider = NotifierProvider<OnboardingNotifier, bool>(OnboardingNotifier.new);
