import 'commodity.dart';
import 'price_quote.dart';

enum FeedStatus {
  /// No live price source is configured in this build.
  notConfigured('Not connected'),

  /// First poll of the live sources is still in flight.
  connecting('Connecting'),

  /// Every configured live source answered on the last poll.
  live('Live'),

  /// Some sources answered; others are degraded.
  partial('Partially live'),

  /// No source answered; showing last known prices.
  offline('Offline · last known');

  const FeedStatus(this.label);
  final String label;
}

enum DisplayCurrency { inr, usd }

class MarketSnapshot {
  const MarketSnapshot({
    required this.quotes,
    required this.history,
    required this.updatedAt,
    required this.status,
    required this.usdInr,
    required this.fxLive,
    this.issues = const [],
  });

  final Map<String, PriceQuote> quotes;
  final Map<String, List<PricePoint>> history;
  final DateTime updatedAt;
  final FeedStatus status;
  final double usdInr;
  final bool fxLive;
  final List<String> issues;

  PriceQuote? quote(String commodityId, MarketScope scope) => quotes[quoteKey(commodityId, scope)];

  List<PricePoint> historyFor(String commodityId, MarketScope scope) =>
      history[quoteKey(commodityId, scope)] ?? const [];

  Iterable<PriceQuote> byScope(MarketScope scope) => quotes.values.where((q) => q.scope == scope);

  /// Converts any quote into one comparable unit: ₹/kg or $/MT.
  double convert(double value, String fromCurrency, DisplayCurrency to) {
    final inrPerKg = fromCurrency == 'INR' ? value : value * usdInr / 1000;
    return to == DisplayCurrency.inr ? inrPerKg : inrPerKg / usdInr * 1000;
  }
}

extension DisplayCurrencyX on DisplayCurrency {
  String get code => this == DisplayCurrency.inr ? 'INR' : 'USD';
  String get unit => this == DisplayCurrency.inr ? 'kg' : 'MT';
  String get perUnit => this == DisplayCurrency.inr ? '₹/kg' : r'$/MT';
}
