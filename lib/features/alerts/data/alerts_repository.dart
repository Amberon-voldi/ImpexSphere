import '../../../core/storage/json_store.dart';
import '../domain/price_alert.dart';

/// Local persistence for the watchlist and price alerts. Scoped per user so
/// accounts on a shared device don't see each other's alerts.
class AlertsRepository {
  AlertsRepository(this._store, this._userId);

  final JsonStore _store;
  final String _userId;

  String get _watchKey => 'watchlist.v1.$_userId';
  String get _alertsKey => 'alerts.v1.$_userId';

  Set<String> loadWatchlist() {
    final raw = _store.read(_watchKey);
    return raw is List ? raw.whereType<String>().toSet() : <String>{};
  }

  Future<void> saveWatchlist(Set<String> keys) => _store.write(_watchKey, keys.toList());

  List<PriceAlert> loadAlerts() =>
      _store.readList(_alertsKey).map(PriceAlert.tryParse).whereType<PriceAlert>().toList();

  Future<void> saveAlerts(List<PriceAlert> alerts) =>
      _store.write(_alertsKey, alerts.map((a) => a.toJson()).toList());
}
