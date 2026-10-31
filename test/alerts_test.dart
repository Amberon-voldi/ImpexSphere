import 'package:flutter_test/flutter_test.dart';
import 'package:impex_sphere/features/alerts/domain/price_alert.dart';
import 'package:impex_sphere/features/pricing/domain/commodity.dart';
import 'package:impex_sphere/features/pricing/domain/market_snapshot.dart';
import 'package:impex_sphere/features/pricing/domain/price_quote.dart';

void main() {
  final now = DateTime(2026, 10, 31);

  MarketSnapshot snapshotWith({required double domesticInrKg, required double exportUsdMt}) => MarketSnapshot(
    quotes: {
      for (final q in [
        PriceQuote(
          commodityId: 'cumin',
          scope: MarketScope.domestic,
          price: domesticInrKg,
          currency: 'INR',
          unit: 'kg',
          updatedAt: now,
          origin: QuoteOrigin.live,
          sourceName: 'test',
        ),
        PriceQuote(
          commodityId: 'cumin',
          scope: MarketScope.international,
          price: exportUsdMt,
          currency: 'USD',
          unit: 'MT',
          updatedAt: now,
          origin: QuoteOrigin.live,
          sourceName: 'test',
        ),
      ])
        q.key: q,
    },
    history: const {},
    updatedAt: now,
    status: FeedStatus.live,
    usdInr: 80,
    fxLive: true,
  );

  PriceAlert alert(AlertCondition c, double target, {MarketScope scope = MarketScope.domestic, DisplayCurrency cur = DisplayCurrency.inr}) =>
      PriceAlert(id: '${c.name}$target', commodityId: 'cumin', scope: scope, condition: c, target: target, currency: cur, createdAt: now);

  test('above/below alerts trigger only when crossed', () {
    final s = snapshotWith(domesticInrKg: 250, exportUsdMt: 3000);
    final hits = evaluateAlerts([
      alert(AlertCondition.above, 245),
      alert(AlertCondition.above, 260),
      alert(AlertCondition.below, 255),
      alert(AlertCondition.below, 240),
    ], s);
    expect(hits.map((h) => h.alert.id), ['above245.0', 'below255.0']);
  });

  test('alerts compare in their own currency and unit', () {
    // $3000/MT at 80 INR/USD = ₹240/kg.
    final s = snapshotWith(domesticInrKg: 250, exportUsdMt: 3000);
    final hits = evaluateAlerts([
      alert(AlertCondition.below, 241, scope: MarketScope.international),
      alert(AlertCondition.above, 2990, scope: MarketScope.international, cur: DisplayCurrency.usd),
    ], s);
    expect(hits, hasLength(2));
    expect(hits.first.price, closeTo(240, 1e-9));
  });

  test('triggered alerts do not fire again until re-armed', () {
    final s = snapshotWith(domesticInrKg: 250, exportUsdMt: 3000);
    final fired = alert(AlertCondition.above, 245).triggered(now, 250);
    expect(evaluateAlerts([fired], s), isEmpty);
    expect(evaluateAlerts([fired.rearmed()], s), hasLength(1));
  });
}
