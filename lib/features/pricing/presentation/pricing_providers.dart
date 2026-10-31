import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/env.dart';
import '../../../core/storage/json_store.dart';
import '../data/agmarknet_source.dart';
import '../data/custom_api_source.dart';
import '../data/fx_source.dart';
import '../data/price_cache.dart';
import '../data/price_repository.dart';
import '../data/price_source.dart';
import '../domain/commodity.dart';
import '../domain/market_snapshot.dart';

final priceRepositoryProvider = Provider<PriceRepository>((ref) {
  final sources = <PriceSource>[
    if (Env.priceApiUrl.isNotEmpty) CustomApiPriceSource(baseUrl: Env.priceApiUrl),
    if (Env.agmarknetApiKey.isNotEmpty) AgmarknetPriceSource(apiKey: Env.agmarknetApiKey),
  ];
  final repo = PriceRepository(
    catalog: commodityCatalog,
    cache: JsonPriceCache(ref.watch(jsonStoreProvider)),
    liveSources: sources,
    fx: Env.liveFx ? FxRateSource() : null,
  );

  // Don't poll public APIs while the app is backgrounded.
  final lifecycle = AppLifecycleListener(onPause: repo.pause, onResume: repo.resume);
  ref.onDispose(() {
    lifecycle.dispose();
    repo.dispose();
  });
  repo.start();
  return repo;
});

final marketSnapshotProvider = StreamProvider<MarketSnapshot>((ref) async* {
  final repo = ref.watch(priceRepositoryProvider);
  final latest = repo.latest;
  if (latest != null) yield latest;
  yield* repo.stream;
});

class DisplayCurrencyNotifier extends Notifier<DisplayCurrency> {
  static const _key = 'prefs.displayCurrency';

  @override
  DisplayCurrency build() {
    final saved = ref.read(jsonStoreProvider).read(_key);
    return DisplayCurrency.values.asNameMap()[saved] ?? DisplayCurrency.inr;
  }

  void set(DisplayCurrency value) {
    state = value;
    ref.read(jsonStoreProvider).write(_key, value.name);
  }
}

final displayCurrencyProvider = NotifierProvider<DisplayCurrencyNotifier, DisplayCurrency>(
  DisplayCurrencyNotifier.new,
);
