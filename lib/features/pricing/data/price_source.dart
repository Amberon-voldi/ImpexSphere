import '../domain/commodity.dart';
import '../domain/price_quote.dart';

/// A provider of market quotes. Implementations may cover only part of the
/// catalog; the repository merges every source with reference levels.
abstract interface class PriceSource {
  String get name;

  /// Returns quotes for whatever part of [catalog] this source covers.
  /// Throws [PriceSourceException] when the source is unusable this cycle.
  Future<List<PriceQuote>> fetch(List<Commodity> catalog);
}

class PriceSourceException implements Exception {
  const PriceSourceException(this.message);

  final String message;

  @override
  String toString() => message;
}

/// Rejects values that are clearly unit or parsing mistakes rather than real
/// market moves (more than [tolerance]x away from the reference level).
bool isPlausiblePrice(double value, double reference, {double tolerance = 6}) {
  if (!value.isFinite || value <= 0) return false;
  if (reference <= 0) return true;
  final ratio = value / reference;
  return ratio < tolerance && ratio > 1 / tolerance;
}
