import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'features/alerts/presentation/alerts_screen.dart';
import 'features/auth/presentation/auth_controller.dart';
import 'features/auth/presentation/login_screen.dart';
import 'features/auth/presentation/onboarding_screen.dart';
import 'features/auth/presentation/signup_screen.dart';
import 'features/auth/presentation/splash_screen.dart';
import 'features/home/presentation/home_screen.dart';
import 'features/marketplace/presentation/listing_detail_screen.dart';
import 'features/marketplace/presentation/listing_form_screen.dart';
import 'features/pricing/domain/commodity.dart';
import 'features/pricing/presentation/commodity_detail_screen.dart';
import 'features/pricing/presentation/markets_screen.dart';
import 'features/profile/presentation/about_screen.dart';
import 'features/profile/presentation/profile_screen.dart';
import 'features/rfq/presentation/create_rfq_screen.dart';
import 'features/rfq/presentation/rfq_detail_screen.dart';
import 'features/shell/presentation/app_shell.dart';
import 'features/shell/presentation/trade_screen.dart';

final _rootKey = GlobalKey<NavigatorState>();

const _publicRoutes = {'/onboarding', '/login', '/signup'};

final routerProvider = Provider<GoRouter>((ref) {
  // Re-run redirects whenever the session or onboarding state changes.
  final refresh = ValueNotifier(0);
  ref.listen(authControllerProvider, (_, _) => refresh.value++);
  ref.listen(onboardingDoneProvider, (_, _) => refresh.value++);
  ref.onDispose(refresh.dispose);

  final router = GoRouter(
    navigatorKey: _rootKey,
    initialLocation: '/splash',
    debugLogDiagnostics: kDebugMode,
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authControllerProvider);
      final path = state.matchedLocation;
      if (auth.isLoading && !auth.hasValue) return path == '/splash' ? null : '/splash';

      final signedIn = auth.value != null;
      if (!signedIn) {
        if (_publicRoutes.contains(path)) return null;
        return ref.read(onboardingDoneProvider) ? '/login' : '/onboarding';
      }
      if (path == '/splash' || _publicRoutes.contains(path)) return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, _) => const SplashScreen()),
      GoRoute(path: '/onboarding', builder: (_, _) => const OnboardingScreen()),
      GoRoute(path: '/login', builder: (_, _) => const LoginScreen()),
      GoRoute(path: '/signup', builder: (_, _) => const SignupScreen()),
      StatefulShellRoute.indexedStack(
        builder: (_, _, shell) => AppShell(shell: shell),
        branches: [
          StatefulShellBranch(routes: [GoRoute(path: '/home', builder: (_, _) => const HomeScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/markets', builder: (_, _) => const MarketsScreen())]),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/trade',
                builder: (_, state) => TradeScreen(commodityId: state.uri.queryParameters['commodity']),
              ),
            ],
          ),
          StatefulShellBranch(routes: [GoRoute(path: '/account', builder: (_, _) => const ProfileScreen())]),
        ],
      ),
      // Full-screen pages pushed above the navigation bar.
      GoRoute(
        path: '/markets/:commodityId',
        builder: (_, state) => CommodityDetailScreen(
          commodityId: state.pathParameters['commodityId']!,
          initialScope: MarketScope.values.asNameMap()[state.uri.queryParameters['scope']] ?? MarketScope.domestic,
        ),
      ),
      GoRoute(
        path: '/listing/new',
        builder: (_, state) => ListingFormScreen(commodityId: state.uri.queryParameters['commodity']),
      ),
      GoRoute(
        path: '/listing/:id',
        builder: (_, state) => ListingDetailScreen(listingId: state.pathParameters['id']!),
        routes: [
          GoRoute(path: 'edit', builder: (_, state) => ListingFormScreen(listingId: state.pathParameters['id'])),
        ],
      ),
      GoRoute(
        path: '/rfqs/new',
        builder: (_, state) => CreateRfqScreen(
          listingId: state.uri.queryParameters['listing'],
          commodityId: state.uri.queryParameters['commodity'],
        ),
      ),
      GoRoute(path: '/rfqs/:id', builder: (_, state) => RfqDetailScreen(rfqId: state.pathParameters['id']!)),
      GoRoute(path: '/alerts', builder: (_, _) => const AlertsScreen()),
      GoRoute(path: '/about', builder: (_, _) => const AboutScreen()),
    ],
  );
  ref.onDispose(router.dispose);
  return router;
});
