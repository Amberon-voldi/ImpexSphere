import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/storage/json_store.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../pricing/domain/commodity.dart';
import '../../pricing/domain/market_snapshot.dart';
import '../../pricing/domain/price_quote.dart';
import '../../pricing/presentation/pricing_providers.dart';
import '../data/alerts_repository.dart';
import '../domain/price_alert.dart';

class AlertsState {
  const AlertsState({required this.watchlist, required this.alerts});

  final Set<String> watchlist;
  final List<PriceAlert> alerts;

  bool isWatched(String commodityId, MarketScope scope) => watchlist.contains(quoteKey(commodityId, scope));
  int get activeCount => alerts.where((a) => a.active).length;
}

class TriggeredAlert {
  const TriggeredAlert(this.alert, this.price);

  final PriceAlert alert;
  final double price;
}

final alertsRepositoryProvider = Provider<AlertsRepository>((ref) {
  final userId = ref.watch(currentUserProvider.select((u) => u?.id)) ?? 'guest';
  return AlertsRepository(ref.watch(jsonStoreProvider), userId);
});

/// Watchlist + alerts, evaluated against every market update.
class AlertsController extends Notifier<AlertsState> {
  AlertsRepository get _repo => ref.read(alertsRepositoryProvider);

  @override
  AlertsState build() {
    final repo = ref.watch(alertsRepositoryProvider);
    ref.listen<AsyncValue<MarketSnapshot>>(marketSnapshotProvider, (_, next) {
      final snapshot = next.value;
      if (snapshot != null) _evaluate(snapshot);
    });
    return AlertsState(watchlist: repo.loadWatchlist(), alerts: repo.loadAlerts());
  }

  void toggleWatch(String commodityId, MarketScope scope) {
    final key = quoteKey(commodityId, scope);
    final next = {...state.watchlist};
    if (!next.remove(key)) next.add(key);
    state = AlertsState(watchlist: next, alerts: state.alerts);
    _repo.saveWatchlist(next);
  }

  void addAlert({
    required String commodityId,
    required MarketScope scope,
    required AlertCondition condition,
    required double target,
    required DisplayCurrency currency,
  }) {
    final alert = PriceAlert(
      id: 'a_${DateTime.now().microsecondsSinceEpoch}',
      commodityId: commodityId,
      scope: scope,
      condition: condition,
      target: target,
      currency: currency,
      createdAt: DateTime.now(),
    );
    _setAlerts([alert, ...state.alerts]);
  }

  void remove(String id) => _setAlerts(state.alerts.where((a) => a.id != id).toList());

  void rearm(String id) => _setAlerts([for (final a in state.alerts) a.id == id ? a.rearmed() : a]);

  void _evaluate(MarketSnapshot snapshot) {
    final hits = evaluateAlerts(state.alerts, snapshot);
    if (hits.isEmpty) return;
    final now = DateTime.now();
    final byId = {for (final h in hits) h.alert.id: h};
    _setAlerts([
      for (final a in state.alerts)
        if (byId[a.id] case final hit?) a.triggered(now, hit.price) else a,
    ]);
    final notifier = ref.read(triggeredAlertsProvider.notifier);
    for (final h in hits) {
      notifier.push(TriggeredAlert(h.alert, h.price));
    }
  }

  void _setAlerts(List<PriceAlert> alerts) {
    state = AlertsState(watchlist: state.watchlist, alerts: alerts);
    _repo.saveAlerts(alerts);
  }
}

final alertsControllerProvider = NotifierProvider<AlertsController, AlertsState>(AlertsController.new);

/// Latest triggered alert, consumed by the shell to show an in-app banner.
class TriggeredAlertsNotifier extends Notifier<TriggeredAlert?> {
  @override
  TriggeredAlert? build() => null;

  void push(TriggeredAlert alert) => state = alert;
}

final triggeredAlertsProvider = NotifierProvider<TriggeredAlertsNotifier, TriggeredAlert?>(
  TriggeredAlertsNotifier.new,
);
