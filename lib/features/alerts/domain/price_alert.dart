import '../../pricing/domain/commodity.dart';
import '../../pricing/domain/market_snapshot.dart';

enum AlertCondition {
  above('rises above'),
  below('falls below');

  const AlertCondition(this.label);
  final String label;
}

class PriceAlert {
  const PriceAlert({
    required this.id,
    required this.commodityId,
    required this.scope,
    required this.condition,
    required this.target,
    required this.currency,
    required this.createdAt,
    this.triggeredAt,
    this.triggeredPrice,
  });

  final String id;
  final String commodityId;
  final MarketScope scope;
  final AlertCondition condition;

  /// Target in [currency]'s display unit (₹/kg or $/MT).
  final double target;
  final DisplayCurrency currency;
  final DateTime createdAt;
  final DateTime? triggeredAt;
  final double? triggeredPrice;

  bool get active => triggeredAt == null;

  bool isMetBy(double price) =>
      condition == AlertCondition.above ? price >= target : price <= target;

  PriceAlert triggered(DateTime at, double price) => PriceAlert(
    id: id,
    commodityId: commodityId,
    scope: scope,
    condition: condition,
    target: target,
    currency: currency,
    createdAt: createdAt,
    triggeredAt: at,
    triggeredPrice: price,
  );

  PriceAlert rearmed() => PriceAlert(
    id: id,
    commodityId: commodityId,
    scope: scope,
    condition: condition,
    target: target,
    currency: currency,
    createdAt: createdAt,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'commodityId': commodityId,
    'scope': scope.name,
    'condition': condition.name,
    'target': target,
    'currency': currency.name,
    'createdAt': createdAt.toIso8601String(),
    'triggeredAt': triggeredAt?.toIso8601String(),
    'triggeredPrice': triggeredPrice,
  };

  static PriceAlert? tryParse(Map<String, dynamic> j) {
    try {
      return PriceAlert(
        id: j['id'] as String,
        commodityId: j['commodityId'] as String,
        scope: MarketScope.values.byName(j['scope'] as String),
        condition: AlertCondition.values.byName(j['condition'] as String),
        target: (j['target'] as num).toDouble(),
        currency: DisplayCurrency.values.byName(j['currency'] as String),
        createdAt: DateTime.parse(j['createdAt'] as String),
        triggeredAt: j['triggeredAt'] == null ? null : DateTime.parse(j['triggeredAt'] as String),
        triggeredPrice: (j['triggeredPrice'] as num?)?.toDouble(),
      );
    } catch (_) {
      return null;
    }
  }
}

/// Returns the active alerts whose condition is met by [snapshot].
List<({PriceAlert alert, double price})> evaluateAlerts(List<PriceAlert> alerts, MarketSnapshot snapshot) {
  final hits = <({PriceAlert alert, double price})>[];
  for (final alert in alerts.where((a) => a.active)) {
    final quote = snapshot.quote(alert.commodityId, alert.scope);
    if (quote == null) continue;
    final price = snapshot.convert(quote.price, quote.currency, alert.currency);
    if (alert.isMetBy(price)) hits.add((alert: alert, price: price));
  }
  return hits;
}
