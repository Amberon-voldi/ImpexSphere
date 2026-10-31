import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../marketplace/presentation/marketplace_screen.dart';
import '../../marketplace/presentation/my_listings_screen.dart';
import '../../rfq/presentation/rfq_screen.dart';

/// One place to trade, shaped by role:
/// buyers browse products and track their requests; suppliers answer buyer
/// requests and manage their listings. One primary action each.
class TradeScreen extends ConsumerWidget {
  const TradeScreen({super.key, this.commodityId});

  final String? commodityId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isSupplier = ref.watch(currentUserProvider.select((u) => u?.isSupplier ?? false));
    final tabs = isSupplier ? const ['Buyer requests', 'My listings'] : const ['Products', 'My requests'];
    final views = isSupplier
        ? const [SupplierRequestsView(), MyListingsView()]
        : [ProductBrowser(commodityId: commodityId), const BuyerRequestsView()];

    return DefaultTabController(
      key: ValueKey(isSupplier),
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: Text('Trade', style: AppTheme.display(22)),
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(52),
            child: Container(
              height: 42,
              margin: const EdgeInsets.fromLTRB(20, 0, 20, 10),
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: AppColors.navy800,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.line),
              ),
              child: TabBar(tabs: [for (final t in tabs) Tab(text: t)]),
            ),
          ),
        ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: () => context.push(isSupplier ? '/listing/new' : '/rfqs/new'),
          icon: const Icon(Icons.add_rounded),
          label: Text(isSupplier ? 'List product' : 'New request'),
        ),
        body: TabBarView(children: views),
      ),
    );
  }
}
