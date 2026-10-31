import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../alerts/presentation/alerts_controller.dart';
import '../domain/commodity.dart';
import 'pricing_providers.dart';
import 'pricing_widgets.dart';

class MarketsScreen extends ConsumerStatefulWidget {
  const MarketsScreen({super.key});

  @override
  ConsumerState<MarketsScreen> createState() => _MarketsScreenState();
}

class _MarketsScreenState extends ConsumerState<MarketsScreen> {
  MarketScope _scope = MarketScope.domestic;
  CommodityCategory? _category;
  bool _watchlistOnly = false;
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final snapshot = ref.watch(marketSnapshotProvider).value;
    final currency = ref.watch(displayCurrencyProvider);
    final watchlist = ref.watch(alertsControllerProvider.select((s) => s.watchlist));

    final rows = <(Commodity, DisplayQuote)>[];
    if (snapshot != null) {
      for (final c in commodityCatalog) {
        final q = snapshot.quote(c.id, _scope);
        if (q == null) continue;
        if (_category != null && c.category != _category) continue;
        if (_watchlistOnly && !watchlist.contains(q.key)) continue;
        if (_query.isNotEmpty && !c.name.toLowerCase().contains(_query)) continue;
        rows.add((c, DisplayQuote(q, snapshot, currency)));
      }
    }
    final anyLive = snapshot?.byScope(_scope).isNotEmpty ?? false;

    return Scaffold(
      appBar: AppBar(title: Text('Markets', style: AppTheme.display(22))),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (snapshot != null) FeedLine(snapshot: snapshot),
                const SizedBox(height: 8),
                SegmentedButton<MarketScope>(
                  showSelectedIcon: false,
                  segments: const [
                    ButtonSegment(value: MarketScope.domestic, label: Text('Domestic')),
                    ButtonSegment(value: MarketScope.international, label: Text('Export')),
                  ],
                  selected: {_scope},
                  onSelectionChanged: (s) => setState(() => _scope = s.first),
                ),
                if (anyLive) ...[
                  const SizedBox(height: 12),
                  TextField(
                    onChanged: (v) => setState(() => _query = v.trim().toLowerCase()),
                    decoration: const InputDecoration(
                      hintText: 'Search commodities',
                      prefixIcon: Icon(Icons.search_rounded),
                      isDense: true,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (anyLive)
            SizedBox(
              height: 52,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.fromLTRB(20, 10, 20, 4),
                children: [
                  _chip(
                    label: 'Watchlist',
                    icon: Icons.star_rounded,
                    selected: _watchlistOnly,
                    onTap: () => setState(() => _watchlistOnly = !_watchlistOnly),
                  ),
                  _chip(label: 'All', selected: _category == null, onTap: () => setState(() => _category = null)),
                  for (final c in CommodityCategory.values)
                    _chip(label: c.label, selected: _category == c, onTap: () => setState(() => _category = c)),
                ],
              ),
            ),
          Expanded(
            child: snapshot == null
                ? const Center(child: CircularProgressIndicator())
                : !anyLive
                ? NoLivePrices(scope: _scope)
                : rows.isEmpty
                ? EmptyState(
                    icon: _watchlistOnly ? Icons.star_outline_rounded : Icons.search_off_rounded,
                    title: _watchlistOnly ? 'Nothing on your watchlist' : 'No matches',
                    message: _watchlistOnly
                        ? 'Open a commodity and tap the star to follow it here.'
                        : 'Try another search or category.',
                  )
                : RefreshIndicator(
                    color: AppColors.gold,
                    backgroundColor: AppColors.navy800,
                    onRefresh: () => ref.read(priceRepositoryProvider).refresh(),
                    child: ListView.separated(
                      padding: const EdgeInsets.only(bottom: 24),
                      itemCount: rows.length,
                      separatorBuilder: (_, _) => const Divider(indent: 20, endIndent: 20),
                      itemBuilder: (_, i) => QuoteTile(commodity: rows[i].$1, display: rows[i].$2),
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _chip({required String label, required bool selected, required VoidCallback onTap, IconData? icon}) => Padding(
    padding: const EdgeInsets.only(right: 8),
    child: FilterChip(
      avatar: icon == null ? null : Icon(icon, size: 16, color: selected ? AppColors.gold : AppColors.textMuted),
      label: Text(label),
      selected: selected,
      showCheckmark: false,
      onSelected: (_) => onTap(),
    ),
  );
}
