import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/common.dart';
import '../../pricing/domain/commodity.dart';
import '../../pricing/domain/market_snapshot.dart';
import '../../pricing/presentation/pricing_providers.dart';
import '../domain/price_alert.dart';
import 'alerts_controller.dart';

class AlertsScreen extends ConsumerWidget {
  const AlertsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final alerts = ref.watch(alertsControllerProvider.select((s) => s.alerts));
    final snapshot = ref.watch(marketSnapshotProvider).value;
    final active = alerts.where((a) => a.active).toList();
    final triggered = alerts.where((a) => !a.active).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Price alerts')),
      body: alerts.isEmpty
          ? EmptyState(
              icon: Icons.notifications_none_rounded,
              title: 'No alerts yet',
              message: 'Open any commodity in Markets and tap "Set price alert" to be notified when it crosses your level.',
              action: SizedBox(
                width: 200,
                child: OutlinedButton(onPressed: () => context.go('/markets'), child: const Text('Browse markets')),
              ),
            )
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              children: [
                if (active.isNotEmpty) ...[
                  SectionHeader(title: 'Active', subtitle: '${active.length} watching the market'),
                  for (final a in active) _AlertTile(alert: a, snapshot: snapshot),
                ],
                if (triggered.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  const SectionHeader(title: 'Triggered'),
                  for (final a in triggered) _AlertTile(alert: a, snapshot: snapshot),
                ],
              ],
            ),
    );
  }
}

class _AlertTile extends ConsumerWidget {
  const _AlertTile({required this.alert, required this.snapshot});

  final PriceAlert alert;
  final MarketSnapshot? snapshot;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final commodity = commodityById[alert.commodityId];
    final quote = snapshot?.quote(alert.commodityId, alert.scope);
    final now = quote == null ? null : snapshot!.convert(quote.price, quote.currency, alert.currency);
    final distance = now == null ? null : (alert.target - now) / now * 100;
    final controller = ref.read(alertsControllerProvider.notifier);

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Dismissible(
        key: ValueKey(alert.id),
        direction: DismissDirection.endToStart,
        background: Container(
          alignment: Alignment.centerRight,
          padding: const EdgeInsets.only(right: 20),
          decoration: BoxDecoration(color: AppColors.negative.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(18)),
          child: const Icon(Icons.delete_outline_rounded, color: AppColors.negative),
        ),
        onDismissed: (_) => controller.remove(alert.id),
        child: SurfaceCard(
          onTap: () => context.push('/markets/${alert.commodityId}?scope=${alert.scope.name}'),
          child: Row(
            children: [
              Icon(
                alert.condition == AlertCondition.above ? Icons.trending_up_rounded : Icons.trending_down_rounded,
                color: alert.active ? AppColors.gold : AppColors.positive,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${commodity?.name ?? alert.commodityId} · ${alert.scope.label}',
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '${alert.condition.label} ${formatMoney(alert.target, alert.currency.code)}/${alert.currency.unit}',
                      style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      alert.active
                          ? (now == null ? '' : 'Now ${formatMoney(now, alert.currency.code)} · ${formatPct(distance!)} away')
                          : 'Hit ${formatMoney(alert.triggeredPrice ?? 0, alert.currency.code)} · ${timeAgo(alert.triggeredAt!)}',
                      style: TextStyle(color: alert.active ? AppColors.textMuted : AppColors.positive, fontSize: 12),
                    ),
                  ],
                ),
              ),
              if (!alert.active)
                IconButton(
                  tooltip: 'Re-arm',
                  icon: const Icon(Icons.replay_rounded),
                  onPressed: () => controller.rearm(alert.id),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
