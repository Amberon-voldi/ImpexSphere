import 'dart:convert';

import 'package:http/http.dart' as http;

import 'price_source.dart';

/// Live USD→INR rate from open.er-api.com (free, no key, refreshed daily).
class FxRateSource {
  FxRateSource({http.Client? client, this.timeout = const Duration(seconds: 10)})
    : _client = client ?? http.Client();

  final Duration timeout;
  final http.Client _client;

  Future<double> fetchUsdInr() async {
    final response = await _client.get(Uri.https('open.er-api.com', '/v6/latest/USD')).timeout(timeout);
    if (response.statusCode != 200) {
      throw PriceSourceException('FX HTTP ${response.statusCode}');
    }
    final body = jsonDecode(response.body);
    final rates = body is Map<String, dynamic> ? body['rates'] : null;
    final rate = rates is Map ? rates['INR'] : null;
    if (rate is! num || rate < 40 || rate > 200) {
      throw const PriceSourceException('FX rate missing or implausible');
    }
    return rate.toDouble();
  }
}
