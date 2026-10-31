import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';

import '../domain/commodity.dart';
import '../domain/price_quote.dart';
import 'price_source.dart';

/// Live domestic wholesale prices from Agmarknet, published by the
/// Government of India on data.gov.in ("Current Daily Price of Various
/// Commodities from Various Markets (Mandi)"). Prices arrive in ₹/quintal and
/// are normalised to ₹/kg using the median across reporting mandis.
class AgmarknetPriceSource implements PriceSource {
  AgmarknetPriceSource({
    required this.apiKey,
    http.Client? client,
    this.timeout = const Duration(seconds: 25),
    this.concurrency = 2,
  }) : _client = client ?? http.Client();

  static const resourceId = '9ef84268-d588-465a-a308-a864a43d0070';

  final String apiKey;
  final Duration timeout;
  final int concurrency;
  final http.Client _client;

  @override
  String get name => 'Agmarknet';

  @override
  Future<List<PriceQuote>> fetch(List<Commodity> catalog) async {
    final targets = catalog.where((c) => c.agmarknetName != null).toList();
    final quotes = <PriceQuote>[];
    var failures = 0;
    Object? lastError;

    // Small batches keep us polite to the public API and avoid throttling.
    for (var i = 0; i < targets.length; i += concurrency) {
      final batch = targets.skip(i).take(concurrency);
      final results = await Future.wait(
        batch.map((c) async {
          // data.gov.in is slow and throttles bursts: retry once after a pause.
          for (var attempt = 1; ; attempt++) {
            try {
              return await _fetchOne(c);
            } catch (e) {
              if (kDebugMode) debugPrint('[Agmarknet] "${c.agmarknetName}" attempt $attempt failed: $e');
              if (attempt >= 2) {
                failures++;
                lastError = e;
                return null;
              }
              await Future<void>.delayed(const Duration(seconds: 2));
            }
          }
        }),
      );
      quotes.addAll(results.whereType<PriceQuote>());
    }

    if (quotes.isEmpty && failures > 0) {
      throw PriceSourceException('Agmarknet unavailable: $lastError');
    }
    return quotes;
  }

  Future<PriceQuote?> _fetchOne(Commodity commodity) async {
    final uri = Uri.https('api.data.gov.in', '/resource/$resourceId', {
      'api-key': apiKey,
      'format': 'json',
      'limit': '200',
      'filters[commodity]': commodity.agmarknetName!,
    });
    final response = await _client.get(uri).timeout(timeout);
    if (response.statusCode == 401 || response.statusCode == 403) {
      throw const PriceSourceException('Agmarknet rejected the API key');
    }
    if (response.statusCode != 200) {
      throw PriceSourceException('Agmarknet HTTP ${response.statusCode}');
    }
    final body = jsonDecode(response.body);
    final records = body is Map<String, dynamic> ? body['records'] : null;
    if (records is! List) return null;
    if (kDebugMode) {
      final names = records.whereType<Map>().map((r) => r['commodity']).toSet();
      debugPrint('[Agmarknet] "${commodity.agmarknetName}": ${records.length} records, commodities=$names');
    }
    return parseRecords(commodity, records, fetchedAt: DateTime.now());
  }

  /// Turns raw mandi records into one robust quote: the median modal price
  /// across mandis on the most recent arrival date.
  @visibleForTesting
  static PriceQuote? parseRecords(Commodity commodity, List<dynamic> records, {required DateTime fetchedAt}) {
    final parsed = <({DateTime date, double modal, double? min, double? max, String market})>[];
    final dateFormat = DateFormat('dd/MM/yyyy');

    final wanted = _normalize(commodity.agmarknetName ?? commodity.name);
    for (final record in records.whereType<Map<String, dynamic>>()) {
      // Never trust the API filter alone: keep only records for this commodity.
      if (_normalize('${record['commodity'] ?? ''}') != wanted) continue;
      final modal = _toDouble(record['modal_price']);
      final dateRaw = record['arrival_date'];
      if (modal == null || dateRaw is! String) continue;
      final DateTime date;
      try {
        date = dateFormat.parseStrict(dateRaw);
      } on FormatException {
        continue;
      }
      final perKg = modal / 100;
      if (!isPlausiblePrice(perKg, commodity.domesticRef)) continue;
      parsed.add((
        date: date,
        modal: perKg,
        min: _toDouble(record['min_price']).let((v) => v / 100),
        max: _toDouble(record['max_price']).let((v) => v / 100),
        market: '${record['market'] ?? ''}, ${record['state'] ?? ''}',
      ));
    }
    if (parsed.isEmpty) return null;

    final latest = parsed.map((r) => r.date).reduce((a, b) => a.isAfter(b) ? a : b);
    final today = parsed.where((r) => r.date == latest).toList();
    final modals = today.map((r) => r.modal).toList()..sort();
    final mid = modals.length ~/ 2;
    final median = modals.length.isOdd ? modals[mid] : (modals[mid - 1] + modals[mid]) / 2;
    final lows = today.map((r) => r.min).whereType<double>();
    final highs = today.map((r) => r.max).whereType<double>();

    final where = today.length == 1 ? today.first.market : 'Median of ${today.length} mandis';
    return PriceQuote(
      commodityId: commodity.id,
      scope: MarketScope.domestic,
      price: median,
      currency: 'INR',
      unit: 'kg',
      updatedAt: fetchedAt,
      origin: QuoteOrigin.live,
      sourceName: 'Agmarknet',
      low: lows.isEmpty ? null : lows.reduce((a, b) => a < b ? a : b),
      high: highs.isEmpty ? null : highs.reduce((a, b) => a > b ? a : b),
      note: '$where · ${DateFormat('d MMM').format(latest)}',
    );
  }

  static String _normalize(String s) => s.toLowerCase().replaceAll(RegExp(r'\s+'), ' ').trim();

  static double? _toDouble(Object? value) => switch (value) {
    num n => n.toDouble(),
    String s => double.tryParse(s.trim()),
    _ => null,
  };
}

extension<T extends Object> on T? {
  R? let<R>(R Function(T value) f) {
    final self = this;
    return self == null ? null : f(self);
  }
}
