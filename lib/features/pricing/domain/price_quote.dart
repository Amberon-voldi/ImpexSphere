import 'commodity.dart';

/// Freshness of a quote. Every quote comes from a live source; nothing in the
/// app is simulated or estimated.
enum QuoteOrigin {
  /// Fetched from a live source on a recent successful poll.
  live('Live'),

  /// Last live value, kept while the source is unreachable or stale.
  cached('Delayed');

  const QuoteOrigin(this.label);
  final String label;
}

String quoteKey(String commodityId, MarketScope scope) => '$commodityId:${scope.name}';

class PriceQuote {
  const PriceQuote({
    required this.commodityId,
    required this.scope,
    required this.price,
    required this.currency,
    required this.unit,
    required this.updatedAt,
    required this.origin,
    required this.sourceName,
    this.previousClose,
    this.low,
    this.high,
    this.note,
  });

  final String commodityId;
  final MarketScope scope;
  final double price;

  /// 'INR' for domestic (per kg), 'USD' for international (per MT).
  final String currency;
  final String unit;
  final DateTime updatedAt;
  final QuoteOrigin origin;
  final String sourceName;
  final double? previousClose;
  final double? low;
  final double? high;

  /// Context such as "Median of 38 mandis · 31 Oct".
  final String? note;

  String get key => quoteKey(commodityId, scope);
  double get change => price - (previousClose ?? price);
  double get changePct {
    final base = previousClose;
    if (base == null || base == 0) return 0;
    return (price - base) / base * 100;
  }

  PriceQuote copyWith({
    double? price,
    DateTime? updatedAt,
    QuoteOrigin? origin,
    double? previousClose,
    double? low,
    double? high,
  }) => PriceQuote(
    commodityId: commodityId,
    scope: scope,
    price: price ?? this.price,
    currency: currency,
    unit: unit,
    updatedAt: updatedAt ?? this.updatedAt,
    origin: origin ?? this.origin,
    sourceName: sourceName,
    previousClose: previousClose ?? this.previousClose,
    low: low ?? this.low,
    high: high ?? this.high,
    note: note,
  );

  Map<String, dynamic> toJson() => {
    'commodityId': commodityId,
    'scope': scope.name,
    'price': price,
    'currency': currency,
    'unit': unit,
    'updatedAt': updatedAt.toIso8601String(),
    'origin': origin.name,
    'sourceName': sourceName,
    'previousClose': previousClose,
    'low': low,
    'high': high,
    'note': note,
  };

  static PriceQuote? tryParse(Map<String, dynamic> json) {
    try {
      return PriceQuote(
        commodityId: json['commodityId'] as String,
        scope: MarketScope.values.byName(json['scope'] as String),
        price: (json['price'] as num).toDouble(),
        currency: json['currency'] as String,
        unit: json['unit'] as String,
        updatedAt: DateTime.parse(json['updatedAt'] as String),
        origin: QuoteOrigin.values.byName(json['origin'] as String),
        sourceName: json['sourceName'] as String,
        previousClose: (json['previousClose'] as num?)?.toDouble(),
        low: (json['low'] as num?)?.toDouble(),
        high: (json['high'] as num?)?.toDouble(),
        note: json['note'] as String?,
      );
    } catch (_) {
      return null;
    }
  }
}

class PricePoint {
  const PricePoint(this.time, this.value);

  final DateTime time;
  final double value;

  List<Object> toJson() => [time.millisecondsSinceEpoch, value];

  static PricePoint? tryParse(Object? json) {
    if (json is! List || json.length != 2) return null;
    final t = json[0], v = json[1];
    if (t is! int || v is! num) return null;
    return PricePoint(DateTime.fromMillisecondsSinceEpoch(t), v.toDouble());
  }
}
