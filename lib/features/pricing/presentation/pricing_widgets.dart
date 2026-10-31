import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/config/env.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/common.dart';
import '../../../core/widgets/sparkline.dart';
import '../domain/commodity.dart';
import '../domain/market_snapshot.dart';
import '../domain/price_quote.dart';
import 'pricing_providers.dart';

IconData categoryIcon(CommodityCategory category) => switch (category) {
  CommodityCategory.spices => Icons.local_fire_department_rounded,
  CommodityCategory.vegetables => Icons.eco_rounded,
  CommodityCategory.fruits => Icons.spa_rounded,
  CommodityCategory.grains => Icons.grass_rounded,
  CommodityCategory.pulses => Icons.grain_rounded,
  CommodityCategory.oilseeds => Icons.water_drop_rounded,
  CommodityCategory.plantation => Icons.coffee_rounded,
};

Color feedColor(FeedStatus status) => switch (status) {
  FeedStatus.live => AppColors.positive,
  FeedStatus.partial => AppColors.warning,
  FeedStatus.offline => AppColors.negative,
  FeedStatus.notConfigured || FeedStatus.connecting => AppColors.textMuted,
};

/// A quote expressed in the user's display currency.
class DisplayQuote {
  DisplayQuote(this.quote, this.snapshot, this.currency);

  final PriceQuote quote;
  final MarketSnapshot snapshot;
  final DisplayCurrency currency;

  double _c(double v) => snapshot.convert(v, quote.currency, currency);

  double get price => _c(quote.price);
  double? get previousClose => quote.previousClose == null ? null : _c(quote.previousClose!);
  double? get low => quote.low == null ? null : _c(quote.low!);
  double? get high => quote.high == null ? null : _c(quote.high!);
  double get changePct => quote.changePct;
  double get change => _c(quote.price) - (previousClose ?? price);
  String get formatted => formatMoney(price, currency.code);
  List<double> history() => snapshot.historyFor(quote.commodityId, quote.scope).map((p) => _c(p.value)).toList();
}

/// One quiet line: feed health, source and last update. Tap for details.
class FeedLine extends StatelessWidget {
  const FeedLine({super.key, required this.snapshot});

  final MarketSnapshot snapshot;

  @override
  Widget build(BuildContext context) {
    final color = feedColor(snapshot.status);
    final sources = [
      if (Env.agmarknetApiKey.isNotEmpty) 'Agmarknet',
      if (Env.priceApiUrl.isNotEmpty) 'SP International',
    ];
    final detail = switch (snapshot.status) {
      FeedStatus.notConfigured => 'No live source connected',
      FeedStatus.connecting => 'Fetching live prices…',
      _ => '${sources.join(' + ')} · ${formatTime(snapshot.updatedAt).substring(0, 5)}',
    };
    return InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: () => showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        builder: (_) => FeedDiagnosticsSheet(snapshot: snapshot),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          children: [
            LiveDot(color: color, pulse: snapshot.status == FeedStatus.live, size: 7),
            Text(snapshot.status.label, style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 12.5)),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                detail,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: AppColors.textMuted, fontSize: 12.5),
              ),
            ),
            const Icon(Icons.chevron_right_rounded, size: 18, color: AppColors.textMuted),
          ],
        ),
      ),
    );
  }
}

class FeedDiagnosticsSheet extends ConsumerWidget {
  const FeedDiagnosticsSheet({super.key, required this.snapshot});

  final MarketSnapshot snapshot;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final delayed = snapshot.quotes.values.where((q) => q.origin == QuoteOrigin.cached).length;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Live price data', style: AppTheme.display(20)),
            const SizedBox(height: 6),
            const Text(
              'Only real market prices are shown. Domestic prices are the median across reporting mandis; '
              'sources retry automatically if they fail.',
              style: TextStyle(color: AppColors.textSecondary, height: 1.45),
            ),
            const SizedBox(height: 14),
            _row('Status', snapshot.status.label, feedColor(snapshot.status)),
            _row('Domestic · Agmarknet', Env.agmarknetApiKey.isEmpty ? 'Not connected' : 'Connected'),
            _row('Export · SP International', Env.priceApiUrl.isEmpty ? 'Not connected' : 'Connected'),
            _row('Commodities priced', '${snapshot.quotes.length}${delayed > 0 ? ' ($delayed delayed)' : ''}'),
            _row('USD/INR', '${snapshot.usdInr.toStringAsFixed(2)}${snapshot.fxLive ? '' : ' (last known)'}'),
            if (snapshot.issues.isNotEmpty) ...[
              const SizedBox(height: 10),
              for (final issue in snapshot.issues)
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text('• $issue', style: const TextStyle(color: AppColors.warning, fontSize: 13)),
                ),
            ],
            const SizedBox(height: 16),
            if (snapshot.status != FeedStatus.notConfigured)
              OutlinedButton.icon(
                onPressed: () {
                  ref.read(priceRepositoryProvider).refresh();
                  Navigator.pop(context);
                },
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Refresh now'),
              ),
          ],
        ),
      ),
    );
  }

  Widget _row(String label, String value, [Color color = AppColors.textPrimary]) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Row(
      children: [
        Expanded(child: Text(label, style: const TextStyle(color: AppColors.textSecondary))),
        Text(value, style: TextStyle(color: color, fontWeight: FontWeight.w700)),
      ],
    ),
  );
}

/// Shown where prices would be when no live source covers them.
class NoLivePrices extends StatelessWidget {
  const NoLivePrices({super.key, required this.scope, this.compact = false});

  final MarketScope scope;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final domestic = scope == MarketScope.domestic;
    final configured = domestic ? Env.agmarknetApiKey.isNotEmpty || Env.priceApiUrl.isNotEmpty : Env.priceApiUrl.isNotEmpty;
    final title = configured ? 'Waiting for live prices' : 'Connect live prices';
    final message = configured
        ? 'The price feed hasn\'t returned data for this market yet. It retries automatically.'
        : domestic
        ? 'Domestic mandi prices come from Agmarknet (Government of India). Add an AGMARKNET_API_KEY to env.json to turn them on.'
        : 'Export (FOB) prices come from the SP International price feed. They appear here once it is connected.';
    if (compact) {
      return SurfaceCard(
        child: Row(
          children: [
            const Icon(Icons.sensors_off_rounded, color: AppColors.textMuted),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 2),
                  Text(message, style: const TextStyle(color: AppColors.textMuted, fontSize: 12.5, height: 1.35)),
                ],
              ),
            ),
          ],
        ),
      );
    }
    return EmptyState(icon: Icons.sensors_off_rounded, title: title, message: message);
  }
}

class CurrencyToggle extends ConsumerWidget {
  const CurrencyToggle({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currency = ref.watch(displayCurrencyProvider);
    return SegmentedButton<DisplayCurrency>(
      showSelectedIcon: false,
      style: const ButtonStyle(visualDensity: VisualDensity.compact, tapTargetSize: MaterialTapTargetSize.shrinkWrap),
      segments: const [
        ButtonSegment(value: DisplayCurrency.inr, label: Text('₹/kg')),
        ButtonSegment(value: DisplayCurrency.usd, label: Text(r'$/MT')),
      ],
      selected: {currency},
      onSelectionChanged: (s) => ref.read(displayCurrencyProvider.notifier).set(s.first),
    );
  }
}

class QuoteTile extends StatelessWidget {
  const QuoteTile({super.key, required this.commodity, required this.display});

  final Commodity commodity;
  final DisplayQuote display;

  @override
  Widget build(BuildContext context) {
    final q = display.quote;
    final history = display.history();
    final color = AppColors.forChange(display.changePct);
    return InkWell(
      onTap: () => context.push('/markets/${commodity.id}?scope=${q.scope.name}'),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(commodity.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15.5), overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 3),
                  Text(
                    q.origin == QuoteOrigin.cached ? 'Delayed · ${q.note ?? q.sourceName}' : (q.note ?? q.sourceName),
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: q.origin == QuoteOrigin.cached ? AppColors.warning : AppColors.textMuted, fontSize: 12.5),
                  ),
                ],
              ),
            ),
            if (history.length >= 3) ...[
              Sparkline(values: history, color: color, width: 52, height: 24),
              const SizedBox(width: 14),
            ],
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  display.formatted,
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15.5, fontFeatures: AppTheme.tabular),
                ),
                const SizedBox(height: 3),
                Text(
                  q.previousClose == null ? '—' : formatPct(display.changePct),
                  style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 12.5, fontFeatures: AppTheme.tabular),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
