import 'package:flutter_test/flutter_test.dart';
import 'package:impex_sphere/features/pricing/data/price_cache.dart';
import 'package:impex_sphere/features/pricing/data/price_repository.dart';
import 'package:impex_sphere/features/pricing/data/price_source.dart';
import 'package:impex_sphere/features/pricing/domain/commodity.dart';
import 'package:impex_sphere/features/pricing/domain/market_snapshot.dart';
import 'package:impex_sphere/features/pricing/domain/price_quote.dart';

class FakeSource implements PriceSource {
  FakeSource(this.name, this.respond);

  @override
  final String name;
  Future<List<PriceQuote>> Function() respond;
  int calls = 0;

  @override
  Future<List<PriceQuote>> fetch(List<Commodity> catalog) {
    calls++;
    return respond();
  }
}

PriceQuote liveQuote(String id, double price, DateTime at, {double? previousClose}) => PriceQuote(
  commodityId: id,
  scope: MarketScope.domestic,
  price: price,
  currency: 'INR',
  unit: 'kg',
  updatedAt: at,
  origin: QuoteOrigin.live,
  sourceName: 'Fake',
  previousClose: previousClose,
);

void main() {
  const catalog = [
    Commodity(id: 'turmeric', name: 'Turmeric', category: CommodityCategory.spices, hsCode: '0910.30', domesticRef: 140, internationalRef: 2000),
    Commodity(id: 'onion', name: 'Onion', category: CommodityCategory.vegetables, hsCode: '0703.10', domesticRef: 24, internationalRef: 390),
  ];

  late DateTime now;
  DateTime clock() => now;

  setUp(() => now = DateTime(2026, 10, 31, 10));

  PriceRepository repo(List<PriceSource> sources, {PriceCache? cache}) => PriceRepository(
    catalog: catalog,
    cache: cache ?? MemoryPriceCache(),
    liveSources: sources,
    pollInterval: const Duration(hours: 1),
    clock: clock,
  );

  test('with no live source the feed is not connected and shows no prices', () async {
    final r = repo([]);
    await r.start();
    expect(r.latest!.status, FeedStatus.notConfigured);
    expect(r.latest!.quotes, isEmpty);
    r.dispose();
  });

  test('only commodities a live source priced have quotes; nothing is invented', () async {
    final source = FakeSource('A', () async => [liveQuote('turmeric', 151, now)]);
    final r = repo([source]);
    await r.start();
    final s = r.latest!;
    expect(s.status, FeedStatus.live);
    expect(s.quote('turmeric', MarketScope.domestic)!.price, 151);
    expect(s.quote('turmeric', MarketScope.domestic)!.origin, QuoteOrigin.live);
    expect(s.quote('onion', MarketScope.domestic), isNull);
    expect(s.quote('turmeric', MarketScope.international), isNull);
    r.dispose();
  });

  test('one failing source gives a partial feed, not an outage', () async {
    final ok = FakeSource('OK', () async => [liveQuote('onion', 25, now)]);
    final bad = FakeSource('Bad', () async => throw const PriceSourceException('boom'));
    final r = repo([ok, bad]);
    await r.start();
    expect(r.latest!.status, FeedStatus.partial);
    expect(r.latest!.issues.single, contains('Bad'));
    expect(r.consecutiveFailures, 0);
    r.dispose();
  });

  test('total failure keeps last live prices and downgrades them once stale', () async {
    var fail = false;
    final source = FakeSource('A', () async {
      if (fail) throw const PriceSourceException('down');
      return [liveQuote('turmeric', 150, now)];
    });
    final r = repo([source]);
    await r.start();

    fail = true;
    now = now.add(const Duration(minutes: 10));
    await r.refresh();
    expect(r.latest!.status, FeedStatus.offline);
    expect(r.consecutiveFailures, 1);
    expect(r.latest!.quote('turmeric', MarketScope.domestic)!.origin, QuoteOrigin.live);
    expect(r.latest!.quote('turmeric', MarketScope.domestic)!.price, 150);

    now = now.add(const Duration(hours: 7));
    await r.refresh();
    expect(r.consecutiveFailures, 2);
    expect(r.latest!.quote('turmeric', MarketScope.domestic)!.origin, QuoteOrigin.cached);
    r.dispose();
  });

  test('previous close is derived from history when the source has none', () async {
    var price = 140.0;
    final source = FakeSource('A', () async => [liveQuote('turmeric', price, now)]);
    final r = repo([source]);
    await r.start();

    now = now.add(const Duration(days: 1));
    price = 147;
    await r.refresh();
    final q = r.latest!.quote('turmeric', MarketScope.domestic)!;
    expect(q.previousClose, 140);
    expect(q.changePct, closeTo(5, 1e-9));
    r.dispose();
  });

  test('cached live prices are restored on the next launch', () async {
    final cache = MemoryPriceCache();
    final first = repo([FakeSource('A', () async => [liveQuote('turmeric', 152, now)])], cache: cache);
    await first.start();
    first.dispose();

    final second = repo([FakeSource('A', () async => throw const PriceSourceException('offline'))], cache: cache);
    await second.start();
    final q = second.latest!.quote('turmeric', MarketScope.domestic)!;
    expect(q.price, 152);
    expect(q.origin, QuoteOrigin.cached);
    expect(second.latest!.status, FeedStatus.offline);
    second.dispose();
  });

  test('concurrent refreshes are coalesced into one fetch', () async {
    final source = FakeSource('A', () async => [liveQuote('turmeric', 150, now)]);
    final r = repo([source]);
    await r.start();
    final before = source.calls;
    await Future.wait([r.refresh(), r.refresh(), r.refresh()]);
    expect(source.calls, before + 1);
    r.dispose();
  });

  test('plausibility guard rejects unit mistakes', () {
    expect(isPlausiblePrice(150, 140), isTrue);
    expect(isPlausiblePrice(14000, 140), isFalse); // ₹/quintal passed as ₹/kg
    expect(isPlausiblePrice(0, 140), isFalse);
    expect(isPlausiblePrice(double.nan, 140), isFalse);
  });
}
