import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/common.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../pricing/domain/market_snapshot.dart';
import '../../pricing/presentation/pricing_providers.dart';
import '../../pricing/presentation/pricing_widgets.dart';
import '../data/listing_repository.dart';
import '../domain/listing.dart';

class ListingDetailScreen extends ConsumerStatefulWidget {
  const ListingDetailScreen({super.key, required this.listingId});

  final String listingId;

  @override
  ConsumerState<ListingDetailScreen> createState() => _ListingDetailScreenState();
}

class _ListingDetailScreenState extends ConsumerState<ListingDetailScreen> {
  @override
  void initState() {
    super.initState();
    final user = ref.read(currentUserProvider);
    final listing = ref.read(listingsProvider.notifier).byId(widget.listingId);
    if (listing != null && listing.supplierId != user?.id) {
      Future.microtask(() => ref.read(listingsProvider.notifier).recordView(widget.listingId));
    }
  }

  @override
  Widget build(BuildContext context) {
    final listing = ref.watch(listingsProvider.select((ls) => ls.where((l) => l.id == widget.listingId).firstOrNull));
    final user = ref.watch(currentUserProvider);
    if (listing == null) {
      return Scaffold(
        appBar: AppBar(),
        body: const EmptyState(icon: Icons.inventory_2_outlined, title: 'Listing unavailable', message: 'It may have been removed by the supplier.'),
      );
    }
    final isOwner = listing.supplierId == user?.id;
    final l = listing;

    return Scaffold(
      appBar: AppBar(
        actions: [
          if (isOwner)
            IconButton(
              tooltip: 'Edit',
              icon: const Icon(Icons.edit_outlined),
              onPressed: () => context.push('/listing/${l.id}/edit'),
            ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.fromLTRB(16, 8, 16, 12),
        child: isOwner
            ? OutlinedButton.icon(
                onPressed: () => ref.read(listingsProvider.notifier).setActive(l.id, !l.active),
                icon: Icon(l.active ? Icons.pause_circle_outline_rounded : Icons.play_circle_outline_rounded),
                label: Text(l.active ? 'Pause listing' : 'Reactivate listing'),
              )
            : GoldButton(
                label: user?.isSupplier == true ? 'Buyers request quotes here' : 'Request a quote',
                icon: Icons.request_quote_outlined,
                onPressed: user?.isSupplier == true ? null : () => context.push('/rfqs/new?listing=${l.id}'),
              ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        children: [
          Center(child: CategoryArt(categoryIndex: l.category.index, icon: categoryIcon(l.category), size: 96, radius: 28)),
          const SizedBox(height: 18),
          if (!l.active) const Center(child: Pill(label: 'PAUSED', color: AppColors.warning)),
          Text(l.title, style: AppTheme.display(22), textAlign: TextAlign.center),
          const SizedBox(height: 8),
          Text(
            [l.commodity?.name, ?l.grade, l.origin].whereType<String>().join(' · '),
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.textSecondary),
          ),
          const SizedBox(height: 20),
          SurfaceCard(
            highlighted: true,
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('ASKING PRICE', style: TextStyle(color: AppColors.gold, fontSize: 11, letterSpacing: 2, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 6),
                      Text.rich(
                        TextSpan(
                          children: [
                            TextSpan(
                              text: formatMoney(l.price, l.currency),
                              style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, fontFeatures: AppTheme.tabular),
                            ),
                            TextSpan(text: ' /${l.unit}', style: const TextStyle(color: AppColors.textMuted)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    const Text('MOQ', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                    Text('${formatNumber(l.moq)} ${l.unit}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          _MarketBenchmark(listing: l),
          const SizedBox(height: 12),
          _SupplierCard(listing: l),
          const SizedBox(height: 20),
          const Text('About this product', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          const SizedBox(height: 8),
          Text(l.description, style: const TextStyle(color: AppColors.textSecondary, height: 1.55)),
          const SizedBox(height: 20),
          SurfaceCard(
            child: Column(
              children: [
                _spec('Origin', l.origin),
                if (l.grade != null) _spec('Grade', l.grade!),
                if (l.packaging != null) _spec('Packaging', l.packaging!),
                _spec('Lead time', '${l.leadTimeDays} days'),
                if (l.monthlyCapacity != null) _spec('Supply capacity', l.monthlyCapacity!),
                _spec('Incoterms', l.incoterms.join(', ')),
                _spec('HS code', l.commodity?.hsCode ?? '—', last: true),
              ],
            ),
          ),
          if (l.certifications.isNotEmpty) ...[
            const SizedBox(height: 20),
            const Text('Certifications', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [for (final c in l.certifications) Pill(label: c, color: AppColors.goldLight, icon: Icons.workspace_premium_outlined)],
            ),
          ],
          if (isOwner) ...[
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(child: _metric('Views', '${l.views}')),
                const SizedBox(width: 12),
                Expanded(child: _metric('Enquiries', '${l.enquiries}')),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _spec(String label, String value, {bool last = false}) => Container(
    padding: const EdgeInsets.symmetric(vertical: 10),
    decoration: BoxDecoration(border: last ? null : const Border(bottom: BorderSide(color: AppColors.line))),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(width: 120, child: Text(label, style: const TextStyle(color: AppColors.textSecondary))),
        Expanded(child: Text(value, textAlign: TextAlign.end, style: const TextStyle(fontWeight: FontWeight.w700))),
      ],
    ),
  );

  Widget _metric(String label, String value) => SurfaceCard(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
        const SizedBox(height: 4),
        Text(value, style: AppTheme.display(22)),
      ],
    ),
  );
}

/// Shows how the asking price sits against the live market: the feature that
/// turns a catalogue into a trading tool.
class _MarketBenchmark extends ConsumerWidget {
  const _MarketBenchmark({required this.listing});

  final Listing listing;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final snapshot = ref.watch(marketSnapshotProvider).value;
    final quote = snapshot?.quote(listing.commodityId, listing.scope);
    if (snapshot == null || quote == null) return const SizedBox.shrink();
    final target = listing.currency == 'INR' ? DisplayCurrency.inr : DisplayCurrency.usd;
    final market = snapshot.convert(quote.price, quote.currency, target);
    final diff = (listing.price - market) / market * 100;
    final color = diff.abs() < 2 ? AppColors.textSecondary : (diff < 0 ? AppColors.positive : AppColors.warning);
    final verdict = diff.abs() < 2 ? 'In line with market' : (diff < 0 ? 'Below market' : 'Above market');

    return SurfaceCard(
      onTap: () => context.push('/markets/${listing.commodityId}?scope=${listing.scope.name}'),
      child: Row(
        children: [
          const Icon(Icons.query_stats_rounded, color: AppColors.gold),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(verdict, style: TextStyle(color: color, fontWeight: FontWeight.w800)),
                const SizedBox(height: 2),
                Text(
                  '${quote.origin.label} ${listing.scope.label.toLowerCase()} price ${formatMoney(market, target.code)}/${target.unit}',
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 12.5),
                ),
              ],
            ),
          ),
          Text(formatPct(diff), style: TextStyle(color: color, fontWeight: FontWeight.w800, fontFeatures: AppTheme.tabular)),
          const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
        ],
      ),
    );
  }
}

class _SupplierCard extends StatelessWidget {
  const _SupplierCard({required this.listing});

  final Listing listing;

  @override
  Widget build(BuildContext context) {
    final l = listing;
    return SurfaceCard(
      child: Row(
        children: [
          CircleAvatar(
            radius: 24,
            backgroundColor: AppColors.navy600,
            child: Text(
              l.supplierName.split(' ').take(2).map((w) => w[0]).join(),
              style: const TextStyle(color: AppColors.goldLight, fontWeight: FontWeight.w800),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l.supplierName, style: const TextStyle(fontWeight: FontWeight.w800)),
                const SizedBox(height: 3),
                Text(l.supplierLocation, style: const TextStyle(color: AppColors.textMuted, fontSize: 12.5)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              if (l.supplierVerified) const VerifiedBadge(),
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.star_rounded, size: 15, color: AppColors.gold),
                  Text(l.supplierRating.toStringAsFixed(1), style: const TextStyle(fontWeight: FontWeight.w700)),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}
