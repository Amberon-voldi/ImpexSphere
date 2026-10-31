import 'dart:convert';

import 'package:http/http.dart' as http;

import '../domain/commodity.dart';
import '../domain/price_quote.dart';
import 'price_source.dart';

/// Quotes from SP International's own price service, which can cover both
/// domestic and international (export) markets in real time.
///
/// Contract — `GET {baseUrl}/v1/prices` returns:
/// ```json
/// {
///   "quotes": [
///     {
///       "commodityId": "cardamom",           // id from commodityCatalog
///       "scope": "international",            // "domestic" | "international"
///       "price": 27650.0,
///       "currency": "USD",                   // INR for domestic, USD for international
///       "unit": "MT",                        // kg for domestic, MT for international
///       "previousClose": 27400.0,            // optional
///       "low": 27300.0, "high": 27800.0,     // optional
///       "market": "FOB Kochi",               // optional
///       "updatedAt": "2026-10-31T09:30:00Z"
///     }
///   ]
/// }
/// ```
class CustomApiPriceSource implements PriceSource {
  CustomApiPriceSource({
    required this.baseUrl,
    http.Client? client,
    this.timeout = const Duration(seconds: 12),
  }) : _client = client ?? http.Client();

  final String baseUrl;
  final Duration timeout;
  final http.Client _client;

  @override
  String get name => 'SP International';

  @override
  Future<List<PriceQuote>> fetch(List<Commodity> catalog) async {
    final uri = Uri.parse(baseUrl).resolve('v1/prices');
    final response = await _client.get(uri, headers: {'Accept': 'application/json'}).timeout(timeout);
    if (response.statusCode != 200) {
      throw PriceSourceException('$name HTTP ${response.statusCode}');
    }
    final body = jsonDecode(response.body);
    final raw = body is Map<String, dynamic> ? body['quotes'] : null;
    if (raw is! List) throw PriceSourceException('$name returned no quotes');

    final known = {for (final c in catalog) c.id: c};
    final quotes = <PriceQuote>[];
    for (final item in raw.whereType<Map<String, dynamic>>()) {
      final commodity = known[item['commodityId']];
      final scope = MarketScope.values.asNameMap()[item['scope']];
      final price = (item['price'] as num?)?.toDouble();
      if (commodity == null || scope == null || price == null) continue;
      if (!isPlausiblePrice(price, commodity.referenceFor(scope))) continue;
      quotes.add(
        PriceQuote(
          commodityId: commodity.id,
          scope: scope,
          price: price,
          currency: scope == MarketScope.domestic ? 'INR' : 'USD',
          unit: scope == MarketScope.domestic ? 'kg' : 'MT',
          updatedAt: DateTime.tryParse('${item['updatedAt']}')?.toLocal() ?? DateTime.now(),
          origin: QuoteOrigin.live,
          sourceName: name,
          previousClose: (item['previousClose'] as num?)?.toDouble(),
          low: (item['low'] as num?)?.toDouble(),
          high: (item['high'] as num?)?.toDouble(),
          note: item['market'] as String?,
        ),
      );
    }
    return quotes;
  }
}
