import '../../../core/storage/json_store.dart';
import '../domain/price_quote.dart';

class CachedMarket {
  const CachedMarket({required this.quotes, required this.history, this.usdInr});

  final Map<String, PriceQuote> quotes;
  final Map<String, List<PricePoint>> history;
  final double? usdInr;
}

/// Persists the last good live quotes and their history so the app opens
/// instantly with real numbers, even offline.
abstract interface class PriceCache {
  Future<CachedMarket?> load();
  Future<void> save(CachedMarket market);
}

class JsonPriceCache implements PriceCache {
  JsonPriceCache(this._store);

  static const _key = 'prices.cache.v1';
  final JsonStore _store;

  @override
  Future<CachedMarket?> load() async {
    final raw = _store.read(_key);
    if (raw is! Map<String, dynamic>) return null;
    final quotes = <String, PriceQuote>{};
    for (final q in (raw['quotes'] as List? ?? const []).whereType<Map<String, dynamic>>()) {
      final quote = PriceQuote.tryParse(q);
      if (quote != null) quotes[quote.key] = quote;
    }
    final history = <String, List<PricePoint>>{};
    final rawHistory = raw['history'];
    if (rawHistory is Map<String, dynamic>) {
      rawHistory.forEach((key, points) {
        if (points is List) {
          history[key] = points.map(PricePoint.tryParse).whereType<PricePoint>().toList();
        }
      });
    }
    return CachedMarket(quotes: quotes, history: history, usdInr: (raw['usdInr'] as num?)?.toDouble());
  }

  @override
  Future<void> save(CachedMarket market) => _store.write(_key, {
    'quotes': market.quotes.values.map((q) => q.toJson()).toList(),
    'history': market.history.map((k, v) => MapEntry(k, v.map((p) => p.toJson()).toList())),
    'usdInr': market.usdInr,
  });
}

class MemoryPriceCache implements PriceCache {
  CachedMarket? value;

  @override
  Future<CachedMarket?> load() async => value;

  @override
  Future<void> save(CachedMarket market) async => value = market;
}
