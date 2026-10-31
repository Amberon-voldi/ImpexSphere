import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/brand_mark.dart';
import '../../../core/widgets/common.dart';
import '../../alerts/presentation/alerts_controller.dart';
import '../../auth/domain/app_user.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../marketplace/data/listing_repository.dart';
import '../../marketplace/presentation/listing_card.dart';
import '../../pricing/domain/commodity.dart';
import '../../pricing/presentation/pricing_providers.dart';
import '../../pricing/presentation/pricing_widgets.dart';
import '../../rfq/data/rfq_repository.dart';
import '../../rfq/domain/rfq.dart';
import '../../rfq/presentation/rfq_screen.dart';

/// Role-specific home: one primary action, what needs attention, and the
/// prices the user follows. Nothing else.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    if (user == null) return const SizedBox.shrink();

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 20,
        title: const BrandLogo(height: 18),
        actions: const [_AlertsBell(), SizedBox(width: 8)],
      ),
      body: RefreshIndicator(
        color: AppColors.gold,
        backgroundColor: AppColors.navy800,
        onRefresh: () => ref.read(priceRepositoryProvider).refresh(),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
          children: [
            Text('${_greeting()}, ${user.name.split(' ').first}', style: AppTheme.display(24)),
            const SizedBox(height: 4),
            Text(user.company, style: const TextStyle(color: AppColors.textSecondary)),
            const SizedBox(height: 24),
            if (user.isSupplier) _SupplierHome(user: user) else const _BuyerHome(),
            const SizedBox(height: 28),
            const _Watchlist(),
          ],
        ),
      ),
    );
  }

  static String _greeting() {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }
}

class _BuyerHome extends ConsumerWidget {
  const _BuyerHome();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final toDecide = ref.watch(myRfqsProvider).where((r) => r.status == RfqStatus.quoted).toList();
    final suppliers = ref.watch(listingsProvider).where((l) => l.active && l.supplierVerified).toList()
      ..sort((a, b) => b.enquiries.compareTo(a.enquiries));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SurfaceCard(
          highlighted: true,
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('What are you sourcing?', style: AppTheme.display(18)),
              const SizedBox(height: 6),
              const Text(
                'Describe what you need once. Verified suppliers send you competing quotes.',
                style: TextStyle(color: AppColors.textSecondary, height: 1.4),
              ),
              const SizedBox(height: 16),
              GoldButton(label: 'Request a quote', onPressed: () => context.push('/rfqs/new')),
              const SizedBox(height: 6),
              TextButton(onPressed: () => context.go('/trade'), child: const Text('Browse products')),
            ],
          ),
        ),
        if (toDecide.isNotEmpty) ...[
          const SizedBox(height: 28),
          _Header(
            title: 'Quotes to review',
            action: 'All requests',
            onAction: () => context.go('/trade'),
          ),
          for (final r in toDecide.take(2)) ...[RfqCard(rfq: r), const SizedBox(height: 10)],
        ],
        const SizedBox(height: 18),
        _Header(title: 'Top suppliers', action: 'See all', onAction: () => context.go('/trade')),
        for (final l in suppliers.take(3)) ...[ListingCard(listing: l, compact: true), const SizedBox(height: 10)],
      ],
    );
  }
}

class _SupplierHome extends ConsumerWidget {
  const _SupplierHome({required this.user});

  final AppUser user;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rfqs = ref.watch(myRfqsProvider);
    final open = rfqs.where((r) => r.acceptsQuotes && r.quoteFrom(user.id) == null).toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    final mine = ref.watch(listingsProvider).where((l) => l.supplierId == user.id).toList();
    final enquiries = mine.fold<int>(0, (sum, l) => sum + l.enquiries);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(child: _Stat(value: '${open.length}', label: 'New requests', onTap: () => context.go('/trade'))),
            const SizedBox(width: 10),
            Expanded(child: _Stat(value: '${mine.where((l) => l.active).length}', label: 'Live listings', onTap: () => context.go('/trade'))),
            const SizedBox(width: 10),
            Expanded(child: _Stat(value: '$enquiries', label: 'Enquiries')),
          ],
        ),
        const SizedBox(height: 28),
        if (mine.isEmpty)
          SurfaceCard(
            highlighted: true,
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('List your first product', style: AppTheme.display(18)),
                const SizedBox(height: 6),
                const Text(
                  'Reach verified importers. Your price is shown next to the live market.',
                  style: TextStyle(color: AppColors.textSecondary, height: 1.4),
                ),
                const SizedBox(height: 16),
                GoldButton(label: 'List a product', onPressed: () => context.push('/listing/new')),
              ],
            ),
          )
        else ...[
          _Header(title: 'New buyer requests', action: open.isEmpty ? null : 'See all', onAction: () => context.go('/trade')),
          if (open.isEmpty)
            const SurfaceCard(
              child: Text('You\'ve quoted on every open request.', style: TextStyle(color: AppColors.textSecondary)),
            ),
          for (final r in open.take(3)) ...[RfqCard(rfq: r), const SizedBox(height: 10)],
        ],
      ],
    );
  }
}

class _Watchlist extends ConsumerWidget {
  const _Watchlist();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final snapshot = ref.watch(marketSnapshotProvider).value;
    final currency = ref.watch(displayCurrencyProvider);
    final watchlist = ref.watch(alertsControllerProvider.select((s) => s.watchlist));
    final quotes = snapshot == null ? const [] : snapshot.quotes.values.where((q) => watchlist.contains(q.key)).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _Header(title: 'Your watchlist', action: 'Markets', onAction: () => context.go('/markets')),
        if (snapshot != null && snapshot.quotes.isEmpty)
          const NoLivePrices(scope: MarketScope.domestic, compact: true)
        else if (quotes.isEmpty)
          SurfaceCard(
            onTap: () => context.go('/markets'),
            child: const Row(
              children: [
                Icon(Icons.star_outline_rounded, color: AppColors.gold),
                SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Star commodities in Markets to follow their live prices here.',
                    style: TextStyle(color: AppColors.textSecondary, height: 1.4),
                  ),
                ),
              ],
            ),
          )
        else
          SurfaceCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                for (var i = 0; i < quotes.length; i++) ...[
                  if (i > 0) const Divider(indent: 20, endIndent: 20),
                  QuoteTile(commodity: commodityById[quotes[i].commodityId]!, display: DisplayQuote(quotes[i], snapshot!, currency)),
                ],
              ],
            ),
          ),
      ],
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.title, this.action, this.onAction});

  final String title;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Row(
      children: [
        Expanded(child: Text(title, style: AppTheme.display(17))),
        if (action != null)
          TextButton(
            style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(0, 32)),
            onPressed: onAction,
            child: Text(action!),
          ),
      ],
    ),
  );
}

class _Stat extends StatelessWidget {
  const _Stat({required this.value, required this.label, this.onTap});

  final String value;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => SurfaceCard(
    onTap: onTap,
    padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(value, style: AppTheme.display(24, color: AppColors.goldLight)),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 12.5)),
      ],
    ),
  );
}

class _AlertsBell extends ConsumerWidget {
  const _AlertsBell();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(alertsControllerProvider.select((s) => s.activeCount));
    return IconButton(
      tooltip: 'Price alerts',
      onPressed: () => context.push('/alerts'),
      icon: Badge(
        isLabelVisible: count > 0,
        label: Text('$count'),
        backgroundColor: AppColors.gold,
        textColor: AppColors.navy950,
        child: const Icon(Icons.notifications_none_rounded),
      ),
    );
  }
}
