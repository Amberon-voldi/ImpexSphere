import 'dart:async';
import 'dart:math';

import '../domain/commodity.dart';
import '../domain/market_snapshot.dart';
import '../domain/price_quote.dart';
import 'fx_source.dart';
import 'price_cache.dart';
import 'price_source.dart';

/// Single source of truth for market prices. Live data only.
///
/// A commodity has a quote only once a live source has priced it. Each source
/// fails independently; failed cycles retry with exponential backoff, quotes
/// older than [staleAfter] are marked "Delayed", and the last good data is
/// persisted so the app opens with real numbers even when offline.
class PriceRepository {
  PriceRepository({
    required this.catalog,
    required this.cache,
    this.liveSources = const [],
    this.fx,
    this.pollInterval = const Duration(minutes: 5),
    this.retryInterval = const Duration(seconds: 15),
    this.maxBackoff = const Duration(minutes: 10),
    this.fxInterval = const Duration(minutes: 30),
    this.staleAfter = const Duration(hours: 6),
    double fallbackUsdInr = 88.5,
    DateTime Function()? clock,
  }) : _usdInr = fallbackUsdInr,
       _clock = clock ?? DateTime.now;

  final List<Commodity> catalog;
  final PriceCache cache;
  final List<PriceSource> liveSources;
  final FxRateSource? fx;
  final Duration pollInterval;
  final Duration retryInterval;
  final Duration maxBackoff;
  final Duration fxInterval;
  final Duration staleAfter;

  static const maxHistory = 240;

  final DateTime Function() _clock;
  final _controller = StreamController<MarketSnapshot>.broadcast();
  final _quotes = <String, PriceQuote>{};
  final _history = <String, List<PricePoint>>{};
  late final _commodities = {for (final c in catalog) c.id: c};

  double _usdInr;
  bool _fxLive = false;
  DateTime? _nextFxAt;
  String? _fxIssue;
  var _sourceIssues = <String>[];
  late var _status = liveSources.isEmpty ? FeedStatus.notConfigured : FeedStatus.connecting;
  var _consecutiveFailures = 0;
  Timer? _timer;
  Future<void>? _inFlight;
  bool _started = false;
  bool _paused = false;
  bool _disposed = false;

  MarketSnapshot? _latest;

  bool get isConfigured => liveSources.isNotEmpty;
  MarketSnapshot? get latest => _latest;
  Stream<MarketSnapshot> get stream => _controller.stream;
  int get consecutiveFailures => _consecutiveFailures;

  Future<void> start() async {
    if (_started || _disposed) return;
    _started = true;

    final cached = await _safeLoad();
    if (cached != null) {
      if (cached.usdInr != null) _usdInr = cached.usdInr!;
      _history.addAll(cached.history);
      for (final q in cached.quotes.values) {
        if (_commodities.containsKey(q.commodityId)) {
          _quotes[q.key] = q.copyWith(origin: QuoteOrigin.cached);
        }
      }
    }

    _emit();
    await refresh();
  }

  /// Fetches now (coalescing concurrent calls) and reschedules the next poll.
  Future<void> refresh() {
    if (_disposed) return Future.value();
    return _inFlight ??= _refreshOnce().whenComplete(() {
      _inFlight = null;
      _scheduleNext();
    });
  }

  /// Stops polling, e.g. while the app is in the background.
  void pause() {
    _paused = true;
    _timer?.cancel();
  }

  void resume() {
    if (!_paused || _disposed) return;
    _paused = false;
    if (_started) refresh();
  }

  void dispose() {
    _disposed = true;
    _timer?.cancel();
    _controller.close();
  }

  Future<void> _refreshOnce() async {
    final now = _clock();
    await _refreshFx(now);
    if (!isConfigured) {
      _emit();
      return;
    }

    var succeeded = 0;
    final issues = <String>[];
    final results = await Future.wait(
      liveSources.map((source) async {
        try {
          final quotes = await source.fetch(catalog);
          succeeded++;
          return quotes;
        } catch (e) {
          issues.add('${source.name}: $e');
          return const <PriceQuote>[];
        }
      }),
    );
    if (_disposed) return;

    final fresh = <String>{};
    for (final quote in results.expand((q) => q)) {
      if (!_commodities.containsKey(quote.commodityId)) continue;
      _quotes[quote.key] = _withPreviousClose(quote);
      _appendHistory(quote.key, quote.price, quote.updatedAt);
      fresh.add(quote.key);
    }

    for (final entry in _quotes.entries.toList()) {
      final q = entry.value;
      if (!fresh.contains(entry.key) && q.origin == QuoteOrigin.live && now.difference(q.updatedAt) > staleAfter) {
        _quotes[entry.key] = q.copyWith(origin: QuoteOrigin.cached);
      }
    }

    _status = switch (succeeded) {
      0 => FeedStatus.offline,
      _ when succeeded == liveSources.length => FeedStatus.live,
      _ => FeedStatus.partial,
    };
    _consecutiveFailures = succeeded == 0 ? _consecutiveFailures + 1 : 0;
    _sourceIssues = issues;
    _emit();

    if (fresh.isNotEmpty) await _safeSave();
  }

  Future<void> _refreshFx(DateTime now) async {
    final fx = this.fx;
    if (fx == null) return;
    final due = _nextFxAt;
    if (due != null && now.isBefore(due)) return;
    // Claim the slot before awaiting so overlapping refreshes don't double-fetch.
    _nextFxAt = now.add(fxInterval);
    try {
      _usdInr = await fx.fetchUsdInr();
      _fxLive = true;
      _fxIssue = null;
    } catch (e) {
      _fxLive = false;
      _fxIssue = 'FX: $e';
      _nextFxAt = now.add(const Duration(minutes: 2));
    }
  }

  /// Sources like Agmarknet only report today's price; derive the change from
  /// our own history. Without an earlier day there is no change to show.
  PriceQuote _withPreviousClose(PriceQuote quote) {
    if (quote.previousClose != null) return quote;
    final points = _history[quote.key] ?? const <PricePoint>[];
    final day = DateTime(quote.updatedAt.year, quote.updatedAt.month, quote.updatedAt.day);
    PricePoint? earlier;
    for (final p in points) {
      if (p.time.isBefore(day)) earlier = p;
    }
    return earlier == null ? quote : quote.copyWith(previousClose: earlier.value);
  }

  void _appendHistory(String key, double value, DateTime time) {
    final points = _history.putIfAbsent(key, () => []);
    if (points.isNotEmpty) {
      final last = points.last;
      if (last.value == value && time.difference(last.time) < const Duration(hours: 1)) return;
    }
    points.add(PricePoint(time, value));
    if (points.length > maxHistory) points.removeRange(0, points.length - maxHistory);
  }

  void _scheduleNext() {
    if (_disposed || _paused) return;
    final Duration delay;
    if (!isConfigured) {
      delay = fxInterval;
    } else if (_consecutiveFailures == 0) {
      delay = pollInterval;
    } else {
      final backoff = retryInterval * pow(2, min(_consecutiveFailures - 1, 8)).toInt();
      delay = backoff > maxBackoff ? maxBackoff : backoff;
    }
    _timer?.cancel();
    _timer = Timer(delay, refresh);
  }

  void _emit() {
    if (_disposed) return;
    _latest = MarketSnapshot(
      quotes: Map.unmodifiable(_quotes),
      history: {for (final e in _history.entries) e.key: List.unmodifiable(e.value)},
      updatedAt: _clock(),
      status: _status,
      usdInr: _usdInr,
      fxLive: _fxLive,
      issues: [..._sourceIssues, ?_fxIssue],
    );
    _controller.add(_latest!);
  }

  Future<CachedMarket?> _safeLoad() async {
    try {
      return await cache.load();
    } catch (_) {
      return null;
    }
  }

  Future<void> _safeSave() async {
    try {
      await cache.save(CachedMarket(quotes: _quotes, history: _history, usdInr: _fxLive ? _usdInr : null));
    } catch (_) {
      // Cache is best-effort; a failed write must never break the feed.
    }
  }
}
