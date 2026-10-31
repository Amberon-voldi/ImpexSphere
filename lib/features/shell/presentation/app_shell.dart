import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/format.dart';
import '../../alerts/presentation/alerts_controller.dart';
import '../../pricing/domain/commodity.dart';
import '../../pricing/domain/market_snapshot.dart';

class AppShell extends ConsumerWidget {
  const AppShell({super.key, required this.shell});

  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Keeps alert evaluation running for the whole session.
    ref.watch(alertsControllerProvider);
    ref.listen<TriggeredAlert?>(triggeredAlertsProvider, (_, hit) {
      if (hit == null) return;
      HapticFeedback.heavyImpact();
      final a = hit.alert;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          duration: const Duration(seconds: 6),
          content: Row(
            children: [
              const Icon(Icons.notifications_active_rounded, color: AppColors.gold),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  '${commodityById[a.commodityId]?.name ?? a.commodityId} ${a.condition.label} '
                  '${formatMoney(a.target, a.currency.code)} · now ${formatMoney(hit.price, a.currency.code)}',
                ),
              ),
            ],
          ),
          action: SnackBarAction(
            label: 'VIEW',
            textColor: AppColors.gold,
            onPressed: () => context.push('/markets/${a.commodityId}?scope=${a.scope.name}'),
          ),
        ),
      );
    });

    return Scaffold(
      body: shell,
      bottomNavigationBar: DecoratedBox(
        decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppColors.line))),
        child: NavigationBar(
          selectedIndex: shell.currentIndex,
          onDestinationSelected: (i) => shell.goBranch(i, initialLocation: i == shell.currentIndex),
          destinations: const [
            NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home_rounded), label: 'Home'),
            NavigationDestination(icon: Icon(Icons.show_chart_rounded), label: 'Markets'),
            NavigationDestination(icon: Icon(Icons.swap_horiz_rounded), label: 'Trade'),
            NavigationDestination(icon: Icon(Icons.person_outline_rounded), selectedIcon: Icon(Icons.person_rounded), label: 'Account'),
          ],
        ),
      ),
    );
  }
}
