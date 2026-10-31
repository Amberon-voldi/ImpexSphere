import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../auth/presentation/auth_controller.dart';
import '../domain/price_quote.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/common.dart';
import '../../alerts/domain/price_alert.dart';
import '../../alerts/presentation/alerts_controller.dart';
import '../domain/commodity.dart';
import '../domain/market_snapshot.dart';
import 'pricing_providers.dart';
import 'pricing_widgets.dart';

class CommodityDetailScreen extends ConsumerStatefulWidget {
  const CommodityDetailScreen({super.key, required this.commodityId, this.initialScope = MarketScope.domestic});

  final String commodityId;
  final MarketScope initialScope;

  @override
  ConsumerState<CommodityDetailScreen> createState() => _CommodityDetailScreenState();
}

class _CommodityDetailScreenState extends ConsumerState<CommodityDetailScreen> {
  late MarketScope _scope = widget.initialScope;

  @override
  Widget build(BuildContext context) {
    final commodity = commodityById[widget.commodityId];
    if (commodity == null) {
      return const Scaffold(
        body: EmptyState(icon: Icons.help_outline_rounded, title: 'Unknown commodity', message: 'It may have been removed.'),
      );
    }
    final snapshot = ref.watch(marketSnapshotProvider).value;
    final currency = ref.watch(displayCurrencyProvider);
    final watched = ref.watch(alertsControllerProvider.select((s) => s.isWatched(commodity.id, _scope)));
    final quote = snapshot?.quote(commodity.id, _scope);

    final user = ref.watch(currentUserProvider);
    return Scaffold(
      appBar: AppBar(
        actions: [
          IconButton(
            tooltip: watched ? 'Remove from watchlist' : 'Add to watchlist',
            icon: Icon(watched ? Icons.star_rounded : Icons.star_outline_rounded, color: watched ? AppColors.gold : null),
            onPressed: () {
              HapticFeedback.selectionClick();
              ref.read(alertsControllerProvider.notifier).toggleWatch(commodity.id, _scope);
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
        children: [
          Text(commodity.name, style: AppTheme.display(24)),
          const SizedBox(height: 4),
          Text(
            ['HS ${commodity.hsCode}', commodity.category.label].join(' · '),
            style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
          ),
          const SizedBox(height: 18),
          SegmentedButton<MarketScope>(
            showSelectedIcon: false,
            segments: const [
              ButtonSegment(value: MarketScope.domestic, label: Text('Domestic')),
              ButtonSegment(value: MarketScope.international, label: Text('Export')),
            ],
            selected: {_scope},
            onSelectionChanged: (s) => setState(() => _scope = s.first),
          ),
          const SizedBox(height: 24),
          if (snapshot == null)
            const Padding(padding: EdgeInsets.all(40), child: Center(child: CircularProgressIndicator()))
          else if (quote == null)
            NoLivePrices(scope: _scope, compact: true)
          else
            ..._priceSection(context, commodity, snapshot, DisplayQuote(quote, snapshot, currency)),
          const SizedBox(height: 24),
          _actions(context, commodity, user?.isSupplier ?? false, quote == null ? null : DisplayQuote(quote, snapshot!, currency)),
        ],
      ),
    );
  }

  List<Widget> _priceSection(BuildContext context, Commodity commodity, MarketSnapshot snapshot, DisplayQuote d) {
    final q = d.quote;
    final color = AppColors.forChange(d.changePct);
    final range = d.low != null && d.high != null
        ? '${formatMoney(d.low!, d.currency.code)} – ${formatMoney(d.high!, d.currency.code)}'
        : null;
    return [
      Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Flexible(
            child: FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(
                d.formatted,
                style: const TextStyle(fontSize: 38, fontWeight: FontWeight.w800, fontFeatures: AppTheme.tabular, height: 1),
              ),
            ),
          ),
          const SizedBox(width: 6),
          Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Text('/${d.currency.unit}', style: const TextStyle(color: AppColors.textMuted, fontSize: 15)),
          ),
        ],
      ),
      const SizedBox(height: 8),
      Row(
        children: [
          Text(
            q.previousClose == null
                ? 'No previous day yet'
                : '${formatSigned(d.change, d.currency.code)}  (${formatPct(d.changePct)})',
            style: TextStyle(color: color, fontWeight: FontWeight.w700, fontFeatures: AppTheme.tabular),
          ),
          const Spacer(),
          if (q.origin == QuoteOrigin.cached) const Pill(label: 'DELAYED', color: AppColors.warning),
        ],
      ),
      const SizedBox(height: 20),
      _PriceChart(
        values: d.history(),
        times: snapshot.historyFor(commodity.id, _scope).map((p) => p.time).toList(),
        currency: d.currency,
        up: d.changePct >= 0,
      ),
      const SizedBox(height: 16),
      _stat(_scope == MarketScope.domestic ? 'Mandi range today' : 'Day range', range ?? '—'),
      _stat('Market', q.note ?? _scope.description),
      _stat('Source', '${q.sourceName} · ${timeAgo(q.updatedAt)}', last: true),
    ];
  }

  Widget _actions(BuildContext context, Commodity commodity, bool isSupplier, DisplayQuote? d) {
    final primary = isSupplier
        ? GoldButton(
            label: 'List ${commodity.name}',
            icon: Icons.add_box_outlined,
            onPressed: () => context.push('/listing/new?commodity=${commodity.id}'),
          )
        : GoldButton(
            label: 'Find suppliers',
            icon: Icons.storefront_outlined,
            onPressed: () => context.go('/trade?commodity=${commodity.id}'),
          );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        primary,
        if (d != null) ...[
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: () => showModalBottomSheet<void>(
              context: context,
              isScrollControlled: true,
              builder: (_) => CreateAlertSheet(commodity: commodity, scope: _scope, currentPrice: d.price, currency: d.currency),
            ),
            icon: const Icon(Icons.notifications_none_rounded),
            label: const Text('Price alert'),
          ),
        ],
      ],
    );
  }

  Widget _stat(String label, String value, {bool last = false}) => Container(
    padding: const EdgeInsets.symmetric(vertical: 10),
    decoration: BoxDecoration(border: last ? null : const Border(bottom: BorderSide(color: AppColors.line))),
    child: Row(
      children: [
        Text(label, style: const TextStyle(color: AppColors.textSecondary)),
        const SizedBox(width: 16),
        Expanded(
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: const TextStyle(fontWeight: FontWeight.w700, fontFeatures: AppTheme.tabular),
          ),
        ),
      ],
    ),
  );
}

class _PriceChart extends StatelessWidget {
  const _PriceChart({required this.values, required this.times, required this.currency, required this.up});

  /// Matches the change badge (vs previous close), not first-vs-last point.
  final bool up;

  final List<double> values;
  final List<DateTime> times;
  final DisplayCurrency currency;

  @override
  Widget build(BuildContext context) {
    if (values.length < 2) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            Icon(Icons.show_chart_rounded, size: 18, color: AppColors.textMuted),
            SizedBox(width: 8),
            Text('Price history starts building from today.', style: TextStyle(color: AppColors.textMuted)),
          ],
        ),
      );
    }
    final color = up ? AppColors.positive : AppColors.negative;
    var lo = values.reduce((a, b) => a < b ? a : b);
    var hi = values.reduce((a, b) => a > b ? a : b);
    final pad = (hi - lo).abs() < 1e-9 ? hi * 0.01 + 1 : (hi - lo) * 0.15;
    lo -= pad;
    hi += pad;

    return SizedBox(
      height: 210,
      child: LineChart(
        LineChartData(
          minY: lo,
          maxY: hi,
          gridData: FlGridData(
            drawVerticalLine: false,
            horizontalInterval: (hi - lo) / 4,
            getDrawingHorizontalLine: (_) => const FlLine(color: AppColors.line, strokeWidth: 0.6, dashArray: [4, 4]),
          ),
          borderData: FlBorderData(show: false),
          titlesData: FlTitlesData(
            topTitles: const AxisTitles(),
            leftTitles: const AxisTitles(),
            bottomTitles: const AxisTitles(),
            rightTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 64,
                interval: (hi - lo) / 4,
                getTitlesWidget: (v, meta) => v == meta.min || v == meta.max
                    ? const SizedBox.shrink()
                    : Padding(
                        padding: const EdgeInsets.only(left: 6),
                        child: Text(
                          formatMoney(v, currency.code),
                          style: const TextStyle(color: AppColors.textMuted, fontSize: 10.5, fontFeatures: AppTheme.tabular),
                        ),
                      ),
              ),
            ),
          ),
          lineTouchData: LineTouchData(
            touchTooltipData: LineTouchTooltipData(
              getTooltipColor: (_) => AppColors.navy700,
              getTooltipItems: (spots) => [
                for (final s in spots)
                  LineTooltipItem(
                    '${formatMoney(s.y, currency.code)}\n',
                    const TextStyle(fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                    children: [
                      TextSpan(
                        text: DateFormat('d MMM, HH:mm').format(times[s.x.toInt().clamp(0, times.length - 1)]),
                        style: const TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
              ],
            ),
          ),
          lineBarsData: [
            LineChartBarData(
              spots: [for (var i = 0; i < values.length; i++) FlSpot(i.toDouble(), values[i])],
              isCurved: true,
              curveSmoothness: 0.2,
              color: color,
              barWidth: 2.2,
              dotData: const FlDotData(show: false),
              belowBarData: BarAreaData(
                show: true,
                gradient: LinearGradient(
                  colors: [color.withValues(alpha: 0.28), color.withValues(alpha: 0)],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
              ),
            ),
          ],
        ),
        duration: const Duration(milliseconds: 250),
      ),
    );
  }
}

class CreateAlertSheet extends ConsumerStatefulWidget {
  const CreateAlertSheet({super.key, required this.commodity, required this.scope, required this.currentPrice, required this.currency});

  final Commodity commodity;
  final MarketScope scope;
  final double currentPrice;
  final DisplayCurrency currency;

  @override
  ConsumerState<CreateAlertSheet> createState() => _CreateAlertSheetState();
}

class _CreateAlertSheetState extends ConsumerState<CreateAlertSheet> {
  var _condition = AlertCondition.above;
  late final _target = TextEditingController(text: (widget.currentPrice * 1.03).toStringAsFixed(widget.currentPrice < 100 ? 2 : 0));
  String? _error;

  @override
  void dispose() {
    _target.dispose();
    super.dispose();
  }

  void _save() {
    final target = double.tryParse(_target.text.replaceAll(',', '').trim());
    if (target == null || target <= 0) {
      setState(() => _error = 'Enter a valid price');
      return;
    }
    final alreadyMet = _condition == AlertCondition.above ? widget.currentPrice >= target : widget.currentPrice <= target;
    if (alreadyMet) {
      setState(() => _error = 'The price is already ${_condition == AlertCondition.above ? 'above' : 'below'} this level');
      return;
    }
    ref.read(alertsControllerProvider.notifier).addAlert(
      commodityId: widget.commodity.id,
      scope: widget.scope,
      condition: _condition,
      target: target,
      currency: widget.currency,
    );
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Alert set: ${widget.commodity.name} ${_condition.label} ${formatMoney(target, widget.currency.code)}')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, MediaQuery.viewInsetsOf(context).bottom + 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Price alert', style: AppTheme.display(24)),
          const SizedBox(height: 4),
          Text(
            '${widget.commodity.name} · ${widget.scope.label} · now ${formatMoney(widget.currentPrice, widget.currency.code)}/${widget.currency.unit}',
            style: const TextStyle(color: AppColors.textSecondary),
          ),
          const SizedBox(height: 18),
          SegmentedButton<AlertCondition>(
            showSelectedIcon: false,
            segments: const [
              ButtonSegment(value: AlertCondition.above, label: Text('Rises above'), icon: Icon(Icons.trending_up_rounded)),
              ButtonSegment(value: AlertCondition.below, label: Text('Falls below'), icon: Icon(Icons.trending_down_rounded)),
            ],
            selected: {_condition},
            onSelectionChanged: (s) => setState(() {
              _condition = s.first;
              final factor = _condition == AlertCondition.above ? 1.03 : 0.97;
              _target.text = (widget.currentPrice * factor).toStringAsFixed(widget.currentPrice < 100 ? 2 : 0);
              _error = null;
            }),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _target,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: InputDecoration(
              labelText: 'Target price (${widget.currency.perUnit})',
              prefixText: currencySymbol(widget.currency.code),
              errorText: _error,
            ),
            onSubmitted: (_) => _save(),
          ),
          const SizedBox(height: 18),
          GoldButton(label: 'Create alert', onPressed: _save),
        ],
      ),
    );
  }
}
